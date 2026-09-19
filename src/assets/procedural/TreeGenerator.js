import { BaseGen } from './BaseGen.js';

import { CANOPY_SCHEMES, resolveScheme } from './schemes.js';
import { PALETTE, hexToRgb, lerp, fbm, vnoise, hash2, pick4, clamp01 } from './utils.js';   // ← строка 5, дубль + PALETTE повторно

export class TreeGenerator extends BaseGen {
    generate(type = 'oak', size = 'medium', variant = 'green') {
        this.type = type;
        this.size = size;
        this.variant = variant;
        this.branches = [];
        this.collarClusters = [];

        const cx = this.width / 2;
        const bottomY = this.height - 4;
        this.bottomY = bottomY;
        this.centerX = cx;

        let trunkW, trunkH;

        if (type === 'oak') {
            const isLarge = size === 'large';
            trunkW = isLarge ? this.rand(7, 10) : this.rand(5, 7);
            trunkH = isLarge ? this.rand(18, 22) : this.rand(12, 15);
            this.trunk = {
                x: cx - trunkW/2, y: bottomY - trunkH, w: trunkW, h: trunkH,
                color: PALETTE.BROWN, shadow: PALETTE.DARK_BROWN,
                kind: 'oak', taper: 0.65,
            };
            this.buildOakBranches(cx, bottomY - trunkH, trunkW, size, PALETTE.BROWN, PALETTE.DARK_BROWN);
            this.clusters = this.getOakClusters(cx, bottomY - trunkH, size);
            this.buildCollar(cx, bottomY - trunkH, trunkW, PALETTE.DARK_BROWN, this.rand(2.4, 3.4));
            this.scheme = resolveScheme(CANOPY_SCHEMES['oak_green']);
        } else if (type === 'deadtree') {
            const isLarge = size === 'large';
            trunkW = isLarge ? this.rand(6, 9) : this.rand(4, 6);
            trunkH = isLarge ? this.rand(24, 30) : this.rand(16, 22);
            this.trunk = {
                x: cx - trunkW/2, y: bottomY - trunkH, w: trunkW, h: trunkH,
                color: PALETTE.VERY_DARK, shadow: PALETTE.ALMOST_BLACK,
                kind: 'dead', taper: 0.4,
            };
            this.clusters = [];
            this.scheme = resolveScheme(CANOPY_SCHEMES['dead']);
        } else if (type === 'pine') {
            const isLarge = size === 'large';
            trunkW = isLarge ? 5 : 4;
            trunkH = isLarge ? 30 : 22;
            this.trunk = {
                x: cx - trunkW/2, y: bottomY - trunkH, w: trunkW, h: trunkH,
                color: PALETTE.DARK_BROWN, shadow: PALETTE.VERY_DARK,
                kind: 'oak', taper: 0.7,
            };
            this.clusters = this.getPineClusters(cx, bottomY - trunkH, size);
            this.buildCollar(cx, bottomY - trunkH, trunkW, PALETTE.VERY_DARK, this.rand(1.4, 2.0));
            this.scheme = resolveScheme(CANOPY_SCHEMES['pine_green']);
        } else if (type === 'spruce') {
            const isLarge = size === 'large';
            trunkW = isLarge ? 5 : 4;
            trunkH = isLarge ? 8 : 5;
            this.trunk = {
                x: cx - trunkW/2, y: bottomY - trunkH, w: trunkW, h: trunkH,
                color: PALETTE.VERY_DARK, shadow: PALETTE.ALMOST_BLACK,
                kind: 'oak', taper: 0.8,
            };
            this.clusters = this.getSpruceClusters(cx, bottomY, size);
            this.scheme = resolveScheme(CANOPY_SCHEMES['spruce_green']);
        } else if (type === 'birch') {
            const isLarge = size === 'large';
            trunkW = isLarge ? 4 : 3;
            trunkH = isLarge ? 22 : 15;
            this.trunk = {
                x: cx - trunkW/2, y: bottomY - trunkH, w: trunkW, h: trunkH,
                kind: 'birch', taper: 0.85,
            };
            this.clusters = this.getBirchClusters(cx, bottomY - trunkH, size);
            this.buildCollar(cx, bottomY - trunkH, trunkW, PALETTE.GRAY, this.rand(1.2, 1.8));
            this.scheme = resolveScheme(CANOPY_SCHEMES[variant === 'green' ? 'birch_green' : variant]);
        }

        this.render();
        return this.canvas;
    }

