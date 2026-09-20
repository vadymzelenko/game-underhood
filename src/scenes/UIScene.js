export class UIScene extends Phaser.Scene {
    constructor() { super('UIScene'); }

    create() {
        this.info = this.add.text(8, 8, '', {
            fontFamily: 'monospace',
            fontSize: '12px',
            color: '#fff1a9',
            backgroundColor: '#120e2399',
            padding: { x: 6, y: 4 },
        }).setScrollFactor(0).setDepth(1000);

        this.hint = this.add.text(8, 0, 'WASD — движение · E — взаимодействие', {
            fontFamily: 'monospace',
            fontSize: '11px',
            color: '#aea47e',
            backgroundColor: '#120e2399',
            padding: { x: 6, y: 4 },
        }).setScrollFactor(0).setDepth(1000);

        const place = (size) => this.hint.setPosition(8, size.height - 28);
        place(this.scale.gameSize);
        this.scale.on('resize', place);
    }

    update() {
        const world = this.scene.get('WorldScene');
        if (world?.player && this.scene.isActive('WorldScene')) {
            this.info.setText(
                `X ${Math.round(world.player.x)}  Y ${Math.round(world.player.y)}`
            );
        }
    }
}