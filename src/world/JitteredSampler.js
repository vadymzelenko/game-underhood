import { hash2D } from '../utils/MathUtils.js';

/**
 * Chunk-safe сэмплер расстановки объектов.
 *
 * Идея: мир разбит на сетку ячеек `cell`. В каждой ячейке — максимум один
 * объект, позиция джиттерится детерминированным хэшем. Это даёт
 * blue-noise-подобное распределение без глобального стейта и без артефактов
 * на границах чанков.
 *
 * Для разных биомов можно вызывать с разным `cell` (например, для дубов 48 px,
 * для сосен — 20 px), и результат склеится без щелей.
 */
export class JitteredSampler {
    constructor(cell = 24, seed = 0) {
        this.cell = cell;
        this.seed = seed | 0;
    }

    /**
     * @param {number} minX @param {number} minY
     * @param {number} maxX @param {number} maxY
     * @param {(x:number,y:number)=>number} probabilityFn — 0..1
     * @param {number} salt — разные сэмплеры одного региона не совпадают
     */
    sample(minX, minY, maxX, maxY, probabilityFn, salt = 0) {
        const out = [];
        const cs = this.cell;
        const gx0 = Math.floor(minX / cs);
        const gy0 = Math.floor(minY / cs);
        const gx1 = Math.ceil(maxX / cs);
        const gy1 = Math.ceil(maxY / cs);

        for (let gy = gy0; gy < gy1; gy++) {
            for (let gx = gx0; gx < gx1; gx++) {
                const s = this.seed ^ (salt * 2654435761);

                // Вероятность размещения
                const roll = hash2D(gx, gy, s + 3);
                // Джиттер позиции внутри ячейки (0.15..0.85 — не липнем к краю)
                const jx = 0.15 + hash2D(gx, gy, s + 1) * 0.7;
                const jy = 0.15 + hash2D(gx, gy, s + 2) * 0.7;

                const x = (gx + jx) * cs;
                const y = (gy + jy) * cs;
                if (x < minX || x >= maxX || y < minY || y >= maxY) continue;

                const p = probabilityFn(x, y);
                if (roll < p) out.push({ x, y });
            }
        }
        return out;
    }
}