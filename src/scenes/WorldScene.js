import { BiomeGenerator } from '../world/BiomeGenerator.js';
import { ChunkManager }   from '../world/ChunkManager.js';
import { Player }         from '../entities/Player.js';
import { Building }       from '../entities/Building.js';
import { InputSystem }    from '../systems/InputSystem.js';
import { DEPTH, CAMERA_ZOOM, PALETTE as P } from '../utils/Constants.js';

import { InputManager } from '../input/InputManager.js';

export class WorldScene extends Phaser.Scene {
    constructor() { super('WorldScene'); }

    create() {
        this.biomeGen     = new BiomeGenerator();
        this.chunkManager = new ChunkManager(this, this.biomeGen);

        // Стартовая позиция — сразу за входом в детский дом
        const startX = 0;
        const startY = 110;

        this.building = new Building(this, 'Детский дом');


        this.player = new Player(this, startX, startY, {
            charKey: 'player',
            texture: 'player',
            speed: 70,
        });

        // Коллизия игрок ↔ здание
        this.physics.add.collider(this.player.sprite, this.building.body);

        // Камера — увеличение пикселя
        this.cameras.main.startFollow(this.player.sprite, true, 0.15, 0.15);
        this.cameras.main.setZoom(CAMERA_ZOOM);
        this.cameras.main.setRoundPixels(true);
        this.cameras.main.setBackgroundColor(P.ALMOST_BLACK);

        this.inputSystem = new InputSystem(this);

        

        if (!this.scene.isActive('UIScene')) this.scene.launch('UIScene');

        // Подсказка «войти»
        this.promptText = this.add.text(0, 0, 'E — войти', {
            fontFamily: 'monospace',
            fontSize: '10px',
            color: '#fff1a9',
            backgroundColor: '#120e23',
            padding: { x: 4, y: 2 },
        })
            .setOrigin(0.5)
            .setDepth(DEPTH.OVERLAY)
            .setVisible(false);

        this.inputManager = new InputManager(this);

        this.events.once('shutdown', () => {
            this._cleanup();
            this.inputManager.destroy();
        });
    }

    _cleanup() { this.chunkManager.destroyAll(); }

    update() {
        this.inputManager.update();
        this.player.update(this.inputManager.state);
        this.chunkManager.update(this.player.x, this.player.y);

        const near = this.building.isPlayerNear(this.player.x, this.player.y);

        if (near) {
            this.promptText.setVisible(true);
            this.promptText.setPosition(this.player.x, this.player.y - 26);
            if (this.inputManager.state.interactPressed) this._enterInterior();
        } else {
            this.promptText.setVisible(false);
        }
    }

    _enterInterior() {
        this.returnPoint = {
            x: this.building.doorX,
            y: this.building.doorY + 12,
        };
        this.scene.pause();
        this.scene.launch('InteriorScene', { fromWorld: 'WorldScene' });
    }
}