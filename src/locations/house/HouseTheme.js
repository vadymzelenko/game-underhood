// HouseTheme.js — цветовая схема и «шкуры» интерьера детского дома.
//
// База — общая палитра игры (Constants.PALETTE). Здесь только её оттенки
// (смеси), чтобы обогатить вид, но остаться в едином стиле. Плюс — функции
// отрисовки поверхностей: пол, ковры, обои, настенный декор, окна.

import { PALETTE as P } from '../../utils/Constants.js';

export const hex = (n) => '#' + n.toString(16).padStart(6, '0');
export const rgba = (n, a) =>
    `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;

/** Смешать два цвета палитры (числа 0xRRGGBB). */
export function mixc(a, b, t) {
    const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
    const br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
    const r = Math.round(ar + (br - ar) * t);
    const g = Math.round(ag + (bg - ag) * t);
    const l = Math.round(ab + (bb - ab) * t);
    return '#' + ((r << 16) | (g << 8) | l).toString(16).padStart(6, '0');
}

// ─────────────────────────────────────────────────────────────
//  ПАЛИТРА ИНТЕРЬЕРА (производная от PALETTE)
// ─────────────────────────────────────────────────────────────
export const TH = {
    // Пол — дерево
    FLOOR:       hex(P.BROWN),
    FLOOR_B:     hex(P.BROWN),
    FLOOR_DARK:  hex(P.DARK_BROWN),
    FLOOR_DEEP:  hex(P.VERY_DARK),
    FLOOR_LIGHT: hex(P.TAN),
    FLOOR_GRAIN: hex(P.DARK_BROWN),

    // Стены / трим
    TRIM:        hex(P.PURPLE_GRAY),
    TRIM_DARK:   hex(P.DARK_PURPLE2),
    POST:        hex(P.PURPLE_GRAY),
    POST_DARK:   hex(P.ALMOST_BLACK),
    BASEBOARD:   hex(P.VERY_DARK),
    BASEBOARD_HI:hex(P.TAN),

    // Стекло / окна
    GLASS:       hex(P.DARK_TEAL),
    GLASS_HI:    hex(P.TEAL),
    GLOW:        rgba(P.CREAM, 0.42),

    // Двери
    DOOR:        hex(P.BROWN),
    DOOR_D:      hex(P.DARK_BROWN),
    FRAME:       hex(P.VERY_DARK),
    HANDLE:      hex(P.GOLD),

    // Лестница
    STAIR_HI:    hex(P.TAN),
    STAIR_LO:    hex(P.DARK_BROWN),

    // Ковры
    CARPET_RED:  hex(P.DARK_RED),
    CARPET_RED2: hex(P.RED),
    CARPET_GRN:  hex(P.OLIVE),
    CARPET_GRN2: hex(P.OLIVE_GREEN),

    // Тени
    AO:          rgba(P.ALMOST_BLACK, 0.5),
    AO_SOFT:     rgba(P.ALMOST_BLACK, 0.22),
};

// ─────────────────────────────────────────────────────────────
//  ПОЛ — доски с зерном
// ─────────────────────────────────────────────────────────────
export function paintFloor(ctx, x, y, s, tx, ty) {
    // базовый тон доски (лёгкая вариация по ряду)
    const dark = ((ty & 3) === 0);
    ctx.fillStyle = dark ? TH.FLOOR_DARK : TH.FLOOR;
    ctx.fillRect(x, y, s, s);

    // горизонтальные стыки досок
    ctx.fillStyle = TH.FLOOR_GAP;
    for (let i = 3; i < s; i += 5) ctx.fillRect(x, y + i, s, 1);

    // вертикальные швы со сдвигом
    ctx.fillStyle = TH.FLOOR_DEEP;
    const off = ((ty % 2) * 7 + (tx % 5) * 3) % s;
    ctx.fillRect(x + off, y, 1, s);
    const off2 = (off + 8) % s;
    ctx.fillRect(x + off2, y, 1, s);

    // блик сверху каждой доски
    ctx.fillStyle = TH.FLOOR_LIGHT;
    for (let i = 0; i < s; i += 5) ctx.fillRect(x, y + i, s, 1);

    // зерно — короткие тёмные чёрточки (детерминированно)
    ctx.fillStyle = TH.FLOOR_GRAIN;
    const gx = (tx * 13 + ty * 7) % s;
    const gy = (tx * 5 + ty * 11) % s;
    ctx.fillRect(x + gx, y + (gy % (s - 1)), 3, 1);
    ctx.fillRect(x + ((gx + 6) % s), y + ((gy + 3) % (s - 1)), 2, 1);
}

// ─────────────────────────────────────────────────────────────
//  КОВРЫ
// ─────────────────────────────────────────────────────────────
export function paintCarpet(ctx, x, y, s, tx, ty, kind = 'red') {
    const a = kind === 'green' ? TH.CARPET_GRN : TH.CARPET_RED;
    const b = kind === 'green' ? TH.CARPET_GRN2 : TH.CARPET_RED2;
    ctx.fillStyle = a;
    ctx.fillRect(x, y, s, s);
    // лёгкий узор
    if (((tx + ty) & 1) === 0) {
        ctx.fillStyle = rgba(0, 0, 0, 0.10);
        ctx.fillRect(x, y, s, s);
    }
    ctx.fillStyle = b;
    ctx.fillRect(x + 6, y + 6, 3, 3);
}

// ─────────────────────────────────────────────────────────────
//  ОБОИ — каждая функция заливает тайл s×s (тайлится без швов)
// ─────────────────────────────────────────────────────────────
export const WALLPAPER = {
    lilac(ctx, x, y, s) {
        ctx.fillStyle = hex(P.DARK_PURPLE);
        ctx.fillRect(x, y, s, s);
        ctx.fillStyle = hex(P.DARK_PURPLE2);
        for (let i = 0; i < s; i += 4) ctx.fillRect(x + i, y, 2, s);
        ctx.fillStyle = rgba(P.CREAM, 0.06);
        for (let i = 2; i < s; i += 4) ctx.fillRect(x + i, y, 1, s);
    },
    damask(ctx, x, y, s) {
        ctx.fillStyle = hex(P.DARK_PURPLE);
        ctx.fillRect(x, y, s, s);
        ctx.fillStyle = hex(P.PURPLE_GRAY);
        for (let dy = 0; dy < s; dy += 8) {
            for (let dx = 0; dx < s; dx += 8) {
                ctx.fillRect(x + ((dx + 4) % s), y + dy, 2, 2);
                ctx.fillRect(x + dx, y + ((dy + 4) % s), 2, 2);
            }
        }
        ctx.fillStyle = rgba(P.CREAM, 0.05);
        ctx.fillRect(x, y, s, 1);
    },
    green(ctx, x, y, s) {
        ctx.fillStyle = hex(P.OLIVE);
        ctx.fillRect(x, y, s, s);
        ctx.fillStyle = hex(P.OLIVE_GREEN);
        for (let i = 0; i < s; i += 4) ctx.fillRect(x + i, y, 2, s);
        ctx.fillStyle = rgba(P.CREAM, 0.07);
        for (let i = 3; i < s; i += 8) ctx.fillRect(x, y + i, s, 1);
    },
    cream(ctx, x, y, s) {
        ctx.fillStyle = hex(P.TAN);
        ctx.fillRect(x, y, s, s);
        ctx.fillStyle = hex(P.BROWN);
        ctx.fillRect(x, y, s, 1);
        ctx.fillRect(x, y, 1, s);
        ctx.fillStyle = rgba(P.CREAM, 0.5);
        ctx.fillRect(x + 1, y + 1, s - 2, 2);
        ctx.fillStyle = rgba(P.VERY_DARK, 0.15);
        ctx.fillRect(x + s - 2, y, 2, s);
    },
    wood(ctx, x, y, s) {
        ctx.fillStyle = hex(P.DARK_BROWN);
        ctx.fillRect(x, y, s, s);
        ctx.fillStyle = hex(P.BROWN);
        for (let i = 0; i < s; i += 5) ctx.fillRect(x + i, y, 3, s);
        ctx.fillStyle = rgba(P.ALMOST_BLACK, 0.35);
        for (let i = 4; i < s; i += 5) ctx.fillRect(x + i, y, 1, s);
    },
    tile(ctx, x, y, s) {
        ctx.fillStyle = hex(P.DARK_TEAL);
        ctx.fillRect(x, y, s, s);
        ctx.fillStyle = rgba(P.ALMOST_BLACK, 0.35);
        ctx.fillRect(x, y, s, 1);
        ctx.fillRect(x, y, 1, s);
        ctx.fillStyle = rgba(P.TEAL, 0.35);
        ctx.fillRect(x + 1, y + 1, s - 3, 1);
    },
    tile_light(ctx, x, y, s) {
        ctx.fillStyle = hex(P.TAN);
        ctx.fillRect(x, y, s, s);
        ctx.fillStyle = rgba(P.VERY_DARK, 0.3);
        ctx.fillRect(x, y, s, 1);
        ctx.fillRect(x, y, 1, s);
        ctx.fillStyle = rgba(P.CREAM, 0.4);
        ctx.fillRect(x + 1, y + 1, s - 3, 1);
    },
    brick(ctx, x, y, s) {
        ctx.fillStyle = hex(P.DARK_RED);
        ctx.fillRect(x, y, s, s);
        ctx.fillStyle = rgba(P.ALMOST_BLACK, 0.4);
        for (let r = 0; r < s; r += 4) {
            ctx.fillRect(x, y + r, s, 1);
            const shift = ((r / 4) & 1) * 4;
            ctx.fillRect(x + shift, y + r, 1, 4);
            ctx.fillRect(x + (shift + 8) % s, y + r, 1, 4);
        }
        ctx.fillStyle = rgba(P.RED, 0.18);
        ctx.fillRect(x + 2, y + 1, 3, 1);
    },
};

// ─────────────────────────────────────────────────────────────
//  ГРАНЬ СТЕНЫ: трим сверху → обои → плинтус
// ─────────────────────────────────────────────────────────────
export function paintWallFace(ctx, x, y, s, styleKey) {
    const wp = WALLPAPER[styleKey] || WALLPAPER.lilac;
    ctx.fillStyle = TH.TRIM_DARK;
    ctx.fillRect(x, y, s, 2);
    ctx.fillStyle = TH.TRIM;
    ctx.fillRect(x, y + 2, s, 1);
    wp(ctx, x, y + 3, s, s - 6);
    ctx.fillStyle = TH.BASEBOARD_HI;
    ctx.fillRect(x, y + s - 4, s, 1);
    ctx.fillStyle = TH.BASEBOARD;
    ctx.fillRect(x, y + s - 3, s, 3);
}

// ─────────────────────────────────────────────────────────────
//  НАСТЕННЫЙ ДЕКОР (поверх обоев, в пределах тайла)
// ─────────────────────────────────────────────────────────────
export const WALL_DECOR = {
    poster(ctx, x, y, s, seed) {
        const cols = [P.RED, P.DARK_RED, P.TEAL, P.GOLD, P.OLIVE_GREEN];
        ctx.fillStyle = TH.FRAME;
        ctx.fillRect(x + 4, y + 4, s - 8, s - 9);
        ctx.fillStyle = hex(cols[seed % cols.length]);
        ctx.fillRect(x + 5, y + 5, s - 10, s - 11);
        ctx.fillStyle = rgba(P.ALMOST_BLACK, 0.4);
        ctx.fillRect(x + 5, y + s - 8, s - 10, 2);
    },
    painting(ctx, x, y, s) {
        ctx.fillStyle = hex(P.GOLD);
        ctx.fillRect(x + 3, y + 3, s - 6, s - 7);
        ctx.fillStyle = hex(P.DARK_TEAL);
        ctx.fillRect(x + 4, y + 4, s - 8, s - 9);
        ctx.fillStyle = hex(P.TEAL);
        ctx.fillRect(x + 5, y + 5, s - 10, 3);
    },
    candle(ctx, x, y, s) {
        const cx = x + s / 2;
        ctx.fillStyle = TH.TRIM;
        ctx.fillRect(cx - 3, y + s - 6, 6, 2);
        ctx.fillStyle = hex(P.CREAM);
        ctx.fillRect(cx - 1, y + 3, 2, s - 8);
        ctx.fillStyle = hex(P.GOLD);
        ctx.fillRect(cx - 1, y + 2, 2, 1);
        ctx.fillStyle = rgba(P.YELLOW, 0.9);
        ctx.fillRect(cx - 1, y + 1, 2, 1);
    },
    clock(ctx, x, y, s) {
        const cx = x + s / 2, cy = y + s / 2;
        ctx.fillStyle = hex(P.DARK_BROWN);
        ctx.beginPath(); ctx.arc(cx, cy, 5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = hex(P.CREAM);
        ctx.beginPath(); ctx.arc(cx, cy, 3.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = hex(P.ALMOST_BLACK);
        ctx.fillRect(cx, cy - 3, 1, 3);
        ctx.fillRect(cx, cy, 2, 1);
    },
    mirror(ctx, x, y, s) {
        ctx.fillStyle = hex(P.GOLD);
        ctx.fillRect(x + 4, y + 2, s - 8, s - 5);
        ctx.fillStyle = TH.GLASS;
        ctx.fillRect(x + 5, y + 3, s - 10, s - 7);
        ctx.fillStyle = TH.GLASS_HI;
        ctx.fillRect(x + 6, y + 4, 2, s - 9);
    },
};

// ─────────────────────────────────────────────────────────────
//  ОКНО
// ─────────────────────────────────────────────────────────────
export function paintWindow(ctx, x, y, s) {
    paintWallFace(ctx, x, y, s, 'lilac');
    const i = 3;
    ctx.fillStyle = TH.FRAME;
    ctx.fillRect(x + i - 1, y + i - 1, s - i * 2 + 2, s - i * 2 + 2);
    ctx.fillStyle = TH.GLASS;
    ctx.fillRect(x + i, y + i, s - i * 2, s - i * 2);
    ctx.fillStyle = TH.GLASS_HI;
    ctx.fillRect(x + i + 1, y + i + 1, s - i * 2 - 2, 2);
    ctx.fillStyle = TH.FRAME;
    ctx.fillRect(x + (s >> 1), y + i, 1, s - i * 2);
    ctx.fillRect(x + i, y + (s >> 1), s - i * 2, 1);

    const g = ctx.createRadialGradient(x + s / 2, y + s / 2, 0, x + s / 2, y + s / 2, s * 0.95);
    g.addColorStop(0, TH.GLOW);
    g.addColorStop(1, rgba(P.CREAM, 0));
    ctx.fillStyle = g;
    ctx.fillRect(x - s / 2, y - s / 2, s * 2, s * 2);
}
