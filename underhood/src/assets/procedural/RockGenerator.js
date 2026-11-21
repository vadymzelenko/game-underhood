import { BaseGen } from './BaseGen.js';
import { PALETTE, hexToRgb, fbm, clamp01, pick4 } from './utils.js';

export class RockGenerator extends BaseGen {
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
        this.ctx.fillStyle = PALETTE.GRAY;
        this.ctx.fill();

        this.shade(cx, cy, baseR, size);
        this.outline();
        return this.canvas;
    }

    shade(cx, cy, r, size) {
        const img = this.ctx.getImageData(0, 0, this.width, this.height);
        const data = img.data;
        const toLX = -0.6, toLY = -0.8;
        const HIGH = hexToRgb(PALETTE.TAN);
        const BASE = hexToRgb(PALETTE.GRAY);
        const SH1  = hexToRgb(PALETTE.PURPLE_GRAY);
        const SH2  = hexToRgb(PALETTE.DARK_PURPLE2);
        const CRACK = hexToRgb(PALETTE.ALMOST_BLACK);
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
                const strata = (size === 'boulder' || size === 'medium')
                    ? (Math.sin(y * 0.9 + fbm(x * 0.1, y * 0.1, 2, seed + 33) * 4) * 0.5 + 0.5) * 0.12
                    : 0;
                const val = (dot - ao - strata) * 0.5 + 0.5;
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