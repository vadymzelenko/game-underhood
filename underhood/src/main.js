import { buildGameConfig } from './config/GameConfig.js';
import { BootScene }      from './scenes/BootScene.js';
import { PreloadScene }   from './scenes/PreloadScene.js';
import { WorldScene }     from './scenes/WorldScene.js';
import { HouseScene }     from './locations/house/HouseScene.js';   // ★
import { UIScene }        from './scenes/UIScene.js';
import { TouchControlsScene } from './input/ui/TouchControlsScene.js';

window.addEventListener('load', () => {
    window.game = new Phaser.Game(buildGameConfig([
        BootScene, PreloadScene, WorldScene,
        HouseScene,                       // ★ вместо InteriorScene
        UIScene,
        TouchControlsScene,
    ]));
});