import Phaser from 'phaser';
import { DEPTH } from '../config/gameConfig.js';
import { PLAYER, WIND, FX } from '../config/balanceConfig.js';

const moveToward = (value, target, maxDelta) =>
  value < target ? Math.min(value + maxDelta, target) : Math.max(value - maxDelta, target);

/** Frame-rate independent exponential approach. */
const damp = (current, target, rate, dt) => current + (target - current) * (1 - Math.exp(-rate * dt));

/**
 * The player is split in two:
 *  - `zone`: an invisible Arcade Physics body that owns position, velocity and collisions
 *  - `visual`: the sprite, free to lean, squash and stretch without distorting the hitbox
 *
 * Events (on `player.events`): 'jump', 'land' (impactSpeed), 'anchor', 'dust' (x, y)
 */
export default class Player {
  constructor(scene, x, groundY) {
    this.scene = scene;
    this.events = new Phaser.Events.EventEmitter();

    this.zone = scene.add.zone(x, groundY - PLAYER.bodyHeight / 2, PLAYER.bodyWidth, PLAYER.bodyHeight);
    scene.physics.add.existing(this.zone);
    this.body = this.zone.body;
    this.body.setCollideWorldBounds(true);
    this.body.maxVelocity.set(2000, PLAYER.maxFallSpeed);

    this.visual = scene.add.image(x, groundY, 'player-idle').setOrigin(0.5, 1).setDepth(DEPTH.player);
    this.umbrella = scene.add
      .image(x, groundY, 'umbrella-held')
      .setOrigin(0.5, 1)
      .setDepth(DEPTH.player + 1)
      .setVisible(false);

    this.hp = PLAYER.startHp;
    this.maxHp = PLAYER.maxHp;
    this.shield = 0;

    this.alive = true;
    this.finished = false;
    this.facing = 1;
    this.anchored = false;
    this.grounded = false;
    this.wasGrounded = true;
    this.isJumping = false;
    this.inputDir = 0;
    this.drift = 0;
    this.prevVy = 0;

    // All timers in ms, driven by update() so they freeze while the scene is paused.
    this.clock = 0;
    this.lastGroundedAt = -Infinity;
    this.jumpPressedAt = -Infinity;
    this.invulnTimer = 0;
    this.stunTimer = 0;
    this.flashTimer = 0;
    this.dustTimer = 0;

    this.walkPhase = 0;
    this.lean = 0;
    this.squashX = 1;
    this.squashY = 1;
  }

  get x() {
    return this.body.center.x;
  }

  get y() {
    return this.body.center.y;
  }

  get isInvulnerable() {
    return this.invulnTimer > 0;
  }

  /**
   * @param {number} dt seconds
   * @param {{left:boolean,right:boolean,jumpPressed:boolean,jumpHeld:boolean,anchor:boolean}} input
   * @param {{force:number, exposure:number}} wind signed wind force and shelter exposure (0..1)
   */
  update(dt, input, wind) {
    const ms = dt * 1000;
    this.clock += ms;
    this.invulnTimer = Math.max(0, this.invulnTimer - ms);
    this.stunTimer = Math.max(0, this.stunTimer - ms);
    this.flashTimer = Math.max(0, this.flashTimer - ms);
    if (!this.alive || this.finished) return;

    const body = this.body;
    const grounded = body.blocked.down || body.touching.down;
    const stunned = this.stunTimer > 0;
    this.grounded = grounded;

    if (grounded) {
      this.lastGroundedAt = this.clock;
      if (!this.wasGrounded) this.onLand();
    }
    if (input.jumpPressed) this.jumpPressedAt = this.clock;

    // Anchor: only on the ground. Blocks walking and jumping, and nearly cancels the wind.
    const wantsAnchor = input.anchor && grounded && !stunned;
    if (wantsAnchor !== this.anchored) {
      this.anchored = wantsAnchor;
      if (wantsAnchor) {
        this.squash(1.25, 0.72);
        this.events.emit('anchor');
      } else {
        this.squash(0.9, 1.12);
      }
    }

    let dir = 0;
    if (!stunned && !this.anchored) dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    if (dir !== 0) this.facing = dir;
    this.inputDir = dir;

    // Wind defines a "drift" velocity: the speed a passive player would be carried at. The player
    // steers toward walkSpeed * dir + drift, so wind adds to or subtracts from their own speed.
    let drift = wind.force * WIND.maxPush * wind.exposure;
    if (!grounded) drift *= WIND.airPushMultiplier;
    if (this.anchored) drift *= WIND.anchorFactor;
    this.drift = drift;

    const target = Phaser.Math.Clamp(dir * PLAYER.walkSpeed + drift, -PLAYER.maxSpeed, PLAYER.maxSpeed);
    body.velocity.x = this.steer(body.velocity.x, target, dir, grounded, stunned, dt);

    this.updateJump(input, grounded, stunned);

    this.wasGrounded = grounded;
    this.prevVy = body.velocity.y;
  }

