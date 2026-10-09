// Engine-level constants: resolution, render layers, palette and storage keys.
// Gameplay tuning lives in balanceConfig.js.

export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;

export const FONT_FAMILY = '"Trebuchet MS", "Segoe UI", Verdana, sans-serif';

// Append ?debug to the URL to draw Arcade Physics bodies.
export const DEBUG_PHYSICS =
  typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('debug');

// Render order inside GameScene (lower = further back).
export const DEPTH = {
  sky: -100,
  clouds: -95,
  far: -90,
  mid: -80,
  decor: -50,
  signs: -40,
  shelter: -30,
  ground: -20,
  solids: -10,
  pickups: 10,
  player: 20,
  debris: 30,
  fx: 40,
  windFx: 50,
  floatText: 60,
  indicators: 90,
};

export const COLORS = {
  ink: 0x2b2d42,
  white: 0xffffff,

  coat: 0xffc93c,
  coatDark: 0xdf9b16,
  coatLight: 0xffe39a,
  skin: 0xffe0c4,
  skinShade: 0xf0c49e,
  cheek: 0xff9aa2,
  boot: 0xe0525f,
  bootDark: 0xa83545,

  // Debris visual language: red = danger, green = healing, blue = defensive.
  danger: 0xe84a5f,
  dangerDark: 0x9e2236,
  heal: 0x3fae5a,
  healLight: 0x7bd389,
  shield: 0x2f7dd1,
  shieldLight: 0x6db3f2,
  shieldDark: 0x1d4f8a,

  wood: 0xb57b45,
  woodDark: 0x5c3a1e,
  woodGrain: 0x93602f,

  skyTop: 0x6f8db5,
  skyBottom: 0xcfe0ea,

  uiPanel: 0x1d2340,
  uiButton: 0xffc93c,
  uiButtonHover: 0xffdc73,
};

export const CSS = {
  ink: '#2b2d42',
  white: '#ffffff',
  coat: '#ffc93c',
  danger: '#e84a5f',
  heal: '#3fae5a',
  healLight: '#7bd389',
  shield: '#6db3f2',
  muted: '#c9d3e6',
};

export const STORAGE_KEYS = {
  muted: 'windrush.muted',
};
