/**
 * Сборщик карты комнаты из описания.
 *
 * Принимает объект { w, h, ... } и возвращает layout с готовым map[].
 *
 * ── Формат описания ────────────────────────────────────────
 *   w, h                — размеры в тайлах
 *   frame               — внешние стены, авто-рамка
 *     .thickness        — толщина (по умолчанию 1)
 *     .windows          — { top:[x...], bottom:[x...], left:[y...], right:[y...] }
 *   rooms[]             — подкомнаты (стены + дверь)
 *     { x, y, w, h, door: 'top'|'bottom'|'left'|'right'|null }
 *   walls[]             — ручные прямоугольники стен
 *     { x, y, w, h }
 *   doors[]             — ручные двери
 *     { x, y, type: 'inner'|'exit' }
 *   windows[]           — ручные окна
 *     { x, y }
 *   stairs              — прямоугольник ступеней
 *     { x, y, w, h }
 *   exits[]             — выходы наружу (для триггера E)
 *     { x, y, label }
 *   props[]             — мебель
 *     { key, x, y }
 *   spawn               — точка появления { x, y }
 *   fovRadius, ambient  — как было
 *
 * ── Тайлы карты ────────────────────────────────────────────
 *   '#'  стена         (блок движения и обзора)
 *   'W'  окно          (блок движения, НЕ блок обзора)
 *   '+'  дверь внутри  (не блок движения и обзора)
 *   'D'  выход наружу  (не блок)
 *   'S'  ступени       (не блок)
 *   '.'  пол
 *   ' '  пустота (вне комнаты)
 * ────────────────────────────────────────────────────────────
 */
