import { BaseGen } from './BaseGen.js';
import { PALETTE, hexToRgb, lerp, hash2 } from './utils.js';
import { CANOPY_SCHEMES, resolveScheme } from './schemes.js';
import { drawBlobMass } from './blobMass.js';

export class BushGenerator extends BaseGen {
    generate(size = 'medium', variant = 'green') {
        const cx = this.width / 2;
        const groundY = this.height - 4;
        const isLarge = size === 'large', isSmall = size === 'small';
        const seed = this.seed;

        this.ctx.clearRect(0, 0, this.width, this.height);

        const W = isLarge ? 30 : isSmall ? 16 : 22;
        const H = isLarge ? 20 : isSmall ? 12 : 16;
        const baseY = groundY - 1;
        const topY  = baseY - H;

        // Веточки
        const stemCount = isLarge ? 5 : isSmall ? 3 : 4;
        const stemCol = hexToRgb(PALETTE.DARK_BROWN);
        const stemShadow = hexToRgb(PALETTE.VERY_DARK);
        for (let i = 0; i < stemCount; i++) {
            const t = stemCount === 1 ? 0.5 : i / (stemCount - 1);
            const spread = (t - 0.5) * 2;
            const sx = Math.round(cx + spread * W * 0.30 + this.rand(-1, 1));
            const sy = groundY - 1;
            const ey = baseY - H * this.rand(0.35, 0.62);
            const ex = sx + spread * 3 + this.rand(-1, 1);
            const steps = Math.max(2, Math.round(Math.abs(sy - ey)));
            for (let s = 0; s <= steps; s++) {
                const tt = s / steps;
                const px = Math.round(lerp(sx, ex, tt));
                const py = Math.round(lerp(sy, ey, tt));
                this.ctx.fillStyle = `rgb(${stemCol.join(',')})`;
                this.ctx.fillRect(px, py, 1, 1);
                this.ctx.fillStyle = `rgb(${stemShadow.join(',')})`;
                this.ctx.fillRect(px + 1, py, 1, 1);
                if (s === Math.floor(steps * 0.55) && Math.random() > 0.4) {
                    const dir = Math.random() < 0.5 ? -1 : 1;
                    for (let k = 1; k <= 3; k++) {
                        const bx = px + dir * k;
                        const by = py - Math.round(k * 0.7);
                        this.ctx.fillStyle = `rgb(${stemCol.join(',')})`;
                        this.ctx.fillRect(bx, by, 1, 1);
                    }
                }
            }
        }

        // Крона
        const clusters = [];
        const rows = 7;
        for (let r = 0; r < rows; r++) {
            const t = r / (rows - 1);
            const y = lerp(baseY - 2, topY + 2, t);
            const shape = Math.sin((0.25 + t * 0.75) * Math.PI * 0.85);
            const rowW = W * (0.55 + 0.45 * shape);
            const count = Math.max(2, Math.round(rowW / 3.4));
            for (let i = 0; i < count; i++) {
                const xt = count === 1 ? 0 : (i / (count - 1)) * 2 - 1;
                const x = cx + xt * rowW * 0.5 * this.rand(0.72, 1.0);
                clusters.push({ x, y: y + this.rand(-1.6, 1.6), r: this.rand(3.0, 4.8) });
            }
        }
        const periph = isLarge ? 18 : isSmall ? 8 : 13;
        for (let i = 0; i < periph; i++) {
            const a = this.rand(0, Math.PI * 2);
            const rx = W * 0.5 * this.rand(0.75, 1.05);
            const ry = H * 0.5 * this.rand(0.75, 1.05);
            const px = cx + Math.cos(a) * rx;
            const py = (baseY - H * 0.5) + Math.sin(a) * ry;
            if (py > baseY) continue;
            if (py < topY - 1) continue;
            clusters.push({ x: px, y: py, r: this.rand(1.6, 2.9) });
        }

        const schemeKey = {
            berry: 'bush_berry',
            dark: 'bush_dark',
            autumn: 'bush_autumn',
            green: 'bush_green',
        }[variant] || 'bush_green';
        const scheme = resolveScheme(CANOPY_SCHEMES[schemeKey]);

        drawBlobMass(this.ctx, this.width, this.height, clusters, scheme, seed, 0.11);

        if (variant === 'berry') {
            const berryCol = hexToRgb(PALETTE.DARK_PINK);
            const berryHi  = hexToRgb(PALETTE.PINK);
            const berryCount = isLarge ? 14 : isSmall ? 6 : 10;
            for (let i = 0; i < berryCount; i++) {
                const c = clusters[Math.floor(Math.random() * clusters.length)];
                if (!c) continue;
                const a = this.rand(0, Math.PI * 2);
                const rad = c.r * this.rand(0.55, 0.95);
                const bx = Math.round(c.x + Math.cos(a) * rad);
                const by = Math.round(c.y + Math.sin(a) * rad * 0.9);
                const img = this.ctx.getImageData(bx, by, 1, 1).data;
                if (img[3] === 0) continue;
                this.ctx.fillStyle = `rgb(${berryCol.join(',')})`;
                this.ctx.fillRect(bx, by, 1, 1);
                if (Math.random() > 0.4) {
                    this.ctx.fillStyle = `rgb(${berryHi.join(',')})`;
                    this.ctx.fillRect(bx - 1, by - 1, 1, 1);
                }
            }
        }

        this.groundShadow(cx, W * 1.1, groundY, 0.45);
        this.outline();
        return this.canvas;
    }
}