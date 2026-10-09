import { COLORS, FONT_FAMILY } from '../config/gameConfig.js';
import { audio } from '../systems/AudioManager.js';

export function textStyle(size, color = '#ffffff', extra = {}) {
  return {
    fontFamily: FONT_FAMILY,
    fontSize: `${size}px`,
    fontStyle: 'bold',
    color,
    ...extra,
  };
}

/** Formats seconds as m:ss.t */
export function formatTime(seconds) {
  const total = Math.max(0, seconds);
  const m = Math.floor(total / 60);
  const s = Math.floor(total % 60);
  const tenths = Math.floor((total * 10) % 10);
  return `${m}:${String(s).padStart(2, '0')}.${tenths}`;
}

/**
 * Large rounded button. Returns a Container with `setEnabled(bool)` and `setLabel(text)`.
 */
export function createButton(scene, x, y, label, onClick, opts = {}) {
  const width = opts.width ?? 260;
  const height = opts.height ?? 66;
  const color = opts.color ?? COLORS.uiButton;
  const hoverColor = opts.hoverColor ?? COLORS.uiButtonHover;
  const radius = Math.min(20, height / 2);

  const container = scene.add.container(x, y);
  const g = scene.add.graphics();
  const draw = (hover) => {
    g.clear();
    g.fillStyle(0x000000, 0.25);
    g.fillRoundedRect(-width / 2, -height / 2 + 6, width, height, radius);
    g.fillStyle(hover ? hoverColor : color, 1);
    g.fillRoundedRect(-width / 2, -height / 2, width, height, radius);
    g.lineStyle(4, COLORS.ink, 1);
    g.strokeRoundedRect(-width / 2, -height / 2, width, height, radius);
  };
  draw(false);

  const text = scene.add.text(0, 0, label, textStyle(opts.fontSize ?? 28, '#2b2d42')).setOrigin(0.5);
  container.add([g, text]);
  container.setSize(width, height);
  container.setInteractive({ useHandCursor: true });

  container.on('pointerover', () => {
    draw(true);
    container.setScale(1.05);
  });
  container.on('pointerout', () => {
    draw(false);
    container.setScale(1);
  });
  container.on('pointerdown', () => {
    container.setScale(0.96);
  });
  container.on('pointerup', () => {
    container.setScale(1.05);
    audio.unlock();
    audio.play('click');
    onClick();
  });

  container.setEnabled = (enabled) => {
    if (container.input) container.input.enabled = enabled;
    if (!enabled) {
      draw(false);
      container.setScale(1);
    }
    return container;
  };
  container.setLabel = (value) => {
    text.setText(value);
    return container;
  };
  return container;
}
