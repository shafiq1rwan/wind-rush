import Phaser from 'phaser';
import { DEPTH, GAME_WIDTH, GAME_HEIGHT, FONT_FAMILY } from '../config/gameConfig.js';
import { WIND } from '../config/balanceConfig.js';
import { addSkyBackground } from '../utils/graphicsFactory.js';
import { touchUI } from '../utils/device.js';

const CRATE = 64;
const GROUND_HEIGHT = 80;

/**
 * Builds a level from its data object (src/data/levels.js): backdrop layers, decorations,
 * physics solids, signs and the finish shelter. Also answers wind-shelter queries.
 */
export default class LevelManager {
  constructor(scene, data) {
    this.scene = scene;
    this.data = data;
    this.width = data.width;
    this.groundY = data.groundY;
    this.finishX = data.shelter.x;

    this.obstacleRects = [];
    this.swayers = [];
    this.clouds = [];
  }

  build() {
    this.rng = new Phaser.Math.RandomDataGenerator([String(this.data.decorSeed ?? this.data.id)]);
    addSkyBackground(this.scene);
    this.buildBackdrop();
    this.buildDecor();
    this.buildGround();
    this.buildObstacles();
    this.buildSigns();
    this.buildShelter();
  }

  buildBackdrop() {
    const scene = this.scene;
    for (let i = 0; i < 7; i++) {
      const cloud = scene.add
        .image(this.rng.between(0, GAME_WIDTH + 300), this.rng.between(40, 260), 'cloud')
        .setScrollFactor(0.1)
        .setDepth(DEPTH.clouds)
        .setAlpha(this.rng.realInRange(0.55, 0.9))
        .setScale(this.rng.realInRange(0.6, 1.3));
      this.clouds.push(cloud);
    }
    // Repeating skyline strips fixed to the camera; parallax comes from scrolling their texture.
    this.far = scene.add
      .tileSprite(0, this.groundY - 40, GAME_WIDTH, 220, 'skyline-far')
      .setOrigin(0, 1)
      .setScrollFactor(0)
      .setDepth(DEPTH.far);
    this.mid = scene.add
      .tileSprite(0, this.groundY + 4, GAME_WIDTH, 300, 'buildings-mid')
      .setOrigin(0, 1)
      .setScrollFactor(0)
      .setDepth(DEPTH.mid)
      .setTint(0xe4ecf4);
  }

  buildDecor() {
    const end = this.finishX - 260;
    for (let x = 220; x < end; x += this.rng.between(280, 460)) {
      const isTree = this.rng.frac() < 0.6;
      const img = this.scene.add
        .image(x, this.groundY + 4, isTree ? 'tree' : 'lamp')
        .setOrigin(0.5, 1)
        .setDepth(DEPTH.decor);
      if (isTree) img.setScale(this.rng.realInRange(0.85, 1.1));
      this.swayers.push({ img, phase: this.rng.realInRange(0, Math.PI * 2), amount: isTree ? 1 : 0.25 });
    }
  }

  buildGround() {
    const scene = this.scene;
    this.groundGroup = scene.physics.add.staticGroup();
    // The street runs from the surface to the bottom of the screen: sidewalk + far lane on top,
    // then the near lane and near curb filling the strip where the touch controls sit.
    const depth = Math.max(GROUND_HEIGHT, GAME_HEIGHT - this.groundY);
    for (const seg of this.data.ground) {
      scene.add
        .tileSprite(seg.x, this.groundY, seg.width, GROUND_HEIGHT, 'ground')
        .setOrigin(0, 0)
        .setDepth(DEPTH.ground);
      if (depth > GROUND_HEIGHT) {
        scene.add
          .tileSprite(seg.x, this.groundY + GROUND_HEIGHT, seg.width, depth - GROUND_HEIGHT, 'road-lower')
          .setOrigin(0, 0)
          .setDepth(DEPTH.ground);
      }
      const zone = scene.add.zone(seg.x + seg.width / 2, this.groundY + depth / 2, seg.width, depth);
      this.groundGroup.add(zone);
    }
  }

  buildObstacles() {
    const scene = this.scene;
    this.obstacleGroup = scene.physics.add.staticGroup();
    for (const ob of this.data.obstacles) {
      ob.heights.forEach((h, col) => {
        const left = ob.x + col * CRATE;
        const top = this.groundY - h * CRATE;
        for (let j = 0; j < h; j++) {
          scene.add
            .image(left + CRATE / 2, this.groundY - CRATE / 2 - j * CRATE, 'crate')
            .setDepth(DEPTH.solids)
            .setFlipX(this.rng.frac() < 0.5);
        }
        // One physics body per column keeps seams out of the collision surface.
        const zone = scene.add.zone(left + CRATE / 2, top + (h * CRATE) / 2, CRATE, h * CRATE);
        this.obstacleGroup.add(zone);
        this.obstacleRects.push({ left, right: left + CRATE, top, bottom: this.groundY });
      });
    }
  }

  buildSigns() {
    for (const sign of this.data.signs) {
      this.scene.add.image(sign.x, this.groundY, 'sign').setOrigin(0.5, 1).setDepth(DEPTH.signs);
      this.scene.add
        .text(sign.x, this.groundY - 130 + 41, (touchUI.enabled && sign.touchText) || sign.text, {
          fontFamily: FONT_FAMILY,
          fontSize: '17px',
          fontStyle: 'bold',
          color: '#4a3220',
          align: 'center',
          lineSpacing: 2,
        })
        .setOrigin(0.5)
        .setDepth(DEPTH.signs + 1);
    }
  }

  buildShelter() {
    const scene = this.scene;
    const x = this.finishX;
    scene.add.image(x, this.groundY + 2, 'shelter').setOrigin(0.5, 1).setDepth(DEPTH.shelter);
    scene.add
      .text(x, this.groundY - 196, 'SHELTER', {
        fontFamily: FONT_FAMILY,
        fontSize: '26px',
        fontStyle: 'bold',
        color: '#ffc93c',
        stroke: '#2b2d42',
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.shelter + 1);

    // A bobbing arrow over the door makes the destination unmistakable.
    const arrow = scene.add
      .image(x, this.groundY - 250, 'hud-arrow')
      .setAngle(90)
      .setTint(0xffc93c)
      .setDepth(DEPTH.shelter + 1);
    scene.tweens.add({ targets: arrow, y: arrow.y - 14, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    this.finishZone = scene.add.zone(x, this.groundY - 50, 40, 100);
    scene.physics.add.existing(this.finishZone, true);
  }

  /** The static groups the player stands on. */
  get solids() {
    return [this.groundGroup, this.obstacleGroup];
  }

  /**
   * Fraction of the wind reaching a body (1 = fully exposed). A player standing on the
   * downwind (lee) side of an obstacle at least as tall as their middle is sheltered.
   */
  getWindExposure(body, force) {
    if (Math.abs(force) < 0.01) return 1;
    const blowsLeft = force < 0;
    const midY = body.top + body.height * 0.5;
    for (const r of this.obstacleRects) {
      if (midY < r.top) continue;
      const reach = (r.bottom - r.top) * WIND.shelterReachMultiplier + 8;
      // Wind blowing left is blocked on the obstacle's left side, and vice versa.
      const gap = blowsLeft ? r.left - body.right : body.left - r.right;
      if (gap >= -2 && gap <= reach) return WIND.shelterFactor;
    }
    return 1;
  }

  update() {
    const scrollX = this.scene.cameras.main.scrollX;
    this.far.tilePositionX = scrollX * 0.2;
    this.mid.tilePositionX = scrollX * 0.45;
  }
}
