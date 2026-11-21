import { BaseGen } from './BaseGen.js';
import { PALETTE, hexToRgb, lerp } from './utils.js';

export class FlowerGenerator extends BaseGen {
    generate(size = 'medium', variant = 'daisy') {
        this.ctx.clearRect(0, 0, this.width, this.height);
        const cx = this.width / 2;
        const groundY = this.height - 4;
        const isLarge = size === 'large', isSmall = size === 'small';
        const scale = isLarge ? 1.25 : isSmall ? 0.75 : 1.0;

        const stemH = Math.round((isLarge ? 26 : isSmall ? 14 : 20) * this.rand(0.9, 1.1));
        const sway = this.rand(-2, 2) * scale;
        const pts = [];
        for (let i = 0; i <= stemH; i++) {
            const t = i / stemH;
            const x = cx + Math.sin(t * Math.PI * 0.5) * sway;
            const y = groundY - 1 - t * stemH;
            pts.push({ x, y });
        }
        const stemCol  = hexToRgb(PALETTE.STEM_GREEN);
        const stemDark = hexToRgb(PALETTE.STEM_DARK);
        for (let i = 0; i < pts.length; i++) {
            const p = pts[i];
            this.ctx.fillStyle = `rgb(${stemCol.join(',')})`;
            this.ctx.fillRect(Math.round(p.x), Math.round(p.y), 1, 1);
            if ((i & 1) === 0) {
                this.ctx.fillStyle = `rgb(${stemDark.join(',')})`;
                this.ctx.fillRect(Math.round(p.x) + 1, Math.round(p.y), 1, 1);
            }
        }

        this.drawLeaf(pts, 0.35, -1, scale);
        this.drawLeaf(pts, 0.62,  1, scale);
        if (isLarge) this.drawLeaf(pts, 0.5, 1, scale * 0.85);

        const topX = pts[pts.length - 1].x;
        const topY = pts[pts.length - 1].y;

        const WHITE  = hexToRgb(PALETTE.FLOWER_WHITE);
        const PINK   = hexToRgb(PALETTE.FLOWER_PINK);
        const RED    = hexToRgb(PALETTE.RED);
        const BLUE   = hexToRgb(PALETTE.FLOWER_BLUE);
        const VIOLET = hexToRgb(PALETTE.FLOWER_VIOLET);
        const PURPLE = hexToRgb(PALETTE.FLOWER_PURPLE);
        const YELLOW = hexToRgb(PALETTE.YELLOW);
        const GOLD   = hexToRgb(PALETTE.GOLD);
        const BLACK  = hexToRgb(PALETTE.ALMOST_BLACK);

        if (variant === 'daisy')      this.drawRadialFlower(topX, topY, 8, 6*scale, 2.2*scale, WHITE, YELLOW, 2.4*scale);
        else if (variant === 'poppy') this.drawRadialFlower(topX, topY, 5, 7*scale, 3.6*scale, RED,   BLACK, 2*scale);
        else if (variant === 'cornflower') this.drawRadialFlower(topX, topY, 12, 5*scale, 1.5*scale, BLUE, VIOLET, 2*scale);
        else if (variant === 'pink')  this.drawRadialFlower(topX, topY, 6, 4.5*scale, 2.5*scale, PINK, GOLD, 2*scale);
        else if (variant === 'bell')  this.drawBellFlower(pts, scale, VIOLET, PURPLE);
        else if (variant === 'spike') this.drawSpikeFlower(topX, topY, scale, PURPLE, VIOLET);

        this.groundShadow(cx, 4, groundY, 0.4);
        this.outline();
        return this.canvas;
    }

    drawLeaf(pts, t, side, scale) {
        const idx = Math.min(pts.length - 1, Math.max(0, Math.floor(t * (pts.length - 1))));
        const p = pts[idx];
        const leafLen = Math.max(2, Math.round(6 * scale));
        const leafCol  = hexToRgb(PALETTE.STEM_GREEN);
        const leafLite = hexToRgb(PALETTE.LEAF_LIGHT);
        for (let i = 0; i < leafLen; i++) {
            const tt = i / leafLen;
            const lx = p.x + side * i * 0.9;
            const ly = p.y - i * 0.35 - Math.sin(tt * Math.PI) * 1.4;
            const w = Math.max(1, Math.round(2 * Math.sin(tt * Math.PI) + 0.5));
            for (let k = 0; k < w; k++) {
                const c = (i < leafLen * 0.5 && k === 0) ? leafLite : leafCol;
                this.ctx.fillStyle = `rgb(${c.join(',')})`;
                this.ctx.fillRect(Math.round(lx), Math.round(ly) + k, 1, 1);
            }
        }
    }

