// Generates every texture in the game from Phaser Graphics primitives, so the build needs no
// external artwork. Call generateTextures(scene) once (BootScene); textures are global.

import { COLORS, DEPTH, GAME_WIDTH, GAME_HEIGHT } from '../config/gameConfig.js';

function make(scene, key, width, height, draw) {
  if (scene.textures.exists(key)) return;
  const g = scene.make.graphics({ x: 0, y: 0, add: false });
  draw(g);
  g.generateTexture(key, width, height);
  g.destroy();
}

export function lerpColor(a, b, t) {
  const ar = (a >> 16) & 0xff, ag = (a >> 8) & 0xff, ab = a & 0xff;
  const br = (b >> 16) & 0xff, bg = (b >> 8) & 0xff, bb = b & 0xff;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return (r << 16) | (g << 8) | bl;
}

function starPoints(cx, cy, outer, inner) {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? inner : outer;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
  }
  return pts;
}

/** Flat, banded storm sky fixed to the camera. Works in both WebGL and Canvas renderers. */
export function addSkyBackground(scene, depth = DEPTH.sky) {
  const g = scene.add.graphics().setScrollFactor(0).setDepth(depth);
  const bands = 12;
  const h = Math.ceil(GAME_HEIGHT / bands);
  for (let i = 0; i < bands; i++) {
    g.fillStyle(lerpColor(COLORS.skyTop, COLORS.skyBottom, i / (bands - 1)), 1);
    g.fillRect(0, i * h, GAME_WIDTH, h + 1);
  }
  return g;
}

export function generateTextures(scene) {
  createPlayerTextures(scene);
  createDebrisTextures(scene);
  createHudTextures(scene);
  createFxTextures(scene);
  createEnvironmentTextures(scene);
}

// ---------------------------------------------------------------------------------------------
// Player: a small kid in an oversized yellow raincoat. Each pose is its own 64x84 texture with
// the feet on the bottom edge, so the sprite uses origin (0.5, 1).
// ---------------------------------------------------------------------------------------------

export const PLAYER_TEXTURE_SIZE = { width: 64, height: 84 };

const BOOTS = {
  stand: [[19, 68, 16], [33, 68, 16]],
  walkA: [[13, 68, 16], [37, 66, 16]],
  walkB: [[22, 66, 16], [29, 68, 16]],
  jump: [[16, 68, 14], [35, 66, 14]],
  crouch: [[10, 70, 14], [41, 70, 14]],
};

const ARMS = {
  down: { sleeve: [40, 45, 10, 18], hand: [45, 65] },
  forward: { sleeve: [40, 45, 18, 10], hand: [59, 50] },
  brace: { sleeve: [40, 50, 17, 10], hand: [58, 56] },
  up: { sleeve: [41, 17, 10, 26], hand: [46, 14] },
};
const BACK_ARM_UP = { sleeve: [13, 19, 10, 24], hand: [17, 16] };

const POSES = {
  idle: { legs: 'stand', arms: 'down', eyes: 'normal', mouth: 'smile' },
  walk1: { legs: 'walkA', arms: 'down', eyes: 'normal', mouth: 'smile' },
  walk2: { legs: 'walkB', arms: 'down', eyes: 'normal', mouth: 'smile' },
  struggle1: { legs: 'walkA', arms: 'forward', eyes: 'determined', mouth: 'grit' },
  struggle2: { legs: 'walkB', arms: 'forward', eyes: 'determined', mouth: 'grit' },
  jump: { legs: 'jump', arms: 'up', eyes: 'normal', mouth: 'open' },
  fall: { legs: 'jump', arms: 'up', eyes: 'wide', mouth: 'o' },
  anchor: { legs: 'crouch', arms: 'brace', eyes: 'determined', mouth: 'grit', drop: 10 },
  pushed: { legs: 'walkB', arms: 'up', eyes: 'wide', mouth: 'o' },
  hurt: { legs: 'stand', arms: 'up', eyes: 'squeeze', mouth: 'o' },
  win: { legs: 'jump', arms: 'up', eyes: 'happy', mouth: 'open' },
  dead: { legs: 'jump', arms: 'up', eyes: 'x', mouth: 'wobble' },
};

