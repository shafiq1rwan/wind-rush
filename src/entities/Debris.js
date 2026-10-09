import Phaser from 'phaser';
import { DEPTH } from '../config/gameConfig.js';
import { DEBRIS } from '../config/balanceConfig.js';

/**
 * A pooled flying object: hazard (plank, brick) or pickup (heal kit, umbrella).
 * Instances are recycled by DebrisManager via launch() / disableBody().
 */
export default class Debris extends Phaser.Physics.Arcade.Image {
  constructor(scene, x, y) {
    super(scene, x, y, 'debris-plank');
    this.typeKey = 'plank';
    this.cfg = DEBRIS.types.plank;
    this.category = 'danger';
    this.dir = -1;
    this.age = 0;
    this.phase = 0;
  }

  launch(typeKey, x, y, dir, windForce) {
    const cfg = DEBRIS.types[typeKey];
    this.typeKey = typeKey;
    this.cfg = cfg;
    this.category = cfg.category;
    this.dir = dir;
    this.age = 0;
    this.phase = Math.random() * Math.PI * 2;
    this.rolling = false;

    this.setTexture(cfg.texture);
    this.enableBody(true, x, y, true, true);
    this.setRotation(0).setScale(1).setAlpha(1);
    this.setDepth(cfg.category === 'danger' ? DEPTH.debris : DEPTH.pickups);

    const body = this.body;
    body.setAllowGravity(false);
    // A circular hitbox stays fair while the sprite spins, and is a little forgiving on the ends.
    body.setCircle(cfg.radius, this.width / 2 - cfg.radius, this.height / 2 - cfg.radius);
    const tailwind = Math.max(0, windForce * dir);
    body.setVelocity(dir * (cfg.speed + tailwind * cfg.windSpeed), cfg.launchVy ?? 0);
    body.setAngularVelocity(cfg.spin ? dir * Phaser.Math.Between(cfg.spin[0], cfg.spin[1]) : 0);
    return this;
  }

  /**
   * Per-frame motion. Wind along the travel direction speeds the object up and a headwind slows
   * it, but it never reverses, so debris always crosses the screen in a readable way.
   * @returns {boolean} true if a bouncing object hit the ground this frame
   */
  tick(dt, windForce, groundY) {
    const cfg = this.cfg;
    const body = this.body;
    this.age += dt;

    const along = windForce * this.dir;
    const targetVx = this.dir * Math.max(cfg.minSpeed, cfg.speed + along * cfg.windSpeed);
    body.velocity.x += (targetVx - body.velocity.x) * (1 - Math.exp(-DEBRIS.windResponse * dt));

    if (cfg.gravity) {
      const floor = groundY - cfg.radius;
      if (this.rolling) {
        body.velocity.y = 0;
        this.y = floor;
        body.setAngularVelocity((body.velocity.x / cfg.radius) * Phaser.Math.RAD_TO_DEG);
        return false;
      }
      body.velocity.y += cfg.gravity * dt;
      if (this.y >= floor && body.velocity.y > 0) {
        this.y = floor;
        const rebound = body.velocity.y * cfg.bounce;
        if (rebound < 90) {
          this.rolling = true;
          body.velocity.y = 0;
        } else {
          body.velocity.y = -rebound;
        }
        return true;
      }
    } else if (cfg.bob) {
      // Velocity is the derivative of a sine bob, giving a smooth floating path.
      body.velocity.y = Math.cos(this.age * cfg.bobSpeed + this.phase) * cfg.bob * cfg.bobSpeed;
      this.setScale(1 + Math.sin(this.age * 6) * 0.06);
    } else if (cfg.flutter) {
      body.velocity.y = Math.sin(this.age * 4 + this.phase) * cfg.flutter;
    }
    return false;
  }

  recycle() {
    this.disableBody(true, true);
  }
}
