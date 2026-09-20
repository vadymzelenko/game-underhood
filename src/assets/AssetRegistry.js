import {
    makeOakTree, makePineTree, makeSpruceTree, makeBirchTree, makeDeadTree,
    makeFern, makeBush, makeFlower, makeMushroom, makeStump,
    makePebbles, makeMoss, makeRock, makeFormation, makeLog,
    makeShadowSoft, makePlayerSheet, makeGrassTuft, applyScale,
} from './ProceduralAssets.js';
import { TUNING } from '../config/TuningConfig.js';

// ─────────────────────────────────────────────────────────────
//  Резолвер масштаба. Приоритет:
//    1) def.scale       (индивидуальный)
//    2) groupCfg.scale  (групповой: trees.scale / decor.scale)
//    3) 1.0             (фолбэк)
//  Всё умножается на TUNING.globalScale.
// ─────────────────────────────────────────────────────────────
function resolveScale(def, groupCfg) {
    const item  = def?.scale;
    const group = groupCfg?.scale;
    const local = item ?? group ?? 1.0;
    return local * (TUNING.globalScale ?? 1.0);
}

const V = TUNING.assetVariants;
const G = TUNING.grass.scale * (TUNING.globalScale ?? 1.0);

function variants(prefix, count, baseSeed, factory) {
    const out = {};
    for (let i = 0; i < count; i++) {
        const seed = baseSeed + i * 37;
        out[`${prefix}_${i}`] = { procedure: () => factory(seed) };
    }
    return out;
}

