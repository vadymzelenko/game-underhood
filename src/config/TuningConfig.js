import { BIOME } from '../utils/Constants.js';

export const TUNING = {
    // Глобальный множитель размера. Крутит ВСЁ (деревья, кусты, камни, траву…).
    globalScale: 1.0,

    // ─── ДЕРЕВЬЯ ─────────────────────────────────────────────
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

    // ─── ДЕКОР ───────────────────────────────────────────────
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
            [BIOME.WATER]: 0, [BIOME.DEEP_WATER]: 0,
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

    // ─────────────────────────────────────────────────────────────
    //  ЖИВОТНЫЕ
    //  flying: true — существо не привязано к земле, летает по воздуху.
    //  hoverHeight / hoverAmp / hoverSpeed — как оно «висит».
    //  fleeLift — доп. подъём, когда убегает от игрока.
    // ─────────────────────────────────────────────────────────────
    animals: {
        bird: {
            flying: true,
            hoverHeight: 42,       // px над землёй в полёте
            perchHeight: 28,       // px над землёй на присаде
            hoverAmp: 2,           // лёгкое покачивание
            hoverSpeed: 1.8,       // рад/сек
            fleeLift: 16,          // взлёт при испуге
            shadowAlpha: 0.20,
            shadowSquash: 0.14,
        },
    },

    // ─────────────────────────────────────────────────────────────
    //  ЗВУК
    //  Всё синтезируется через WebAudio — никаких mp3/ogg.
    //  forest  — многослойный отфильтрованный шум (гул + шелест).
    //  birds   — рандомные трели (треугольник + огибающая).
    //  rustle  — короткий шум травы/куста/папоротника.
    // ─────────────────────────────────────────────────────────────

    audio: {
        enabled: true,
        masterVolume: 0.5,

        forest: {
            enabled: true,
            volume: 0.22,          // как в первой версии
            fadeInSec: 2.0,
            // Многослойный bandpass-шум — тот самый «лес».
            layers: [
                { freq: 90,  q: 0.7, gain: 0.9 },   // далёкий гул
                { freq: 320, q: 1.1, gain: 0.5 },   // шелест листвы
                { freq: 900, q: 0.8, gain: 0.2 },   // верхушки/шип
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
            // Пустая строка = использовать синтез.
            forest:       '',
            bird_1:       '',
            bird_2:       '',
            bird_3:       '',
            rustle_grass: '',
            rustle_fern:  '',
            rustle_bush:  '',
        },
    },

    // ─────────────────────────────────────────────────────────────
    //  ВЕТЕР И ГЛИТЧ ЛИСТВЫ
    //
    //  Система работает так: для каждой текстуры травы/листвы
    //  мы генерируем N «ветровых» вариантов (texture_w0..wN-1).
    //  WindSystem периодически переключает спрайт между ними —
    //  получается покачивание + глитч пикселей.
    //
    //  defaults      — базовые параметры для всех типов.
    //  types[]       — список правил. Проверка идёт СВЕРХУ ВНИЗ
    //                  через key.startsWith(match). Первое совпадение
    //                  выигрывает, поэтому 'tree_dead' должен идти
    //                  раньше общего 'tree_'.
    //  glitch        — глобальные настройки глитча (мигание).
    // ─────────────────────────────────────────────────────────────
    wind: {
        enabled: true,

        defaults: {
            // Сколько вариантов текстуры генерировать.
            // Больше — плавнее покачивание и разнообразнее глитч,
            // но и больше канвасов в памяти.
            frames: 6,
            // Максимальный сдвиг в пикселях у самой верхушки (до Math.round).
            amp: 2.0,
            // Частота синусоиды по Y. Больше — «рябит» чаще по высоте.
            freq: 0.20,
            // Разброс per-row сдвига: именно он даёт «пиксельный шум».
            jitter: 1.0,
            // Доля высоты канваса, ниже которой спрайт считается
            // «прикреплённым к земле» и не шевелится.
            // 0.95 = стабильны только последние ~3 ряда (подошва ствола).
            groundLine: 0.95,
        },

        // ── ГЛИТЧ ПИКСЕЛЕЙ ─────────────────────────────────
        // Перекрашивает часть пикселей листвы в другие оттенки
        // зелёного из палитры. Разные пиксели в разных кадрах,
        // поэтому при переключении текстур выглядит как «мигание».
        glitch: {
            enabled: true,
            // Вероятность перекраски для одного подходящего пикселя.
            chance: 0.06,
            // Доля высоты, ниже которой глитч не применяется.
            // 0.0 = по всей высоте. 0.3 = только верхние 70% (крона).
            minYFrac: 0.0,
            // Оттенки-кандидаты. Берутся из PALETTE в Constants.js.
            palette: ['LIGHT_GREEN', 'YELLOW_GREEN', 'GREEN', 'OLIVE_GREEN', 'TEAL'],
            // Фильтр «это листва»: g должен превышать r и b на greenBias
            // и быть не меньше minGreen. Так ствол (коричневый) и
            // контур (тёмно-фиолетовый) не затрагиваются.
            greenBias: 5,
            minGreen: 40,
        },

        types: [
            // Дохлые деревья не шевелятся — null отключает ветер полностью.
            { match: 'tree_dead',   config: null },

            // Ёлки/сосны — узкая крона, нужно меньше амплитуды.
            { match: 'tree_pine',   config: { frames: 6, amp: 3.5, freq: 0.22, jitter: 0.9, groundLine: 0.95 } },
            { match: 'tree_spruce', config: { frames: 6, amp: 3.5, freq: 0.22, jitter: 0.9, groundLine: 0.95 } },

            // Лиственные — самая заметная листва, максимальная амплитуда.
            { match: 'tree_',       config: { frames: 6, amp: 5.0, freq: 0.16, jitter: 1.3, groundLine: 0.95 } },

            // Кусты
            { match: 'bush_',       config: { frames: 6, amp: 4.0, freq: 0.24, jitter: 1.1, groundLine: 0.95 } },

            // Папоротники
            { match: 'fern_',       config: { frames: 6, amp: 3.5, freq: 0.30, jitter: 0.9, groundLine: 0.95 } },

            // Цветы — маленькая амплитуда, иначе шапка «улетает».
            { match: 'flower_',     config: { frames: 6, amp: 3.0, freq: 0.38, jitter: 0.8, groundLine: 0.95 } },

            // Трава: канвас ниже, «земля» ≈ 8/10 высоты.
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

    biome: {
        continentFreq: 0.00015,
        elevationFreq: 0.00040,
        moistureFreq:    0.00035,
        temperatureFreq: 0.00030,
        temperatureGradient: 0.25,
        detailFreq: 0.02,
        warpFreq: 0.0006,
        warpAmp:  90,
        deepWaterThreshold: 0.20,
        waterThreshold:     0.27,
        lowlandThreshold:   0.38,
        beachBandWidth: 0.022,
        wetBeachWidth:  0.006,
        shoreBandWidth: 0.006,
        pathFreq:        0.00030,
        pathThreshold:   0.020,
        pathSolidCenter: 0.42,
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