// Door.js — дверь комнаты (открытие/закрытие + коллизия), в стиле Stardew.
//
// Дверь стоит на стенном тайле. Закрыта → блокирует проход, видна створка.
// Открыта → створка «растворяется», проход свободен. Игрок жмёт E рядом с ней.

import { DEPTH } from '../../utils/Constants.js';

export class Door {
    /**
     * @param {Phaser.Scene} scene
     * @param {number} tx, ty  — тайловые координаты двери
     * @param {'v'|'h'} orientation — 'v' вертикальная створка (проём ←→),
     *                                 'h' горизонтальная (проём ↑↓)
     * @param {number} tilePx
     */
    constructor(scene, tx, ty, orientation, tilePx = 16) {
        this.scene = scene;
        this.tx = tx;
        this.ty = ty;
        this.tilePx = tilePx;
        this.orientation = orientation;
        this.closed = true;

        const key = `door_${orientation}`;
        const px = tx * tilePx + tilePx / 2;
        const py = ty * tilePx + tilePx;
        this.sprite = scene.add.image(px, py, key).setOrigin(0.5, 1);
        this.sprite.setDepth(DEPTH.ENTITIES + (ty + 1) * tilePx);
    }

    toggle() {
        this.closed ? this.open() : this.close();
    }

    open() {
        if (!this.closed) return;
        this.closed = false;
        this._animate(0.15, 0.15);
    }

    close() {
        if (this.closed) return;
        this.closed = true;
        this._animate(1, 1);
    }

    _animate(toAlpha, toScale) {
        this.scene.tweens.killTweensOf(this.sprite);
        const tween = { targets: this.sprite, alpha: toAlpha, duration: 180, ease: 'Sine.easeOut' };
        if (this.orientation === 'v') tween.scaleX = toScale;
        else                          tween.scaleY = toScale;
        tween.onComplete = () => {
            if (this.closed) this.sprite.setAlpha(1);
            else             this.sprite.setAlpha(0.15);
        };
        this.scene.tweens.add(tween);
    }

    destroy() { this.sprite.destroy(); }
}
