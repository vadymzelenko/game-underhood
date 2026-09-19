import { BaseGen } from './BaseGen.js';
import { PALETTE, hexToRgb, fbm, clamp01, pick4 } from './utils.js';
import { CANOPY_SCHEMES, resolveScheme } from './schemes.js';
import { drawBlobMass } from './blobMass.js';

export class StumpGenerator extends BaseGen {
    generate(size = 'medium', variant = 'plain') {
        this.ctx.clearRect(0, 0, this.width, this.height);
        const cx = this.width / 2;
        const groundY = this.height - 4;
        const isLarge = size === 'large', isSmall = size === 'small';
        const seed = this.seed;

        let H = isLarge ? 20 : isSmall ? 10 : 15;
        let W = isLarge ? 15 : isSmall ? 9  : 12;
        if (variant === 'tall') H = Math.round(H * 1.5);

        const topY = groundY - H;
        const barkLit  = hexToRgb(PALETTE.BROWN);
        const barkMid  = hexToRgb(PALETTE.DARK_BROWN);
        const barkDark = hexToRgb(PALETTE.VERY_DARK);
        const barkDeep = hexToRgb(PALETTE.ALMOST_BLACK);

        for (let y = topY; y < groundY; y++) {
            const t = (y - topY) / Math.max(1, H);
            let w = Math.round(W * (1 + t * 0.14));
            if (t > 0.82) w = Math.round(w * (1 + (t - 0.82) * 1.6));
            const x0 = Math.round(cx - w / 2);
            for (let i = 0; i < w; i++) {
                const e = i / Math.max(1, w - 1);
                let col = barkMid;
                if (e < 0.28) col = barkLit;
                else if (e > 0.78) col = barkDark;
                const n = fbm((x0 + i) * 1.4, y * 0.16, 3, seed + 7);
                if (n > 0.67) col = barkDark;
                else if (n < 0.32 && e < 0.55) col = barkLit;
                if (n > 0.78) col = barkDeep;
                this.ctx.fillStyle = `rgb(${col.join(',')})`;
                this.ctx.fillRect(x0 + i, y, 1, 1);
            }
        }

        // Срез
        const rw = W / 2;
        const rh = Math.max(1.6, W / 4.2);
        const cy = topY;
        const tanHi   = hexToRgb(PALETTE.TAN);
        const tanMid  = hexToRgb(PALETTE.GOLD);
        const tanDark = hexToRgb(PALETTE.BROWN);
        const edgeCol = hexToRgb(PALETTE.CAP_BROWN_DARK);

        for (let dy = -Math.ceil(rh); dy <= Math.ceil(rh); dy++) {
            for (let dx = -Math.ceil(rw); dx <= Math.ceil(rw); dx++) {
                const nx = dx / rw, ny = dy / rh;
                const d = nx * nx + ny * ny;
                if (d > 1) continue;
                const r = Math.sqrt(d);
                const ring = Math.sin(r * Math.PI * 7 + this.seed * 0.0007 + fbm(dx * 0.3, dy * 0.3, 2, seed + 5)) * 0.5 + 0.5;
                let col;
                if (r > 0.86) col = edgeCol;
                else if (ring > 0.72) col = tanDark;
                else if (ring > 0.42) col = tanMid;
                else col = tanHi;
                if (ny > 0.55 && r < 0.85) {
                    col = [col[0]*0.82|0, col[1]*0.8|0, col[2]*0.85|0];
                }
                this.ctx.fillStyle = `rgb(${col.join(',')})`;
                this.ctx.fillRect(Math.round(cx + dx), cy + dy, 1, 1);
            }
        }

        if (variant === 'mossy') this.drawMossOnStump(cx, cy, rw, rh, topY, H, W);
        if (variant === 'sprout') this.drawSprout(cx, cy, rw, rh);
        if (variant === 'mushrooms') this.drawMiniMushrooms(cx, cy, topY, H, W);

        this.groundShadow(cx, W * 1.4, groundY, 0.45);
        this.outline();
        return this.canvas;
    }