export const PLAYER_POSES = Object.keys(POSES);

function drawBoot(g, x, y, h) {
  g.fillStyle(COLORS.bootDark, 1);
  g.fillRoundedRect(x - 1.5, y - 1.5, 16, h + 3, 6);
  g.fillStyle(COLORS.boot, 1);
  g.fillRoundedRect(x, y, 13, h, 5);
  g.fillStyle(0xffffff, 0.35);
  g.fillRoundedRect(x + 2.5, y + 2.5, 3, h - 7, 1.5);
}

function drawCoat(g, drop) {
  const top = 40 + drop;
  const bottom = 74;
  const shape = (e) => [
    { x: 18 - e, y: top - e },
    { x: 46 + e, y: top - e },
    { x: 53 + e, y: bottom + e },
    { x: 11 - e, y: bottom + e },
  ];
  g.fillStyle(COLORS.coatDark, 1);
  g.fillPoints(shape(2.5), true, true);
  g.fillStyle(COLORS.coat, 1);
  g.fillPoints(shape(0), true, true);
  // hem, front seam, buttons and a pocket
  g.fillStyle(COLORS.coatDark, 1);
  g.fillRect(12, bottom - 4, 40, 2.5);
  g.lineStyle(2, COLORS.coatDark, 1);
  g.lineBetween(38, top + 6, 40, bottom - 5);
  g.fillCircle(43.5, top + 12, 1.8);
  g.fillCircle(44.5, top + 21, 1.8);
  g.fillStyle(COLORS.coatLight, 1);
  g.fillRoundedRect(19, top + 13, 11, 6, 2);
}

function drawArm(g, arm, drop) {
  const [x, y, w, h] = arm.sleeve;
  const r = Math.min(w, h) / 2;
  g.fillStyle(COLORS.coatDark, 1);
  g.fillRoundedRect(x - 1.5, y + drop - 1.5, w + 3, h + 3, r + 1.5);
  g.fillStyle(COLORS.coat, 1);
  g.fillRoundedRect(x, y + drop, w, h, r);
  const [hx, hy] = arm.hand;
  g.fillStyle(COLORS.skinShade, 1);
  g.fillCircle(hx, hy + drop, 4.5);
  g.fillStyle(COLORS.skin, 1);
  g.fillCircle(hx, hy + drop, 3.4);
}

function drawEyes(g, fx, fy, type) {
  const ey = fy - 1;
  const xs = [fx - 3, fx + 7];
  const ink = COLORS.ink;
  switch (type) {
    case 'wide':
      xs.forEach((x) => {
        g.fillStyle(0xffffff, 1);
        g.fillCircle(x, ey, 4.2);
        g.lineStyle(1.5, ink, 1);
        g.strokeCircle(x, ey, 4.2);
        g.fillStyle(ink, 1);
        g.fillCircle(x + 0.8, ey, 2);
      });
      break;
    case 'determined':
      g.fillStyle(ink, 1);
      xs.forEach((x) => g.fillEllipse(x, ey + 1, 5, 5.5));
      g.lineStyle(2.4, ink, 1);
      g.lineBetween(xs[0] - 3.5, ey - 7, xs[0] + 3, ey - 4.5);
      g.lineBetween(xs[1] - 3, ey - 4.5, xs[1] + 3.5, ey - 7);
      break;
    case 'happy':
      g.lineStyle(2.4, ink, 1);
      xs.forEach((x) => {
        g.beginPath();
        g.arc(x, ey + 1.5, 3.2, Math.PI, 0, false);
        g.strokePath();
      });
      break;
    case 'squeeze':
      g.lineStyle(2.4, ink, 1);
      g.lineBetween(xs[0] - 3, ey - 3, xs[0] + 2, ey);
      g.lineBetween(xs[0] + 2, ey, xs[0] - 3, ey + 3);
      g.lineBetween(xs[1] + 3, ey - 3, xs[1] - 2, ey);
      g.lineBetween(xs[1] - 2, ey, xs[1] + 3, ey + 3);
      break;
    case 'x':
      g.lineStyle(2.2, ink, 1);
      xs.forEach((x) => {
        g.lineBetween(x - 3, ey - 3, x + 3, ey + 3);
        g.lineBetween(x - 3, ey + 3, x + 3, ey - 3);
      });
      break;
    default:
      xs.forEach((x) => {
        g.fillStyle(ink, 1);
        g.fillEllipse(x, ey, 5, 7.5);
        g.fillStyle(0xffffff, 1);
        g.fillCircle(x + 1, ey - 2, 1.3);
      });
  }
}

