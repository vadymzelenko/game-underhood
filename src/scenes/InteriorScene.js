import { DEPTH, CAMERA_ZOOM, PALETTE as P } from '../utils/Constants.js';
import { InputManager } from '../input/InputManager.js';

export class InteriorScene extends Phaser.Scene {
    constructor() { super('InteriorScene'); }

    init(data) {
        this.fromWorldKey = data.fromWorld || 'WorldScene';
        this.roomW = 320;   // нативных пикселя (в 3x = 960px на экране)
        this.roomH = 200;
    }

    create() {
        const W = this.roomW, H = this.roomH;

        const g = this.add.graphics();
        g.setDepth(0);

        // Пол — GOLD, плитка — DARK_BROWN
        g.fillStyle(P.GOLD, 1);
        g.fillRect(0, 0, W, H);

        g.fillStyle(P.BROWN, 1);
        for (let y = 0; y < H; y += 16) {
            for (let x = 0; x < W; x += 16) {
                if (((x / 16) + (y / 16)) % 2 === 0) {
                    g.fillRect(x + 1, y + 1, 14, 14);
                }
            }
        }

        // Стены
        g.fillStyle(P.VERY_DARK, 1);
        g.fillRect(0, 0, W, 10);
        g.fillRect(0, H - 10, W, 10);
        g.fillRect(0, 0, 10, H);
        g.fillRect(W - 10, 0, 10, H);

        // Внутренние стены (коридор)
        g.fillStyle(P.DARK_BROWN, 1);
        g.fillRect(10, 60, 100, 8);
        g.fillRect(W - 110, 60, 100, 8);
        g.fillRect(10, 130, 100, 8);
        g.fillRect(W - 110, 130, 100, 8);

        // Выход (снизу по центру)
        const exitW = 40, exitH = 14;
        const exitX = W / 2 - exitW / 2;
        const exitY = H - exitH;

        g.fillStyle(P.ALMOST_BLACK, 1);
        g.fillRect(exitX, exitY, exitW, exitH);
        g.fillStyle(P.CREAM, 1);
        g.fillRect(exitX, exitY, exitW, 2);

        // Игрок
        this.player = this.physics.add.sprite(W / 2, H - 40, 'player');
        this.player.setOrigin(0.5, 1);
        this.player.setDepth(DEPTH.ENTITIES);
        this.player.body.setSize(10, 5);
        this.player.body.setOffset(3, 11);

        this.physics.world.setBounds(10, 10, W - 20, H - 20);
        this.player.setCollideWorldBounds(true);

        this.cameras.main.startFollow(this.player, true, 0.2, 0.2);
        this.cameras.main.setBounds(0, 0, W, H);
        this.cameras.main.setZoom(CAMERA_ZOOM);
        this.cameras.main.setRoundPixels(true);
        this.cameras.main.setBackgroundColor(P.ALMOST_BLACK);

        this.cursors = this.input.keyboard.createCursorKeys();
        this.keys = this.input.keyboard.addKeys({
            up: 'W', down: 'S', left: 'A', right: 'D', interact: 'E',
        });

        // Подпись
        this.add.text(W / 2, 22, 'ХОЛЛ', {
            fontFamily: 'monospace',
            fontSize: '10px',
            color: '#fff1a9',
        }).setOrigin(0.5).setDepth(2);

        this.exitX = W / 2;
        this.exitY = exitY + exitH / 2;
        this.exitRadius = 26;


        this.inputManager = new InputManager(this);

        this.events.once('shutdown', () => this.inputManager.destroy());
    }

    update() {
        this.inputManager.update();
        const input = this.inputManager.state;

        this.player.body.setVelocity(input.moveX * 60, input.moveY * 60);

        if (input.moveX < 0) this.player.setFlipX(true);
        if (input.moveX > 0) this.player.setFlipX(false);

        const dx = this.player.x - this.exitX;
        const dy = this.player.y - this.exitY;
        if (Math.hypot(dx, dy) < this.exitRadius && input.interactPressed) {
            this._exitToWorld();
        }
    }

    _exitToWorld() {
        const world = this.scene.get(this.fromWorldKey);
        this.scene.stop();
        this.scene.resume(this.fromWorldKey);
        if (world?.player && world.returnPoint) {
            world.player.teleport(world.returnPoint.x, world.returnPoint.y);
        }
    }
}