    drawMossOnStump(cx, cy, rw, rh, topY, H, W) {
        const mossScheme = resolveScheme(CANOPY_SCHEMES.moss);
        const cl = [];
        const n = 8 + Math.floor(this.rand(0, 5));
        for (let i = 0; i < n; i++) {
            const a = this.rand(0, Math.PI * 2);
            const rx = rw * this.rand(0.15, 0.75);
            const ry = rh * this.rand(0.15, 0.75);
            cl.push({ x: cx + Math.cos(a) * rx, y: cy + Math.sin(a) * ry, r: this.rand(2, 3.2) });
        }
        drawBlobMass(this.ctx, this.width, this.height, cl, mossScheme, this.seed + 51, 0.14);

        const mossCol  = hexToRgb(PALETTE.MOSS_LIGHT);
        const mossCol2 = hexToRgb(PALETTE.MOSS_MID);
        for (let i = 0; i < 6; i++) {
            const t = this.rand(0, 1);
            const y = topY + 2 + t * (H - 3);
            const side = Math.random() < 0.5 ? -1 : 1;
            const w = Math.round(W * (1 + t * 0.14) / 2);
            const x = Math.round(cx + side * w);
            const len = 1 + Math.floor(this.rand(1, 4));
            for (let k = 0; k < len; k++) {
                this.ctx.fillStyle = k === 0 ? `rgb(${mossCol.join(',')})` : `rgb(${mossCol2.join(',')})`;
                this.ctx.fillRect(x, y + k, 1, 1);
            }
        }
    }

    drawSprout(cx, cy, rw, rh) {
        const leafG = hexToRgb(PALETTE.GREEN);
        const leafL = hexToRgb(PALETTE.LIGHT_GREEN);
        const stemG = hexToRgb(PALETTE.STEM_GREEN);
        const n = 3 + Math.floor(this.rand(0, 2));
        for (let i = 0; i < n; i++) {
            const sx = Math.round(cx + this.rand(-rw * 0.6, rw * 0.6));
            const sy = cy + Math.round(this.rand(-rh * 0.3, rh * 0.3));
            const h = 3 + Math.floor(this.rand(0, 3));
            for (let k = 1; k <= h; k++) {
                this.ctx.fillStyle = `rgb(${stemG.join(',')})`;
                this.ctx.fillRect(sx, sy - k, 1, 1);
            }
            this.ctx.fillStyle = `rgb(${leafG.join(',')})`;
            this.ctx.fillRect(sx - 1, sy - h, 1, 1);
            this.ctx.fillRect(sx + 1, sy - h, 1, 1);
            this.ctx.fillStyle = `rgb(${leafL.join(',')})`;
            this.ctx.fillRect(sx, sy - h - 1, 1, 1);
        }
    }

    drawMiniMushrooms(cx, cy, topY, H, W) {
        const n = 2 + Math.floor(this.rand(0, 2));
        for (let i = 0; i < n; i++) {
            const t = this.rand(0.2, 0.85);
            const side = Math.random() < 0.5 ? -1 : 1;
            const w = Math.round(W * (1 + t * 0.14) / 2);
            const bx = Math.round(cx + side * w * 0.95);
            const by = Math.round(topY + t * H);
            const sc = 0.5 + this.rand(0, 0.25);
            const capW = Math.max(3, Math.round(7 * sc));
            const capH = Math.max(2, Math.round(4 * sc));
            const stemH = Math.max(2, Math.round(4 * sc));
            const stemX = bx + side * 1;
            const stemTopY = by - stemH;
            const stemC = hexToRgb(PALETTE.CAP_CREAM);
            const stemD = hexToRgb(PALETTE.CAP_CREAM_DARK);
            for (let y = stemTopY; y < by; y++) {
                for (let k = 0; k < 2; k++) {
                    this.ctx.fillStyle = k === 0 ? `rgb(${stemC.join(',')})` : `rgb(${stemD.join(',')})`;
                    this.ctx.fillRect(stemX + k, y, 1, 1);
                }
            }
            const ch = hexToRgb(PALETTE.CAP_BROWN);
            const cd = hexToRgb(PALETTE.CAP_BROWN_DARK);
            for (let dy = 0; dy <= capH; dy++) {
                const ny = dy / capH;
                const hw = Math.sqrt(Math.max(0, 1 - ny * ny)) * (capW / 2);
                if (hw < 0.5) continue;
                for (let dx = -Math.ceil(hw); dx <= Math.ceil(hw); dx++) {
                    if (Math.abs(dx) > hw) continue;
                    const col = dx < 0 ? ch : cd;
                    this.ctx.fillStyle = `rgb(${col.join(',')})`;
                    this.ctx.fillRect(stemX + dx + 1, stemTopY - dy, 1, 1);
                }
            }
        }
    }
}