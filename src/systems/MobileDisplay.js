import Phaser from 'phaser';

/**
 * Landscape-only presentation on phones and tablets ("auto-rotate").
 *
 * A touch device held in portrait gets the game drawn rotated 90° to fill the screen (see
 * ROTATED_QUERY in index.html), so the player just turns the phone sideways. Turning the device
 * to landscape switches back to the normal layout. This needs no fullscreen or orientation lock,
 * so it works the same on Android and iPhone.
 *
 * CSS rotation confuses Phaser wherever it measures with getBoundingClientRect (which returns the
 * rotated box), so these are adapted here:
 *  - container sizing and canvas centering -> use layout sizes (client/offset width) instead
 *  - pointer coordinates assume an unrotated canvas -> undo the rotation for touches
 */

// Must match the media query in index.html.
export const ROTATED_QUERY = '(orientation: portrait) and (pointer: coarse)';

export function setupMobileDisplay(game) {
  const rotated = window.matchMedia(ROTATED_QUERY);
  patchParentBounds(game.scale);
  patchCentering(game.scale);
  patchPointerTransform(game.input, rotated);

  // Phaser boots synchronously inside `new Phaser.Game` once the DOM is ready, so it has already
  // measured the container the unpatched way. Re-measure now, and whenever the layout switches.
  const remeasure = () => {
    game.scale.getParentBounds();
    game.scale.refresh();
  };
  if (game.isBooted) remeasure();
  else game.events.once(Phaser.Core.Events.READY, remeasure);
  rotated.addEventListener('change', remeasure);
}

function patchParentBounds(scale) {
  // Same contract as ScaleManager#getParentBounds, but measuring layout size (clientWidth /
  // clientHeight), which CSS transforms don't affect.
  scale.getParentBounds = function getParentBounds() {
    if (!this.parent) return false;
    const width = this.parent.clientWidth;
    const height = this.parent.clientHeight;
    if (this.parentSize.width !== width || this.parentSize.height !== height) {
      this.parentSize.setSize(width, height);
      return true;
    }
    if (this.canvas) {
      const rect = this.canvas.getBoundingClientRect();
      return rect.x !== this.canvasBounds.x || rect.y !== this.canvasBounds.y;
    }
    return false;
  };
}

function patchCentering(scale) {
  // ScaleManager#updateCenter, using the canvas's layout size instead of its on-screen box.
  scale.updateCenter = function updateCenter() {
    if (this.autoCenter === Phaser.Scale.Center.NO_CENTER) return;
    const style = this.canvas.style;
    let offsetX = Math.floor((this.parentSize.width - this.canvas.offsetWidth) / 2);
    let offsetY = Math.floor((this.parentSize.height - this.canvas.offsetHeight) / 2);
    if (this.autoCenter === Phaser.Scale.Center.CENTER_HORIZONTALLY) offsetY = 0;
    else if (this.autoCenter === Phaser.Scale.Center.CENTER_VERTICALLY) offsetX = 0;
    style.marginLeft = `${offsetX}px`;
    style.marginTop = `${offsetY}px`;
  };
}

function patchPointerTransform(input, rotated) {
  const original = input.transformPointer;
  input.transformPointer = function transformPointer(pointer, pageX, pageY, wasMove) {
    if (!rotated.matches) return original.call(this, pointer, pageX, pageY, wasMove);

    const scale = this.scaleManager;
    const rect = scale.canvas.getBoundingClientRect(); // on-screen box of the rotated canvas
    const sx = pageX - window.scrollX - (rect.left + rect.width / 2);
    const sy = pageY - window.scrollY - (rect.top + rect.height / 2);
    // The canvas is rotated 90° clockwise, so screen = (-local.y, local.x) and local = (sy, -sx).
    // Unrotated, it is rect.height wide and rect.width tall.
    const x = (sy / rect.height + 0.5) * scale.baseSize.width;
    const y = (-sx / rect.width + 0.5) * scale.baseSize.height;

    // Same bookkeeping and smoothing as InputManager#transformPointer.
    const p0 = pointer.position;
    const p1 = pointer.prevPosition;
    p1.x = p0.x;
    p1.y = p0.y;
    const a = pointer.smoothFactor;
    if (!wasMove || a === 0) {
      p0.x = x;
      p0.y = y;
    } else {
      p0.x = x * a + p1.x * (1 - a);
      p0.y = y * a + p1.y * (1 - a);
    }
  };
}
