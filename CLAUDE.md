# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Project

Wind Rush is a 2D side-scrolling arcade survival game built with Phaser 3.90, JavaScript (ES modules) and Vite, using Arcade Physics. It targets browser portals such as Poki. Milestone 1 (core prototype, one level) is done, along with mobile touch support. See README.md for gameplay and controls, and docs/LEVEL_DESIGN.md for level authoring.

The original brief splits the work into 5 milestones. **Build one milestone at a time**; don't pull later-milestone features forward unless asked. [ROADMAP.md](ROADMAP.md) tracks what's done and what's next; update it when a milestone item is finished.

## Commands

```bash
npm install
npm run dev       # Vite dev server, default port 5173 (often taken on this machine; use --port 5199)
npm run build     # static build to dist/ (relative base './', works from any sub-folder)
npm run preview
```

URL flags: `?debug` draws physics bodies; `?touch` forces the touch UI on desktop.
In dev builds the game instance is exposed as `window.__WIND_RUSH__`.

There is no test suite or linter in the repo. Verification so far was done with throwaway puppeteer-core scripts driving headless Edge (`C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe`). They drove the dev server through `window.__WIND_RUSH__` and sent multi-touch input via the CDP `Input.dispatchTouchEvent`. Keep any such harness outside the project unless the user asks for tests in the repo. Run `npm run build` after changes to catch import errors.

## Hard rules

- **No external assets.** Every texture is drawn in `src/utils/graphicsFactory.js`, and audio is synthesised in `src/systems/AudioManager.js`.
- **No React, TypeScript or new runtime dependencies.** Arcade Physics only, not Matter.js.
- **All tuning numbers go in `src/config/balanceConfig.js`**; engine/layout constants (depths, colours, touch button layout) go in `src/config/gameConfig.js`. Level layouts go in `src/data/levels.js`. No magic numbers in systems.
- **Never invent Poki SDK method names.** `src/systems/PlatformAdapter.js` exposes only our own hooks (`loadingFinished`, `gameplayStart`, `gameplayStop`). A real adapter must follow the official Poki docs.
- **No fullscreen on mobile.** This was the user's decision: the browser's mandatory "exit full screen" notice covered gameplay. Landscape is handled by the rotated portrait layout instead (see below). Don't reintroduce `startFullscreen` or an orientation lock without asking.
- **Keep levels' `groundY` at 520.** The 200 px below the street is reserved for touch buttons (`TOUCH_CONTROLS` in gameConfig.js). The user found buttons covering the player when the street was at 640.
- Match the existing style: ES classes, JSDoc on non-obvious gameplay logic, 2-space indent, single quotes.

## Architecture

Scene list order in `src/main.js` is also the **render order**: Boot, Menu, Game, UI, GameOver, LevelComplete. Overlays must stay after GameScene and UIScene.

- **GameScene** owns one level run. It creates LevelManager, WindSystem, Effects, WindEffects, Player and DebrisManager, wires collisions, and emits events for the HUD (`hp-changed`, `shield-changed`, `gust-warning`, `gust-start`, `player-dead`, `level-complete`, `paused-changed`). `state` is `'playing' | 'dead' | 'won'`.
- **UIScene** runs in parallel. It draws the HUD, pause menu and touch controls, and **owns the global keys** (Esc/P, R, M), because a paused scene receives no input. It pulls wind/timer values each frame and listens to GameScene events. Every listener it adds is removed in `onShutdown`.
- **Input:** `GameScene.readInput()` merges keyboard with `UIScene.touch.state`. Scenes update top-down, so UIScene's touch poll runs before GameScene reads it.
- **Player** is split into an invisible Arcade body (`zone`) and a `visual` sprite that leans and squashes freely. Read position from `player.body.center` / `player.x`, not `zone.x` (the zone syncs only in postUpdate).
- **Wind** is one signed `force` in [-1, 1] (negative = blowing left). Player steering targets `walkSpeed * dir + force * maxPush * exposure`, so wind adds to or subtracts from the player's own speed.
- **Debris** is pooled (`Phaser.Physics.Arcade.Group` of `Debris`). Use `debris.recycle()`, never `destroy()`. Debris never reverses direction; wind only speeds it up or slows it down.

### Scene lifecycle gotchas

- Phaser queues scene operations (start/stop/restart/launch) and runs them in order next step. Restarting works like this: `GameScene.restartLevel()` → `scene.restart()` → GameScene's shutdown stops UIScene → `create()` launches UIScene again. The `isLeaving` flag guards against double restarts (the R key and buttons can fire together).
- Pause = `scene.pause('GameScene')`. Call `input.keyboard.resetKeys()` on resume, or keys released during the pause stay "down".
- Overlay scenes ignore key repeats and wait 350–600 ms before accepting keys, so a held jump key doesn't skip them.

### Mobile display (src/systems/MobileDisplay.js)

On touch devices held upright, CSS in `index.html` rotates `#game` by 90°. That breaks every Phaser measurement that uses `getBoundingClientRect` (it returns the rotated box), so the module patches three things:

- `ScaleManager.getParentBounds` → layout size (`clientWidth`/`clientHeight`)
- `ScaleManager.updateCenter` → canvas `offsetWidth`/`offsetHeight`
- `InputManager.transformPointer` → undoes the rotation for pointer coordinates

`ROTATED_QUERY` in that file must stay identical to the media query in `index.html`. Phaser boots synchronously inside `new Phaser.Game`, so the module re-measures right after patching. If the rotated layout misbehaves, check the canvas is centered, not just that taps land: a mislaid canvas still maps touches correctly, so tap tests alone won't catch it.

## Git

Work happens on `main`. Commit only when the user asks. End commit messages with the Co-Authored-By attribution line given in the session. A GitHub Pages workflow (`.github/workflows/deploy.yml`) deploys `dist/` on every push to `main`.
