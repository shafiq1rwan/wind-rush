/**
 * Platform integration seam.
 *
 * The game only ever calls the lifecycle hooks on `platform` below; it never talks to a portal
 * SDK directly. The default LocalPlatform does nothing, so the game runs on any static host.
 *
 * To integrate a portal such as Poki later, write an adapter with the same three methods that
 * calls the functions documented in that portal's *official* SDK documentation, then register
 * it with `platform.use(adapter)` before the game boots. SDK method names are deliberately not
 * guessed here.
 */

class LocalPlatform {
  get name() {
    return 'local';
  }

  /** Called once all assets/textures are ready and the first interactive screen is shown. */
  loadingFinished() {}

  /** Called when active gameplay begins or resumes (level start, unpause). */
  gameplayStart() {}

  /** Called when active gameplay stops (pause, death, level complete, leaving to menu). */
  gameplayStop() {}
}

export const platform = {
  adapter: new LocalPlatform(),
  playing: false,
  loaded: false,

  use(adapter) {
    this.adapter = adapter;
  },

  loadingFinished() {
    if (this.loaded) return;
    this.loaded = true;
    this.adapter.loadingFinished();
  },

  // Start/stop are de-duplicated so scenes can call them freely without double-reporting.
  gameplayStart() {
    if (this.playing) return;
    this.playing = true;
    this.adapter.gameplayStart();
  },

  gameplayStop() {
    if (!this.playing) return;
    this.playing = false;
    this.adapter.gameplayStop();
  },
};
