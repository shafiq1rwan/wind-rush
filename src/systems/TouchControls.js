import Phaser from 'phaser';
import { TOUCH_CONTROLS } from '../config/gameConfig.js';
import { textStyle } from '../utils/uiFactory.js';

/**
 * On-screen buttons for touch devices: move left/right (bottom-left), anchor and jump
 * (bottom-right).
 *
 * Rather than relying on per-button pointer events, every active pointer is polled each frame and
 * assigned to the nearest button within a generous radius. That supports multi-touch (run + jump),
 * and lets a thumb slide between left and right without lifting.
 *
 * `state` ({ left, right, jump, anchor }) is read by GameScene alongside the keyboard.
 */
export default class TouchControls {
  constructor(scene, visible) {
    this.scene = scene;
    this.state = { left: false, right: false, jump: false, anchor: false };
    this.visible = visible;

    const { radius, idleAlpha } = TOUCH_CONTROLS;
    this.buttons = TOUCH_CONTROLS.buttons.map((def) => {
      const bg = scene.add.image(def.x, def.y, 'touch-button').setAlpha(idleAlpha);
      bg.setScale((radius * 2) / bg.width);
      const iconY = def.label ? def.y - 10 : def.y;
      let icon;
      if (def.key === 'anchor') icon = scene.add.image(def.x, iconY, 'icon-anchor');
      else {
        icon = scene.add.image(def.x, iconY, 'hud-arrow').setScale(0.85);
        if (def.key === 'left') icon.setFlipX(true);
        if (def.key === 'jump') icon.setAngle(-90);
      }
      icon.setAlpha(0.9);
      const label = def.label ? scene.add.text(def.x, def.y + 34, def.label, textStyle(15, '#ffffff')).setOrigin(0.5) : null;
      return { def, bg, icon, label };
    });

    this.setVisible(visible);
  }

  setVisible(visible) {
    this.visible = visible;
    for (const b of this.buttons) {
      b.bg.setVisible(visible);
      b.icon.setVisible(visible);
      if (b.label) b.label.setVisible(visible);
    }
    if (!visible) this.clear();
  }

  clear() {
    const s = this.state;
    s.left = s.right = s.jump = s.anchor = false;
  }

  update() {
    this.clear();
    if (!this.visible) return;

    const { radius, hitRadiusMultiplier, idleAlpha, pressedAlpha } = TOUCH_CONTROLS;
    const maxDistance = radius * hitRadiusMultiplier;
    for (const pointer of this.scene.input.manager.pointers) {
      if (!pointer.isDown) continue;
      let nearest = null;
      let nearestDistance = maxDistance;
      for (const b of this.buttons) {
        const d = Phaser.Math.Distance.Between(pointer.x, pointer.y, b.def.x, b.def.y);
        if (d < nearestDistance) {
          nearestDistance = d;
          nearest = b;
        }
      }
      if (nearest) this.state[nearest.def.key] = true;
    }

    const baseScale = (radius * 2) / this.buttons[0].bg.width;
    for (const b of this.buttons) {
      const pressed = this.state[b.def.key];
      b.bg.setAlpha(pressed ? pressedAlpha : idleAlpha).setScale(baseScale * (pressed ? 0.92 : 1));
    }
  }
}
