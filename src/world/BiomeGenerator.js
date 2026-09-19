import { NoiseGenerator } from './NoiseGenerator.js';
import { BIOME, WORLD_SEED } from '../utils/Constants.js';
import { TUNING } from '../config/TuningConfig.js';

/**
 * Генератор биомов.
 *
 * Ключевые слои:
 *   • continent  — очень низкая частота, большие «континентальные» зоны
 *   • elevation  — локальный рельеф поверх континента
 *   • moisture   — влажность
 *   • temperature— температура + широтный градиент (север холоднее)
 *   • path       — тропинки (ridge-noise с двойным domain warping)
 *
 * Биомы получаются крупными и однородными за счёт того,
 * что высота = continent * 0.85 + elevation * 0.15, а continent
 * имеет очень длинную волну (~7000 px). Локальный elevation
 * добавляет «изюминку», но не рвёт зоны на лоскуты.
 */
export class BiomeGenerator {
    constructor(seed = WORLD_SEED) {
        this.continent   = new NoiseGenerator(seed);
        this.elevation   = new NoiseGenerator(seed + 111);
        this.moisture    = new NoiseGenerator(seed + 777);
        this.temperature = new NoiseGenerator(seed + 1234);
        this.detail      = new NoiseGenerator(seed + 555);
        this.warp        = new NoiseGenerator(seed + 9999);
        this.warp2       = new NoiseGenerator(seed + 7777);
        this.pathNoise   = new NoiseGenerator(seed + 31415);
        this.pathWarp    = new NoiseGenerator(seed + 27182);
    }

    /**
     * Двухслойный domain warp: большие изгибы + мелкие детали.
     * Сильнее, чем было, — биомы становятся органичнее, но
     * не «шумными», потому что warpAmp ограничен.
     */
    _warp(wx, wy) {
        const f   = TUNING.biome.warpFreq;
        const amp = TUNING.biome.warpAmp;

        const n1 = this.warp.fractal(wx * f,       wy * f,       3, 0.5, 2) - 0.5;
        const n2 = this.warp.fractal(wx * f + 100, wy * f + 100, 3, 0.5, 2) - 0.5;
        const m1 = this.warp2.fractal(wx * f * 2.5,       wy * f * 2.5,       2, 0.5, 2) - 0.5;
        const m2 = this.warp2.fractal(wx * f * 2.5 + 50,  wy * f * 2.5 + 50,  2, 0.5, 2) - 0.5;

        return {
            x: wx + (n1 + m1 * 0.35) * amp,
            y: wy + (n2 + m2 * 0.35) * amp,
        };
    }

    // ── Слои ──────────────────────────────────────────────
    getContinent(wx, wy) {
        const f = TUNING.biome.continentFreq;
        return this.continent.fractal(wx * f, wy * f, 3, 0.5, 2);
    }

    getElevation(wx, wy) {
        const f = TUNING.biome.elevationFreq;
        return this.elevation.fractal(wx * f, wy * f, 4, 0.5, 2);
    }

    getMoisture(wx, wy) {
        const f = TUNING.biome.moistureFreq;
        return this.moisture.fractal(wx * f + 100, wy * f + 100, 3, 0.5, 2);
    }

    /**
     * Температура: шум + широтный градиент.
     * При градиенте 0.25 и WORLD_HALF=5000, на северном краю
     * получится −0.25, на южном +0.25. Климат становится читаемым:
     * север — хвойный, юг — тёплый.
     */
    getTemperature(wx, wy) {
        const f = TUNING.biome.temperatureFreq;
        const noise = this.temperature.fractal(wx * f + 500, wy * f + 500, 3, 0.5, 2);
        const g = (wy / 5000) * TUNING.biome.temperatureGradient;
        return Math.max(0, Math.min(1, noise + g));
    }

    /**
     * Итоговая высота. Континент — основа, elevation — «изюминка».
     * Так зоны получаются крупными, но не плоскими.
     */
    _combinedElevation(wx, wy) {
        const c = this.getContinent(wx, wy);
        const e = this.getElevation(wx, wy);
        return c * 0.85 + e * 0.15;
    }

