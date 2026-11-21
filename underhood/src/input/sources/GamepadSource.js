/**
 * Геймпад через Phaser.GamepadPlugin.
 * Не требует user gesture в большинстве браузеров (кроме Safari,
 * который "видит" пад только после нажатия любой кнопки на нём).
 */
export class GamepadSource {
    constructor(scene) {
        this.scene = scene;
        this._prevInteract = false;
        this._prevPause = false;

        this.state = {
            moveX: 0, moveY: 0,
            interactPressed: false, interactHeld: false,
            pausePressed: false,
        };
    }

    poll() {
        const pad = this.scene.input.gamepad?.getPad(0);

        let mx = 0, my = 0;
        let interactHeld = false;
        let pauseHeld = false;

        if (pad) {
            // Левый стик (с мёртвой зоной)
            mx = pad.leftStick.x;
            my = pad.leftStick.y;
            if (Math.abs(mx) < 0.15) mx = 0;
            if (Math.abs(my) < 0.15) my = 0;

            // D-Pad перекрывает стик, если нажат
            if (pad.left)  mx = -1;
            if (pad.right) mx =  1;
            if (pad.up)    my = -1;
            if (pad.down)  my =  1;

            // Кнопки: A / X (Xbox / PS) — взаимодействие, Start — пауза
            interactHeld = !!(pad.A || pad.X);
            pauseHeld    = !!(pad.start || pad.B);
        }

        this.state.moveX = mx;
        this.state.moveY = my;
        this.state.interactHeld = interactHeld;
        this.state.interactPressed = interactHeld && !this._prevInteract;
        this.state.pausePressed = pauseHeld && !this._prevPause;

        this._prevInteract = interactHeld;
        this._prevPause = pauseHeld;
    }

    destroy() {}
}