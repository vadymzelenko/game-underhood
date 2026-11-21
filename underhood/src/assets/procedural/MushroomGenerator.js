import { BaseGen } from './BaseGen.js';
import { PALETTE, hexToRgb, fbm, clamp01, pick4 } from './utils.js';

export class MushroomGenerator extends BaseGen {
    generate(size = 'medium', variant = 'boletus') {
        this.ctx.clearRect(0, 0, this.width, this.height);
        const cx = this.width / 2;
        const groundY = this.height - 4;
        const isLarge = size === 'large', isSmall = size === 'small';
        const s = isLarge ? 1.35 : isSmall ? 0.75 : 1.0;

        if (variant === 'cluster') {
            const n = isLarge ? 5 : 3;
            for (let i = 0; i < n; i++) {
                const off = (i - (n - 1) / 2) * 4 * s;
                const sx = cx + off + this.rand(-1.5, 1.5);
                const sy = groundY - Math.abs(off) * 0.18;
                const sc = s * this.rand(0.65, 1.0);
                this.drawMushroomAt(sx, sy, sc, {
                    stemH: 7, stemW: 2.5, capW: 8, capH: 5,
                    stem:  hexToRgb(PALETTE.CAP_CREAM),
                    stemShadow: hexToRgb(PALETTE.CAP_CREAM_DARK),
                    capHigh: hexToRgb(PALETTE.CAP_BROWN),
                    capBase: hexToRgb(PALETTE.CAP_BROWN),
                    capMid:  hexToRgb(PALETTE.CAP_BROWN_DARK),
                    capDark: hexToRgb(PALETTE.CAP_BROWN_DARK),
                }, {});
            }
        } else {
            const cfg = {
                boletus: {
                    stemH: 12, stemW: 3.5, capW: 13, capH: 8,
                    stem:  hexToRgb(PALETTE.CAP_CREAM),
                    stemShadow: hexToRgb(PALETTE.CAP_CREAM_DARK),
                    capHigh: hexToRgb(PALETTE.CAP_BROWN),
                    capBase: hexToRgb(PALETTE.CAP_BROWN),
                    capMid:  hexToRgb(PALETTE.CAP_BROWN_DARK),
                    capDark: hexToRgb(PALETTE.CAP_BROWN_DARK),
                },
                amanita: {
                    stemH: 14, stemW: 3.5, capW: 15, capH: 9,
                    stem:  hexToRgb(PALETTE.CREAM),
                    stemShadow: hexToRgb(PALETTE.TAN),
                    capHigh: hexToRgb(PALETTE.RED),
                    capBase: hexToRgb(PALETTE.RED),
                    capMid:  hexToRgb(PALETTE.CAP_RED),
                    capDark: hexToRgb(PALETTE.CAP_RED_DARK),
                },
                toadstool: {
                    stemH: 10, stemW: 2.8, capW: 11, capH: 6,
                    stem:  hexToRgb(PALETTE.CREAM),
                    stemShadow: hexToRgb(PALETTE.TAN),
                    capHigh: hexToRgb(PALETTE.CAP_CREAM),
                    capBase: hexToRgb(PALETTE.CAP_CREAM),
                    capMid:  hexToRgb(PALETTE.TAN),
                    capDark: hexToRgb(PALETTE.CAP_CREAM_DARK),
                },
            }[variant];
            if (cfg) this.drawMushroomAt(cx, groundY, s, cfg, { spot: variant === 'amanita' });
        }

        this.groundShadow(cx, 8, groundY, 0.4);
        this.outline();
        return this.canvas;
    }

    drawMushroomAt(cx, baseY, scale, colors, opts) {
        const seed = this.seed;
        const stemH = Math.max(3, Math.round(colors.stemH * scale));
        const stemW = Math.max(1, Math.round(colors.stemW * scale));
        const capW  = Math.max(3, Math.round(colors.capW  * scale));
        const capH  = Math.max(2, Math.round(colors.capH  * scale));
        const stemTopY = baseY - stemH;

        for (let y = stemTopY; y < baseY; y++) {
            const t = (y - stemTopY) / Math.max(1, stemH);
            const w = Math.max(1, Math.round(stemW * (1 - t * 0.12)));
            const x0 = Math.round(cx - w / 2);
            for (let i = 0; i < w; i++) {
                const e = i / Math.max(1, w - 1);
                const col = (e > 0.68) ? colors.stemShadow : colors.stem;
                this.ctx.fillStyle = `rgb(${col.join(',')})`;
                this.ctx.fillRect(x0 + i, y, 1, 1);
            }
        }

        const cy = stemTopY;
        const rw = capW / 2;
        const rh = capH;
        for (let dy = 0; dy <= rh; dy++) {
            const ny = dy / rh;
            const hw = Math.sqrt(Math.max(0, 1 - ny * ny)) * rw;
            if (hw < 0.5) continue;
            const y = cy - dy;
            const x0 = Math.round(cx - hw);
            const x1 = Math.round(cx + hw);
            for (let x = x0; x <= x1; x++) {
                const nx = (x - cx) / rw;
                let light = 0.55 - nx * 0.38 + ny * 0.32;
                if (dy === 0) light -= 0.35;
                light += (fbm(x * 0.7, y * 0.7, 2, seed + 13) - 0.5) * 0.4;
                const col = pick4(clamp01(light),
                    colors.capHigh, colors.capBase,
                    colors.capMid, colors.capDark, x, y, 0.28);
                this.ctx.fillStyle = `rgb(${col.join(',')})`;
                this.ctx.fillRect(x, y, 1, 1);
            }
        }

        const gill = hexToRgb(PALETTE.CAP_GILL);
        for (let x = Math.round(cx - rw); x <= Math.round(cx + rw); x++) {
            const nx = (x - cx) / rw;
            if (Math.abs(nx) > 0.94) continue;
            if (Math.random() < 0.65) {
                this.ctx.fillStyle = `rgb(${gill.join(',')})`;
                this.ctx.fillRect(x, cy + 1, 1, 1);
            }
        }

        if (opts && opts.spot) {
            const spot = hexToRgb(PALETTE.CAP_SPOT);
            const spotCount = Math.round(capW * 0.55);
            for (let i = 0; i < spotCount; i++) {
                const nx = this.rand(-0.72, 0.72);
                const ny = this.rand(0.15, 0.85);
                if (nx * nx + ny * ny > 0.85) continue;
                const sx = Math.round(cx + nx * rw);
                const sy = Math.round(cy - ny * rh);
                this.ctx.fillStyle = `rgb(${spot.join(',')})`;
                this.ctx.fillRect(sx, sy, 1, 1);
                if (Math.random() > 0.55) this.ctx.fillRect(sx + 1, sy, 1, 1);
                if (Math.random() > 0.7) this.ctx.fillRect(sx, sy + 1, 1, 1);
            }
        }
    }
}