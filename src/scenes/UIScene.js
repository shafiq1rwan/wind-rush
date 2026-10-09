import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS, CSS } from '../config/gameConfig.js';
import { WIND } from '../config/balanceConfig.js';
import { audio } from '../systems/AudioManager.js';
import { createButton, formatTime, textStyle } from '../utils/uiFactory.js';
import { touchUI } from '../utils/device.js';
import TouchControls from '../systems/TouchControls.js';

const WIND_PANEL = { x: 640, y: 46, width: 330, height: 70 };
const METER = { x: 560, y: 56, width: 180, height: 14 };
const PROGRESS = { x1: 400, x2: 880, y: 694 };
const toCss = (color) => `#${color.toString(16).padStart(6, '0')}`;
const STATE_CSS = Object.fromEntries(Object.entries(WIND.states).map(([key, def]) => [key, toCss(def.color)]));

/**
 * In-game HUD, gust warnings, touch controls and the pause menu. Runs in parallel with GameScene
 * and also owns the global keys (Esc/P pause, R restart, M mute) because a paused scene receives
 * no input.
 */
export default class UIScene extends Phaser.Scene {
  constructor() {
    super('UIScene');
  }

  create() {
    this.gs = this.scene.get('GameScene');
    this.paused = false;

    this.buildHealth();
    this.buildWindPanel();
    this.buildInfo();
    this.buildProgress();
    this.buildGustBanner();
    this.buildHints();
    this.buildPauseMenu();
    this.buildTouchControls();

    this.refreshHearts(this.gs.player.hp, 0);
    this.refreshShield(this.gs.player.shield);

    this.gameBindings = [
      ['hp-changed', this.refreshHearts],
      ['shield-changed', this.refreshShield],
      ['gust-warning', this.onGustWarning],
      ['gust-start', this.onGustStart],
      ['player-dead', this.onRoundOver],
      ['level-complete', this.onRoundOver],
    ];
    this.gameBindings.forEach(([event, fn]) => this.gs.events.on(event, fn, this));

    const kb = this.input.keyboard;
    kb.on('keydown-ESC', this.togglePause, this);
    kb.on('keydown-P', this.togglePause, this);
    kb.on('keydown-R', this.onRestartKey, this);
    kb.on('keydown-M', this.toggleMute, this);
    this.game.events.on(Phaser.Core.Events.BLUR, this.onBlur, this);
    // Mobile: switching apps hides the page; turning the phone upright mid-run swaps to the rotated
    // layout, so give the player a pause to re-grip. (Locking to landscape never triggers this.)
    this.game.events.on(Phaser.Core.Events.HIDDEN, this.onBlur, this);
    this.scale.on(Phaser.Scale.Events.ORIENTATION_CHANGE, this.onOrientationChange, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.onShutdown, this);
  }

  // --- construction -------------------------------------------------------------------------

  buildHealth() {
    this.hearts = [];
    for (let i = 0; i < this.gs.player.maxHp; i++) {
      this.hearts.push(this.add.image(40 + i * 44, 42, 'heart-full'));
    }
    const sx = 40 + this.gs.player.maxHp * 44 + 16;
    this.shieldIcon = this.add.image(sx, 40, 'shield-icon');
    this.shieldPips = [0, 1, 2, 3].map((i) => this.add.circle(sx + 30 + i * 14, 42, 5, COLORS.shieldLight).setStrokeStyle(2, COLORS.ink));
  }

  buildWindPanel() {
    const p = WIND_PANEL;
    this.windPanel = this.add.graphics();
    this.windPanel.fillStyle(COLORS.uiPanel, 0.6);
    this.windPanel.fillRoundedRect(p.x - p.width / 2, p.y - p.height / 2, p.width, p.height, 16);
    this.windPanelFlash = this.add.graphics();
    this.windPanelFlash.fillStyle(COLORS.danger, 1);
    this.windPanelFlash.fillRoundedRect(p.x - p.width / 2, p.y - p.height / 2, p.width, p.height, 16);
    this.windPanelFlash.setAlpha(0);

    this.add.text(METER.x, 22, 'WIND', textStyle(14, CSS.muted));
    this.windLabel = this.add.text(METER.x + METER.width, 22, '', textStyle(16, CSS.white)).setOrigin(1, 0);
    this.windArrow = this.add.image(512, WIND_PANEL.y, 'hud-arrow');
    this.windMeter = this.add.graphics();
    this.shelterTag = this.add
      .text(p.x, p.y + p.height / 2 + 14, 'SHELTERED', textStyle(15, CSS.healLight, { stroke: CSS.ink, strokeThickness: 4 }))
      .setOrigin(0.5)
      .setVisible(false);
  }

