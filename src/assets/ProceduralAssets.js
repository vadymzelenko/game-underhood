import { PALETTE as P } from '../utils/Constants.js';

// =====================================================================
//  HELPERS
// =====================================================================
const HEX = {};
for (const k in P) HEX[k] = '#' + P[k].toString(16).padStart(6, '0');

const hexToRgb = (hex) => {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return m ? [parseInt(m[1],16), parseInt(m[2],16), parseInt(m[3],16), 255] : [0,0,0,0];
};
const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = (v) => v < 0 ? 0 : v > 1 ? 1 : v;

function mulberry32(seed) {
    let s = seed >>> 0;
    return () => {
        s = (s + 0x6D2B79F5) | 0;
        let t = Math.imul(s ^ (s >>> 15), 1 | s);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

const hash2 = (x, y, seed) => {
    let h = Math.imul(x|0, 374761393) + Math.imul(y|0, 668265263) + Math.imul(seed|0, 1442695041);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

const vnoise = (x, y, seed = 0) => {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const u = xf*xf*(3 - 2*xf), v = yf*yf*(3 - 2*yf);
    const a = hash2(xi,   yi,   seed);
    const b = hash2(xi+1, yi,   seed);
    const c = hash2(xi,   yi+1, seed);
    const d = hash2(xi+1, yi+1, seed);
    return a*(1-u)*(1-v) + b*u*(1-v) + c*(1-u)*v + d*u*v;
};

const fbm = (x, y, oct = 4, seed = 0) => {
    let s = 0, amp = 1, freq = 1, norm = 0;
    for (let i = 0; i < oct; i++) {
        s += amp * vnoise(x * freq, y * freq, seed + i * 71);
        norm += amp; amp *= 0.5; freq *= 2;
    }
    return s / norm;
};

const BAYER4 = [
    [ 0,  8,  2, 10],
    [12,  4, 14,  6],
    [ 3, 11,  1,  9],
    [15,  7, 13,  5],
];
const bayer = (x, y) => (BAYER4[y & 3][x & 3] + 0.5) / 16;
function pick4(v, c1, c2, c3, c4, x, y, softness = 0.28) {
    const d = (bayer(x, y) - 0.5) * softness;
    const vv = v + d;
    if (vv > 0.72) return c1;
    if (vv > 0.48) return c2;
    if (vv > 0.24) return c3;
    return c4;
}

// =====================================================================
//  СХЕМЫ КРОНЫ
// =====================================================================
const CANOPY_SCHEMES = {
    oak_green:    { HIGH: HEX.YELLOW_GREEN, BASE: HEX.GREEN,       SHADOW1: HEX.TEAL,        SHADOW2: HEX.DARK_TEAL },
    pine_green:   { HIGH: HEX.GREEN,        BASE: HEX.TEAL,        SHADOW1: HEX.DARK_TEAL,   SHADOW2: HEX.DARK_PURPLE },
    spruce_green: { HIGH: HEX.OLIVE_GREEN,  BASE: HEX.TEAL,        SHADOW1: HEX.DARK_TEAL,   SHADOW2: HEX.ALMOST_BLACK },
    birch_green:  { HIGH: HEX.CREAM,        BASE: HEX.LIGHT_GREEN, SHADOW1: HEX.GREEN,       SHADOW2: HEX.TEAL },
    autumn_gold:  { HIGH: HEX.YELLOW,       BASE: HEX.GOLD,        SHADOW1: HEX.ORANGE,      SHADOW2: HEX.DARK_RED },
    autumn_red:   { HIGH: HEX.ORANGE,       BASE: HEX.RED,         SHADOW1: HEX.DARK_RED,    SHADOW2: HEX.DARK_PURPLE2 },
    dead:         { HIGH: HEX.TAN,          BASE: HEX.GRAY,        SHADOW1: HEX.PURPLE_GRAY, SHADOW2: HEX.DARK_PURPLE },
    bush_green:   { HIGH: HEX.YELLOW_GREEN, BASE: HEX.OLIVE_GREEN, SHADOW1: HEX.GREEN,       SHADOW2: HEX.TEAL },
    bush_berry:   { HIGH: HEX.LIGHT_GREEN,  BASE: HEX.GREEN,       SHADOW1: HEX.TEAL,        SHADOW2: HEX.DARK_TEAL },
};
const resolveScheme = (scheme) => {
    const out = {};
    for (const k in scheme) out[k] = hexToRgb(scheme[k]);
    return out;
};

// =====================================================================
//  OUTLINE (sel-out)
// =====================================================================
function applyOutline(ctx, w, h, outlineHex) {
    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;
    const resultData = new Uint8ClampedArray(data);
    const [r, g, b] = hexToRgb(outlineHex);

    const getA = (x, y) => (x < 0 || x >= w || y < 0 || y >= h)
        ? 0 : data[(y * w + x) * 4 + 3];

    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const idx = (y * w + x) * 4;
            if (data[idx + 3] === 0) {
                if (getA(x + 1, y) > 0 || getA(x - 1, y) > 0 ||
                    getA(x, y + 1) > 0 || getA(x, y - 1) > 0) {
                    resultData[idx]     = r;
                    resultData[idx + 1] = g;
                    resultData[idx + 2] = b;
                    resultData[idx + 3] = 255;
                }
            }
        }
    }
    ctx.putImageData(new ImageData(resultData, w, h), 0, 0);
}

// =====================================================================
//  BASE GENERATOR (seeded RNG)
// =====================================================================
class BaseGen {
    constructor(w, h, seed) {
        this.width = w; this.height = h;
        this.canvas = document.createElement('canvas');
        this.canvas.width = w;
        this.canvas.height = h;
        this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
        this.seed = seed | 0;
        this._rng = mulberry32(this.seed);
    }
    rand(a = 0, b = 1) { return a + this._rng() * (b - a); }
}

// =====================================================================
//  TREE GENERATOR
// =====================================================================
class TreeGenerator extends BaseGen {
    generate(type = 'oak', size = 'medium', variant = 'green') {
        this.type = type;
        this.size = size;
        this.variant = variant;
        this.branches = [];
        this.collarClusters = [];

        const cx = this.width / 2;
        const bottomY = this.height - 4;
        this.bottomY = bottomY;
        this.centerX = cx;

        let trunkW, trunkH;

        if (type === 'oak') {
            const isLarge = size === 'large';
            trunkW = isLarge ? this.rand(7, 10) : this.rand(5, 7);
            trunkH = isLarge ? this.rand(18, 22) : this.rand(12, 15);
            this.trunk = {
                x: cx - trunkW/2, y: bottomY - trunkH, w: trunkW, h: trunkH,
                color: HEX.BROWN, shadow: HEX.DARK_BROWN,
                kind: 'oak', taper: 0.62,
            };
            this.buildOakBranches(cx, bottomY - trunkH, trunkW, size, HEX.BROWN, HEX.DARK_BROWN);
            this.clusters = this.getOakClusters(cx, bottomY - trunkH, size);
            this.buildCollar(cx, bottomY - trunkH, trunkW, HEX.DARK_BROWN, this.rand(2.4, 3.4));
            this.scheme = resolveScheme(CANOPY_SCHEMES['oak_green']);
        }
        else if (type === 'deadtree') {
            const isLarge = size === 'large';
            trunkW = isLarge ? this.rand(6, 9) : this.rand(4, 6);
            trunkH = isLarge ? this.rand(24, 30) : this.rand(16, 22);
            this.trunk = {
                x: cx - trunkW/2, y: bottomY - trunkH, w: trunkW, h: trunkH,
                color: HEX.VERY_DARK, shadow: HEX.ALMOST_BLACK,
                kind: 'dead', taper: 0.45,
            };
            this.branches = [];
            this.clusters = [];
            this.scheme = resolveScheme(CANOPY_SCHEMES['dead']);
        }
        else if (type === 'pine') {
            const isLarge = size === 'large';
            trunkW = isLarge ? 5 : 4;
            trunkH = isLarge ? 30 : 22;
            this.trunk = {
                x: cx - trunkW/2, y: bottomY - trunkH, w: trunkW, h: trunkH,
                color: HEX.DARK_BROWN, shadow: HEX.VERY_DARK,
                kind: 'oak', taper: 0.72,
            };
            this.clusters = this.getPineClusters(cx, bottomY - trunkH, size);
            this.buildCollar(cx, bottomY - trunkH, trunkW, HEX.VERY_DARK, this.rand(1.4, 2.0));
            this.scheme = resolveScheme(CANOPY_SCHEMES['pine_green']);
        }
        else if (type === 'spruce') {
            const isLarge = size === 'large';
            trunkW = isLarge ? 5 : 4;
            trunkH = isLarge ? 8 : 5;
            this.trunk = {
                x: cx - trunkW/2, y: bottomY - trunkH, w: trunkW, h: trunkH,
                color: HEX.VERY_DARK, shadow: HEX.ALMOST_BLACK,
                kind: 'oak', taper: 0.8,
            };
            this.clusters = this.getSpruceClusters(cx, bottomY, size);
            this.scheme = resolveScheme(CANOPY_SCHEMES['spruce_green']);
        }
        else if (type === 'birch') {
            const isLarge = size === 'large';
            trunkW = isLarge ? 4 : 3;
            trunkH = isLarge ? 22 : 15;
            this.trunk = {
                x: cx - trunkW/2, y: bottomY - trunkH, w: trunkW, h: trunkH,
                kind: 'birch', taper: 0.85,
            };
            this.clusters = this.getBirchClusters(cx, bottomY - trunkH, size);
            this.buildCollar(cx, bottomY - trunkH, trunkW, HEX.GRAY, this.rand(1.2, 1.8));
            this.scheme = resolveScheme(CANOPY_SCHEMES[variant === 'green' ? 'birch_green' : variant]);
        }

        this.render();
        return this.canvas;
    }

    buildOakBranches(cx, trunkTopY, trunkW, size, color, shadowColor) {
        const count = size === 'large' ? 3 : 2;
        const baseW = Math.max(2, trunkW * 0.7);
        for (let i = 0; i < count; i++) {
            const t = count === 1 ? 0.5 : i / (count - 1);
            const spread = (t - 0.5) * 2;
            const angle = -Math.PI / 2 + spread * 0.8;
            const len = (size === 'large' ? 13 : 9) * this.rand(0.85, 1.15);
            const x0 = cx + spread * trunkW * 0.15;
            const y0 = trunkTopY + this.rand(1, 3);
            const x1 = x0 + Math.cos(angle) * len;
            const y1 = y0 + Math.sin(angle) * len;
            const pts = this.makeTwistedCurve(x0, y0, x1, y1, 1.0, 3.0);
            this.branches.push({ pts, w0: baseW, color, shadowColor });
        }
        if (size === 'large') {
            for (let i = 0; i < 2; i++) {
                const side = i === 0 ? -1 : 1;
                const angle = -Math.PI / 2 + side * 1.15;
                const len = 6 * this.rand(0.8, 1.2);
                const x0 = cx + side * trunkW * 0.6;
                const y0 = trunkTopY - 1;
                const x1 = x0 + Math.cos(angle) * len;
                const y1 = y0 + Math.sin(angle) * len;
                const pts = this.makeTwistedCurve(x0, y0, x1, y1, 0.7, 1.8);
                this.branches.push({ pts, w0: Math.max(2, baseW * 0.7), color, shadowColor });
            }
        }
    }

    makeTwistedCurve(x0, y0, x1, y1, bendScale = 1, bendMax = 2.5) {
        const dx = x1 - x0, dy = y1 - y0;
        const len = Math.hypot(dx, dy) || 1;
        const px = -dy / len, py = dx / len;
        const segs = 5;
        const pts = [{ x: x0, y: y0 }];
        const waves = this.rand(1.2, 2.2);
        for (let k = 1; k < segs; k++) {
            const s = k / segs;
            const wave = Math.sin(s * Math.PI * waves) * bendMax * bendScale * (1 - s * 0.35);
            pts.push({
                x: lerp(x0, x1, s) + px * wave,
                y: lerp(y0, y1, s) + py * wave,
            });
        }
        pts.push({ x: x1, y: y1 });
        return pts;
    }

    buildCollar(cx, trunkTopY, trunkW, barkColor, radiusScale) {
        const n = 3;
        for (let i = 0; i < n; i++) {
            const angle = this.rand(0, Math.PI * 2);
            const dist = trunkW * this.rand(0.15, 0.4);
            this.collarClusters.push({
                x: cx + Math.cos(angle) * dist,
                y: trunkTopY + this.rand(-1, 2),
                r: trunkW * radiusScale * this.rand(0.35, 0.55),
                color: hexToRgb(barkColor),
            });
        }
    }

    render() {
        this.ctx.clearRect(0, 0, this.width, this.height);
        this.drawTrunkShape();
        this.drawBranches();
        this.renderCollar();
        this.renderCanopy();
        applyOutline(this.ctx, this.width, this.height, HEX.DARK_PURPLE);
    }

    drawTrunkShape() {
        const t = this.trunk;
        if (t.kind === 'birch') this.drawBirchTrunk(t.x, t.y, t.w, t.h);
        else if (t.kind === 'dead') this.drawDeadTrunk(t.x, t.y, t.w, t.h, t.taper ?? 0.4);
        else this.drawTrunk(t.x, t.y, t.w, t.h, t.color, t.shadow, t.taper ?? 0.6);
    }

    // ВАЖНО: taper — доля ширины у ВЕРХА (низ всегда полный w).
    drawTrunk(x, y, w, h, color, shadowColor, taper = 0.6) {
        const col = hexToRgb(color);
        const shCol = hexToRgb(shadowColor);
        const seed = this.seed;
        for (let row = 0; row < h; row++) {
            const t = row / (h - 1 || 1);
            const widthT = taper + (1 - taper) * t;   // ← низ шире верха
            const rowW = Math.max(1, Math.round(w * widthT));
            const rowX = Math.round(x + (w - rowW) / 2);
            for (let i = 0; i < rowW; i++) {
                const e = i / Math.max(1, rowW - 1);
                let c = col;
                if (e > 0.72) c = shCol;
                const n = fbm((rowX + i) * 0.9, row * 0.25, 2, seed + 7);
                if (n > 0.63 && e > 0.25) c = shCol;
                this.ctx.fillStyle = `rgb(${c[0]},${c[1]},${c[2]})`;
                this.ctx.fillRect(rowX + i, y + row, 1, 1);
            }
        }
        // Root flare
        const flareW = Math.round(w * 1.55);
        for (let r = 0; r < 2; r++) {
            const t = r;
            const fw = Math.round(lerp(w, flareW, 1 - t));
            const fx = Math.round(x + (w - fw) / 2);
            this.ctx.fillStyle = color;
            this.ctx.fillRect(fx, y + h - 2 + r, fw, 1);
            const sw = Math.max(1, Math.round(fw * 0.3));
            this.ctx.fillStyle = shadowColor;
            this.ctx.fillRect(fx + fw - sw, y + h - 2 + r, sw, 1);
        }
    }

    drawDeadTrunk(x, y, w, h, taper = 0.45) {
        const base = hexToRgb(HEX.VERY_DARK);
        const shadowCol = hexToRgb(HEX.ALMOST_BLACK);
        const accentBrown = hexToRgb(HEX.DARK_BROWN);
        const accentBrown2 = hexToRgb(HEX.BROWN);
        const seed = this.seed;

        for (let row = 0; row < h; row++) {
            const t = row / (h - 1 || 1);
            const widthT = taper + (1 - taper) * t;
            const rowW = Math.max(1, Math.round(w * widthT));
            const rowX = Math.round(x + (w - rowW) / 2);
            for (let i = 0; i < rowW; i++) {
                const e = i / Math.max(1, rowW - 1);
                let c = base;
                if (e > 0.68) c = shadowCol;
                const n  = fbm((rowX + i) * 0.9, row * 0.3, 3, seed + 7);
                const n2 = vnoise((rowX + i) * 1.5, row * 0.55, seed + 19);
                if (n2 > 0.84) c = accentBrown2;
                else if (n > 0.7 && e > 0.15 && e < 0.7) c = accentBrown;
                else if (n > 0.75) c = shadowCol;
                else if (n < 0.26 && e < 0.6) c = accentBrown;
                this.ctx.fillStyle = `rgb(${c[0]},${c[1]},${c[2]})`;
                this.ctx.fillRect(rowX + i, y + row, 1, 1);
            }
            if (row % 5 === 0 && hash2(0, row, seed) > 0.5) {
                const cw = Math.max(1, Math.floor(rowW * 0.2));
                const cx2 = rowX + Math.floor(hash2(row, 3, seed) * (rowW - cw));
                this.ctx.fillStyle = `rgb(${shadowCol[0]},${shadowCol[1]},${shadowCol[2]})`;
                this.ctx.fillRect(cx2, y + row, cw, 1);
            }
        }
        // Рваный верх
        const topW = Math.max(2, Math.round(w * taper));
        const topX = Math.round(x + (w - topW) / 2);
        const spikes = 3 + Math.floor(this.rand(0, 3));
        for (let i = 0; i < spikes; i++) {
            const sx = topX + Math.floor(this.rand(-1, topW + 1));
            const sh = 1 + Math.floor(this.rand(0, 2));
            const c = hash2(i, 7, seed) > 0.5 ? base : accentBrown;
            this.ctx.fillStyle = `rgb(${c[0]},${c[1]},${c[2]})`;
            this.ctx.fillRect(sx, y - sh, 1, sh + 1);
        }
        this.ctx.fillStyle = `rgb(${shadowCol[0]},${shadowCol[1]},${shadowCol[2]})`;
        this.ctx.fillRect(topX, y, topW, 1);

        // Root flare
        const flareW = Math.round(w * 1.6);
        for (let r = 0; r < 2; r++) {
            const t = r;
            const fw = Math.round(lerp(w, flareW, 1 - t));
            const fx = Math.round(x + (w - fw) / 2);
            this.ctx.fillStyle = `rgb(${base[0]},${base[1]},${base[2]})`;
            this.ctx.fillRect(fx, y + h - 2 + r, fw, 1);
            const sw = Math.max(1, Math.round(fw * 0.3));
            this.ctx.fillStyle = `rgb(${shadowCol[0]},${shadowCol[1]},${shadowCol[2]})`;
            this.ctx.fillRect(fx + fw - sw, y + h - 2 + r, sw, 1);
        }
        this.ctx.fillStyle = `rgb(${shadowCol[0]},${shadowCol[1]},${shadowCol[2]})`;
        this.ctx.fillRect(Math.round(x - 2), y + h - 1, 2, 1);
        this.ctx.fillRect(Math.round(x + w), y + h - 1, 2, 1);
    }

    drawBirchTrunk(x, y, w, h) {
        const seed = this.seed;
        for (let row = 0; row < h; row++) {
            const t = row / (h - 1 || 1);
            const rowW = Math.max(1, Math.round(w * (0.85 + 0.15 * t)));
            const rowX = Math.round(x + (w - rowW) / 2);
            for (let i = 0; i < rowW; i++) {
                const e = i / Math.max(1, rowW - 1);
                const base = e > 0.65 ? HEX.GRAY : HEX.TAN;
                this.ctx.fillStyle = base;
                this.ctx.fillRect(rowX + i, y + row, 1, 1);
            }
            if (hash2(row, 13, seed) > 0.72) {
                const stripeW = Math.max(1, Math.floor(rowW * (0.3 + hash2(row, 47, seed) * 0.6)));
                const sx = rowX + Math.floor(hash2(row, 91, seed) * (rowW - stripeW));
                this.ctx.fillStyle = HEX.ALMOST_BLACK;
                this.ctx.fillRect(sx, y + row, stripeW, 1);
            }
        }
    }

    drawBranches() {
        for (const b of this.branches) {
            const pts = b.pts;
            let totalLen = 0;
            for (let i = 1; i < pts.length; i++) {
                totalLen += Math.hypot(pts[i].x - pts[i-1].x, pts[i].y - pts[i-1].y);
            }
            let accLen = 0;
            for (let s = 0; s < pts.length - 1; s++) {
                const p0 = pts[s], p1 = pts[s + 1];
                const segLen = Math.hypot(p1.x - p0.x, p1.y - p0.y);
                const steps = Math.max(2, Math.round(segLen * 2));
                for (let k = 0; k <= steps; k++) {
                    const t = k / steps;
                    const gt = totalLen > 0 ? (accLen + segLen * t) / totalLen : 0;
                    const x = lerp(p0.x, p1.x, t);
                    const y = lerp(p0.y, p1.y, t);
                    const th = Math.max(1, Math.round(b.w0 * (1 - gt * 0.7)));
                    for (let kk = -Math.floor(th/2); kk <= Math.floor(th/2); kk++) {
                        const isShadow = kk > 0 && th > 1;
                        this.ctx.fillStyle = isShadow ? b.shadowColor : b.color;
                        this.ctx.fillRect(Math.round(x), Math.round(y + kk), 1, 1);
                    }
                }
                accLen += segLen;
            }
        }
    }

    renderCollar() {
        if (!this.collarClusters.length) return;
        for (const c of this.collarClusters) {
            const r = Math.round(c.r);
            this.ctx.fillStyle = `rgb(${c.color[0]},${c.color[1]},${c.color[2]})`;
            for (let y = -r; y <= Math.round(r * 0.55); y++) {
                const base = Math.sqrt(Math.max(0, r * r - y * y));
                const jitter = (fbm((c.x + y * 1.7) * 0.5, y * 0.7, 2, this.seed + 3) - 0.5) * 1.6;
                const rowW = base + jitter;
                if (rowW <= 0) continue;
                this.ctx.fillRect(Math.round(c.x - rowW), Math.round(c.y + y), Math.round(rowW * 2), 1);
            }
        }
    }

    getOakClusters(cx, trunkTopY, size) {
        const clusters = [];
        if (size === 'large') {
            const centers = [
                { x: cx - 9, y: trunkTopY + 1 },
                { x: cx + 9, y: trunkTopY + 3 },
                { x: cx,     y: trunkTopY - 9 },
                { x: cx - 4, y: trunkTopY - 3 },
                { x: cx + 5, y: trunkTopY - 5 },
            ];
            centers.forEach(c => {
                clusters.push({ x: c.x, y: c.y, r: this.rand(7, 10) });
                const extra = 2 + Math.floor(this.rand(0, 2));
                for (let i = 0; i < extra; i++) {
                    const angle = this.rand(0, Math.PI * 2);
                    const dist = this.rand(4, 8);
                    clusters.push({ x: c.x + Math.cos(angle) * dist,
                        y: c.y + Math.sin(angle) * dist * 0.7,
                        r: this.rand(4.5, 7) });
                }
            });
        } else {
            clusters.push({ x: cx,     y: trunkTopY - 2, r: this.rand(8, 10) });
            clusters.push({ x: cx - 5, y: trunkTopY,     r: this.rand(5, 7) });
            clusters.push({ x: cx + 5, y: trunkTopY - 1, r: this.rand(5, 7) });
            for (let i = 0; i < 4; i++) {
                const angle = this.rand(0, Math.PI * 2);
                const dist = this.rand(4, 7);
                clusters.push({ x: cx + Math.cos(angle) * dist,
                    y: trunkTopY - 2 + Math.sin(angle) * dist * 0.7,
                    r: this.rand(4, 6) });
            }
        }
        return clusters;
    }

    getPineClusters(cx, trunkTopY, size) {
        const clusters = [];
        const tiers = size === 'large' ? 4 : 3;
        let y = trunkTopY + (size === 'large' ? 8 : 5);
        let maxW = size === 'large' ? 12 : 9;
        for (let i = 0; i < tiers; i++) {
            const count = 3 + Math.floor(this.rand(0, 3));
            for (let j = 0; j < count; j++) {
                const tx = count === 1 ? 0 : (j / (count - 1)) * 2 - 1;
                const x = cx + tx * maxW * this.rand(0.7, 1.05);
                clusters.push({ x, y: y + this.rand(-2, 2),
                    r: this.rand(maxW * 0.45, maxW * 0.68), tier: i });
            }
            y -= this.rand(5, 7);
            maxW *= 0.72;
        }
        return clusters;
    }

    getSpruceClusters(cx, bottomY, size) {
        const clusters = [];
        const levels = size === 'large' ? 10 : 7;
        const totalH = size === 'large' ? 46 : 32;
        const baseW = size === 'large' ? 15 : 11;
        for (let i = 0; i < levels; i++) {
            const t = i / (levels - 1);
            const y = bottomY - 4 - t * totalH;
            const w = baseW * (1 - t * 0.9);
            const count = Math.max(2, Math.round(3 + w * 0.22));
            for (let j = 0; j < count; j++) {
                const tx = count === 1 ? 0 : (j / (count - 1)) * 2 - 1;
                const x = cx + tx * w * this.rand(0.55, 0.95);
                clusters.push({ x, y: y + this.rand(-1.5, 1.5),
                    r: this.rand(w * 0.33, w * 0.5), tier: i });
            }
        }
        return clusters;
    }

    getBirchClusters(cx, trunkTopY, size) {
        const clusters = [];
        const num = size === 'large' ? 6 : 4;
        clusters.push({ x: cx, y: trunkTopY - 4, r: this.rand(5.5, 7.5) });
        for (let i = 0; i < num; i++) {
            const angle = this.rand(0, Math.PI * 2);
            const dist = this.rand(3, 6);
            clusters.push({
                x: cx + Math.cos(angle) * dist,
                y: trunkTopY - 4 + Math.sin(angle) * dist * 0.85,
                r: this.rand(3.5, 5.5),
            });
        }
        return clusters;
    }

    renderCanopy() {
        if (!this.clusters || !this.clusters.length) return;
        const clusters = this.clusters;
        const colors = this.scheme;
        const img = this.ctx.getImageData(0, 0, this.width, this.height);
        const data = img.data;
        const seed = this.seed;

        let minX = this.width, minY = this.height, maxX = 0, maxY = 0;
        for (const c of clusters) {
            if (c.x - c.r < minX) minX = Math.floor(c.x - c.r - 3);
            if (c.y - c.r < minY) minY = Math.floor(c.y - c.r - 3);
            if (c.x + c.r > maxX) maxX = Math.ceil(c.x + c.r + 3);
            if (c.y + c.r > maxY) maxY = Math.ceil(c.y + c.r + 3);
        }
        minX = Math.max(0, minX); minY = Math.max(0, minY);
        maxX = Math.min(this.width, maxX); maxY = Math.min(this.height, maxY);
        const bw = maxX - minX, bh = maxY - minY;
        if (bw <= 0 || bh <= 0) { this.ctx.putImageData(img, 0, 0); return; }

        const SDF = new Float32Array(bw * bh);
        for (let j = 0; j < bh; j++) {
            for (let i = 0; i < bw; i++) {
                const x = minX + i, y = minY + j;
                let d = Infinity;
                for (const c of clusters) {
                    const dx = x - c.x;
                    const dy = y - c.y;
                    const dist = Math.sqrt(dx*dx + dy*dy) - c.r;
                    if (dist < d) d = dist;
                }
                const edgeN = (fbm(x * 0.35, y * 0.35, 3, seed + 11) - 0.5) * 3.0;
                SDF[j * bw + i] = d + edgeN;
            }
        }

        const toLX = -0.55, toLY = -0.83;
        const noiseAmt = 0.08;
        const cH = colors.HIGH, cB = colors.BASE, cS1 = colors.SHADOW1, cS2 = colors.SHADOW2;

        for (let j = 0; j < bh; j++) {
            for (let i = 0; i < bw; i++) {
                const idx = j * bw + i;
                const d = SDF[idx];
                if (d > 0) continue;
                const x = minX + i, y = minY + j;

                const dL = i > 0      ? SDF[idx - 1]  : d;
                const dR = i < bw - 1 ? SDF[idx + 1]  : d;
                const dU = j > 0      ? SDF[idx - bw] : d;
                const dD = j < bh - 1 ? SDF[idx + bw] : d;
                const gx = dR - dL;
                const gy = dD - dU;
                const gLen = Math.hypot(gx, gy) || 1;
                let light = (gx * toLX + gy * toLY) / gLen;

                light += (0.5 - j / bh) * 0.55;
                const thickness = Math.min(1, -d / 4);
                light -= thickness * 0.18;
                light += (fbm(x * 0.2,  y * 0.2,  2, seed + 41) - 0.5) * (noiseAmt * 5.5);
                light += (fbm(x * 0.55, y * 0.55, 2, seed + 83) - 0.5) * (noiseAmt * 3.5);

                const v = clamp01(light * 0.5 + 0.5);
                const col = pick4(v, cH, cB, cS1, cS2, x, y, 0.3);

                const pi = (y * this.width + x) * 4;
                data[pi]     = col[0];
                data[pi + 1] = col[1];
                data[pi + 2] = col[2];
                data[pi + 3] = 255;
            }
        }
        this.ctx.putImageData(img, 0, 0);
    }
}

// =====================================================================
//  FERN GENERATOR
// =====================================================================
class FernGenerator extends BaseGen {
    generate(size = 'medium', variant = 'green') {
        const cx = this.width / 2;
        const groundY = this.height - 4;
        const scheme = resolveScheme(CANOPY_SCHEMES[variant === 'berry' ? 'bush_berry' : 'bush_green']);
        const isLarge = size === 'large', isSmall = size === 'small';
        const stemCount = isLarge ? 7 : isSmall ? 4 : 5;
        const maxLen = isLarge ? 22 : isSmall ? 11 : 16;

        this.ctx.clearRect(0, 0, this.width, this.height);

        const baseH = isLarge ? 4 : isSmall ? 2 : 3;
        const baseW = isLarge ? 3 : 2;
        const trunkCol = hexToRgb(HEX.DARK_BROWN);
        const trunkShadow = hexToRgb(HEX.VERY_DARK);
        const baseX = Math.round(cx - baseW / 2);
        const baseY = groundY - baseH;
        for (let y = 0; y < baseH; y++) {
            for (let x = 0; x < baseW; x++) {
                this.ctx.fillStyle = x >= baseW - 1
                    ? `rgb(${trunkShadow[0]},${trunkShadow[1]},${trunkShadow[2]})`
                    : `rgb(${trunkCol[0]},${trunkCol[1]},${trunkCol[2]})`;
                this.ctx.fillRect(baseX + x, baseY + y, 1, 1);
            }
        }
        this.ctx.fillStyle = `rgb(${trunkCol[0]},${trunkCol[1]},${trunkCol[2]})`;
        this.ctx.fillRect(baseX - 1, groundY - 1, baseW + 2, 1);

        const originX = cx;
        const originY = baseY;

        for (let i = 0; i < stemCount; i++) {
            const t = stemCount === 1 ? 0.5 : i / (stemCount - 1);
            const angleOff = (t - 0.5) * 1.9 + this.rand(-0.1, 0.1);
            const len = maxLen * this.rand(0.78, 1.1);
            const dirX = Math.sin(angleOff);
            const dirY = -Math.cos(angleOff);
            const endX = originX + dirX * len * 0.75;
            const endY = originY + dirY * len;
            const ctrlX = originX + dirX * len * 0.55;
            const ctrlY = originY + dirY * len * 0.55 - len * 0.15;
            const steps = 40;
            const points = [];
            for (let s = 0; s <= steps; s++) {
                const tt = s / steps;
                const mt = 1 - tt;
                const x = mt*mt*originX + 2*mt*tt*ctrlX + tt*tt*endX;
                const y = mt*mt*originY + 2*mt*tt*ctrlY + tt*tt*endY;
                points.push({ x, y });
            }
            this.drawStem(points, scheme, isLarge);
        }

        applyOutline(this.ctx, this.width, this.height, HEX.DARK_PURPLE);
        return this.canvas;
    }

    drawStem(points, scheme, isLarge) {
        const stemCol = scheme.SHADOW1;
        const stemDark = scheme.SHADOW2;
        const seed = this.seed;

        for (let i = 0; i < points.length - 1; i++) {
            const p = points[i];
            this.ctx.fillStyle = `rgb(${stemCol[0]},${stemCol[1]},${stemCol[2]})`;
            this.ctx.fillRect(Math.round(p.x), Math.round(p.y), 1, 1);
            if ((i & 3) === 0 && hash2(i, 1, seed) > 0.7) {
                this.ctx.fillStyle = `rgb(${stemDark[0]},${stemDark[1]},${stemDark[2]})`;
                this.ctx.fillRect(Math.round(p.x) + 1, Math.round(p.y), 1, 1);
            }
        }

        const totalLen = points.length;
        for (let i = 4; i < totalLen - 2; i += 2) {
            const t = i / totalLen;
            const leafSize = 0.6 + t * (isLarge ? 1.8 : 1.4);
            const p = points[i];
            const next = points[Math.min(i + 1, totalLen - 1)];
            const dx = next.x - p.x, dy = next.y - p.y;
            const len = Math.hypot(dx, dy) || 1;
            const nx = dx / len, ny = dy / len;
            const px = -ny, py = nx;
            for (const side of [-1, 1]) {
                const r = hash2(Math.round(p.x), Math.round(p.y) + side * 17, seed + 3);
                let leafCol = scheme.BASE;
                if (r > 0.72) leafCol = scheme.HIGH;
                else if (r < 0.25) leafCol = scheme.SHADOW1;
                const lLen = Math.round(leafSize * 2.4);
                for (let k = 1; k <= lLen; k++) {
                    const kk = k / lLen;
                    const curveUp = kk * kk * 0.9;
                    const lx = p.x + px * side * k * 0.85;
                    const ly = p.y + py * side * k * 0.85 - curveUp;
                    this.ctx.fillStyle = `rgb(${leafCol[0]},${leafCol[1]},${leafCol[2]})`;
                    this.ctx.fillRect(Math.round(lx), Math.round(ly), 1, 1);
                    if (k <= lLen * 0.55 && isLarge) {
                        this.ctx.fillRect(Math.round(lx), Math.round(ly) + 1, 1, 1);
                    }
                }
            }
        }

        const tip = points[points.length - 1];
        const tipCol = scheme.HIGH;
        const tipCol2 = scheme.BASE;
        const r = isLarge ? 2 : 1;
        for (let dy = -r; dy <= r; dy++) {
            for (let dx = -r; dx <= r; dx++) {
                if (dx*dx + dy*dy <= r*r + 0.4) {
                    const isHi = (dx + dy) < 0;
                    const c = isHi ? tipCol : tipCol2;
                    this.ctx.fillStyle = `rgb(${c[0]},${c[1]},${c[2]})`;
                    this.ctx.fillRect(Math.round(tip.x + dx), Math.round(tip.y + dy), 1, 1);
                }
            }
        }
    }
}

// =====================================================================
//  ROCK GENERATOR
// =====================================================================
class RockGenerator extends BaseGen {
    generate(size = 'medium') {
        const cfg = {
            pebble:  { r: [3, 5],   points: 8,  squash: 0.7 },
            small:   { r: [6, 9],   points: 9,  squash: 0.72 },
            medium:  { r: [10, 14], points: 11, squash: 0.75 },
            boulder: { r: [16, 22], points: 13, squash: 0.78 },
        }[size];

        const cx = this.width / 2;
        const groundY = this.height - 4;
        const baseR = this.rand(cfg.r[0], cfg.r[1]);
        const cy = groundY - baseR * 0.75;

        const verts = [];
        for (let i = 0; i < cfg.points; i++) {
            const angle = (i / cfg.points) * Math.PI * 2;
            const nA = (fbm(Math.cos(angle) * 2 + this.seed * 0.001,
                Math.sin(angle) * 2 + this.seed * 0.001, 3, this.seed) - 0.5) * 0.5;
            const rr = baseR * (0.78 + nA + this.rand(-0.1, 0.1));
            const squashY = Math.sin(angle) > 0 ? cfg.squash : 1.0;
            verts.push({ x: cx + Math.cos(angle) * rr, y: cy + Math.sin(angle) * rr * squashY });
        }

        this.ctx.clearRect(0, 0, this.width, this.height);
        this.ctx.beginPath();
        this.ctx.moveTo(verts[0].x, verts[0].y);
        for (let i = 1; i < verts.length; i++) this.ctx.lineTo(verts[i].x, verts[i].y);
        this.ctx.closePath();
        this.ctx.fillStyle = HEX.GRAY;
        this.ctx.fill();

        this.shade(cx, cy, baseR, size);
        applyOutline(this.ctx, this.width, this.height, HEX.DARK_PURPLE);
        return this.canvas;
    }

    shade(cx, cy, r, size) {
        const img = this.ctx.getImageData(0, 0, this.width, this.height);
        const data = img.data;
        const toLX = -0.6, toLY = -0.8;
        const HIGH = hexToRgb(HEX.TAN);
        const BASE = hexToRgb(HEX.GRAY);
        const SH1  = hexToRgb(HEX.PURPLE_GRAY);
        const SH2  = hexToRgb(HEX.DARK_PURPLE2);
        const CRACK = hexToRgb(HEX.ALMOST_BLACK);
        const seed = this.seed;
        const crackProb = size === 'pebble' ? 0 : 1;

        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const idx = (y * this.width + x) * 4;
                if (data[idx + 3] === 0) continue;
                const n1 = fbm(x * 0.25, y * 0.25, 3, seed + 5);
                const n2 = fbm(x * 0.7, y * 0.7, 2, seed + 19);
                const facetX = (n1 - 0.5) * 1.4 + (n2 - 0.5) * 0.5;
                const facetY = (fbm(x * 0.25 + 13, y * 0.25 + 7, 3, seed + 5) - 0.5) * 1.4
                    + (fbm(x * 0.7 + 13, y * 0.7 + 7, 2, seed + 19) - 0.5) * 0.5;
                const dx = (x - cx) / r, dy = (y - cy) / r;
                const nl = Math.hypot(dx, dy) || 1;
                const nx = dx / nl + facetX * 0.5;
                const ny = dy / nl + facetY * 0.5;
                const nn = Math.hypot(nx, ny) || 1;
                const dot = (nx / nn) * toLX + (ny / nn) * toLY;
                const ao = Math.max(0, (y - cy) / r) * 0.35;
                const strata = size === 'boulder' || size === 'medium'
                    ? (Math.sin(y * 0.9 + fbm(x * 0.1, y * 0.1, 2, seed + 33) * 4) * 0.5 + 0.5) * 0.12
                    : 0;
                let val = (dot - ao - strata) * 0.5 + 0.5;
                let col = pick4(clamp01(val), HIGH, BASE, SH1, SH2, x, y, 0.35);
                if (crackProb) {
                    const cr = Math.abs(fbm(x * 0.35, y * 0.35, 4, seed + 21) - 0.5);
                    if (cr < 0.012) col = CRACK;
                }
                data[idx]     = col[0];
                data[idx + 1] = col[1];
                data[idx + 2] = col[2];
                data[idx + 3] = 255;
            }
        }
        this.ctx.putImageData(img, 0, 0);
    }
}

