# Roadmap

Where Wind Rush stands and what comes next, written so the project can be picked up on a new machine with no other context. The milestones follow the original development brief; this file records what's done, what's left, and what we learned along the way.

**Status (2026-10-09):** Milestone 1 is complete, plus mobile support and several items from later milestones. Next up is **Milestone 2: game feel**.

## Picking this up on a new PC

1. Clone and run:
   ```bash
   git clone https://github.com/shafiq1rwan/wind-rush.git
   cd wind-rush
   npm install
   npm run dev
   ```
   Node 20 or newer (this was built on Node 23; the deploy workflow uses Node 22).
2. Read [CLAUDE.md](CLAUDE.md) for architecture, rules and gotchas. Claude Code loads it automatically. Read [docs/LEVEL_DESIGN.md](docs/LEVEL_DESIGN.md) before building levels.
3. Pushing to `main` deploys to GitHub Pages ([.github/workflows/deploy.yml](.github/workflows/deploy.yml)). In the repo settings, Pages → Source must be **GitHub Actions**.
4. **Automated tests are not in the repo.** Milestone 1 was verified with throwaway puppeteer-core scripts (36 desktop checks, 26 mobile checks, a playtest bot) kept outside the project, so they won't be on a new machine. If you want them back, rebuild them as an in-repo test command; [CLAUDE.md](CLAUDE.md) describes how they worked.

## Decisions to keep

These came from playtesting and conversations, not from the brief. Don't undo them without a reason.

- **No fullscreen on mobile.** Browsers always show an "exit full screen" notice on entry, and it covered the start of a run. Landscape is handled by drawing the game rotated when the phone is upright.
- **Street at y 520.** The 200 px below it is reserved for touch buttons. At y 640 the buttons covered the player.
- **Crates are cover.** They block wind and debris. Levels should use this for shelter points.
- **One milestone at a time.** Don't build ahead.

## Milestone 1: core playable prototype — done

Everything in the brief: project setup, one level (*Windy Street*), movement with acceleration, variable jump, coyote time and jump buffering, wind physics, the anchor mechanic, dangerous/healing/shield debris, health and damage, finish shelter and restart. Verified with automated tests and a playtest bot (details in the README).

### Already done from later milestones

| From | Item |
|---|---|
| M2 | Character animations: idle, walk, struggle, jump, fall, anchor, pushed back, hurt, victory, defeat |
| M2 | Wind particles (streaks, leaves), swaying trees, drifting clouds |
| M2 | Impact effects: hit flash, particle bursts, shield block and break, dust |
| M2 | Camera follow with look-ahead, shake on impacts and gusts |
| M2 | Gust warnings (banner, sound, wind lull) |
| M2 | Basic audio: all sound effects plus wind ambience, synthesised |
| M3 | Second hazard (bricks), crate obstacles, star rating, menu, pause, game over and level complete screens |
| M5 | Touch controls, rotated portrait layout, static production build and deployment |

## Milestone 2: game feel — next

The brief's M2 list is mostly done (above). What's left:

- [ ] **Rain during intense storms.** The brief asks for it under wind visualisation. Keep it subtle so hazards stay readable.
- [ ] **Healing and shield-blocking animations.** Currently a squash and particles; the brief lists them as character animations.
- [ ] **Background music.** The brief lists it; only ambient wind exists now. Keep it generated or clearly optional, with no unavailable files.
- [ ] **Movement tuning from real playtesting.** Players on real devices, not the bot. Note anything that feels sluggish or unfair. Likely knobs: `WIND.maxPush`, wind state strengths, `PLAYER.walkSpeed`, `DEBRIS.minHazardGap`.
- [ ] Optional ideas, not in the brief: brief hit-stop on damage, a screen-edge effect during Extreme gusts.

**Done when:** a few people have played on desktop and phone, and their notes on feel are addressed.

## Milestone 3: content

- [ ] **Level 2, Stormy Suburb.** Stronger gusts, wind-blocking obstacles, umbrella pickups, more debris variety, small gaps or low platforms, safe zones behind solid structures.
- [ ] **Level 3, Hurricane Highway.** Extreme gusts, wind direction changes, more complex obstacle patterns, shelter points. Harder but still fair.
- [ ] **More hazard types.** The brief suggests metal scraps and broken signs. Each needs a distinct shape, not just colour, and red accents.
- [ ] **Gaps and low platforms.** Pits already work in code (falling below the street is a death) but no level uses one yet; test them carefully. Low platforms need new code.
- [ ] **Level progression.** Unlock the next level on completion. The NEXT LEVEL button already appears when a next level exists.
- [ ] **Level select on the main menu**, with locked levels shown as unavailable.

**Done when:** all three levels are completable and fair, each takes 30–60 s of perfect play, and par times are measured. See [docs/LEVEL_DESIGN.md](docs/LEVEL_DESIGN.md) for the numbers and a checklist.

## Milestone 4: polish

- [ ] Better vector artwork for the character, debris and environment.
- [ ] Improved animations.
- [ ] Audio polish: replace or refine the synthesised placeholders.
- [ ] Difficulty balancing across all three levels.
- [ ] Performance: profile on a low-end phone; aim for 60 FPS. Particle and debris pools are already capped.
- [ ] Responsive UI: HUD text is small on phones (some labels are 13–16 px at 1280×720 and shrink further when scaled). Enlarge for touch mode.

## Milestone 5: platform preparation

- [x] Mobile touch controls.
- [x] Static production build (GitHub Pages).
- [ ] **Local progress saving:** unlocked levels, best times and stars, in localStorage. Wrap every access in try/catch, as the mute setting already does.
- [ ] **Browser and device testing:** Chrome, Firefox, Safari and Edge on desktop; Android Chrome and iPhone Safari.
- [ ] **Poki SDK integration** through `src/systems/PlatformAdapter.js`, once you have access. Use only the official Poki SDK documentation for method names; the adapter currently reports `loadingFinished`, `gameplayStart` and `gameplayStop`.

## Known issues

- If touch mode switches on mid-run (first touch on a touchscreen laptop), the tutorial signs keep their keyboard wording until the level restarts.
- Sound starts only after the first click, tap or key press, because browsers block autoplay.
- Real-device behaviour has only been tried briefly by hand; the automated checks used an emulated Pixel 5.
