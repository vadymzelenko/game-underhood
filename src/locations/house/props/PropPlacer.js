// PropPlacer.js — расстановка мебели по комнатам согласно их назначению.
//
// Принимает комнату из плана этажа ({ type, x, y, w, h, door, doorTile })
// и возвращает список плейсментов { key, tx, ty } (tx/ty — верхний левый
// тайл футпринта). Не залезает на стены, дверь и на другие пропы.

import { propSize, hasProp } from './PropFactory.js';

const ROOM_PROPS = {
    bedroom:  ['bed', 'bed', 'bed', 'nightstand', 'nightstand', 'toybox',
               'ball', 'chair', 'rug'],
    wardrobe: ['wardrobe', 'wardrobe', 'wardrobe', 'clothes_rack',
               'shelf', 'shelf', 'crate'],
    reception:['reception_desk', 'key_cabinet', 'chair', 'plant', 'rug'],
    storage:  ['crate', 'crate', 'barrel', 'barrel', 'shelf', 'coal_pile'],
    boiler:   ['boiler', 'boiler', 'pipe', 'pipe', 'coal_pile', 'coal_pile',
               'barrel', 'tool_rack'],
    library:  ['bookshelf', 'bookshelf', 'bookshelf', 'bookshelf', 'bookshelf',
               'bookshelf', 'bookshelf', 'bookshelf', 'bookshelf', 'bookshelf',
               'armchair', 'armchair', 'book_table', 'globe', 'plant'],
    dining:   ['dining_table', 'chair', 'chair', 'chair', 'chair', 'bench', 'plant'],
    kitchen:  ['stove', 'counter', 'counter', 'sink', 'cabinet',
               'hanging_pots', 'crate'],
    stairs:   [],
};

function hash(x, y, s) {
    let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(s | 0, 1274126177);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

function inRoom(x, y, w, h, room) {
    return x >= room.x + 1 && y >= room.y + 1 &&
           x + w <= room.x + room.w - 1 && y + h <= room.y + room.h - 1;
}

function keyOf(x, y) { return `${x},${y}`; }

/** Расставить пропы в одной комнате. `map` — сетка тайлов этажа. */
export function placeRoom(room, map) {
    const keys = ROOM_PROPS[room.type] || [];
    const out = [];
    if (!keys.length) return out;

    const used = new Set();
    const clear = new Set();

    // Вход — не заставлять: сама дверь + тайл сразу за ней.
    if (room.doorTile) {
        const { tx, ty } = room.doorTile;
        clear.add(keyOf(tx, ty));
        if (room.door === 'left')   clear.add(keyOf(tx + 1, ty));
        if (room.door === 'right')  clear.add(keyOf(tx - 1, ty));
        if (room.door === 'top')    clear.add(keyOf(tx, ty + 1));
        if (room.door === 'bottom') clear.add(keyOf(tx, ty - 1));
    }

    // Ячейки: сначала пристенные (perimeter), затем внутренние —
    // так мебель «липнет» к стенам, как в 3/4-референсе.
    const okCell = (x, y) => !map || map[y]?.[x] === '.';
    const perimeter = [], inner = [];
    for (let y = room.y + 1; y < room.y + room.h - 1; y++)
        for (let x = room.x + 1; x < room.x + room.w - 1; x++) {
            if (!okCell(x, y)) continue;      // не залезаем на лестницу/окно/стену
            const nearWall = (x === room.x + 1 || x === room.x + room.w - 2 ||
                              y === room.y + 1 || y === room.y + room.h - 2);
            (nearWall ? perimeter : inner).push({ x, y });
        }
    const cells = perimeter.concat(inner);

    let cursor = Math.floor(hash(room.x, room.y, 7) * cells.length);
    for (const key of keys) {
        if (!hasProp(key)) continue;
        const s = propSize(key);
        for (let k = 0; k < cells.length; k++) {
            const c = cells[(cursor + k) % cells.length];
            if (!inRoom(c.x, c.y, s.w, s.h, room)) continue;
            if (!footprintFree(c.x, c.y, s.w, s.h, used, clear, okCell)) continue;
            out.push({ key, tx: c.x, ty: c.y });
            for (let yy = c.y; yy < c.y + s.h; yy++)
                for (let xx = c.x; xx < c.x + s.w; xx++)
                    used.add(keyOf(xx, yy));
            cursor = (cursor + k + 1) % cells.length;
            break;
        }
    }
    return out;
}

function footprintFree(x, y, w, h, used, clear, okCell) {
    for (let yy = y; yy < y + h; yy++)
        for (let xx = x; xx < x + w; xx++) {
            if (okCell && !okCell(xx, yy)) return false;
            const k = keyOf(xx, yy);
            if (used.has(k) || clear.has(k)) return false;
        }
    return true;
}

/** Ковровая дорожка вдоль длинного коридора. */
export function placeCorridor(corridor) {
    const out = [];
    if (!corridor) return out;
    const cx = corridor.x + Math.floor(corridor.w / 2);
    for (let y = corridor.y + 1; y < corridor.y + corridor.h - 2; y += 6) {
        out.push({ key: 'rug_runner', tx: cx - 1, ty: y });
    }
    return out;
}
