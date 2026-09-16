import { PALETTE as P } from '../utils/Constants.js';
import { createPixelTexture } from '../utils/PixelTexture.js';
import { hash2D } from '../utils/MathUtils.js';
import { ASSET_REGISTRY } from '../assets/AssetRegistry.js';
import { AssetLoader } from '../assets/AssetLoader.js';
import { buildCharacterAnimations } from '../assets/AnimationFactory.js';
import { shouldEnableTouch } from '../input/InputManager.js';

// Игрок 16×16 — без изменений
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

        // Прогресс-бар (пиксельный)
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
            h: P.DARK_BROWN,
            s: P.CREAM,
            e: P.ALMOST_BLACK,
            r: P.RED,
            p: P.DARK_PURPLE,
            b: P.VERY_DARK,
        };
        createPixelTexture(this, 'player', PLAYER_MAP, playerPalette);

        // Три варианта деревьев — процедурно
        this._makeTreeTexture('tree_0', { seed: 101, radius: 13.2, trunkW: 4 });
        this._makeTreeTexture('tree_1', { seed: 217, radius: 12.0, trunkW: 3 });
        this._makeTreeTexture('tree_2', { seed: 353, radius: 14.2, trunkW: 5 });

        this.loader.buildFallbacks(ASSET_REGISTRY);
        buildCharacterAnimations(this, ASSET_REGISTRY);

        // Запускаем независимые UI-сцены
        this.scene.launch('UIScene');
        if (shouldEnableTouch(this)) {
            this.scene.launch('TouchControlsScene');
        }

        this.scene.start('WorldScene');
        
    }



    // create() {
    //     this.loader.buildFallbacks(ASSET_REGISTRY);
    //     buildCharacterAnimations(this, ASSET_REGISTRY);
    //     this.scene.start('WorldScene');
    // }

    /**
     * Процедурная пиксельная ёлка/лиственное дерево 32×40.
     * Крона — круг с неровным краем (шум) и тональными уровнями,
     * ствол — с текстурой коры и «корнями».
     */
    _makeTreeTexture(key, opts) {
        const { seed, radius, trunkW } = opts;
        const W = 32, H = 40;
        const ccx = W / 2, ccy = 16;

        const g = this.make.graphics({ add: false });

        // ── Ствол (рисуем первым — крона его перекроет сверху) ──
        const tx = Math.floor(ccx - trunkW / 2);
        for (let y = ccy; y < H - 1; y++) {
            for (let x = tx; x < tx + trunkW; x++) {
                // Края ствола — тёмный контур
                const isEdge = (x === tx) || (x === tx + trunkW - 1);
                let color;
                if (isEdge) {
                    color = P.VERY_DARK;
                } else {
                    // Текстура коры: пятна BROWN / DARK_BROWN
                    const n = hash2D(x, y * 5, seed + 17);
                    color = n > 0.55 ? P.BROWN : P.DARK_BROWN;
                }
                g.fillStyle(color, 1);
                g.fillRect(x, y, 1, 1);
            }
        }

        // Корни — расширение у самого низа
        g.fillStyle(P.VERY_DARK, 1);
        g.fillRect(tx - 2, H - 3, 1, 3);
        g.fillRect(tx - 1, H - 2, 1, 2);
        g.fillRect(tx + trunkW + 1, H - 3, 1, 3);
        g.fillRect(tx + trunkW,     H - 2, 1, 2);

        // ── Крона ──
        for (let y = 0; y < H; y++) {
            for (let x = 0; x < W; x++) {
                const dx = x - ccx;
                const dy = y - ccy;
                const dist = Math.sqrt(dx * dx + dy * dy);

                // Неровный край за счёт шума
                const n = hash2D(x, y, seed);
                const r = radius + (n - 0.5) * 2.4;

                if (dist > r) continue;

                let color;

                // 1) Обводка (тёмная бирюза, ~1.5 px по краю)
                if (dist > r - 1.5) {
                    color = P.DARK_TEAL;
                } else {
                    // 2) Блик — круг смещён в верхне-левый угол
                    const hdx = x - (ccx - 4);
                    const hdy = y - (ccy - 4);
                    const hdist = Math.sqrt(hdx * hdx + hdy * hdy);

                    if (hdist < 3.4) {
                        color = P.LIGHT_GREEN;          // ядро блика
                    } else if (hdist < 5.4) {
                        color = P.GREEN;                // зона вокруг блика
                    } else if (dist > r - 4.5) {
                        color = P.TEAL;                 // внутренняя тень сбоку/снизу
                    } else {
                        color = P.GREEN;                // основная крона
                    }
                }

                g.fillStyle(color, 1);
                g.fillRect(x, y, 1, 1);
            }
        }

        // Верхние «иголки» — одиночные пиксели для неровности кроны
        for (let i = 0; i < 6; i++) {
            const h = hash2D(seed, i, 55);
            const h2 = hash2D(seed + i, i * 3, 66);
            const px = ccx + Math.floor((h - 0.5) * 12);
            const py = ccy - radius - Math.floor(h2 * 2);
            g.fillStyle(P.LIGHT_GREEN, 1);
            g.fillRect(px, py, 1, 1);
        }

        g.generateTexture(key, W, H);
        g.destroy();
    }



}