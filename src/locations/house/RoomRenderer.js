import { TUNING } from '../../config/TuningConfig.js';
import { blocksMove } from './HouseLayouts.js';
import {
    TH, paintFloor, paintCarpet, paintWallFace, paintWindow, WALL_DECOR,
} from './HouseTheme.js';

/**
 * Рисует весь этаж одной текстурой в 3/4 top-down (Stardew-стиль).
 *
 *  • Задние и боковые стены — полные грани с обоями, плинтусом, трим-молдингом,
 *    угловыми стойками и настенным декором (плакаты/картины/часы/свечи).
 *  • Передняя (нижняя) стена — CUTAWAY: полупрозрачна, не перекрывает обзор.
 *  • Пол — доски с зерном; в комнатах — ковры.
 *  • Обои подбираются ПО КОМНАТЕ (roomGrid): детские — зелёные, библиотека —
 *    дерево, котельная — холодная плитка и т.д.
 */
export class RoomRenderer {
    constructor(scene) { this.scene = scene; }

    render(layoutId, layout) {
        const key = `room_${layoutId}`;
        if (this.scene.textures.exists(key)) this.scene.textures.remove(key);

        const t = layout.tilePx;
        const m = layout.map;
        const cols = m[0].length, rows = m.length;
        const W = cols * t, H = rows * t;
        const cutawayAlpha = layout.cutawayAlpha ?? TUNING.house.cutawayAlpha ?? 0.16;
        const roomGrid = layout.roomGrid;
        const rooms = layout.rooms ?? [];

        const cv = document.createElement('canvas');
        cv.width = W; cv.height = H;
        const ctx = cv.getContext('2d', { willReadFrequently: true });
        ctx.imageSmoothingEnabled = false;

        const walk = (x, y) => {
            if (x < 0 || y < 0 || x >= cols || y >= rows) return false;
            const c = m[y][x];
            return c !== '#' && c !== '=' && c !== 'W' && c !== ' ';
        };
        // Обои тайла стены — по соседней комнате
        const styleAt = (x, y) => {
            for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
                const ri = roomGrid?.[y + dy]?.[x + dx];
                if (ri != null && ri >= 0) return rooms[ri]?.style ?? 'lilac';
            }
            return 'lilac';
        };

        // 1) Пол
        for (let y = 0; y < rows; y++)
            for (let x = 0; x < cols; x++)
                if (!blocksMove(m[y][x])) paintFloor(ctx, x * t, y * t, t, x, y);

        // 1b) Ковры в комнатах
        for (let y = 0; y < rows; y++)
            for (let x = 0; x < cols; x++) {
                if (blocksMove(m[y][x])) continue;
                const ri = roomGrid?.[y]?.[x];
                if (ri == null || ri < 0) continue;
                const carpet = rooms[ri]?.carpet;
                if (carpet) paintCarpet(ctx, x * t, y * t, t, x, y, carpet);
            }

        // 2) AO у стен
        for (let y = 0; y < rows; y++)
            for (let x = 0; x < cols; x++) {
                if (blocksMove(m[y][x])) continue;
                this._ao(ctx, x * t, y * t, t, x, y, m, cols, rows);
            }

        // 3) Стены / окна / двери / лестницы
        for (let y = 0; y < rows; y++)
            for (let x = 0; x < cols; x++) {
                const ch = m[y][x];
                const px = x * t, py = y * t;
                if (ch === '#' || ch === '=') {
                    if (y === rows - 1) this._cutaway(ctx, px, py, t, cutawayAlpha, styleAt(x, y));
                    else {
                        paintWallFace(ctx, px, py, t, styleAt(x, y));
                        this._post(ctx, px, py, t, x, y, walk);
                    }
                }
                else if (ch === 'W') paintWindow(ctx, px, py, t);
                else if (ch === '+') this._doorway(ctx, px, py, t);
                else if (ch === 'D') this._door(ctx, px, py, t);
                else if (ch === 'S') this._stair(ctx, x, y, t, m);
            }

        // 4) Настенный декор + свечи коридора
        this._decor(ctx, layout, t, m, rooms);