// =====================================================================
//  LOG GENERATOR
// =====================================================================
class LogGenerator extends BaseGen {
    generate(size = 'medium', variant = 'straight') {
        const cfg = {
            small:  { len: [22, 30], thick: [5, 7] },
            medium: { len: [34, 44], thick: [7, 10] },
            large:  { len: [46, 58], thick: [10, 13] },
        }[size];

        let len = this.rand(...cfg.len);
        let thick = this.rand(...cfg.thick);

        let tilt = 0, brokenEnd = 0, hasBranch = false, rootEnd = 0;
        switch (variant) {
            case 'thin':    thick *= 0.5; len = Math.min(this.width - 4, len * 1.2); break;
            case 'tilted':  tilt = this.rand(2, 4) * (this.rand(0, 1) < 0.5 ? -1 : 1); break;
            case 'broken':  brokenEnd = this.rand(0, 1) < 0.5 ? -1 : 1; break;
            case 'branchy': hasBranch = true; break;
            case 'rooted':  rootEnd = this.rand(0, 1) < 0.5 ? -1 : 1; len *= 0.9; thick *= 1.1; break;
        }

        const groundY = this.height - 6;
        const centerX = this.width / 2;
        const x0 = Math.floor(centerX - len / 2);
        const x1 = Math.floor(centerX + len / 2);
        const yCenterBase = groundY - thick / 2;
        const thickI = Math.max(3, Math.floor(thick));

        const yOffAt = (x) => {
            if (tilt === 0) return 0;
            const t = (x - x0) / Math.max(1, x1 - x0) - 0.5;
            return t * tilt * 2;
        };

        const bodyTopCol    = hexToRgb(HEX.BROWN);
        const bodyMidCol    = hexToRgb(HEX.DARK_BROWN);
        const bodyShadowCol = hexToRgb(HEX.VERY_DARK);
        const veryDarkCol   = hexToRgb(HEX.ALMOST_BLACK);
        const tanCol        = hexToRgb(HEX.TAN);

        this.ctx.clearRect(0, 0, this.width, this.height);

        // Тело
        for (let x = x0; x < x1; x++) {
            const yOff = yOffAt(x);
            const yCenter = yCenterBase + yOff;

            let colThick = thickI;
            if (rootEnd !== 0) {
                const tt = (x - x0) / Math.max(1, x1 - x0);
                const rootT = rootEnd === -1 ? (1 - tt) : tt;
                colThick = Math.round(thickI * (0.9 + rootT * 0.4));
            }
            const colTop = Math.round(yCenter - colThick / 2);

            for (let row = 0; row < colThick; row++) {
                const t = row / (colThick - 1 || 1);
                let col = bodyMidCol;
                if (t < 0.28) col = bodyTopCol;
                else if (t > 0.78) col = bodyShadowCol;
                const fiber = fbm(x * 0.9, row * 0.35, 3, this.seed + 7);
                const grain = vnoise(x * 1.8, row * 0.9, this.seed + 12);
                const v = fiber * 0.7 + grain * 0.3;
                if (v > 0.72) col = bodyShadowCol;
                else if (v < 0.28 && t < 0.55) col = bodyTopCol;
                if (t > 0.88) col = bodyShadowCol;
                this.ctx.fillStyle = `rgb(${col[0]},${col[1]},${col[2]})`;
                this.ctx.fillRect(x, colTop + row, 1, 1);
            }
        }

        // Торцы
        const yLeft  = yCenterBase + yOffAt(x0);
        const yRight = yCenterBase + yOffAt(x1 - 1);
        const drawEnd = (x, yC, isLeft) => {
            const rY = thickI / 2;
            const rX = Math.max(2, Math.round(rY * 0.45));
            const rings = [tanCol, bodyTopCol, bodyMidCol];
            for (let ring = rings.length - 1; ring >= 0; ring--) {
                const rrX = rX * (ring + 1) / rings.length;
                const rrY = rY * (ring + 1) / rings.length;
                this.ctx.fillStyle = `rgb(${rings[ring][0]},${rings[ring][1]},${rings[ring][2]})`;
                this.ctx.beginPath();
                this.ctx.ellipse(x, yC, Math.max(1, rrX), Math.max(1, rrY), 0, 0, Math.PI * 2);
                this.ctx.fill();
            }
            this.ctx.fillStyle = 'rgba(0,0,0,0.35)';
            this.ctx.fillRect(isLeft ? x + 1 : x - 1, Math.round(yC - rY), 1, thickI);
        };
        const drawBroken = (x, yC, dir) => {
            const halfT = Math.floor(thickI / 2);
            const colors = [veryDarkCol, bodyMidCol, bodyTopCol];
            for (let i = 0; i < thickI; i++) {
                const lenB = 1 + Math.floor(this.rand(0, 3));
                const y = Math.round(yC - halfT + i);
                for (let k = 0; k < lenB; k++) {
                    const px = x + dir * k;
                    const c = colors[Math.min(k, colors.length - 1)];
                    this.ctx.fillStyle = `rgb(${c[0]},${c[1]},${c[2]})`;
                    this.ctx.fillRect(px, y, 1, 1);
                }
                if (this.rand(0, 1) < 0.35) {
                    const px = x + dir * (lenB + 1);
                    this.ctx.fillStyle = `rgb(${tanCol[0]},${tanCol[1]},${tanCol[2]})`;
                    this.ctx.fillRect(px, y, 1, 1);
                }
            }
        };

        if (brokenEnd === -1) { drawBroken(x0, yLeft, -1); drawEnd(x1 - 1, yRight, false); }
        else if (brokenEnd === 1) { drawEnd(x0, yLeft, true); drawBroken(x1 - 1, yRight, 1); }
        else { drawEnd(x0, yLeft, true); drawEnd(x1 - 1, yRight, false); }

        // Сучки
        const knotCount = size === 'large' ? 3 : size === 'medium' ? 2 : 1;
        for (let i = 0; i < knotCount; i++) {
            const kx = Math.floor(x0 + len * this.rand(0.25, 0.85));
            const ky = Math.round(yCenterBase + yOffAt(kx) + this.rand(-thickI * 0.28, thickI * 0.28));
            this.ctx.fillStyle = `rgb(${tanCol[0]},${tanCol[1]},${tanCol[2]})`;
            this.ctx.beginPath(); this.ctx.arc(kx, ky, 1.6, 0, Math.PI * 2); this.ctx.fill();
            this.ctx.fillStyle = `rgb(${veryDarkCol[0]},${veryDarkCol[1]},${veryDarkCol[2]})`;
            this.ctx.beginPath(); this.ctx.arc(kx, ky, 0.9, 0, Math.PI * 2); this.ctx.fill();
        }

        // Ветка
        if (hasBranch) {
            const bx = Math.floor(x0 + len * this.rand(0.3, 0.7));
            const byTop = Math.round(yCenterBase + yOffAt(bx) - thickI / 2);
            const dir = this.rand(0, 1) < 0.5 ? -1 : 1;
            const bLen = Math.round(thick * this.rand(1.2, 2.0));
            let px = bx, py = byTop;
            for (let s = 0; s < bLen; s++) {
                const t = s / Math.max(1, bLen - 1);
                const w = Math.max(1, Math.round(thick * 0.35 * (1 - t * 0.7)));
                const wob = Math.sin(t * 3.5) * 0.8;
                const cx2 = Math.round(px + dir * t * 1.5 + wob * 0.5);
                const cy2 = Math.round(py - t * (bLen * 0.9) - Math.abs(wob) * 0.3);
                for (let k = -Math.floor(w/2); k <= Math.floor(w/2); k++) {
                    this.ctx.fillStyle = (k >= 0 && w > 1) ? HEX.VERY_DARK : HEX.DARK_BROWN;
                    this.ctx.fillRect(cx2 + k, cy2, 1, 1);
                }
                px = cx2; py = cy2;
            }
        }

        // Тень под бревном
        this.ctx.fillStyle = 'rgba(18,14,35,0.5)';
        for (let x = x0; x < x1; x++) {
            const yOff = yOffAt(x);
            const yBottom = Math.round(yCenterBase + yOff + thickI / 2);
            this.ctx.fillRect(x, yBottom, 1, 1);
        }

        applyOutline(this.ctx, this.width, this.height, HEX.DARK_PURPLE);
        return this.canvas;
    }
}

