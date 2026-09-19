import { PALETTE as P } from '../utils/Constants.js';

import {
    makeOakTree, makePineTree, makeSpruceTree, makeBirchTree, makeDeadTree,
    makeFern, makeBush, makeFlower, makeMushroom, makeStump,
    makePebbles, makeMoss, makeRock, makeFormation, makeLog,
} from './procedural/index.js';

export {
    makeOakTree, makePineTree, makeSpruceTree, makeBirchTree, makeDeadTree,
    makeFern, makeBush, makeFlower, makeMushroom, makeStump,
    makePebbles, makeMoss, makeRock, makeFormation, makeLog// ← добавили
};

// ─────────────────────────────────────────────────────────────
//  Падающая тень — сплюснутый эллипс DARK_PURPLE-тинта
// ─────────────────────────────────────────────────────────────
export function makeShadowSoft(w = 56, h = 18) {
    const cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    const ctx = cv.getContext('2d');
    const cx = w / 2, cy = h / 2;
    const rx = w / 2 - 1, ry = h / 2 - 1;
    const hex = '#' + P.DARK_PURPLE.toString(16).padStart(6, '0');
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const dx = (x - cx) / rx;
            const dy = (y - cy) / ry;
            const d = dx * dx + dy * dy;
            if (d > 1) continue;
            const a = Math.pow(1 - d, 0.7) * 0.9;
            ctx.globalAlpha = a;
            ctx.fillStyle = hex;
            ctx.fillRect(x, y, 1, 1);
        }
    }
    ctx.globalAlpha = 1;
    return cv;
}

export function applyScale(canvas, factor) {
    if (!factor || factor === 1) return canvas;
    const dst = document.createElement('canvas');
    dst.width  = Math.max(1, Math.round(canvas.width  * factor));
    dst.height = Math.max(1, Math.round(canvas.height * factor));
    const ctx = dst.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(canvas, 0, 0, canvas.width, canvas.height, 0, 0, dst.width, dst.height);
    return dst;
}

// ─────────────────────────────────────────────────────────────
//  PLAYER SHEET (16×24, 4×4) — как было
// ─────────────────────────────────────────────────────────────
const HEX = {};
for (const k in P) HEX[k] = '#' + P[k].toString(16).padStart(6, '0');

export function makePlayerSheet(fw = 16, fh = 24) {
    const cols = 4, rows = 4;
    const W = cols * fw, H = rows * fh;
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const ctx = cv.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    const CH = {
        h: HEX.DARK_BROWN, s: HEX.CREAM, e: HEX.ALMOST_BLACK,
        r: HEX.RED, p: HEX.DARK_PURPLE, b: HEX.VERY_DARK,
    };

    const draw = (ox, oy, dir, frame) => {
        const set = (x, y, color) => { ctx.fillStyle = color; ctx.fillRect(ox + x, oy + y, 1, 1); };
        for (let y = 0; y < fh; y++) for (let x = 0; x < fw; x++) ctx.clearRect(ox + x, oy + y, 1, 1);

        for (let y = 8; y < 14; y++) for (let x = 4; x < 12; x++) set(x, y, CH.r);
        set(3, 9, CH.s); set(3, 10, CH.s);
        set(12, 9, CH.s); set(12, 10, CH.s);
        for (let y = 4; y < 8; y++) for (let x = 5; x < 11; x++) set(x, y, CH.s);
        for (let y = 2; y < 5; y++) for (let x = 4; x < 12; x++) set(x, y, CH.h);
        set(4, 5, CH.h); set(11, 5, CH.h);

        const lOff = frame === 1 ? -1 : frame === 3 ? 1 : 0;
        const rOff = frame === 3 ? -1 : frame === 1 ? 1 : 0;
        set(5, 14 + Math.max(0, lOff), CH.p);
        set(6, 14 + Math.max(0, lOff), CH.p);
        set(9, 14 + Math.max(0, rOff), CH.p);
        set(10, 14 + Math.max(0, rOff), CH.p);
        set(5, 22 + lOff, CH.b); set(6, 22 + lOff, CH.b);
        set(9, 22 + rOff, CH.b); set(10, 22 + rOff, CH.b);

        if (dir === 'down') { set(7, 6, CH.e); set(9, 6, CH.e); }
        else if (dir === 'up') {
            for (let y = 4; y < 8; y++) for (let x = 5; x < 11; x++) set(x, y, CH.h);
        } else if (dir === 'left') { set(6, 6, CH.e); set(4, 4, CH.h); set(4, 5, CH.h); }
        else if (dir === 'right') { set(9, 6, CH.e); set(11, 4, CH.h); set(11, 5, CH.h); }
    };

    const dirs = ['down', 'up', 'left', 'right'];
    dirs.forEach((dir, row) => {
        for (let col = 0; col < cols; col++) draw(col * fw, row * fh, dir, col);
    });
    return cv;
}

// ─────────────────────────────────────────────────────────────
//  GRASS TUFT — как было
// ─────────────────────────────────────────────────────────────
export function makeGrassTuft(seed = 900, variant = 0) {
    const cv = document.createElement('canvas');
    cv.width = 12; cv.height = 10;
    const ctx = cv.getContext('2d');
    const rng = (s => () => { s = (s * 9301 + 49297) % 233280; return s / 233280; })(seed + 1);
    const palette = [HEX.LIGHT_GREEN, HEX.GREEN, HEX.OLIVE_GREEN, HEX.YELLOW_GREEN];
    const cx = 6, baseY = 8;
    const bladeCount = 3 + Math.floor(rng() * 3);
    const spread = 6;

    for (let i = 0; i < bladeCount; i++) {
        const denom = Math.max(1, bladeCount - 1);
        const xOff = (i - (bladeCount - 1) / 2) * (spread / denom) + (rng() - 0.5) * 1.6;
        const bladeH = 3 + Math.floor(rng() * 4);
        const lean = Math.round((rng() - 0.5) * 3);
        const col = palette[Math.floor(rng() * palette.length)];
        for (let y = 0; y < bladeH; y++) {
            const yy = baseY - y;
            const t = y / Math.max(1, bladeH - 1);
            const xx = Math.round(cx + xOff + lean * t);
            ctx.fillStyle = col;
            ctx.fillRect(xx, yy, 1, 1);
            if (y === 0 && rng() < 0.6) {
                ctx.fillStyle = HEX.OLIVE;
                ctx.fillRect(xx, yy + 1, 1, 1);
            }
        }
    }
    return cv;
}

