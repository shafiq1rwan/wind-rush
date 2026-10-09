import Phaser from 'phaser';
import { WIND } from '../config/balanceConfig.js';

const smoothstep = (t) => t * t * (3 - 2 * t);

/**
 * State-based wind controller.
 *
 * Wind is a single signed `force` in [-1, 1] (negative = blowing left). The controller walks
 * through the level's handcrafted pattern of steps; each step picks a state and direction, the
 * force eases toward the new value, holds for the step's duration, then moves on. Extreme gusts
 * are preceded by a warning phase during which the wind briefly drops (anticipation).
 *
 * Events:
 *   'state-change' ({ state, direction })   a new step has begun
 *   'gust-warning' ({ direction, duration }) an extreme gust arrives in `duration` seconds
 *   'gust-start'   ({ direction })           the extreme gust is ramping in now
 */
export default class WindSystem extends Phaser.Events.EventEmitter {
  constructor(levelWind) {
    super();
    this.pattern = levelWind.pattern;
    this.prevailing = levelWind.prevailingDirection ?? -1;

    this.force = 0;
    this.index = -1;
    this.stateKey = 'calm';
    this.phase = 'hold';
    this.timeLeft = 0;
    this.warningLeft = 0;
    this.pendingStep = null;

    this.rampFrom = 0;
    this.rampTo = 0;
    this.rampT = 1;
    this.rampDuration = 0;

    this.advance(true);
  }

  /** Absolute wind strength in [0, 1]. */
  get strength() {
    return Math.abs(this.force);
  }

  /** Direction the wind blows toward (-1 or 1). */
  get direction() {
    return Math.sign(this.force) || this.prevailing;
  }

  /** Direction new debris should travel; falls back to the prevailing wind when nearly calm. */
  get travelDirection() {
    return this.strength < WIND.travelDeadzone ? this.prevailing : this.direction;
  }

  get isWarning() {
    return this.phase === 'warning';
  }

  /** Direction of the gust being warned about (only meaningful while isWarning). */
  get warningDirection() {
    return this.pendingStep ? this.pendingStep.dir : this.direction;
  }

  get spawnInterval() {
    return WIND.states[this.stateKey].spawnInterval;
  }

  get stateDef() {
    return WIND.states[this.stateKey];
  }

  update(dt) {
    if (this.rampT < 1) {
      this.rampT = Math.min(1, this.rampT + dt / this.rampDuration);
      this.force = Phaser.Math.Linear(this.rampFrom, this.rampTo, smoothstep(this.rampT));
    }

    if (this.phase === 'warning') {
      this.warningLeft -= dt;
      if (this.warningLeft <= 0) this.applyStep(this.pendingStep, false);
      return;
    }

    this.timeLeft -= dt;
    if (this.timeLeft <= 0) this.advance(false);
  }

  advance(initial) {
    this.index = (this.index + 1) % this.pattern.length;
    const step = this.pattern[this.index];

    if (step.state === 'extreme' && !initial) {
      // Telegraph the gust: hold the current state, let the wind sag, and warn listeners.
      this.phase = 'warning';
      this.warningLeft = WIND.gustWarningTime;
      this.pendingStep = step;
      this.beginRamp(this.force * WIND.gustLullFactor, WIND.gustWarningTime * 0.6);
      this.emit('gust-warning', { direction: step.dir, duration: WIND.gustWarningTime });
      return;
    }

    this.applyStep(step, initial);
  }

  applyStep(step, instant) {
    const def = WIND.states[step.state];
    const target = def.strength * step.dir;
    const jitter = 1 + Phaser.Math.FloatBetween(-WIND.durationJitter, WIND.durationJitter);

    this.phase = 'hold';
    this.pendingStep = null;
    this.stateKey = step.state;
    this.timeLeft = step.duration * jitter;

    if (instant) {
      this.force = target;
      this.rampT = 1;
    } else {
      let duration = WIND.transitionTime;
      if (step.state === 'extreme') duration = WIND.gustRampTime;
      else if (Math.sign(target) !== Math.sign(this.force) && this.strength > 0.1) duration = WIND.flipTransitionTime;
      this.beginRamp(target, duration);
    }

    this.emit('state-change', { state: step.state, direction: step.dir });
    if (step.state === 'extreme') this.emit('gust-start', { direction: step.dir });
  }

  beginRamp(target, duration) {
    this.rampFrom = this.force;
    this.rampTo = target;
    this.rampT = 0;
    this.rampDuration = Math.max(0.01, duration);
  }

  destroy() {
    this.removeAllListeners();
  }
}
