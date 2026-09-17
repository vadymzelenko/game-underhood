import { KeyboardSource } from './sources/KeyboardSource.js';
import { GamepadSource }  from './sources/GamepadSource.js';
import { TouchSource }    from './sources/TouchSource.js';

export class InputManager {
    constructor(scene) {
        this.scene = scene;

        // TouchSource всегда в списке — он безвреден, когда TouchBus.enabled = false.
        // Иначе при создании InputManager до TouchControlsScene.create()
        // тач-источник не добавится, и ввод с телефона не будет читаться.
        this.sources = [
            new KeyboardSource(scene),
            new GamepadSource(scene),
            new TouchSource(scene),
        ];

        this.state = {
            moveX: 0,
            moveY: 0,
            interactPressed: false,
            interactHeld: false,
            pausePressed: false,
        };
    }

    update() {
        let mx = 0, my = 0;
        let interactPressed = false;
        let interactHeld = false;
        let pausePressed = false;

        for (const src of this.sources) {
            src.poll();
            const s = src.state;
            mx += s.moveX;
            my += s.moveY;
            if (s.interactPressed) interactPressed = true;
            if (s.interactHeld)    interactHeld = true;
            if (s.pausePressed)    pausePressed = true;
        }

        const len = Math.hypot(mx, my);
        if (len > 1) { mx /= len; my /= len; }

        this.state.moveX = mx;
        this.state.moveY = my;
        this.state.interactPressed = interactPressed;
        this.state.interactHeld = interactHeld;
        this.state.pausePressed = pausePressed;
    }

    destroy() {
        for (const src of this.sources) src.destroy?.();
        this.sources.length = 0;
    }
}

export function shouldEnableTouch(scene) {
    const params = new URLSearchParams(location.search);
    if (params.has('notouch')) return false;
    if (params.has('touch'))   return true;

    const d = scene.sys.game.device;
    if (d.os.android || d.os.iOS || d.os.iPad) return true;
    if (window.matchMedia?.('(pointer: coarse)').matches) return true;
    return d.input.touch;
}
