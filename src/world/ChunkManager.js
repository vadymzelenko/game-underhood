import { CHUNK_PX, VIEW_CHUNK_RADIUS, WORLD_MIN, WORLD_MAX } from '../utils/Constants.js';
import { Chunk } from './Chunk.js';
import { ChunkPixelRenderer } from './ChunkPixelRenderer.js';

const ANIMAL_SPAWN_RADIUS = 2;

export class ChunkManager {
    constructor(scene, biomeGen, obstaclesGroup, windSystem) {
        this.scene = scene;
        this.biomeGen = biomeGen;
        this.obstaclesGroup = obstaclesGroup;
        this.windSystem = windSystem;
        this.pixelRenderer = new ChunkPixelRenderer(biomeGen);
        this.chunks = new Map();
        this.cMin = Math.floor(WORLD_MIN / CHUNK_PX);
        this.cMax = Math.ceil((WORLD_MAX - 1) / CHUNK_PX);
        this._vegAccum = 0;
        this.dirty = true;
    }

    _key(cx, cy) { return `${cx},${cy}`; }

    update(px, py, player = null, isBlocked = null) {
        const pcx = Math.floor(px / CHUNK_PX);
        const pcy = Math.floor(py / CHUNK_PX);
        const needed = new Set();
        let changed = false;

        // ── Создание новых чанков ────────────────────────────
        for (let dy = -VIEW_CHUNK_RADIUS; dy <= VIEW_CHUNK_RADIUS; dy++) {
            for (let dx = -VIEW_CHUNK_RADIUS; dx <= VIEW_CHUNK_RADIUS; dx++) {
                const cx = pcx + dx, cy = pcy + dy;
                if (cx < this.cMin || cx >= this.cMax) continue;
                if (cy < this.cMin || cy >= this.cMax) continue;
                const k = this._key(cx, cy);
                needed.add(k);
                if (!this.chunks.has(k)) {
                    const chunk = new Chunk(
                        this.scene, cx, cy,
                        this.biomeGen, this.pixelRenderer,
                        this.obstaclesGroup, this.windSystem,
                    );
                    chunk.generate();
                    chunk.render();
                    this.chunks.set(k, chunk);
                    changed = true;
                }
            }
        }

        // ── Удаление ушедших чанков ──────────────────────────
        for (const [k, chunk] of this.chunks) {
            if (!needed.has(k)) {
                chunk.destroy();
                this.chunks.delete(k);
                changed = true;
            }
        }

        // ── ★ СПАВН ЖИВОТНЫХ ────────────────────────────────
        // Каждый чанк при входе в ANIMAL_SPAWN_RADIUS от игрока
        // получает животных ровно один раз за свою жизнь.
        for (const [, chunk] of this.chunks) {
            if (chunk.animalsSpawned) continue;
            const ddx = chunk.cx - pcx;
            const ddy = chunk.cy - pcy;
            if (Math.max(Math.abs(ddx), Math.abs(ddy)) <= ANIMAL_SPAWN_RADIUS) {
                chunk.spawnAnimals();
            }
        }
        // ─────────────────────────────────────────────────────

        if (changed) this.dirty = true;

        if (player && isBlocked) {
            const dt = Math.min(0.05, this.scene.game.loop.delta / 1000);
            for (const [, chunk] of this.chunks) {
                if (chunk.animals.length) {
                    chunk.updateAnimals(dt, player, isBlocked);
                }
            }
        }

        if (player && player.moving) {
            this._vegAccum += this.scene.game.loop.delta;
            if (this._vegAccum >= 120) {
                this._vegAccum = 0;
                for (const [, chunk] of this.chunks) chunk.tryVegAudio(player);
            }
        }

        return changed;
    }

    applyShadowParams(params) {
        for (const [, chunk] of this.chunks) chunk.applyShadowParams(params);
    }

    destroyAll() {
        for (const [, c] of this.chunks) c.destroy();
        this.chunks.clear();
        this.dirty = true;
    }
}