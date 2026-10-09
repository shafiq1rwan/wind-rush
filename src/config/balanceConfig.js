// All gameplay tuning values. Units: pixels, seconds (unless the name says Ms), px/s, px/s².
// These are starting values meant to be tuned through playtesting.

export const PLAYER = {
  maxHp: 3,
  startHp: 3,

  walkSpeed: 220,
  maxSpeed: 360,
  groundAccel: 1900,
  groundDecel: 2200,
  airAccel: 1000,
  airDecel: 450,
  // How hard the anchor brakes the player down to the (tiny) anchored wind drift.
  anchorBrake: 2600,

  jumpVelocity: -420,
  // Releasing jump early multiplies the remaining upward velocity (variable jump height).
  jumpCutMultiplier: 0.45,
  gravity: 1000,
  maxFallSpeed: 900,
  coyoteTimeMs: 100,
  jumpBufferMs: 100,

  invulnerableMs: 1000,
  shieldBlockInvulnerableMs: 450,
  knockbackX: 300,
  knockbackY: -260,
  shieldKnockbackX: 120,
  stunMs: 260,

  bodyWidth: 34,
  bodyHeight: 60,
  landSquashMinSpeed: 260,
  // Falling this far below the ground line counts as falling out of the level.
  fallDeathMargin: 160,
};

export const WIND = {
  // Speed (px/s) at which full-strength wind carries a passive, grounded player.
  // Walking speed is 220, so only Extreme gusts (strength 1) can out-push a walking player.
  maxPush: 290,
  // How quickly an idle player is dragged up to the wind's drift speed (px/s²).
  windGrip: 700,
  // Airborne players catch more wind.
  airPushMultiplier: 1.1,
  // Fraction of wind drift that still applies while anchored.
  anchorFactor: 0.04,
  // Fraction of wind that reaches a player standing in the lee of a solid obstacle.
  shelterFactor: 0.2,
  // Lee (sheltered zone) length as a multiple of the obstacle's height.
  shelterReachMultiplier: 1.6,

  transitionTime: 0.7,
  flipTransitionTime: 1.2,
  gustRampTime: 0.25,
  gustWarningTime: 0.8,
  // During the warning the wind briefly drops to this fraction: the "calm before the gust".
  gustLullFactor: 0.4,
  // Each pattern step's duration is randomised by ±this fraction.
  durationJitter: 0.15,
  // Below this strength debris uses the level's prevailing direction.
  travelDeadzone: 0.05,

  states: {
    calm: { label: 'CALM', strength: 0.06, spawnInterval: 2.4, color: 0x7bd389 },
    breeze: { label: 'BREEZE', strength: 0.3, spawnInterval: 1.7, color: 0xf6d55c },
    strong: { label: 'STRONG', strength: 0.5, spawnInterval: 1.25, color: 0xf39237 },
    extreme: { label: 'EXTREME', strength: 1.0, spawnInterval: 0.9, color: 0xe84a5f },
  },
};

export const DEBRIS = {
  types: {
    plank: {
      category: 'danger',
      texture: 'debris-plank',
      radius: 15,
      speed: 170,
      windSpeed: 280,
      minSpeed: 110,
      spin: [280, 560],
      flutter: 28,
    },
    brick: {
      category: 'danger',
      texture: 'debris-brick',
      radius: 12,
      speed: 150,
      windSpeed: 220,
      minSpeed: 100,
      spin: [200, 420],
      // Bricks are lobbed in from above and bounce along the street.
      gravity: 520,
      bounce: 0.5,
      launchHeight: [190, 240],
      launchVy: -120,
    },
    heal: {
      category: 'heal',
      texture: 'pickup-heal',
      radius: 22,
      speed: 95,
      windSpeed: 120,
      minSpeed: 60,
      bob: 14,
      bobSpeed: 3,
    },
    umbrella: {
      category: 'shield',
      texture: 'pickup-umbrella',
      radius: 22,
      speed: 95,
      windSpeed: 120,
      minSpeed: 60,
      bob: 14,
      bobSpeed: 3,
    },
  },

  // Flight heights above the ground line. Low hazards must be jumped; high hazards only hit jumpers.
  hazardLanes: { low: 30, high: 140 },
  // Pickups fly at walk-into height or jump-to-grab height.
  pickupLanes: [40, 110],
  highLaneChance: 0.35,
  // A low hazard followed quickly by a high one (or vice versa) can leave no safe move, so
  // consecutive hazards inside this window keep the same lane.
  laneSwitchGap: 1.1,
  minHazardGap: 0.8,
  spawnJitter: 0.3,
  retryDelay: 0.2,

  spawnMargin: 240,
  despawnMargin: 520,
  // How quickly airborne debris speed follows the wind (1/s).
  windResponse: 0.9,

  randomHealChance: 0.04,
  randomShieldChance: 0.05,
  startGrace: 2.5,
  finishSafeDistance: 450,
  maxActive: 32,
  maxLifetime: 25,

  // Off-screen warning arrows appear for debris within this distance of the screen edge.
  indicatorRange: 700,
  indicatorCount: 8,
};

export const SHIELD = {
  durability: 2,
};

export const HEAL = {
  amount: 1,
};

export const CAMERA = {
  lerpX: 0.1,
  lerpY: 0.1,
  // Negative offset keeps the player left of centre so more of the route ahead is visible.
  offsetX: -170,
  hitShake: { duration: 150, intensity: 0.006 },
  blockShake: { duration: 90, intensity: 0.003 },
  gustShake: { duration: 300, intensity: 0.003 },
  deathShake: { duration: 220, intensity: 0.009 },
};

export const FX = {
  streakCount: 46,
  streakMin: 4,
  streakSpeed: 1300,
  leafCount: 12,
  leafSpeed: 800,
  dustIntervalMs: 90,
};
