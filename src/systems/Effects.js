import { COLORS, DEPTH, FONT_FAMILY } from '../config/gameConfig.js';

/**
 * Particle bursts and small feedback effects. Emitters are created once per scene and fired with
 * explode(), so effects cost no allocations beyond Phaser's internal particle pool.
 */
export default class Effects {
  constructor(scene) {
    this.scene = scene;
    const burst = {
      lifespan: { min: 300, max: 600 },
      speed: { min: 120, max: 320 },
      scale: { start: 0.8, end: 0 },
      alpha: { start: 1, end: 0 },
      gravityY: 500,
      emitting: false,
    };
    const add = (texture, config) => scene.add.particles(0, 0, texture, config).setDepth(DEPTH.fx);

    this.hitEmitter = add('spark', { ...burst, tint: [0xffffff, COLORS.danger, COLORS.coat] });
    this.healEmitter = add('spark', {
      ...burst,
      gravityY: -260,
      speed: { min: 60, max: 200 },
      tint: [COLORS.healLight, 0xc8f7c5, 0xffffff],
    });
    this.shieldEmitter = add('spark', { ...burst, gravityY: 200, tint: [COLORS.shield, COLORS.shieldLight, 0xffffff] });
    this.woodEmitter = add('chip', {
      ...burst,
      rotate: { min: 0, max: 360 },
      gravityY: 900,
      scale: { start: 1, end: 0.4 },
      tint: [COLORS.wood, COLORS.woodDark, 0xd9a066],
    });
    this.brickEmitter = add('chip', {
      ...burst,
      rotate: { min: 0, max: 360 },
      gravityY: 900,
      scale: { start: 1, end: 0.4 },
      tint: [0xd0583f, 0x7a2e1f, 0xe88a73],
    });
    this.dustEmitter = add('puff', {
      lifespan: 500,
      speed: { min: 20, max: 70 },
      angle: { min: 200, max: 340 },
      scale: { start: 0.3, end: 0.9 },
      alpha: { start: 0.55, end: 0 },
      tint: 0xd8cbb0,
      emitting: false,
    });
  }

  hit(x, y) {
    this.hitEmitter.explode(16, x, y);
  }

  heal(x, y) {
    this.healEmitter.explode(18, x, y);
    this.ring(x, y, COLORS.healLight);
  }

  shieldPickup(x, y) {
    this.shieldEmitter.explode(14, x, y);
    this.ring(x, y, COLORS.shieldLight);
  }

  shieldBlock(x, y) {
    this.shieldEmitter.explode(12, x, y);
    this.ring(x, y, COLORS.shieldLight, 2.5);
  }

  shieldBreak(x, y) {
    this.shieldEmitter.explode(26, x, y);
  }

  debrisBreak(x, y, typeKey) {
    (typeKey === 'brick' ? this.brickEmitter : this.woodEmitter).explode(10, x, y);
  }

  dust(x, y, count = 2) {
    this.dustEmitter.explode(count, x, y);
  }

  ring(x, y, color, scale = 4) {
    const ring = this.scene.add.circle(x, y, 12).setStrokeStyle(4, color).setDepth(DEPTH.fx);
    this.scene.tweens.add({
      targets: ring,
      scale,
      alpha: 0,
      duration: 380,
      ease: 'Cubic.easeOut',
      onComplete: () => ring.destroy(),
    });
  }

  floatText(x, y, text, color) {
    const label = this.scene.add
      .text(x, y, text, {
        fontFamily: FONT_FAMILY,
        fontSize: '24px',
        fontStyle: 'bold',
        color,
        stroke: '#2b2d42',
        strokeThickness: 5,
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.floatText);
    this.scene.tweens.add({
      targets: label,
      y: y - 60,
      alpha: 0,
      duration: 900,
      ease: 'Cubic.easeOut',
      onComplete: () => label.destroy(),
    });
  }
}
