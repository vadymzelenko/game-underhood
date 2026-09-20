import { makeWindVariants, windConfigFor } from '../utils/WindFrames.js';

export class AssetLoader {
    constructor(scene) {
        this.scene = scene;
        this.failures = new Set();
        this._built = new Set();
        // ★ Папка и имя манифеста ручных оверрайдов
        this.overrideDir = 'assets/overrides/';
        this.manifestKey = '__overrides';
    }

    preload(registry) {
        this.scene.load.on('loaderror', (file) => this.failures.add(file.key));

        // 1) Явные пути из реестра (если кто-то их прописал вручную)
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

        // 2) Манифест оверрайдов — одна попытка загрузки, без 404-спама
        this.scene.load.json(this.manifestKey, this.overrideDir + 'manifest.json');
        this.scene.load.once(
            `filecomplete-json-${this.manifestKey}`,
            (_k, _t, data) => this._queueOverrides(data),
        );
    }

    /**
     * Читает манифест и добавляет файлы в очередь загрузки.
     * Формат:
     *   {
     *     "building_main": "building_main.png",
     *     "tree_oak_0":    "my_oak.png",
     *     "player":        { "path": "player.png", "frameWidth": 16, "frameHeight": 24 }
     *   }
     */
    _queueOverrides(manifest) {
        if (!manifest || typeof manifest !== 'object') return;

        for (const [targetKey, entry] of Object.entries(manifest)) {
            if (typeof entry === 'string') {
                this.scene.load.image(targetKey, this.overrideDir + entry);
            } else if (entry && typeof entry === 'object' && entry.path) {
                const full = this.overrideDir + entry.path;
                if (entry.frameWidth && entry.frameHeight) {
                    this.scene.load.spritesheet(targetKey, full, {
                        frameWidth: entry.frameWidth,
                        frameHeight: entry.frameHeight,
                    });
                } else {
                    this.scene.load.image(targetKey, full);
                }
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