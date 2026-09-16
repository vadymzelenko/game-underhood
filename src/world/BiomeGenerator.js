import { NoiseGenerator } from './NoiseGenerator.js';
import { BIOME, WORLD_SEED } from '../utils/Constants.js';

export class BiomeGenerator {
    constructor(seed = WORLD_SEED) {
        this.elevation = new NoiseGenerator(seed);
        this.moisture  = new NoiseGenerator(seed + 777);
        this.treeNoise = new NoiseGenerator(seed + 1234);
    }

    getBiome(wx, wy) {
        const e = this.elevation.fractal(wx * 0.0035, wy * 0.0035, 5, 0.5, 2);
        const directional = wx * 0.00035;
        const elev = e * 0.6 + directional + 0.35;

        if (elev < 0.15) return BIOME.DEEP_WATER;
        if (elev < 0.30) return BIOME.WATER;
        if (elev < 0.37) return BIOME.SAND;

        const m = this.moisture.fractal(wx * 0.007 + 100, wy * 0.007 + 100, 3, 0.5, 2);
        return m > 0.50 ? BIOME.FOREST : BIOME.GRASS;
    }

    getTreeDensity(wx, wy) {
        return this.treeNoise.fractal(wx * 0.06, wy * 0.06, 2, 0.5, 2);
    }
}