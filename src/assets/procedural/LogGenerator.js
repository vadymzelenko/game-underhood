import { BaseGen } from './BaseGen.js';
import { PALETTE, hexToRgb, lerp, fbm, vnoise } from './utils.js';

export class LogGenerator extends BaseGen {
    constructor(w = 64, h = 64, seed = null) {
        super(w, h, seed);
        this.bodyTopCol    = hexToRgb(PALETTE.BROWN);
        this.bodyMidCol    = hexToRgb(PALETTE.DARK_BROWN);
        this.bodyShadowCol = hexToRgb(PALETTE.VERY_DARK);
        this.veryDarkCol   = hexToRgb(PALETTE.ALMOST_BLACK);
        this.tanCol        = hexToRgb(PALETTE.TAN);
    }

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
            case 'tilted':  tilt = this.rand(2, 4) * (Math.random() < 0.5 ? -1 : 1); break;
            case 'broken':  brokenEnd = Math.random() < 0.5 ? -1 : 1; break;
            case 'branchy': hasBranch = true; break;
            case 'rooted':  rootEnd = Math.random() < 0.5 ? -1 : 1; len *= 0.9; thick *= 1.1; break;
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

        this.ctx.clearRect(0, 0, this.width, this.height);

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
                let col = this.bodyMidCol;
                if (t < 0.28) col = this.bodyTopCol;
                else if (t > 0.78) col = this.bodyShadowCol;
                const fiber = fbm(x * 0.9, row * 0.35, 3, this.seed + 7);
                const grain = vnoise(x * 1.8, row * 0.9, this.seed + 12);
                const v = fiber * 0.7 + grain * 0.3;
                if (v > 0.72) col = this.bodyShadowCol;
                else if (v < 0.28 && t < 0.55) col = this.bodyTopCol;
                if (t > 0.88) col = this.bodyShadowCol;
                this.ctx.fillStyle = `rgb(${col.join(',')})`;
                this.ctx.fillRect(x, colTop + row, 1, 1);
            }
        }

        const yLeft  = yCenterBase + yOffAt(x0);
        const yRight = yCenterBase + yOffAt(x1 - 1);
        if (brokenEnd === -1) { this.drawBrokenEnd(x0, yLeft, thickI, -1); this.drawLogEnd(x1 - 1, yRight, thickI, false); }
        else if (brokenEnd === 1) { this.drawLogEnd(x0, yLeft, thickI, true); this.drawBrokenEnd(x1 - 1, yRight, thickI, 1); }
        else { this.drawLogEnd(x0, yLeft, thickI, true); this.drawLogEnd(x1 - 1, yRight, thickI, false); }

        const knotCount = size === 'large' ? 3 : size === 'medium' ? 2 : 1;
        for (let i = 0; i < knotCount; i++) {
            const kx = Math.floor(x0 + len * this.rand(0.25, 0.85));
            const ky = Math.round(yCenterBase + yOffAt(kx) + this.rand(-thickI * 0.28, thickI * 0.28));
            this.drawKnot(kx, ky);
        }

        if (hasBranch) this.drawBranch(x0, yCenterBase, thickI, len);

        // Тень под бревном
        this.ctx.fillStyle = 'rgba(18,14,35,0.5)';
        for (let x = x0; x < x1; x++) {
            const yOff = yOffAt(x);
            const yBottom = Math.round(yCenterBase + yOff + thickI / 2);
            this.ctx.fillRect(x, yBottom, 1, 1);
        }

        this.outline();
        return this.canvas;
    }

    drawLogEnd(x, yCenter, thickI, isLeft) {
        const rY = thickI / 2;
        const rX = Math.max(2, Math.round(rY * 0.45));
        const rings = [this.tanCol, this.bodyTopCol, this.bodyMidCol];
        for (let ring = rings.length - 1; ring >= 0; ring--) {
            const rrX = rX * (ring + 1) / rings.length;
            const rrY = rY * (ring + 1) / rings.length;
            this.ctx.fillStyle = `rgb(${rings[ring].join(',')})`;
            this.ctx.beginPath();
            this.ctx.ellipse(x, yCenter, Math.max(1, rrX), Math.max(1, rrY), 0, 0, Math.PI * 2);
            this.ctx.fill();
        }
        this.ctx.fillStyle = 'rgba(0,0,0,0.35)';
        this.ctx.fillRect(isLeft ? x + 1 : x - 1, Math.round(yCenter - rY), 1, thickI);
    }

    drawBrokenEnd(x, yCenter, thickI, dir) {
        const halfT = Math.floor(thickI / 2);
        const colors = [this.veryDarkCol, this.bodyMidCol, this.bodyTopCol];
        for (let i = 0; i < thickI; i++) {
            const len = 1 + Math.floor(this.rand(0, 3));
            const y = Math.round(yCenter - halfT + i);
            for (let k = 0; k < len; k++) {
                const px = x + dir * k;
                const c = colors[Math.min(k, colors.length - 1)];
                this.ctx.fillStyle = `rgb(${c.join(',')})`;
                this.ctx.fillRect(px, y, 1, 1);
            }
            if (Math.random() < 0.35) {
                this.ctx.fillStyle = `rgb(${this.tanCol.join(',')})`;
                this.ctx.fillRect(x + dir * (len + 1), y, 1, 1);
            }
        }
    }

    drawKnot(x, y) {
        this.ctx.fillStyle = `rgb(${this.tanCol.join(',')})`;
        this.ctx.beginPath(); this.ctx.arc(x, y, 1.6, 0, Math.PI * 2); this.ctx.fill();
        this.ctx.fillStyle = `rgb(${this.veryDarkCol.join(',')})`;
        this.ctx.beginPath(); this.ctx.arc(x, y, 0.9, 0, Math.PI * 2); this.ctx.fill();
    }

    drawBranch(x0, yCenterBase, thickI, len) {
        const bx = Math.floor(x0 + len * this.rand(0.3, 0.7));
        const byTop = Math.round(yCenterBase - thickI / 2);
        const dir = Math.random() < 0.5 ? -1 : 1;
        const bLen = Math.round(thickI * this.rand(1.2, 2.0));
        let px = bx, py = byTop;
        for (let s = 0; s < bLen; s++) {
            const t = s / Math.max(1, bLen - 1);
            const w = Math.max(1, Math.round(thickI * 0.35 * (1 - t * 0.7)));
            const wob = Math.sin(t * 3.5) * 0.8;
            const cx2 = Math.round(px + dir * t * 1.5 + wob * 0.5);
            const cy2 = Math.round(py - t * (bLen * 0.9) - Math.abs(wob) * 0.3);
            for (let k = -Math.floor(w/2); k <= Math.floor(w/2); k++) {
                this.ctx.fillStyle = (k >= 0 && w > 1) ? PALETTE.VERY_DARK : PALETTE.DARK_BROWN;
                this.ctx.fillRect(cx2 + k, cy2, 1, 1);
            }
            px = cx2; py = cy2;
        }
    }
}