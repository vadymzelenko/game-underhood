import {
    CHUNK_PX, BIOME, DEPTH,
    BUILDING_BOUNDS, BUILDING_CLEARING,
} from '../utils/Constants.js';
import { hash2D } from '../utils/MathUtils.js';
import { JitteredSampler } from './JitteredSampler.js';
import { TUNING } from '../config/TuningConfig.js';

const TREE_DENSE_SALT  = 0x1111;
const TREE_SPARSE_SALT = 0x2222;
const DECOR_SALT       = 0x3333;

export class Chunk {
    constructor(scene, cx, cy, biomeGen, pixelRenderer) {
        this.scene = scene;
        this.cx = cx;
        this.cy = cy;
        this.biomeGen = biomeGen;
        this.pixelRenderer = pixelRenderer;

        this.texKey = null;
        this.sprite = null;
        this.objects = [];   // { sprite, shadow }
    }

    generate() {
        this.texKey = this.pixelRenderer.render(this.scene, this.cx, this.cy);
        const ox = this.cx * CHUNK_PX;
        const oy = this.cy * CHUNK_PX;
        this.sprite = this.scene.add.image(ox, oy, this.texKey)
            .setOrigin(0, 0)
            .setDepth(DEPTH.GROUND);
    }

    render() {
        const ox = this.cx * CHUNK_PX;
        const oy = this.cy * CHUNK_PX;
        const maxX = ox + CHUNK_PX;
        const maxY = oy + CHUNK_PX;

        const dense = new JitteredSampler(28, 0xBEEF).sample(
            ox, oy, maxX, maxY,
            (x, y) => {
                if (this._insideBuildingZone(x, y)) return 0;
                const b = this.biomeGen.getBiome(x, y);
                if (b !== BIOME.PINE && b !== BIOME.BIRCH &&
                    b !== BIOME.SWAMP && b !== BIOME.GRASS) return 0;
                if (b === BIOME.GRASS) return this.biomeGen.getTreeDensity(x, y) * 0.35;
                return this.biomeGen.getTreeDensity(x, y);
            },
            TREE_DENSE_SALT,
        );

        const sparse = new JitteredSampler(78, 0xCAFE).sample(
            ox, oy, maxX, maxY,
            (x, y) => {
                if (this._insideBuildingZone(x, y)) return 0;
                if (this.biomeGen.getBiome(x, y) !== BIOME.OAK) return 0;
                return this.biomeGen.getTreeDensity(x, y);
            },
            TREE_SPARSE_SALT,
        );

        const decor = new JitteredSampler(44, 0xFACE).sample(
            ox, oy, maxX, maxY,
            (x, y) => {
                if (this._insideBuildingZone(x, y)) return 0;
                return this.biomeGen.getDecorDensity(x, y);
            },
            DECOR_SALT,
        );

        for (const p of dense)  this._placeTree(p.x, p.y);
        for (const p of sparse) this._placeTree(p.x, p.y);
        for (const p of decor)  this._placeDecor(p.x, p.y);
    }

    _placeTree(wx, wy) {
        const biome = this.biomeGen.getBiome(wx, wy);
        const r = hash2D(Math.floor(wx), Math.floor(wy), 4242);
        let key = null;
        let cfg = null;

        switch (biome) {
            case BIOME.PINE:
                if (r < 0.55)      { key = 'tree_pine_0';   cfg = TUNING.trees.pine; }
                else if (r < 0.90) { key = 'tree_pine_1';   cfg = TUNING.trees.pine2; }
                else               { key = 'tree_spruce_0'; cfg = TUNING.trees.spruce; }
                break;
            case BIOME.BIRCH:
                if (r < 0.5) { key = 'tree_birch_0'; cfg = TUNING.trees.birch; }
                else         { key = 'tree_birch_1'; cfg = TUNING.trees.birch2; }
                break;
            case BIOME.OAK:
                key = 'tree_oak_0'; cfg = TUNING.trees.oak;
                break;
            case BIOME.SWAMP:
                if (r < 0.75) { key = 'tree_dead_0'; cfg = TUNING.trees.dead; }
                else          { key = 'tree_dead_1'; cfg = TUNING.trees.dead2; }
                break;
            case BIOME.GRASS:
                if (r < 0.35) { key = 'tree_birch_0'; cfg = TUNING.trees.birch; }
                break;
        }
        if (!key || !cfg) return;
        this._addObject(wx, wy, key, cfg.shadowW, cfg.shadowH, cfg.yOff);
    }

