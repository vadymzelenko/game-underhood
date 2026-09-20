// PropFactory.js — процедурные плейсхолдеры мебели и деталей интерьера.
// Всё рисуется попиксельно ИЗ СУЩЕСТВУЮЩЕЙ палитры (Constants.PALETTE),
// чтобы дом сразу не выглядел пустым, а стиль совпадал с остальной игрой.

import { PALETTE as P } from '../../../utils/Constants.js';

const hex = (n) => '#' + n.toString(16).padStart(6, '0');

const C = {
    WOOD:       hex(P.BROWN),
    WOOD_DARK:  hex(P.DARK_BROWN),
    WOOD_DEEP:  hex(P.VERY_DARK),
    WOOD_LIGHT: hex(P.TAN),
    METAL:      hex(P.GRAY),
    METAL_DARK: hex(P.PURPLE_GRAY),
    FABRIC:     hex(P.CREAM),
    FABRIC_DIM: hex(P.TAN),
    FABRIC_RED: hex(P.DARK_RED),
    RED:        hex(P.RED),
    GOLD:       hex(P.GOLD),
    YELLOW:     hex(P.YELLOW),
    WALL:       hex(P.DARK_PURPLE),
    WALL_HI:    hex(P.PURPLE_GRAY),
    WALL_DEEP:  hex(P.DARK_PURPLE2),
    BLACK:      hex(P.ALMOST_BLACK),
    PLANT:      hex(P.GREEN),
    PLANT_LIGHT:hex(P.LIGHT_GREEN),
    PLANT_DARK: hex(P.OLIVE_GREEN),
    TEAL:       hex(P.TEAL),
    DARK_TEAL:  hex(P.DARK_TEAL),
    CREAM:      hex(P.CREAM),
    PINK:       hex(P.PINK),
};

const T = 16;

function makeCanvas(w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const x = c.getContext('2d');
    x.imageSmoothingEnabled = false;
    return [c, x];
}

function rect(ctx, x, y, w, h, col) {
    ctx.fillStyle = col;
    ctx.fillRect(Math.round(x), Math.round(y), Math.max(1, w | 0), Math.max(1, h | 0));
}
function px(ctx, x, y, col) { rect(ctx, x, y, 1, 1, col); }

// Псевдо-3D коробка: базовый тон + светлая верхняя грань + тёмные боковые.
function box(ctx, x, y, w, h, base, hi, lo) {
    rect(ctx, x, y, w, h, base);
    rect(ctx, x, y, w, 1, hi);
    rect(ctx, x, y + h - 1, w, 1, lo);
    rect(ctx, x + w - 1, y, 1, h, lo);
}
function line(ctx, x0, y0, x1, y1, col) {
    let x = Math.round(x0), y = Math.round(y0);
    const ex = Math.round(x1), ey = Math.round(y1);
    const dx = Math.abs(ex - x), dy = Math.abs(ey - y);
    const sx = x < ex ? 1 : -1, sy = y < ey ? 1 : -1;
    let err = dx - dy;
    ctx.fillStyle = col;
    for (;;) {
        ctx.fillRect(x, y, 1, 1);
        if (x === ex && y === ey) break;
        const e2 = 2 * err;
        if (e2 > -dy) { err -= dy; x += sx; }
        if (e2 < dx)  { err += dx; y += sy; }
    }
}