export const ASSET_REGISTRY = {
    images: {
        // ── ДЕРЕВЬЯ ─────────────────────────────────────────
        ...variants('tree_oak', V.oak, 101, (s) => applyScale(
            makeOakTree(s, TUNING.trees.oak.size),
            resolveScale(TUNING.trees.oak, TUNING.trees),
        )),
        ...variants('tree_pine', V.pine, 201, (s) => applyScale(
            makePineTree(s, TUNING.trees.pine.size),
            resolveScale(TUNING.trees.pine, TUNING.trees),
        )),
        ...variants('tree_pine2', V.pine2, 211, (s) => applyScale(
            makePineTree(s, TUNING.trees.pine2.size),
            resolveScale(TUNING.trees.pine2, TUNING.trees),
        )),
        ...variants('tree_spruce', V.spruce, 301, (s) => applyScale(
            makeSpruceTree(s, TUNING.trees.spruce.size),
            resolveScale(TUNING.trees.spruce, TUNING.trees),
        )),
        ...variants('tree_birch', V.birch, 401, (s) => applyScale(
            makeBirchTree(s, TUNING.trees.birch.size),
            resolveScale(TUNING.trees.birch, TUNING.trees),
        )),
        ...variants('tree_birch2', V.birch2, 411, (s) => applyScale(
            makeBirchTree(s, TUNING.trees.birch2.size),
            resolveScale(TUNING.trees.birch2, TUNING.trees),
        )),
        ...variants('tree_dead', V.dead, 501, (s) => applyScale(
            makeDeadTree(s, TUNING.trees.dead.size),
            resolveScale(TUNING.trees.dead, TUNING.trees),
        )),
        ...variants('tree_dead2', V.dead2, 511, (s) => applyScale(
            makeDeadTree(s, TUNING.trees.dead2.size),
            resolveScale(TUNING.trees.dead2, TUNING.trees),
        )),

        // ── ПАПОРОТНИКИ ─────────────────────────────────────
        ...variants('fern_0', V.fern, 601, (s) => applyScale(
            makeFern(s, 'medium', 'green'),
            resolveScale(TUNING.decor.fern, TUNING.decor),
        )),
        ...variants('fern_1', V.fern, 611, (s) => applyScale(
            makeFern(s, 'small', 'berry'),
            resolveScale(TUNING.decor.fern, TUNING.decor),
        )),

        // ── КУСТЫ ───────────────────────────────────────────
        ...variants('bush_green', V.bush, 1401, (s) => applyScale(
            makeBush(s, 'medium', 'green'),
            resolveScale(TUNING.decor.bush, TUNING.decor),
        )),
        ...variants('bush_berry', V.bush, 1411, (s) => applyScale(
            makeBush(s, 'medium', 'berry'),
            resolveScale(TUNING.decor.bush, TUNING.decor),
        )),
        ...variants('bush_dark', V.bush, 1421, (s) => applyScale(
            makeBush(s, 'large', 'dark'),
            resolveScale(TUNING.decor.bush, TUNING.decor),
        )),
        ...variants('bush_autumn', V.bush, 1431, (s) => applyScale(
            makeBush(s, 'medium', 'autumn'),
            resolveScale(TUNING.decor.bush, TUNING.decor),
        )),

        // ── ЦВЕТЫ ───────────────────────────────────────────
        ...variants('flower_daisy', V.flower, 1501, (s) => applyScale(
            makeFlower(s, 'medium', 'daisy'),
            resolveScale(TUNING.decor.flower, TUNING.decor),
        )),
        ...variants('flower_poppy', V.flower, 1511, (s) => applyScale(
            makeFlower(s, 'medium', 'poppy'),
            resolveScale(TUNING.decor.flower, TUNING.decor),
        )),
        ...variants('flower_cornflower', V.flower, 1521, (s) => applyScale(
            makeFlower(s, 'medium', 'cornflower'),
            resolveScale(TUNING.decor.flower, TUNING.decor),
        )),
        ...variants('flower_pink', V.flower, 1531, (s) => applyScale(
            makeFlower(s, 'medium', 'pink'),
            resolveScale(TUNING.decor.flower, TUNING.decor),
        )),
        ...variants('flower_bell', V.flower, 1541, (s) => applyScale(
            makeFlower(s, 'large', 'bell'),
            resolveScale(TUNING.decor.flower, TUNING.decor),
        )),
        ...variants('flower_spike', V.flower, 1551, (s) => applyScale(
            makeFlower(s, 'medium', 'spike'),
            resolveScale(TUNING.decor.flower, TUNING.decor),
        )),

        // ── ГРИБЫ ───────────────────────────────────────────
        ...variants('mushroom_boletus', V.mushroom, 1601, (s) => applyScale(
            makeMushroom(s, 'medium', 'boletus'),
            resolveScale(TUNING.decor.mushroom, TUNING.decor),
        )),
        ...variants('mushroom_amanita', V.mushroom, 1611, (s) => applyScale(
            makeMushroom(s, 'medium', 'amanita'),
            resolveScale(TUNING.decor.mushroom, TUNING.decor),
        )),
        ...variants('mushroom_toadstool', V.mushroom, 1621, (s) => applyScale(
            makeMushroom(s, 'medium', 'toadstool'),
            resolveScale(TUNING.decor.mushroom, TUNING.decor),
        )),
        ...variants('mushroom_cluster', V.mushroom, 1631, (s) => applyScale(
            makeMushroom(s, 'large', 'cluster'),
            resolveScale(TUNING.decor.mushroom, TUNING.decor),
        )),

        // ── ПНИ ─────────────────────────────────────────────
        ...variants('stump_plain', V.stump, 1701, (s) => applyScale(
            makeStump(s, 'medium', 'plain'),
            resolveScale(TUNING.decor.stump, TUNING.decor),
        )),
        ...variants('stump_mossy', V.stump, 1711, (s) => applyScale(
            makeStump(s, 'medium', 'mossy'),
            resolveScale(TUNING.decor.stump, TUNING.decor),
        )),
        ...variants('stump_sprout', V.stump, 1721, (s) => applyScale(
            makeStump(s, 'medium', 'sprout'),
            resolveScale(TUNING.decor.stump, TUNING.decor),
        )),
        ...variants('stump_mushrooms', V.stump, 1731, (s) => applyScale(
            makeStump(s, 'large', 'mushrooms'),
            resolveScale(TUNING.decor.stump, TUNING.decor),
        )),

        // ── КАМНИ ───────────────────────────────────────────
        ...variants('rock_0', V.rockPebble, 701, (s) => applyScale(
            makeRock(s, 'pebble'),
            resolveScale(TUNING.decor.rock, TUNING.decor),
        )),
        ...variants('rock_1', V.rockSmall, 711, (s) => applyScale(
            makeRock(s, 'small'),
            resolveScale(TUNING.decor.rock, TUNING.decor),
        )),
        ...variants('rock_2', V.rockMedium, 721, (s) => applyScale(
            makeRock(s, 'medium'),
            resolveScale(TUNING.decor.rock, TUNING.decor),
        )),
        ...variants('rock_3', V.rockBoulder, 731, (s) => applyScale(
            makeRock(s, 'boulder'),
            resolveScale(TUNING.decor.rock, TUNING.decor),
        )),

        // ── ГАЛЬКА ──────────────────────────────────────────
        ...variants('pebble_scatter', V.pebble, 1801, (s) => applyScale(
            makePebbles(s, 'medium', 'scatter'),
            resolveScale(TUNING.decor.pebble, TUNING.decor),
        )),
        ...variants('pebble_cluster', V.pebble, 1811, (s) => applyScale(
            makePebbles(s, 'large', 'cluster'),
            resolveScale(TUNING.decor.pebble, TUNING.decor),
        )),
        ...variants('pebble_single', V.pebble, 1821, (s) => applyScale(
            makePebbles(s, 'medium', 'single'),
            resolveScale(TUNING.decor.pebble, TUNING.decor),
        )),

        // ── МОХ ─────────────────────────────────────────────
        ...variants('moss_flat', V.moss, 1901, (s) => applyScale(
            makeMoss(s, 'medium', 'flat'),
            resolveScale(TUNING.decor.moss, TUNING.decor),
        )),
        ...variants('moss_mound', V.moss, 1911, (s) => applyScale(
            makeMoss(s, 'medium', 'mound'),
            resolveScale(TUNING.decor.moss, TUNING.decor),
        )),

        // ── ФОРМАЦИИ ────────────────────────────────────────
        ...variants('formation_outcrop', V.formation, 2001, (s) => applyScale(
            makeFormation(s, 'outcrop'),
            resolveScale(TUNING.decor.formation, TUNING.decor),
        )),
        ...variants('formation_ridge', V.formation, 2011, (s) => applyScale(
            makeFormation(s, 'ridge'),
            resolveScale(TUNING.decor.formation, TUNING.decor),
        )),
        ...variants('formation_peak', V.formation, 2021, (s) => applyScale(
            makeFormation(s, 'peak'),
            resolveScale(TUNING.decor.formation, TUNING.decor),
        )),
        ...variants('formation_mountain', V.formation, 2031, (s) => applyScale(
            makeFormation(s, 'mountain'),
            resolveScale(TUNING.decor.formation, TUNING.decor),
        )),
        ...variants('formation_plateau', V.formation, 2041, (s) => applyScale(
            makeFormation(s, 'plateau'),
            resolveScale(TUNING.decor.formation, TUNING.decor),
        )),

        // ── БРЁВНА ──────────────────────────────────────────
        ...variants('log_0', V.log, 801, (s) => applyScale(
            makeLog(s, 'small', 'thin'),
            resolveScale(TUNING.decor.log, TUNING.decor),
        )),
        ...variants('log_1', V.log, 811, (s) => applyScale(
            makeLog(s, 'medium', 'branchy'),
            resolveScale(TUNING.decor.log, TUNING.decor),
        )),
        ...variants('log_2', V.log, 821, (s) => applyScale(
            makeLog(s, 'medium', 'broken'),
            resolveScale(TUNING.decor.log, TUNING.decor),
        )),
        ...variants('log_3', V.log, 831, (s) => applyScale(
            makeLog(s, 'large', 'rooted'),
            resolveScale(TUNING.decor.log, TUNING.decor),
        )),

        // ── ТРАВА ───────────────────────────────────────────
        ...variants('grass', V.grass, 901, (s) => applyScale(
            makeGrassTuft(s, 0),
            G,
        )),

        shadow_soft: { procedure: () => makeShadowSoft(64, 20) },
    },

    spritesheets: {
        player: {
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