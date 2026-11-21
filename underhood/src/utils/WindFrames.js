/**
 * Ветровые варианты текстуры + глитч пикселей листвы.
 *
 * Каждая строка выше groundLine сдвигается по X (синусоида + per-row
 * джиттер). Дополнительно случайные «зелёные» пиксели перекрашиваются
 * в другие оттенки из палитры — визуально это выглядит как мелкое
 * мигание листвы при переключении текстуры.
 *
 * Все параметры задаются в TUNING.wind (см. TuningConfig.js).
 */
import { TUNING } from '../config/TuningConfig.js';
import { PALETTE as NUM_PALETTE } from './Constants.js';

// ─────────────────────────────────────────────────────────────
//  Хеш и палитра
// ─────────────────────────────────────────────────────────────
function hash3(x, y, z) {
    let h = Math.imul(x | 0, 374761393)
        ^ Math.imul(y | 0, 668265263)
        ^ Math.imul(z | 0, 1442695041);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

const _glitchColorCache = new Map();
function resolveGlitchColors(names) {
    if (!names || !names.length) return [[255, 0, 255]];
    const key = names.join('|');
    let arr = _glitchColorCache.get(key);
    if (arr) return arr;
    arr = names.map((n) => {
        const v = NUM_PALETTE[n];
        if (v == null) return [255, 0, 255];
        return [(v >>> 16) & 0xff, (v >>> 8) & 0xff, v & 0xff];
    });
    _glitchColorCache.set(key, arr);
    return arr;
}

// ─────────────────────────────────────────────────────────────
//  Генерация вариантов
// ─────────────────────────────────────────────────────────────
export function makeWindVariants(srcCanvas, count = 6, opts = {}) {
    const W = srcCanvas.width;
    const H = srcCanvas.height;

    const amp        = opts.amp        ?? 4.0;
    const freq       = opts.freq       ?? 0.20;
    const jitter     = opts.jitter     ?? 1.0;
    const groundLine = opts.groundLine ?? 0.95;
    const glitch     = opts.glitch     ?? null;
    const glitchOn   = !!(glitch && glitch.enabled);

    const sctx = srcCanvas.getContext('2d', { willReadFrequently: true });
    const srcData = sctx.getImageData(0, 0, W, H).data;
    const groundY = Math.max(2, H * groundLine);

    const glitchColors = glitchOn ? resolveGlitchColors(glitch.palette) : null;
    const glitchChance = glitch?.chance   ?? 0.06;
    const glitchMinY   = glitch?.minYFrac ?? 0.0;
    const glitchGBias  = glitch?.greenBias ?? 5;
    const glitchMinG   = glitch?.minGreen  ?? 40;

    const out = [];
    for (let f = 0; f < count; f++) {
        const dst = document.createElement('canvas');
        dst.width = W;
        dst.height = H;
        const dctx = dst.getContext('2d');
        const img = dctx.createImageData(W, H);
        const dd = img.data;

        const phase = (f / count) * Math.PI * 2;
        // Общий дрейф кадра — чтобы фазы не выглядели сдвинутыми на одинаковый шаг.
        const frameDrift = (hash3(f, 17, 31) - 0.5) * jitter * 0.5;

        for (let y = 0; y < H; y++) {
            const influence = Math.max(0, 1 - y / groundY);
            const rowOff = y * W * 4;
            const doShift  = influence > 0.001;
            const doGlitch = glitchOn && (y / H) >= glitchMinY;

            // ── Сдвиг строки ────────────────────────────────
            if (!doShift) {
                dd.set(srcData.subarray(rowOff, rowOff + W * 4), rowOff);
            } else {
                const rowJit = (hash3(f, y, 7) - 0.5) * jitter;
                const sway = Math.sin(y * freq + phase);
                const shaped = Math.sign(sway) * Math.pow(Math.abs(sway), 0.7);
                const shift = Math.round(shaped * amp * influence + rowJit + frameDrift);

                if (shift === 0) {
                    dd.set(srcData.subarray(rowOff, rowOff + W * 4), rowOff);
                } else {
                    for (let x = 0; x < W; x++) {
                        const si = rowOff + x * 4;
                        if (srcData[si + 3] === 0) continue;   // прозрачный
                        const nx = x + shift;
                        if (nx < 0 || nx >= W) continue;        // за границей
                        const di = rowOff + nx * 4;
                        dd[di]     = srcData[si];
                        dd[di + 1] = srcData[si + 1];
                        dd[di + 2] = srcData[si + 2];
                        dd[di + 3] = srcData[si + 3];
                    }
                }
            }

            // ── Глитч ───────────────────────────────────────
            if (doGlitch) {
                for (let x = 0; x < W; x++) {
                    const di = rowOff + x * 4;
                    if (dd[di + 3] === 0) continue;

                    const r = dd[di], g = dd[di + 1], b = dd[di + 2];
                    // Фильтр «это листва, а не ствол/контур»
                    if (!(g > r + glitchGBias && g > b + glitchGBias && g > glitchMinG)) continue;

                    if (hash3(x, y, f * 31 + 11) < glitchChance) {
                        const ci = Math.floor(
                            hash3(x + 17, y + 5, f * 13 + 3) * glitchColors.length
                        );
                        const c = glitchColors[ci];
                        dd[di]     = c[0];
                        dd[di + 1] = c[1];
                        dd[di + 2] = c[2];
                    }
                }
            }
        }

        dctx.putImageData(img, 0, 0);
        out.push(dst);
    }
    return out;
}

// ─────────────────────────────────────────────────────────────
//  Резолвер конфига
// ─────────────────────────────────────────────────────────────
/**
 * Возвращает объект настроек ветра для конкретного ключа текстуры
 * или null, если текстура не качается.
 *
 * Логика: берём TUNING.wind.defaults, поверх накладываем config
 * первого совпавшего правила из TUNING.wind.types, и в конце
 * приклеиваем общий TUNING.wind.glitch.
 */
export function windConfigFor(key) {
    const cfg = TUNING.wind;
    if (!cfg || cfg.enabled === false) return null;

    const defaults = cfg.defaults || {};
    const types = cfg.types || [];

    for (const entry of types) {
        if (!entry || typeof entry.match !== 'string') continue;
        if (key.startsWith(entry.match)) {
            if (entry.config == null) return null;
            return {
                ...defaults,
                ...entry.config,
                glitch: cfg.glitch,
            };
        }
    }
    return null;
}