// ─────────────────────────────────────────────────────────────
//  ОТРИСОВЩИКИ ПРОПОВ. Каждый рисует в тайловой сетке (w×h тайлов).
// ─────────────────────────────────────────────────────────────
const DRAW = {
    // ── Спальня ──────────────────────────────────────────────
    bed(ctx, t, w, h) {
        const W = w * t, H = h * t;
        box(ctx, 3, H - 8, W - 6, 6, C.WOOD, C.WOOD_LIGHT, C.WOOD_DARK);
        box(ctx, 3, 3, W - 6, 4, C.WOOD_DARK, C.WOOD_LIGHT, C.WOOD_DEEP);
        rect(ctx, 5, 9, W - 10, H - 16, C.FABRIC_DIM);
        rect(ctx, 7, 9, 8, 6, C.FABRIC);
        rect(ctx, 6, 15, W - 12, H - 20, C.FABRIC_RED);
        rect(ctx, 6, 15, W - 12, 2, C.RED);
    },
    nightstand(ctx, t, w, h) {
        const s = t;
        box(ctx, 2, 6, s - 4, s - 8, C.WOOD_DARK, C.WOOD_LIGHT, C.WOOD_DEEP);
        rect(ctx, 5, 9, s - 10, 2, C.GOLD);
    },
    lamp(ctx, t, w, h) {
        const s = t, cx = s / 2;
        rect(ctx, cx - 1, s - 4, 2, 3, C.WOOD_DARK);
        line(ctx, cx, s - 4, cx, 4, C.WOOD_DARK);
        rect(ctx, cx - 4, 2, 8, 4, C.YELLOW);
        rect(ctx, cx - 4, 2, 8, 1, C.FABRIC);
        rect(ctx, cx - 3, 6, 6, 1, C.WOOD_DARK);
    },
    rug(ctx, t, w, h) {
        const W = w * t, H = h * t;
        rect(ctx, 1, 1, W - 2, H - 2, C.FABRIC_RED);
        rect(ctx, 3, 3, W - 6, H - 6, C.FABRIC_DIM);
        rect(ctx, 4, 4, W - 8, H - 8, C.GOLD);
        rect(ctx, 5, 5, W - 10, H - 10, C.FABRIC_RED);
    },
    toybox(ctx, t, w, h) {
        const s = t;
        box(ctx, 3, 8, s - 6, s - 10, C.WOOD, C.WOOD_LIGHT, C.WOOD_DARK);
        rect(ctx, 5, 6, s - 10, 3, C.WOOD_DARK);
        rect(ctx, 7, 7, 2, 1, C.GOLD);
    },
    // ── Гардеробная ──────────────────────────────────────────
    wardrobe(ctx, t, w, h) {
        const W = w * t, H = h * t;
        box(ctx, 3, 2, W - 6, H - 4, C.WOOD_DARK, C.WOOD_LIGHT, C.WOOD_DEEP);
        rect(ctx, W / 2 - 1, 4, 1, H - 8, C.WOOD_DEEP);
        rect(ctx, 7, 6, 2, 2, C.GOLD);
        rect(ctx, W - 9, 6, 2, 2, C.GOLD);
    },
    shelf(ctx, t, w, h) {
        const W = w * t;
        box(ctx, 2, 4, W - 4, 2, C.WOOD, C.WOOD_LIGHT, C.WOOD_DARK);
        box(ctx, 2, 9, W - 4, 2, C.WOOD, C.WOOD_LIGHT, C.WOOD_DARK);
        rect(ctx, 5, 2, 3, 2, C.FABRIC);
        rect(ctx, W / 2, 2, 3, 2, C.PINK);
        rect(ctx, W - 8, 7, 4, 2, C.TEAL);
    },
    clothes_rack(ctx, t, w, h) {
        const W = w * t, H = h * t;
        rect(ctx, 3, H - 5, 1, 5, C.WOOD_DARK);
        rect(ctx, W - 4, H - 5, 1, 5, C.WOOD_DARK);
        rect(ctx, 3, 6, W - 6, 1, C.WOOD_DARK);
        rect(ctx, 6, 7, 4, 5, C.PINK);
        rect(ctx, W / 2, 7, 4, 5, C.TEAL);
        rect(ctx, W - 10, 7, 4, 5, C.FABRIC_DIM);
    },

    // ── Ресепшн ──────────────────────────────────────────────
    reception_desk(ctx, t, w, h) {
        const W = w * t, H = h * t;
        box(ctx, 2, 3, W - 4, H - 5, C.WOOD, C.WOOD_LIGHT, C.WOOD_DARK);
        rect(ctx, 5, 1, W - 10, 3, C.WOOD_LIGHT);
        rect(ctx, 8, H - 2, 4, 1, C.CREAM);
    },
    chair(ctx, t, w, h) {
        const s = t;
        rect(ctx, 4, 3, s - 8, s - 9, C.WOOD_DARK);
        rect(ctx, 3, 8, s - 6, 4, C.WOOD);
        rect(ctx, 4, s - 5, 2, 4, C.WOOD_DARK);
        rect(ctx, s - 6, s - 5, 2, 4, C.WOOD_DARK);
    },
    board(ctx, t, w, h) {
        const s = t;
        rect(ctx, 3, 2, s - 6, s - 4, C.WOOD);
        rect(ctx, 5, 4, s - 10, s - 8, C.WALL_DEEP);
        px(ctx, 7, 6, C.CREAM); px(ctx, 8, 6, C.CREAM);
        px(ctx, 6, 9, C.PINK);
    },
    // ── Кладовая / котельная ─────────────────────────────────
    crate(ctx, t, w, h) {
        const s = t;
        box(ctx, 3, 5, s - 6, s - 7, C.WOOD, C.WOOD_LIGHT, C.WOOD_DARK);
        line(ctx, 3, 5, s - 3, s - 3, C.WOOD_DARK);
        line(ctx, 3, s - 3, s - 3, 5, C.WOOD_DARK);
    },
    barrel(ctx, t, w, h) {
        const s = t;
        rect(ctx, 4, 3, s - 8, s - 5, C.WOOD);
        rect(ctx, 4, 3, s - 8, 1, C.WOOD_LIGHT);
        rect(ctx, 4, 4, s - 8, 1, C.METAL_DARK);
        rect(ctx, 4, s - 4, s - 8, 1, C.METAL_DARK);
        rect(ctx, 4, s - 3, s - 8, 1, C.WOOD_DARK);
    },
    boiler(ctx, t, w, h) {
        const W = w * t, H = h * t;
        rect(ctx, 4, 6, W - 8, H - 8, C.METAL);
        rect(ctx, 4, 6, W - 8, 2, C.METAL_DARK);
        rect(ctx, 4, H - 5, W - 8, 2, C.WOOD_DARK);
        rect(ctx, W / 2 - 1, 3, 2, 4, C.METAL_DARK);
        rect(ctx, 8, 10, 3, 3, C.RED);
        rect(ctx, W - 12, 9, 3, 5, C.DARK_TEAL);
        rect(ctx, W - 11, 12, 2, 2, C.YELLOW);
    },
    coal_pile(ctx, t, w, h) {
        const s = t;
        rect(ctx, 3, 8, s - 6, 6, C.WOOD_DEEP);
        rect(ctx, 4, 7, s - 8, 3, C.WOOD_DEEP);
        px(ctx, 6, 9, C.METAL); px(ctx, 9, 10, C.METAL_DARK); px(ctx, 7, 11, C.METAL);
    },
    pipe(ctx, t, w, h) {
        const W = w * t;
        rect(ctx, 1, 6, W - 2, 4, C.METAL);
        rect(ctx, 1, 6, W - 2, 1, C.METAL_DARK);
        rect(ctx, 1, 9, W - 2, 1, C.WOOD_DEEP);
    },

    // ── Столовая ─────────────────────────────────────────────
    dining_table(ctx, t, w, h) {
        const W = w * t;
        box(ctx, 2, 5, W - 4, 4, C.WOOD, C.WOOD_LIGHT, C.WOOD_DARK);
        rect(ctx, 5, 3, W - 10, 2, C.WOOD_LIGHT);
        rect(ctx, 6, 9, 3, 3, C.FABRIC);
        rect(ctx, W - 9, 9, 3, 3, C.FABRIC);
    },
    bench(ctx, t, w, h) {
        const W = w * t;
        box(ctx, 2, 5, W - 4, 4, C.WOOD, C.WOOD_LIGHT, C.WOOD_DARK);
        rect(ctx, 4, 9, 2, 3, C.WOOD_DARK);
        rect(ctx, W - 6, 9, 2, 3, C.WOOD_DARK);
    },
    // ── Кухня ────────────────────────────────────────────────
    stove(ctx, t, w, h) {
        const W = w * t, H = h * t;
        box(ctx, 2, 3, W - 4, H - 5, C.METAL_DARK, C.METAL, C.WOOD_DEEP);
        rect(ctx, 5, 5, 3, 3, C.WOOD_DEEP);
        rect(ctx, W / 2, 5, 3, 3, C.WOOD_DEEP);
        rect(ctx, W - 10, H - 4, 5, 2, C.YELLOW);
    },
    counter(ctx, t, w, h) {
        const W = w * t, H = h * t;
        box(ctx, 2, 3, W - 4, H - 5, C.WOOD, C.WOOD_LIGHT, C.WOOD_DARK);
        rect(ctx, 4, 5, W - 8, 2, C.WOOD_LIGHT);
        rect(ctx, 6, 7, 4, 2, C.FABRIC_DIM);
        rect(ctx, W - 12, 7, 4, 2, C.FABRIC_DIM);
    },
    sink(ctx, t, w, h) {
        const s = t;
        box(ctx, 2, 4, s - 4, s - 6, C.METAL, C.METAL_DARK, C.WOOD_DEEP);
        rect(ctx, 5, 6, s - 10, s - 12, C.TEAL);
        line(ctx, 6, 8, s - 6, 8, C.METAL);
    },
    cabinet(ctx, t, w, h) {
        const s = t;
        box(ctx, 2, 3, s - 4, s - 5, C.WOOD_DARK, C.WOOD_LIGHT, C.WOOD_DEEP);
        rect(ctx, s / 2 - 1, 5, 1, s - 9, C.WOOD_DEEP);
        rect(ctx, 6, 6, 2, 2, C.GOLD);
    },

    // ── Библиотека ───────────────────────────────────────────
    bookshelf(ctx, t, w, h) {
        const W = w * t, H = h * t;
        box(ctx, 2, 2, W - 4, H - 4, C.WOOD_DARK, C.WOOD_LIGHT, C.WOOD_DEEP);
        const rowH = Math.floor((H - 6) / 3);
        for (let r = 0; r < 3; r++) {
            const by = 4 + r * rowH;
            for (let bx = 4; bx < W - 5; bx += 2) {
                const col = [C.FABRIC_RED, C.TEAL, C.GOLD, C.PINK, C.PLANT][(bx * 7 + r * 13) % 5];
                rect(ctx, bx, by, 2, rowH - 1, col);
            }
        }
    },
    book_table(ctx, t, w, h) {
        const s = t;
        box(ctx, 3, 6, s - 6, 4, C.WOOD, C.WOOD_LIGHT, C.WOOD_DARK);
        rect(ctx, 5, 4, 4, 2, C.FABRIC_RED);
        rect(ctx, 10, 4, 3, 2, C.TEAL);
    },
    plant(ctx, t, w, h) {
        const s = t;
        rect(ctx, 5, 10, 6, 5, C.WOOD_DARK);
        rect(ctx, 5, 10, 6, 1, C.WOOD_LIGHT);
        rect(ctx, 6, 5, 4, 5, C.PLANT);
        rect(ctx, 5, 3, 6, 3, C.PLANT);
        rect(ctx, 6, 2, 2, 2, C.PLANT_LIGHT);
        rect(ctx, 9, 6, 2, 2, C.PLANT_DARK);
    },

    // ── Детали интерьера ─────────────────────────────────────
    ball(ctx, t, w, h) {
        const s = t, cx = s / 2, cy = s / 2 + 2;
        rect(ctx, cx - 3, cy - 3, 6, 6, C.RED);
        rect(ctx, cx - 3, cy - 3, 6, 2, hex(P.DARK_RED));
        px(ctx, cx - 1, cy - 1, C.CREAM);
        rect(ctx, cx - 5, cy + 4, 10, 1, 'rgba(0,0,0,0.25)');
    },
    key_cabinet(ctx, t, w, h) {
        const s = t;
        box(ctx, 2, 3, s - 4, s - 5, C.WOOD_DARK, C.WOOD_LIGHT, C.WOOD_DEEP);
        rect(ctx, 4, 5, s - 8, 6, C.WOOD);
        for (let i = 0; i < 4; i++) {
            rect(ctx, 4 + i * 2, 5, 1, 5, C.WOOD_DEEP);
            px(ctx, 4 + i * 2, 10, C.GOLD);
        }
        rect(ctx, 4, s - 5, s - 8, 1, C.GOLD);
    },
    armchair(ctx, t, w, h) {
        const s = t;
        box(ctx, 3, 3, s - 6, 5, C.FABRIC_RED, C.RED, hex(P.DARK_RED));
        box(ctx, 4, 8, s - 8, 5, C.FABRIC_RED, C.RED, hex(P.DARK_RED));
        rect(ctx, 3, 3, 2, 10, hex(P.DARK_RED));
        rect(ctx, s - 5, 3, 2, 10, hex(P.DARK_RED));
    },
    globe(ctx, t, w, h) {
        const s = t, cx = s / 2;
        rect(ctx, cx - 2, s - 5, 4, 2, C.WOOD_DARK);
        rect(ctx, cx - 1, s - 8, 2, 3, C.WOOD);
        rect(ctx, cx - 5, 2, 10, 9, C.TEAL);
        rect(ctx, cx - 5, 2, 10, 1, C.DARK_TEAL);
        rect(ctx, cx - 4, 4, 4, 2, C.PLANT_DARK);
        rect(ctx, cx + 1, 6, 3, 2, C.PLANT_DARK);
    },
    hanging_pots(ctx, t, w, h) {
        const W = w * t;
        rect(ctx, 2, 1, W - 4, 1, C.METAL_DARK);
        for (let i = 0; i < w; i++) {
            const cx = i * t + t / 2;
            line(ctx, cx, 2, cx, 5, C.METAL_DARK);
            rect(ctx, cx - 3, 5, 6, 4, C.METAL);
            rect(ctx, cx - 3, 5, 6, 1, C.METAL_DARK);
        }
    },
    tool_rack(ctx, t, w, h) {
        const s = t;
        rect(ctx, 2, 2, s - 4, 2, C.WOOD_DARK);
        line(ctx, 5, 4, 5, 11, C.METAL_DARK);
        rect(ctx, 4, 11, 3, 3, C.METAL);
        line(ctx, 10, 4, 10, 10, C.WOOD);
        rect(ctx, 9, 10, 3, 4, C.WOOD_LIGHT);
    },

    // ── Коридор ──────────────────────────────────────────────
    rug_runner(ctx, t, w, h) {
        const W = w * t, H = h * t;
        rect(ctx, 2, 1, W - 4, H - 2, C.FABRIC_RED);
        rect(ctx, 3, 2, W - 6, H - 4, C.GOLD);
        rect(ctx, 4, 3, W - 8, H - 6, C.FABRIC_RED);
    },
    wall_lamp(ctx, t, w, h) {
        const s = t;
        rect(ctx, 3, 5, 2, 6, C.METAL_DARK);
        rect(ctx, 6, 4, 6, 4, C.YELLOW);
        rect(ctx, 6, 4, 6, 1, C.FABRIC);
    },
};

