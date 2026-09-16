import { DEPTH, PALETTE as P, BUILDING_BOUNDS } from '../utils/Constants.js';

export class Building {
    constructor(scene, name = 'Детский дом') {
        this.scene = scene;
        this.name  = name;

        // Координаты и размеры берём из единого источника
        this.x = BUILDING_BOUNDS.x;
        this.y = BUILDING_BOUNDS.y;
        this.w = BUILDING_BOUNDS.w;
        this.h = BUILDING_BOUNDS.h;

        this.graphics = scene.add.graphics();
        this.graphics.setDepth(DEPTH.BUILDING);

        this.draw();

        // Статическая коллизия
        const zone = scene.add.zone(
            this.x + this.w / 2,
            this.y + this.h / 2,
            this.w, this.h,
        );
        scene.physics.add.existing(zone, true);
        this.body = zone;

        // Точка «входа»
        this.doorX = this.x + this.w / 2;
        this.doorY = this.y + this.h + 8;
        this.doorRadius = 40;
    }

    draw() {
        const { x, y, w, h } = this;
        const g = this.graphics;

        // Тень здания
        g.fillStyle(P.ALMOST_BLACK, 0.35);
        g.fillRect(x + 6, y + 8, w, h);

        // Стены — базовый BROWN
        g.fillStyle(P.BROWN, 1);
        g.fillRect(x, y, w, h);

        // Правый и нижний край — темнее
        g.fillStyle(P.DARK_BROWN, 1);
        g.fillRect(x + w - 6, y, 6, h);
        g.fillRect(x, y + h - 6, w, 6);

        // Левый и верхний — светлее
        g.fillStyle(P.GOLD, 1);
        g.fillRect(x, y, w, 4);
        g.fillRect(x, y, 4, h);

        // Крыша (красная полоса сверху)
        g.fillStyle(P.DARK_RED, 1);
        g.fillRect(x - 4, y - 18, w + 8, 22);
        g.fillStyle(P.RED, 1);
        g.fillRect(x - 4, y - 18, w + 8, 6);
        g.fillStyle(P.ALMOST_BLACK, 1);
        g.fillRect(x - 4, y + 2, w + 8, 2);

        // Окна: 4 этажа × 6 колонок
        const winCols = 6, winRows = 4;
        const padX = 26, padY = 26;
        const cellW = (w - padX * 2) / winCols;
        const cellH = (h - padY * 2) / winRows;

        for (let r = 0; r < winRows; r++) {
            for (let c = 0; c < winCols; c++) {
                const wx = Math.floor(x + padX + c * cellW + cellW * 0.20);
                const wy = Math.floor(y + padY + r * cellH + cellH * 0.20);
                const ww = Math.floor(cellW * 0.60);
                const wh = Math.floor(cellH * 0.60);

                // Рама
                g.fillStyle(P.VERY_DARK, 1);
                g.fillRect(wx - 2, wy - 2, ww + 4, wh + 4);
                // Стекло
                g.fillStyle(P.DARK_TEAL, 1);
                g.fillRect(wx, wy, ww, wh);
                // Отблеск
                g.fillStyle(P.TEAL, 1);
                g.fillRect(wx + 2, wy + 2, Math.max(2, Math.floor(ww / 2) - 2), 2);
            }
        }

        // Вход
        const dw = 34, dh = 42;
        const dx = Math.floor(x + w / 2 - dw / 2);
        const dy = Math.floor(y + h - dh);

        // Рама двери
        g.fillStyle(P.VERY_DARK, 1);
        g.fillRect(dx - 3, dy - 3, dw + 6, dh + 3);
        // Дверь
        g.fillStyle(P.DARK_BROWN, 1);
        g.fillRect(dx, dy, dw, dh);
        // Филёнка
        g.fillStyle(P.BROWN, 1);
        g.fillRect(dx + 4, dy + 4, dw - 8, dh - 8);
        // Ручка
        g.fillStyle(P.CREAM, 1);
        g.fillRect(dx + dw - 8, dy + Math.floor(dh / 2) - 2, 3, 4);

        // Козырёк над дверью
        g.fillStyle(P.DARK_RED, 1);
        g.fillRect(dx - 10, dy - 12, dw + 20, 8);
        g.fillStyle(P.RED, 1);
        g.fillRect(dx - 10, dy - 12, dw + 20, 3);

        // Вывеска сверху
        const sw = 90, sh = 16;
        const sx = Math.floor(x + w / 2 - sw / 2);
        const sy = y + 10;

        g.fillStyle(P.CREAM, 1);
        g.fillRect(sx, sy, sw, sh);
        g.fillStyle(P.VERY_DARK, 1);
        g.fillRect(sx, sy, sw, 2);
        g.fillRect(sx, sy + sh - 2, sw, 2);
        g.fillRect(sx, sy, 2, sh);
        g.fillRect(sx + sw - 2, sy, 2, sh);
        // «текст» — палочки
        g.fillStyle(P.DARK_RED, 1);
        for (let i = 0; i < 5; i++) {
            g.fillRect(sx + 8 + i * 16, sy + 6, 10, 4);
        }
    }

    isPlayerNear(px, py) {
        return Math.hypot(px - this.doorX, py - this.doorY) < this.doorRadius;
    }

    destroy() {
        this.graphics.destroy();
        this.body.destroy();
    }
}