import { PALETTE as PALETTE_NUM } from '../../utils/Constants.js';

// ─────────────────────────────────────────────────────────────
//  Основная палитра — единственный источник цветов.
//  Все hex приходят из Constants.js/PALETTE.
// ─────────────────────────────────────────────────────────────
export const PALETTE = {};
for (const k in PALETTE_NUM) {
    PALETTE[k] = '#' + PALETTE_NUM[k].toString(16).padStart(6, '0');
}

// ─────────────────────────────────────────────────────────────
//  Семантические алиасы. НЕ новые цвета — только псевдонимы
//  на существующие записи PALETTE. Нужны, чтобы код генераторов
//  читался «человечески» (CAP_RED вместо RED для шляпки гриба)
//  и чтобы смысл менялся в одном месте.
// ─────────────────────────────────────────────────────────────
const A = (key) => PALETTE[key];

Object.assign(PALETTE, {
    // Туман — холодные сине-серые оттенки
    MIST_DARK:  A('DARK_TEAL'),
    MIST_MID:   A('TEAL'),
    MIST_LIGHT: A('TAN'),
    MIST_PALE:  A('CREAM'),

    // Цветы
    FLOWER_WHITE:   A('CREAM'),
    FLOWER_PINK:    A('PINK'),
    FLOWER_MAGENTA: A('DARK_PINK'),
    FLOWER_PURPLE:  A('DARK_PURPLE2'),
    FLOWER_VIOLET:  A('DARK_PURPLE'),
    FLOWER_BLUE:    A('TEAL'),
    FLOWER_SKY:     A('DARK_TEAL'),
    FLOWER_YELLOW:  A('YELLOW'),

    // Мох — оливково-зелёная гамма
    MOSS_DARK:  A('OLIVE'),
    MOSS_MID:   A('OLIVE_GREEN'),
    MOSS_LIGHT: A('GREEN'),
    MOSS_PALE:  A('LIGHT_GREEN'),

    // Стебли / листья
    STEM_GREEN: A('OLIVE_GREEN'),
    STEM_DARK:  A('OLIVE'),
    LEAF_LIGHT: A('LIGHT_GREEN'),

    // Грибы
    CAP_RED:        A('RED'),
    CAP_RED_DARK:   A('DARK_RED'),
    CAP_CREAM:      A('CREAM'),
    CAP_CREAM_DARK: A('TAN'),
    CAP_BROWN:      A('BROWN'),
    CAP_BROWN_DARK: A('DARK_BROWN'),
    CAP_SPOT:       A('CREAM'),
    CAP_GILL:       A('VERY_DARK'),
});

// ─────────────────────────────────────────────────────────────
//  Утилиты
// ─────────────────────────────────────────────────────────────

export const hexToRgb = (hex) => {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return m
        ? [parseInt(m[1],16), parseInt(m[2],16), parseInt(m[3],16), 255]
        : [0,0,0,0];
};

export const lerp = (a, b, t) => a + (b - a) * t;
export const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

export const hash2 = (x, y, seed) => {
    let h = Math.imul(x|0, 374761393)
        + Math.imul(y|0, 668265263)
        + Math.imul(seed|0, 1442695041);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

export const vnoise = (x, y, seed = 0) => {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const u = xf*xf*(3 - 2*xf), v = yf*yf*(3 - 2*yf);
    const a = hash2(xi,   yi,   seed);
    const b = hash2(xi+1, yi,   seed);
    const c = hash2(xi,   yi+1, seed);
    const d = hash2(xi+1, yi+1, seed);
    return a*(1-u)*(1-v) + b*u*(1-v) + c*(1-u)*v + d*u*v;
};

export const fbm = (x, y, oct = 4, seed = 0) => {
    let s = 0, amp = 1, freq = 1, norm = 0;
    for (let i = 0; i < oct; i++) {
        s += amp * vnoise(x * freq, y * freq, seed + i * 71);
        norm += amp; amp *= 0.5; freq *= 2;
    }
    return s / norm;
};

const BAYER4 = [
    [ 0,  8,  2, 10],
    [12,  4, 14,  6],
    [ 3, 11,  1,  9],
    [15,  7, 13,  5],
];
export const bayer = (x, y) => (BAYER4[y & 3][x & 3] + 0.5) / 16;

export function pick4(v, c1, c2, c3, c4, x, y, softness = 0.28) {
    const d = (bayer(x, y) - 0.5) * softness;
    const vv = v + d;
    if (vv > 0.72) return c1;
    if (vv > 0.48) return c2;
    if (vv > 0.24) return c3;
    return c4;
}

export function applyOutline(ctx, w, h, outlineHex) {
    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;
    const resultData = new Uint8ClampedArray(data);
    const [r, g, b] = hexToRgb(outlineHex);
    const getA = (x, y) =>
        (x < 0 || x >= w || y < 0 || y >= h) ? 0 : data[(y * w + x) * 4 + 3];

    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const idx = (y * w + x) * 4;
            if (data[idx + 3] === 0) {
                if (getA(x + 1, y) > 0 || getA(x - 1, y) > 0 ||
                    getA(x, y + 1) > 0 || getA(x, y - 1) > 0) {
                    resultData[idx] = r;
                    resultData[idx + 1] = g;
                    resultData[idx + 2] = b;
                    resultData[idx + 3] = 255;
                }
            }
        }
    }
    ctx.putImageData(new ImageData(resultData, w, h), 0, 0);
}

export const state = { globalNoise: 0.08 };