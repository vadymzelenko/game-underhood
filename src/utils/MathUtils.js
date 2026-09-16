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

// Только из палитры: легкое осветление/затемнение через 2 цвета палитры
export function pickVariantColor(base, variant) {
    // variant: 0..1 — используется для выбора между двумя цветами палитры
    return variant > 0.5 ? base : base; // заглушка — расширяется при желании
}