// =====================================================================
//  PUBLIC API
// =====================================================================
export function makeOakTree(seed = 1, size = 'medium', variant = 'green') {
    return new TreeGenerator(64, 64, seed).generate('oak', size, variant);
}
export function makePineTree(seed = 2, size = 'medium') {
    return new TreeGenerator(64, 64, seed).generate('pine', size, 'green');
}
export function makeSpruceTree(seed = 3, size = 'medium') {
    return new TreeGenerator(64, 64, seed).generate('spruce', size, 'green');
}
export function makeBirchTree(seed = 4, size = 'medium') {
    return new TreeGenerator(64, 64, seed).generate('birch', size, 'green');
}
export function makeDeadTree(seed = 5, size = 'medium') {
    return new TreeGenerator(64, 64, seed).generate('deadtree', size, 'dead');
}
export function makeFern(seed = 6, size = 'medium', variant = 'green') {
    return new FernGenerator(64, 64, seed).generate(size, variant);
}
export function makeRock(seed = 7, size = 'medium') {
    return new RockGenerator(64, 64, seed).generate(size);
}
export function makeLog(seed = 8, size = 'medium', variant = 'straight') {
    return new LogGenerator(64, 64, seed).generate(size, variant);
}

// ─────────────────────────────────────────────────────────────
//  Падающая тень — сплюснутый эллипс, DARK_PURPLE-тинт
//  (п.1 ТЗ: цвет не чистый чёрный, а тёмно-фиолетовый)
// ─────────────────────────────────────────────────────────────
export function makeShadowSoft(w = 56, h = 18) {
    const cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    const ctx = cv.getContext('2d');
    const cx = w / 2, cy = h / 2;
    const rx = w / 2 - 1, ry = h / 2 - 1;
    const hex = '#' + P.DARK_PURPLE.toString(16).padStart(6, '0');
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const dx = (x - cx) / rx;
            const dy = (y - cy) / ry;
            const d = dx * dx + dy * dy;
            if (d > 1) continue;
            // Спад мягче в центре, резче к краям
            const t = 1 - d;
            const a = Math.pow(t, 0.7) * 0.9;
            ctx.globalAlpha = a;
            ctx.fillStyle = hex;
            ctx.fillRect(x, y, 1, 1);
        }
    }
    ctx.globalAlpha = 1;
    return cv;
}


