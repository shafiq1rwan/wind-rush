import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS, CSS } from '../config/gameConfig.js';
import { createButton, formatTime, textStyle } from '../utils/uiFactory.js';
import { audio } from '../systems/AudioManager.js';

const INPUT_DELAY_MS = 600;

/** Overlay with time, damage taken and a 1-3 star rating. */
export default class LevelCompleteScene extends Phaser.Scene {
  constructor() {
    super('LevelCompleteScene');
  }

  create(result) {
    this.gs = this.scene.get('GameScene');
    this.result = result;
    const cx = GAME_WIDTH / 2;

    const dim = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x0b1020, 0).setOrigin(0);
    this.tweens.add({ targets: dim, fillAlpha: 0.5, duration: 250 });

    const panel = this.add.container(cx, GAME_HEIGHT / 2);
    const bg = this.add.graphics();
    bg.fillStyle(COLORS.uiPanel, 0.95);
    bg.fillRoundedRect(-340, -265, 680, 530, 28);
    bg.lineStyle(5, COLORS.coat, 1);
    bg.strokeRoundedRect(-340, -265, 680, 530, 28);

    const title = this.add
      .text(0, -200, 'SHELTER REACHED!', textStyle(52, CSS.coat, { stroke: CSS.ink, strokeThickness: 9 }))
      .setOrigin(0.5);

    const stars = [-110, 0, 110].map((x, i) => this.add.image(x, -100 - (i === 1 ? 14 : 0), 'star-empty').setScale(i === 1 ? 1.25 : 1.05));

    const beatPar = result.time <= result.parTime;
    const lines = [
      ['TIME', formatTime(result.time), beatPar ? CSS.healLight : CSS.white],
      ['PAR', formatTime(result.parTime), CSS.muted],
      ['DAMAGE TAKEN', String(result.damageTaken), result.damageTaken === 0 ? CSS.healLight : CSS.white],
    ];
    const rows = [];
    lines.forEach(([label, value, color], i) => {
      const y = -10 + i * 40;
      rows.push(this.add.text(-200, y, label, textStyle(24, CSS.muted)).setOrigin(0, 0.5));
      rows.push(this.add.text(200, y, value, textStyle(28, color)).setOrigin(1, 0.5));
    });
    const tip = this.add
      .text(0, 120, 'Stars: finish  +  no damage  +  beat par', textStyle(16, CSS.muted))
      .setOrigin(0.5);

    const retry = createButton(this, -150, 190, 'RETRY', () => this.gs.restartLevel(), {
      color: 0xdfe7f2,
      hoverColor: 0xffffff,
    });
    const next = result.hasNext
      ? createButton(this, 150, 190, 'NEXT LEVEL', () => this.gs.startLevel(result.levelIndex + 1))
      : createButton(this, 150, 190, 'MENU', () => this.gs.goToMenu());

    panel.add([bg, title, ...stars, ...rows, tip, retry, next]);
    panel.setScale(0.7).setAlpha(0);
    this.tweens.add({ targets: panel, scale: 1, alpha: 1, duration: 320, ease: 'Back.easeOut' });

    // Pop the earned stars in one by one.
    for (let i = 0; i < result.stars; i++) {
      const star = stars[i];
      const baseScale = star.scale;
      this.time.delayedCall(450 + i * 280, () => {
        star.setTexture('star-full');
        audio.play('star');
        this.tweens.add({ targets: star, scale: { from: baseScale * 1.8, to: baseScale }, angle: { from: -40, to: 0 }, duration: 380, ease: 'Back.easeOut' });
      });
    }

    if (!result.hasNext) {
      panel.add(this.add.text(0, 240, 'More levels are coming in the next milestone!', textStyle(15, CSS.coat)).setOrigin(0.5));
    }

    this.readyAt = this.time.now + INPUT_DELAY_MS;
    this.input.keyboard.on('keydown-ENTER', this.onContinueKey, this);
    this.input.keyboard.on('keydown-SPACE', this.onContinueKey, this);
  }

  onContinueKey(event) {
    if (event.repeat || this.time.now < this.readyAt) return;
    if (this.result.hasNext) this.gs.startLevel(this.result.levelIndex + 1);
    else this.gs.restartLevel();
  }
}
