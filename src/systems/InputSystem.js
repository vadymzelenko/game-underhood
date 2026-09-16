export class InputSystem {
    constructor(scene) {
        this.cursors = scene.input.keyboard.createCursorKeys();
        this.keys = scene.input.keyboard.addKeys({
            up: 'W', down: 'S', left: 'A', right: 'D',
            interact: 'E',
        });

        this.state = {
            up: false, down: false, left: false, right: false,
            interactPressed: false,
        };
    }

    update() {
        const c = this.cursors, k = this.keys;
        this.state.up    = c.up.isDown    || k.up.isDown;
        this.state.down  = c.down.isDown  || k.down.isDown;
        this.state.left  = c.left.isDown  || k.left.isDown;
        this.state.right = c.right.isDown || k.right.isDown;

        this.state.interactPressed =
            Phaser.Input.Keyboard.JustDown(k.interact);
    }
}