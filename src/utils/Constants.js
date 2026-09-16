// ─────────────────────────────────────────────────────────────
//  ПАЛИТРА (24 цвета). Только эти цвета разрешены в проекте.
// ─────────────────────────────────────────────────────────────
export const PALETTE = Object.freeze({
    TAN:          0xaea47e, // тёплый серо-песочный
    GRAY:         0x6f6e72, // средний серый
    PURPLE_GRAY:  0x534664, // фиолетово-серый
    GREEN:        0x349c58, // основной зелёный (трава/крона)
    LIGHT_GREEN:  0x6dba79, // светлый зелёный (блики)
    TEAL:         0x2a7d75, // бирюзовый (вода/стекло)
    DARK_TEAL:    0x24505f, // тёмный бирюзовый (глубокая вода/тени)
    DARK_PURPLE:  0x2a2942, // тёмно-фиолетовый
    ALMOST_BLACK: 0x120e23, // почти чёрный (тени)
    DARK_PURPLE2: 0x3a1b40, // второй тёмно-фиолетовый
    DARK_RED:     0x7a2849, // тёмно-красный
    RED:          0xb74132, // красный
    ORANGE:       0xe67146, // оранжевый
    YELLOW:       0xebb85b, // песочный/жёлтый
    GOLD:         0xc78539, // золотистый
    BROWN:        0xa15c34, // коричневый (стены)
    DARK_BROWN:   0x764032, // тёмно-коричневый
    VERY_DARK:    0x402e2b, // очень тёмный (окантовка)
    OLIVE:        0x56642e, // олива (лесная земля)
    OLIVE_GREEN:  0x7e9432, // оливково-зелёный
    YELLOW_GREEN: 0xc9c03d, // жёлто-зелёный
    CREAM:        0xfff1a9, // кремовый (подсветки)
    PINK:         0xe67a84, // розовый
    DARK_PINK:    0xc23753, // тёмно-розовый
});

// ─────────────────────────────────────────────────────────────
//  МИР
// ─────────────────────────────────────────────────────────────
export const TILE_SIZE          = 16;        // нативных пикселя
export const CHUNK_SIZE         = 16;        // тайлов в чанке
export const CHUNK_PX           = TILE_SIZE * CHUNK_SIZE; // 256
export const VIEW_CHUNK_RADIUS  = 3;         // 7×7 чанков
export const CAMERA_ZOOM        = 3;         // ★ увеличение пикселя
export const WORLD_SEED         = 20240517;

// ─────────────────────────────────────────────────────────────
//  ЗОНА ЗАСТРОЙКИ (детский дом) — здесь деревья не спавнятся
// ─────────────────────────────────────────────────────────────
export const BUILDING_BOUNDS = Object.freeze({
    x: -120, y: -65, w: 240, h: 130,
});
// Вокруг дома — «расчистка» шириной в N тайлов
export const BUILDING_CLEARING = 48; // px

export const BIOME = Object.freeze({
    DEEP_WATER: 0,
    WATER:      1,
    SAND:       2,
    GRASS:      3,
    FOREST:     4,
});

export const TILE_COLORS = Object.freeze({
    [BIOME.DEEP_WATER]: PALETTE.DARK_TEAL,
    [BIOME.WATER]:      PALETTE.TEAL,
    [BIOME.SAND]:       PALETTE.YELLOW,
    [BIOME.GRASS]:      PALETTE.GREEN,
    [BIOME.FOREST]:     PALETTE.OLIVE,
});

import { PALETTE as P } from './Constants.js';  // уже импортируется через TILE_COLORS

// Акцентный цвет каждого биома — используется для микро-шума на тайлах.
export const ACCENT_COLORS = Object.freeze({
    [BIOME.DEEP_WATER]: P.ALMOST_BLACK,
    [BIOME.WATER]:      P.DARK_TEAL,
    [BIOME.SAND]:       P.GOLD,
    [BIOME.GRASS]:      P.LIGHT_GREEN,
    [BIOME.FOREST]:     P.OLIVE_GREEN,
});

// Количество «зерновых» пикселей на тайл (шум).
export const TILE_NOISE_COUNT = 9;

export const DEPTH = Object.freeze({
    GROUND:   -1000,
    BUILDING: 0,
    ENTITIES: 1000,
    OVERLAY:  100000,
});

// ─────────────────────────────────────────────────────────────
//  СУБ-ТАЙЛИНГ (рендер)
// ─────────────────────────────────────────────────────────────
// Размер суб-ячейки в нативных пикселях. 16 / SUB = число ячеек по стороне.
// 4 → переходы «плывут» на 4 px, а не на 16.
export const SUB_TILE   = 4;
// Амплитуда шумового смещения суб-ячейки (px). Больше → более рваные края.
export const SUB_JITTER = 6;