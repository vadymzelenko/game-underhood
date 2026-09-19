import {
    CHUNK_PX, TILE_COLORS, ACCENT_COLORS, BIOME,
    SUB_TILE, SUB_JITTER, PALETTE as P,
} from '../utils/Constants.js';
import { hash2D } from '../utils/MathUtils.js';
import { TUNING } from '../config/TuningConfig.js';

const BAYER4 = [
    [ 0,  8,  2, 10], [12,  4, 14,  6],
    [ 3, 11,  1,  9], [15,  7, 13,  5],
];
const bayer = (x, y) => (BAYER4[y & 3][x & 3] + 0.5) / 16;

export class ChunkPixelRenderer {
    constructor(biomeGen) { this.biomeGen = biomeGen; }

    render(scene, cx, cy) {
        const size = CHUNK_PX;
        const texKey = `chunk_${cx}_${cy}`;
        const originX = cx * CHUNK_PX;
        const originY = cy * CHUNK_PX;

        if (scene.textures.exists(texKey)) scene.textures.remove(texKey);

        const canvas = document.createElement('canvas');
        canvas.width = size; canvas.height = size;
        const ctx = canvas.getContext('2d');
        const img = ctx.createImageData(size, size);
        const data = img.data;

        const subGrid = size / SUB_TILE + 1;
        const biomeGrid = new Uint8Array(subGrid * subGrid);
        const elevGrid  = new Float32Array(subGrid * subGrid);
        const pathGrid  = new Float32Array(subGrid * subGrid);

        for (let sy = 0; sy < subGrid; sy++) {
            for (let sx = 0; sx < subGrid; sx++) {
                const wx = originX + sx * SUB_TILE;
                const wy = originY + sy * SUB_TILE;
                const jx = (hash2D(sx, sy, 1101) - 0.5) * SUB_JITTER;
                const jy = (hash2D(sx, sy, 2202) - 0.5) * SUB_JITTER;

                biomeGrid[sy * subGrid + sx] = this.biomeGen.getBiome(wx + jx, wy + jy);
                elevGrid [sy * subGrid + sx] = this.biomeGen.getWarpedElevation(wx, wy);
                pathGrid [sy * subGrid + sx] = this.biomeGen.getPath(wx, wy);
            }
        }

        const DITH = TUNING.dithering;
        const B = TUNING.biome;

        for (let py = 0; py < size; py++) {
            const sy    = (py / SUB_TILE) | 0;
            const subYf = (py - sy * SUB_TILE) / SUB_TILE;
            const row0  = sy * subGrid;
            const row1  = (sy + 1) * subGrid;

            for (let px = 0; px < size; px++) {
                const sx    = (px / SUB_TILE) | 0;
                const subXf = (px - sx * SUB_TILE) / SUB_TILE;

                const biome = biomeGrid[row0 + sx];
                const elev  = elevGrid [row0 + sx];
                const isWater = biome === BIOME.WATER || biome === BIOME.DEEP_WATER;

                // ── Тропинка (билинейно) ─────────────────────────
                let path = 0;
                if (!isWater) {
                    const p00 = pathGrid[row0 + sx];
                    const p10 = pathGrid[row0 + sx + 1];
                    const p01 = pathGrid[row1 + sx];
                    const p11 = pathGrid[row1 + sx + 1];
                    const pa = p00 + (p10 - p00) * subXf;
                    const pb = p01 + (p11 - p01) * subXf;
                    path = pa + (pb - pa) * subYf;
                }
                if (path > 0.002) {
                    const coreT = B.pathSolidCenter;
                    let onPath = false;
                    if (path >= coreT) onPath = true;
                    else {
                        const t = path / coreT;
                        if (bayer(px, py) < 0.10 + t * 0.90) onPath = true;
                    }
                    if (onPath) {
                        const c = this._pathColor(px, py);
                        const i = (py * size + px) * 4;
                        data[i]     = (c >> 16) & 0xff;
                        data[i + 1] = (c >> 8)  & 0xff;
                        data[i + 2] =  c        & 0xff;
                        data[i + 3] = 255;
                        continue;
                    }
                }

                // ── ПЛЯЖ / МОКРЫЙ ПЕСОК ───────────────────────────
                // У самой воды (elev < waterThreshold + wetBeachWidth) — «мокрый» песок
                if (!isWater && elev < B.waterThreshold + B.wetBeachWidth) {
                    const t = 1 - (elev - B.waterThreshold) / B.wetBeachWidth;
                    const c = bayer(px, py) < t * 0.85 ? P.GOLD : P.YELLOW;
                    const i = (py * size + px) * 4;
                    data[i]     = (c >> 16) & 0xff;
                    data[i + 1] = (c >> 8)  & 0xff;
                    data[i + 2] =  c        & 0xff;
                    data[i + 3] = 255;
                    continue;
                }

                // Сухой песок: основной цвет + дизер к GRASS
                if (!isWater && elev < B.waterThreshold + B.beachBandWidth) {
                    const t = (elev - B.waterThreshold - B.wetBeachWidth)
                        / Math.max(0.0001, B.beachBandWidth - B.wetBeachWidth);
                    // 0..1 — от воды к земле
                    let c = P.YELLOW;
                    // Редкие золотистые вкрапления
                    if (hash2D(px, py, 7711) < 0.06) c = P.GOLD;
                    // Дизер к траве на удалении
                    if (t > 0.55 && bayer(px, py) < (t - 0.55) * 0.8) {
                        c = P.GREEN;
                    }
                    const i = (py * size + px) * 4;
                    data[i]     = (c >> 16) & 0xff;
                    data[i + 1] = (c >> 8)  & 0xff;
                    data[i + 2] =  c        & 0xff;
                    data[i + 3] = 255;
                    continue;
                }

                // ── Дизеринг границ биомов ───────────────────────
                let chosen = biome;
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
                                if (bayer(px, py) < p) { chosen = nb; break outer; }
                            }
                        }
                    }

