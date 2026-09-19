import { NoiseGenerator } from './NoiseGenerator.js';
import { WORLD_SEED } from '../utils/Constants.js';
import { TUNING } from '../config/TuningConfig.js';

import { getPadBiomeAt } from '../config/BuildingsConfig.js';

/**
 * Статичный генератор биомов.
 *
 * Полностью детерминирован по сиду. Никаких Math.random — только
 * value-noise + hash. Даёт одинаковый мир при каждом запуске.
 *
 * Биом = значение domain-warped шума, разбитое по таблице весов
 * из TUNING.biome.distribution. Порядок таблицы = порядок в шумовом
 * пространстве, поэтому соседние биомы (WATER/SAND, SWAMP/GRASS)
 * естественно граничат друг с другом.
 */
export class BiomeGenerator {
    constructor(seed = WORLD_SEED) {
        this.biomeIndex = new NoiseGenerator(seed);
        this.warp       = new NoiseGenerator(seed + 9999);
        this.warp2      = new NoiseGenerator(seed + 7777);
        this.detail     = new NoiseGenerator(seed + 555);
        this.pathNoise  = new NoiseGenerator(seed + 31415);
        this.pathWarp   = new NoiseGenerator(seed + 27182);

        // Предрасчёт кумулятивных порогов — чтобы _pickBiome был O(log n).
        this._cum = [];
        let acc = 0;
        for (const { biome, weight } of TUNING.biome.distribution) {
            acc += weight;
            this._cum.push({ biome, upto: acc });
        }
        this._cum[this._cum.length - 1].upto = 1.0001; // страховка от floating point
    }

    /**
     * Domain warp: большие изгибы + мелкие детали.
     * Полностью детерминировано (тот же вход → тот же выход).
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

    // ── Биом ──────────────────────────────────────────────
    getBiome(wx, wy) {
        // ★ Приоритет №1: если точка попала в «пятачок» здания — вернуть его биом.
        const pad = getPadBiomeAt(wx, wy);
        if (pad !== null) return pad;

        // ── Остальная логика без изменений ────────────────
        const w = this._warp(wx, wy);
        const f = TUNING.biome.indexFreq;
        const n = this.biomeIndex.fractal(w.x * f, w.y * f, 3, 0.5, 2);
        return this._pickBiome(n);
    }

    _pickBiome(n) {
        for (let i = 0; i < this._cum.length; i++) {
            if (n < this._cum[i].upto) return this._cum[i].biome;
        }
        return this._cum[this._cum.length - 1].biome;
    }

    // ── Тропинки (детерминированные) ──────────────────────
    getPath(wx, wy) {
        const f = TUNING.biome.pathFreq;
        const T = TUNING.biome.pathThreshold;

        const wf = f * 0.75;
        const wx2 = wx + (this.pathWarp.fractal(wx * wf,       wy * wf,       2, 0.5, 2) - 0.5) * 180;
        const wy2 = wy + (this.pathWarp.fractal(wx * wf + 77,  wy * wf + 77,  2, 0.5, 2) - 0.5) * 180;

        const n = this.pathNoise.fractal(wx2 * f, wy2 * f, 3, 0.5, 2);
        const dist = Math.abs(n - 0.5) * 2;
        if (dist > T) return 0;
        return 1 - dist / T;
    }

    // ── Плотности (из TuningConfig) ───────────────────────
    getTreeDensity(wx, wy) {
        const b = this.getBiome(wx, wy);
        const base = TUNING.biome.treeDensity[b] ?? 0;
        if (base <= 0) return 0;
        const n = this.detail.fractal(
            wx * TUNING.biome.detailFreq,
            wy * TUNING.biome.detailFreq, 2, 0.5, 2,
        );
        return Math.min(1, base * (0.55 + n * 0.9));
    }

    getDecorDensity(wx, wy) {
        const b = this.getBiome(wx, wy);
        return TUNING.biome.decorDensity[b] ?? 0;
    }
}