  buildInfo() {
    this.timerText = this.add
      .text(GAME_WIDTH - 24, 18, '0:00.0', textStyle(30, CSS.white, { stroke: CSS.ink, strokeThickness: 6 }))
      .setOrigin(1, 0);
    this.add
      .text(GAME_WIDTH - 24, 56, this.gs.levelData.name.toUpperCase(), textStyle(16, CSS.coat, { stroke: CSS.ink, strokeThickness: 4 }))
      .setOrigin(1, 0);
    this.muteText = this.add
      .text(GAME_WIDTH - 24, 80, '', textStyle(13, CSS.muted, { stroke: CSS.ink, strokeThickness: 3 }))
      .setOrigin(1, 0);
    this.refreshMuteText();
  }

  buildProgress() {
    const g = this.add.graphics();
    g.fillStyle(COLORS.uiPanel, 0.55);
    g.fillRoundedRect(PROGRESS.x1 - 20, PROGRESS.y - 15, PROGRESS.x2 - PROGRESS.x1 + 64, 30, 15);
    g.fillStyle(0xffffff, 0.35);
    g.fillRoundedRect(PROGRESS.x1, PROGRESS.y - 3, PROGRESS.x2 - PROGRESS.x1, 6, 3);
    this.add.image(PROGRESS.x2 + 22, PROGRESS.y - 2, 'icon-house').setScale(0.8);
    this.progressHead = this.add.image(PROGRESS.x1, PROGRESS.y, 'icon-head').setScale(0.9);
  }

  buildGustBanner() {
    const c = this.add.container(GAME_WIDTH / 2, 160);
    const bg = this.add.graphics();
    bg.fillStyle(COLORS.danger, 0.92);
    bg.fillRoundedRect(-280, -48, 560, 96, 22);
    bg.lineStyle(4, COLORS.ink, 1);
    bg.strokeRoundedRect(-280, -48, 560, 96, 22);
    this.bannerTitle = this.add.text(0, -14, 'GUST INCOMING!', textStyle(38, CSS.white, { stroke: CSS.ink, strokeThickness: 6 })).setOrigin(0.5);
    this.bannerSub = this.add.text(0, 26, 'Hold S or ↓ to ANCHOR', textStyle(20, CSS.white)).setOrigin(0.5);
    this.bannerArrows = [-238, 238].map((x) => this.add.image(x, -12, 'hud-arrow').setScale(0.7));
    c.add([bg, this.bannerTitle, this.bannerSub, ...this.bannerArrows]);
    c.setVisible(false);
    this.banner = c;
  }

  buildHints() {
    this.hint = this.add
      .text(24, 76, 'A/D move   SPACE jump   S anchor   ESC pause   R restart', textStyle(15, CSS.white, { stroke: CSS.ink, strokeThickness: 4 }))
      .setOrigin(0, 0);
    this.tweens.add({ targets: this.hint, alpha: 0.35, delay: 8000, duration: 1200 });
  }

