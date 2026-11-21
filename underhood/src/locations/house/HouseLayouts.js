import { buildRoom } from './HouseBuilder.js';

// ─────────────────────────────────────────────────────────────
//  Символы карты (используются только внутри HouseBuilder):
//    '#'  стена        (блок движения и обзора)
//    '='  тонкая стена (блок движения и обзора)
//    'W'  окно         (блок движения, НЕ блок обзора)
//    '+'  дверь внутри (проходимо, не блок обзора)
//    'D'  выход наружу (проходимо)
//    'S'  ступени      (проходимо)
//    '.'  пол
//    ' '  пустота (вне комнаты)
//
//  Блокировка обзора / движения — в функциях ниже.
// ─────────────────────────────────────────────────────────────

export const HOUSE_LAYOUTS = {
    // ── Детский дом, 1-й этаж ────────────────────────────────
    //
    //  50×44 тайла. Вертикальный центральный коридор (x=24..26) с
    //  ковровой дорожкой и свечами-бра делит этаж на крылья.
    //  Комнаты тесные, плотно набиты мебелью; обои и ковры — по типу.
    orphanage_floor1: buildRoom({
        id: 'orphanage_floor1',
        title: 'ДЕТСКИЙ ДОМ · 1 ЭТАЖ',
        tilePx: 16,
        w: 49, h: 44,

        frame: {
            thickness: 1,
            windows: {
                top:   [4, 9, 30, 35, 44],
                left:  [6, 16, 26, 36],
                right: [6, 16, 26, 36],
            },
        },

        // окна на задних стенах спален/библиотеки
        windows: [
            { x: 6, y: 2 }, { x: 8, y: 2 },
            { x: 17, y: 2 }, { x: 19, y: 2 },
            { x: 33, y: 12 }, { x: 35, y: 12 }, { x: 43, y: 12 },
        ],

        rooms: [
            // ── ЛЕВОЕ КРЫЛО: 4 детские (верхние ряды) ───────
            { type: 'bedroom', x: 2,  y: 2,  w: 10, h: 8, door: 'right',
              style: 'green', carpet: 'green', decor: 'poster' },
            { type: 'bedroom', x: 2,  y: 12, w: 10, h: 8, door: 'right',
              style: 'green', carpet: 'green', decor: 'painting' },
            { type: 'bedroom', x: 13, y: 2,  w: 10, h: 8, door: 'right',
              style: 'green', carpet: 'green', decor: 'poster' },
            { type: 'bedroom', x: 13, y: 12, w: 10, h: 8, door: 'right',
              style: 'green', carpet: 'green', decor: 'poster' },

            // ── ЛЕВОЕ КРЫЛО: 4 гардеробные (нижние ряды) ────
            { type: 'wardrobe', x: 2,  y: 22, w: 10, h: 8, door: 'right', style: 'cream' },
            { type: 'wardrobe', x: 2,  y: 32, w: 10, h: 8, door: 'right', style: 'cream' },
            { type: 'wardrobe', x: 13, y: 22, w: 10, h: 8, door: 'right', style: 'cream' },
            { type: 'wardrobe', x: 13, y: 32, w: 10, h: 8, door: 'right', style: 'cream' },

            // ── ПРАВОЕ КРЫЛО ────────────────────────────────
            { type: 'boiler',    x: 26, y: 2,  w: 13, h: 8,  door: 'left', style: 'brick' },
            { type: 'storage',   x: 40, y: 2,  w: 8,  h: 8,  door: 'left', style: 'tile' },
            { type: 'library',   x: 26, y: 12, w: 22, h: 18, door: 'left',
              style: 'wood', decor: 'clock' },
            { type: 'reception', x: 26, y: 32, w: 6,  h: 8,  door: 'left',
              style: 'wood', decor: 'clock' },
            { type: 'dining',    x: 33, y: 32, w: 6,  h: 8,  door: 'left', style: 'cream' },
            { type: 'kitchen',   x: 40, y: 32, w: 8,  h: 8,  door: 'left', style: 'tile_light' },
        ],

        // Винтовая лестница (на 2-й этаж и в подвал) — в библиотеке
        stairs: { x: 33, y: 20, w: 2, h: 2 },

        // Центральный коридор (вплотную к стенам крыльев): ковёр + свечи-бра
        corridor: { x: 23, y: 1, w: 3, h: 41 },

        // Парадный вход — внизу, по центру коридора
        exits: [
            { x: 24, y: 43, label: 'выйти на улицу' },
        ],

        spawn: { x: 24, y: 38 },
    }),

    // ── Фолбэк на случай отсутствия id ───────────────────────
    _fallback: buildRoom({
        id: '_fallback', title: 'КОМНАТА', tilePx: 16,
        w: 10, h: 8,
        frame: { thickness: 1, windows: { top: [3, 4, 5, 6] } },
        exits: [{ x: 4, y: 7, label: 'выйти' }],
        spawn: { x: 5, y: 5 },
    }),
};

export function getHouseLayout(id) {
    return HOUSE_LAYOUTS[id] ?? HOUSE_LAYOUTS._fallback;
}

/** Символ блокирует обзор? */
export function blocksSight(ch) {
    return ch === '#' || ch === '=' || ch === ' ' || ch === undefined;
}

/** Символ блокирует движение? */
export function blocksMove(ch) {
    return ch === '#' || ch === '=' || ch === 'W' || ch === ' ' || ch === undefined;
}
