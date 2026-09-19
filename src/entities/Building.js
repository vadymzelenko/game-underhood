import { DEPTH, PALETTE as P } from '../utils/Constants.js';
import {
    resolveBuilding,
    registerBuildingRuntime,
} from '../config/BuildingsConfig.js';

const _visibleBoundsCache = new Map();

function computeVisibleBounds(scene, key, alphaThreshold) {
    if (_visibleBoundsCache.has(key)) return _visibleBoundsCache.get(key);

    const src = scene.textures.get(key).getSourceImage();
    const w = src?.width, h = src?.height;
    if (!w || !h) {
        const empty = { x0: 0, y0: 0, w: 1, h: 1 };
        _visibleBoundsCache.set(key, empty);
        return empty;
    }

    const cv  = document.createElement('canvas');
    cv.width  = w; cv.height = h;
    const ctx = cv.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(src, 0, 0);
    const data = ctx.getImageData(0, 0, w, h).data;

    let minX = w, minY = h, maxX = -1, maxY = -1;
    for (let y = 0; y < h; y++) {
        const row = y * w * 4;
        for (let x = 0; x < w; x++) {
            if (data[row + x * 4 + 3] >= alphaThreshold) {
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
            }
        }
    }
    if (maxX < 0) {
        const empty = { x0: 0, y0: 0, w, h };
        _visibleBoundsCache.set(key, empty);
        return empty;
    }
    const res = { x0: minX, y0: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
    _visibleBoundsCache.set(key, res);
    return res;
}

export class Building {
    constructor(scene, rawConfig) {
        this.scene  = scene;
        this.config = resolveBuilding(rawConfig);

        this.id   = this.config.id;
        this.name = this.config.name;

        const { x, y, w, h } = this.config.bounds;
        this.x = x; this.y = y; this.w = w; this.h = h;

        const key = this.config.texture;
        const hasSprite = !!(key && scene.textures.exists(key) && !this._isEmptyTexture(key));
        if (hasSprite) this._buildSprite(key);
        else           this._buildProcedural();

        // Видимый прямоугольник в МИРОВЫХ координатах
        this.visibleRect = this._computeWorldVisibleRect(key, hasSprite);

        // ★ Основа Y-сортировки — «пол» здания (низ видимой части)
        this.groundY = this.visibleRect.y + this.visibleRect.h;

        // ★ Спрайт/графика перекладываются на ENTITIES-уровень — так игрок
        //   окажется за домом, когда его Y меньше groundY.
        this._applyDepth();

        // Коллизия — только нижняя часть видимой области
        this.body = this._buildCollisionZone(this.visibleRect);

        // Точка входа
        const d = this.config.door;
        this.doorX = this.x + this.w / 2 + d.dx;
        this.doorY = this.y + this.h + d.dy;
        this.doorRadius = d.radius;

        this._registerRuntime();
    }

    // ── Спрайт / процедурка ──────────────────────────────────
    _buildSprite(key) {
        const s   = this.config.sprite;
        const src = this.scene.textures.get(key).getSourceImage();
        const base  = s.fit ? (this.w / src.width) : 1;
        const scale = base * (s.scale ?? 1);

        this.sprite = this.scene.add.image(
            this.x + this.w / 2 + s.xOff,
            this.y + this.h     + s.yOff,
            key,
        );
        this.sprite.setOrigin(s.originX, s.originY);
        this.sprite.setScale(scale);
        if (s.tint     != null) this.sprite.setTint(s.tint);
        if (s.tintFill != null) this.sprite.setTintFill(s.tintFill);

        this.graphics = null;
    }

    _buildProcedural() {
        this.sprite = null;
        this.graphics = this.scene.add.graphics();
        this._drawProcedural();
    }

    // ★ Глубина: ENTITIES + Y-низа. Y-сортировка работает как для деревьев.
    _applyDepth() {
        const off = this.config.sprite.depthOffset;
        const d = DEPTH.ENTITIES + this.groundY + off;
        if (this.sprite)   this.sprite.setDepth(d);
        if (this.graphics) this.graphics.setDepth(d);
    }

    _isEmptyTexture(key) {
        const tex = this.scene.textures.get(key);
        if (!tex) return true;
        const src = tex.getSourceImage?.() || tex.source?.[0]?.image;
        return !src || !src.width || !src.height;
    }

    // ── Видимый прямоугольник ────────────────────────────────
    _computeWorldVisibleRect(key, hasSprite) {
        if (!hasSprite || !this.sprite) {
            return { x: this.x, y: this.y, w: this.w, h: this.h };
        }

        const c   = this.config.collision;
        const src = this.scene.textures.get(key).getSourceImage();

        const vb = c.mode === 'bounds'
            ? { x0: 0, y0: 0, w: src.width, h: src.height }
            : computeVisibleBounds(this.scene, key, c.alphaThreshold);

        const sp = this.sprite;
        const topLeftX = sp.x - sp.displayWidth  * sp.originX;
        const topLeftY = sp.y - sp.displayHeight * sp.originY;

        const sx = sp.displayWidth  / src.width;
        const sy = sp.displayHeight / src.height;

        const pad = c.padding || 0;
        return {
            x: topLeftX + vb.x0 * sx - pad,
            y: topLeftY + vb.y0 * sy,
            w: vb.w * sx + pad * 2,
            h: vb.h * sy,
        };
    }

    // ── Тело коллизии ────────────────────────────────────────
    _buildCollisionZone(vis) {
        const c = this.config.collision;
        if (c.mode === 'none') return null;
        if (c.solidFromBottom <= 0) return null;

        const ratio = Math.max(0, Math.min(1, c.solidFromBottom));
        const solidH = vis.h * ratio;
        const solidTop = vis.y + vis.h - solidH + (c.yOffsetBottom || 0);

        const zone = this.scene.add.zone(
            vis.x + vis.w / 2,
            solidTop + solidH / 2,
            vis.w,
            solidH,
        );
        this.scene.physics.add.existing(zone, true);
        return zone;
    }

    // ── Регистрация в BuildingsConfig ────────────────────────
    _registerRuntime() {
        const v = this.visibleRect;
        const c = this.config;

        registerBuildingRuntime({
            id:           this.id,
            padBiome:     c.padBiome,
            padNoiseAmp:  c.padNoiseAmp,
            padNoiseFreq: c.padNoiseFreq,
            padRect: {
                x: v.x - c.padMargin,  y: v.y - c.padMargin,
                w: v.w + c.padMargin * 2,
                h: v.h + c.padMargin * 2,
            },
            clearingRect: {
                x: v.x - c.clearing,   y: v.y - c.clearing,
                w: v.w + c.clearing * 2,
                h: v.h + c.clearing * 2,
            },
            animalRect: {
                x: v.x - c.animalPad,  y: v.y - c.animalPad,
                w: v.w + c.animalPad * 2,
                h: v.h + c.animalPad * 2,
            },
        });
    }

    isPlayerNear(px, py) {
        return Math.hypot(px - this.doorX, py - this.doorY) < this.doorRadius;
    }

    destroy() {
        this.graphics?.destroy();
        this.sprite?.destroy();
        this.body?.destroy();
    }

    // ── Процедурная графика (не меняется) ────────────────────
    _drawProcedural() {
        const { x, y, w, h } = this;
        const g = this.graphics;

        g.fillStyle(P.ALMOST_BLACK, 0.35);
        g.fillRect(x + 6, y + 8, w, h);

        g.fillStyle(P.BROWN, 1);
        g.fillRect(x, y, w, h);

        g.fillStyle(P.DARK_BROWN, 1);
        g.fillRect(x + w - 6, y, 6, h);
        g.fillRect(x, y + h - 6, w, 6);

        g.fillStyle(P.GOLD, 1);
        g.fillRect(x, y, w, 4);
        g.fillRect(x, y, 4, h);

        g.fillStyle(P.DARK_RED, 1);
        g.fillRect(x - 4, y - 18, w + 8, 22);
        g.fillStyle(P.RED, 1);
        g.fillRect(x - 4, y - 18, w + 8, 6);
        g.fillStyle(P.ALMOST_BLACK, 1);
        g.fillRect(x - 4, y + 2, w + 8, 2);

        const cols = 6, rows = 4;
        const padX = 26, padY = 26;
        const cellW = (w - padX * 2) / cols;
        const cellH = (h - padY * 2) / rows;
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const wx = Math.floor(x + padX + c * cellW + cellW * 0.20);
                const wy = Math.floor(y + padY + r * cellH + cellH * 0.20);
                const ww = Math.floor(cellW * 0.60);
                const wh = Math.floor(cellH * 0.60);
                g.fillStyle(P.VERY_DARK, 1);
                g.fillRect(wx - 2, wy - 2, ww + 4, wh + 4);
                g.fillStyle(P.DARK_TEAL, 1);
                g.fillRect(wx, wy, ww, wh);
                g.fillStyle(P.TEAL, 1);
                g.fillRect(wx + 2, wy + 2, Math.max(2, Math.floor(ww / 2) - 2), 2);
            }
        }

        const dw = 34, dh = 42;
        const dx = Math.floor(x + w / 2 - dw / 2);
        const dy = Math.floor(y + h - dh);
        g.fillStyle(P.VERY_DARK, 1);
        g.fillRect(dx - 3, dy - 3, dw + 6, dh + 3);
        g.fillStyle(P.DARK_BROWN, 1);
        g.fillRect(dx, dy, dw, dh);
        g.fillStyle(P.BROWN, 1);
        g.fillRect(dx + 4, dy + 4, dw - 8, dh - 8);
        g.fillStyle(P.CREAM, 1);
        g.fillRect(dx + dw - 8, dy + Math.floor(dh / 2) - 2, 3, 4);
        g.fillStyle(P.DARK_RED, 1);
        g.fillRect(dx - 10, dy - 12, dw + 20, 8);
        g.fillStyle(P.RED, 1);
        g.fillRect(dx - 10, dy - 12, dw + 20, 3);

        const sw = 90, sh = 16;
        const sx = Math.floor(x + w / 2 - sw / 2);
        const sy = y + 10;
        g.fillStyle(P.CREAM, 1);
        g.fillRect(sx, sy, sw, sh);
        g.fillStyle(P.VERY_DARK, 1);
        g.fillRect(sx, sy, sw, 2);
        g.fillRect(sx, sy + sh - 2, sw, 2);
        g.fillRect(sx, sy, 2, sh);
        g.fillRect(sx + sw - 2, sy, 2, sh);
        g.fillStyle(P.DARK_RED, 1);
        for (let i = 0; i < 5; i++) {
            g.fillRect(sx + 8 + i * 16, sy + 6, 10, 4);
        }
    }
}