import {
    makeOakTree, makePineTree, makeSpruceTree, makeBirchTree, makeDeadTree,
    makeFern, makeRock, makeLog, makeShadowSoft, makePlayerSheet,
    applyScale,
} from './ProceduralAssets.js';
import { TUNING } from '../config/TuningConfig.js';

const S = TUNING.trees.scale;

export const ASSET_REGISTRY = {
    images: {
        // Деревья — все канвасы увеличиваются через applyScale
        tree_oak_0:    { procedure: () => applyScale(makeOakTree(101, TUNING.trees.oak.size),    S) },
        tree_pine_0:   { procedure: () => applyScale(makePineTree(201, TUNING.trees.pine.size),  S) },
        tree_pine_1:   { procedure: () => applyScale(makePineTree(202, TUNING.trees.pine2.size), S) },
        tree_spruce_0: { procedure: () => applyScale(makeSpruceTree(301, TUNING.trees.spruce.size), S) },
        tree_birch_0:  { procedure: () => applyScale(makeBirchTree(401, TUNING.trees.birch.size), S) },
        tree_birch_1:  { procedure: () => applyScale(makeBirchTree(402, TUNING.trees.birch2.size), S) },
        tree_dead_0:   { procedure: () => applyScale(makeDeadTree(501, TUNING.trees.dead.size),  S) },
        tree_dead_1:   { procedure: () => applyScale(makeDeadTree(502, TUNING.trees.dead2.size), S) },

        // Декор
        fern_0: { procedure: () => applyScale(makeFern(601, 'medium', 'green'), TUNING.decor.scale) },
        fern_1: { procedure: () => applyScale(makeFern(602, 'small',  'berry'), TUNING.decor.scale) },
        rock_0: { procedure: () => applyScale(makeRock(701, 'pebble'), TUNING.decor.scale) },
        rock_1: { procedure: () => applyScale(makeRock(702, 'small'),  TUNING.decor.scale) },
        rock_2: { procedure: () => applyScale(makeRock(703, 'medium'), TUNING.decor.scale) },
        rock_3: { procedure: () => applyScale(makeRock(704, 'boulder'), TUNING.decor.scale) },

        // Валежник
        log_0: { procedure: () => applyScale(makeLog(801, 'small',  'thin'),     TUNING.decor.scale) },
        log_1: { procedure: () => applyScale(makeLog(802, 'medium', 'branchy'),  TUNING.decor.scale) },
        log_2: { procedure: () => applyScale(makeLog(803, 'medium', 'broken'),   TUNING.decor.scale) },
        log_3: { procedure: () => applyScale(makeLog(804, 'large',  'rooted'),   TUNING.decor.scale) },

        // Тень — большая, сплюснутая
        shadow_soft: { procedure: () => makeShadowSoft(64, 20) },
    },

    spritesheets: {
        player: {
            path: 'assets/characters/player.png',
            frameWidth: 16,
            frameHeight: 24,
            procedure: () => makePlayerSheet(16, 24),
        },
    },

    characters: {
        player: {
            texture: 'player',
            directions: ['down', 'up', 'left', 'right'],
            walkFramesPerDirection: 4,
            idleFrame: 0,
            walkRate: 8,
            idleRate: 1,
        },
    },
};