  steer(vx, target, dir, grounded, stunned, dt) {
    if (stunned) return moveToward(vx, target, PLAYER.airDecel * dt);
    if (this.anchored) return moveToward(vx, target, PLAYER.anchorBrake * dt);
    if (dir !== 0) return moveToward(vx, target, (grounded ? PLAYER.groundAccel : PLAYER.airAccel) * dt);

    // No input: first brake away any speed the wind isn't providing, then let the wind take
    // hold gradually (windGrip) so being blown around feels weighty rather than instant.
    const braking = vx !== 0 && (Math.sign(vx) !== Math.sign(target) || Math.abs(vx) > Math.abs(target));
    if (braking) {
      const brakeTo = Math.sign(vx) === Math.sign(target) ? target : 0;
      return moveToward(vx, brakeTo, (grounded ? PLAYER.groundDecel : PLAYER.airDecel) * dt);
    }
    return moveToward(vx, target, WIND.windGrip * dt);
  }

  updateJump(input, grounded, stunned) {
    const body = this.body;
    // Coyote time: a jump is still allowed shortly after walking off a ledge.
    const canJump =
      !this.anchored && !stunned && (grounded || this.clock - this.lastGroundedAt <= PLAYER.coyoteTimeMs);
    // Jump buffering: a press slightly before landing still counts.
    const buffered = this.clock - this.jumpPressedAt <= PLAYER.jumpBufferMs;

    if (canJump && buffered) {
      body.velocity.y = PLAYER.jumpVelocity;
      this.isJumping = true;
      this.jumpPressedAt = -Infinity;
      this.lastGroundedAt = -Infinity;
      this.squash(0.78, 1.25);
      this.events.emit('jump');
    }

    // Variable height: releasing jump while rising cuts the ascent short.
    if (this.isJumping && !input.jumpHeld && body.velocity.y < 0) {
      body.velocity.y *= PLAYER.jumpCutMultiplier;
      this.isJumping = false;
    }
    if (body.velocity.y >= 0) this.isJumping = false;
  }

  onLand() {
    const impact = this.prevVy;
    if (impact > PLAYER.landSquashMinSpeed) {
      const k = Math.min(1, impact / 700);
      this.squash(1 + 0.3 * k, 1 - 0.28 * k);
      this.events.emit('land', impact);
    }
  }

  squash(sx, sy) {
    this.squashX = sx;
    this.squashY = sy;
  }

  /**
   * @param {number} fromDir horizontal direction the hit travels in (knockback direction)
   * @returns {'ignored'|'blocked'|'shield-broken'|'hurt'|'dead'}
   */
  takeHit(fromDir) {
    if (!this.alive || this.finished || this.invulnTimer > 0) return 'ignored';
    const dir = fromDir || -this.facing;

    if (this.shield > 0) {
      this.shield -= 1;
      this.invulnTimer = PLAYER.shieldBlockInvulnerableMs;
      this.body.velocity.x += dir * PLAYER.shieldKnockbackX;
      this.squash(1.15, 0.88);
      return this.shield === 0 ? 'shield-broken' : 'blocked';
    }

    this.hp = Math.max(0, this.hp - 1);
    this.invulnTimer = PLAYER.invulnerableMs;
    this.stunTimer = PLAYER.stunMs;
    this.flashTimer = 90;
    this.anchored = false;
    this.isJumping = false;
    this.body.velocity.x = dir * PLAYER.knockbackX;
    this.body.velocity.y = PLAYER.knockbackY;
    this.squash(0.8, 1.2);
    return this.hp <= 0 ? 'dead' : 'hurt';
  }

  /** @returns {boolean} whether any health was restored */
  heal(amount) {
    if (this.hp >= this.maxHp) return false;
    this.hp = Math.min(this.maxHp, this.hp + amount);
    this.squash(1.15, 0.9);
    return true;
  }

  addShield(durability) {
    this.shield = Math.max(this.shield, durability);
    this.squash(0.9, 1.15);
  }

  /** Funny, short defeat: the kid pops up and tumbles away on the wind. */
  die(windDir, onComplete) {
    if (!this.alive) return;
    this.alive = false;
    this.anchored = false;
    this.body.stop();
    this.body.enable = false;
    this.umbrella.setVisible(false);
    this.visual.setTexture('player-dead').clearTint().setAlpha(1);

    const dir = windDir || -this.facing;
    const v = this.visual;
    this.scene.tweens.chain({
      targets: v,
      tweens: [
        { y: v.y - 50, scaleX: 1.15, scaleY: 1.15, duration: 160, ease: 'Quad.easeOut' },
        { x: v.x + dir * 520, y: v.y - 340, angle: dir * 900, scale: 0.5, duration: 650, ease: 'Quad.easeIn' },
      ],
      onComplete,
    });
  }

