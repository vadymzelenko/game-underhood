import {
    DEPTH, PALETTE as P,
} from '../../utils/Constants.js';
import { InputManager } from '../../input/InputManager.js';
import { Player } from '../../entities/Player.js';
import { getBuildingById } from '../../config/BuildingsConfig.js';
import { TUNING } from '../../config/TuningConfig.js';
import { getHouseLayout, blocksMove } from './HouseLayouts.js';
import { RoomRenderer } from './RoomRenderer.js';
import { LightSystem } from './LightSystem.js';
import { Door } from './Door.js';
import { registerPropTextures, propSize } from './props/PropFactory.js';
import { placeRoom, placeCorridor } from './props/PropPlacer.js';
import { ambience } from '../../systems/AmbientAudio.js';

/**
 * Сцена интерьера (1-й этаж детского дома).
 *
 *  • Cutaway-стены (RoomRenderer) + мягкий свет Stardew (LightSystem).
 *  • Комнаты заполняются пропсами по типу (PropPlacer/PropFactory).
 *  • Рабочие двери (Door): открытие/закрытие + коллизия.
 *  • Аудиозона: при входе лес затухает, включается indoor-эмбиент.
 */
export class HouseScene extends Phaser.Scene {
    constructor() { super('HouseScene'); }

    init(data) {
        this.fromWorldKey = data.fromWorld ?? 'WorldScene';
        this.buildingId   = data.buildingId ?? null;

        const bcfg = this.buildingId ? getBuildingById(this.buildingId) : null;
        this.layout = getHouseLayout(bcfg?.interiorLayoutId) ?? getHouseLayout('orphanage_floor1');

        this.tilePx = this.layout.tilePx;
        this.roomW  = this.layout.map[0].length * this.tilePx;
        this.roomH  = this.layout.map.length    * this.tilePx;
    }

    create() {
        // Пропсы + дверные текстуры
        registerPropTextures(this);

        // Комната (пол + стены) одной текстурой
        const renderer = new RoomRenderer(this);
        const texKey = renderer.render(this.layout.id, this.layout);
        this.add.image(0, 0, texKey).setOrigin(0, 0).setDepth(DEPTH.GROUND);

        // Точка спавна
        const spawn = this.layout.spawn ?? this._findSpawnChar();
        const px = spawn.x * this.tilePx + this.tilePx / 2;
        const py = spawn.y * this.tilePx + this.tilePx - 2;

        // Игрок
        this.playerObj = new Player(this, px, py, { speed: 60 });
        this.player    = this.playerObj.sprite;

        this.physics.world.setBounds(0, 0, this.roomW, this.roomH);
        this.player.setCollideWorldBounds(true);

        // Камера — крупнее уличной (массивный, давящий дом)
        this.cameras.main.startFollow(this.player, true, 0.2, 0.2);
        this.cameras.main.setBounds(0, 0, this.roomW, this.roomH);
        this.cameras.main.setZoom(TUNING.house.zoom);
        this.cameras.main.setRoundPixels(true);
        this.cameras.main.setBackgroundColor(P.ALMOST_BLACK);

        // Пропсы по типам комнат + коридор
        this.props = [];
        this._buildProps();

        // Двери
        this.doors = [];
        this._buildDoors();

        // Свет Stardew
        this.light = new LightSystem(this, this.layout, this.tilePx);

        // Заголовок
        this.add.text(this.roomW / 2, 8, this.layout.title ?? 'ДЕТСКИЙ ДОМ', {
            fontFamily: 'monospace',
            fontSize: '10px',
            color: '#fff1a9',
        }).setOrigin(0.5).setDepth(DEPTH.OVERLAY).setScrollFactor(0);

        // Хинт взаимодействия
        this.promptText = this.add.text(0, 0, '', {
            fontFamily: 'monospace', fontSize: '10px',
            color: '#fff1a9', backgroundColor: '#120e23',
            padding: { x: 4, y: 2 },
        }).setOrigin(0.5).setDepth(DEPTH.OVERLAY).setVisible(false);

        // Ввод
        this.inputManager = new InputManager(this);
        this._stepAccum = 0;

        // АУДИО: переключаемся на indoor-эмбиент
        ambience.setIndoor(true);

        this.events.once('shutdown', () => {
            this.inputManager.destroy();
            this.light.destroy();
            for (const d of this.doors) d.destroy();
            ambience.setIndoor(false);
        });
    }


