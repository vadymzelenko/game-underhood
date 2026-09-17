import { TouchBus } from '../TouchBus.js';

export class TouchSource {
    constructor(_scene) {
        this.state = {
            moveX: 0,
            moveY: 0,
            interactPressed: false,
            interactHeld: false,
            pausePressed: false,
        };
    }

    poll() {
        const s = this.state;

        if (!TouchBus.enabled) {
            s.moveX = 0;
            s.moveY = 0;
            s.interactPressed = false;
            s.interactHeld = false;
            s.pausePressed = false;
            return;
        }

        s.moveX = TouchBus.moveX;
        s.moveY = TouchBus.moveY;
        s.interactHeld = TouchBus.interactHeld;

        // Однокадровые флаги — читаем и сразу гасим, чтобы не залипли
        s.interactPressed = TouchBus.interactPressed;
        TouchBus.interactPressed = false;

        s.pausePressed = TouchBus.pausePressed;
        TouchBus.pausePressed = false;
    }

    destroy() {
        this.state.moveX = 0;
        this.state.moveY = 0;
        this.state.interactPressed = false;
        this.state.interactHeld = false;
        this.state.pausePressed = false;
    }
}
