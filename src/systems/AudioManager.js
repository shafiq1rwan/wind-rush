import { STORAGE_KEYS } from '../config/gameConfig.js';

// Placeholder audio synthesised with the Web Audio API, so the game ships with no audio files.
// Uses Phaser's own AudioContext (which Phaser unlocks on the first user gesture).

function readMuted() {
  try {
    return window.localStorage.getItem(STORAGE_KEYS.muted) === '1';
  } catch {
    return false;
  }
}

function writeMuted(muted) {
  try {
    window.localStorage.setItem(STORAGE_KEYS.muted, muted ? '1' : '0');
  } catch {
    // Storage can be unavailable (private mode, sandboxed iframes) - muting still works this session.
  }
}

const MASTER_VOLUME = 0.8;

const SFX = {
  jump: (a) => a.tone({ from: 380, to: 760, duration: 0.14, type: 'triangle', volume: 0.16 }),
  land: (a) => a.tone({ from: 160, to: 70, duration: 0.09, type: 'sine', volume: 0.14 }),
  anchor: (a) => {
    a.tone({ from: 200, to: 110, duration: 0.1, type: 'square', volume: 0.05 });
    a.noise({ duration: 0.08, volume: 0.08, freq: 600 });
  },
  hurt: (a) => {
    a.noise({ duration: 0.18, volume: 0.25, freq: 900, q: 0.7 });
    a.tone({ from: 300, to: 90, duration: 0.28, type: 'sawtooth', volume: 0.1 });
  },
  heal: (a) =>
    [523, 659, 784, 1047].forEach((f, i) =>
      a.tone({ from: f, duration: 0.12, type: 'triangle', volume: 0.14, delay: i * 0.06 }),
    ),
  shieldPickup: (a) => {
    a.tone({ from: 440, to: 880, duration: 0.18, type: 'triangle', volume: 0.14 });
    a.tone({ from: 660, to: 1320, duration: 0.22, type: 'sine', volume: 0.1, delay: 0.08 });
  },
  shieldBlock: (a) => {
    a.tone({ from: 1400, to: 700, duration: 0.12, type: 'square', volume: 0.07 });
    a.noise({ duration: 0.1, volume: 0.15, freq: 3000, q: 2 });
  },
  shieldBreak: (a) => {
    a.noise({ duration: 0.35, volume: 0.22, freq: 2200, freqTo: 400, q: 1 });
    a.tone({ from: 700, to: 120, duration: 0.35, type: 'sawtooth', volume: 0.08 });
  },
  debrisBreak: (a) => a.noise({ duration: 0.12, volume: 0.12, freq: 500, q: 1.2 }),
  gustWarning: (a) => a.noise({ duration: 0.8, volume: 0.2, freq: 300, freqTo: 1400, q: 1.5, attack: 0.6 }),
  gust: (a) => a.noise({ duration: 1.2, volume: 0.3, freq: 1200, freqTo: 400, q: 0.9, attack: 0.05 }),
  victory: (a) =>
    [523, 659, 784, 1047, 1319].forEach((f, i) =>
      a.tone({ from: f, duration: i === 4 ? 0.45 : 0.14, type: 'triangle', volume: 0.16, delay: i * 0.1 }),
    ),
  defeat: (a) =>
    [392, 330, 262, 196].forEach((f, i) =>
      a.tone({ from: f, to: f * 0.94, duration: 0.2, type: 'triangle', volume: 0.15, delay: i * 0.15 }),
    ),
  click: (a) => a.tone({ from: 900, to: 1200, duration: 0.05, type: 'sine', volume: 0.1 }),
  star: (a) => a.tone({ from: 880, to: 1760, duration: 0.15, type: 'triangle', volume: 0.12 }),
};

class AudioManager {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.noiseBuffer = null;
    this.windNodes = null;
    this.windLevel = -1;
    this.muted = readMuted();
  }

  init(game) {
    if (this.ctx) return;
    const ctx = game.sound && game.sound.context;
    if (!ctx) return; // HTML5 Audio / NoAudio fallback: stay silent rather than fail.

    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : MASTER_VOLUME;
    this.master.connect(ctx.destination);

    const length = ctx.sampleRate * 2;
    this.noiseBuffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  }

  get ready() {
    return !!this.ctx && this.ctx.state === 'running';
  }

  /** Call from a user-gesture handler to make sure the context is running. */
  unlock() {
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
  }

  setMuted(muted) {
    this.muted = muted;
    writeMuted(muted);
    if (this.master) this.master.gain.setTargetAtTime(muted ? 0 : MASTER_VOLUME, this.ctx.currentTime, 0.05);
  }

  toggleMute() {
    this.setMuted(!this.muted);
    return this.muted;
  }

  play(name) {
    if (!this.ready || this.muted) return;
    const sfx = SFX[name];
    if (sfx) sfx(this);
  }

  envelope(param, t0, attack, duration, volume) {
    param.setValueAtTime(0.0001, t0);
    param.exponentialRampToValueAtTime(volume, t0 + attack);
    param.exponentialRampToValueAtTime(0.0001, t0 + duration);
  }

  tone({ from, to = from, duration = 0.15, type = 'sine', volume = 0.2, delay = 0, attack = 0.005 }) {
    const ctx = this.ctx;
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, t0);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), t0 + duration);
    this.envelope(gain.gain, t0, attack, duration, volume);
    osc.connect(gain).connect(this.master);
    osc.start(t0);
    osc.stop(t0 + duration + 0.05);
  }

  noise({ duration = 0.2, volume = 0.2, freq = 1000, freqTo = freq, q = 1, delay = 0, attack = 0.005 }) {
    const ctx = this.ctx;
    const t0 = ctx.currentTime + delay;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = q;
    filter.frequency.setValueAtTime(freq, t0);
    filter.frequency.exponentialRampToValueAtTime(Math.max(1, freqTo), t0 + duration);
    const gain = ctx.createGain();
    this.envelope(gain.gain, t0, attack, duration, volume);
    src.connect(filter).connect(gain).connect(this.master);
    src.start(t0, Math.random() * Math.max(0, 2 - duration));
    src.stop(t0 + duration + 0.05);
  }

  /** Looping filtered noise whose loudness and brightness follow the wind strength. */
  startWind() {
    if (!this.ctx || this.windNodes) return;
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 400;
    filter.Q.value = 0.7;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    src.connect(filter).connect(gain).connect(this.master);
    src.start();
    this.windNodes = { src, filter, gain };
    this.windLevel = -1;
  }

  /** @param {number} level 0..1 wind strength  @param {number} damp extra multiplier (e.g. when paused) */
  setWind(level, damp = 1) {
    if (!this.windNodes) return;
    const value = level * damp;
    // Only reschedule automation when the level moved noticeably; avoids piling up events every frame.
    if (Math.abs(value - this.windLevel) < 0.02) return;
    this.windLevel = value;
    const t = this.ctx.currentTime;
    this.windNodes.gain.gain.setTargetAtTime((0.03 + level * 0.2) * damp, t, 0.25);
    this.windNodes.filter.frequency.setTargetAtTime(350 + level * 1400, t, 0.25);
  }

  stopWind() {
    if (!this.windNodes) return;
    const { src, gain } = this.windNodes;
    const t = this.ctx.currentTime;
    gain.gain.cancelScheduledValues(t);
    gain.gain.setTargetAtTime(0, t, 0.08);
    src.stop(t + 0.4);
    this.windNodes = null;
  }
}

export const audio = new AudioManager();
