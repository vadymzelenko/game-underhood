import { NoiseGenerator } from './NoiseGenerator.js';
import { BIOME, WORLD_SEED } from '../utils/Constants.js';

/**
 * Макро-рельеф.
 *  • elevation  (крупные континентальные формы)
 *  • moisture   (лесные / сухие)
 *  • temperature(север/юг)
 *  • domain-warp для скругления границ биомов.
 *
 * Никаких сюжетных масок — мир открытый.
 */
export class BiomeGenerator {
    constructor(seed = WORLD_SEED) {
        this.elevation   = new NoiseGenerator(seed);
        this.moisture    = new NoiseGenerator(seed + 777);
        this.temperature = new NoiseGenerator(seed + 1234);
        this.detail      = new NoiseGenerator(seed + 555);
        this.warp        = new NoiseGenerator(seed + 9999);
    }

    getElevation(wx, wy)   { return this.elevation.fractal(wx * 0.0011, wy * 0.0011, 5, 0.5, 2); }
    getMoisture(wx, wy)    { return this.moisture.fractal(wx * 0.0014 + 100, wy * 0.0014 + 100, 4, 0.5, 2); }
    getTemperature(wx, wy) { return this.temperature.fractal(wx * 0.0010 + 500, wy * 0.0010 + 500, 4, 0.5, 2); }

    /** Domain warp → сглаживание границ биомов (мягкий CA-эффект). */
    _warp(wx, wy) {
        const n1 = this.warp.fractal(wx * 0.0015, wy * 0.0015, 3, 0.5, 2) - 0.5;
        const n2 = this.warp.fractal(wx * 0.0015 + 100, wy * 0.0015 + 100, 3, 0.5, 2) - 0.5;
        const amp = 42;
        return { x: wx + n1 * amp, y: wy + n2 * amp };
    }

    getBiome(wx, wy) {
        const w = this._warp(wx, wy);

        const e = this.getElevation(w.x, w.y);
        const m = this.getMoisture(w.x, w.y);
        const t = this.getTemperature(w.x, w.y);

        // Вода
        if (e < 0.24) return BIOME.DEEP_WATER;
        if (e < 0.38) return BIOME.WATER;

        // Низкая суша: болото / песок
        if (e < 0.46) {
            if (m > 0.62 && t > 0.32) return BIOME.SWAMP;
            return BIOME.SAND;
        }

        // Матрица лесных биомов
        const wet  = m > 0.55;
        const dry  = m < 0.45;
        const cold = t < 0.42;
        const hot  = t > 0.58;

        if (cold) return BIOME.PINE;
        if (hot) {
            if (wet) return BIOME.SWAMP;
            if (dry) return BIOME.BIRCH;
            return BIOME.GRASS;
        }
        // средняя температура
        if (wet) return BIOME.OAK;
        if (dry) return BIOME.GRASS;
        return BIOME.OAK;
    }

    /** Плотность деревьев (0..1) — используется sampler'ом. */
    getTreeDensity(wx, wy) {
        const b = this.getBiome(wx, wy);
        const base = {
            [BIOME.PINE]:  0.85,
            [BIOME.OAK]:   0.85,   // вероятность в ячейке; сам сэмплер редкий
            [BIOME.BIRCH]: 0.70,
            [BIOME.SWAMP]: 0.45,
            [BIOME.GRASS]: 0.18,
            [BIOME.SAND]:  0.02,
        }[b] ?? 0;

        // Мелкая модуляция — «кучки»
        const n = this.detail.fractal(wx * 0.02, wy * 0.02, 2, 0.5, 2);
        return Math.min(1, base * (0.55 + n * 0.9));
    }

    /** Плотность декора (камни/папоротники/валежник). */
    getDecorDensity(wx, wy) {
        const b = this.getBiome(wx, wy);
        const base = {
            [BIOME.PINE]:  0.55,
            [BIOME.OAK]:   0.60,
            [BIOME.BIRCH]: 0.65,
            [BIOME.SWAMP]: 0.55,
            [BIOME.GRASS]: 0.45,
            [BIOME.SAND]:  0.20,
        }[b] ?? 0;
        return base;
    }
}