// ─────────────────────────────────────────────────────────────
//  Универсальный nearest-neighbor апскейл для пиксель-арта
//  Используется для предпросмотра размеров из TuningConfig
// ─────────────────────────────────────────────────────────────
export function applyScale(canvas, factor) {
    if (!factor || factor === 1) return canvas;
    const dst = document.createElement('canvas');
    dst.width  = Math.max(1, Math.round(canvas.width  * factor));
    dst.height = Math.max(1, Math.round(canvas.height * factor));
    const ctx = dst.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(canvas, 0, 0, canvas.width, canvas.height, 0, 0, dst.width, dst.height);
    return dst;
}

// =====================================================================
//  PLAYER SHEET (16×24, 4×4)
// =====================================================================
const PLAYER_MAP = [
    '................',
    '.....hhhhhh.....',
    '....hhhhhhhh....',
    '....hssssssh....',
    '....hssesesh....',
    '....hssssssh....',
    '....hssssssh....',
    '.....ssssss.....',
    '....rrrrrrrr....',
    '...srrrrrrrrs...',
    '...srrrrrrrrs...',
    '...rrrrrrrrrr...',
    '....rrrrrrrr....',
    '....pppppppp....',
    '....pp....pp....',
    '...bbb....bbb...',
];

export function makePlayerSheet(fw = 16, fh = 24) {
    const cols = 4, rows = 4;
    const W = cols * fw, H = rows * fh;
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const ctx = cv.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    const CH = {
        h: HEX.DARK_BROWN, s: HEX.CREAM, e: HEX.ALMOST_BLACK,
        r: HEX.RED, p: HEX.DARK_PURPLE, b: HEX.VERY_DARK,
    };

    const draw = (ox, oy, dir, frame) => {
        const set = (x, y, color) => { ctx.fillStyle = color; ctx.fillRect(ox + x, oy + y, 1, 1); };
        for (let y = 0; y < fh; y++) for (let x = 0; x < fw; x++) ctx.clearRect(ox + x, oy + y, 1, 1);

        for (let y = 8; y < 14; y++) for (let x = 4; x < 12; x++) set(x, y, CH.r);
        set(3, 9, CH.s); set(3, 10, CH.s);
        set(12, 9, CH.s); set(12, 10, CH.s);
        for (let y = 4; y < 8; y++) for (let x = 5; x < 11; x++) set(x, y, CH.s);
        for (let y = 2; y < 5; y++) for (let x = 4; x < 12; x++) set(x, y, CH.h);
        set(4, 5, CH.h); set(11, 5, CH.h);

        const lOff = frame === 1 ? -1 : frame === 3 ? 1 : 0;
        const rOff = frame === 3 ? -1 : frame === 1 ? 1 : 0;
        set(5, 14 + Math.max(0, lOff), CH.p);
        set(6, 14 + Math.max(0, lOff), CH.p);
        set(9, 14 + Math.max(0, rOff), CH.p);
        set(10, 14 + Math.max(0, rOff), CH.p);
        set(5, 22 + lOff, CH.b); set(6, 22 + lOff, CH.b);
        set(9, 22 + rOff, CH.b); set(10, 22 + rOff, CH.b);

        if (dir === 'down') { set(7, 6, CH.e); set(9, 6, CH.e); }
        else if (dir === 'up') {
            for (let y = 4; y < 8; y++) for (let x = 5; x < 11; x++) set(x, y, CH.h);
        } else if (dir === 'left') { set(6, 6, CH.e); set(4, 4, CH.h); set(4, 5, CH.h); }
        else if (dir === 'right') { set(9, 6, CH.e); set(11, 4, CH.h); set(11, 5, CH.h); }
    };

    const dirs = ['down', 'up', 'left', 'right'];
    dirs.forEach((dir, row) => {
        for (let col = 0; col < cols; col++) draw(col * fw, row * fh, dir, col);
    });
    return cv;
}