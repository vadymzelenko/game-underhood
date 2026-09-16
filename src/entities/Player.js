import { DEPTH } from '../utils/Constants.js';

export class Player {
    constructor(scene, x, y, opts = {}) {
        this.scene   = scene;
        this.charKey = opts.charKey ?? 'player';
        this.texture = opts.texture ?? 'player';
        this.speed   = opts.speed ?? 70;

        this.sprite = scene.physics.add.sprite(x, y, this.texture, 0);
        this.sprite.setOrigin(0.5, 1);
        this.sprite.setDepth(DEPTH.ENTITIES + y);

        // Хитбокс — по ногам (нативный кадр 16×24)
        const bw = opts.bodyWidth  ?? 10;
        const bh = opts.bodyHeight ?? 5;
        this.sprite.body.setSize(bw, bh);
        this.sprite.body.setOffset(3, 18);

        this.facing = 'down';
        this.moving = false;
        this._playAnim();
    }

    get x() { return this.sprite.x; }
    get y() { return this.sprite.y; }

    update(input) {
        const mx = input.moveX ?? 0;
        const my = input.moveY ?? 0;

        this.sprite.body.setVelocity(mx * this.speed, my * this.speed);

        // Направление — по доминирующей оси
        let dir = this.facing;
        const len = Math.hypot(mx, my);
        if (len > 0.05) {
            if (Math.abs(mx) > Math.abs(my)) {
                dir = mx < 0 ? 'left' : 'right';
            } else {
                dir = my < 0 ? 'up' : 'down';
            }
        }

        const moving = len > 0.05;
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