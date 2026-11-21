import { PALETTE, hexToRgb, fbm, clamp01 } from './utils.js';

export class FogGenerator {
    constructor(width = 240, height = 64) {
        this.width = width; this.height = height;
        this.canvas = document.createElement('canvas');
        this.canvas.width = width;
        this.canvas.height = height;
        this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
        this.seed = Math.floor(Math.random() * 100000);
        this.imgData = this.ctx.createImageData(width, height);

        this.noiseTex = new Float32Array(width * height);
        for (let y = 0; y < height; y++)
            for (let x = 0; x < width; x++)
                this.noiseTex[y * width + x] = fbm(x * 0.055, y * 0.17, 4, this.seed);

        this.noiseTex2 = new Float32Array(width * height);
        for (let y = 0; y < height; y++)
            for (let x = 0; x < width; x++)
                this.noiseTex2[y * width + x] = fbm(x * 0.13, y * 0.35, 3, this.seed + 101);
    }

    generate() { this.render(0, 0); return this.canvas; }

    render(phase = 0, strength = 0) {
        const W = this.width, H = this.height;
        const data = this.imgData.data;
        const M0 = hexToRgb(PALETTE.MIST_DARK);
        const M1 = hexToRgb(PALETTE.MIST_MID);
        const M2 = hexToRgb(PALETTE.MIST_LIGHT);
        const M3 = hexToRgb(PALETTE.MIST_PALE);

        const offX  = ((phase * 14) | 0) % W;
        const offX2 = ((phase * 9 + 53) | 0) % W;
        const wAmt = 0.65 + strength * 0.05;

        for (let y = 0; y < H; y++) {
            const vy = y / (H - 1);
            const grad = Math.pow(1 - vy, 1.15) * 0.85 + 0.15;
            const rowOff = y * W;
            for (let x = 0; x < W; x++) {
                let sx1 = x + offX; if (sx1 >= W) sx1 -= W;
                let sx2 = (x * 1.7 | 0) + offX2; if (sx2 >= W) sx2 -= W;
                const n1 = this.noiseTex[rowOff + sx1];
                const n2 = this.noiseTex2[((y * 2 + 11) % H) * W + sx2];
                let v = n1 * wAmt + n2 * (1 - wAmt);
                v = clamp01((v - 0.40) * 1.95);
                const alpha = Math.round(v * grad * 235);
                let col;
                if (v > 0.72) col = M3;
                else if (v > 0.48) col = M2;
                else if (v > 0.22) col = M1;
                else col = M0;
                const pi = (y * W + x) * 4;
                data[pi] = col[0]; data[pi+1] = col[1]; data[pi+2] = col[2]; data[pi+3] = alpha;
            }
        }
        this.ctx.putImageData(this.imgData, 0, 0);
    }
}