import Phaser from 'phaser';
import { GAME_WIDTH, CSS } from '../config/gameConfig.js';
import { addSkyBackground } from '../utils/graphicsFactory.js';
import { createButton, textStyle } from '../utils/uiFactory.js';
import { audio } from '../systems/AudioManager.js';
import WindEffects from '../systems/WindEffects.js';
import { touchUI } from '../utils/device.js';
import { requestMobileFullscreen } from '../systems/MobileDisplay.js';

const GROUND_Y = 640;
// Above the wind streaks (DEPTH.windFx).
const UI_DEPTH = 100;

/** Minimal title screen: also provides the user gesture that unlocks audio. */
export default class MenuScene extends Phaser.Scene {
  constructor() {
    super('MenuScene');
  }

  create() {
    this.starting = false;
    addSkyBackground(this);

    const clouds = [0, 1, 2, 3, 4].map((i) =>
      this.add
        .image(140 + i * 280, 70 + (i % 2) * 90, 'cloud')
        .setAlpha(0.8)
        .setScale(0.7 + (i % 3) * 0.25),
    );
    this.far = this.add.tileSprite(0, GROUND_Y - 40, GAME_WIDTH, 220, 'skyline-far').setOrigin(0, 1);
    this.mid = this.add.tileSprite(0, GROUND_Y + 4, GAME_WIDTH, 300, 'buildings-mid').setOrigin(0, 1).setTint(0xe4ecf4);
    this.add.tileSprite(0, GROUND_Y, GAME_WIDTH, 80, 'ground').setOrigin(0, 0);

    const tree = this.add.image(1080, GROUND_Y + 4, 'tree').setOrigin(0.5, 1);
    this.windFx = new WindEffects(this, { force: -0.45 }, {
      clouds,
      swayers: [{ img: tree, phase: 0, amount: 1 }],
      groundY: GROUND_Y,
    });

    const hero = this.add
      .image(220, GROUND_Y, 'player-struggle1')
      .setOrigin(0.5, 1)
      .setScale(1.6)
      .setRotation(0.12)
      .setDepth(UI_DEPTH);
    this.time.addEvent({
      delay: 160,
      loop: true,
      callback: () => hero.setTexture(hero.texture.key === 'player-struggle1' ? 'player-struggle2' : 'player-struggle1'),
    });

    const title = this.add
      .text(640, 130, 'WIND RUSH', textStyle(112, CSS.coat, { stroke: CSS.ink, strokeThickness: 14 }))
      .setOrigin(0.5)
      .setDepth(UI_DEPTH);
    this.tweens.add({ targets: title, angle: { from: -2, to: 2 }, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.add
      .text(640, 222, 'Brave the storm. Reach the shelter.', textStyle(28, CSS.white, { stroke: CSS.ink, strokeThickness: 6 }))
      .setOrigin(0.5)
      .setDepth(UI_DEPTH);

    createButton(this, 640, 320, 'PLAY', () => this.onPlayTap(), { width: 280, height: 76, fontSize: 36 }).setDepth(UI_DEPTH);
    const secondary = { width: 240, height: 56, fontSize: 22, color: 0xdfe7f2, hoverColor: 0xffffff };
    // Manual fullscreen toggle on touch devices that support it (not iOS Safari on iPhone).
    const offerFullscreen = touchUI.enabled && this.scale.fullscreen.available;
    this.soundButton = createButton(this, offerFullscreen ? 510 : 640, 412, this.soundLabel(), () => this.toggleSound(), secondary).setDepth(
      UI_DEPTH,
    );
    if (offerFullscreen) {
      createButton(this, 770, 412, 'FULLSCREEN', () => this.toggleFullscreen(), secondary).setDepth(UI_DEPTH);
    }

    const panel = this.add.graphics().setDepth(UI_DEPTH);
    panel.fillStyle(0x1d2340, 0.72);
    panel.fillRoundedRect(290, 470, 700, 100, 18);
    const controls = touchUI.enabled
      ? '◀ ▶   move        JUMP   jump (hold for higher)\nhold ANCHOR to brace against gusts        II   pause'
      : 'A / D  or  ← / →   move        SPACE / W   jump        S / ↓   anchor\nESC   pause        R   restart        M   sound';
    this.add
      .text(640, 520, controls, textStyle(20, CSS.white, { align: 'center', lineSpacing: 12 }))
      .setOrigin(0.5)
      .setDepth(UI_DEPTH);

    const prompt = this.add
      .text(640, 600, touchUI.enabled ? 'Tap PLAY to start' : 'Press SPACE to start', textStyle(22, CSS.white, { stroke: CSS.ink, strokeThickness: 5 }))
      .setOrigin(0.5)
      .setDepth(UI_DEPTH);
    this.tweens.add({ targets: prompt, alpha: 0.35, duration: 700, yoyo: true, repeat: -1 });

    this.input.keyboard.on('keydown-SPACE', this.startGame, this);
    this.input.keyboard.on('keydown-ENTER', this.startGame, this);
    this.input.keyboard.on('keydown-M', this.toggleSound, this);
  }

  soundLabel() {
    return audio.muted ? 'SOUND: OFF' : 'SOUND: ON';
  }

  toggleSound() {
    audio.unlock();
    audio.toggleMute();
    this.soundButton.setLabel(this.soundLabel());
    audio.play('click');
  }

  // Called from a button's pointerup, which browsers accept as the user gesture fullscreen needs.
  toggleFullscreen() {
    if (this.scale.isFullscreen) this.scale.stopFullscreen();
    else this.scale.startFullscreen();
  }

  onPlayTap() {
    // On phones, PLAY also goes fullscreen (and locks landscape where the browser allows it).
    requestMobileFullscreen(this);
    this.startGame();
  }

  startGame(event) {
    if (this.starting || (event && event.repeat)) return;
    this.starting = true;
    audio.unlock();
    audio.play('click');
    this.scene.start('GameScene', { levelIndex: 0 });
  }

  update(time, delta) {
    const dt = Math.min(delta, 50) / 1000;
    this.far.tilePositionX += 12 * dt;
    this.mid.tilePositionX += 30 * dt;
    this.windFx.update(dt);
  }
}
