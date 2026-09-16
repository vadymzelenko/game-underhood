import { KeyboardSource } from './sources/KeyboardSource.js';
import { GamepadSource }  from './sources/GamepadSource.js';
import { TouchSource }    from './sources/TouchSource.js';
import { TouchBus }       from './TouchBus.js';

export class InputManager {
    constructor(scene) {
        this.scene = scene;

        this.sources = [
            new KeyboardSource(scene),
            new GamepadSource(scene),
        ];

        if (TouchBus.enabled) {
            this.sources.push(new TouchSource(scene));
        }

        /** Единый стейт для игровой логики. */
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

        // Клампим вектор до длины 1 (диагональ не быстрее)
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

/** Проверка, включать ли мобильный UI. URL-override удобен для отладки. */
export function shouldEnableTouch(scene) {
    const params = new URLSearchParams(location.search);
    if (params.has('notouch')) return false;
    if (params.has('touch'))   return true;

    const d = scene.sys.game.device;
    if (d.os.android || d.os.iOS || d.os.iPad) return true;
    if (window.matchMedia?.('(pointer: coarse)').matches) return true;
    return d.input.touch;
}