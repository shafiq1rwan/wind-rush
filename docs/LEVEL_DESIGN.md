# Level design guide

How to build a Wind Rush level, and the numbers that decide what a player can and can't do. Levels are plain data in [src/data/levels.js](../src/data/levels.js); `LevelManager` builds everything from them, so a new level needs no code.

All numbers below come from [src/config/balanceConfig.js](../src/config/balanceConfig.js) at the time of writing. If you retune that file, re-check this guide.

## Level data format

```js
{
  id: 'windy-street',          // unique, also the default decoration seed
  name: 'Windy Street',        // shown in the HUD
  width: 6000,                 // level length in px
  groundY: 520,                // street surface; keep at 520 (see "Screen layout" below)
  playerStartX: 140,
  parTime: 50,                 // seconds; beating it earns a star
  decorSeed: 'windy-street',   // trees/lamps/clouds are placed from this seed

  ground: [{ x: 0, width: 6000 }],          // solid street segments; gaps are pits
  obstacles: [{ x: 1900, heights: [1, 2, 1] }], // crate columns, 64 px each; heights in crates
  signs: [{ x: 720, text: 'SPACE to jump', touchText: 'Tap JUMP to jump' }],
  shelter: { x: 5720 },                     // the finish; the door is the trigger
  scriptedPickups: [{ type: 'umbrella', triggerX: 2150 }], // 'umbrella' | 'heal'

  wind: {
    prevailingDirection: -1,                // used when the wind is near calm
    pattern: [{ state: 'calm', dir: -1, duration: 3 }, ...], // loops forever
  },
  debris: { density: 1, types: { plank: 0.75, brick: 0.25 } },
}
```

- `touchText` is optional. Use it whenever `text` mentions keys; touch players see it instead.
- `obstacles[].x` is the left edge of the first column. Columns sit side by side, so `{ x: 1900, heights: [1, 2, 1] }` is a 3-column staircase from x 1900 to 2092.
- Pits: gaps between `ground` segments work in code (falling 160 px below the street kills the player), but no level uses one yet, so playtest carefully the first time.
- To add the level to the game, append it to `LEVELS`. The level-complete screen shows NEXT LEVEL automatically when a following level exists.

## Screen layout

The screen is 720 px tall. The street surface is at y 520, and the 200 px strip below it (the road) is where the touch buttons sit on phones. Keep `groundY` at 520 so nothing in play (the player, crates, low debris) ever sits under a button. Raising it is fine; lowering it brings back the overlap. The road art below the sidewalk is drawn for exactly this 200 px strip.

## What the player can do

| Move | Number |
|---|---|
| Walk speed | 220 px/s (cap 360 px/s with a tailwind) |
| Full jump height | about 85 px (tapped: about 37 px) |
| Time in the air (full jump) | about 0.84 s |
| Crate size | 64 × 64 px |

So from the ground a player can **clear one crate but not two**. A 2-high column needs a 1-high step before it, as in `[1, 2, 1]`. Never place a 2-high wall with no step: it's impassable.

## Wind

Wind strength per state, and what it does to a player walking against it (headwind) or with it (tailwind). Full wind (`maxPush`) is 290 px/s.

| State | Strength | Walking into it | Walking with it | Standing still | Debris spawn every |
|---|---|---|---|---|---|
| Calm | 0.06 | +203 px/s | +237 px/s | drifts 17 px/s | 2.4 s |
| Breeze | 0.3 | +133 px/s | +307 px/s | drifts 87 px/s | 1.7 s |
| Strong | 0.5 | +75 px/s | 360 px/s (cap) | drifts 145 px/s | 1.25 s |
| Extreme | 1.0 | **−70 px/s (slides back)** | 360 px/s (cap) | **pushed 290 px/s** | 0.9 s |

- **Anchoring** keeps 4% of the wind: about 12 px/s even in an Extreme gust.
- **In the air** the wind is 10% stronger, so jumping into a headwind gets you less distance.
- **Extreme gusts** get an automatic 0.8 s warning (banner, sound, a brief lull). You don't add the warning to the pattern.
- **Direction flips** ramp over 1.2 s; other changes ramp over 0.7 s. Every step's duration varies ±15% each run.
- The pattern loops, so its total length matters less than its rhythm. Level 1's 9-step loop lasts about 27 s.

Rules of thumb:
- Only Extreme beats walking, so Extreme is where anchoring matters. Keep each Extreme step short (2–2.5 s).
- A tailwind is a reward: a burst of speed. Mix some in so the wind feels like a tool as well as an obstacle.
- Don't put a jump the player must make right where an Extreme headwind usually lands. Jumps into it lose most of their distance.

## Crates as cover

Standing on the **downwind side** of a crate column cuts the wind to 20% (the HUD shows SHELTERED), and hazards that fly into crates shatter. The sheltered zone reaches out from the crate by about 1.6× its height:

| Column height | Sheltered zone |
|---|---|
| 1 crate (64 px) | about 110 px |
| 2 crates (128 px) | about 213 px |

"Downwind" means the side the wind blows toward: with wind blowing left (the usual headwind), you shelter on the crate's **left** side, the side you approach from. Put a crate column just before a spot where an Extreme gust tends to arrive and it becomes a safe pocket.

## Debris lanes

| Lane | Height above street | Counter |
|---|---|---|
| Low hazard | 30 px | jump over it |
| High hazard | 140 px | stay on the ground (it only hits jumpers) |
| Pickup, low | 40 px | walk into it |
| Pickup, high | 110 px | jump to grab it |

Bricks are lobbed from 190–240 px and bounce, ending up rolling in the low lane.

Built-in fairness rules (in `DebrisManager`; you don't need to design around them):
- Debris always enters off-screen on the upwind side, with an arrow at the screen edge.
- Nothing dangerous spawns in the first 2.5 s, or once the player is within 450 px of the shelter.
- Hazards are at least 0.8 s apart, and hazards less than 1.1 s apart share a lane, so a low and a high hazard can never leave no safe move.

Use `debris.density` to scale how often things spawn (2 = twice as often), and `debris.types` to set the hazard mix.

## Pickups

- `scriptedPickups` fly in when the player passes `triggerX`, from the upwind side. Place them shortly before a hard stretch.
- Random pickups also appear: about a 4% chance per spawn for a heal and 5% for an umbrella.
- An umbrella blocks the next 2 hits; a heal restores 1 heart (maximum 3).

## Par time and length

Level 1 is 6000 px wide with the shelter at x 5720. A bot that plays perfectly finishes it in 39–42 s, so its par is 50 s.

For a new level, aim for a perfect-play time of 30–60 s. Measure it, then set `parTime` to about 1.2–1.25× that time. Stronger wind patterns lower average speed, so the same width takes longer.

## Checklist for a new level

- [ ] Every 2-high column has a 1-high step before it, and no column is 3 high unless reachable from a 2-high step.
- [ ] Signs that mention keys have `touchText`.
- [ ] The first 2.5 s are safe and readable (the opening wind step is Calm or Breeze).
- [ ] At least one shelter pocket (crate column) before the hardest wind.
- [ ] A heal or umbrella appears before the hardest stretch.
- [ ] The shelter is visible well before the end (it's at `shelter.x`, and the HUD progress bar points to it).
- [ ] Played start to finish on keyboard and with `?touch`; par time measured, not guessed.
