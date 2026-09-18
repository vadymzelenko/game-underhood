import { PALETTE as P } from '../utils/Constants.js';
import { createPixelTexture } from '../utils/PixelTexture.js';
import { ASSET_REGISTRY } from '../assets/AssetRegistry.js';
import { AssetLoader } from '../assets/AssetLoader.js';
import { buildCharacterAnimations } from '../assets/AnimationFactory.js';
import { shouldEnableTouch } from '../input/InputManager.js';

const PLAYER_MAP = [
    '................',
    '.....hhhhhh.....',
    '....hhhhhhhh....',
    '....hssssssh....',
    '....hssesesh....',
    '....hssssssh....',
    '....hssssssh....',
    '.....ssssss.....',
    '....rrrrrrrr....',
    '...srrrrrrrrs...',
    '...srrrrrrrrs...',
    '...rrrrrrrrrr...',
    '....rrrrrrrr....',
    '....pppppppp....',
    '....pp....pp....',
    '...bbb....bbb...',
];

export class PreloadScene extends Phaser.Scene {
    constructor() { super('PreloadScene'); }

    preload() {
        this.loader = new AssetLoader(this);
        this.loader.preload(ASSET_REGISTRY);

        const w = this.scale.width, h = this.scale.height;
        const barW = 200, barH = 6;
        this.add.rectangle(w / 2, h / 2, barW, barH, 0x2a2942)
            .setStrokeStyle(1, 0x120e23);
        const fill = this.add.rectangle(
            w / 2 - barW / 2, h / 2, 0, barH, 0x349c58,
        ).setOrigin(0, 0.5);
        this.load.on('progress', (p) => { fill.width = barW * p; });
    }

    create() {
        const playerPalette = {
            h: P.DARK_BROWN, s: P.CREAM, e: P.ALMOST_BLACK,
            r: P.RED, p: P.DARK_PURPLE, b: P.VERY_DARK,
        };
        createPixelTexture(this, 'player', PLAYER_MAP, playerPalette);

        this.loader.buildFallbacks(ASSET_REGISTRY);
        buildCharacterAnimations(this, ASSET_REGISTRY);

        this.scene.launch('UIScene');
        if (shouldEnableTouch(this)) this.scene.launch('TouchControlsScene');

        this.scene.start('WorldScene');
    }
}