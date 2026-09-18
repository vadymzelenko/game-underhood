import {
    CHUNK_PX, TILE_COLORS, ACCENT_COLORS, BIOME,
    SUB_TILE, SUB_JITTER, PALETTE as P,
} from '../utils/Constants.js';
import { hash2D } from '../utils/MathUtils.js';

/**
 * Суб-тайловый canvas-рендер чанка.
 *
 *  1. Биом сэмплируется на сетке SUB_TILE × SUB_TILE (по умолчанию 4 px),
 *     каждая ячейка смещается шумом SUB_JITTER — края биомов становятся
 *     «плывущими», не привязанными к 16-px сетке.
 *  2. Каждый пиксель внутри ячейки получает базовый цвет биома + per-pixel шум
 *     (редкие акцентные пиксели) + крупные пятна (2×2 блока).
 *  3. Микро-декорации (травинки, цветы, грибы, ракушки) ставятся поверх.
 *
 *  Возвращает ключ текстуры для Phaser.
 */
export class ChunkPixelRenderer {
    constructor(biomeGen) {
        this.biomeGen = biomeGen;
    }

    render(scene, cx, cy) {
        const size = CHUNK_PX;
        const texKey = `chunk_${cx}_${cy}`;
        const originX = cx * CHUNK_PX;
        const originY = cy * CHUNK_PX;

        const BAYER4 = [
            [ 0,  8,  2, 10],
            [12,  4, 14,  6],
            [ 3, 11,  1,  9],
            [15,  7, 13,  5],
        ];
        const bayer = (x, y) => (BAYER4[y & 3][x & 3] + 0.5) / 16;

        if (scene.textures.exists(texKey)) scene.textures.remove(texKey);

        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        const img = ctx.createImageData(size, size);
        const data = img.data;

        // ─── Шаг 1. Сэмплим биом по суб-сетке ───
        const subGrid = Math.ceil(size / SUB_TILE) + 1;
        const biomeGrid = new Uint8Array(subGrid * subGrid);

        for (let sy = 0; sy < subGrid; sy++) {
            for (let sx = 0; sx < subGrid; sx++) {
                const wx = originX + sx * SUB_TILE + SUB_TILE / 2;
                const wy = originY + sy * SUB_TILE + SUB_TILE / 2;
                // Шумовое смещение ячейки
                const jx = (hash2D(sx, sy, 1101) - 0.5) * SUB_JITTER;
                const jy = (hash2D(sx, sy, 2202) - 0.5) * SUB_JITTER;
                biomeGrid[sy * subGrid + sx] = this.biomeGen.getBiome(wx + jx, wy + jy);
            }
        }

        // ─── Шаг 2. Пиксели + дизеринг на границах биомов ───
        const DITH = { pDirect: 0.42, pDiagonal: 0.20 };
        try {
            const { TUNING } = require('../config/TuningConfig.js');
            if (TUNING?.dithering) {
                DITH.pDirect   = TUNING.dithering.pDirect;
                DITH.pDiagonal = TUNING.dithering.pDiagonal;
            }
        } catch (_) { /* предпросмотр без config */ }

        for (let py = 0; py < size; py++) {
            const sy = (py / SUB_TILE) | 0;
            const row = sy * subGrid;
            for (let px = 0; px < size; px++) {
                const sx = (px / SUB_TILE) | 0;
                const biome = biomeGrid[row + sx];

                // Дизеринг: если рядом другой биом — иногда «пробиваем» его цвет
                let chosenBiome = biome;
                outer:
                    for (let dy = -1; dy <= 1; dy++) {
                        for (let dx = -1; dx <= 1; dx++) {
                            if (dx === 0 && dy === 0) continue;
                            const nx = sx + dx, ny = sy + dy;
                            if (nx < 0 || ny < 0 || nx >= subGrid || ny >= subGrid) continue;
                            const nb = biomeGrid[ny * subGrid + nx];
                            if (nb !== biome) {
                                const dist = Math.abs(dx) + Math.abs(dy);
                                const p = dist === 1 ? DITH.pDirect : DITH.pDiagonal;
                                if (bayer(px, py) < p) {
                                    chosenBiome = nb;
                                    break outer;
                                }
                            }
                        }
                    }

                const color = this._baseColor(chosenBiome, px, py, originX + px, originY + py);

                const i = (py * size + px) * 4;
                data[i]     = (color >> 16) & 0xff;
                data[i + 1] = (color >> 8)  & 0xff;
                data[i + 2] =  color        & 0xff;
                data[i + 3] = 255;
            }
        }

        // ─── Шаг 3. Микро-декорации ───
        this._stampDetails(data, size, cx, cy, biomeGrid, subGrid);

        ctx.putImageData(img, 0, 0);
        scene.textures.addCanvas(texKey, canvas);
        return texKey;
    }

