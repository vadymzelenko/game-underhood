const COLOR_RING = 0xfff1a9;
const COLOR_BASE = 0x120e23;
const COLOR_ON   = 0xb74132;

export class TouchButton {
    constructor(scene, x, y, opts = {}) {
        this.scene  = scene;
        this.x      = x;
        this.y      = y;
        this.radius = opts.radius ?? 44;
        this.label  = opts.label  ?? 'E';
        this.onHold = opts.onHold ?? null;   // необязательный коллбек

        this.pressed = false;
        this.justPressed = false;
        this.activePointer = null;

        this.circle = scene.add.circle(x, y, this.radius, COLOR_BASE, 0.35)
            .setScrollFactor(0).setDepth(20000)
            .setStrokeStyle(2, COLOR_RING, 0.7);

        this.text = scene.add.text(x, y, this.label, {
            fontFamily: 'monospace',
            fontSize: `${Math.max(14, this.radius * 0.6)}px`,
            color: '#fff1a9',
            fontStyle: 'bold',
        }).setOrigin(0.5).setScrollFactor(0).setDepth(20001);

        this._onDown = this._handleDown.bind(this);
        this._onUp   = this._handleUp.bind(this);

        scene.input.on('pointerdown', this._onDown, this);
        scene.input.on('pointerup',   this._onUp,   this);
        scene.input.on('pointerupoutside', this._onUp, this);
    }

    setPosition(x, y) {
        this.x = x; this.y = y;
        this.circle.setPosition(x, y);
        this.text.setPosition(x, y);
    }

    _handleDown(p) {
        if (this.activePointer !== null) return;
        const dx = p.x - this.x, dy = p.y - this.y;
        if (dx * dx + dy * dy > this.radius * this.radius) return;

        this.activePointer = p.id;
        this.pressed = true;
        this.justPressed = true;
        this.circle.setFillStyle(COLOR_ON, 0.7);
    }

    _handleUp(p) {
        if (p.id !== this.activePointer) return;
        this.activePointer = null;
        this.pressed = false;
        this.circle.setFillStyle(COLOR_BASE, 0.35);
    }

    consumeJustPressed() {
        if (!this.justPressed) return false;
        this.justPressed = false;
        return true;
    }

    destroy() {
        this.scene.input.off('pointerdown', this._onDown, this);
        this.scene.input.off('pointerup',   this._onUp,   this);
        this.scene.input.off('pointerupoutside', this._onUp, this);
        this.circle.destroy();
        this.text.destroy();
    }
}