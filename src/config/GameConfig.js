export function buildGameConfig(scenes) {
    return {
        type: Phaser.AUTO,
        parent: 'game',
        backgroundColor: '#120e23',
        pixelArt: true,
        antialias: false,
        roundPixels: true,

        physics: {
            default: 'arcade',
            arcade: { gravity: { x: 0, y: 0 }, debug: false },
        },

        // ★ Ввод
        input: {
            keyboard: true,
            mouse: true,
            touch: true,
            gamepad: true,
            activePointers: 3,        // мультитач: стик + 2 кнопки
            smoothFactor: 0.2,        // сглаживание движения мыши
        },

        scale: {
            mode: Phaser.Scale.RESIZE,
            autoCenter: Phaser.Scale.CENTER_BOTH,
            width: window.innerWidth,
            height: window.innerHeight,
        },

        render: { powerPreference: 'high-performance' },
        scene: scenes,
    };
}