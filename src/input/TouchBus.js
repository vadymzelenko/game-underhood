/**
 * Мост между TouchControlsScene (UI) и InputManager (геймплей).
 * Модульный singleton — одна копия на всё приложение.
 *
 * UI-сцена пишет сюда состояние стика и кнопок.
 * Каждая геймплейная сцена читает и **потребляет** edge-события.
 */
export const TouchBus = {
    // Движение: -1..1 по обеим осям
    moveX: 0,
    moveY: 0,

    // Кнопки (edge — потребляются один раз за кадр)
    interactPressed: false,
    interactHeld: false,
    pausePressed: false,

    // Отключён ли UI на этом устройстве
    enabled: false,

    resetEdges() {
        this.interactPressed = false;
        this.pausePressed = false;
    },
};