  buildPauseMenu() {
    const c = this.add.container(0, 0).setDepth(100);
    const dim = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x0b1020, 0.62).setOrigin(0);
    const title = this.add
      .text(GAME_WIDTH / 2, 170, 'PAUSED', textStyle(72, CSS.coat, { stroke: CSS.ink, strokeThickness: 10 }))
      .setOrigin(0.5);
    this.pauseButtons = [
      createButton(this, GAME_WIDTH / 2, 300, 'RESUME', () => this.resume()),
      createButton(this, GAME_WIDTH / 2, 390, 'RESTART', () => this.gs.restartLevel()),
      createButton(this, GAME_WIDTH / 2, 480, 'MAIN MENU', () => this.gs.goToMenu()),
    ];
    this.pauseSound = createButton(this, GAME_WIDTH / 2, 566, '', () => this.toggleMute(), {
      width: 220,
      height: 52,
      fontSize: 20,
      color: 0xdfe7f2,
      hoverColor: 0xffffff,
    });
    this.pauseButtons.push(this.pauseSound);
    this.pauseKeysHint = this.add
      .text(GAME_WIDTH / 2, 640, 'ESC resume   R restart   M sound', textStyle(18, CSS.muted))
      .setOrigin(0.5);
    c.add([dim, title, ...this.pauseButtons, this.pauseKeysHint]);
    c.setVisible(false);
    this.pauseButtons.forEach((b) => b.setEnabled(false));
    this.pauseMenu = c;
  }

  buildTouchControls() {
    this.touch = new TouchControls(this, touchUI.enabled);
    this.pauseTouchButton = createButton(this, GAME_WIDTH - 50, 142, 'II', () => this.pause(), {
      width: 64,
      height: 56,
      fontSize: 26,
      color: 0xdfe7f2,
      hoverColor: 0xffffff,
    });
    // A touch on a device that didn't report a coarse pointer (e.g. touchscreen laptop) turns touch mode on.
    this.input.on('pointerdown', this.onPointerDown, this);
    this.applyTouchMode();
  }

  onPointerDown(pointer) {
    if (touchUI.noticePointer(pointer)) this.applyTouchMode();
  }

  applyTouchMode() {
    const on = touchUI.enabled;
    this.touch.setVisible(on);
    this.pauseTouchButton.setVisible(on).setEnabled(on);
    this.hint.setVisible(!on);
    this.pauseKeysHint.setVisible(!on);
    this.muteText.setVisible(!on); // keyboard-only hint; touch players use the pause menu's sound button
  }

  // --- HUD updates --------------------------------------------------------------------------

  update() {
    // Runs before GameScene's update each frame (scenes update top-down), so input is fresh.
    this.touch.update();
    const gs = this.gs;
    if (!gs || !gs.wind) return;
    const wind = gs.wind;
    const strength = wind.strength;
    const def = wind.stateDef;

    this.windArrow
      .setFlipX(wind.direction < 0)
      .setScale(0.5 + strength * 0.55)
      .setTint(def.color);
    this.windArrow.x = 512 + (strength > 0.45 ? Math.sin(this.time.now / 40) * strength * 3 : 0);

    this.windMeter.clear();
    this.windMeter.fillStyle(0x000000, 0.4);
    this.windMeter.fillRoundedRect(METER.x, METER.y, METER.width, METER.height, 7);
    const w = Math.max(METER.height, METER.width * strength);
    this.windMeter.fillStyle(def.color, 1);
    this.windMeter.fillRoundedRect(METER.x, METER.y, w, METER.height, 7);

    if (wind.isWarning) {
      this.windLabel.setText('GUST!').setColor(CSS.danger);
      this.windPanelFlash.setAlpha(0.35 + 0.35 * Math.sin(this.time.now / 60));
    } else {
      this.windLabel.setText(def.label).setColor(STATE_CSS[wind.stateKey]);
      this.windPanelFlash.setAlpha(0);
    }

    this.shelterTag.setVisible(gs.state === 'playing' && gs.windExposure < 1 && strength > 0.15);
    this.timerText.setText(formatTime(gs.elapsed));

    const startX = gs.levelData.playerStartX;
    const t = Phaser.Math.Clamp((gs.player.x - startX) / (gs.level.finishX - startX), 0, 1);
    this.progressHead.x = Phaser.Math.Linear(PROGRESS.x1, PROGRESS.x2, t);
  }

  refreshHearts(hp, delta) {
    this.hearts.forEach((heart, i) => heart.setTexture(i < hp ? 'heart-full' : 'heart-empty'));
    if (!delta) return;
    const changed = this.hearts[delta < 0 ? hp : hp - 1];
    if (!changed) return;
    this.tweens.killTweensOf(changed);
    changed.setScale(1).setAngle(0);
    if (delta < 0) {
      this.tweens.add({ targets: changed, angle: { from: -25, to: 0 }, scale: { from: 1.5, to: 1 }, duration: 350, ease: 'Back.easeOut' });
    } else {
      this.tweens.add({ targets: changed, scale: { from: 1.7, to: 1 }, duration: 400, ease: 'Back.easeOut' });
    }
  }

  refreshShield(shield) {
    const visible = shield > 0;
    this.shieldIcon.setVisible(visible);
    this.shieldPips.forEach((pip, i) => pip.setVisible(visible && i < shield));
    if (visible) {
      this.tweens.killTweensOf(this.shieldIcon);
      this.tweens.add({ targets: this.shieldIcon, scale: { from: 1.5, to: 1 }, duration: 300, ease: 'Back.easeOut' });
    }
  }

  onGustWarning(info) {
    this.tweens.killTweensOf(this.banner);
    this.bannerTitle.setText('GUST INCOMING!');
    this.bannerSub.setText(touchUI.enabled ? 'Hold the ANCHOR button!' : 'Hold S or ↓ to ANCHOR');
    // Arrows show which way the gust will blow.
    this.bannerArrows.forEach((a) => a.setFlipX(info.direction < 0));
    this.banner.setVisible(true).setAlpha(1).setScale(0.6);
    this.tweens.add({ targets: this.banner, scale: 1, duration: 260, ease: 'Back.easeOut' });
  }

  onGustStart() {
    this.bannerTitle.setText('HOLD ON!');
    this.tweens.killTweensOf(this.banner);
    this.banner.setVisible(true).setScale(1.1).setAlpha(1);
    this.tweens.add({ targets: this.banner, scale: 1, duration: 160 });
    this.tweens.add({
      targets: this.banner,
      alpha: 0,
      delay: 1100,
      duration: 300,
      onComplete: () => this.banner.setVisible(false),
    });
  }

  onRoundOver() {
    this.tweens.killTweensOf(this.banner);
    this.banner.setVisible(false);
  }

  // --- pause / global keys ------------------------------------------------------------------

  togglePause(event) {
    if (event && event.repeat) return;
    if (this.paused) this.resume();
    else this.pause();
  }

  pause() {
    if (this.paused || !this.gs.setPaused(true)) return;
    this.paused = true;
    this.pauseSound.setLabel(audio.muted ? 'SOUND: OFF' : 'SOUND: ON');
    this.pauseMenu.setVisible(true);
    this.pauseButtons.forEach((b) => b.setEnabled(true));
  }

  resume() {
    if (!this.paused) return;
    this.gs.setPaused(false);
    this.paused = false;
    this.pauseMenu.setVisible(false);
    this.pauseButtons.forEach((b) => b.setEnabled(false));
  }

  onBlur() {
    // Auto-pause when the window loses focus so the storm doesn't keep hitting the player.
    if (!this.paused && this.gs.state === 'playing') this.pause();
  }

  onOrientationChange() {
    if (this.scale.isPortrait) this.onBlur();
  }

  onRestartKey(event) {
    if (event && event.repeat) return;
    this.gs.restartLevel();
  }

  toggleMute() {
    audio.unlock();
    audio.toggleMute();
    this.refreshMuteText();
    this.pauseSound.setLabel(audio.muted ? 'SOUND: OFF' : 'SOUND: ON');
  }

  refreshMuteText() {
    this.muteText.setText(audio.muted ? 'SOUND OFF (M)' : 'M: mute');
  }

  onShutdown() {
    this.gameBindings.forEach(([event, fn]) => this.gs.events.off(event, fn, this));
    this.game.events.off(Phaser.Core.Events.BLUR, this.onBlur, this);
    this.game.events.off(Phaser.Core.Events.HIDDEN, this.onBlur, this);
    this.scale.off(Phaser.Scale.Events.ORIENTATION_CHANGE, this.onOrientationChange, this);
    this.input.off('pointerdown', this.onPointerDown, this);
    this.input.keyboard.off('keydown-ESC', this.togglePause, this);
    this.input.keyboard.off('keydown-P', this.togglePause, this);
    this.input.keyboard.off('keydown-R', this.onRestartKey, this);
    this.input.keyboard.off('keydown-M', this.toggleMute, this);
  }
}
