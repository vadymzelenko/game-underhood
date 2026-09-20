import { BaseGen } from './BaseGen.js';
import { PALETTE, hexToRgb, fbm, clamp01, pick4 } from './utils.js';

export class PebblesGenerator extends BaseGen {
    generate(size = 'medium', variant = 'scatter') {
        this.ctx.clearRect(0, 0, this.width, this.height);
        const groundY = this.height - 4;
        const isLarge = size === 'large', isSmall = size === 'small';

        const stones = [];
        if (variant === 'single') {
            const r = isLarge ? this.rand(4, 6) : isSmall ? this.rand(2, 3) : this.rand(3, 5);
            stones.push({ x: this.width / 2 + this.rand(-3, 3), y: groundY - r * 0.8, r });
        } else if (variant === 'cluster') {
            const n = isLarge ? 9 : isSmall ? 5 : 7;
            const ccx = this.width / 2;
            for (let i = 0; i < n; i++) {
                const a = this.rand(0, Math.PI * 2);
                const d = this.rand(0, 10);
                stones.push({
                    x: ccx + Math.cos(a) * d,
                    y: groundY - 2 - this.rand(0, 3) + Math.sin(a) * d * 0.35,
                    r: this.rand(2.2, 4.5) * (isLarge ? 1.2 : 1),
                });
            }
        } else {
            const n = isLarge ? 14 : isSmall ? 5 : 9;
            for (let i = 0; i < n; i++) {
                stones.push({
                    x: this.rand(4, this.width - 4),
                    y: groundY - this.rand(1, 4),
                    r: this.rand(1.2, 2.8) * (isLarge ? 1.15 : 1),
                });
            }
        }

        stones.sort((a, b) => a.y - b.y);
        for (const s of stones) this.drawStone(s.x, s.y, s.r);
        this.outline();
        return this.canvas;
    }

    drawStone(cx, cy, r) {
        const seed = this.seed;
        const HIGH = hexToRgb(PALETTE.TAN);
        const BASE = hexToRgb(PALETTE.GRAY);
        const SH1  = hexToRgb(PALETTE.PURPLE_GRAY);
        const SH2  = hexToRgb(PALETTE.DARK_PURPLE2);

        const rw = Math.max(1, r);
        const rh = Math.max(1, r * 0.72);
        const x0 = Math.floor(cx - rw - 1), x1 = Math.ceil(cx + rw + 1);
        const y0 = Math.floor(cy - rh - 1), y1 = Math.ceil(cy + rh + 1);

        for (let y = y0; y <= y1; y++) {
            for (let x = x0; x <= x1; x++) {
                const dx = (x - cx) / rw;
                const dy = (y - cy) / rh;
                const d = dx * dx + dy * dy;
                if (d > 1.35) continue;
                const n = fbm((x + seed * 0.01) * 0.9, y * 0.9, 2, seed + 5);
                const rough = (n - 0.5) * 0.6;
                if (d + rough > 1.0) continue;
                const toLX = -0.55, toLY = -0.83;
                const nl = Math.hypot(dx, dy) || 0.001;
                let light = (dx / nl) * toLX + (dy / nl) * toLY;
                light -= Math.max(0, dy) * 0.3;
                light += (n - 0.5) * 0.6;
                const v = clamp01(light * 0.5 + 0.5);
                const col = pick4(v, HIGH, BASE, SH1, SH2, x, y, 0.32);
                this.ctx.fillStyle = `rgb(${col.join(',')})`;
                this.ctx.fillRect(x, y, 1, 1);
            }
        }
    }
}