import { applyOutline, PALETTE } from './utils.js';

export class BaseGen {
    constructor(width = 64, height = 64, seed = null) {
        this.width = width;
        this.height = height;
        this.canvas = document.createElement('canvas');
        this.canvas.width = width;
        this.canvas.height = height;
        this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
        this.ctx.imageSmoothingEnabled = false;
        this.seed = seed ?? Math.floor(Math.random() * 100000);
    }

    rand(a, b) { return a + Math.random() * (b - a); }

    /** Финальный контур. Обычно применяется в конце generate(). */
    outline(hex = PALETTE.DARK_PURPLE) {
        applyOutline(this.ctx, this.width, this.height, hex);
    }

    /** Тень-«пятачок» под объектом (рисуется до outline). */
    groundShadow(cx, w, groundY, alpha = 0.42) {
        const hex = 'rgba(18,14,35,' + alpha + ')';
        this.ctx.fillStyle = hex;
        this.ctx.fillRect(Math.round(cx - w / 2), groundY - 1, w, 1);
    }
}