import { BiomeGenerator } from '../world/BiomeGenerator.js';
import { ChunkManager }   from '../world/ChunkManager.js';
import { Player }         from '../entities/Player.js';
import { Building }       from '../entities/Building.js';
import { WorldGrid }      from '../world/WorldGrid.js';
import { WindSystem }     from '../world/WindSystem.js';

import {
    DEPTH, CAMERA_ZOOM, PALETTE as P,
    WORLD_MIN, WORLD_SIZE, BIOME,
    BUILDING_BOUNDS,
} from '../utils/Constants.js';

import { InputManager } from '../input/InputManager.js';
import { VignetteOverlay } from '../ui/VignetteOverlay.js';
import { DayNightCycle } from '../systems/DayNightCycle.js';
import { TUNING } from '../config/TuningConfig.js';
import { ambience } from '../systems/AmbientAudio.js';

const DEBUG_BLOCKED = false;
const OBS_CELL = 48;

let _ambienceWired = false;

export class WorldScene extends Phaser.Scene {
    constructor() { super('WorldScene'); }

    create() {
        this.biomeGen = new BiomeGenerator();
        this.grid = new WorldGrid(this, 32);
        this.windSystem = new WindSystem(this);

        this.obstaclesGroup = this.physics.add.staticGroup();
        this.chunkManager = new ChunkManager(
            this, this.biomeGen, this.obstaclesGroup, this.windSystem,
        );
        this.physics.world.setBounds(WORLD_MIN, WORLD_MIN, WORLD_SIZE, WORLD_SIZE);

        this._obsGrid = new Map();
        this._obsCell = OBS_CELL;
        this._obsDirty = true;

        const spawn = this._findSafeSpawn(0, 110);
        this.building = new Building(this, 'Детский дом');
        this._reserveBuildingInGrid();

        this.player = new Player(this, spawn.x, spawn.y, {
            charKey: 'player', texture: 'player', speed: TUNING.player.speed,
        });
        this.player.sprite.setCollideWorldBounds(true);

        this.playerShadow = this.add.image(spawn.x, spawn.y, 'shadow_soft');
        this.playerShadow
            .setOrigin(0.5, 0.5)
            .setAlpha(TUNING.shadow.alpha)
            .setTint(TUNING.shadow.color)
            .setDisplaySize(TUNING.player.shadowW, TUNING.player.shadowH)
            .setDepth(DEPTH.SHADOW);

        this.physics.add.collider(this.player.sprite, this.building.body);
        this.physics.add.collider(this.player.sprite, this.obstaclesGroup);

        const followLerp = TUNING.camera?.followLerp ?? 1;
        this.cameras.main.startFollow(this.player.sprite, true, followLerp, followLerp);
        this.cameras.main.setBounds(WORLD_MIN, WORLD_MIN, WORLD_SIZE, WORLD_SIZE);
        this.cameras.main.setZoom(CAMERA_ZOOM);
        this.cameras.main.setRoundPixels(true);
        this.cameras.main.setBackgroundColor(P.ALMOST_BLACK);

        this.inputManager = new InputManager(this);
        if (!this.scene.isActive('UIScene')) this.scene.launch('UIScene');

        this.promptText = this.add.text(0, 0, 'E — войти', {
            fontFamily: 'monospace', fontSize: '10px',
            color: '#fff1a9', backgroundColor: '#120e23',
            padding: { x: 4, y: 2 },
        }).setOrigin(0.5).setDepth(DEPTH.OVERLAY).setVisible(false);

        this.dayNight = new DayNightCycle(this);

        const w = this.scale.width, h = this.scale.height;
        this.ambientOverlay = this.add.rectangle(0, 0, w, h, 0x0a0a19, 0)
            .setOrigin(0, 0).setScrollFactor(0).setDepth(DEPTH.VIGNETTE - 1);
        this._onResize = (size) => this.ambientOverlay.setSize(size.width, size.height);
        this.scale.on('resize', this._onResize, this);

        this.vignette = new VignetteOverlay(this);

        this._lastShadowKey = null;
        this._blockedCalls = 0;

        this.events.once('shutdown', () => {
            this._cleanup();
            this.inputManager.destroy();
            this.vignette?.destroy();
            this.scale.off('resize', this._onResize, this);
        });

        this._gKey = this.input.keyboard.addKey('G');
        this._gKey.on('down', () => this.grid.toggleDebug());

        this._wireAmbience();
    }

    _wireAmbience() {
        if (_ambienceWired) return;
        _ambienceWired = true;
        const start = () => { ambience.start(); ambience.resume(); };
        window.addEventListener('pointerdown', start, { once: true });
        window.addEventListener('keydown',     start, { once: true });
        window.addEventListener('touchstart',  start, { once: true, passive: true });
    }

    _cleanup() {
        this.chunkManager.destroyAll();
        this.windSystem.destroy();
        this._obsGrid.clear();
    }

    _reserveBuildingInGrid() {
        const cs = this.grid.cellSize;
        const cx = Math.floor(BUILDING_BOUNDS.x / cs);
        const cy = Math.floor(BUILDING_BOUNDS.y / cs);
        const wC = Math.ceil(BUILDING_BOUNDS.w / cs);
        const hC = Math.ceil(BUILDING_BOUNDS.h / cs);
        this.grid.occupy(cx, cy, wC, hC, { kind: 'building', ref: this.building });
    }

