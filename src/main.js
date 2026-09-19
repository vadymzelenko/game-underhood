import { buildGameConfig } from './config/GameConfig.js';
import { BootScene }      from './scenes/BootScene.js';
import { PreloadScene }   from './scenes/PreloadScene.js';
import { WorldScene }     from './scenes/WorldScene.js';
import { InteriorScene }  from './scenes/InteriorScene.js';
import { UIScene }        from './scenes/UIScene.js';
import { TouchControlsScene } from './input/ui/TouchControlsScene.js';

window.addEventListener('load', () => {
    window.game = new Phaser.Game(buildGameConfig([
        BootScene, PreloadScene, WorldScene, InteriorScene, UIScene,
        TouchControlsScene,
    ]));
});