function drawMouth(g, fx, fy, type) {
  const mx = fx + 3;
  const my = fy + 7;
  const ink = COLORS.ink;
  switch (type) {
    case 'open':
      g.fillStyle(ink, 1);
      g.beginPath();
      g.arc(mx, my - 1, 4.5, 0, Math.PI, false);
      g.closePath();
      g.fillPath();
      g.fillStyle(0xff7b8a, 1);
      g.fillCircle(mx, my + 1.6, 1.8);
      break;
    case 'o':
      g.fillStyle(ink, 1);
      g.fillEllipse(mx, my, 4.5, 5.5);
      break;
    case 'grit':
      g.fillStyle(0xffffff, 1);
      g.fillRoundedRect(mx - 5, my - 2.5, 10, 5, 2);
      g.lineStyle(1.6, ink, 1);
      g.strokeRoundedRect(mx - 5, my - 2.5, 10, 5, 2);
      g.lineBetween(mx - 5, my, mx + 5, my);
      break;
    case 'wobble':
      g.lineStyle(2, ink, 1);
      g.beginPath();
      g.moveTo(mx - 5, my);
      g.lineTo(mx - 2.5, my - 2);
      g.lineTo(mx, my);
      g.lineTo(mx + 2.5, my - 2);
      g.lineTo(mx + 5, my);
      g.strokePath();
      break;
    default:
      g.lineStyle(2.2, ink, 1);
      g.beginPath();
      g.arc(mx, my - 2, 3.5, 0.2, Math.PI - 0.2, false);
      g.strokePath();
  }
}

function drawHead(g, drop, eyes, mouth) {
  const hx = 32;
  const hy = 27 + drop;
  // hood
  g.fillStyle(COLORS.coatDark, 1);
  g.fillCircle(hx, hy, 25);
  g.fillStyle(COLORS.coat, 1);
  g.fillCircle(hx, hy, 22.5);
  g.fillStyle(COLORS.coatLight, 0.9);
  g.fillEllipse(hx - 9, hy - 13, 12, 7);
  // face, offset toward the facing direction
  const fx = hx + 4;
  const fy = hy + 3;
  g.fillStyle(COLORS.skinShade, 1);
  g.fillCircle(fx, fy, 17);
  g.fillStyle(COLORS.skin, 1);
  g.fillCircle(fx, fy, 15.5);
  // hood brim over the forehead
  g.fillStyle(COLORS.coat, 1);
  g.fillEllipse(fx + 1, fy - 15, 30, 9);
  g.fillStyle(COLORS.cheek, 0.75);
  g.fillCircle(fx - 7, fy + 6, 3);
  g.fillCircle(fx + 11, fy + 6, 3);
  drawEyes(g, fx, fy, eyes);
  drawMouth(g, fx, fy, mouth);
}

function drawPlayer(g, pose) {
  const drop = pose.drop || 0;
  const armsUp = pose.arms === 'up';
  if (armsUp) drawArm(g, BACK_ARM_UP, drop);
  for (const [x, y, h] of BOOTS[pose.legs]) drawBoot(g, x, y, h);
  drawCoat(g, drop);
  if (!armsUp) drawArm(g, ARMS[pose.arms], drop);
  drawHead(g, drop, pose.eyes, pose.mouth);
  if (armsUp) drawArm(g, ARMS.up, drop);
}

