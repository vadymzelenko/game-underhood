export class KeyboardSource {
    constructor(scene) {
        this.scene = scene;

        this.cursors = scene.input.keyboard.createCursorKeys();
        this.keys = scene.input.keyboard.addKeys({
            up: 'W', down: 'S', left: 'A', right: 'D',
            interact: 'E', pause: 'ESC',
        });

        this.state = {
            moveX: 0, moveY: 0,
            interactPressed: false, interactHeld: false,
            pausePressed: false,
        };
    }

    poll() {
        const c = this.cursors, k = this.keys;

        let mx = 0, my = 0;
        if (c.left.isDown  || k.left.isDown)  mx -= 1;
        if (c.right.isDown || k.right.isDown) mx += 1;
        if (c.up.isDown    || k.up.isDown)    my -= 1;
        if (c.down.isDown  || k.down.isDown)  my += 1;

        this.state.moveX = mx;
        this.state.moveY = my;
        this.state.interactPressed = Phaser.Input.Keyboard.JustDown(k.interact);
        this.state.interactHeld = k.interact.isDown;
        this.state.pausePressed = Phaser.Input.Keyboard.JustDown(k.pause);
    }

    destroy() {
        // Клавиши автоматически удаляются вместе со сценой — ничего не делаем.
    }
}