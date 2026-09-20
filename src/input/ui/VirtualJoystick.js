const COLOR_RING  = 0xfff1a9;
const COLOR_BASE  = 0x120e23;
const COLOR_KNOB  = 0x349c58;
const COLOR_KNOB2 = 0x2a7d75;

/**
 * Плавающий джойстик.
 * Появляется в точке касания в левой части экрана,
 * по отпусканию возвращается в "домашний" угол.
 */
export class VirtualJoystick {
    constructor(scene, opts = {}) {
        this.scene = scene;
        this.baseRadius = opts.baseRadius ?? 72;
        this.knobRadius = opts.knobRadius ?? 28;
        this.deadZone   = opts.deadZone   ?? 0.12;
        this.leftRatio  = opts.leftRatio  ?? 0.55;

        const w = scene.scale.width;
        const h = scene.scale.height;

        this.homeX = opts.homeX ?? 110;
        this.homeY = opts.homeY ?? (h - 110);
        this.originX = this.homeX;
        this.originY = this.homeY;

        this.vector = { x: 0, y: 0 };
        this.activePointer = null;

        // Визуал
        this.base = scene.add.circle(this.homeX, this.homeY, this.baseRadius,
            COLOR_BASE, 0.30)
            .setScrollFactor(0).setDepth(20000)
            .setStrokeStyle(2, COLOR_RING, 0.55);

        this.ring = scene.add.circle(this.homeX, this.homeY, this.baseRadius * 0.72)
            .setScrollFactor(0).setDepth(20000)
            .setStrokeStyle(1, COLOR_RING, 0.20);

        this.knob = scene.add.circle(this.homeX, this.homeY, this.knobRadius,
            COLOR_KNOB, 0.75)
            .setScrollFactor(0).setDepth(20001)
            .setStrokeStyle(2, COLOR_RING, 0.9);

        // Слушатели (в глобальном input сцены)
        this._onDown = this._handleDown.bind(this);
        this._onMove = this._handleMove.bind(this);
        this._onUp   = this._handleUp.bind(this);

        scene.input.on('pointerdown', this._onDown, this);
        scene.input.on('pointermove', this._onMove, this);
        scene.input.on('pointerup',   this._onUp,   this);
        scene.input.on('pointerupoutside', this._onUp, this);
    }

    setHome(x, y) {
        this.homeX = x;
        this.homeY = y;
        if (this.activePointer === null) this._returnHome();
    }

    _handleDown(p) {
        if (this.activePointer !== null) return;
        const w = this.scene.scale.width;
        if (p.x > w * this.leftRatio) return;   // правая половина — для кнопок
        this.activePointer = p.id;
        this.originX = p.x;
        this.originY = p.y;
        this._placeVisuals(p.x, p.y);
        this.base.setAlpha(1);
        this.ring.setAlpha(1);
        this._apply(p.x, p.y);
    }

    _handleMove(p) {
        if (p.id !== this.activePointer) return;
        this._apply(p.x, p.y);
    }

    _handleUp(p) {
        if (p.id !== this.activePointer) return;
        this.activePointer = null;
        this.vector.x = 0;
        this.vector.y = 0;
        this._returnHome();
    }

    _apply(px, py) {
        const dx = px - this.originX;
        const dy = py - this.originY;
        const dist = Math.hypot(dx, dy);
        const maxDist = this.baseRadius;
        const clamped = Math.min(dist, maxDist);
        const nx = dist > 0 ? dx / dist : 0;
        const ny = dist > 0 ? dy / dist : 0;

        this.knob.setPosition(this.originX + nx * clamped,
            this.originY + ny * clamped);

        const mag = clamped / maxDist;
        if (mag < this.deadZone) {
            this.vector.x = 0;
            this.vector.y = 0;
        } else {
            const scaled = (mag - this.deadZone) / (1 - this.deadZone);
            this.vector.x = nx * scaled;
            this.vector.y = ny * scaled;
        }
    }

    _placeVisuals(x, y) {
        this.base.setPosition(x, y);
        this.ring.setPosition(x, y);
        this.knob.setPosition(x, y);
    }

    _returnHome() {
        this.originX = this.homeX;
        this.originY = this.homeY;
        this._placeVisuals(this.homeX, this.homeY);
        this.base.setAlpha(0.30);
        this.ring.setAlpha(0.20);
    }

    destroy() {
        this.scene.input.off('pointerdown', this._onDown, this);
        this.scene.input.off('pointermove', this._onMove, this);
        this.scene.input.off('pointerup',   this._onUp,   this);
        this.scene.input.off('pointerupoutside', this._onUp, this);
        this.base.destroy();
        this.ring.destroy();
        this.knob.destroy();
    }
}