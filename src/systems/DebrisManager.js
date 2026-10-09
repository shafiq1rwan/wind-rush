import Phaser from 'phaser';
import { DEPTH, GAME_WIDTH, GAME_HEIGHT } from '../config/gameConfig.js';
import { DEBRIS } from '../config/balanceConfig.js';
import Debris from '../entities/Debris.js';

const INDICATOR_TEXTURE = {
  danger: 'indicator-danger',
  heal: 'indicator-heal',
  shield: 'indicator-shield',
};

function weightedPick(weights) {
  const entries = Object.entries(weights);
  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  let roll = Math.random() * total;
  for (const [key, w] of entries) {
    roll -= w;
    if (roll <= 0) return key;
  }
  return entries[entries.length - 1][0];
}

/**
 * Spawns, moves, pools and removes flying debris, and draws off-screen warning arrows.
 *
 * Fairness rules:
 *  - debris always spawns off-screen on the upwind side, never on the player
 *  - nothing dangerous spawns during the opening grace period or near the shelter
 *  - hazards are at least `minHazardGap` apart, and hazards close together share a lane so a
 *    low + high pair can never close off every escape
 */
export default class DebrisManager {
  constructor(scene, wind, level) {
    this.scene = scene;
    this.wind = wind;
    this.level = level;

    this.group = scene.physics.add.group({
      classType: Debris,
      maxSize: DEBRIS.maxActive,
      allowGravity: false,
      runChildUpdate: false,
    });

    const cfg = level.data.debris;
    this.weights = cfg.types;
    this.density = cfg.density ?? 1;

    this.spawning = true;
    this.clock = 0;
    this.spawnTimer = DEBRIS.startGrace;
    this.lastHazardAt = -Infinity;
    this.lastHazardLane = null;
    this.scripted = (level.data.scriptedPickups ?? []).map((p) => ({ ...p, done: false }));

    this.indicators = Array.from({ length: DEBRIS.indicatorCount }, () =>
      scene.add.image(0, 0, 'indicator-danger').setScrollFactor(0).setDepth(DEPTH.indicators).setVisible(false),
    );
  }

  setSpawning(on) {
    this.spawning = on;
  }

  update(dt, playerX, onBounce) {
    this.clock += dt;
    if (this.spawning) {
      this.updateScripted(playerX);
      this.updateRandom(dt, playerX);
    }

    const view = this.scene.cameras.main.worldView;
    const margin = DEBRIS.despawnMargin;
    const force = this.wind.force;
    for (const d of this.group.getChildren()) {
      if (!d.active) continue;
      if (d.tick(dt, force, this.level.groundY) && onBounce) onBounce(d);
      const passed = d.dir > 0 ? d.x > view.right + margin : d.x < view.x - margin;
      const lost = d.x < view.x - margin * 2 || d.x > view.right + margin * 2;
      if (passed || lost || d.age > DEBRIS.maxLifetime) d.recycle();
    }

    this.updateIndicators(view);
  }

  updateScripted(playerX) {
    for (const p of this.scripted) {
      if (!p.done && playerX >= p.triggerX) p.done = !!this.spawnPickup(p.type);
    }
  }

  updateRandom(dt, playerX) {
    this.spawnTimer -= dt;
    if (this.spawnTimer > 0) return;

    if (playerX > this.level.finishX - DEBRIS.finishSafeDistance) {
      this.spawnTimer = 0.5;
      return;
    }

    const roll = Math.random();
    let spawned;
    if (roll < DEBRIS.randomHealChance) spawned = this.spawnPickup('heal');
    else if (roll < DEBRIS.randomHealChance + DEBRIS.randomShieldChance) spawned = this.spawnPickup('umbrella');
    else spawned = this.trySpawnHazard();

    const interval = this.wind.spawnInterval / this.density;
    this.spawnTimer = spawned
      ? interval * Phaser.Math.FloatBetween(1 - DEBRIS.spawnJitter, 1 + DEBRIS.spawnJitter)
      : DEBRIS.retryDelay;
  }

  trySpawnHazard() {
    if (this.clock - this.lastHazardAt < DEBRIS.minHazardGap) return false;

    const typeKey = weightedPick(this.weights);
    const cfg = DEBRIS.types[typeKey];
    let height;
    let lane;
    if (cfg.gravity) {
      // Lobbed hazards come in from above and finish rolling along the low lane.
      height = Phaser.Math.FloatBetween(cfg.launchHeight[0], cfg.launchHeight[1]);
      lane = 'low';
    } else {
      lane = Math.random() < DEBRIS.highLaneChance ? 'high' : 'low';
      const recent = this.clock - this.lastHazardAt < DEBRIS.laneSwitchGap;
      if (recent && this.lastHazardLane && lane !== this.lastHazardLane) lane = this.lastHazardLane;
      height = DEBRIS.hazardLanes[lane];
    }

    if (!this.spawn(typeKey, height)) return false;
    this.lastHazardAt = this.clock;
    this.lastHazardLane = lane;
    return true;
  }

  spawnPickup(typeKey) {
    return this.spawn(typeKey, Phaser.Utils.Array.GetRandom(DEBRIS.pickupLanes));
  }

  spawn(typeKey, heightAboveGround) {
    const dir = this.wind.travelDirection;
    const view = this.scene.cameras.main.worldView;
    const x = dir > 0 ? view.x - DEBRIS.spawnMargin : view.right + DEBRIS.spawnMargin;
    const y = this.level.groundY - heightAboveGround;
    const debris = this.group.get(x, y);
    if (!debris) return null; // pool exhausted
    return debris.launch(typeKey, x, y, dir, this.wind.force);
  }

  /** Arrows on the screen edge for debris that is about to fly into view. */
  updateIndicators(view) {
    let n = 0;
    const pulse = 0.85 + 0.12 * Math.sin(this.clock * 12);
    for (const d of this.group.getChildren()) {
      if (n >= this.indicators.length) break;
      if (!d.active) continue;
      const sx = d.x - view.x;
      let edge = 0;
      let distance = 0;
      if (d.dir > 0 && sx < -d.width / 2) {
        edge = -1;
        distance = -sx;
      } else if (d.dir < 0 && sx > view.width + d.width / 2) {
        edge = 1;
        distance = sx - view.width;
      }
      if (!edge || distance > DEBRIS.indicatorRange) continue;

      this.indicators[n++]
        .setTexture(INDICATOR_TEXTURE[d.category])
        .setVisible(true)
        .setFlipX(edge < 0)
        .setPosition(edge < 0 ? 30 : GAME_WIDTH - 30, Phaser.Math.Clamp(d.y - view.y, 90, GAME_HEIGHT - 40))
        .setAlpha(Phaser.Math.Clamp(1 - distance / DEBRIS.indicatorRange, 0.3, 1))
        .setScale(pulse);
    }
    for (; n < this.indicators.length; n++) this.indicators[n].setVisible(false);
  }
}