    buildOakBranches(cx, trunkTopY, trunkW, size, color, shadowColor) {
        const count = size === 'large' ? 3 : 2;
        const baseW = Math.max(2, trunkW * 0.7);
        for (let i = 0; i < count; i++) {
            const t = count === 1 ? 0.5 : i / (count - 1);
            const spread = (t - 0.5) * 2;
            const angle = -Math.PI / 2 + spread * 0.8;
            const len = (size === 'large' ? 13 : 9) * this.rand(0.85, 1.15);
            const x0 = cx + spread * trunkW * 0.15;
            const y0 = trunkTopY + this.rand(1, 3);
            const x1 = x0 + Math.cos(angle) * len;
            const y1 = y0 + Math.sin(angle) * len;
            this.branches.push({ pts: this.makeTwistedCurve(x0, y0, x1, y1, 1.0, 3.0), w0: baseW, color, shadowColor });
        }
        if (size === 'large') {
            for (let i = 0; i < 2; i++) {
                const side = i === 0 ? -1 : 1;
                const angle = -Math.PI / 2 + side * 1.15;
                const len = 6 * this.rand(0.8, 1.2);
                const x0 = cx + side * trunkW * 0.6;
                const y0 = trunkTopY - 1;
                const x1 = x0 + Math.cos(angle) * len;
                const y1 = y0 + Math.sin(angle) * len;
                this.branches.push({ pts: this.makeTwistedCurve(x0, y0, x1, y1, 0.7, 1.8), w0: Math.max(2, baseW * 0.7), color, shadowColor });
            }
        }
    }

    makeTwistedCurve(x0, y0, x1, y1, bendScale = 1, bendMax = 2.5) {
        const dx = x1 - x0, dy = y1 - y0;
        const len = Math.hypot(dx, dy) || 1;
        const px = -dy / len, py = dx / len;
        const segs = 5;
        const pts = [{ x: x0, y: y0 }];
        const waves = this.rand(1.2, 2.2);
        for (let k = 1; k < segs; k++) {
            const s = k / segs;
            const wave = Math.sin(s * Math.PI * waves) * bendMax * bendScale * (1 - s * 0.35);
            pts.push({
                x: lerp(x0, x1, s) + px * wave,
                y: lerp(y0, y1, s) + py * wave,
            });
        }
        pts.push({ x: x1, y: y1 });
        return pts;
    }

    buildCollar(cx, trunkTopY, trunkW, barkColor, radiusScale) {
        const n = 3;
        for (let i = 0; i < n; i++) {
            const angle = this.rand(0, Math.PI * 2);
            const dist = trunkW * this.rand(0.15, 0.4);
            this.collarClusters.push({
                x: cx + Math.cos(angle) * dist,
                y: trunkTopY + this.rand(-1, 2),
                r: trunkW * radiusScale * this.rand(0.35, 0.55),
                color: hexToRgb(barkColor),
            });
        }
    }

    render() {
        this.ctx.clearRect(0, 0, this.width, this.height);
        this.drawTrunkShape();
        this.drawBranches();
        this.renderCollar();
        this.renderCanopy();
        this.outline();
    }

    drawTrunkShape() {
        const t = this.trunk;
        if (t.kind === 'birch') this.drawBirchTrunk(t.x, t.y, t.w, t.h);
        else if (t.kind === 'dead') this.drawDeadTrunk(t.x, t.y, t.w, t.h, t.taper ?? 0.4);
        else this.drawTrunk(t.x, t.y, t.w, t.h, t.color, t.shadow, t.taper ?? 0.6);
    }

    drawTrunk(x, y, w, h, color, shadowColor, taper = 0.6) {
        const col = hexToRgb(color);
        const shCol = hexToRgb(shadowColor);
        const seed = this.seed;
        for (let row = 0; row < h; row++) {
            const t = row / (h - 1 || 1);
            const widthT = 1 - (1 - taper) * t;
            const rowW = Math.max(1, Math.round(w * widthT));
            const rowX = Math.round(x + (w - rowW) / 2);
            for (let i = 0; i < rowW; i++) {
                const e = i / Math.max(1, rowW - 1);
                let c = col;
                if (e > 0.72) c = shCol;
                const n = fbm((rowX + i) * 0.9, row * 0.25, 2, seed + 7);
                if (n > 0.63 && e > 0.25) c = shCol;
                this.ctx.fillStyle = `rgb(${c[0]},${c[1]},${c[2]})`;
                this.ctx.fillRect(rowX + i, y + row, 1, 1);
            }
        }
        const flareW = Math.round(w * 1.55);
        for (let r = 0; r < 2; r++) {
            const t = r;
            const fw = Math.round(lerp(w, flareW, 1 - t));
            const fx = Math.round(x + (w - fw) / 2);
            this.ctx.fillStyle = color;
            this.ctx.fillRect(fx, y + h - 2 + r, fw, 1);
            const sw = Math.max(1, Math.round(fw * 0.3));
            this.ctx.fillStyle = shadowColor;
            this.ctx.fillRect(fx + fw - sw, y + h - 2 + r, sw, 1);
        }
    }

