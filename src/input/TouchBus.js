/**
 * Общий буфер между TouchControlsScene (пишет) и TouchSource (читает).
 * Однокадровые флаги (interactPressed / pausePressed) — latched:
 * TouchControlsScene выставляет true при just-pressed,
 * TouchSource читает и сбрасывает в false.
 */
export const TouchBus = {
    enabled: false,

    moveX: 0,
    moveY: 0,

    interactHeld: false,

    interactPressed: false,
    pausePressed: false,

    reset() {
        this.moveX = 0;
        this.moveY = 0;
        this.interactHeld = false;
        this.interactPressed = false;
        this.pausePressed = false;
    },
};