  /** Victory: hop over to the door, cheer, and slip inside. */
  celebrate(doorX, onComplete) {
    if (this.finished || !this.alive) return;
    this.finished = true;
    this.anchored = false;
    this.body.stop();
    this.body.enable = false;
    this.umbrella.setVisible(false);
    this.visual.setTexture('player-win').setRotation(0).setScale(1).clearTint().setAlpha(1);
    this.visual.setFlipX(false);

    const v = this.visual;
    const groundY = v.y;
    this.scene.tweens.chain({
      targets: v,
      tweens: [
        { x: doorX, duration: 220, ease: 'Sine.easeOut' },
        { y: groundY - 46, duration: 200, ease: 'Quad.easeOut', yoyo: true, repeat: 1 },
        { alpha: 0, scaleX: 0.75, scaleY: 0.75, duration: 260, ease: 'Quad.easeIn' },
      ],
      onComplete,
    });
  }

  /** Picks the pose, then applies lean, squash/stretch and invulnerability flicker. */
  updateVisual(dt, wind) {
    if (!this.alive || this.finished) return;
    const body = this.body;
    const v = this.visual;
    const vx = body.velocity.x;
    const grounded = this.grounded;
    const effectiveWind = wind.force * wind.exposure;

    v.x = body.center.x;
    v.y = body.bottom;

    const againstWind = this.inputDir !== 0 && Math.sign(effectiveWind) === -this.inputDir && Math.abs(effectiveWind) > 0.35;
    const blownAround = this.inputDir === 0 && Math.abs(vx) > 70 && Math.abs(this.drift) > 60;

    let pose;
    if (this.stunTimer > 0) pose = 'hurt';
    else if (this.anchored) pose = 'anchor';
    else if (!grounded) pose = body.velocity.y < 0 ? 'jump' : 'fall';
    else if (blownAround) pose = 'pushed';
    else if (Math.abs(vx) > 15 || this.inputDir !== 0) {
      this.walkPhase += dt * Math.max(4, Math.abs(vx) / 22);
      const frame = Math.floor(this.walkPhase) % 2;
      pose = againstWind ? (frame ? 'struggle2' : 'struggle1') : frame ? 'walk2' : 'walk1';
    } else pose = 'idle';
    v.setTexture(`player-${pose}`);
    v.setFlipX(this.facing < 0);

    // Lean into the wind on the ground; tilt with travel in the air.
    let leanTarget;
    if (this.stunTimer > 0) leanTarget = -Math.sign(vx) * 0.3;
    else if (this.anchored) leanTarget = -effectiveWind * 0.12;
    else if (grounded) leanTarget = -effectiveWind * 0.28 + this.inputDir * 0.06;
    else leanTarget = Phaser.Math.Clamp(vx / PLAYER.maxSpeed, -1, 1) * 0.18;
    this.lean = damp(this.lean, leanTarget, 10, dt);
    v.rotation = this.lean;

    this.squashX = damp(this.squashX, 1, 12, dt);
    this.squashY = damp(this.squashY, 1, 12, dt);
    const breathe = pose === 'idle' ? 1 + Math.sin(this.clock / 260) * 0.02 : 1;
    v.setScale(this.squashX, this.squashY * breathe);

    if (this.flashTimer > 0) v.setTintFill(0xffffff);
    else v.clearTint();
    v.setAlpha(this.invulnTimer > 0 && Math.floor(this.clock / 70) % 2 ? 0.35 : 1);

    // Scraping dust while being shoved backward or bracing against strong wind.
    const scraping =
      grounded && (pose === 'pushed' || (againstWind && vx * this.inputDir < 40) || (this.anchored && Math.abs(effectiveWind) > 0.45));
    this.dustTimer -= dt * 1000;
    if (scraping && this.dustTimer <= 0) {
      this.dustTimer = FX.dustIntervalMs;
      this.events.emit('dust', v.x - Math.sign(effectiveWind || 1) * 10, v.y - 4);
    }

    this.updateUmbrella(wind);
  }

  updateUmbrella(wind) {
    const u = this.umbrella;
    if (this.shield <= 0) {
      u.setVisible(false);
      return;
    }
    const v = this.visual;
    const height = (this.anchored ? 52 : 64) * this.squashY;
    u.setVisible(true);
    u.setPosition(v.x + Math.sin(this.lean) * height, v.y - Math.cos(this.lean) * height);
    u.rotation = this.lean - wind.force * wind.exposure * 0.35 + Math.sin(this.clock / 90) * 0.04 * Math.abs(wind.force);
    // One hit left: the umbrella looks battered.
    u.setAlpha(this.shield === 1 ? 0.75 : 1);
    u.setTint(this.shield === 1 ? 0xc5d9f5 : 0xffffff);
    if (this.invulnTimer > 0 && Math.floor(this.clock / 70) % 2) u.setAlpha(0.4);
  }
}