const SIZES = {
    bed: { w: 2, h: 2 }, nightstand: { w: 1, h: 1 }, lamp: { w: 1, h: 1 },
    rug: { w: 2, h: 2 }, toybox: { w: 1, h: 1 }, wardrobe: { w: 2, h: 2 },
    shelf: { w: 2, h: 1 }, clothes_rack: { w: 2, h: 2 }, reception_desk: { w: 2, h: 1 },
    chair: { w: 1, h: 1 }, board: { w: 1, h: 1 }, crate: { w: 1, h: 1 },
    barrel: { w: 1, h: 1 }, boiler: { w: 2, h: 2 }, coal_pile: { w: 1, h: 1 },
    pipe: { w: 2, h: 1 }, dining_table: { w: 3, h: 1 }, bench: { w: 2, h: 1 },
    stove: { w: 2, h: 1 }, counter: { w: 2, h: 1 }, sink: { w: 1, h: 1 },
    cabinet: { w: 1, h: 1 }, bookshelf: { w: 2, h: 2 }, book_table: { w: 1, h: 1 },
    plant: { w: 1, h: 1 }, rug_runner: { w: 3, h: 1 }, wall_lamp: { w: 1, h: 1 },
    ball: { w: 1, h: 1 }, key_cabinet: { w: 1, h: 1 }, armchair: { w: 1, h: 1 },
    globe: { w: 1, h: 1 }, hanging_pots: { w: 2, h: 1 }, tool_rack: { w: 1, h: 1 },
};