    getWarpedElevation(wx, wy) {
        const w = this._warp(wx, wy);
        return this._combinedElevation(w.x, w.y);
    }

    // ── Биом ──────────────────────────────────────────────
    /**
     * Логика:
     *   1. Глубокая вода / вода — по absolute-высоте
     *   2. Узкая полоса пляжа
     *   3. Whittaker-таблица по (temperature × moisture)
     *      с исключением для болот в низинах
     */
    getBiome(wx, wy) {
        const w = this._warp(wx, wy);
        const e = this._combinedElevation(w.x, w.y);
        const m = this.getMoisture(w.x, w.y);
        const t = this.getTemperature(w.x, w.y);
        const C = TUNING.biome;

        if (e < C.deepWaterThreshold) return BIOME.DEEP_WATER;
        if (e < C.waterThreshold)     return BIOME.WATER;

        if (e < C.waterThreshold + C.beachBandWidth) {
            // Болото может «прилипать» к воде, если тепло и влажно
            if (t > 0.60 && m > 0.60) return BIOME.SWAMP;
            return BIOME.SAND;
        }

        const cold = t < 0.38;
        const hot  = t > 0.62;
        const wet  = m > 0.58;
        const dry  = m < 0.42;

        // Низины + влажно + не холодно → болото
        if (wet && !cold && e < C.lowlandThreshold) return BIOME.SWAMP;

        // Холодный пояс — сосна
        if (cold) return BIOME.PINE;

        // Жаркий пояс
        if (hot) {
            if (wet)  return BIOME.SWAMP;
            if (dry)  return BIOME.BIRCH;
            return BIOME.GRASS;
        }

        // Умеренный пояс
        if (wet)  return BIOME.OAK;
        if (dry)  return BIOME.GRASS;
        return m > 0.5 ? BIOME.OAK : BIOME.GRASS;
    }

    // ── Тропинки ──────────────────────────────────────────
    /**
     * Ridge-noise: 0 на краю, 1 в центре линии.
     *
     * Ключевое отличие от старой версии:
     *   • входные координаты предварительно искажены собственным
     *     domain-warp'ом (pathWarp) — тропинки становятся извилистыми;
     *   • 3 октавы вместо 2 — линия тоньше и «увереннее»;
     *   • threshold ниже (см. TuningConfig) — коридор уже.
     */
    getPath(wx, wy) {
        const f = TUNING.biome.pathFreq;
        const T = TUNING.biome.pathThreshold;

        const wf = f * 0.75;
        const wx2 = wx + (this.pathWarp.fractal(wx * wf,       wy * wf,       2, 0.5, 2) - 0.5) * 180;
        const wy2 = wy + (this.pathWarp.fractal(wx * wf + 77,  wy * wf + 77,  2, 0.5, 2) - 0.5) * 180;

        const n = this.pathNoise.fractal(wx2 * f, wy2 * f, 3, 0.5, 2);

        // Пик ровно на 0.5 → |n − 0.5| даёт «расстояние» от центра линии
        const dist = Math.abs(n - 0.5) * 2;
        if (dist > T) return 0;
        return 1 - dist / T;
    }

    // ── Плотности ─────────────────────────────────────────
    getTreeDensity(wx, wy) {
        const b = this.getBiome(wx, wy);
        const base = {
            [BIOME.PINE]:  0.85, [BIOME.OAK]:   0.80, [BIOME.BIRCH]: 0.65,
            [BIOME.SWAMP]: 0.40, [BIOME.GRASS]: 0.15, [BIOME.SAND]:  0.02,
        }[b] ?? 0;
        const n = this.detail.fractal(
            wx * TUNING.biome.detailFreq,
            wy * TUNING.biome.detailFreq, 2, 0.5, 2,
        );
        return Math.min(1, base * (0.55 + n * 0.9));
    }

    getDecorDensity(wx, wy) {
        const b = this.getBiome(wx, wy);
        return {
            [BIOME.PINE]:  0.55, [BIOME.OAK]:   0.60, [BIOME.BIRCH]: 0.65,
            [BIOME.SWAMP]: 0.55, [BIOME.GRASS]: 0.45, [BIOME.SAND]:  0.20,
        }[b] ?? 0;
    }
}