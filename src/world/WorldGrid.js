import { DEPTH } from '../utils/Constants.js';

export class WorldGrid {
    constructor(scene, cellSize = 32) {
        this.scene = scene;
        this.cellSize = cellSize;
        this._gfx = null;
        this._visible = false;
        this._occupied = new Map();
    }

    worldToCell(wx, wy) {
        return { cx: Math.floor(wx / this.cellSize), cy: Math.floor(wy / this.cellSize) };
    }
    cellToWorld(cx, cy) {
        return { x: cx * this.cellSize, y: cy * this.cellSize };
    }
    cellCenter(cx, cy) {
        return { x: (cx + 0.5) * this.cellSize, y: (cy + 0.5) * this.cellSize };
    }
    snapToGrid(wx, wy) {
        const { cx, cy } = this.worldToCell(wx, wy);
        return this.cellCenter(cx, cy);
    }

    _key(cx, cy) { return `${cx},${cy}`; }

    isFree(cx, cy, w = 1, h = 1) {
        for (let y = cy; y < cy + h; y++)
            for (let x = cx; x < cx + w; x++)
                if (this._occupied.has(this._key(x, y))) return false;
        return true;
    }
    occupy(cx, cy, w, h, payload) {
        for (let y = cy; y < cy + h; y++)
            for (let x = cx; x < cx + w; x++)
                this._occupied.set(this._key(x, y), payload ?? { kind: 'unknown' });
    }
    release(cx, cy, w, h) {
        for (let y = cy; y < cy + h; y++)
            for (let x = cx; x < cx + w; x++)
                this._occupied.delete(this._key(x, y));
    }
    snapAndReserve(worldX, worldY, wCells, hCells, payload) {
        const { cx, cy } = this.worldToCell(worldX, worldY);
        const alignedCx = Math.floor(cx - wCells / 2);
        const alignedCy = Math.floor(cy - hCells / 2);
        if (!this.isFree(alignedCx, alignedCy, wCells, hCells)) return null;
        this.occupy(alignedCx, alignedCy, wCells, hCells, payload);
        return this.cellCenter(alignedCx, alignedCy);
    }
    placeAtCell(gameObject, cx, cy, offsetY = 0) {
        const p = this.cellCenter(cx, cy);
        gameObject.setPosition(p.x, p.y + offsetY);
        return gameObject;
    }

    toggleDebug() {
        if (!this._gfx) {
            this._gfx = this.scene.add.graphics();
            // ★ depth внутри мира — выше земли и сущностей, но ниже UI
            this._gfx.setDepth(DEPTH.ENTITIES + 9999999);
        }
        this._visible = !this._visible;
        this._gfx.setVisible(this._visible);
        if (this._visible) this._drawDebug();
    }

    _drawDebug() {
        const cam = this.scene.cameras.main;
        const view = cam.worldView;
        const g = this._gfx;
        g.clear();

        // ★ рисуем ЗАПАС за пределами вьюпорта, чтобы не мерцало на краях
        const cs = this.cellSize;
        const pad = cs * 2;
        const left = view.left   - pad;
        const right = view.right + pad;
        const top = view.top     - pad;
        const bottom = view.bottom + pad;

        const startX = Math.floor(left / cs) * cs;
        const startY = Math.floor(top / cs) * cs;

        // Вертикальные линии
        for (let x = startX; x <= right; x += cs) {
            const big = ((x / cs) | 0) % 4 === 0;
            g.lineStyle(big ? 2 : 1, big ? 0xfff1a9 : 0x349c58, big ? 0.35 : 0.18);
            g.lineBetween(x, top, x, bottom);
        }
        // Горизонтальные
        for (let y = startY; y <= bottom; y += cs) {
            const big = ((y / cs) | 0) % 4 === 0;
            g.lineStyle(big ? 2 : 1, big ? 0xfff1a9 : 0x349c58, big ? 0.35 : 0.18);
            g.lineBetween(left, y, right, y);
        }

        // Занятые клетки
        const startCx = Math.floor(left / cs);
        const startCy = Math.floor(top / cs);
        const endCx   = Math.ceil(right / cs);
        const endCy   = Math.ceil(bottom / cs);
        for (let cy = startCy; cy <= endCy; cy++) {
            for (let cx = startCx; cx <= endCx; cx++) {
                if (!this._occupied.has(this._key(cx, cy))) continue;
                g.fillStyle(0xb74132, 0.18);
                g.fillRect(cx * cs, cy * cs, cs, cs);
            }
        }
    }

    update() {
        if (this._visible) this._drawDebug();
    }

    destroy() {
        this._occupied.clear();
        if (this._gfx) { this._gfx.destroy(); this._gfx = null; }
    }
}