import { BiomeGenerator } from '../world/BiomeGenerator.js';
import { ChunkManager }   from '../world/ChunkManager.js';
import { Player }         from '../entities/Player.js';
import { Building }       from '../entities/Building.js';
import { InputSystem }    from '../systems/InputSystem.js';
import {
    DEPTH, CAMERA_ZOOM, PALETTE as P,
    WORLD_MIN, WORLD_SIZE,
} from '../utils/Constants.js';

import { InputManager } from '../input/InputManager.js';
import { VignetteOverlay } from '../ui/VignetteOverlay.js';
import { TUNING } from '../config/TuningConfig.js';

export class WorldScene extends Phaser.Scene {
    constructor() { super('WorldScene'); }

    create() {
        this.biomeGen     = new BiomeGenerator();
        this.chunkManager = new ChunkManager(this, this.biomeGen);

        this.physics.world.setBounds(WORLD_MIN, WORLD_MIN, WORLD_SIZE, WORLD_SIZE);

        const startX = 0;
        const startY = 110;

        this.building = new Building(this, 'Детский дом');

        this.player = new Player(this, startX, startY, {
            charKey: 'player', texture: 'player', speed: 70,
        });
        this.player.sprite.setCollideWorldBounds(true);

        // Тень игрока — единый слой SHADOW
        this.playerShadow = this.add.image(startX, startY, 'shadow_soft');
        this.playerShadow
            .setOrigin(0.5, 0.5)
            .setAlpha(TUNING.shadow.alpha)
            .setTint(TUNING.shadow.color)
            .setDisplaySize(TUNING.player.shadowW, TUNING.player.shadowH)
            .setDepth(DEPTH.SHADOW);

        this.physics.add.collider(this.player.sprite, this.building.body);

        this.cameras.main.startFollow(this.player.sprite, true, 0.15, 0.15);
        this.cameras.main.setBounds(WORLD_MIN, WORLD_MIN, WORLD_SIZE, WORLD_SIZE);
        this.cameras.main.setZoom(CAMERA_ZOOM);
        this.cameras.main.setRoundPixels(true);
        this.cameras.main.setBackgroundColor(P.ALMOST_BLACK);

        this.inputSystem = new InputSystem(this);

        if (!this.scene.isActive('UIScene')) this.scene.launch('UIScene');

        this.promptText = this.add.text(0, 0, 'E — войти', {
            fontFamily: 'monospace', fontSize: '10px',
            color: '#fff1a9', backgroundColor: '#120e23',
            padding: { x: 4, y: 2 },
        })
            .setOrigin(0.5)
            .setDepth(DEPTH.OVERLAY)
            .setVisible(false);

        this.inputManager = new InputManager(this);

        // ★ Виньетка
        this.vignette = new VignetteOverlay(this);

        this.events.once('shutdown', () => {
            this._cleanup();
            this.inputManager.destroy();
            this.vignette?.destroy();
        });
    }

    _cleanup() { this.chunkManager.destroyAll(); }

    update() {
        this.inputManager.update();
        this.player.update(this.inputManager.state);
        this.chunkManager.update(this.player.x, this.player.y);

        // Y-sort игрока + его тень на единый слой
        this.player.sprite.setDepth(DEPTH.ENTITIES + this.player.y);
        this.playerShadow.setPosition(this.player.x, this.player.y + TUNING.player.yOff);
        // depth уже DEPTH.SHADOW — не трогаем

        // ★ Виньетка: биом под игроком → плавная прозрачность Overlay
        const biome = this.biomeGen.getBiome(this.player.x, this.player.y);
        this.vignette?.update(this.player.x, this.player.y, biome);

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