    _rebuildObstacleIndex() {
        const grid = this._obsGrid;
        grid.clear();
        const cs = this._obsCell;
        const children = this.obstaclesGroup.getChildren();
        for (let i = 0; i < children.length; i++) {
            const z = children[i];
            const b = z.body;
            if (!b) continue;
            const cx0 = Math.floor(b.left / cs);
            const cy0 = Math.floor(b.top / cs);
            const cx1 = Math.floor(b.right / cs);
            const cy1 = Math.floor(b.bottom / cs);
            for (let cy = cy0; cy <= cy1; cy++) {
                for (let cx = cx0; cx <= cx1; cx++) {
                    const k = cx + ',' + cy;
                    let arr = grid.get(k);
                    if (!arr) { arr = []; grid.set(k, arr); }
                    arr.push(z);
                }
            }
        }
        this._obsDirty = false;
    }

    isBlockedAt(wx, wy, skipWater = false) {
        if (DEBUG_BLOCKED) this._blockedCalls++;

        if (!skipWater && TUNING.player.blockWater) {
            const b = this.biomeGen.getBiome(wx, wy);
            if (b === BIOME.WATER || b === BIOME.DEEP_WATER) return true;
        }

        if (this._obsDirty) this._rebuildObstacleIndex();

        const cs = this._obsCell;
        const cx = Math.floor(wx / cs);
        const cy = Math.floor(wy / cs);
        const arr = this._obsGrid.get(cx + ',' + cy);
        if (!arr || arr.length === 0) return false;

        const bl = wx - 5, bt = wy - 6, br = wx + 5, bb = wy + 1;
        for (let i = 0; i < arr.length; i++) {
            const body = arr[i].body;
            if (!body) continue;
            if (bl < body.right && br > body.left &&
                bt < body.bottom && bb > body.top) return true;
        }
        return false;
    }

    _findSafeSpawn(startX, startY) {
        if (!this._isBlockingTerrain(startX, startY)) return { x: startX, y: startY };
        const step = 24;
        for (let r = step; r < 3000; r += step) {
            const samples = Math.max(8, Math.floor((Math.PI * 2 * r) / 32));
            for (let i = 0; i < samples; i++) {
                const a = (i / samples) * Math.PI * 2;
                const x = startX + Math.cos(a) * r;
                const y = startY + Math.sin(a) * r;
                if (!this._isBlockingTerrain(x, y)) return { x, y };
            }
        }
        return { x: startX, y: startY };
    }

    _isBlockingTerrain(wx, wy) {
        if (!TUNING.player.blockWater) return false;
        const b = this.biomeGen.getBiome(wx, wy);
        return b === BIOME.WATER || b === BIOME.DEEP_WATER;
    }

    update(_, deltaMs) {
        this.grid.update();
        this.inputManager.update();

        this.dayNight.update(deltaMs);
        this._updateShadows();
        this._updateAmbient();

        this.player.update(
            this.inputManager.state,
            (x, y) => this.isBlockedAt(x, y, false),
        );

        const chunksChanged = this.chunkManager.update(
            this.player.x,
            this.player.y,
            this.player,
            (x, y) => this.isBlockedAt(x, y, true),
        );

        if (chunksChanged) this._obsDirty = true;

        // ★ Пиксельный ветер — обновляем после чанков,
        //   т.к. ChunkManager мог зарегистрировать новые спрайты.
        this.windSystem.update();

        this.player.sprite.setDepth(DEPTH.ENTITIES + this.player.y);
        this.playerShadow.setPosition(this.player.x, this.player.y + TUNING.player.yOff);

        const biome = this.biomeGen.getBiome(this.player.x, this.player.y);
        this.vignette?.update(this.player.x, this.player.y, biome);

        const near = this.building.isPlayerNear(this.player.x, this.player.y);
        if (near) {
            this.promptText.setVisible(true);
            this.promptText.setPosition(Math.round(this.player.x), Math.round(this.player.y - 26));
            if (this.inputManager.state.interactPressed) this._enterInterior();
        } else {
            this.promptText.setVisible(false);
        }
    }

    _updateShadows() {
        const p = this.dayNight.getShadowParams();
        const range = TUNING.silhouetteShadow.offsetRange;
        const angleBucket = Math.round((p.offsetX / range) * 6);
        const alphaBucket = Math.round(p.alpha * 20);
        const stretchBucket = Math.round(p.stretch * 10);
        const key = `${angleBucket}|${alphaBucket}|${stretchBucket}`;
        if (key === this._lastShadowKey) return;
        this._lastShadowKey = key;
        this.chunkManager.applyShadowParams(p);
    }

    _updateAmbient() {
        const a = this.dayNight.getAmbient();
        this.ambientOverlay.fillColor = a.color;
        this.ambientOverlay.setAlpha(a.alpha);
    }

    _enterInterior() {
        this.returnPoint = { x: this.building.doorX, y: this.building.doorY + 12 };
        this.scene.pause();
        this.scene.launch('InteriorScene', { fromWorld: 'WorldScene' });
    }
}