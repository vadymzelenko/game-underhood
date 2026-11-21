import { DEPTH } from '../utils/Constants.js';
import { TUNING } from '../config/TuningConfig.js';

export class Player {
    constructor(scene, x, y, opts = {}) {
        this.scene   = scene;
        this.charKey = opts.charKey ?? 'player';
        this.texture = opts.texture ?? 'player';
        this.speed   = opts.speed   ?? 70;

        this.sprite = scene.physics.add.sprite(x, y, this.texture, 0);
        this.sprite.setOrigin(0.5, 1);
        this.sprite.setDepth(DEPTH.ENTITIES + y);

        // Хитбокс — «ноги» (см. TUNING.player).
        this.sprite.body.setSize(TUNING.player.bodyW, TUNING.player.bodyH);
        this.sprite.body.setOffset(TUNING.player.bodyOffsetX, TUNING.player.bodyOffsetY);

        this.facing = 'down';
        this.moving = false;
        this._playAnim();
    }

    get x() { return this.sprite.x; }
    get y() { return this.sprite.y; }

    update(input, isBlocked = null) {
        const mx  = input.moveX ?? 0;
        const my  = input.moveY ?? 0;
        const len = Math.hypot(mx, my);

        let vx = mx * this.speed;
        let vy = my * this.speed;

        // Slide-обход: если впереди по одной оси стена — едем по другой.
        // Никаких вееров и лучей, обычная «прилипающая» коллизия.
        if (isBlocked && len > 0.05) {
            const nx = mx / len;
            const ny = my / len;
            const dt = 1 / 60;
            const buf = 4;

            const blockedX = vx !== 0 &&
                isBlocked(this.x + nx * (this.speed * dt + buf), this.y);
            const blockedY = vy !== 0 &&
                isBlocked(this.x, this.y + ny * (this.speed * dt + buf));

            if (blockedX && blockedY) { vx = 0; vy = 0; }
            else if (blockedX)        { vx = 0; }
            else if (blockedY)        { vy = 0; }
        }

        this.sprite.body.setVelocity(vx, vy);

        // Снап при полной остановке — убирает микро-джиттер в покое.
        if (vx === 0 && vy === 0) {
            this.sprite.body.position.x = Math.round(this.sprite.body.position.x);
            this.sprite.body.position.y = Math.round(this.sprite.body.position.y);
        }

        // Анимация
        let dir = this.facing;
        const moving = len > 0.05;
        if (moving) {
            if (Math.abs(mx) > Math.abs(my)) dir = mx < 0 ? 'left' : 'right';
            else                             dir = my < 0 ? 'up'   : 'down';
        }
        if (dir !== this.facing || moving !== this.moving) {
            this.facing = dir;
            this.moving = moving;
            this._playAnim();
        }

        this.sprite.setDepth(DEPTH.ENTITIES + this.sprite.y);
    }

    _playAnim() {
        const key = `${this.charKey}_${this.moving ? 'walk' : 'idle'}_${this.facing}`;
        if (this.scene.anims.exists(key)) {
            this.sprite.anims.play(key, true);
        }
    }

    teleport(x, y) {
        this.sprite.setPosition(x, y);
        this.sprite.body.reset(x, y);
    }

    destroy() { this.sprite.destroy(); }
}