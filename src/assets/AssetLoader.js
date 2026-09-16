export class AssetLoader {
    constructor(scene) {
        this.scene = scene;
        this.failures = new Set();
    }

    /** Регистрирует все path'ы в Phaser.Loader. */
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

    /** После preload: создаёт fallback'и для всего, что не загрузилось / без path. */
    buildFallbacks(registry) {
        // images
        for (const [key, def] of Object.entries(registry.images || {})) {
            if (this.scene.textures.exists(key)) continue;
            const needsProcedure = !def.path || this.failures.has(key);
            if (needsProcedure && def.procedure) {
                const canvas = def.procedure(this.scene);
                this.scene.textures.addCanvas(key, canvas);
            }
        }

        // spritesheets
        for (const [key, def] of Object.entries(registry.spritesheets || {})) {
            if (this.scene.textures.exists(key)) continue;
            const needsProcedure = !def.path || this.failures.has(key);
            if (needsProcedure && def.procedure) {
                const canvas = def.procedure(this.scene);
                const tex = this.scene.textures.addCanvas(key, canvas);
                this._sliceFrames(tex, canvas.width, canvas.height,
                    def.frameWidth, def.frameHeight);
            }
        }
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