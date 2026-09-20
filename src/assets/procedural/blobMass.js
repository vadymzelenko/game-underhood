import { fbm, clamp01, pick4 } from './utils.js';

/**
 * SDF-заливка мягкой массы из кластеров (куст / крона / мох / крона мха).
 * Кластеры: { x, y, r, rx?, ry?, tier? }
 */
export function drawBlobMass(ctx, W, H, clusters, scheme, seed, noiseAmt = 0.08) {
    if (!clusters || !clusters.length) return;

    let minX = W, minY = H, maxX = 0, maxY = 0;
    for (const c of clusters) {
        const rx = c.rx || c.r;
        const ry = c.ry || c.r;
        if (c.x - rx < minX) minX = Math.floor(c.x - rx - 3);
        if (c.y - ry < minY) minY = Math.floor(c.y - ry - 3);
        if (c.x + rx > maxX) maxX = Math.ceil(c.x + rx + 3);
        if (c.y + ry > maxY) maxY = Math.ceil(c.y + ry + 3);
    }
    minX = Math.max(0, minX); minY = Math.max(0, minY);
    maxX = Math.min(W, maxX); maxY = Math.min(H, maxY);
    const bw = maxX - minX, bh = maxY - minY;
    if (bw <= 0 || bh <= 0) return;

    const SDF = new Float32Array(bw * bh);
    for (let j = 0; j < bh; j++) {
        for (let i = 0; i < bw; i++) {
            const x = minX + i, y = minY + j;
            let d = Infinity;
            for (const c of clusters) {
                const rx = c.rx || c.r;
                const ry = c.ry || c.r;
                const dx = x - c.x;
                const dy = (y - c.y) * (rx / ry);
                const dist = Math.sqrt(dx*dx + dy*dy) - rx;
                if (dist < d) d = dist;
            }
            const edgeN = (fbm(x * 0.35, y * 0.35, 3, seed + 11) - 0.5) * 3.0;
            SDF[j * bw + i] = d + edgeN;
        }
    }

    const img = ctx.getImageData(0, 0, W, H);
    const data = img.data;
    const toLX = -0.55, toLY = -0.83;
    const { HIGH: cH, BASE: cB, SHADOW1: cS1, SHADOW2: cS2 } = scheme;

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

            const pi = (y * W + x) * 4;
            data[pi]     = col[0];
            data[pi + 1] = col[1];
            data[pi + 2] = col[2];
            data[pi + 3] = 255;
        }
    }
    ctx.putImageData(img, 0, 0);
}