function createPlayerTextures(scene) {
  const { width, height } = PLAYER_TEXTURE_SIZE;
  for (const [name, pose] of Object.entries(POSES)) {
    make(scene, `player-${name}`, width, height, (g) => drawPlayer(g, pose));
  }
}

// ---------------------------------------------------------------------------------------------
// Debris and pickups. Hazards are angular, spin and carry red accents. Pickups are round
// bubbles with an icon that bob gently and never spin.
// ---------------------------------------------------------------------------------------------

function drawUmbrellaCanopy(g, cx, cy, r, colorA, colorB, outline) {
  const segments = 6;
  for (let i = 0; i < segments; i++) {
    const a0 = Math.PI + (i / segments) * Math.PI;
    const a1 = Math.PI + ((i + 1) / segments) * Math.PI;
    g.fillStyle(i % 2 ? colorB : colorA, 1);
    g.slice(cx, cy, r, a0, a1, false);
    g.fillPath();
  }
  g.lineStyle(2.5, outline, 1);
  g.beginPath();
  g.arc(cx, cy, r, Math.PI, 0, false);
  g.strokePath();
  g.lineBetween(cx - r, cy, cx + r, cy);
}

function drawBubble(g, color, dark) {
  g.fillStyle(color, 0.3);
  g.fillCircle(28, 28, 26);
  g.lineStyle(3, dark, 1);
  g.strokeCircle(28, 28, 25);
  g.fillStyle(0xffffff, 0.65);
  g.fillEllipse(17, 15, 11, 6);
}

function createDebrisTextures(scene) {
  make(scene, 'debris-plank', 76, 20, (g) => {
    g.fillStyle(COLORS.woodDark, 1);
    g.fillRoundedRect(0, 0, 76, 20, 5);
    g.fillStyle(COLORS.wood, 1);
    g.fillRoundedRect(2, 2, 72, 16, 4);
    g.fillStyle(COLORS.woodGrain, 1);
    g.fillRect(14, 7, 26, 2);
    g.fillRect(36, 12, 24, 2);
    // red hazard tips
    g.fillStyle(COLORS.danger, 1);
    g.fillRoundedRect(2, 2, 10, 16, { tl: 4, bl: 4, tr: 0, br: 0 });
    g.fillRoundedRect(64, 2, 10, 16, { tl: 0, bl: 0, tr: 4, br: 4 });
    g.fillStyle(0xffffff, 0.8);
    g.fillRect(6, 2, 2, 16);
    g.fillRect(68, 2, 2, 16);
    g.fillStyle(0xd0d4dc, 1);
    g.fillCircle(18, 10, 1.8);
    g.fillCircle(58, 10, 1.8);
  });

  make(scene, 'debris-brick', 38, 26, (g) => {
    g.fillStyle(0x7a2e1f, 1);
    g.fillRoundedRect(0, 0, 38, 26, 5);
    g.fillStyle(0xd0583f, 1);
    g.fillRoundedRect(2, 2, 34, 22, 4);
    g.fillStyle(0xe88a73, 1);
    g.fillRect(2, 12, 34, 2);
    g.fillRect(18, 2, 2, 10);
    g.fillRect(9, 14, 2, 10);
    g.fillRect(28, 14, 2, 10);
    g.fillStyle(0xffffff, 0.35);
    g.fillRoundedRect(5, 4, 9, 4, 2);
  });

  make(scene, 'pickup-heal', 56, 56, (g) => {
    drawBubble(g, COLORS.healLight, COLORS.heal);
    g.lineStyle(2.5, COLORS.heal, 1);
    g.strokeRoundedRect(22, 13, 12, 8, 3);
    g.fillStyle(0xffffff, 1);
    g.fillRoundedRect(14, 18, 28, 22, 5);
    g.lineStyle(2.5, COLORS.heal, 1);
    g.strokeRoundedRect(14, 18, 28, 22, 5);
    g.fillStyle(COLORS.heal, 1);
    g.fillRect(25, 21, 6, 16);
    g.fillRect(20, 26, 16, 6);
  });

  make(scene, 'pickup-umbrella', 56, 56, (g) => {
    drawBubble(g, COLORS.shieldLight, COLORS.shield);
    drawUmbrellaCanopy(g, 28, 29, 15, COLORS.shield, COLORS.shieldLight, COLORS.shieldDark);
    g.lineStyle(2.5, COLORS.shieldDark, 1);
    g.lineBetween(28, 29, 28, 40);
    g.beginPath();
    g.arc(25, 40, 3, 0, Math.PI, false);
    g.strokePath();
  });

  // Umbrella held over the player's head while the shield is active.
  make(scene, 'umbrella-held', 80, 54, (g) => {
    drawUmbrellaCanopy(g, 40, 38, 36, COLORS.shield, COLORS.shieldLight, COLORS.shieldDark);
    g.lineStyle(3, COLORS.shieldDark, 1);
    g.lineBetween(40, 38, 40, 54);
    g.fillStyle(COLORS.shieldDark, 1);
    g.fillCircle(40, 3, 2.5);
  });
}

