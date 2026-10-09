import Phaser from 'phaser';
import { generateTextures } from '../utils/graphicsFactory.js';
import { audio } from '../systems/AudioManager.js';
import { platform } from '../systems/PlatformAdapter.js';

/** Generates all procedural textures, prepares audio, then shows the menu. */
export default class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  create() {
    generateTextures(this);
    audio.init(this.game);
    platform.loadingFinished();
    this.scene.start('MenuScene');
  }
}