    drawDeadTrunk(x, y, w, h, taper = 0.45) {
        const base = hexToRgb(PALETTE.VERY_DARK);
        const shadowCol = hexToRgb(PALETTE.ALMOST_BLACK);
        const accentBrown = hexToRgb(PALETTE.DARK_BROWN);
        const accentBrown2 = hexToRgb(PALETTE.BROWN);
        const seed = this.seed;

        for (let row = 0; row < h; row++) {
            const t = row / (h - 1 || 1);
            const widthT = 1 - (1 - taper) * t;
            const rowW = Math.max(1, Math.round(w * widthT));
            const rowX = Math.round(x + (w - rowW) / 2);
            for (let i = 0; i < rowW; i++) {
                const e = i / Math.max(1, rowW - 1);
                let c = base;
                if (e > 0.68) c = shadowCol;
                const n  = fbm((rowX + i) * 0.9, row * 0.3, 3, seed + 7);
                const n2 = vnoise((rowX + i) * 1.5, row * 0.55, seed + 19);
                if (n2 > 0.84) c = accentBrown2;
                else if (n > 0.7 && e > 0.15 && e < 0.7) c = accentBrown;
                else if (n > 0.75) c = shadowCol;
                else if (n < 0.26 && e < 0.6) c = accentBrown;
                this.ctx.fillStyle = `rgb(${c[0]},${c[1]},${c[2]})`;
                this.ctx.fillRect(rowX + i, y + row, 1, 1);
            }
        }
        const topW = Math.max(2, Math.round(w * taper));
        const topX = Math.round(x + (w - topW) / 2);
        const spikes = 3 + Math.floor(this.rand(0, 3));
        for (let i = 0; i < spikes; i++) {
            const sx = topX + Math.floor(this.rand(-1, topW + 1));
            const sh = 1 + Math.floor(this.rand(0, 2));
            const c = hash2(i, 7, seed) > 0.5 ? base : accentBrown;
            this.ctx.fillStyle = `rgb(${c[0]},${c[1]},${c[2]})`;
            this.ctx.fillRect(sx, y - sh, 1, sh + 1);
        }
        this.ctx.fillStyle = `rgb(${shadowCol[0]},${shadowCol[1]},${shadowCol[2]})`;
        this.ctx.fillRect(topX, y, topW, 1);
    }

    drawBirchTrunk(x, y, w, h) {
        const seed = this.seed;
        for (let row = 0; row < h; row++) {
            const t = row / (h - 1 || 1);
            const rowW = Math.max(1, Math.round(w * (1 - 0.15 * t)));
            const rowX = Math.round(x + (w - rowW) / 2);
            for (let i = 0; i < rowW; i++) {
                const e = i / Math.max(1, rowW - 1);
                const base = e > 0.65 ? PALETTE.GRAY : PALETTE.TAN;
                this.ctx.fillStyle = base;
                this.ctx.fillRect(rowX + i, y + row, 1, 1);
            }
            if (hash2(row, 13, seed) > 0.72) {
                const stripeW = Math.max(1, Math.floor(rowW * (0.3 + hash2(row, 47, seed) * 0.6)));
                const sx = rowX + Math.floor(hash2(row, 91, seed) * (rowW - stripeW));
                this.ctx.fillStyle = PALETTE.ALMOST_BLACK;
                this.ctx.fillRect(sx, y + row, stripeW, 1);
            }
        }
    }

