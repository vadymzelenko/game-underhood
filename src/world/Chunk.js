import {
    CHUNK_SIZE, CHUNK_PX, TILE_SIZE, BIOME, DEPTH,
    BUILDING_BOUNDS, BUILDING_CLEARING,
} from '../utils/Constants.js';
import { hash2D } from '../utils/MathUtils.js';

export class Chunk {
    constructor(scene, cx, cy, biomeGen, pixelRenderer) {
        this.scene = scene;
        this.cx = cx;
        this.cy = cy;
        this.biomeGen = biomeGen;
        this.pixelRenderer = pixelRenderer;

        this.texKey = null;
        this.sprite = null;
        this.trees = [];
    }

    generate() {
        // Пиксельная текстура земли
        this.texKey = this.pixelRenderer.render(this.scene, this.cx, this.cy);
        const ox = this.cx * CHUNK_PX;
        const oy = this.cy * CHUNK_PX;
        this.sprite = this.scene.add.image(ox, oy, this.texKey)
            .setOrigin(0, 0)
            .setDepth(DEPTH.GROUND);
    }

    render() {
        // Деревья поверх — тот же контракт, что и раньше
        const ox = this.cx * CHUNK_PX;
        const oy = this.cy * CHUNK_PX;

        for (let ty = 0; ty < CHUNK_SIZE; ty++) {
            for (let tx = 0; tx < CHUNK_SIZE; tx++) {
                const wx = ox + tx * TILE_SIZE + TILE_SIZE * 0.5;
                const wy = oy + ty * TILE_SIZE + TILE_SIZE * 0.5;

                if (this._insideBuildingZone(wx, wy)) continue;

                const biome = this.biomeGen.getBiome(wx, wy);
                if (biome !== BIOME.FOREST) continue;

                const density = this.biomeGen.getTreeDensity(wx, wy);
                if (density < 0.58) continue;

                const variant = Math.min(2, Math.floor(hash2D(tx, ty, 9999) * 3));
                const tree = this.scene.add.image(wx, wy + 4, `tree_${variant}`);
                tree.setOrigin(0.5, 0.95);
                tree.setDepth(DEPTH.ENTITIES + tree.y);
                this.trees.push(tree);
            }
        }
    }

    _insideBuildingZone(wx, wy) {
        const b = BUILDING_BOUNDS;
        const pad = BUILDING_CLEARING;
        return wx > b.x - pad && wx < b.x + b.w + pad
            && wy > b.y - pad && wy < b.y + b.h + pad;
    }

    destroy() {
        if (this.sprite) this.sprite.destroy();
        if (this.texKey && this.scene.textures.exists(this.texKey)) {
            this.scene.textures.remove(this.texKey);
        }
        for (const t of this.trees) t.destroy();
        this.trees.length = 0;
    }
}