/** Размер пропа в тайлах (для позиционирования спрайта). */
export function propSize(key) { return SIZES[key] || { w: 1, h: 1 }; }

export function hasProp(key) { return !!DRAW[key]; }

// ── Двери ────────────────────────────────────────────────────
// 'v' — вертикальная створка (проём влево/вправо),
// 'h' — горизонтальная створка (проём вверх/вниз).
export function makeDoorCanvas(orientation) {
    const v = orientation === 'v';
    const W = v ? T : Math.round(T * 1.6);
    const H = v ? Math.round(T * 1.6) : T;
    const [cv, ctx] = makeCanvas(W, H);

    rect(ctx, 1, 1, W - 2, H - 2, C.WOOD_DEEP);
    rect(ctx, 3, 2, W - 6, H - 4, C.WOOD);
    rect(ctx, 3, 2, W - 6, 1, C.WOOD_LIGHT);
    rect(ctx, 5, 4, W - 10, Math.floor((H - 6) / 2), C.WOOD_DARK);
    rect(ctx, 5, 4 + Math.floor((H - 6) / 2) + 2, W - 10, Math.floor((H - 6) / 2), C.WOOD_DARK);
    rect(ctx, W - 6, Math.floor(H / 2), 2, 2, C.GOLD);
    return cv;
}

// ── Регистрация текстур в сцене ─────────────────────────────
export function registerPropTextures(scene) {
    for (const key of Object.keys(DRAW)) {
        const s = SIZES[key] || { w: 1, h: 1 };
        const [cv, ctx] = makeCanvas(s.w * T, s.h * T);
        DRAW[key](ctx, T, s.w, s.h);
        const tk = `prop_${key}`;
        if (scene.textures.exists(tk)) scene.textures.remove(tk);
        scene.textures.addCanvas(tk, cv);
    }
    for (const o of ['v', 'h']) {
        const tk = `door_${o}`;
        if (scene.textures.exists(tk)) scene.textures.remove(tk);
        scene.textures.addCanvas(tk, makeDoorCanvas(o));
    }
}



