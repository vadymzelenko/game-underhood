import { DEPTH } from '../../utils/Constants.js';
import { TUNING } from '../../config/TuningConfig.js';

/**
 * Освещение интерьера — «как в Stardew Valley».
 *
 * Без жёсткой тьмы и line-of-sight тумана: интерьер равномерно тёплый
 * и читаемый, а «давящее» настроение задают палитра и мягкая виньетка.
 * Состав:
 *   1. Тёплый глобальный тон (лёгкий, additive).
 *   2. Световые пятна под окнами (static, additive).
 *   3. Виньетка по краям экрана (screen-space).
 *   4. Тёплое свечение вокруг игрока (additive).
 */
export class LightSystem {
    constructor(scene, layout, tilePx) {
        this.scene  = scene;
        this.tilePx = tilePx || 16;
        this.cols   = layout.map[0].length;
        this.rows   = layout.map.length;
        this.cfg    = TUNING.house.light;

        // 1) Тёплый тон поверх пола
        this.warm = scene.add.rectangle(0, 0, this.cols * this.tilePx, this.rows * this.tilePx, 0xfff1a9, this.cfg.warmAlpha)
            .setOrigin(0, 0)
            .setDepth(DEPTH.ENTITIES - 2)
            .setBlendMode(Phaser.BlendModes.ADD);

        // 2) Пятна света под окнами
        this._buildWindowPools(layout);

        // 3) Свечи-бра вдоль коридора + цветовой тон комнат
        this.lights = [];
        this._buildSconces(layout);
        this._buildRoomTints(layout);

        // 4) Виньетка (screen-space)
        this._buildVignette();
        this._onResize = () => this._buildVignette();
        scene.scale.on('resize', this._onResize, this);
    }

    // ── Свечи-бра вдоль коридора ─────────────────────────────
    _buildSconces(layout) {
        const corr = layout.corridor;
        if (!corr) return;
        const m = layout.map, t = this.tilePx;
        const key = this._makeGlow('__sconce', t * 3.2, [
            [0.0, 'rgba(255,214,120,0.85)'],
            [0.5, 'rgba(255,170,80,0.35)'],
            [1.0, 'rgba(255,150,60,0)'],
        ]);
        for (let y = corr.y + 3; y < corr.y + corr.h - 2; y += 7) {
            for (const wx of [corr.x - 1, corr.x + corr.w]) {
                if (m[y]?.[wx] !== '#') continue;
                const ix = wx < corr.x ? wx + 1 : wx - 1;   // свет внутрь коридора
                const img = this.scene.add.image((ix + 0.5) * t, (y + 0.5) * t, key)
                    .setDepth(DEPTH.ENTITIES - 1)
                    .setBlendMode(Phaser.BlendModes.ADD)
                    .setAlpha(0.5);
                this.lights.push(img);
            }
        }
    }

    // ── Цветовой тон комнат (тёплый/холодный) ───────────────
    _buildRoomTints(layout) {
        const tintOf = (type) => {
            if (type === 'boiler' || type === 'storage') return 0x2a7d75;   // холодный
            if (type === 'kitchen' || type === 'dining') return 0xc78539;   // тёплый
            if (type === 'library' || type === 'reception') return 0xebb85b;
            return 0xfff1a9;
        };
        const t = this.tilePx;
        for (const r of layout.rooms ?? []) {
            const col = tintOf(r.type);
            const rect = this.scene.add.rectangle(
                r.x * t, r.y * t, r.w * t, r.h * t, col, 0.05,
            ).setOrigin(0, 0)
             .setDepth(DEPTH.ENTITIES - 2)
             .setBlendMode(Phaser.BlendModes.ADD);
            this.lights.push(rect);
        }
    }

    _makeGlow(key, radius, stops) {
        if (this.scene.textures.exists(key)) this.scene.textures.remove(key);
        const S = Math.max(2, Math.ceil(radius * 2));
        const cv = document.createElement('canvas');
        cv.width = cv.height = S;
        const ctx = cv.getContext('2d');
        const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
        for (const [pos, color] of stops) g.addColorStop(pos, color);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, S, S);
        this.scene.textures.addCanvas(key, cv);
        return key;
    }

    _buildVignette() {
        const w = this.scene.scale.width, h = this.scene.scale.height;
        const key = '__house_vignette';
        if (this.scene.textures.exists(key)) this.scene.textures.remove(key);

        const cv = document.createElement('canvas');
        cv.width = w; cv.height = h;
        const ctx = cv.getContext('2d');
        const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.7);
        g.addColorStop(0, 'rgba(18,14,35,0)');
        g.addColorStop(1, `rgba(18,14,35,${this.cfg.vignetteAlpha})`);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
        this.scene.textures.addCanvas(key, cv);

        if (this.vignette) this.vignette.destroy();
        this.vignette = this.scene.add.image(w / 2, h / 2, key)
            .setScrollFactor(0)
            .setDepth(DEPTH.VIGNETTE);
    }

    _buildWindowPools(layout) {
        this.windowPools = [];
        if (this.cfg.windowGlowAlpha <= 0) return;

        const m = layout.map, t = this.tilePx;
        const glowKey = this._makeGlow('__window_glow', t * 2.2, [
            [0.0, 'rgba(255,241,169,0.9)'],
            [0.5, 'rgba(255,214,120,0.4)'],
            [1.0, 'rgba(255,190,90,0)'],
        ]);
        const walk = (x, y) => {
            if (x < 0 || y < 0 || x >= m[0].length || y >= m.length) return false;
            const c = m[y][x];
            return c !== '#' && c !== '=' && c !== 'W' && c !== ' ';
        };
        for (let y = 0; y < m.length; y++)
            for (let x = 0; x < m[0].length; x++) {
                if (m[y][x] !== 'W') continue;
                let ix = x, iy = y;
                if (walk(x, y + 1)) iy = y + 1;
                else if (walk(x, y - 1)) iy = y - 1;
                else if (walk(x + 1, y)) ix = x + 1;
                else if (walk(x - 1, y)) ix = x - 1;
                else continue;
                const img = this.scene.add.image(ix * t + t / 2, iy * t + t / 2, glowKey)
                    .setDepth(DEPTH.ENTITIES - 1)
                    .setBlendMode(Phaser.BlendModes.ADD)
                    .setAlpha(this.cfg.windowGlowAlpha);
                this.windowPools.push(img);
            }
    }

    update() { /* свет статичный — центрального пятна нет */ }

    /** В Stardew-стиле тумана нет — пропсы всегда видны. */
    isVisible() { return true; }

    destroy() {
        this.warm?.destroy();
        this.vignette?.destroy();
        for (const p of this.windowPools) p.destroy();
        for (const l of this.lights) l.destroy();
        this.windowPools.length = 0;
        this.lights.length = 0;
        if (this._onResize) this.scene.scale.off('resize', this._onResize, this);
    }
}