    _placeDecor(wx, wy) {
        const biome = this.biomeGen.getBiome(wx, wy);
        const r = hash2D(Math.floor(wx), Math.floor(wy), 7711);
        let key = null;
        let cfg = TUNING.decor.rock;

        switch (biome) {
            case BIOME.GRASS:
            case BIOME.OAK:
                if (r < 0.42)      { key = 'fern_0'; cfg = TUNING.decor.fern; }
                else if (r < 0.72) { key = 'rock_0'; cfg = TUNING.decor.rock; }
                else if (r < 0.90) { key = 'rock_1'; cfg = TUNING.decor.rock; }
                else               { key = 'log_0';  cfg = TUNING.decor.log; }
                break;
            case BIOME.BIRCH:
            case BIOME.PINE:
                if (r < 0.35)      { key = 'fern_0'; cfg = TUNING.decor.fern; }
                else if (r < 0.60) { key = 'fern_1'; cfg = TUNING.decor.fern; }
                else if (r < 0.78) { key = 'rock_0'; cfg = TUNING.decor.rock; }
                else if (r < 0.92) { key = 'log_1';  cfg = TUNING.decor.log; }
                else               { key = 'rock_2'; cfg = TUNING.decor.rock; }
                break;
            case BIOME.SWAMP:
                if (r < 0.5)      { key = 'log_2';  cfg = TUNING.decor.log; }
                else if (r < 0.8) { key = 'fern_1'; cfg = TUNING.decor.fern; }
                else              { key = 'rock_1'; cfg = TUNING.decor.rock; }
                break;
            case BIOME.SAND:
                key = r < 0.6 ? 'rock_0' : 'rock_1'; cfg = TUNING.decor.rock;
                break;
        }
        if (!key || !cfg) return;
        this._addObject(wx, wy, key, cfg.shadowW, cfg.shadowH, cfg.yOff);
    }

    /**
     * Умная тень (п.1 ТЗ):
     *  • shadow.setDepth(DEPTH.SHADOW) — БЕЗ + wy.
     *    Все тени лежат на едином слое под всеми спрайтами.
     *    Тень дерева физически не может перекрыть персонажа.
     *  • sprite.setDepth(DEPTH.ENTITIES + wy) — Y-sort.
     *  • Тень привязана к основанию (wy + yOff), а не к центру спрайта.
     */
    _addObject(wx, wy, key, shW, shH, yOff) {
        const baseY = wy + yOff;

        const shadow = this.scene.add.image(wx, baseY, 'shadow_soft');
        shadow.setOrigin(0.5, 0.5);
        shadow.setDisplaySize(shW, shH);
        shadow.setAlpha(TUNING.shadow.alpha);
        shadow.setTint(TUNING.shadow.color);
        shadow.setDepth(DEPTH.SHADOW);          // ← единый слой, без Y-sort

        const sprite = this.scene.add.image(wx, baseY, key);
        sprite.setOrigin(0.5, 1);
        sprite.setDepth(DEPTH.ENTITIES + wy);   // ← Y-sort

        this.objects.push({ sprite, shadow });
    }

    _insideBuildingZone(wx, wy) {
        const b = BUILDING_BOUNDS;
        const p = BUILDING_CLEARING;
        return wx > b.x - p && wx < b.x + b.w + p
            && wy > b.y - p && wy < b.y + b.h + p;
    }

    destroy() {
        if (this.sprite) this.sprite.destroy();
        if (this.texKey && this.scene.textures.exists(this.texKey)) {
            this.scene.textures.remove(this.texKey);
        }
        for (const o of this.objects) {
            o.sprite.destroy();
            o.shadow.destroy();
        }
        this.objects.length = 0;
    }
}