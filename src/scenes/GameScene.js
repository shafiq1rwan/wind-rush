import Phaser from 'phaser';
import { GAME_HEIGHT, CSS } from '../config/gameConfig.js';
import { PLAYER, CAMERA, SHIELD, HEAL } from '../config/balanceConfig.js';
import { LEVELS } from '../data/levels.js';
import Player from '../entities/Player.js';
import LevelManager from '../systems/LevelManager.js';
import WindSystem from '../systems/WindSystem.js';
import WindEffects from '../systems/WindEffects.js';
import DebrisManager from '../systems/DebrisManager.js';
import Effects from '../systems/Effects.js';
import { audio } from '../systems/AudioManager.js';
import { platform } from '../systems/PlatformAdapter.js';

/**
 * Runs one level. Owns the systems and wires their interactions; the HUD lives in UIScene and
 * listens to the events emitted here:
 *   'hp-changed' (hp, delta)  'shield-changed' (shield)  'gust-warning' ({direction, duration})
 *   'gust-start' ({direction})  'player-dead'  'level-complete'  'paused-changed' (paused)
 */
export default class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  init(data) {
    this.levelIndex = data?.levelIndex ?? 0;
    this.levelData = LEVELS[this.levelIndex];
    this.state = 'playing'; // 'playing' | 'dead' | 'won'
    this.elapsed = 0;
    this.damageTaken = 0;
    this.isLeaving = false;
    this.windExposure = 1;
    this.windInfo = { force: 0, exposure: 1 };
    this.inputState = { left: false, right: false, jumpPressed: false, jumpHeld: false, anchor: false };
  }

  create() {
    const L = this.levelData;
    this.physics.world.gravity.y = PLAYER.gravity;
    this.physics.world.setBounds(0, 0, L.width, GAME_HEIGHT + 400);
    // Solid left/right edges; open top and bottom so pits can be fallen into.
    this.physics.world.setBoundsCollision(true, true, false, false);

    this.level = new LevelManager(this, L);
    this.level.build();
    this.wind = new WindSystem(L.wind);
    this.fx = new Effects(this);
    this.windFx = new WindEffects(this, this.wind, {
      clouds: this.level.clouds,
      swayers: this.level.swayers,
      groundY: L.groundY,
    });
    this.player = new Player(this, L.playerStartX, L.groundY);
    this.debris = new DebrisManager(this, this.wind, this.level);

    this.physics.add.collider(this.player.zone, this.level.solids);
    this.physics.add.overlap(this.player.zone, this.debris.group, this.onDebrisContact, null, this);
    this.physics.add.overlap(this.debris.group, this.level.obstacleGroup, this.onDebrisHitsObstacle, null, this);
    this.physics.add.overlap(this.player.zone, this.level.finishZone, this.onReachShelter, null, this);

    const cam = this.cameras.main;
    cam.setBounds(0, 0, L.width, GAME_HEIGHT);
    cam.startFollow(this.player.zone, true, CAMERA.lerpX, CAMERA.lerpY);
    cam.setFollowOffset(CAMERA.offsetX, 0);

    this.keys = this.input.keyboard.addKeys({
      left: 'LEFT',
      right: 'RIGHT',
      a: 'A',
      d: 'D',
      up: 'UP',
      w: 'W',
      space: 'SPACE',
      down: 'DOWN',
      s: 'S',
    });

    this.bindSystemEvents();

    audio.startWind();
    platform.gameplayStart();
    this.scene.launch('UIScene');
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.onShutdown, this);
  }

  bindSystemEvents() {
    const cam = this.cameras.main;
    this.wind.on('gust-warning', (info) => {
      audio.play('gustWarning');
      this.events.emit('gust-warning', info);
    });
    this.wind.on('gust-start', (info) => {
      audio.play('gust');
      cam.shake(CAMERA.gustShake.duration, CAMERA.gustShake.intensity);
      this.events.emit('gust-start', info);
    });

    const p = this.player;
    p.events.on('jump', () => {
      audio.play('jump');
      this.fx.dust(p.x, p.body.bottom, 3);
    });
    p.events.on('land', () => {
      audio.play('land');
      this.fx.dust(p.x, p.body.bottom, 4);
    });
    p.events.on('anchor', () => audio.play('anchor'));
    p.events.on('dust', (x, y) => this.fx.dust(x, y, 1));
  }

  update(time, delta) {
    // Clamp long frames (tab switches, hitches) so physics-driving code never takes a huge step.
    const dt = Math.min(delta, 50) / 1000;

    this.wind.update(dt);
    this.windExposure = this.level.getWindExposure(this.player.body, this.wind.force);
    this.windInfo.force = this.wind.force;
    this.windInfo.exposure = this.windExposure;

    if (this.state === 'playing') {
      this.elapsed += dt;
      this.readInput();
    }

    this.player.update(dt, this.inputState, this.windInfo);
    this.player.updateVisual(dt, this.windInfo);
    this.debris.update(dt, this.player.x, (d) => this.onDebrisBounce(d));
    this.windFx.update(dt);
    this.level.update();
    audio.setWind(this.wind.strength);

    if (this.state === 'playing' && this.player.body.top > this.levelData.groundY + PLAYER.fallDeathMargin) {
      this.killPlayer();
    }
  }

  readInput() {
    const k = this.keys;
    const i = this.inputState;
    i.left = k.left.isDown || k.a.isDown;
    i.right = k.right.isDown || k.d.isDown;
    i.jumpHeld = k.space.isDown || k.up.isDown || k.w.isDown;
    // Evaluate every JustDown so none of them stays latched into the next frame.
    const space = Phaser.Input.Keyboard.JustDown(k.space);
    const up = Phaser.Input.Keyboard.JustDown(k.up);
    const w = Phaser.Input.Keyboard.JustDown(k.w);
    i.jumpPressed = space || up || w;
    i.anchor = k.down.isDown || k.s.isDown;
  }

  clearInput() {
    const i = this.inputState;
    i.left = i.right = i.jumpPressed = i.jumpHeld = i.anchor = false;
  }

  onDebrisContact(zone, debris) {
    if (!debris.active || this.state !== 'playing') return;
    const p = this.player;

    if (debris.category === 'danger') {
      const fromDir = Math.sign(debris.body.velocity.x) || debris.dir;
      const result = p.takeHit(fromDir);
      if (result === 'ignored') return; // invulnerable: let it fly past
      this.fx.debrisBreak(debris.x, debris.y, debris.typeKey);
      debris.recycle();

      if (result === 'blocked' || result === 'shield-broken') {
        const cam = this.cameras.main;
        cam.shake(CAMERA.blockShake.duration, CAMERA.blockShake.intensity);
        if (result === 'blocked') {
          this.fx.shieldBlock(p.x, p.body.top - 10);
          this.fx.floatText(p.x, p.body.top - 50, 'BLOCKED!', CSS.shield);
          audio.play('shieldBlock');
        } else {
          this.fx.shieldBreak(p.x, p.body.top - 20);
          this.fx.floatText(p.x, p.body.top - 50, 'UMBRELLA BROKE!', CSS.shield);
          audio.play('shieldBreak');
        }
        this.events.emit('shield-changed', p.shield);
        return;
      }

      this.damageTaken += 1;
      this.fx.hit(p.x, p.y);
      audio.play('hurt');
      this.cameras.main.shake(CAMERA.hitShake.duration, CAMERA.hitShake.intensity);
      this.events.emit('hp-changed', p.hp, -1);
      if (result === 'dead') this.killPlayer();
      return;
    }

    if (debris.category === 'heal') {
      const healed = p.heal(HEAL.amount);
      this.fx.heal(debris.x, debris.y);
      this.fx.floatText(debris.x, debris.y - 30, healed ? `+${HEAL.amount}` : 'FULL HEALTH', CSS.healLight);
      audio.play('heal');
      debris.recycle();
      if (healed) this.events.emit('hp-changed', p.hp, HEAL.amount);
      return;
    }

    if (debris.category === 'shield') {
      p.addShield(SHIELD.durability);
      this.fx.shieldPickup(debris.x, debris.y);
      this.fx.floatText(debris.x, debris.y - 30, 'SHIELD!', CSS.shield);
      audio.play('shieldPickup');
      debris.recycle();
      this.events.emit('shield-changed', p.shield);
    }
  }

  /** Crates act as cover: hazards that fly into them shatter. Pickups drift through. */
  onDebrisHitsObstacle(debris) {
    if (!debris.active || debris.category !== 'danger') return;
    this.fx.debrisBreak(debris.x, debris.y, debris.typeKey);
    debris.recycle();
    if (this.cameras.main.worldView.contains(debris.x, debris.y)) audio.play('debrisBreak');
  }

  onDebrisBounce(debris) {
    if (this.cameras.main.worldView.contains(debris.x, debris.y)) this.fx.dust(debris.x, debris.y + 10, 2);
  }

  killPlayer() {
    if (this.state !== 'playing') return;
    this.state = 'dead';
    this.clearInput();
    platform.gameplayStop();
    audio.play('defeat');
    this.cameras.main.shake(CAMERA.deathShake.duration, CAMERA.deathShake.intensity);
    this.events.emit('player-dead');
    this.player.die(this.wind.direction, () => {
      this.scene.launch('GameOverScene', { levelIndex: this.levelIndex });
    });
  }

  onReachShelter() {
    if (this.state !== 'playing') return;
    this.state = 'won';
    this.clearInput();
    this.debris.setSpawning(false);
    platform.gameplayStop();
    audio.play('victory');
    this.events.emit('level-complete');

    const result = {
      levelIndex: this.levelIndex,
      time: this.elapsed,
      damageTaken: this.damageTaken,
      parTime: this.levelData.parTime,
      stars: this.computeStars(),
      hasNext: this.levelIndex + 1 < LEVELS.length,
    };
    this.player.celebrate(this.level.finishX, () => this.scene.launch('LevelCompleteScene', result));
  }

  /** 1 star for finishing, +1 for taking no damage, +1 for beating the par time. */
  computeStars() {
    let stars = 1;
    if (this.damageTaken === 0) stars += 1;
    if (this.elapsed <= this.levelData.parTime) stars += 1;
    return stars;
  }

  /** Pauses/resumes active play. Returns false if pausing isn't allowed right now. */
  setPaused(paused) {
    if (paused) {
      if (this.state !== 'playing' || this.scene.isPaused()) return false;
      this.scene.pause();
      platform.gameplayStop();
      audio.setWind(this.wind.strength, 0.3);
    } else {
      if (!this.scene.isPaused()) return false;
      // Keys released while paused would otherwise stay "down".
      this.input.keyboard.resetKeys();
      this.scene.resume();
      if (this.state === 'playing') platform.gameplayStart();
    }
    this.events.emit('paused-changed', paused);
    return true;
  }

  restartLevel() {
    this.startLevel(this.levelIndex);
  }

  startLevel(index) {
    if (this.isLeaving) return;
    this.isLeaving = true;
    this.scene.stop('GameOverScene');
    this.scene.stop('LevelCompleteScene');
    this.scene.restart({ levelIndex: index });
  }

  goToMenu() {
    if (this.isLeaving) return;
    this.isLeaving = true;
    this.scene.stop('GameOverScene');
    this.scene.stop('LevelCompleteScene');
    this.scene.start('MenuScene');
  }

  onShutdown() {
    platform.gameplayStop();
    audio.stopWind();
    this.wind.destroy();
    this.player.events.removeAllListeners();
    this.scene.stop('UIScene');
  }
}
