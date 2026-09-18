// ─────────────────────────────────────────────────────────────
//  ПАЛИТРА
// ─────────────────────────────────────────────────────────────
export const PALETTE = Object.freeze({
    TAN:          0xaea47e,
    GRAY:         0x6f6e72,
    PURPLE_GRAY:  0x534664,
    GREEN:        0x349c58,
    LIGHT_GREEN:  0x6dba79,
    TEAL:         0x2a7d75,
    DARK_TEAL:    0x24505f,
    DARK_PURPLE:  0x2a2942,
    ALMOST_BLACK: 0x120e23,
    DARK_PURPLE2: 0x3a1b40,
    DARK_RED:     0x7a2849,
    RED:          0xb74132,
    ORANGE:       0xe67146,
    YELLOW:       0xebb85b,
    GOLD:         0xc78539,
    BROWN:        0xa15c34,
    DARK_BROWN:   0x764032,
    VERY_DARK:    0x402e2b,
    OLIVE:        0x56642e,
    OLIVE_GREEN:  0x7e9432,
    YELLOW_GREEN: 0xc9c03d,
    CREAM:        0xfff1a9,
    PINK:         0xe67a84,
    DARK_PINK:    0xc23753,
});

// ─────────────────────────────────────────────────────────────
//  МИР
// ─────────────────────────────────────────────────────────────
export const TILE_SIZE         = 16;
export const CHUNK_SIZE        = 16;
export const CHUNK_PX          = TILE_SIZE * CHUNK_SIZE;    // 256
export const VIEW_CHUNK_RADIUS = 3;
export const CAMERA_ZOOM       = 3;
export const WORLD_SEED        = 20240517;

// ─── ФИНАЛЬНЫЙ МИР 10 000 × 10 000 px ───────────────────────
export const WORLD_SIZE = 10000;
export const WORLD_HALF = WORLD_SIZE / 2;   // 5000
export const WORLD_MIN  = -WORLD_HALF;
export const WORLD_MAX  =  WORLD_HALF;

// Центр «дома» совпадает с центром мира
export const WORLD_CENTER = Object.freeze({ x: 0, y: 0 });

// Здание детского дома
export const BUILDING_BOUNDS = Object.freeze({
    x: -120, y: -65, w: 240, h: 130,
});
// Деревья не спавнятся в прямоугольнике BUILDING_BOUNDS, расширенном на padding
export const BUILDING_CLEARING = 96;

// ─────────────────────────────────────────────────────────────
//  БИОМЫ
// ─────────────────────────────────────────────────────────────
export const BIOME = Object.freeze({
    DEEP_WATER: 0,
    WATER:      1,
    SWAMP:      2,
    SAND:       3,
    GRASS:      4,
    BIRCH:      5,   // тепло + сухо
    OAK:        6,   // средне + влажно
    PINE:       7,   // холодно
    // DEAD оставлен в палитре (для сюжетных точек), но в генерацию не входит.
    DEAD:       8,
});

export const TILE_COLORS = Object.freeze({
    [BIOME.DEEP_WATER]: PALETTE.DARK_TEAL,
    [BIOME.WATER]:      PALETTE.TEAL,
    [BIOME.SWAMP]:      PALETTE.OLIVE,
    [BIOME.SAND]:       PALETTE.YELLOW,
    [BIOME.GRASS]:      PALETTE.GREEN,
    [BIOME.BIRCH]:      PALETTE.LIGHT_GREEN,
    [BIOME.OAK]:        PALETTE.OLIVE_GREEN,
    [BIOME.PINE]:       PALETTE.OLIVE,
    [BIOME.DEAD]:       PALETTE.VERY_DARK,
});

export const ACCENT_COLORS = Object.freeze({
    [BIOME.DEEP_WATER]: PALETTE.ALMOST_BLACK,
    [BIOME.WATER]:      PALETTE.DARK_TEAL,
    [BIOME.SWAMP]:      PALETTE.DARK_TEAL,
    [BIOME.SAND]:       PALETTE.GOLD,
    [BIOME.GRASS]:      PALETTE.LIGHT_GREEN,
    [BIOME.BIRCH]:      PALETTE.YELLOW_GREEN,
    [BIOME.OAK]:        PALETTE.YELLOW_GREEN,
    [BIOME.PINE]:       PALETTE.OLIVE_GREEN,
    [BIOME.DEAD]:       PALETTE.GRAY,
});

export const TILE_NOISE_COUNT = 9;

// ─────────────────────────────────────────────────────────────
//  ГЛУБИНА (Y-sorting)
// ─────────────────────────────────────────────────────────────
export const DEPTH = Object.freeze({
    GROUND:   -100000,
    SHADOW:   -1000,         // ← все тени тут, единым слоем
    BUILDING: 0,
    ENTITIES: 100000,        // спрайты: DEPTH.ENTITIES + worldY
    VIGNETTE: 900000,        // ← НОВОЕ: виньетка ниже UI, выше мира
    OVERLAY:  1000000,
});

// ─────────────────────────────────────────────────────────────
//  СУБ-ТАЙЛИНГ
// ─────────────────────────────────────────────────────────────
export const SUB_TILE   = 4;
export const SUB_JITTER = 6;


