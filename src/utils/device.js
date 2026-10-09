// Decides whether to show the touch interface. Starts on for coarse-pointer devices (phones,
// tablets) and switches on for good the first time anyone touches the screen.
// Append ?touch to the URL to force it on a desktop for testing.

const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
const coarsePointer =
  typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(pointer: coarse)').matches;

export const touchUI = {
  enabled: coarsePointer || (params !== null && params.has('touch')),

  /** Call with a Phaser pointer; returns true if this call switched touch mode on. */
  noticePointer(pointer) {
    if (this.enabled || !pointer.wasTouch) return false;
    this.enabled = true;
    return true;
  },
};
