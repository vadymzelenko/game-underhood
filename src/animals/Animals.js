// src/animals/Animals.js
import { PALETTE as P } from '../utils/Constants.js';

const hex = (n) => '#' + n.toString(16).padStart(6, '0');
const H = {
    BROWN: hex(P.BROWN), DARK_BROWN: hex(P.DARK_BROWN), TAN: hex(P.TAN),
    GRAY: hex(P.GRAY), PURPLE_GRAY: hex(P.PURPLE_GRAY), CREAM: hex(P.CREAM),
    ALMOST_BLACK: hex(P.ALMOST_BLACK), RED: hex(P.RED), DARK_RED: hex(P.DARK_RED),
    ORANGE: hex(P.ORANGE), GOLD: hex(P.GOLD), VERY_DARK: hex(P.VERY_DARK),
    OLIVE: hex(P.OLIVE), OLIVE_GREEN: hex(P.OLIVE_GREEN), YELLOW_GREEN: hex(P.YELLOW_GREEN),
    GREEN: hex(P.GREEN), LIGHT_GREEN: hex(P.LIGHT_GREEN), TEAL: hex(P.TEAL),
    DARK_TEAL: hex(P.DARK_TEAL), DARK_PURPLE: hex(P.DARK_PURPLE),
    MIST_PALE: hex(P.CREAM), YELLOW: hex(P.YELLOW),
};

function px(ctx, x, y, col) { ctx.fillStyle = col; ctx.fillRect(x | 0, y | 0, 1, 1); }
function rect(ctx, x, y, w, h, col) {
    ctx.fillStyle = col;
    ctx.fillRect(Math.round(x), Math.round(y), Math.max(1, w | 0), Math.max(1, h | 0));
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

function applyOutline(ctx, w, h, outlineHex) {
    const img = ctx.getImageData(0, 0, w, h);
    const data = img.data;
    const out = new Uint8ClampedArray(data);
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(outlineHex);
    const r = parseInt(m[1], 16), g = parseInt(m[2], 16), b = parseInt(m[3], 16);
    const A = (x, y) => (x < 0 || y < 0 || x >= w || y >= h) ? 0 : data[(y * w + x) * 4 + 3];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        if (data[i + 3] !== 0) continue;
        if (A(x + 1, y) || A(x - 1, y) || A(x, y + 1) || A(x, y - 1)) {
            out[i] = r; out[i + 1] = g; out[i + 2] = b; out[i + 3] = 255;
        }
    }
    ctx.putImageData(new ImageData(out, w, h), 0, 0);
}