                const color = this._baseColor(chosen, px, py);
                const i = (py * size + px) * 4;
                data[i]     = (color >> 16) & 0xff;
                data[i + 1] = (color >> 8)  & 0xff;
                data[i + 2] =  color        & 0xff;
                data[i + 3] = 255;
            }
        }

        this._stampDetails(data, size, cx, cy, biomeGrid, subGrid, pathGrid);

        ctx.putImageData(img, 0, 0);
        scene.textures.addCanvas(texKey, canvas);
        return texKey;
    }

    _pathColor(px, py) {
        const n = hash2D(px, py, 7711);
        if (n < 0.10) return P.DARK_BROWN;
        if (n < 0.16) return P.TAN;
        return P.BROWN;
    }

    _baseColor(biome, px, py) {
        const n = hash2D(px, py, 3311);
        if (n < 0.02) return ACCENT_COLORS[biome] ?? TILE_COLORS[biome];
        const n2 = hash2D(px >> 2, py >> 2, 4422);
        if (n2 < 0.08) {
            if (biome === BIOME.GRASS) return P.LIGHT_GREEN;
            if (biome === BIOME.OAK)   return P.OLIVE_GREEN;
            if (biome === BIOME.SAND)  return P.GOLD;
            if (biome === BIOME.WATER) return P.DARK_TEAL;
        }
        return TILE_COLORS[biome];
    }

    _stampDetails(data, size, cx, cy, biomeGrid, subGrid, pathGrid) {
        for (let sy = 1; sy < subGrid - 1; sy += 2) {
            for (let sx = 1; sx < subGrid - 1; sx += 2) {
                if (pathGrid[sy * subGrid + sx] > 0.30) continue;
                const h = hash2D(cx * subGrid + sx, cy * subGrid + sy, 5501);
                if (h < 0.90) continue;
                const biome = biomeGrid[sy * subGrid + sx];
                const px = sx * SUB_TILE;
                const py = sy * SUB_TILE;
                if (biome === BIOME.GRASS) {
                    if (hash2D(px, py, 6601) < 0.5) this._stampFlower(data, size, px, py);
                } else if (biome === BIOME.OAK || biome === BIOME.BIRCH) {
                    if (hash2D(px, py, 6602) < 0.6) this._stampMushroom(data, size, px, py);
                } else if (biome === BIOME.SAND) {
                    const sub = hash2D(px, py, 6603);
                    if (sub < 0.7) this._stampPebble(data, size, px, py);
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
    _stampFlower(d, s, x, y) {
        const petal = hash2D(x, y, 7701) > 0.5 ? P.PINK : P.CREAM;
        this._set(d, s, x, y, petal); this._set(d, s, x + 2, y, petal);
        this._set(d, s, x, y + 2, petal); this._set(d, s, x + 2, y + 2, petal);
        this._set(d, s, x + 1, y + 1, P.YELLOW);
        this._set(d, s, x + 1, y + 3, P.GREEN);
    }
    _stampMushroom(d, s, x, y) {
        this._set(d, s, x, y, P.RED); this._set(d, s, x + 1, y, P.RED);
        this._set(d, s, x + 2, y, P.RED);
        this._set(d, s, x + 1, y - 1, P.CREAM);
        this._set(d, s, x + 1, y + 1, P.CREAM);
        this._set(d, s, x + 1, y + 2, P.CREAM);
    }
    _stampPebble(d, s, x, y) {
        this._set(d, s, x, y, P.GRAY);
        this._set(d, s, x + 1, y, P.PURPLE_GRAY);
        this._set(d, s, x, y + 1, P.PURPLE_GRAY);
    }
    _stampShell(d, s, x, y) {
        this._set(d, s, x, y, P.CREAM);
        this._set(d, s, x + 2, y, P.CREAM);
        this._set(d, s, x + 1, y + 1, P.PINK);
        this._set(d, s, x, y + 2, P.CREAM);
        this._set(d, s, x + 2, y + 2, P.CREAM);
    }
    _stampRipple(d, s, x, y) {
        this._set(d, s, x, y, P.CREAM);
        this._set(d, s, x + 1, y, P.CREAM);
        this._set(d, s, x + 2, y, P.CREAM);
        this._set(d, s, x + 1, y + 1, P.DARK_TEAL);
    }
}