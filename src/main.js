import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, DEBUG_PHYSICS } from './config/gameConfig.js';
import { PLAYER } from './config/balanceConfig.js';
import BootScene from './scenes/BootScene.js';
import MenuScene from './scenes/MenuScene.js';
import GameScene from './scenes/GameScene.js';
import UIScene from './scenes/UIScene.js';
import GameOverScene from './scenes/GameOverScene.js';
import LevelCompleteScene from './scenes/LevelCompleteScene.js';
import { setupMobileDisplay } from './systems/MobileDisplay.js';

const config = {
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#8fb0d0',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: PLAYER.gravity },
      debug: DEBUG_PHYSICS,
    },
  },
  render: {
    antialias: true,
  },
  input: {
    // Four touch points (plus the mouse), so players can hold move, jump and anchor together.
    activePointers: 4,
  },
  // Stops long-presses on the touch buttons from opening the browser context menu.
  disableContextMenu: true,
  // Scene order is also render order: overlays must come after GameScene and UIScene.
  scene: [BootScene, MenuScene, GameScene, UIScene, GameOverScene, LevelCompleteScene],
};

const game = new Phaser.Game(config);
setupMobileDisplay(game);

// Handy for debugging from the browser console during development.
if (import.meta.env.DEV) window.__WIND_RUSH__ = game;
