import { BIOME } from '../utils/Constants.js';

// ─────────────────────────────────────────────────────────────
//  ДЕФОЛТЫ
// ─────────────────────────────────────────────────────────────
export const BUILDING_DEFAULTS = {
    clearing:  96,     // не спавнить растительность в этом радиусе от ВИДИМОЙ части
    animalPad: 12,     // не спавнить животных в этом радиусе от ВИДИМОЙ части

    // ★ «Пятачок» биома вокруг здания
    padBiome:     null,    // BIOME.GRASS / SAND / OAK / ... или null (не трогать)
    padMargin:    60,      // запас вокруг видимой части, px
    padNoiseAmp:  18,      // «рваность» края, px
    padNoiseFreq: 0.015,   // частота шума (меньше → крупнее волны)

    // ★ Коллизия — как её строить
    collision: {
        mode:            'alpha',   // 'alpha' | 'bounds' | 'none'
        alphaThreshold:  128,       // что считать непрозрачным (0..255)
        padding:         0,         // доп. расширение тела по бокам, px

        // ★ Какая часть ВИДИМОЙ области — solid.
        //   0   = коллизии нет вообще (проходной дом)
        //   0.5 = solid только нижняя половина (можно зайти «за спину»)
        //   1   = solid всё видимое (по умолчанию, как раньше)
        solidFromBottom: 0.5,

        // ★ Нижняя кромка коллизии:
        //   yOffsetBottom > 0 — обрезать тело снизу (игрок сможет пройти у самых ног дома)
        //   yOffsetBottom < 0 — вытянуть тело вниз (для «крыльца»)
        yOffsetBottom:   0,
    },

    // Спрайт
    sprite: {
        fit:         true,
        scale:       1.0,
        xOff:        0,
        yOff:        0,
        originX:     0.5,
        originY:     1,
        tint:        null,
        tintFill:    null,
        depthOffset: 0,
    },

    door:     { dx: 0, dy: 8, radius: 40 },
    interior: { title: 'КОМНАТА', roomW: 320, roomH: 200 },
};

// ─────────────────────────────────────────────────────────────
//  СПИСОК ЗДАНИЙ
// ─────────────────────────────────────────────────────────────
export const BUILDINGS = [
    {
        id: 'orphanage',
        name: 'Детский дом',
        bounds: { x: -120, y: 65, w: 240, h: 130 },
        texture: 'building_main',
        sprite: { scale: 2.0, yOff: -4 },
        door: { dx: 0, dy: 8, radius: 44 },
        interior: { title: 'ХОЛЛ', roomW: 320, roomH: 200 },

        collision: { solidFromBottom: 0.45 },  // ← только нижние 45% — проход сверху

        // ★ Автоматический «пятачок» вокруг дома
        padBiome:    BIOME.GRASS,   // газон
        padMargin:   10,             // запас вокруг дома
        padNoiseAmp: 10,             // рваный край
        clearing:    10,            // растительность подальше
    },

    // {
    //     id: 'shop',
    //     name: 'Лавка',
    //     bounds: { x: 620, y: -340, w: 180, h: 100 },
    //     texture: 'building_shop',
    //     sprite: { scale: 0.6 },
    //     door: { dx: 0, dy: 6, radius: 36 },
    //     interior: { title: 'ЛАВКА', roomW: 260, roomH: 180 },
    //     padBiome: BIOME.SAND,
    //     padMargin: 70,
    // },
];

export function resolveBuilding(cfg) {
    const D = BUILDING_DEFAULTS;
    return {
        ...cfg,
        clearing:  cfg.clearing  ?? D.clearing,
        animalPad: cfg.animalPad ?? D.animalPad,
        padBiome:  cfg.padBiome  ?? D.padBiome,
        padMargin: cfg.padMargin ?? D.padMargin,
        padNoiseAmp:  cfg.padNoiseAmp  ?? D.padNoiseAmp,
        padNoiseFreq: cfg.padNoiseFreq ?? D.padNoiseFreq,
        collision: { ...D.collision, ...(cfg.collision || {}) },
        sprite:    { ...D.sprite,    ...(cfg.sprite    || {}) },
        door:      { ...D.door,      ...(cfg.door      || {}) },
        interior:  { ...D.interior,  ...(cfg.interior  || {}) },
    };
}

export function getBuildingById(id) {
    const cfg = BUILDINGS.find((b) => b.id === id);
    return cfg ? resolveBuilding(cfg) : null;
}

// ─────────────────────────────────────────────────────────────
//  RUNTIME — заполняется из Building.js после расчёта видимых прямоугольников
// ─────────────────────────────────────────────────────────────
const _runtime = [];

export function registerBuildingRuntime(entry) { _runtime.push(entry); }
export function clearRuntimeBuildings()        { _runtime.length = 0; }

/** Точка попадает в «зону без растительности» какого-нибудь здания? */
export function isInsideAnyBuilding(wx, wy) {
    for (let i = 0; i < _runtime.length; i++) {
        const p = _runtime[i].clearingRect;
        if (wx > p.x && wx < p.x + p.w &&
            wy > p.y && wy < p.y + p.h) return true;
    }
    return false;
}

/** Точка попадает в «зону без животных»? */
export function isInsideAnyAnimalZone(wx, wy) {
    for (let i = 0; i < _runtime.length; i++) {
        const p = _runtime[i].animalRect;
        if (wx > p.x && wx < p.x + p.w &&
            wy > p.y && wy < p.y + p.h) return true;
    }
    return false;
}

/**
 * ★ Биом «пятачка». Возвращает BIOME.* или null.
 * Использует прямоугольник + шумовое искажение координат → органичный край.
 */
export function getPadBiomeAt(wx, wy) {
    for (let i = 0; i < _runtime.length; i++) {
        const r = _runtime[i];
        if (r.padBiome == null) continue;

        const p = r.padRect;
        const a = r.padNoiseAmp;

        // Ранний выход — точка заведомо вне пятна
        if (wx < p.x - a || wx > p.x + p.w + a ||
            wy < p.y - a || wy > p.y + p.h + a) continue;

        const f  = r.padNoiseFreq;
        const jx = (_noise(wx * f,      wy * f)      - 0.5) * 2 * a;
        const jy = (_noise(wx * f + 50, wy * f + 50) - 0.5) * 2 * a;

        if (wx + jx > p.x && wx + jx < p.x + p.w &&
            wy + jy > p.y && wy + jy < p.y + p.h) {
            return r.padBiome;
        }
    }
    return null;
}

// Мелкий value-noise для искажения края
function _noise(x, y) {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf);
    const v = yf * yf * (3 - 2 * yf);
    const a = _h(xi,     yi    );
    const b = _h(xi + 1, yi    );
    const c = _h(xi,     yi + 1);
    const d = _h(xi + 1, yi + 1);
    return a * (1-u) * (1-v) + b * u * (1-v)
        + c * (1-u) * v     + d * u * v;
}
function _h(x, y) {
    let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}