import { BaseGen } from './BaseGen.js';
import { PALETTE, hexToRgb, fbm, clamp01, pick4 } from './utils.js';

export class FormationGenerator extends BaseGen {
    generate(size = 'peak') {
        const cfg = {
            outcrop:  { maxH: [12, 18], baseW: [28, 42], peaks: 1, sharp: 1.8, noise: 0.35, strata: 0.5 },
            ridge:    { maxH: [16, 22], baseW: [52, 62], peaks: 1, sharp: 1.3, noise: 0.5,  strata: 0.7 },
            peak:     { maxH: [32, 44], baseW: [40, 54], peaks: 1, sharp: 1.9, noise: 0.4,  strata: 0.6 },
            mountain: { maxH: [42, 56], baseW: [60, 64], peaks: 2, sharp: 1.6, noise: 0.5,  strata: 0.8 },
            plateau:  { maxH: [22, 30], baseW: [60, 64], peaks: 0, sharp: 1.0, noise: 0.25, strata: 0.9 },
        }[size];

        const W = this.width, H = this.height;
        const groundY = H - 3;
        const maxH = this.rand(...cfg.maxH);
        const baseW = Math.min(W - 2, this.rand(...cfg.baseW));
        const cx = W / 2;

        const heights = new Float32Array(W);
        for (let x = 0; x < W; x++) {
            const dist = Math.abs(x - cx);
            const edge = baseW / 2;
            if (dist > edge) { heights[x] = 0; continue; }
            let h = 0;
            if (size === 'plateau') {
                const t = dist / edge;
                if (t < 0.6) h = 1.0;
                else if (t < 0.85) h = 1.0 - (t - 0.6) / 0.25 * 0.45;
                else h = 0.55 * (1.0 - (t - 0.85) / 0.15);
            } else if (cfg.peaks >= 2) {
                const p1 = cx - baseW * 0.22;
                const p2 = cx + baseW * 0.20;
                const d1 = Math.abs(x - p1) / (baseW * 0.42);
                const d2 = Math.abs(x - p2) / (baseW * 0.42);
                const h1 = Math.max(0, 1 - d1 ** cfg.sharp);
                const h2 = Math.max(0, 1 - d2 ** cfg.sharp) * 0.78;
                h = Math.max(h1, h2);
            } else {
                const t = dist / edge;
                h = Math.max(0, 1 - t ** cfg.sharp);
            }
            const n = (fbm(x * 0.22, 0, 4, this.seed + 3) - 0.5) * cfg.noise;
            heights[x] = Math.max(0, h + n) * maxH;
        }
        // сглаживание
        const sm = new Float32Array(W);
        for (let x = 0; x < W; x++) {
            let sum = 0, cnt = 0;
            for (let k = -1; k <= 1; k++) {
                const xx = x + k;
                if (xx >= 0 && xx < W) { sum += heights[xx]; cnt++; }
            }
            sm[x] = sum / cnt;
        }
        for (let x = 0; x < W; x++) heights[x] = sm[x];

        const HIGH = hexToRgb(PALETTE.TAN);
        const BASE = hexToRgb(PALETTE.GRAY);
        const SH1  = hexToRgb(PALETTE.PURPLE_GRAY);
        const SH2  = hexToRgb(PALETTE.DARK_PURPLE2);
        const DEEP = hexToRgb(PALETTE.DARK_PURPLE);
        const seed = this.seed;

        const img = this.ctx.createImageData(W, H);
        const data = img.data;

        for (let x = 0; x < W; x++) {
            const colH = heights[x];
            if (colH < 0.6) continue;
            const colTop = Math.round(groundY - colH);
            const hL = x > 0 ? heights[x - 1] : colH;
            const hR = x < W - 1 ? heights[x + 1] : colH;
            const slope = (hR - hL) * 0.5;
            const edgeShadeL = x > 0 && heights[x - 1] < 0.6 ? 0.1 : 0;
            const edgeShadeR = x < W - 1 && heights[x + 1] < 0.6 ? -0.15 : 0;
            const edgeShade = edgeShadeL + edgeShadeR;

            for (let y = colTop; y < groundY; y++) {
                const depth = y - colTop;
                const relY = depth / Math.max(1, colH);
                let lightVal;
                if (depth < 2) {
                    lightVal = 0.6 - slope * 0.14 + edgeShade;
                    lightVal -= depth * 0.06;
                } else {
                    const strataPhase = y * 0.65 + fbm(x * 0.05, y * 0.03, 3, seed + 11) * 3.5;
                    const strata = Math.sin(strataPhase) * 0.5 + 0.5;
                    const fine = fbm(x * 0.4, y * 0.4, 3, seed + 23);
                    const med  = fbm(x * 0.15, y * 0.15, 2, seed + 47);
                    lightVal = 0.5
                        + (strata - 0.5) * 0.16 * cfg.strata
                        + (fine - 0.5) * 0.28
                        + (med - 0.5) * 0.22
                        - relY * 0.32
                        + edgeShade * 0.5;
                }
                const cr = Math.abs(fbm(x * 0.28, y * 0.28, 4, seed + 71) - 0.5);
                if (cr < 0.011 && depth > 2) {
                    const pi = (y * W + x) * 4;
                    data[pi] = DEEP[0]; data[pi+1] = DEEP[1]; data[pi+2] = DEEP[2]; data[pi+3] = 255;
                    continue;
                }
                const col = pick4(clamp01(lightVal), HIGH, BASE, SH1, SH2, x, y, 0.3);
                const pi = (y * W + x) * 4;
                data[pi] = col[0]; data[pi+1] = col[1]; data[pi+2] = col[2]; data[pi+3] = 255;
            }
            const pi = (groundY * W + x) * 4;
            data[pi] = DEEP[0]; data[pi+1] = DEEP[1]; data[pi+2] = DEEP[2]; data[pi+3] = 255;
        }

        this.ctx.putImageData(img, 0, 0);
        this.outline();
        return this.canvas;
    }
}