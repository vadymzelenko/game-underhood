import { BiomeGenerator } from '../world/BiomeGenerator.js';
import { ChunkManager }   from '../world/ChunkManager.js';
import { Player }         from '../entities/Player.js';
import { Building }       from '../entities/Building.js';
import { WorldGrid }      from '../world/WorldGrid.js';
import { WindSystem }     from '../world/WindSystem.js';

import {
    DEPTH, CAMERA_ZOOM, PALETTE as P,
    WORLD_MIN, WORLD_MAX, WORLD_SIZE, BIOME,
} from '../utils/Constants.js';

import { BUILDINGS } from '../config/BuildingsConfig.js';
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

        this._drawWorldBorder();

        // Игрок — ДО зданий: им нужен player.sprite для коллайдеров
        const spawn = this._findSafeSpawn(0, 110);
        this.player = new Player(this, spawn.x, spawn.y, {
            charKey: 'player', texture: 'player', speed: TUNING.player.speed,
        });
        this.player.sprite.setCollideWorldBounds(true);

        // Здания (создаются ПОСЛЕ игрока)
        this._buildAllBuildings();

        this.playerShadow = this.add.image(spawn.x, spawn.y, 'shadow_soft');
        this.playerShadow
            .setOrigin(0.5, 0.5)
            .setAlpha(TUNING.shadow.alpha)
            .setTint(TUNING.shadow.color)
            .setDisplaySize(TUNING.player.shadowW, TUNING.player.shadowH)
            .setDepth(DEPTH.SHADOW);

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

        this._teleporting = false;
        this._buildTeleportOverlay();

        this._lastShadowKey = null;
        this._blockedCalls = 0;

        this.events.once('shutdown', () => {
            this._cleanup();
            this.inputManager.destroy();
            this.vignette?.destroy();
            this.scale.off('resize', this._onResize, this);
            this.scale.off('resize', this._onResizeTeleport, this);
        });

        this._gKey = this.input.keyboard.addKey('G');
        this._gKey.on('down', () => this.grid.toggleDebug());

        this._wireAmbience();
    }

    _drawWorldBorder() {
        const T = TUNING.teleport;
        const t = T.borderThickness;
        const d = DEPTH.GROUND + 1;

        const g = this.add.graphics().setDepth(d);

        g.fillStyle(T.borderColor, T.borderAlpha);
        g.fillRect(WORLD_MIN, WORLD_MIN,     WORLD_SIZE, t);
        g.fillRect(WORLD_MIN, WORLD_MAX - t, WORLD_SIZE, t);
        g.fillRect(WORLD_MIN, WORLD_MIN,     t, WORLD_SIZE);
        g.fillRect(WORLD_MAX - t, WORLD_MIN, t, WORLD_SIZE);

        const e = T.borderEdgeWidth;
        const ei = t - e;
        g.fillStyle(T.borderEdgeColor, T.borderEdgeAlpha);
        g.fillRect(WORLD_MIN + ei, WORLD_MIN + ei, WORLD_SIZE - 2 * ei, e);
        g.fillRect(WORLD_MIN + ei, WORLD_MAX - t,  WORLD_SIZE - 2 * ei, e);
        g.fillRect(WORLD_MIN + ei, WORLD_MIN + ei, e, WORLD_SIZE - 2 * ei);
        g.fillRect(WORLD_MAX - t,  WORLD_MIN + ei, e, WORLD_SIZE - 2 * ei);
    }

    _buildAllBuildings() {
        this.buildings = [];
        this.buildingsByKey = {};

        for (const cfg of BUILDINGS) {
            const b = new Building(this, cfg);
            this.buildings.push(b);
            this.buildingsByKey[cfg.id] = b;
            this.physics.add.collider(this.player.sprite, b.body);
            this._reserveBuildingInGrid(b);
        }
    }

    _reserveBuildingInGrid(building) {
        const cs = this.grid.cellSize;
        const b = building.config.bounds;
        const cx = Math.floor(b.x / cs);
        const cy = Math.floor(b.y / cs);
        const wC = Math.ceil(b.w / cs);
        const hC = Math.ceil(b.h / cs);
        this.grid.occupy(cx, cy, wC, hC, { kind: 'building', ref: building });
    }

    _findNearestBuilding() {
        let best = null;
        let bestD = Infinity;
        for (const b of this.buildings) {
            const d = Math.hypot(this.player.x - b.doorX, this.player.y - b.doorY);
            if (d < b.doorRadius && d < bestD) { bestD = d; best = b; }
        }
        return best;
    }

    _buildTeleportOverlay() {
        const sw = this.scale.width, sh = this.scale.height;

        this.teleportOverlay = this.add.rectangle(0, 0, sw, sh, 0x0a0a19, 1)
            .setOrigin(0, 0)
            .setScrollFactor(0)
            .setDepth(DEPTH.OVERLAY + 100)
            .setAlpha(0)
            .setVisible(false);

        this.teleportText = this.add.text(sw / 2, sh / 2, 'ПЕРЕХОД...', {
            fontFamily: 'monospace',
            fontSize: '18px',
            color: '#fff1a9',
            stroke: '#120e23',
            strokeThickness: 4,
        })
            .setOrigin(0.5)
            .setScrollFactor(0)
            .setDepth(DEPTH.OVERLAY + 101)
            .setAlpha(0)
            .setVisible(false);

        this._onResizeTeleport = (size) => {
            this.teleportOverlay.setSize(size.width, size.height);
            this.teleportText.setPosition(size.width / 2, size.height / 2);
        };
        this.scale.on('resize', this._onResizeTeleport, this);
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
        for (const b of this.buildings) b.destroy();
        this.buildings.length = 0;
        this.buildingsByKey = {};
        clearRuntimeBuildings();   // ★ сбрасываем рантайм при выходе из сцены
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

    _findFreeSpotNear(x, y, maxR = 400) {
        if (!this.isBlockedAt(x, y, true)) return { x, y };
        const step = 24;
        for (let r = step; r <= maxR; r += step) {
            const samples = Math.max(8, Math.floor((Math.PI * 2 * r) / 32));
            for (let i = 0; i < samples; i++) {
                const a = (i / samples) * Math.PI * 2;
                const xx = x + Math.cos(a) * r;
                const yy = y + Math.sin(a) * r;
                if (!this.isBlockedAt(xx, yy, true)) return { x: xx, y: yy };
            }
        }
        return null;
    }

    _checkWorldWrap() {
        if (this._teleporting) return;

        const body = this.player.sprite.body;
        if (!body) return;

        const cx = body.center.x;
        const cy = body.center.y;
        const T = TUNING.teleport;

        const hitL = cx <= WORLD_MIN + T.edgeTrigger;
        const hitR = cx >= WORLD_MAX - T.edgeTrigger;
        const hitT = cy <= WORLD_MIN + T.edgeTrigger;
        const hitB = cy >= WORLD_MAX - T.edgeTrigger;

        if (!hitL && !hitR && !hitT && !hitB) return;
        this._startTeleport({ hitL, hitR, hitT, hitB });
    }

    _startTeleport(hits) {
        if (this._teleporting) return;
        this._teleporting = true;

        const T = TUNING.teleport;
        const ov = this.teleportOverlay;
        const tx = this.teleportText;

        const b = this.player.sprite.body;
        if (b) b.setVelocity(0, 0);

        ov.setVisible(true);
        tx.setVisible(true);

        this.tweens.add({
            targets: [ov, tx],
            alpha: 1,
            duration: T.fadeOutMs,
            ease: 'Sine.easeIn',
            onComplete: () => {
                const target = this._pickTeleportTarget(hits);
                const safe = this._findSafeSpawn(target.x, target.y);
                this._doTeleport(safe);

                this.time.delayedCall(T.loadingMs, () => {
                    this.tweens.add({
                        targets: [ov, tx],
                        alpha: 0,
                        duration: T.fadeInMs,
                        ease: 'Sine.easeOut',
                        onComplete: () => {
                            ov.setVisible(false);
                            tx.setVisible(false);
                            this._teleporting = false;
                        },
                    });
                });
            },
        });
    }

    _pickTeleportTarget(hits) {
        const T = TUNING.teleport;
        const innerMin = WORLD_MIN + T.safeMargin;
        const innerMax = WORLD_MAX - T.safeMargin;
        const rand = (a, b) => a + Math.random() * (b - a);

        const options = [];
        if (!hits.hitL) options.push({ x: innerMin, y: rand(innerMin, innerMax) });
        if (!hits.hitR) options.push({ x: innerMax, y: rand(innerMin, innerMax) });
        if (!hits.hitT) options.push({ x: rand(innerMin, innerMax), y: innerMin });
        if (!hits.hitB) options.push({ x: rand(innerMin, innerMax), y: innerMax });

        if (!options.length) {
            options.push({ x: innerMin, y: rand(innerMin, innerMax) });
            options.push({ x: innerMax, y: rand(innerMin, innerMax) });
            options.push({ x: rand(innerMin, innerMax), y: innerMin });
            options.push({ x: rand(innerMin, innerMax), y: innerMax });
        }

        return options[Math.floor(Math.random() * options.length)];
    }

    _doTeleport(target) {
        const cam = this.cameras.main;
        cam.stopFollow();

        this.player.teleport(target.x, target.y);

        this._obsDirty = true;
        this.chunkManager.update(target.x, target.y, null, null);

        this._obsDirty = true;
        if (this.isBlockedAt(target.x, target.y, true)) {
            const free = this._findFreeSpotNear(target.x, target.y, 500);
            if (free) this.player.teleport(free.x, free.y);
        }

        cam.centerOn(this.player.x, this.player.y);
        cam.startFollow(this.player.sprite, true, 1, 1);
        cam.centerOn(this.player.x, this.player.y);

        this.player.sprite.setDepth(DEPTH.ENTITIES + this.player.y);
        this.playerShadow.setPosition(this.player.x, this.player.y + TUNING.player.yOff);
    }

    update(_, deltaMs) {
        if (this._teleporting) {
            const b = this.player.sprite.body;
            if (b) b.setVelocity(0, 0);
            this.dayNight.update(deltaMs);
            this._updateAmbient();
            return;
        }

        this.grid.update();
        this.inputManager.update();

        this.dayNight.update(deltaMs);
        this._updateShadows();
        this._updateAmbient();

        this.player.update(
            this.inputManager.state,
            (x, y) => this.isBlockedAt(x, y, false),
        );

        this._checkWorldWrap();

        const chunksChanged = this.chunkManager.update(
            this.player.x, this.player.y, this.player,
            (x, y) => this.isBlockedAt(x, y, true),
        );
        if (chunksChanged) this._obsDirty = true;

        this.windSystem.update();

        this.player.sprite.setDepth(DEPTH.ENTITIES + this.player.y);
        this.playerShadow.setPosition(this.player.x, this.player.y + TUNING.player.yOff);

        const biome = this.biomeGen.getBiome(this.player.x, this.player.y);
        this.vignette?.update(this.player.x, this.player.y, biome);

        const near = this._findNearestBuilding();
        if (near) {
            this.promptText.setVisible(true);
            this.promptText.setText(`E — войти в ${near.name}`);
            this.promptText.setPosition(
                Math.round(this.player.x),
                Math.round(this.player.y - 26),
            );
            if (this.inputManager.state.interactPressed) this._enterInterior(near);
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

    _enterInterior(building) {
        this.returnPoint = {
            x: building.doorX,
            y: building.doorY + 12,
            buildingId: building.id,
        };
        this.scene.pause();
        this.scene.launch('InteriorScene', {
            fromWorld: 'WorldScene',
            buildingId: building.id,
        });
    }
}