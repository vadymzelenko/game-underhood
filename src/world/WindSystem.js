import { windConfigFor } from '../utils/WindFrames.js';

const MIN_PERIOD = 300;
const MAX_PERIOD = 400;

export class WindSystem {
    constructor(scene) {
        this.scene = scene;
        this.entries = [];
    }

    register(sprite, frames) {
        if (!sprite || !frames || frames.length < 2) return;

        // Защита от дублирования — не пушим один и тот же спрайт дважды.
        for (let i = 0; i < this.entries.length; i++) {
            if (this.entries[i].sprite === sprite) return;
        }

        this.entries.push({
            sprite,
            frames,
            idx: 0,
            period: MIN_PERIOD + Math.random() * (MAX_PERIOD - MIN_PERIOD),
            next: this.scene.time.now + Math.random() * MAX_PERIOD,
        });
    }

    unregister(sprite) {
        for (let i = this.entries.length - 1; i >= 0; i--) {
            if (this.entries[i].sprite === sprite) this.entries.splice(i, 1);
        }
    }

    update() {
        const now = this.scene.time.now;
        const arr = this.entries;
        for (let i = arr.length - 1; i >= 0; i--) {
            const e = arr[i];
            const s = e.sprite;

            if (!s || !s.scene) {
                arr[i] = arr[arr.length - 1];
                arr.pop();
                continue;
            }

            if (now < e.next) continue;
            e.next = now + e.period;
            e.idx = (e.idx + 1) % e.frames.length;
            s.setTexture(e.frames[e.idx]);
        }
    }

    destroy() { this.entries.length = 0; }
}

export function collectWindFrames(scene, key) {
    const frames = [key];
    for (let i = 0; i < 8; i++) {
        const k = `${key}_w${i}`;
        if (!scene.textures.exists(k)) break;
        frames.push(k);
    }
    return frames;
}

export { windConfigFor };