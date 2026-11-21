import { TouchBus } from '../TouchBus.js';

/**
 * Не держит свою логику — просто читает TouchBus.
 * Потребляет edge-события (interactPressed), чтобы каждое
 * нажатие сработало ровно один раз.
 */
export class TouchSource {
    constructor(scene) {
        this.scene = scene;
        this.state = {
            moveX: 0, moveY: 0,
            interactPressed: false, interactHeld: false,
            pausePressed: false,
        };
    }

    poll() {
        if (!TouchBus.enabled) {
            this.state.moveX = 0;
            this.state.moveY = 0;
            this.state.interactPressed = false;
            this.state.interactHeld = false;
            this.state.pausePressed = false;
            return;
        }

        this.state.moveX = TouchBus.moveX;
        this.state.moveY = TouchBus.moveY;
        this.state.interactHeld = TouchBus.interactHeld;

        // Потребляем edge — только один раз
        this.state.interactPressed = TouchBus.interactPressed;
        this.state.pausePressed = TouchBus.pausePressed;
        TouchBus.interactPressed = false;
        TouchBus.pausePressed = false;
    }

    destroy() {}
}