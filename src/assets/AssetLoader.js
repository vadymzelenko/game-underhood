import { makeWindVariants, windConfigFor } from '../utils/WindFrames.js';

export class AssetLoader {
    constructor(scene) {
        this.scene = scene;
        this.failures = new Set();
        this._built = new Set();     // ключи, для которых fallback уже построен
    }

    preload(registry) {
        this.scene.load.on('loaderror', (file) => this.failures.add(file.key));

        for (const [key, def] of Object.entries(registry.images || {})) {
            if (def.path) this.scene.load.image(key, def.path);
        }

        for (const [key, def] of Object.entries(registry.spritesheets || {})) {
            if (def.path) {
                this.scene.load.spritesheet(key, def.path, {
                    frameWidth: def.frameWidth,
                    frameHeight: def.frameHeight,
                });
            }
        }
    }

    buildFallbacks(registry) {
        // ── images ────────────────────────────────────────────
        for (const [key, def] of Object.entries(registry.images || {})) {
            if (this._built.has(key)) continue;

            const needs = !def.path || this.failures.has(key) || this._isEmpty(key);
            if (!needs || !def.procedure) continue;

            if (this.scene.textures.exists(key)) this.scene.textures.remove(key);
            const canvas = def.procedure(this.scene);
            this.scene.textures.addCanvas(key, canvas);
            this._built.add(key);

            // ── Ветровые варианты для листвы ─────────────────
            const windCfg = def.wind === false
                ? null
                : (def.wind || windConfigFor(key));

            if (windCfg) {
                const variants = makeWindVariants(canvas, windCfg.frames, windCfg);
                variants.forEach((c, i) => {
                    const wk = `${key}_w${i}`;
                    if (this.scene.textures.exists(wk)) this.scene.textures.remove(wk);
                    this.scene.textures.addCanvas(wk, c);
                });
                if (key.endsWith('_0')) {
                    console.log(`[wind] ${key} → ${variants.length} variants`);
                }
            }
        }

        // ── spritesheets ─────────────────────────────────────
        for (const [key, def] of Object.entries(registry.spritesheets || {})) {
            if (this._built.has(key)) continue;

            const needs = !def.path || this.failures.has(key) || this._isEmpty(key);
            if (!needs || !def.procedure) continue;

            if (this.scene.textures.exists(key)) this.scene.textures.remove(key);
            const canvas = def.procedure(this.scene);
            const tex = this.scene.textures.addCanvas(key, canvas);
            this._sliceFrames(tex, canvas.width, canvas.height,
                def.frameWidth, def.frameHeight);
            this._built.add(key);
        }
    }

    /**
     * Текстура «пустая», если её нет ИЛИ у неё нулевые размеры.
     *
     * НЕЛЬЗЯ проверять frameTotal <= 1 — у одиночной картинки
     * frameTotal как раз равно 1, и это валидное состояние.
     * Старая версия возвращала true для всех обычных текстур и
     * заставляла buildFallbacks пересобирать их каждый раз.
     */
    _isEmpty(key) {
        if (!this.scene.textures.exists(key)) return true;
        const tex = this.scene.textures.get(key);
        if (!tex) return true;
        const src = tex.getSourceImage?.() || tex.source?.[0]?.image;
        if (!src) return true;
        return !src.width || !src.height;
    }

    _sliceFrames(texture, sheetW, sheetH, fw, fh) {
        const cols = Math.floor(sheetW / fw);
        const rows = Math.floor(sheetH / fh);
        let idx = 0;
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                texture.add(idx, 0, c * fw, r * fh, fw, fh);
                idx++;
            }
        }
    }
}