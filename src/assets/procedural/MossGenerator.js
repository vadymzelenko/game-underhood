import { BaseGen } from './BaseGen.js';
import { PALETTE, hexToRgb } from './utils.js';
import { CANOPY_SCHEMES, resolveScheme } from './schemes.js';
import { drawBlobMass } from './blobMass.js';

export class MossGenerator extends BaseGen {
    generate(size = 'medium', variant = 'flat') {
        this.ctx.clearRect(0, 0, this.width, this.height);
        const cx = this.width / 2;
        const groundY = this.height - 4;
        const isLarge = size === 'large', isSmall = size === 'small';
        const seed = this.seed;

        const W = isLarge ? 32 : isSmall ? 18 : 24;
        const H = isLarge ? 9  : isSmall ? 5  : 7;
        const mound = variant === 'mound' ? 1.5 : 1.0;

        const clusters = [];
        const n = isLarge ? 18 : isSmall ? 10 : 14;
        for (let i = 0; i < n; i++) {
            const t = i / (n - 1);
            const x = cx + (t - 0.5) * W * this.rand(0.8, 1.02);
            const edge = Math.abs((t - 0.5) * 2);
            const y = groundY - this.rand(0.5, H * mound * (1 - edge * 0.55));
            clusters.push({ x, y, r: this.rand(2.2, 4.2) * (isLarge ? 1.2 : isSmall ? 0.75 : 1) });
        }
        for (let i = 0; i < (isLarge ? 6 : 4); i++) {
            clusters.push({
                x: cx + this.rand(-W * 0.4, W * 0.4),
                y: groundY - this.rand(1, H * mound * 1.1),
                r: this.rand(1.5, 2.6),
            });
        }

        const scheme = resolveScheme(CANOPY_SCHEMES.moss);
        drawBlobMass(this.ctx, this.width, this.height, clusters, scheme, seed, 0.16);

        // Спорофиты
        const stemCol = hexToRgb(PALETTE.MOSS_MID);
        const capCol  = hexToRgb(PALETTE.GOLD);
        const capCol2 = hexToRgb(PALETTE.DARK_BROWN);
        const nSp = isLarge ? 6 : isSmall ? 3 : 4;
        for (let i = 0; i < nSp; i++) {
            const px = Math.round(cx + this.rand(-W * 0.35, W * 0.35));
            const baseY = groundY - this.rand(1, H * mound * 0.9);
            const h = Math.round(this.rand(4, 8));
            for (let k = 0; k <= h; k++) {
                this.ctx.fillStyle = `rgb(${stemCol.join(',')})`;
                this.ctx.fillRect(px, Math.round(baseY - k), 1, 1);
            }
            const capY = Math.round(baseY - h);
            this.ctx.fillStyle = `rgb(${capCol.join(',')})`;
            this.ctx.fillRect(px, capY - 1, 1, 1);
            this.ctx.fillRect(px - 1, capY, 1, 1);
            this.ctx.fillRect(px + 1, capY, 1, 1);
            this.ctx.fillRect(px, capY + 1, 1, 1);
            this.ctx.fillStyle = `rgb(${capCol2.join(',')})`;
            this.ctx.fillRect(px, capY, 1, 1);
        }

        this.groundShadow(cx, W * 1.1, groundY, 0.4);
        this.outline();
        return this.canvas;
    }
}