import { BaseGen } from './BaseGen.js';
import { PALETTE, hexToRgb, hash2 } from './utils.js';
import { CANOPY_SCHEMES, resolveScheme } from './schemes.js';

export class FernGenerator extends BaseGen {
    generate(size = 'medium', variant = 'green') {
        const cx = this.width / 2;
        const groundY = this.height - 4;
        const scheme = resolveScheme(
            CANOPY_SCHEMES[variant === 'berry' ? 'bush_berry' : 'bush_green']
        );
        const isLarge = size === 'large', isSmall = size === 'small';
        const stemCount = isLarge ? 7 : isSmall ? 4 : 5;
        const maxLen = isLarge ? 22 : isSmall ? 11 : 16;

        this.ctx.clearRect(0, 0, this.width, this.height);

        const baseH = isLarge ? 4 : isSmall ? 2 : 3;
        const baseW = isLarge ? 3 : 2;
        const trunkCol = hexToRgb(PALETTE.DARK_BROWN);
        const trunkShadow = hexToRgb(PALETTE.VERY_DARK);
        const baseX = Math.round(cx - baseW / 2);
        const baseY = groundY - baseH;

        for (let y = 0; y < baseH; y++) {
            for (let x = 0; x < baseW; x++) {
                this.ctx.fillStyle = x >= baseW - 1
                    ? `rgb(${trunkShadow.join(',')})`
                    : `rgb(${trunkCol.join(',')})`;
                this.ctx.fillRect(baseX + x, baseY + y, 1, 1);
            }
        }
        this.ctx.fillStyle = `rgb(${trunkCol.join(',')})`;
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

        this.outline();
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
                    this.ctx.fillStyle = `rgb(${leafCol.join(',')})`;
                    this.ctx.fillRect(Math.round(lx), Math.round(ly), 1, 1);
                    if (k <= lLen * 0.55 && isLarge) {
                        this.ctx.fillRect(Math.round(lx), Math.round(ly) + 1, 1, 1);
                    }
                }
            }
        }

        const tip = points[points.length - 1];
        const r = isLarge ? 2 : 1;
        for (let dy = -r; dy <= r; dy++) {
            for (let dx = -r; dx <= r; dx++) {
                if (dx*dx + dy*dy <= r*r + 0.4) {
                    const isHi = (dx + dy) < 0;
                    const c = isHi ? scheme.HIGH : scheme.BASE;
                    this.ctx.fillStyle = `rgb(${c.join(',')})`;
                    this.ctx.fillRect(Math.round(tip.x + dx), Math.round(tip.y + dy), 1, 1);
                }
            }
        }
    }
}