import { CHUNK_PX, VIEW_CHUNK_RADIUS } from '../utils/Constants.js';
import { Chunk } from './Chunk.js';
import { ChunkPixelRenderer } from './ChunkPixelRenderer.js';

export class ChunkManager {
    constructor(scene, biomeGen) {
        this.scene = scene;
        this.biomeGen = biomeGen;
        this.pixelRenderer = new ChunkPixelRenderer(biomeGen);   // ★
        this.chunks = new Map();
    }

    _key(cx, cy) { return `${cx},${cy}`; }

    update(px, py) {
        const pcx = Math.floor(px / CHUNK_PX);
        const pcy = Math.floor(py / CHUNK_PX);
        const needed = new Set();

        for (let dy = -VIEW_CHUNK_RADIUS; dy <= VIEW_CHUNK_RADIUS; dy++) {
            for (let dx = -VIEW_CHUNK_RADIUS; dx <= VIEW_CHUNK_RADIUS; dx++) {
                const cx = pcx + dx, cy = pcy + dy;
                const k = this._key(cx, cy);
                needed.add(k);
                if (!this.chunks.has(k)) {
                    const chunk = new Chunk(this.scene, cx, cy, this.biomeGen, this.pixelRenderer);
                    chunk.generate();
                    chunk.render();
                    this.chunks.set(k, chunk);
                }
            }
        }

        for (const [k, chunk] of this.chunks) {
            if (!needed.has(k)) { chunk.destroy(); this.chunks.delete(k); }
        }
    }

    destroyAll() {
        for (const [, c] of this.chunks) c.destroy();
        this.chunks.clear();
    }
}