    drawBranches() {
        for (const b of this.branches) {
            const pts = b.pts;
            let totalLen = 0;
            for (let i = 1; i < pts.length; i++) totalLen += Math.hypot(pts[i].x - pts[i-1].x, pts[i].y - pts[i-1].y);
            let accLen = 0;
            for (let s = 0; s < pts.length - 1; s++) {
                const p0 = pts[s], p1 = pts[s + 1];
                const segLen = Math.hypot(p1.x - p0.x, p1.y - p0.y);
                const steps = Math.max(2, Math.round(segLen * 2));
                for (let k = 0; k <= steps; k++) {
                    const t = k / steps;
                    const gt = totalLen > 0 ? (accLen + segLen * t) / totalLen : 0;
                    const x = lerp(p0.x, p1.x, t);
                    const y = lerp(p0.y, p1.y, t);
                    const th = Math.max(1, Math.round(b.w0 * (1 - gt * 0.7)));
                    for (let kk = -Math.floor(th/2); kk <= Math.floor(th/2); kk++) {
                        const isShadow = kk > 0 && th > 1;
                        this.ctx.fillStyle = isShadow ? b.shadowColor : b.color;
                        this.ctx.fillRect(Math.round(x), Math.round(y + kk), 1, 1);
                    }
                }
                accLen += segLen;
            }
        }
    }

    renderCollar() {
        if (!this.collarClusters.length) return;
        for (const c of this.collarClusters) {
            const r = Math.round(c.r);
            this.ctx.fillStyle = `rgb(${c.color[0]},${c.color[1]},${c.color[2]})`;
            for (let y = -r; y <= Math.round(r * 0.55); y++) {
                const base = Math.sqrt(Math.max(0, r * r - y * y));
                const jitter = (fbm((c.x + y * 1.7) * 0.5, y * 0.7, 2, this.seed + 3) - 0.5) * 1.6;
                const rowW = base + jitter;
                if (rowW <= 0) continue;
                this.ctx.fillRect(Math.round(c.x - rowW), Math.round(c.y + y), Math.round(rowW * 2), 1);
            }
        }
    }

    getOakClusters(cx, trunkTopY, size) {
        const clusters = [];
        if (size === 'large') {
            const centers = [
                { x: cx - 9, y: trunkTopY + 1 },
                { x: cx + 9, y: trunkTopY + 3 },
                { x: cx,     y: trunkTopY - 9 },
                { x: cx - 4, y: trunkTopY - 3 },
                { x: cx + 5, y: trunkTopY - 5 },
            ];
            centers.forEach(c => {
                clusters.push({ x: c.x, y: c.y, r: this.rand(7, 10) });
                const extra = 2 + Math.floor(this.rand(0, 2));
                for (let i = 0; i < extra; i++) {
                    const angle = this.rand(0, Math.PI * 2);
                    const dist = this.rand(4, 8);
                    clusters.push({ x: c.x + Math.cos(angle) * dist,
                        y: c.y + Math.sin(angle) * dist * 0.7, r: this.rand(4.5, 7) });
                }
            });
        } else {
            clusters.push({ x: cx, y: trunkTopY - 2, r: this.rand(8, 10) });
            clusters.push({ x: cx - 5, y: trunkTopY, r: this.rand(5, 7) });
            clusters.push({ x: cx + 5, y: trunkTopY - 1, r: this.rand(5, 7) });
            for (let i = 0; i < 4; i++) {
                const angle = this.rand(0, Math.PI * 2);
                const dist = this.rand(4, 7);
                clusters.push({ x: cx + Math.cos(angle) * dist,
                    y: trunkTopY - 2 + Math.sin(angle) * dist * 0.7, r: this.rand(4, 6) });
            }
        }
        return clusters;
    }

    getPineClusters(cx, trunkTopY, size) {
        const clusters = [];
        const tiers = size === 'large' ? 4 : 3;
        let y = trunkTopY + (size === 'large' ? 8 : 5);
        let maxW = size === 'large' ? 12 : 9;
        for (let i = 0; i < tiers; i++) {
            const count = 3 + Math.floor(this.rand(0, 3));
            for (let j = 0; j < count; j++) {
                const tx = count === 1 ? 0 : (j / (count - 1)) * 2 - 1;
                const x = cx + tx * maxW * this.rand(0.7, 1.05);
                clusters.push({ x, y: y + this.rand(-2, 2),
                    r: this.rand(maxW * 0.45, maxW * 0.68), tier: i });
            }
            y -= this.rand(5, 7);
            maxW *= 0.72;
        }
        return clusters;
    }