        this.scene.textures.addCanvas(key, cv);
        return key;
    }


    // ── AO у стен ───────────────────────────────────────────
    _ao(ctx, px, py, s, tx, ty, m, cols, rows) {
        const isWall = (x, y) =>
            x < 0 || y < 0 || x >= cols || y >= rows ||
            m[y][x] === '#' || m[y][x] === '=' || m[y][x] === ' ';

        if (isWall(tx, ty - 1)) {
            ctx.fillStyle = TH.AO; ctx.fillRect(px, py, s, 3);
            ctx.fillStyle = TH.AO_SOFT; ctx.fillRect(px, py + 3, s, 2);
        }
        if (isWall(tx, ty + 1)) {
            ctx.fillStyle = TH.AO_SOFT; ctx.fillRect(px, py + s - 3, s, 3);
        }
        if (isWall(tx - 1, ty)) {
            ctx.fillStyle = TH.AO; ctx.fillRect(px, py, 2, s);
            ctx.fillStyle = TH.AO_SOFT; ctx.fillRect(px + 2, py, 2, s);
        }
        if (isWall(tx + 1, ty)) {
            ctx.fillStyle = TH.AO; ctx.fillRect(px + s - 2, py, 2, s);
            ctx.fillStyle = TH.AO_SOFT; ctx.fillRect(px + s - 4, py, 2, s);
        }
    }

    // ── Угловые стойки (вертикальный брус на стыке стен) ────
    _post(ctx, px, py, s, tx, ty, walk) {
        const l = walk(tx - 1, ty), r = walk(tx + 1, ty);
        if (!l && !r) return;
        ctx.fillStyle = TH.POST_DARK;
        if (l) ctx.fillRect(px, py, 3, s);
        if (r) ctx.fillRect(px + s - 3, py, 3, s);
        ctx.fillStyle = TH.POST;
        if (l) ctx.fillRect(px + 1, py, 1, s);
        if (r) ctx.fillRect(px + s - 2, py, 1, s);
    }

    // ── CUTAWAY: передняя стена — пол + полупрозрачная грань ──
    _cutaway(ctx, px, py, s, alpha, style) {
        paintFloor(ctx, px, py, s, 0, 0);
        ctx.save();
        ctx.globalAlpha = alpha;
        paintWallFace(ctx, px, py, s, style || 'lilac');
        ctx.restore();
    }

    // ── Настенный декор комнат + свечи-бра вдоль коридора ───
    _decor(ctx, layout, t, m, rooms) {
        rooms.forEach((r) => {
            if (!r.decor) return;
            const cand = [];
            for (let x = r.x + 1; x < r.x + r.w - 1; x++) {
                if (m[r.y]?.[x] === '#' && m[r.y + 1]?.[x] === '.') cand.push(x);
            }
            if (!cand.length) return;
            const fn = WALL_DECOR[r.decor] || WALL_DECOR.poster;
            const picks = [
                cand[Math.floor(cand.length * 0.32)],
                cand[Math.floor(cand.length * 0.68)],
            ];
            picks.forEach((x, i) => { if (x != null) fn(ctx, x * t, r.y * t, t, r.x + x + i); });
        });

        const corr = layout.corridor;
        if (!corr) return;
        for (let y = corr.y + 3; y < corr.y + corr.h - 2; y += 7) {
            for (const wx of [corr.x - 1, corr.x + corr.w]) {
                if (m[y]?.[wx] === '#') WALL_DECOR.candle(ctx, wx * t, y * t, t, 0);
            }
        }
    }


    // ── Дверной проём (створка — в Door.js) ─────────────────
    _doorway(ctx, px, py, s) {
        paintFloor(ctx, px, py, s, 0, 0);
        ctx.fillStyle = TH.FRAME;
        ctx.fillRect(px, py, s, 1);
        ctx.fillRect(px, py + s - 1, s, 1);
        ctx.fillStyle = TH.TRIM;
        ctx.fillRect(px, py, 1, s);
        ctx.fillRect(px + s - 1, py, 1, s);
    }

    // ── Выходная дверь ──────────────────────────────────────
    _door(ctx, px, py, s) {
        paintFloor(ctx, px, py, s, 0, 0);
        ctx.fillStyle = TH.FRAME;
        ctx.fillRect(px + 1, py + 1, s - 2, s - 2);
        ctx.fillStyle = TH.DOOR;
        ctx.fillRect(px + 3, py + 2, s - 6, s - 3);
        ctx.fillStyle = TH.DOOR_D;
        for (let y = 4; y < s - 2; y += 3) ctx.fillRect(px + 4, py + y, s - 8, 1);
        ctx.fillStyle = TH.HANDLE;
        ctx.fillRect(px + s - 6, py + (s >> 1) - 1, 2, 2);
        ctx.fillStyle = 'rgba(255,241,169,0.35)';
        ctx.fillRect(px + 3, py + s - 2, s - 6, 1);
    }

    // ── Винтовая лестница (один блок = одна спираль) ────────
    _stair(ctx, tx, ty, s, m) {
        // рисуем только с верхнего-левого тайла блока 'S'
        if (m[ty - 1]?.[tx] === 'S' || m[ty]?.[tx - 1] === 'S') return;

        let bw = 1, bh = 1;
        while (m[ty]?.[tx + bw] === 'S') bw++;
        while (m[ty + bh]?.[tx] === 'S') bh++;
        const W = bw * s, H = bh * s;
        const px = tx * s, py = ty * s;

        for (let yy = 0; yy < bh; yy++)
            for (let xx = 0; xx < bw; xx++) paintFloor(ctx, px + xx * s, py + yy * s, s, 0, 0);

        const cx = px + W / 2, cy = py + H / 2;
        const R = Math.min(W, H) / 2 - 1;
        for (let r = R; r >= 2; r -= 3) {
            ctx.fillStyle = (((r / 3) | 0) % 2 === 0) ? TH.STAIR_HI : TH.STAIR_LO;
            ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
        }
        ctx.fillStyle = TH.FRAME;
        ctx.beginPath(); ctx.arc(cx, cy, 1.5, 0, Math.PI * 2); ctx.fill();
    }
}