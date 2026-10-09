# Wind Rush

A 2D side-scrolling arcade survival game built with Phaser 3. Get a small kid in a yellow raincoat through a windstorm to the shelter. Dodge flying planks and bricks, grab umbrellas and first-aid kits, and brace against gusts.

**Status: Milestone 1, the core playable prototype.** It has one level, *Windy Street*. All art and audio are generated in code, so there are no external assets.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173 (Vite picks another port if 5173 is busy)
npm run build      # static production build in dist/ (works from any sub-folder)
npm run preview    # serve the production build
```

Add `?debug` to the URL to draw the physics hitboxes, for example `http://localhost:5173/?debug`.

## Controls

| Input | Action |
|---|---|
| A / D or ← / → | Move |
| Space / W / ↑ | Jump (hold to jump higher) |
| S / ↓ (hold) | Anchor: brace against the wind (on the ground only, no moving or jumping) |
| R | Restart level |
| Esc / P | Pause / resume |
| M | Mute / unmute |

## How it plays

- **Wind** follows a scripted pattern for each level: Calm → Breeze → Strong → Extreme, blowing left or right. Its speed adds to or subtracts from yours:
  - A headwind slows you down.
  - A tailwind speeds you up, to a cap of 360 px/s.
  - Standing still lets the wind push you.
  - Only an **Extreme** gust is stronger than walking, so walking into one slowly pushes you back. **Anchoring** cancels about 96% of it.
  - Every Extreme gust gets a 0.8 s warning: a banner, a rising whoosh and a short lull in the wind.
- **Crates are cover.** Standing on the downwind side of a crate cuts the wind to 20% (the HUD shows SHELTERED). Hazards that fly into crates break.
- **Debris** always enters from off-screen on the upwind side, and an edge arrow warns you first.
  - 🔴 Planks fly at either a *low* height (jump over them) or a *high* height (they only hit you if you jump). Bricks are lobbed in and bounce.
  - 🟢 First-aid kits restore 1 heart, up to the maximum of 3.
  - 🔵 Umbrellas give a shield that blocks the next 2 hits.
- **Fairness rules:**
  - No hazards spawn in the first 2.5 s or within 450 px of the shelter.
  - Hazards spawn at least 0.8 s apart.
  - Hazards spawned close together use the same height, so a low and a high hazard can't trap you.
- **Rating:** 1 star for finishing, +1 for taking no damage, +1 for beating the par time (50 s).

## Project structure

```
src/
├── main.js                  Phaser game config and scene list
├── config/
│   ├── gameConfig.js        resolution, render depths, colours
│   └── balanceConfig.js     ALL gameplay tuning (player, wind, debris, camera, fx)
├── data/levels.js           handcrafted level layouts and wind patterns (edit these!)
├── entities/
│   ├── Player.js            movement, wind response, anchor, jump buffer/coyote, damage, animation
│   └── Debris.js            pooled flying object (hazard or pickup)
├── systems/
│   ├── WindSystem.js        state-based wind controller, gust warnings
│   ├── DebrisManager.js     spawning rules, pooling, off-screen indicators
│   ├── LevelManager.js      builds a level from data, parallax, wind-shelter queries
│   ├── WindEffects.js       streaks, leaves, clouds, swaying trees
│   ├── Effects.js           particle bursts, rings, floating text
│   ├── AudioManager.js      Web Audio placeholder sounds and wind ambience, mute
│   └── PlatformAdapter.js   no-op lifecycle seam for a future portal SDK (e.g. Poki)
├── scenes/                  Boot, Menu, Game, UI (HUD and pause), GameOver, LevelComplete
└── utils/
    ├── graphicsFactory.js   every texture, drawn with Graphics primitives
    └── uiFactory.js         buttons, text styles, time formatting
```

### Tuning

All numbers live in [src/config/balanceConfig.js](src/config/balanceConfig.js), and level layouts live in [src/data/levels.js](src/data/levels.js). The values most likely to need playtest tuning are:

- `WIND.maxPush`: how strong full wind is
- `WIND.states.*.strength` and `spawnInterval`
- `PLAYER.walkSpeed`
- `DEBRIS.minHazardGap`

### Platform integration

The game reports only three lifecycle hooks, `loadingFinished`, `gameplayStart` and `gameplayStop`, through `src/systems/PlatformAdapter.js`. A Poki adapter should implement those three methods using the official Poki SDK documentation. No SDK calls are guessed in this codebase.

## Verification done for Milestone 1

These checks were automated in headless Microsoft Edge against the dev server:

- **36 scripted checks passed**, with no console errors:
  - Menu → game launch
  - Walk at 220 px/s, deceleration and left/right movement
  - Full jump of about 85 px; a tapped jump of about 37 px (variable height)
  - Wind speeds: extreme headwind pushes an idle player at −290 px/s; walking into it gives −70 px/s; walking into strong wind gives +75 px/s; a tailwind reaches the 360 cap
  - Anchor holds within about 12 px/s and blocks jumping and walking
  - A plank removes 1 HP; invulnerability frames work; a heal adds +1 and can't overheal
  - The umbrella shield absorbs 2 hits and then breaks
  - Crates shelter you from the wind
  - Natural debris spawning
  - Pause/resume freezes the timer
  - Death → game over in under 1.5 s → retry with R or SPACE
  - Reaching the shelter → level complete
  - Repeated restarts leak no listeners
  - Pause → main menu
- **Bot playthroughs** with natural wind and debris:
  - A bot that dodges and anchors finished 5 of 5 runs in 39–42 s, with 0–1 hits.
  - A bot that only walks right and hops crates took 2–3 hits per run and died in 2 of 5 runs.

**Not yet verified by a human:** feel, readability and audio. Generated audio only plays after the first click or keypress, as browser autoplay rules require.

## Next milestones

- **M2, game feel:** more animation polish, rain during storms, hit-stop, tuning.
- **M3, content:** Stormy Suburb and Hurricane Highway, more debris types, level select, progression.
- **M4, polish.**
- **M5, platform:** touch controls, save progress, Poki SDK.
