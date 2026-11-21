export const lerp  = (a, b, t) => a + (b - a) * t;
export const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

export function hash2D(x, y, seed = 0) {
    let h = Math.imul(x | 0, 374761393)
        ^ Math.imul(y | 0, 668265263)
        ^ Math.imul(seed | 0, 1274126177);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h = h ^ (h >>> 16);
    return (h >>> 0) / 4294967295;
}