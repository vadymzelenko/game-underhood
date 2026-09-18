import { DEPTH } from '../utils/Constants.js';
import { TUNING } from '../config/TuningConfig.js';

export class VignetteOverlay {
    constructor(scene) {
        this.scene = scene;
        this.cfg = TUNING.vignette;
        if (!this.cfg.enabled) return;

        const w = scene.scale.width;
        const h = scene.scale.height;

        this._buildLightTexture();

        this.rt = scene.add.renderTexture(0, 0, w, h)
            .setOrigin(0, 0)
            .setScrollFactor(0)
            .setDepth(DEPTH.VIGNETTE);

        this.currentAlpha = this.cfg.defaultAlpha;

        this._onResize = (size) => this.rt.resize(size.width, size.height);
        scene.scale.on('resize', this._onResize, this);
    }

    /** Радиальный градиент: 1 в центре → 0 на краю. Кэшируется в текстуру. */
    _buildLightTexture() {
        const R = this.cfg.lightRadius;
        const size = R * 2;
        const cv = document.createElement('canvas');
        cv.width = size;
        cv.height = size;
        const ctx = cv.getContext('2d');
        const g = ctx.createRadialGradient(R, R, 0, R, R, R);
        g.addColorStop(0, 'rgba(255,255,255,1)');
        g.addColorStop(this.cfg.lightSoftness, 'rgba(255,255,255,0.85)');
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, size, size);

        if (this.scene.textures.exists('vignette_light')) {
            this.scene.textures.remove('vignette_light');
        }
        this.scene.textures.addCanvas('vignette_light', cv);
        this.lightSize = size;
    }

    update(playerWorldX, playerWorldY, biome) {
        if (!this.cfg.enabled) return;

        const cam = this.scene.cameras.main;
        const view = cam.worldView;
        const zoom = cam.zoom;

        // Мировые координаты игрока → screen space
        const screenX = (playerWorldX - view.x) * zoom;
        const screenY = (playerWorldY - view.y) * zoom;

        // Плавный переход по биому (lerp)
        const target = this.cfg.biomeAlpha[biome] ?? this.cfg.defaultAlpha;
        this.currentAlpha += (target - this.currentAlpha) * this.cfg.lerpSpeed;

        this.rt.clear();
        this.rt.fill(this.cfg.color, this.currentAlpha);
        this.rt.erase(
            'vignette_light',
            screenX - this.lightSize / 2,
            screenY - this.lightSize / 2,
        );
    }

    destroy() {
        if (!this.cfg.enabled) return;
        this.scene.scale.off('resize', this._onResize, this);
        this.rt.destroy();
    }
}