import { BIOME } from '../utils/Constants.js';

export const TUNING = {
    globalScale: 1.0,

    trees: {
        scale: 1.5,
        oak:    { size: 'large',  scale: 1.6, yOff:  6, shadowSquash: 0.30 },
        pine:   { size: 'large',  scale: 1.5, yOff:  4, shadowSquash: 0.28 },
        pine2:  { size: 'medium', scale: 1.3, yOff:  4, shadowSquash: 0.28 },
        spruce: { size: 'large',  scale: 1.5, yOff:  4, shadowSquash: 0.28 },
        birch:  { size: 'large',  scale: 1.4, yOff:  4, shadowSquash: 0.30 },
        birch2: { size: 'medium', scale: 1.2, yOff:  4, shadowSquash: 0.30 },
        dead:   { size: 'large',  scale: 1.4, yOff:  4, shadowSquash: 0.28 },
        dead2:  { size: 'medium', scale: 1.2, yOff:  4, shadowSquash: 0.28 },
    },

    decor: {
        scale: 1.0,
        fern:      { scale: 1.0, yOff: 2, shadowSquash: 0.22, shadowAlphaMul: 0.85 },
        bush:      { scale: 1.1, yOff: 2, shadowSquash: 0.30, shadowAlphaMul: 0.90 },
        flower:    { scale: 0.5, yOff: 1, shadowSquash: 0.18, shadowAlphaMul: 0.55 },
        mushroom:  { scale: 0.4, yOff: 1, shadowSquash: 0.22, shadowAlphaMul: 0.65 },
        stump:     { scale: 1.0, yOff: 2, shadowSquash: 0.32, shadowAlphaMul: 0.95 },
        pebble:    { scale: 1.0, yOff: 1, shadowSquash: 0.25, shadowAlphaMul: 0.55 },
        moss:      { scale: 1.0, yOff: 1, shadowSquash: 0.18, shadowAlphaMul: 0.45 },
        formation: { scale: 1.2, yOff: 2, shadowSquash: 0.35, shadowAlphaMul: 1.0  },
        rock:      { scale: 1.1, yOff: 2, shadowSquash: 0.35, shadowAlphaMul: 0.90 },
        log:       { scale: 1.0, yOff: 2, shadowSquash: 0.30, shadowAlphaMul: 0.90 },
    },

    assetVariants: {
        oak: 5, pine: 5, pine2: 4, spruce: 4,
        birch: 5, birch2: 4, dead: 5, dead2: 4,
        fern: 4, bush: 4, flower: 4, mushroom: 4, stump: 4,
        pebble: 4, moss: 4, formation: 4,
        rockPebble: 4, rockSmall: 4, rockMedium: 4, rockBoulder: 4,
        log: 4, grass: 6,
    },

    grass: {
        enabled: true,
        cellSize: 22,
        scale: 1.0,
        probability: {
            [BIOME.GRASS]: 0.70, [BIOME.OAK]: 0.55, [BIOME.BIRCH]: 0.60,
            [BIOME.PINE]: 0.35, [BIOME.SWAMP]: 0.25, [BIOME.SAND]: 0.08,
            [BIOME.WATER]: 0, [BIOME.DEEP_WATER]: 0, [BIOME.DEAD]: 0.05,
        },
    },

    player: {
        shadowW: 22, shadowH: 8, yOff: 1,
        speed: 70,
        blockWater: true,
        waterCheckBuffer: 3,
    },

    silhouetteShadow: {
        enabled: true,
        color:   0x0a0a19,
        squash:  0.30,
        baseAlpha: 0.55,
        maxStretch: 1.8,
        minAlpha:   0.25,
        maxAlpha:   0.65,
        offsetRange: 16,
    },

    shadow: { color: 0x2a2942, alpha: 0.45 },

    animals: {
        bird: {
            flying: true,
            hoverHeight: 42,
            perchHeight: 28,
            hoverAmp: 2,
            hoverSpeed: 1.8,
            fleeLift: 16,
            shadowAlpha: 0.20,
            shadowSquash: 0.14,
        },
    },

    audio: {
        enabled: true,
        masterVolume: 0.5,

        forest: {
            enabled: true,
            volume: 0.22,
            fadeInSec: 2.0,
            layers: [
                { freq: 90,  q: 0.7, gain: 0.9 },
                { freq: 320, q: 1.1, gain: 0.5 },
                { freq: 900, q: 0.8, gain: 0.2 },
            ],
        },

        birds: {
            enabled: true,
            volume: 0.35,
            minIntervalMs: 1400,
            maxIntervalMs: 5200,
        },

        rustle: {
            enabled: true,
            volume: 0.10,
            cutoffHz: { grass: 1400, fern: 1800, bush: 1000 },
        },

        files: {
            forest:       '',
            bird_1:       '',
            bird_2:       '',
            bird_3:       '',
            rustle_grass: '',
            rustle_fern:  '',
            rustle_bush:  '',
        },
    },

    wind: {
        enabled: true,

        defaults: {
            frames: 6,
            amp: 2.0,
            freq: 0.20,
            jitter: 1.0,
            groundLine: 0.95,
        },

        glitch: {
            enabled: true,
            chance: 0.06,
            minYFrac: 0.0,
            palette: ['LIGHT_GREEN', 'YELLOW_GREEN', 'GREEN', 'OLIVE_GREEN', 'TEAL'],
            greenBias: 5,
            minGreen: 40,
        },

        types: [
            { match: 'tree_dead',   config: null },
            { match: 'tree_pine',   config: { frames: 6, amp: 3.5, freq: 0.22, jitter: 0.9, groundLine: 0.95 } },
            { match: 'tree_spruce', config: { frames: 6, amp: 3.5, freq: 0.22, jitter: 0.9, groundLine: 0.95 } },
            { match: 'tree_',       config: { frames: 6, amp: 5.0, freq: 0.16, jitter: 1.3, groundLine: 0.95 } },
            { match: 'bush_',       config: { frames: 6, amp: 4.0, freq: 0.24, jitter: 1.1, groundLine: 0.95 } },
            { match: 'fern_',       config: { frames: 6, amp: 3.5, freq: 0.30, jitter: 0.9, groundLine: 0.95 } },
            { match: 'flower_',     config: { frames: 6, amp: 3.0, freq: 0.38, jitter: 0.8, groundLine: 0.95 } },
            { match: 'grass',       config: { frames: 6, amp: 3.0, freq: 0.45, jitter: 0.9, groundLine: 0.85 } },
        ],
    },

    dayNight: {
        enabled: true, dayLengthSec: 120, startHour: 8,
        dawnHour: 5, sunriseHour: 6, sunsetHour: 19, duskEndHour: 21,
        nightAmbientAlpha: 0.55, dayAmbientAlpha: 0.0,
        dawnTintColor: 0xffb066, duskTintColor: 0xff8a4a, nightTintColor: 0x0a0a19,
        ambientLerp: 0.08,
    },

    camera: { followLerp: 1, deadzone: 0 },

    vignette: {
        enabled: true, color: 0x0a0a19,
        lightRadius: 260, lightSoftness: 0.55, lerpSpeed: 0.04,
        biomeAlpha: {
            [BIOME.BIRCH]: 0.10, [BIOME.GRASS]: 0.28, [BIOME.SAND]: 0.20,
            [BIOME.OAK]: 0.45, [BIOME.WATER]: 0.35, [BIOME.DEEP_WATER]: 0.55,
            [BIOME.PINE]: 0.62, [BIOME.SWAMP]: 0.72, [BIOME.DEAD]: 0.88,
        },
        defaultAlpha: 0.40,
    },

    dithering: { enabled: true, pDirect: 0.32, pDiagonal: 0.14 },

    // ─────────────────────────────────────────────────────────────
    //  БИОМЫ (статичный мир через сид)
    //
    //  • indexFreq — частота биомного шума. Чем меньше, тем крупнее зоны.
    //  • distribution — взвешенное распределение. Порядок = порядок в
    //    шумовом пространстве, соседние в списке биомы граничат в мире.
    //    Сумма weight ОБЯЗАНА быть = 1.0.
    //  • treeDensity / decorDensity — плотности по биомам (0..1).
    // ─────────────────────────────────────────────────────────────
    biome: {
        indexFreq:  0.00070,   // частота биомного шума (низкая → крупные зоны)
        warpFreq:   0.00060,   // domain-warp: частота искажения
        warpAmp:    90,        // амплитуда искажения (px)
        detailFreq: 0.02,      // плотностный шум для деревьев

        // Тропинки
        pathFreq:        0.00070,
        pathThreshold:   0.010,
        pathSolidCenter: 0.42,

        // Проценты: WATER 5%, SAND 5%, SWAMP 5%, GRASS 20%,
        //           OAK 20%, BIRCH 20%, PINE 20%, DEAD 5%
        distribution: [
            { biome: BIOME.WATER, weight: 0.05 },
            { biome: BIOME.SAND,  weight: 0.05 },
            { biome: BIOME.SWAMP, weight: 0.05 },
            { biome: BIOME.GRASS, weight: 0.20 },
            { biome: BIOME.OAK,   weight: 0.20 },
            { biome: BIOME.BIRCH, weight: 0.20 },
            { biome: BIOME.PINE,  weight: 0.20 },
            { biome: BIOME.DEAD,  weight: 0.05 },
        ],

        treeDensity: {
            [BIOME.WATER]: 0.00,
            [BIOME.SAND]:  0.02,
            [BIOME.SWAMP]: 0.40,
            [BIOME.GRASS]: 0.15,
            [BIOME.OAK]:   0.80,
            [BIOME.BIRCH]: 0.65,
            [BIOME.PINE]:  0.85,
            [BIOME.DEAD]:  0.10,
        },
        decorDensity: {
            [BIOME.WATER]: 0.00,
            [BIOME.SAND]:  0.20,
            [BIOME.SWAMP]: 0.55,
            [BIOME.GRASS]: 0.45,
            [BIOME.OAK]:   0.60,
            [BIOME.BIRCH]: 0.65,
            [BIOME.PINE]:  0.55,
            [BIOME.DEAD]:  0.35,
        },
    },

    density: {
        treeMultiplier:  0.55,
        decorMultiplier: 0.60,
        logRarity:       0.15,
        bushMultiplier:  0.55,
        flowerMultiplier:0.35,
        mushroomMultiplier: 0.30,
        stumpMultiplier: 0.15,
        pebbleMultiplier:0.45,
        mossMultiplier:  0.28,
        formationMultiplier: 0.06,
    },

    // ─────────────────────────────────────────────────────────────
    //  ТЕЛЕПОРТ ЧЕРЕЗ ГРАНИЦУ МИРА
    //
    //  edgeTrigger    — за сколько px до границы срабатывает телепорт
    //  safeMargin     — отступ точки спавна от целевой границы
    //  loadingMs      — сколько держать чёрный экран (генерация чанков)
    //  fadeIn/fadeOut — длительность плавных переходов
    //  border*        — внешний вид границы мира
    // ─────────────────────────────────────────────────────────────
    teleport: {
        edgeTrigger:       40,
        safeMargin:        400,
        loadingMs:         2000,
        fadeInMs:          450,
        fadeOutMs:         450,
        borderThickness:   48,
        borderColor:       0x7a2849,
        borderAlpha:       0.55,
        borderEdgeColor:   0xe67a84,
        borderEdgeAlpha:   0.85,
        borderEdgeWidth:   3,
    },

    obstacles: {
        rock_0: { bodyW: 10, bodyH:  6, yOff: 3, solid: false },
        rock_1: { bodyW: 16, bodyH:  8, yOff: 3, solid: false },
        rock_2: { bodyW: 24, bodyH: 11, yOff: 4, solid: true  },
        rock_3: { bodyW: 34, bodyH: 15, yOff: 5, solid: true  },

        log_0:  { bodyW: 22, bodyH: 5, yOff: 4, solid: true },
        log_1:  { bodyW: 30, bodyH: 6, yOff: 4, solid: true },
        log_2:  { bodyW: 30, bodyH: 6, yOff: 4, solid: true },
        log_3:  { bodyW: 40, bodyH: 9, yOff: 5, solid: true },

        stump_plain:     { bodyW: 14, bodyH: 8, yOff: 3, solid: true },
        stump_mossy:     { bodyW: 14, bodyH: 8, yOff: 3, solid: true },
        stump_sprout:    { bodyW: 14, bodyH: 8, yOff: 3, solid: true },
        stump_mushrooms: { bodyW: 16, bodyH: 9, yOff: 3, solid: true },

        formation_outcrop:  { bodyW: 30, bodyH: 10, yOff: 3, solid: true },
        formation_ridge:    { bodyW: 56, bodyH: 12, yOff: 3, solid: true },
        formation_peak:     { bodyW: 34, bodyH: 14, yOff: 3, solid: true },
        formation_mountain: { bodyW: 48, bodyH: 16, yOff: 3, solid: true },
        formation_plateau:  { bodyW: 56, bodyH: 12, yOff: 3, solid: true },
    },
};

export function buildGameConfig(scenes) {
    return {
        type: Phaser.AUTO,
        parent: 'game',
        backgroundColor: '#120e23',
        pixelArt: true,
        roundPixels: true,
        scale: {
            mode: Phaser.Scale.RESIZE,
            autoCenter: Phaser.Scale.CENTER_BOTH,
            width: 640,
            height: 360,
        },
        physics: { default: 'arcade', arcade: { gravity: { y: 0 }, debug: false } },
        input: { gamepad: true, activePointers: 3 },
        scene: scenes,
    };
}