// ---------------------------------------------------------------------------------------------
// HUD
// ---------------------------------------------------------------------------------------------

function createHudTextures(scene) {
  const heart = (key, outline, fill, shine) =>
    make(scene, key, 36, 32, (g) => {
      g.fillStyle(outline, 1);
      g.fillCircle(11, 11, 10.5);
      g.fillCircle(25, 11, 10.5);
      g.fillTriangle(1.5, 15, 34.5, 15, 18, 31.5);
      g.fillStyle(fill, 1);
      g.fillCircle(11, 11, 8.5);
      g.fillCircle(25, 11, 8.5);
      g.fillTriangle(3.8, 15, 32.2, 15, 18, 28.6);
      if (shine) {
        g.fillStyle(0xffffff, 0.6);
        g.fillEllipse(9, 8, 6, 4);
      }
    });
  heart('heart-full', 0x8f1d2c, 0xff5a6e, true);
  heart('heart-empty', 0x5b6078, 0x2e3350, false);

  make(scene, 'shield-icon', 40, 34, (g) => {
    drawUmbrellaCanopy(g, 20, 20, 17, COLORS.shield, COLORS.shieldLight, COLORS.shieldDark);
    g.lineStyle(3, COLORS.shieldDark, 1);
    g.lineBetween(20, 20, 20, 32);
  });

  const star = (key, outline, fill) =>
    make(scene, key, 64, 62, (g) => {
      g.fillStyle(outline, 1);
      g.fillPoints(starPoints(32, 33, 31, 14), true, true);
      g.fillStyle(fill, 1);
      g.fillPoints(starPoints(32, 33, 25, 11), true, true);
    });
  star('star-full', 0xdf9b16, 0xffd23f);
  star('star-empty', 0x5b6078, 0x2e3350);

  make(scene, 'hud-arrow', 64, 36, (g) => {
    g.fillStyle(0xffffff, 1);
    g.fillRoundedRect(0, 12, 40, 12, 6);
    g.fillTriangle(34, 1, 64, 18, 34, 35);
  });

  make(scene, 'icon-house', 34, 30, (g) => {
    g.fillStyle(0x3d5a80, 1);
    g.fillTriangle(0, 14, 34, 14, 17, 0);
    g.fillStyle(0xfff1d0, 1);
    g.fillRect(5, 13, 24, 17);
    g.fillStyle(0xa86b3c, 1);
    g.fillRoundedRect(13, 18, 8, 12, { tl: 4, tr: 4, bl: 0, br: 0 });
  });

  make(scene, 'icon-head', 26, 26, (g) => {
    g.fillStyle(COLORS.coatDark, 1);
    g.fillCircle(13, 13, 13);
    g.fillStyle(COLORS.coat, 1);
    g.fillCircle(13, 13, 11);
    g.fillStyle(COLORS.skin, 1);
    g.fillCircle(15, 14, 7.5);
    g.fillStyle(COLORS.ink, 1);
    g.fillCircle(14, 13, 1.4);
    g.fillCircle(18, 13, 1.4);
  });

  // Off-screen debris indicators: a disc with an icon and an arrow tip pointing right.
  const indicator = (key, color, drawIcon) =>
    make(scene, key, 50, 40, (g) => {
      g.fillStyle(0xffffff, 1);
      g.fillCircle(20, 20, 19);
      g.fillTriangle(36, 9, 49, 20, 36, 31);
      g.fillStyle(color, 1);
      g.fillCircle(20, 20, 16);
      g.fillTriangle(37, 12.5, 45, 20, 37, 27.5);
      g.fillStyle(0xffffff, 1);
      drawIcon(g);
    });
  indicator('indicator-danger', COLORS.danger, (g) => {
    g.fillRoundedRect(17.5, 8, 5, 15, 2);
    g.fillCircle(20, 28.5, 2.8);
  });
  indicator('indicator-heal', COLORS.heal, (g) => {
    g.fillRect(17, 10, 6, 20);
    g.fillRect(10, 17, 20, 6);
  });
  indicator('indicator-shield', COLORS.shield, (g) => {
    g.slice(20, 21, 10, Math.PI, 0, false);
    g.fillPath();
    g.fillRect(19, 20, 2.5, 10);
  });
}

