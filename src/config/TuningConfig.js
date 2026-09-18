import { BIOME } from '../utils/Constants.js';

export const TUNING = {
    // ═════════════════════════════════════════════════════════════
    //  1. РАЗМЕРЫ АССЕТОВ (п.4 ТЗ)
    //     scale — единый множитель размера canvas.
    //     64×64 (базовый) * scale → итоговый размер спрайта.
    //     Предпросмотр: меняй scale, перезагрузи страницу.
    // ═════════════════════════════════════════════════════════════
    trees: {
        scale: 1.5,             // ← ГЛАВНЫЙ ПАРАМЕТР
        oak:    { size: 'large',  shadowW: 72, shadowH: 22, yOff:  6 },
        pine:   { size: 'large',  shadowW: 56, shadowH: 18, yOff:  4 },
        pine2:  { size: 'medium', shadowW: 48, shadowH: 16, yOff:  4 },
        spruce: { size: 'large',  shadowW: 60, shadowH: 18, yOff:  4 },
        birch:  { size: 'large',  shadowW: 40, shadowH: 12, yOff:  4 },
        birch2: { size: 'medium', shadowW: 36, shadowH: 11, yOff:  4 },
        dead:   { size: 'large',  shadowW: 48, shadowH: 14, yOff:  4 },
        dead2:  { size: 'medium', shadowW: 42, shadowH: 12, yOff:  4 },
    },

    decor: {
        scale: 1.0,
        fern:  { shadowW: 28, shadowH: 8,  yOff: 2 },
        rock:  { shadowW: 24, shadowH: 8,  yOff: 2 },
        log:   { shadowW: 40, shadowH: 10, yOff: 2 },
    },

    player: {
        shadowW: 22, shadowH: 8, yOff: 1,
    },

    // ═════════════════════════════════════════════════════════════
    //  2. СИСТЕМА ТЕНЕЙ (п.1 ТЗ)
    // ═════════════════════════════════════════════════════════════
    shadow: {
        // Тень — сплюснутый эллипс, полупрозрачный, DARK_PURPLE-типа
        color: 0x2a2942,        // DARK_PURPLE
        alpha: 0.45,
        // Все тени рендерятся одним слоем DEPTH.SHADOW,
        // спрайты — Y-sort поверх. Умная тень из ТЗ.
    },

    // ═════════════════════════════════════════════════════════════
    //  3. ВИНЬЕТКА / ОСВЕЩЕНИЕ (п.3 ТЗ)
    // ═════════════════════════════════════════════════════════════
    vignette: {
        enabled: true,
        color: 0x0a0a19,           // холодный мрак
        lightRadius: 260,          // радиус «фонаря» в screen px
        lightSoftness: 0.55,       // 0=центр..1=край, где начинается спад
        lerpSpeed: 0.04,           // плавность смены яркости между биомами

        // Прозрачность Overlay по биому (0=светло, 1=черно)
        biomeAlpha: {
            [BIOME.BIRCH]:      0.10,
            [BIOME.GRASS]:      0.28,
            [BIOME.SAND]:       0.20,
            [BIOME.OAK]:        0.45,
            [BIOME.WATER]:      0.35,
            [BIOME.DEEP_WATER]: 0.55,
            [BIOME.PINE]:       0.62,
            [BIOME.SWAMP]:      0.72,
            [BIOME.DEAD]:       0.88,
        },
        defaultAlpha: 0.40,
    },

    // ═════════════════════════════════════════════════════════════
    //  4. АВТОТАЙЛИНГ (п.2 ТЗ)
    // ═════════════════════════════════════════════════════════════
    dithering: {
        enabled: true,
        // Вероятность «пробить» соседний биом в пикселе у границы
        pDirect: 0.42,     // прямой сосед (N/S/W/E)
        pDiagonal: 0.20,   // диагональный сосед
    },
};