import { hash2D, lerp } from '../utils/MathUtils.js';

export class NoiseGenerator {
    constructor(seed = 0) { this.seed = seed | 0; }

    valueNoise(x, y) {
        const x0 = Math.floor(x), y0 = Math.floor(y);
        const xf = x - x0, yf = y - y0;

        const v00 = hash2D(x0,     y0,     this.seed);
        const v10 = hash2D(x0 + 1, y0,     this.seed);
        const v01 = hash2D(x0,     y0 + 1, this.seed);
        const v11 = hash2D(x0 + 1, y0 + 1, this.seed);

        const u = xf * xf * (3 - 2 * xf);
        const v = yf * yf * (3 - 2 * yf);

        return lerp(lerp(v00, v10, u), lerp(v01, v11, u), v);
    }

    fractal(x, y, octaves = 4, persistence = 0.5, lacunarity = 2) {
        let amp = 1, freq = 1, sum = 0, norm = 0;
        for (let i = 0; i < octaves; i++) {
            sum  += this.valueNoise(x * freq, y * freq) * amp;
            norm += amp;
            amp  *= persistence;
            freq *= lacunarity;
        }
        return sum / norm;
    }
}