    // ─────────────────────────────────────────────────────────────
    _baseColor(biome, px, py) {
        // 1) Пер-пиксельный шум
        const n = hash2D(px, py, 3311);
        if (n < 0.05) return ACCENT_COLORS[biome] ?? TILE_COLORS[biome];

        // 2) Крупные пятна (2×2 px)
        const n2 = hash2D(px >> 1, py >> 1, 4422);
        if (n2 < 0.10) {
            if (biome === BIOME.GRASS)  return P.LIGHT_GREEN;
            if (biome === BIOME.FOREST) return P.OLIVE_GREEN;
            if (biome === BIOME.SAND)   return P.GOLD;
            if (biome === BIOME.WATER)  return P.DARK_TEAL;
        }

        return TILE_COLORS[biome];
    }

    // ─────────────────────────────────────────────────────────────
    _stampDetails(data, size, cx, cy, biomeGrid, subGrid) {
        // Быстрый проход по суб-сетке: 10% ячеек получают деталь
        for (let sy = 1; sy < subGrid - 1; sy += 2) {
            for (let sx = 1; sx < subGrid - 1; sx += 2) {
                const h = hash2D(cx * subGrid + sx, cy * subGrid + sy, 5501);
                if (h < 0.88) continue;

                const biome = biomeGrid[sy * subGrid + sx];
                // Позиция в пикселях (внутри чанка)
                const px = sx * SUB_TILE;
                const py = sy * SUB_TILE;

                if (biome === BIOME.GRASS) {
                    const sub = hash2D(px, py, 6601);
                    if (sub < 0.65)      this._stampTuft(data, size, px, py);
                    else                 this._stampFlower(data, size, px, py);
                } else if (biome === BIOME.FOREST) {
                    const sub = hash2D(px, py, 6602);
                    if (sub < 0.45)      this._stampTuft(data, size, px, py);
                    else if (sub < 0.75) this._stampMushroom(data, size, px, py);
                    else                 this._stampPebble(data, size, px, py);
                } else if (biome === BIOME.SAND) {
                    const sub = hash2D(px, py, 6603);
                    if (sub < 0.6) this._stampPebble(data, size, px, py);
                    else           this._stampShell(data, size, px, py);
                } else if (biome === BIOME.WATER) {
                    this._stampRipple(data, size, px, py);
                }
            }
        }
    }

    _set(data, size, x, y, color) {
        if (x < 0 || y < 0 || x >= size || y >= size) return;
        const i = (y * size + x) * 4;
        data[i]     = (color >> 16) & 0xff;
        data[i + 1] = (color >> 8)  & 0xff;
        data[i + 2] =  color        & 0xff;
        data[i + 3] = 255;
    }

    _stampTuft(data, size, x, y) {
        this._set(data, size, x,     y,     P.LIGHT_GREEN);
        this._set(data, size, x,     y - 1, P.LIGHT_GREEN);
        this._set(data, size, x + 2, y,     P.LIGHT_GREEN);
        this._set(data, size, x + 2, y - 1, P.LIGHT_GREEN);
        this._set(data, size, x + 1, y + 1, P.GREEN);
    }

    _stampFlower(data, size, x, y) {
        const petal = hash2D(x, y, 7701) > 0.5 ? P.PINK : P.CREAM;
        this._set(data, size, x,     y,     petal);
        this._set(data, size, x + 2, y,     petal);
        this._set(data, size, x,     y + 2, petal);
        this._set(data, size, x + 2, y + 2, petal);
        this._set(data, size, x + 1, y + 1, P.YELLOW);
        this._set(data, size, x + 1, y + 3, P.GREEN);
    }

    _stampMushroom(data, size, x, y) {
        this._set(data, size, x,     y,     P.RED);
        this._set(data, size, x + 1, y,     P.RED);
        this._set(data, size, x + 2, y,     P.RED);
        this._set(data, size, x + 1, y - 1, P.CREAM);
        this._set(data, size, x + 1, y + 1, P.CREAM);
        this._set(data, size, x + 1, y + 2, P.CREAM);
    }

    _stampPebble(data, size, x, y) {
        this._set(data, size, x,     y,     P.GRAY);
        this._set(data, size, x + 1, y,     P.PURPLE_GRAY);
        this._set(data, size, x,     y + 1, P.PURPLE_GRAY);
    }

    _stampShell(data, size, x, y) {
        this._set(data, size, x,     y,     P.CREAM);
        this._set(data, size, x + 2, y,     P.CREAM);
        this._set(data, size, x + 1, y + 1, P.PINK);
        this._set(data, size, x,     y + 2, P.CREAM);
        this._set(data, size, x + 2, y + 2, P.CREAM);
    }

    _stampRipple(data, size, x, y) {
        this._set(data, size, x,     y,     P.CREAM);
        this._set(data, size, x + 1, y,     P.CREAM);
        this._set(data, size, x + 2, y,     P.CREAM);
        this._set(data, size, x + 1, y + 1, P.DARK_TEAL);
    }
}