// ── Породы. Каждая рисует кадр «лицом вправо», 64×64 ──────────────
export const SPECIES = {
    deer: {
        frameRate: 4, wanderRadius: 90, speed: 24, fleeSpeed: 55, fleeRadius: 100,
        render(ctx, s, R, cx, gy, tick, variant) {
            const isDark = variant !== 'tan';
            const base = isDark ? H.BROWN : H.TAN;
            const dark = isDark ? H.DARK_BROWN : H.BROWN;
            const grazing = (tick % 12) < 6;
            const bob = grazing && (tick % 2) ? 1 : 0;
            const legLen = R(9), bodyH = R(6), bodyW = R(12);
            const bodyBottom = gy - legLen;
            const bodyTop = bodyBottom - bodyH;

            line(ctx, cx - R(4), bodyBottom, cx - R(4), gy - 1, dark);
            line(ctx, cx + R(4), bodyBottom, cx + R(4), gy - 1, dark);
            line(ctx, cx - R(2), bodyBottom, cx - R(2), gy - 1, base);
            line(ctx, cx + R(6), bodyBottom, cx + R(6), gy - 1, base);

            rect(ctx, cx - R(5), bodyTop, bodyW, bodyH, base);
            rect(ctx, cx - R(5), bodyTop + bodyH - R(2), bodyW - R(1), R(2), dark);
            rect(ctx, cx - R(6), bodyTop + R(1), R(2), R(4), H.CREAM);
            rect(ctx, cx - R(7), bodyTop, R(2), R(3), base);

            let hx = cx + R(7);
            let hy = grazing ? gy - R(7) + bob : bodyTop - R(6);
            line(ctx, cx + R(5), bodyTop + R(2), hx + R(1), hy + R(2), base);
            rect(ctx, hx, hy, R(4), R(3), base);
            px(ctx, hx + R(4), hy + R(1), H.ALMOST_BLACK);
            px(ctx, hx + R(2), hy + R(1), H.ALMOST_BLACK);
            rect(ctx, hx - R(1), hy - R(1), R(1), R(2), dark);

            if (variant === 'buck') {
                line(ctx, hx + R(1), hy - R(1), hx + R(1), hy - R(4), H.CREAM);
                line(ctx, hx + R(1), hy - R(3), hx + R(3), hy - R(5), H.CREAM);
                line(ctx, hx + R(1), hy - R(2), hx - R(1), hy - R(4), H.CREAM);
            }
        },
    },
    hare: {
        frameRate: 8, wanderRadius: 70, speed: 30, fleeSpeed: 70, fleeRadius: 80,
        render(ctx, s, R, cx, gy, tick, variant) {
            const col    = variant === 'brown' ? H.TAN : H.GRAY;
            const shadow = variant === 'brown' ? H.BROWN : H.PURPLE_GRAY;
            const frame = tick % 8;
            let hop = 0, airborne = false;
            if (frame === 1) hop = R(1);
            else if (frame === 2) { hop = R(3); airborne = true; }
            else if (frame === 3) { hop = R(4); airborne = true; }
            else if (frame === 4) hop = R(2); airborne = true;
            const cy = gy - R(5) - hop;

            if (airborne) {
                rect(ctx, cx - R(3), cy + R(3), R(2), R(3), shadow);
                rect(ctx, cx + R(2), cy + R(4), R(2), R(2), col);
            } else {
                rect(ctx, cx - R(3), cy + R(3), R(4), R(2), shadow);
                rect(ctx, cx + R(3), cy + R(4), R(1), R(1), col);
            }
            rect(ctx, cx - R(2), cy, R(6), R(4), col);
            rect(ctx, cx - R(4), cy + R(1), R(2), R(2), H.CREAM);
            rect(ctx, cx + R(3), cy - R(2), R(3), R(3), col);
            px(ctx, cx + R(5), cy - R(1), H.ALMOST_BLACK);

            if (airborne) {
                line(ctx, cx + R(3), cy - R(2), cx, cy - R(2), col);
                line(ctx, cx + R(4), cy - R(2), cx + R(1), cy - R(3), shadow);
            } else {
                const twitch = (frame === 6) ? R(1) : 0;
                line(ctx, cx + R(4), cy - R(2), cx + R(3) - twitch, cy - R(6), col);
                line(ctx, cx + R(5), cy - R(2), cx + R(5) - twitch, cy - R(5), shadow);
            }
        },
    },
    squirrel: {
        frameRate: 12, wanderRadius: 50, speed: 26, fleeSpeed: 60, fleeRadius: 70,
        render(ctx, s, R, cx, gy, tick, variant) {
            const col  = variant === 'brown' ? H.BROWN : H.ORANGE;
            const dark = variant === 'brown' ? H.DARK_BROWN : H.BROWN;
            const belly = H.CREAM;
            const tailUp = (tick % 8) < 4;
            const chew   = (tick % 2) === 0;
            const bodyH = R(5), bodyW = R(4);
            const bodyBottom = gy - R(2);
            const bodyTop = bodyBottom - bodyH;

            if (tailUp) {
                rect(ctx, cx - R(3), bodyTop + R(2), R(2), R(4), col);
                rect(ctx, cx - R(5), bodyTop - R(2), R(3), R(5), dark);
                rect(ctx, cx - R(4), bodyTop - R(5), R(4), R(4), col);
                rect(ctx, cx - R(1), bodyTop - R(6), R(2), R(2), col);
            } else {
                rect(ctx, cx - R(3), bodyTop + R(3), R(2), R(3), col);
                rect(ctx, cx - R(6), bodyTop - R(1), R(3), R(5), dark);
                rect(ctx, cx - R(5), bodyTop - R(4), R(4), R(4), col);
                rect(ctx, cx - R(2), bodyTop - R(5), R(2), R(2), col);
            }
            rect(ctx, cx, bodyTop, bodyW, bodyH, col);
            rect(ctx, cx + R(3), bodyTop, R(1), R(4), belly);
            rect(ctx, cx + R(4), bodyTop + R(1) + (chew ? 1 : 0), R(2), R(1), col);
            px(ctx, cx + R(6), bodyTop + R(1) + (chew ? 1 : 0), H.GOLD);
            rect(ctx, cx + R(2), bodyTop - R(3), R(3), R(3), col);
            px(ctx, cx + R(5), bodyTop - R(2), H.ALMOST_BLACK);
            rect(ctx, cx + R(2), bodyTop - R(5), R(1), R(2), col);
        },
    },
    boar: {
        frameRate: 9, wanderRadius: 80, speed: 20, fleeSpeed: 50, fleeRadius: 100,
        render(ctx, s, R, cx, gy, tick) {
            const body = H.VERY_DARK, mane = H.ALMOST_BLACK, snout = H.DARK_BROWN;
            const cycle = tick % 4;
            const shiftX = (cycle === 1 || cycle === 2) ? R(1) : 0;
            const headBob = (cycle === 0 || cycle === 2) ? R(1) : 0;
            const legH = R(4), bodyH = R(6), bodyW = R(13);
            const bodyBottom = gy - legH;
            const bodyTop = bodyBottom - bodyH;

            ctx.save(); ctx.translate(shiftX, 0);
            line(ctx, cx - R(5), bodyBottom, cx - R(5), gy - 1 - (cycle === 1 ? R(1) : 0), mane);
            line(ctx, cx - R(2), bodyBottom, cx - R(2), gy - 1, mane);
            line(ctx, cx + R(3), bodyBottom, cx + R(3), gy - 1, mane);
            line(ctx, cx + R(6), bodyBottom, cx + R(6), gy - 1 - (cycle === 3 ? R(1) : 0), mane);

            rect(ctx, cx - R(6), bodyTop, bodyW, bodyH, body);
            rect(ctx, cx - R(4), bodyTop - R(2), R(9), R(2), mane);
            rect(ctx, cx - R(6), bodyTop - R(1), R(3), R(1), mane);

            const hy = bodyTop + R(2) + headBob;
            rect(ctx, cx + R(7), hy, R(5), R(4), body);
            rect(ctx, cx + R(11), hy + R(2), R(2), R(2), snout);
            rect(ctx, cx + R(10), hy + R(2), R(1), R(2), H.CREAM);
            px(ctx, cx + R(8), hy + R(1), H.DARK_RED);
            line(ctx, cx - R(6), bodyTop + R(1), cx - R(8), bodyTop - R(1), body);
            line(ctx, cx - R(8), bodyTop - R(1), cx - R(7), bodyTop + R(1), body);
            ctx.restore();
        },
    },

    bird: {
        // Летающая порода. AnimalSprite сам читает flying:true
        // и крутит стейт-машину: полёт → посадка → сидит → взлёт → …
        frameRate: 9,
        wanderRadius: 200,
        speed: 55,
        fleeSpeed: 130,
        fleeRadius: 150,
        flying: true,
        render(ctx, s, R, cx, gy, tick, variant) {
            let headCol, bodyCol, wingCol, bellyCol;
            if (variant === 'tit') {
                headCol = H.ALMOST_BLACK; bodyCol = H.YELLOW_GREEN;
                wingCol = hex(P.DARK_TEAL); bellyCol = H.YELLOW;
            } else if (variant === 'woodpecker') {
                headCol = H.RED; bodyCol = H.ALMOST_BLACK;
                wingCol = H.ALMOST_BLACK; bellyCol = H.CREAM;
            } else {
                headCol = H.DARK_BROWN; bodyCol = H.BROWN;
                wingCol = H.DARK_BROWN; bellyCol = H.TAN;
            }

            // 8 кадров:
            //   0..5 — цикл взмахов (синус)
            //   6    — сидящая птица (крылья сложены, ноги на земле)
            //   7    — момент взлёта (крылья вверх)
            //
            // Канва 64×64, sprite origin (0.5, 0.5) — «центр» птицы
            // для полёта и присады. Сидящая птица ниже, чтобы ноги
            // оказались у нижней кромки канвы.

            if (tick === 6) {
                // ── Сидящая ─────────────────────────────────
                const cy = 46;
                // Лапки
                px(ctx, cx - R(2), cy + R(2), H.GOLD);
                px(ctx, cx + R(2), cy + R(2), H.GOLD);
                px(ctx, cx - R(2), cy + R(3), H.GOLD);
                px(ctx, cx + R(2), cy + R(3), H.GOLD);
                // Хвост вниз-назад
                line(ctx, cx - R(4), cy + R(1), cx - R(8), cy + R(3), wingCol);
                // Тело
                rect(ctx, cx - R(4), cy, R(8), R(3), bodyCol);
                rect(ctx, cx - R(3), cy + R(2), R(6), R(1), bellyCol);
                // Голова
                rect(ctx, cx + R(4), cy - R(2), R(3), R(3), headCol);
                px(ctx, cx + R(7), cy - R(1), H.GOLD);
                px(ctx, cx + R(5), cy - R(1), H.ALMOST_BLACK);
                return;
            }

            if (tick === 7) {
                // ── Взлёт ───────────────────────────────────
                const cy = 34;
                line(ctx, cx - R(5), cy + R(1), cx - R(9), cy + R(2), wingCol);
                rect(ctx, cx - R(5), cy, R(9), R(3), bodyCol);
                rect(ctx, cx - R(5), cy + R(1), R(2), R(2), bellyCol);
                rect(ctx, cx + R(4), cy - R(2), R(3), R(3), headCol);
                px(ctx, cx + R(7), cy, H.GOLD);
                px(ctx, cx + R(5), cy - R(1), H.ALMOST_BLACK);
                // Крылья вверх
                line(ctx, cx - R(1), cy, cx - R(2), cy - R(7), wingCol);
                line(ctx, cx + R(1), cy, cx + R(2), cy - R(7), wingCol);
                return;
            }

            // ── Полёт (кадры 0..5) ──────────────────────────
            const cy = 30;
            const phase = (tick / 6) * Math.PI * 2;
            const wingDy = Math.sin(phase) * R(3);

            // Хвост (рисуем до тела — он за корпусом)
            line(ctx, cx - R(5), cy + R(1), cx - R(10), cy + R(2), wingCol);

            // Нижнее крыло (в противофазе, короткое)
            const lowerDy = -Math.sin(phase) * R(2);
            line(ctx, cx - R(2), cy + R(2), cx - R(4), cy + R(2) + lowerDy, wingCol);

            // Тело
            rect(ctx, cx - R(5), cy, R(9), R(3), bodyCol);
            rect(ctx, cx - R(6), cy + R(1), R(2), R(2), bellyCol);

            // Голова
            rect(ctx, cx + R(4), cy - R(2), R(3), R(3), headCol);
            px(ctx, cx + R(7), cy, H.GOLD);
            px(ctx, cx + R(5), cy - R(1), H.ALMOST_BLACK);

            // Верхнее крыло — машет
            const wingTipY = cy - R(1) + wingDy;
            line(ctx, cx, cy - R(1), cx + R(1), wingTipY, wingCol);
            line(ctx, cx + R(1), wingTipY, cx + R(4), wingTipY, wingCol);
        },
    },

    toad: {
        frameRate: 6, wanderRadius: 30, speed: 12, fleeSpeed: 30, fleeRadius: 50,
        render(ctx, s, R, cx, gy, tick) {
            const mid = H.OLIVE_GREEN, dark = H.OLIVE, pale = H.LIGHT_GREEN;
            const croak = (tick % 6) === 0;
            const bodyH = R(4);
            const bodyBottom = gy - R(1);
            const bodyTop = bodyBottom - bodyH;

            line(ctx, cx - R(2), bodyBottom - R(1), cx - R(4), bodyBottom, dark);
            rect(ctx, cx - R(6), bodyBottom, R(3), R(1), dark);
            rect(ctx, cx - R(4), bodyTop, R(8), bodyH, mid);
            rect(ctx, cx - R(3), bodyTop - R(1), R(6), R(1), mid);
            rect(ctx, cx + R(2), bodyTop + R(1), R(1), R(3), dark);
            px(ctx, cx, bodyTop - R(2), dark);
            px(ctx, cx + R(2), bodyTop - R(2), dark);
            if (croak) rect(ctx, cx + R(4), bodyTop, R(3), R(3), pale);
            else       rect(ctx, cx + R(4), bodyTop + R(1), R(1), R(2), pale);
        },
    },
};

