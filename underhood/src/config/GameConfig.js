// GameConfig.js — bootstrap-конфиг Phaser.Game.
//
// Здесь только параметры движка/канваса (тип рендера, базовый размер,
// физика, ввод). Все игровые настройки (тайминги, плотности, скорости,
// цвета) — в TuningConfig.js (TUNING), константы мира — в utils/Constants.js.

export const BASE_WIDTH  = 640;
export const BASE_HEIGHT = 360;

export function buildGameConfig(scenes) {
    return {
        type: Phaser.AUTO,
        parent: 'game',
        backgroundColor: '#120e23',
        pixelArt: true,
        roundPixels: true,
        scale: {
            mode: Phaser.Scale.RESIZE,
            autoCenter: Phaser.Scale.CENTER_BOTH,
            width: BASE_WIDTH,
            height: BASE_HEIGHT,
        },
        physics: {
            default: 'arcade',
            arcade: { gravity: { y: 0 }, debug: false },
        },
        input: { gamepad: true, activePointers: 3 },
        scene: scenes,
    };
}