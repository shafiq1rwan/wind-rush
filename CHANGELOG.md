# Changelog

All notable changes to Wind Rush. Dates are when the change was committed.

## Unreleased

### Removed
- Fullscreen on mobile. The browser's mandatory "exit full screen" notice covered the start of every run. The landscape lock went with it, because browsers only allow it in fullscreen.

### Kept
- Auto-rotate: on a phone held upright, the game is drawn rotated 90° to fill the screen, with touches remapped. Works on Android and iPhone.

## 2026-10-09: Mobile support

### Added
- On-screen touch controls: ◀ ▶ move, JUMP, ANCHOR and a pause button. Multi-touch, and thumbs can slide between ◀ and ▶.
- Touch mode turns on for phones and tablets, or on the first touch. `?touch` forces it on desktop.
- Touch wording on the menu, tutorial signs, gust warning and game-over screen.
- Rotated portrait layout, so the game is playable however the phone is held.
- The game pauses when the page is hidden or the phone is turned upright mid-run.
- Page CSS that blocks scrolling, zooming and long-press menus, and follows mobile browser toolbars.

## 2026-10-09: Deployment

### Added
- GitHub Pages workflow: builds with Vite and deploys `dist/` on every push to `main`.

## 2026-10-09: Milestone 1, core playable prototype

### Added
- One handcrafted level, *Windy Street*, with crates, tutorial signs and a shelter finish.
- Player movement: acceleration, variable-height jump, coyote time, jump buffering, knockback.
- Anchor mechanic to brace against the wind.
- Wind system with Calm, Breeze, Strong and Extreme states, left and right directions, and warnings before Extreme gusts.
- Debris: planks and bricks (damage), first-aid kits (heal), umbrellas (2-hit shield). Pooled, with fair spawning rules and off-screen warning arrows.
- Crates block wind and debris.
- HUD (hearts, shield, wind meter, timer, progress bar), pause menu, game over and level complete screens with a 1–3 star rating.
- All art drawn in code; placeholder sounds and wind ambience synthesised with Web Audio; mute.
- No-op platform adapter for a future Poki integration.