// ---------------------------------------------------------------------------------------------
// Particles and wind effects
// ---------------------------------------------------------------------------------------------

function createFxTextures(scene) {
  make(scene, 'spark', 12, 12, (g) => {
    g.fillStyle(0xffffff, 1);
    g.fillCircle(6, 6, 6);
  });

  make(scene, 'chip', 10, 6, (g) => {
    g.fillStyle(0xffffff, 1);
    g.fillRect(0, 0, 10, 6);
  });

  make(scene, 'puff', 32, 32, (g) => {
    g.fillStyle(0xffffff, 0.25);
    g.fillCircle(16, 16, 16);
    g.fillStyle(0xffffff, 0.5);
    g.fillCircle(16, 16, 12);
    g.fillStyle(0xffffff, 0.9);
    g.fillCircle(16, 16, 8);
  });

  make(scene, 'streak', 80, 6, (g) => {
    g.fillStyle(0xffffff, 0.25);
    g.fillRoundedRect(0, 1.5, 34, 3, 1.5);
    g.fillStyle(0xffffff, 0.55);
    g.fillRoundedRect(26, 1, 34, 4, 2);
    g.fillStyle(0xffffff, 1);
    g.fillRoundedRect(52, 1, 28, 4, 2);
  });

  make(scene, 'leaf', 16, 10, (g) => {
    g.fillStyle(0xffffff, 1);
    g.fillEllipse(8, 5, 15, 8);
    g.lineStyle(1, 0x000000, 0.25);
    g.lineBetween(1, 5, 15, 5);
  });
}

// ---------------------------------------------------------------------------------------------
// Environment
// ---------------------------------------------------------------------------------------------

