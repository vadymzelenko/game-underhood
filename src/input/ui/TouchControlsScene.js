import { TouchBus } from '../input/TouchBus.js';
import { VirtualJoystick } from '../input/VirtualJoystick.js';
import { TouchButton } from '../input/TouchButton.js';

export class TouchControlsScene extends Phaser.Scene {
    constructor() { super('TouchControlsScene'); }

    create() {
        TouchBus.enabled = true;
        TouchBus.reset();

        this.joystick = new VirtualJoystick(this);

        const w = this.scale.width;
        const h = this.scale.height;

        this.interactBtn = new TouchButton(this, w - 90, h - 100, {
            label: 'E',
            radius: 44,
        });

        this.pauseBtn = new TouchButton(this, w - 34, 40, {
            label: '⏸',
            radius: 24,
        });

        this.scale.on('resize', this._layout, this);
        this._layout();

        this.events.once('shutdown', () => {
            TouchBus.enabled = false;
            TouchBus.reset();
            this.scale.off('resize', this._layout, this);
        });
    }

    _layout() {
        const w = this.scale.width;
        const h = this.scale.height;
        this.joystick.setHome(110, h - 110);
        this.interactBtn.setPosition(w - 90, h - 100);
        this.pauseBtn.setPosition(w - 34, 40);
    }

    update() {
        TouchBus.moveX = this.joystick.vector.x;
        TouchBus.moveY = this.joystick.vector.y;

        TouchBus.interactHeld = this.interactBtn.pressed;
        if (this.interactBtn.consumeJustPressed()) {
            TouchBus.interactPressed = true;
        }
        if (this.pauseBtn.consumeJustPressed()) {
            TouchBus.pausePressed = true;
        }
    }
}