    drawRadialFlower(cx, cy, petals, len, halfW, petalCol, centerCol, centerR) {
        for (let i = 0; i < petals; i++) {
            const a = (i / petals) * Math.PI * 2 - Math.PI / 2 + this.rand(-0.06, 0.06);
            const ux = Math.cos(a), uy = Math.sin(a);
            const px = -uy, py = ux;
            const shade = -0.45 * ux - 0.6 * uy;
            const steps = Math.ceil(len);
            for (let d = 1; d <= steps; d++) {
                const t = d / steps;
                const wHalf = halfW * Math.sin(t * Math.PI) * (1 - t * 0.12);
                const wI = Math.ceil(wHalf);
                for (let k = -wI; k <= wI; k++) {
                    if (Math.abs(k) > wHalf) continue;
                    const x = Math.round(cx + ux * d + px * k);
                    const y = Math.round(cy + uy * d + py * k);
                    const edge = Math.abs(k) / Math.max(0.5, wHalf);
                    let col = petalCol;
                    if (edge > 0.72 || shade > 0.25 || t > 0.88) {
                        col = [petalCol[0]*0.75|0, petalCol[1]*0.72|0, petalCol[2]*0.78|0];
                    } else if (shade < -0.35 && edge < 0.4 && t < 0.7) {
                        col = [Math.min(255, petalCol[0]*1.18)|0,
                            Math.min(255, petalCol[1]*1.18)|0,
                            Math.min(255, petalCol[2]*1.12)|0];
                    }
                    this.ctx.fillStyle = `rgb(${col.join(',')})`;
                    this.ctx.fillRect(x, y, 1, 1);
                }
            }
        }
        const cr = Math.ceil(centerR);
        for (let dy = -cr; dy <= cr; dy++) {
            for (let dx = -cr; dx <= cr; dx++) {
                if (dx * dx + dy * dy > centerR * centerR + 0.6) continue;
                let col = centerCol;
                const light = -0.5 * dx - 0.5 * dy;
                if (light > centerR * 0.3) {
                    col = [Math.min(255, centerCol[0]*1.22)|0,
                        Math.min(255, centerCol[1]*1.22)|0,
                        Math.min(255, centerCol[2]*1.15)|0];
                } else if (light < -centerR * 0.4) {
                    col = [centerCol[0]*0.72|0, centerCol[1]*0.72|0, centerCol[2]*0.78|0];
                }
                this.ctx.fillStyle = `rgb(${col.join(',')})`;
                this.ctx.fillRect(Math.round(cx + dx), Math.round(cy + dy), 1, 1);
            }
        }
    }

    drawBellFlower(pts, scale, colMid, colDark) {
        const n = 3 + Math.floor(this.rand(0, 2));
        const stemCol = hexToRgb(PALETTE.STEM_GREEN);
        for (let i = 0; i < n; i++) {
            const t = 0.5 + i * 0.16;
            const idx = Math.min(pts.length - 1, Math.floor(t * (pts.length - 1)));
            const p = pts[idx];
            const side = (i % 2 === 0) ? -1 : 1;
            const sx = p.x + side * (2 + i * 1.2);
            const sy = p.y + 1;
            for (let k = 0; k <= Math.abs(side) * (2 + i); k++) {
                const tt = k / Math.max(1, Math.abs(side) * (2 + i));
                const px = Math.round(lerp(p.x, sx, tt));
                const py = Math.round(lerp(p.y, sy, tt));
                this.ctx.fillStyle = `rgb(${stemCol.join(',')})`;
                this.ctx.fillRect(px, py, 1, 1);
            }
            const r = Math.max(1.4, 2 * scale);
            const rh = r * 2.2;
            for (let dy = 0; dy <= rh; dy++) {
                const t2 = dy / rh;
                const width = r * Math.sin(Math.min(1, t2 * 1.05) * Math.PI * 0.85) * (1 - t2 * 0.15);
                const wI = Math.ceil(width);
                for (let dx = -wI; dx <= wI; dx++) {
                    if (Math.abs(dx) > width) continue;
                    const col = dx < 0 ? colMid : colDark;
                    this.ctx.fillStyle = `rgb(${col.join(',')})`;
                    this.ctx.fillRect(Math.round(sx + dx), Math.round(sy + dy), 1, 1);
                }
            }
            this.ctx.fillStyle = `rgb(${colDark.join(',')})`;
            for (let dx = -Math.ceil(r); dx <= Math.ceil(r); dx += 2) {
                this.ctx.fillRect(Math.round(sx + dx), Math.round(sy + rh + 1), 1, 1);
            }
        }
    }

    drawSpikeFlower(cx, cy, scale, colMain, colDark) {
        const h = Math.round(14 * scale);
        for (let y = 0; y < h; y++) {
            const t = y / h;
            const w = Math.sin(t * Math.PI * 0.95) * 3.2 * scale + 0.8;
            const y2 = Math.round(cy - h + y + 2);
            const wI = Math.ceil(w);
            for (let dx = -wI; dx <= wI; dx++) {
                if (Math.abs(dx) > w * this.rand(0.5, 1.05)) continue;
                const col = (dx < 0 && Math.random() > 0.35) ? colMain : colDark;
                this.ctx.fillStyle = `rgb(${col.join(',')})`;
                this.ctx.fillRect(Math.round(cx + dx), y2, 1, 1);
            }
        }
        this.ctx.fillStyle = `rgb(${colDark.join(',')})`;
        this.ctx.fillRect(Math.round(cx), Math.round(cy - h + 1), 1, 2);
    }
}