    getSpruceClusters(cx, bottomY, size) {
        const clusters = [];
        const levels = size === 'large' ? 10 : 7;
        const totalH = size === 'large' ? 46 : 32;
        const baseW = size === 'large' ? 15 : 11;
        for (let i = 0; i < levels; i++) {
            const t = i / (levels - 1);
            const y = bottomY - 4 - t * totalH;
            const w = baseW * (1 - t * 0.9);
            const count = Math.max(2, Math.round(3 + w * 0.22));
            for (let j = 0; j < count; j++) {
                const tx = count === 1 ? 0 : (j / (count - 1)) * 2 - 1;
                const x = cx + tx * w * this.rand(0.55, 0.95);
                clusters.push({ x, y: y + this.rand(-1.5, 1.5),
                    r: this.rand(w * 0.33, w * 0.5), tier: i });
            }
        }
        return clusters;
    }

    getBirchClusters(cx, trunkTopY, size) {
        const clusters = [];
        const num = size === 'large' ? 6 : 4;
        clusters.push({ x: cx, y: trunkTopY - 4, r: this.rand(5.5, 7.5) });
        for (let i = 0; i < num; i++) {
            const angle = this.rand(0, Math.PI * 2);
            const dist = this.rand(3, 6);
            clusters.push({
                x: cx + Math.cos(angle) * dist,
                y: trunkTopY - 4 + Math.sin(angle) * dist * 0.85,
                r: this.rand(3.5, 5.5),
            });
        }
        return clusters;
    }

    renderCanopy() {
        if (!this.clusters || !this.clusters.length) return;
        const colors = this.scheme;
        const img = this.ctx.getImageData(0, 0, this.width, this.height);
        const data = img.data;
        const seed = this.seed;

        let minX = this.width, minY = this.height, maxX = 0, maxY = 0;
        for (const c of this.clusters) {
            if (c.x - c.r < minX) minX = Math.floor(c.x - c.r - 3);
            if (c.y - c.r < minY) minY = Math.floor(c.y - c.r - 3);
            if (c.x + c.r > maxX) maxX = Math.ceil(c.x + c.r + 3);
            if (c.y + c.r > maxY) maxY = Math.ceil(c.y + c.r + 3);
        }
        minX = Math.max(0, minX); minY = Math.max(0, minY);
        maxX = Math.min(this.width, maxX); maxY = Math.min(this.height, maxY);
        const bw = maxX - minX, bh = maxY - minY;
        if (bw <= 0 || bh <= 0) return;

        const SDF = new Float32Array(bw * bh);
        for (let j = 0; j < bh; j++) {
            for (let i = 0; i < bw; i++) {
                const x = minX + i, y = minY + j;
                let d = Infinity;
                for (const c of this.clusters) {
                    const dx = x - c.x;
                    const dy = y - c.y;
                    const dist = Math.sqrt(dx*dx + dy*dy) - c.r;
                    if (dist < d) d = dist;
                }
                const edgeN = (fbm(x * 0.35, y * 0.35, 3, seed + 11) - 0.5) * 3.0;
                SDF[j * bw + i] = d + edgeN;
            }
        }

        const toLX = -0.55, toLY = -0.83;
        const noiseAmt = 0.08;
        const cH = colors.HIGH, cB = colors.BASE, cS1 = colors.SHADOW1, cS2 = colors.SHADOW2;

        for (let j = 0; j < bh; j++) {
            for (let i = 0; i < bw; i++) {
                const idx = j * bw + i;
                const d = SDF[idx];
                if (d > 0) continue;
                const x = minX + i, y = minY + j;

                const dL = i > 0      ? SDF[idx - 1]  : d;
                const dR = i < bw - 1 ? SDF[idx + 1]  : d;
                const dU = j > 0      ? SDF[idx - bw] : d;
                const dD = j < bh - 1 ? SDF[idx + bw] : d;
                const gx = dR - dL;
                const gy = dD - dU;
                const gLen = Math.hypot(gx, gy) || 1;
                let light = (gx * toLX + gy * toLY) / gLen;

                light += (0.5 - j / bh) * 0.55;
                const thickness = Math.min(1, -d / 4);
                light -= thickness * 0.18;
                light += (fbm(x * 0.2,  y * 0.2,  2, seed + 41) - 0.5) * (noiseAmt * 5.5);
                light += (fbm(x * 0.55, y * 0.55, 2, seed + 83) - 0.5) * (noiseAmt * 3.5);

                const v = clamp01(light * 0.5 + 0.5);
                const col = pick4(v, cH, cB, cS1, cS2, x, y, 0.3);

                const pi = (y * this.width + x) * 4;
                data[pi]     = col[0];
                data[pi + 1] = col[1];
                data[pi + 2] = col[2];
                data[pi + 3] = 255;
            }
        }
        this.ctx.putImageData(img, 0, 0);
    }
}