const FRAMES = 8;
const FRAME_W = 64, FRAME_H = 64;

/** Отрисовка одного кадра в canvas 64×64. */
function renderFrame(speciesKey, variant, size, frameTick) {
    const cv = document.createElement('canvas');
    cv.width = FRAME_W; cv.height = FRAME_H;
    const ctx = cv.getContext('2d');
    const s = size === 'large' ? 1.3 : size === 'small' ? 0.85 : 1.0;
    const R = (v) => Math.max(1, Math.round(v * s));
    const spec = SPECIES[speciesKey];
    spec.render(ctx, s, R, FRAME_W / 2, FRAME_H - 4, frameTick, variant);
    applyOutline(ctx, FRAME_W, FRAME_H, hex(P.DARK_PURPLE));
    return cv;
}

/** Собирает и кэширует спрайт-шит (8 кадров в ряд). */
const _sheetCache = new Map();
export function getAnimalSheet(scene, speciesKey, variant, size) {
    const key = `animal_${speciesKey}_${variant ?? 'default'}_${size}`;
    if (_sheetCache.has(key)) return { key, ..._sheetCache.get(key) };

    const cv = document.createElement('canvas');
    cv.width = FRAME_W * FRAMES;
    cv.height = FRAME_H;
    const ctx = cv.getContext('2d');
    for (let i = 0; i < FRAMES; i++) {
        const frame = renderFrame(speciesKey, variant, size, i);
        ctx.drawImage(frame, i * FRAME_W, 0);
    }

    if (scene.textures.exists(key)) scene.textures.remove(key);
    const tex = scene.textures.addCanvas(key, cv);
    // Нарезаем кадры вручную — как в AssetLoader._sliceFrames
    for (let i = 0; i < FRAMES; i++) {
        tex.add(i, 0, i * FRAME_W, 0, FRAME_W, FRAME_H);
    }

    const info = { frames: FRAMES, frameWidth: FRAME_W, frameHeight: FRAME_H };
    _sheetCache.set(key, info);
    return { key, ...info };
}