export function buildRoom(desc) {
    const w = desc.w, h = desc.h;
    if (!w || !h) throw new Error('buildRoom: w and h required');

    // 1) Базовая сетка — вся «пустая» (внешний мир)
    const g = Array.from({ length: h }, () => new Array(w).fill(' '));

    // 2) Рамка + пол
    const t = desc.frame?.thickness ?? 1;
    const frameCh = desc.frame?.thin ? '=' : '#';
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const edgeX = x < t || x >= w - t;
            const edgeY = y < t || y >= h - t;
            g[y][x] = (edgeX || edgeY) ? frameCh : '.';
        }
    }

    // 3) Окна в рамке
    const fw = desc.frame?.windows ?? {};
    for (const x of fw.top    ?? []) if (g[0]?.[x] !== undefined)         g[0][x] = 'W';
    for (const x of fw.bottom ?? []) if (g[h - 1]?.[x] !== undefined)     g[h - 1][x] = 'W';
    for (const y of fw.left   ?? []) if (g[y]?.[0] !== undefined)         g[y][0] = 'W';
    for (const y of fw.right  ?? []) if (g[y]?.[w - 1] !== undefined)     g[y][w - 1] = 'W';


    // 4) Подкомнаты: стены + пол + дверь
    for (const r of desc.rooms ?? []) {
        const ch = r.thin ? '=' : '#';

        for (let x = r.x; x < r.x + r.w; x++) {
            if (g[r.y]?.[x] !== undefined)               g[r.y][x] = ch;
            if (g[r.y + r.h - 1]?.[x] !== undefined)     g[r.y + r.h - 1][x] = ch;
        }
        for (let y = r.y; y < r.y + r.h; y++) {
            if (g[y]?.[r.x] !== undefined)               g[y][r.x] = ch;
            if (g[y]?.[r.x + r.w - 1] !== undefined)     g[y][r.x + r.w - 1] = ch;
        }
        for (let y = r.y + 1; y < r.y + r.h - 1; y++) {
            for (let x = r.x + 1; x < r.x + r.w - 1; x++) {
                if (g[y]?.[x] !== undefined) g[y][x] = '.';
            }
        }
        if (r.door) {
            const cx = Math.floor(r.x + r.w / 2);
            const cy = Math.floor(r.y + r.h / 2);
            if (r.door === 'top')    g[r.y][cx] = '+';
            if (r.door === 'bottom') g[r.y + r.h - 1][cx] = '+';
            if (r.door === 'left')   g[cy][r.x] = '+';
            if (r.door === 'right')  g[cy][r.x + r.w - 1] = '+';
        }
    }

    // 5) Ручные стены
    for (const r of desc.walls ?? []) {
        const ch = r.thin ? '=' : '#';
        for (let y = r.y; y < r.y + r.h; y++) {
            for (let x = r.x; x < r.x + r.w; x++) {
                if (g[y]?.[x] !== undefined) g[y][x] = ch;
            }
        }
    }

    // 6) Окна (ручные)
    for (const e of desc.windows ?? []) {
        if (g[e.y]?.[e.x] !== undefined) g[e.y][e.x] = 'W';
    }

    // 7) Двери (ручные)
    for (const e of desc.doors ?? []) {
        if (g[e.y]?.[e.x] === undefined) continue;
        g[e.y][e.x] = (e.type === 'exit') ? 'D' : '+';
    }

    // 8) Лестница
    if (desc.stairs) {
        const s = desc.stairs;
        for (let y = s.y; y < s.y + s.h; y++) {
            for (let x = s.x; x < s.x + s.w; x++) {
                if (g[y]?.[x] === undefined) continue;
                if (g[y][x] === '#') continue;   // не рушим стены
                g[y][x] = 'S';
            }
        }
    }

    // 9) Выходы (проставляем 'D' поверх пола)
    for (const e of desc.exits ?? []) {
        if (g[e.y]?.[e.x] !== undefined) g[e.y][e.x] = 'D';
    }

    // 10) Точка спавна — кладём '.' поверх (на случай, если попала в стену)
    if (desc.spawn) {
        const sp = desc.spawn;
        if (g[sp.y]?.[sp.x] === '#') g[sp.y][sp.x] = '.';
    }

    const map = g.map((row) => row.join(''));

    // ── Двери + стиль/ковёр по комнатам ──────────────────────
    const rooms = (desc.rooms ?? []).map((r) => {
        const cx = Math.floor(r.x + r.w / 2);
        const cy = Math.floor(r.y + r.h / 2);
        let doorTile = null;
        let orientation = 'v';
        if (r.door === 'top')    { doorTile = { tx: cx, ty: r.y };           orientation = 'h'; }
        if (r.door === 'bottom') { doorTile = { tx: cx, ty: r.y + r.h - 1 }; orientation = 'h'; }
        if (r.door === 'left')   { doorTile = { tx: r.x, ty: cy };           orientation = 'v'; }
        if (r.door === 'right')  { doorTile = { tx: r.x + r.w - 1, ty: cy }; orientation = 'v'; }
        return {
            type: r.type ?? 'room',
            x: r.x, y: r.y, w: r.w, h: r.h,
            door: r.door ?? null, doorTile, orientation,
            style:  r.style  ?? 'lilac',   // обои
            carpet: r.carpet ?? null,      // цвет ковра или null
            decor:  r.decor  ?? null,      // ключ настенного декора
        };
    });

    // ── Карта «тайл → индекс комнаты» (для обоев на стенах) ──
    const roomGrid = Array.from({ length: h }, () => new Array(w).fill(-1));
    rooms.forEach((r, i) => {
        for (let y = r.y + 1; y < r.y + r.h - 1; y++)
            for (let x = r.x + 1; x < r.x + r.w - 1; x++) {
                if (roomGrid[y]?.[x] !== undefined) roomGrid[y][x] = i;
            }
    });

    return {
        id:         desc.id,
        title:      desc.title ?? 'КОМНАТА',
        tilePx:     desc.tilePx ?? 16,
        fovRadius:  desc.fovRadius ?? 7,
        ambient:    desc.ambient ?? 0.78,
        wallThickPx: desc.wallThickPx ?? 4,
        wallThinPx:  desc.wallThinPx  ?? 2,
        wallHeightPx: desc.wallHeightPx ?? 22,
        cutawayAlpha: desc.cutawayAlpha,
        map,
        rooms,
        roomGrid,
        corridor:   desc.corridor ?? null,
        stairs:     desc.stairs ?? null,
        props:      desc.props ?? [],
        exits:      desc.exits ?? [],
        spawn:      desc.spawn ?? findFirstFloor(map),
    };
}

function findFirstFloor(map) {
    for (let y = 0; y < map.length; y++) {
        for (let x = 0; x < map[y].length; x++) {
            if (map[y][x] === '.') return { x, y };
        }
    }
    return { x: 1, y: 1 };
}