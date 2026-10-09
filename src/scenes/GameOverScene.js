import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS, CSS } from '../config/gameConfig.js';
import { createButton, textStyle } from '../utils/uiFactory.js';
import { touchUI } from '../utils/device.js';
import { requestMobileFullscreen } from '../systems/MobileDisplay.js';

const MESSAGES = [
  'Gone with the wind!',
  'Blown away!',
  'That plank had your name on it.',
  'Umbrella recommended.',
  'Storm: 1  -  You: 0',
  'Wheee... ouch.',
  'Forecast: 100% chance of planks.',
];

// Ignore keys for a moment so a held jump key doesn't instantly skip the screen.
const INPUT_DELAY_MS = 350;

/** Overlay shown on top of the frozen level after the defeat animation. */
export default class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOverScene');
  }

  create() {
    this.gs = this.scene.get('GameScene');
    const cx = GAME_WIDTH / 2;

    const dim = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x0b1020, 0).setOrigin(0);
    this.tweens.add({ targets: dim, fillAlpha: 0.55, duration: 250 });

    const panel = this.add.container(cx, GAME_HEIGHT / 2);
    const bg = this.add.graphics();
    bg.fillStyle(COLORS.uiPanel, 0.95);
    bg.fillRoundedRect(-320, -210, 640, 420, 28);
    bg.lineStyle(5, COLORS.danger, 1);
    bg.strokeRoundedRect(-320, -210, 640, 420, 28);
    const face = this.add.image(0, -130, 'player-dead').setScale(1.3);
    this.tweens.add({ targets: face, angle: { from: -12, to: 12 }, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    const title = this.add.text(0, -40, 'OOPS!', textStyle(64, CSS.danger, { stroke: CSS.ink, strokeThickness: 10 })).setOrigin(0.5);
    const message = this.add.text(0, 20, Phaser.Utils.Array.GetRandom(MESSAGES), textStyle(26, CSS.white)).setOrigin(0.5);
    const retry = createButton(this, -140, 120, 'RETRY', () => {
      requestMobileFullscreen(this);
      this.gs.restartLevel();
    });
    const menu = createButton(this, 140, 120, 'MENU', () => this.gs.goToMenu(), { color: 0xdfe7f2, hoverColor: 0xffffff });
    const hint = this.add
      .text(0, 182, touchUI.enabled ? 'Tap RETRY to try again' : 'SPACE / ENTER / R to retry', textStyle(16, CSS.muted))
      .setOrigin(0.5);
    panel.add([bg, face, title, message, retry, menu, hint]);
    panel.setScale(0.7).setAlpha(0);
    this.tweens.add({ targets: panel, scale: 1, alpha: 1, duration: 320, ease: 'Back.easeOut' });

    this.readyAt = this.time.now + INPUT_DELAY_MS;
    this.input.keyboard.on('keydown-SPACE', this.onRetryKey, this);
    this.input.keyboard.on('keydown-ENTER', this.onRetryKey, this);
  }

  onRetryKey(event) {
    if (event.repeat || this.time.now < this.readyAt) return;
    this.gs.restartLevel();
  }
}