function createEnvironmentTextures(scene) {
  make(scene, 'ground', 128, 80, (g) => {
    // sidewalk
    g.fillStyle(0xd8d2c4, 1);
    g.fillRect(0, 0, 128, 22);
    g.fillStyle(0xbfb8a8, 1);
    g.fillRect(0, 0, 128, 3);
    g.fillRect(0, 3, 2, 19);
    g.fillRect(64, 3, 2, 19);
    // curb
    g.fillStyle(0x9a9385, 1);
    g.fillRect(0, 22, 128, 7);
    // road
    g.fillStyle(0x4b5060, 1);
    g.fillRect(0, 29, 128, 51);
    g.fillStyle(0x434757, 1);
    g.fillCircle(14, 40, 2);
    g.fillCircle(100, 70, 2.5);
    g.fillCircle(70, 36, 1.5);
    g.fillStyle(0xf2e8cf, 1);
    g.fillRoundedRect(30, 52, 56, 6, 3);
  });

  make(scene, 'crate', 64, 64, (g) => {
    g.fillStyle(0x7a4f26, 1);
    g.fillRoundedRect(0, 0, 64, 64, 6);
    g.fillStyle(0xd9a066, 1);
    g.fillRoundedRect(3, 3, 58, 58, 4);
    g.fillStyle(0xb9844c, 1);
    g.fillRect(3, 20, 58, 3);
    g.fillRect(3, 41, 58, 3);
    g.lineStyle(6, 0xb9844c, 1);
    g.lineBetween(10, 56, 54, 8);
    g.lineStyle(2, 0x7a4f26, 1);
    g.strokeRoundedRect(6, 6, 52, 52, 3);
    g.fillStyle(0x7a4f26, 1);
    [[9, 9], [55, 9], [9, 55], [55, 55]].forEach(([x, y]) => g.fillCircle(x, y, 2));
  });

  make(scene, 'skyline-far', 512, 220, (g) => {
    const blds = [
      [0, 60, 130], [64, 48, 180], [116, 70, 110], [190, 54, 200],
      [248, 80, 140], [332, 46, 170], [382, 70, 120], [456, 56, 160],
    ];
    for (const [x, w, h] of blds) {
      g.fillStyle(0x93a9c7, 1);
      g.fillRoundedRect(x, 220 - h, w, h + 10, { tl: 8, tr: 8, bl: 0, br: 0 });
      g.fillStyle(0xaabdd6, 1);
      for (let wy = 220 - h + 14; wy < 205; wy += 22) {
        for (let wx = x + 9; wx < x + w - 12; wx += 15) g.fillRect(wx, wy, 6, 8);
      }
    }
    g.fillStyle(0x93a9c7, 1);
    g.fillRect(214, 220 - 200 - 18, 3, 18);
    g.fillRect(352, 220 - 170 - 14, 3, 14);
  });

  make(scene, 'buildings-mid', 512, 300, (g) => {
    const houses = [
      { x: 6, w: 116, h: 200, body: 0xd9a479, trim: 0xa8754f, roof: 'flat' },
      { x: 132, w: 96, h: 250, body: 0x8fb3b5, trim: 0x63898c, roof: 'round' },
      { x: 238, w: 140, h: 170, body: 0xcf9599, trim: 0x9c676c, roof: 'gable' },
      { x: 388, w: 118, h: 220, body: 0xa9c193, trim: 0x7a9665, roof: 'flat' },
    ];
    for (const b of houses) {
      const top = 300 - b.h;
      if (b.roof === 'gable') {
        g.fillStyle(b.trim, 1);
        g.fillTriangle(b.x - 8, top + 4, b.x + b.w + 8, top + 4, b.x + b.w / 2, top - 44);
      }
      const radius = b.roof === 'round' ? { tl: 40, tr: 40, bl: 0, br: 0 } : { tl: 6, tr: 6, bl: 0, br: 0 };
      g.fillStyle(b.trim, 1);
      g.fillRoundedRect(b.x, top, b.w, b.h + 4, radius);
      g.fillStyle(b.body, 1);
      g.fillRoundedRect(b.x + 4, top + 4, b.w - 8, b.h, radius);
      if (b.roof === 'flat') {
        g.fillStyle(b.trim, 1);
        g.fillRect(b.x - 4, top, b.w + 8, 8);
      }
      // windows
      const cols = Math.max(2, Math.floor((b.w - 20) / 34));
      const gap = (b.w - cols * 20) / (cols + 1);
      for (let wy = top + 28; wy < 300 - 70; wy += 44) {
        for (let c = 0; c < cols; c++) {
          const wx = b.x + gap + c * (20 + gap);
          g.fillStyle(b.trim, 1);
          g.fillRoundedRect(wx - 2, wy - 2, 24, 28, 4);
          g.fillStyle(0xf6ead2, 1);
          g.fillRoundedRect(wx, wy, 20, 24, 3);
        }
      }
      g.fillStyle(b.trim, 1);
      g.fillRoundedRect(b.x + b.w / 2 - 14, 300 - 44, 28, 44, { tl: 10, tr: 10, bl: 0, br: 0 });
    }
  });

  make(scene, 'tree', 110, 180, (g) => {
    g.fillStyle(0x6e4630, 1);
    g.fillRoundedRect(49, 95, 12, 85, 5);
    const clusters = [[55, 62, 38], [30, 84, 25], [80, 84, 25], [55, 34, 28]];
    g.fillStyle(0x4c8a3a, 1);
    clusters.forEach(([x, y, r]) => g.fillCircle(x, y, r + 3));
    g.fillStyle(0x6ab04c, 1);
    clusters.forEach(([x, y, r]) => g.fillCircle(x, y, r));
    g.fillStyle(0x8fd16a, 1);
    clusters.forEach(([x, y, r]) => g.fillCircle(x - r * 0.3, y - r * 0.35, r * 0.35));
  });

  make(scene, 'lamp', 44, 200, (g) => {
    g.fillStyle(0x3d405b, 1);
    g.fillRoundedRect(19, 26, 6, 174, 3);
    g.fillRoundedRect(13, 186, 18, 14, 4);
    g.fillTriangle(10, 15, 34, 15, 22, 4);
    g.fillRoundedRect(6, 14, 32, 12, 6);
    g.fillStyle(0xfff3b0, 1);
    g.fillEllipse(22, 28, 20, 8);
  });

  make(scene, 'cloud', 180, 84, (g) => {
    g.fillStyle(0xffffff, 1);
    [[48, 52, 28], [88, 40, 36], [130, 50, 28], [66, 60, 22], [112, 62, 20]].forEach(([x, y, r]) =>
      g.fillCircle(x, y, r),
    );
    g.fillRoundedRect(30, 52, 120, 30, 15);
  });

  // Destination shelter. The door is at the horizontal centre of the texture.
  make(scene, 'shelter', 300, 260, (g) => {
    g.fillStyle(0x6b4a3a, 1);
    g.fillRect(205, 40, 26, 50);
    g.fillStyle(0x24395c, 1);
    g.fillTriangle(8, 112, 292, 112, 150, 18);
    g.fillStyle(0x3d5a80, 1);
    g.fillTriangle(22, 106, 278, 106, 150, 28);
    g.fillStyle(0x8c5a2b, 1);
    g.fillRoundedRect(36, 100, 228, 160, 10);
    g.fillStyle(0xfff1d0, 1);
    g.fillRoundedRect(40, 104, 220, 156, 8);
    // door
    g.fillStyle(0x5c3a1e, 1);
    g.fillRoundedRect(118, 168, 64, 92, { tl: 32, tr: 32, bl: 0, br: 0 });
    g.fillStyle(0xa86b3c, 1);
    g.fillRoundedRect(123, 173, 54, 87, { tl: 27, tr: 27, bl: 0, br: 0 });
    g.fillStyle(0xffd23f, 1);
    g.fillCircle(167, 218, 4);
    // warm windows
    for (const wx of [62, 194]) {
      g.fillStyle(0x5c3a1e, 1);
      g.fillRoundedRect(wx, 140, 44, 44, 6);
      g.fillStyle(0xffe08a, 1);
      g.fillRoundedRect(wx + 4, 144, 36, 36, 4);
      g.fillStyle(0x5c3a1e, 1);
      g.fillRect(wx + 20, 144, 4, 36);
      g.fillRect(wx + 4, 160, 36, 4);
    }
  });

  make(scene, 'sign', 210, 130, (g) => {
    g.fillStyle(0x8c5a2b, 1);
    g.fillRoundedRect(100, 70, 10, 60, 3);
    g.fillRoundedRect(0, 0, 210, 82, 10);
    g.fillStyle(0xfff3d6, 1);
    g.fillRoundedRect(4, 4, 202, 74, 8);
  });
}