    update() {
        this.inputManager.update();
        const input = this.inputManager.state;

        // Движение + коллизия (стены + закрытые двери)
        this.playerObj.update(input, (x, y) => this._isBlocked(x, y));

        // Шаги (в помещении — indoor-footstep с эхом)
        if (this.playerObj.moving) {
            this._stepAccum += this.game.loop.delta;
            if (this._stepAccum >= 320) { this._stepAccum = 0; ambience.footstep(); }
        } else {
            this._stepAccum = 320;
        }

        // Свет (тёплое свечение за игроком)
        this.light.update(this.player.x, this.player.y);

        // Дверь / выход
        const door = this._nearestDoor();
        const exit = this._nearExit();
        if (door) {
            this.promptText.setVisible(true);
            this.promptText.setText(`E — ${door.closed ? 'открыть' : 'закрыть'} дверь`);
            this.promptText.setPosition(this.player.x, this.player.y - 26);
            if (input.interactPressed) door.toggle();
        } else if (exit) {
            this.promptText.setVisible(true);
            this.promptText.setText(`E — ${exit.label ?? 'выйти'}`);
            this.promptText.setPosition(this.player.x, this.player.y - 26);
            if (input.interactPressed) this._exitToWorld();
        } else {
            this.promptText.setVisible(false);
        }
    }

    // ── Внутреннее ─────────────────────────────────────────────

    _findSpawnChar() {
        const m = this.layout.map;
        for (let y = 0; y < m.length; y++)
            for (let x = 0; x < m[y].length; x++)
                if (m[y][x] === '@') return { x, y };
        for (let y = 0; y < m.length; y++)
            for (let x = 0; x < m[y].length; x++)
                if (!blocksMove(m[y][x])) return { x, y };
        return { x: 1, y: 1 };
    }

    _isBlocked(wx, wy) {
        const tx = Math.floor(wx / this.tilePx);
        const ty = Math.floor(wy / this.tilePx);
        if (blocksMove(this.layout.map[ty]?.[tx])) return true;
        const door = this._doorAt(tx, ty);
        return door ? door.closed : false;
    }

    _doorAt(tx, ty) {
        for (const d of this.doors) if (d.tx === tx && d.ty === ty) return d;
        return null;
    }

    _nearestDoor() {
        let best = null, bestD = 1.6 * 1.6;
        for (const d of this.doors) {
            const dx = this.player.x / this.tilePx - (d.tx + 0.5);
            const dy = this.player.y / this.tilePx - (d.ty + 0.5);
            const d2 = dx * dx + dy * dy;
            if (d2 < bestD) { bestD = d2; best = d; }
        }
        return best;
    }

    _buildDoors() {
        for (const room of this.layout.rooms ?? []) {
            if (!room.doorTile) continue;
            this.doors.push(new Door(this, room.doorTile.tx, room.doorTile.ty, room.orientation, this.tilePx));
        }
    }

    _buildProps() {
        const map = this.layout.map;
        for (const room of this.layout.rooms ?? []) {
            for (const p of placeRoom(room, map)) this._spawnProp(p);
        }
        for (const p of placeCorridor(this.layout.corridor)) this._spawnProp(p);
    }

    _spawnProp(p) {
        const key = `prop_${p.key}`;
        if (!this.textures.exists(key)) return;
        const s = propSize(p.key);
        const flat = p.key === 'rug' || p.key === 'rug_runner';
        const wx = (p.tx + s.w / 2) * this.tilePx;
        const wy = (p.ty + s.h) * this.tilePx;
        const sprite = this.add.image(wx, wy, key);
        sprite.setOrigin(0.5, 1);
        sprite.setDepth(flat ? DEPTH.GROUND + 1 : DEPTH.ENTITIES + wy);
        this.props.push({ sprite, tx: p.tx, ty: p.ty });
    }

    _nearExit() {
        const ptx = this.player.x / this.tilePx;
        const pty = this.player.y / this.tilePx;
        const R2 = 1.4 * 1.4;
        for (const e of this.layout.exits ?? []) {
            const dx = ptx - (e.x + 0.5);
            const dy = pty - (e.y + 0.5);
            if (dx * dx + dy * dy < R2) return e;
        }
        return null;
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