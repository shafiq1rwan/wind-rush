import Phaser from 'phaser';
import { DEPTH, GAME_WIDTH, GAME_HEIGHT } from '../config/gameConfig.js';
import { FX } from '../config/balanceConfig.js';

const LEAF_TINTS = [0x8cc152, 0xf6bd60, 0xe07a5f, 0xa0c55f];

/**
 * Visualises the wind: pooled streaks and leaves that scale with strength, drifting clouds and
 * swaying trees. `wind` only needs a signed `force` property, so the menu can pass a fake wind.
 */
export default class WindEffects {
  constructor(scene, wind, { clouds = [], swayers = [], groundY = GAME_HEIGHT - 80 } = {}) {
    this.scene = scene;
    this.wind = wind;
    this.clouds = clouds;
    this.swayers = swayers;
    this.groundY = groundY;
    this.time = 0;

    this.streaks = Array.from({ length: FX.streakCount }, () => ({
      img: scene.add.image(-999, 0, 'streak').setDepth(DEPTH.windFx).setVisible(false),
      speed: Phaser.Math.FloatBetween(0.75, 1.3),
      active: false,
    }));

    this.leaves = Array.from({ length: FX.leafCount }, () => ({
      img: scene.add
        .image(-999, 0, 'leaf')
        .setDepth(DEPTH.windFx)
        .setVisible(false)
        .setTint(Phaser.Utils.Array.GetRandom(LEAF_TINTS)),
      speed: Phaser.Math.FloatBetween(0.7, 1.2),
      phase: Phaser.Math.FloatBetween(0, Math.PI * 2),
      active: false,
    }));
  }

  update(dt) {
    this.time += dt;
    const cam = this.scene.cameras.main;
    const left = cam.scrollX;
    const right = cam.scrollX + cam.width;
    const force = this.wind.force;
    const strength = Math.abs(force);

    // Streaks: count, length and opacity all grow with strength.
    const streakCount = Math.round(FX.streakMin + (FX.streakCount - FX.streakMin) * strength);
    this.streaks.forEach((s, i) => {
      const wanted = i < streakCount && strength > 0.02;
      if (!s.active) {
        if (!wanted) return;
        this.spawn(s, left, right, true, 40, this.groundY - 10);
      }
      s.img.x += force * FX.streakSpeed * s.speed * dt;
      if (s.img.x < left - 120 || s.img.x > right + 120) {
        if (wanted) this.spawn(s, left, right, false, 40, this.groundY - 10);
        else this.retire(s);
      }
      s.img.setScale(0.4 + strength * 1.6 * s.speed, 1).setAlpha(0.12 + strength * 0.45);
    });

    // Leaves only show up once there is real wind.
    const leafCount = strength > 0.2 ? Math.round(FX.leafCount * strength) : 0;
    this.leaves.forEach((l, i) => {
      const wanted = i < leafCount;
      if (!l.active) {
        if (!wanted) return;
        this.spawn(l, left, right, true, this.groundY - 260, this.groundY - 20);
      }
      const img = l.img;
      img.x += force * FX.leafSpeed * l.speed * dt;
      img.y += Math.sin(this.time * 3 + l.phase) * 60 * dt;
      img.rotation += force * 8 * l.speed * dt;
      if (img.x < left - 60 || img.x > right + 60) {
        if (wanted) this.spawn(l, left, right, false, this.groundY - 260, this.groundY - 20);
        else this.retire(l);
      }
    });

    for (const cloud of this.clouds) {
      cloud.x += force * 30 * dt;
      // Clouds use scrollFactor 0.1, so their on-screen x is x - scrollX * 0.1.
      const screenX = cloud.x - cam.scrollX * cloud.scrollFactorX;
      if (screenX < -220) cloud.x += GAME_WIDTH + 440;
      else if (screenX > GAME_WIDTH + 220) cloud.x -= GAME_WIDTH + 440;
    }

    for (const s of this.swayers) {
      const wobble = Math.sin(this.time * (1.5 + strength * 6) + s.phase) * (0.8 + strength * 5);
      s.img.angle = (force * 10 + wobble) * s.amount;
    }
  }

  spawn(item, left, right, anywhere, minY, maxY) {
    const force = this.wind.force;
    let x;
    if (anywhere) x = Phaser.Math.Between(left, right);
    else x = force >= 0 ? left - Phaser.Math.Between(20, 110) : right + Phaser.Math.Between(20, 110);
    item.img.setPosition(x, Phaser.Math.Between(minY, maxY)).setVisible(true);
    item.active = true;
  }

  retire(item) {
    item.active = false;
    item.img.setVisible(false);
  }
}
