import {
    CHUNK_PX, BIOME, DEPTH,
} from '../utils/Constants.js';
import { hash2D } from '../utils/MathUtils.js';
import { JitteredSampler } from './JitteredSampler.js';
import { TUNING } from '../config/TuningConfig.js';
import { AnimalSprite } from '../animals/AnimalSprite.js';
import { ambience } from '../systems/AmbientAudio.js';
import { collectWindFrames } from './WindSystem.js';

// ★ Убрали BUILDING_CLEARING — он больше не экспортируется.
//   Хелперы сами знают padding каждого здания.
import {
    isInsideAnyBuilding,
    isInsideAnyAnimalZone,
} from '../config/BuildingsConfig.js';

const TREE_DENSE_SALT  = 0x1111;
const TREE_SPARSE_SALT = 0x2222;
const DECOR_SALT       = 0x3333;
const GRASS_SALT       = 0x4444;
const BUSH_SALT        = 0x5555;
const FLOWER_SALT      = 0x6666;
const MUSHROOM_SALT    = 0x7777;
const STUMP_SALT       = 0x8888;
const PEBBLE_SALT      = 0x9999;
const MOSS_SALT        = 0xAAAA;
const FORMATION_SALT   = 0xBBBB;

// ★ Убрали ANIMAL_BUILDING_PAD — не используется.
//   Зона животных теперь в BuildingsConfig (animalPad).

const MAX_ANIMALS_PER_CHUNK = 2;

export class Chunk {
    constructor(scene, cx, cy, biomeGen, pixelRenderer, obstaclesGroup, windSystem = null) {
        this.scene = scene;
        this.cx = cx; this.cy = cy;
        this.biomeGen = biomeGen;
        this.pixelRenderer = pixelRenderer;
        this.obstaclesGroup = obstaclesGroup;
        this.windSystem = windSystem;
        this.texKey = null;
        this.sprite = null;
        this.objects = [];
        this.obstacles = [];
        this.animals = [];
        this.vegItems = [];
        // ★ Флаг: спавнили ли уже животных в этом чанке (ровно один раз за жизнь чанка).
        this.animalsSpawned = false;
    }

    _pickVariant(baseKey, count, wx, wy, salt) {
        const r = hash2D(Math.round(wx), Math.round(wy), salt);
        const idx = Math.min(count - 1, Math.floor(r * count));
        return `${baseKey}_${idx}`;
    }

    generate() {
        this.texKey = this.pixelRenderer.render(this.scene, this.cx, this.cy);
        const ox = this.cx * CHUNK_PX;
        const oy = this.cy * CHUNK_PX;
        this.sprite = this.scene.add.image(ox, oy, this.texKey)
            .setOrigin(0, 0)
            .setDepth(DEPTH.GROUND);
    }

    render(opts = {}) {
        const ox = this.cx * CHUNK_PX;
        const oy = this.cy * CHUNK_PX;
        const maxX = ox + CHUNK_PX;
        const maxY = oy + CHUNK_PX;
        const D = TUNING.density;

        const dense = new JitteredSampler(28, 0xBEEF).sample(ox, oy, maxX, maxY,
            (x, y) => {
                if (this._insideBuildingZone(x, y)) return 0;
                if (this.biomeGen.getPath(x, y) > 0.35) return 0;
                const b = this.biomeGen.getBiome(x, y);
                if (b !== BIOME.PINE && b !== BIOME.BIRCH &&
                    b !== BIOME.SWAMP && b !== BIOME.GRASS) return 0;
                const base = b === BIOME.GRASS
                    ? this.biomeGen.getTreeDensity(x, y) * 0.20
                    : this.biomeGen.getTreeDensity(x, y);
                return base * D.treeMultiplier;
            }, TREE_DENSE_SALT);

        const sparse = new JitteredSampler(78, 0xCAFE).sample(ox, oy, maxX, maxY,
            (x, y) => {
                if (this._insideBuildingZone(x, y)) return 0;
                if (this.biomeGen.getPath(x, y) > 0.35) return 0;
                if (this.biomeGen.getBiome(x, y) !== BIOME.OAK) return 0;
                return this.biomeGen.getTreeDensity(x, y) * D.treeMultiplier;
            }, TREE_SPARSE_SALT);

        const decor = new JitteredSampler(44, 0xFACE).sample(ox, oy, maxX, maxY,
            (x, y) => {
                if (this._insideBuildingZone(x, y)) return 0;
                if (this.biomeGen.getPath(x, y) > 0.35) return 0;
                return this.biomeGen.getDecorDensity(x, y) * D.decorMultiplier;
            }, DECOR_SALT);

        let grass = [];
        if (TUNING.grass.enabled) {
            grass = new JitteredSampler(TUNING.grass.cellSize, 0x6A55).sample(ox, oy, maxX, maxY,
                (x, y) => {
                    if (this._insideBuildingZone(x, y)) return 0;
                    if (this.biomeGen.getPath(x, y) > 0.35) return 0;
                    const b = this.biomeGen.getBiome(x, y);
                    return TUNING.grass.probability[b] ?? 0;
                }, GRASS_SALT);
        }

        const bushes = new JitteredSampler(56, 0xB055).sample(ox, oy, maxX, maxY,
            (x, y) => {
                if (this._insideBuildingZone(x, y)) return 0;
                if (this.biomeGen.getPath(x, y) > 0.4) return 0;
                const b = this.biomeGen.getBiome(x, y);
                if (b !== BIOME.GRASS && b !== BIOME.OAK &&
                    b !== BIOME.BIRCH && b !== BIOME.PINE) return 0;
                return D.bushMultiplier;
            }, BUSH_SALT);

        const flowers = new JitteredSampler(24, 0xF107).sample(ox, oy, maxX, maxY,
            (x, y) => {
                if (this._insideBuildingZone(x, y)) return 0;
                if (this.biomeGen.getPath(x, y) > 0.35) return 0;
                const b = this.biomeGen.getBiome(x, y);
                if (b !== BIOME.GRASS && b !== BIOME.BIRCH && b !== BIOME.OAK) return 0;
                return D.flowerMultiplier;
            }, FLOWER_SALT);

        const mushrooms = new JitteredSampler(70, 0x4011).sample(ox, oy, maxX, maxY,
            (x, y) => {
                if (this._insideBuildingZone(x, y)) return 0;
                if (this.biomeGen.getPath(x, y) > 0.35) return 0;
                const b = this.biomeGen.getBiome(x, y);
                if (b !== BIOME.OAK && b !== BIOME.BIRCH && b !== BIOME.PINE) return 0;
                return D.mushroomMultiplier;
            }, MUSHROOM_SALT);

        const stumps = new JitteredSampler(96, 0x5771).sample(ox, oy, maxX, maxY,
            (x, y) => {
                if (this._insideBuildingZone(x, y)) return 0;
                if (this.biomeGen.getPath(x, y) > 0.35) return 0;
                const b = this.biomeGen.getBiome(x, y);
                if (b !== BIOME.OAK && b !== BIOME.PINE && b !== BIOME.BIRCH) return 0;
                return D.stumpMultiplier;
            }, STUMP_SALT);

        const pebbles = new JitteredSampler(40, 0x9E11).sample(ox, oy, maxX, maxY,
            (x, y) => {
                if (this._insideBuildingZone(x, y)) return 0;
                if (this.biomeGen.getPath(x, y) > 0.35) return 0;
                return D.pebbleMultiplier;
            }, PEBBLE_SALT);

        const moss = new JitteredSampler(60, 0x11AA).sample(ox, oy, maxX, maxY,
            (x, y) => {
                if (this._insideBuildingZone(x, y)) return 0;
                if (this.biomeGen.getPath(x, y) > 0.35) return 0;
                const b = this.biomeGen.getBiome(x, y);
                if (b !== BIOME.OAK && b !== BIOME.SWAMP && b !== BIOME.PINE) return 0;
                return D.mossMultiplier;
            }, MOSS_SALT);

        const formations = new JitteredSampler(200, 0xF0A1).sample(ox, oy, maxX, maxY,
            (x, y) => {
                if (this._insideBuildingZone(x, y)) return 0;
                if (this.biomeGen.getPath(x, y) > 0.35) return 0;
                const b = this.biomeGen.getBiome(x, y);
                if (b !== BIOME.PINE && b !== BIOME.SAND) return 0;
                return D.formationMultiplier;
            }, FORMATION_SALT);

        for (const p of dense)      this._placeTree(p.x, p.y);
        for (const p of sparse)     this._placeTree(p.x, p.y);
        for (const p of decor)      this._placeDecor(p.x, p.y);
        for (const p of bushes)     this._placeBush(p.x, p.y);
        for (const p of flowers)    this._placeFlower(p.x, p.y);
        for (const p of mushrooms)  this._placeMushroom(p.x, p.y);
        for (const p of stumps)     this._placeStump(p.x, p.y);
        for (const p of pebbles)    this._placePebble(p.x, p.y);
        for (const p of moss)       this._placeMoss(p.x, p.y);
        for (const p of formations) this._placeFormation(p.x, p.y);
        for (const p of grass)      this._placeGrass(p.x, p.y);

        // ★ Животные НЕ спавнятся здесь. Их вызывает ChunkManager.spawnAnimals(),
        //   когда чанк входит в ANIMAL_SPAWN_RADIUS. См. ChunkManager.update().

        this._collectVegetation();
    }

    // ── Животные ────────────────────────────────────────────
    /**
     * Публичный метод. Вызывается ChunkManager'ом один раз — когда чанк
     * входит в ANIMAL_SPAWN_RADIUS от игрока. Повторные вызовы игнорируются
     * благодаря флагу animalsSpawned.
     */
    spawnAnimals() {
        if (this.animalsSpawned) return;
        this.animalsSpawned = true;
        const ox = this.cx * CHUNK_PX;
        const oy = this.cy * CHUNK_PX;
        this._spawnAnimals(ox, oy, ox + CHUNK_PX, oy + CHUNK_PX);
    }

    // ── Ветер ────────────────────────────────────────────────
    _maybeWind(sprite, key) {
        if (!this.windSystem) return;
        const frames = collectWindFrames(this.scene, key);
        if (frames.length > 1) {
            this.windSystem.register(sprite, frames);
        }
    }

    // ── Фауна ───────────────────────────────────────────────
    _spawnAnimals(ox, oy, maxX, maxY) {
        const PLAN = [
            { key: 'deer',     variants: ['brown', 'tan', 'buck'],         sizes: ['medium', 'large'],  prob: 0.14 },
            { key: 'hare',     variants: ['gray', 'brown'],                sizes: ['small', 'medium'],  prob: 0.20 },
            { key: 'squirrel', variants: ['orange', 'brown'],              sizes: ['small', 'medium'],  prob: 0.22 },
            { key: 'boar',     variants: [null],                           sizes: ['medium'],           prob: 0.10 },
            { key: 'bird',     variants: ['tit', 'woodpecker', 'sparrow'], sizes: ['small'],            prob: 0.28 },
            { key: 'toad',     variants: [null],                           sizes: ['small', 'medium'],  prob: 0.14 },
        ];

        const sampler = new JitteredSampler(64, 0xA17E);
        const hits = sampler.sample(ox, oy, maxX, maxY, (x, y) => {
            if (this._insideAnimalZone(x, y)) return 0;
            if (this.biomeGen.getPath(x, y) > 0.4) return 0;
            const b = this.biomeGen.getBiome(x, y);
            if (b === BIOME.WATER || b === BIOME.DEEP_WATER || b === BIOME.SAND) return 0;
            return 0.55;
        }, 0xABCD);

        for (const p of hits) {
            if (this.animals.length >= MAX_ANIMALS_PER_CHUNK) break;
            const biome = this.biomeGen.getBiome(p.x, p.y);
            const allowed = PLAN.filter((s) => {
                if (s.key === 'toad') return biome === BIOME.SWAMP || biome === BIOME.OAK;
                if (s.key === 'boar') return biome !== BIOME.BIRCH;
                return true;
            });
            if (!allowed.length) continue;
            const pick = allowed[Math.floor(Math.random() * allowed.length)];
            if (Math.random() > pick.prob) continue;
            const variant = pick.variants[Math.floor(Math.random() * pick.variants.length)];
            const size    = pick.sizes[Math.floor(Math.random() * pick.sizes.length)];
            this.animals.push(new AnimalSprite(
                this.scene, pick.key, variant, size, p.x, p.y,
            ));
        }
    }

    _insideAnimalZone(wx, wy) {
        return isInsideAnyAnimalZone(wx, wy);
    }

    updateAnimals(dt, player, isBlocked) {
        const CULL = 500;
        const CULL2 = CULL * CULL;
        const px = player.x, py = player.y;
        for (let i = 0; i < this.animals.length; i++) {
            const a = this.animals[i];
            const dx = a.x - px, dy = a.y - py;
            if (dx * dx + dy * dy > CULL2) continue;
            a.update(dt, player, isBlocked);
        }
    }

    // ── Деревья / декор ─────────────────────────────────────
    _placeTree(wx, wy) {
        const biome = this.biomeGen.getBiome(wx, wy);
        const r = hash2D(Math.floor(wx), Math.floor(wy), 4242);
        const V = TUNING.assetVariants;
        let key = null, cfg = null;

        switch (biome) {
            case BIOME.PINE:
                if (r < 0.55)      { key = this._pickVariant('tree_pine',   V.pine,   wx, wy, 1001); cfg = TUNING.trees.pine; }
                else if (r < 0.90) { key = this._pickVariant('tree_pine2',  V.pine2,  wx, wy, 1002); cfg = TUNING.trees.pine2; }
                else               { key = this._pickVariant('tree_spruce', V.spruce, wx, wy, 1003); cfg = TUNING.trees.spruce; }
                break;
            case BIOME.BIRCH:
                if (r < 0.5) { key = this._pickVariant('tree_birch',  V.birch,  wx, wy, 2001); cfg = TUNING.trees.birch; }
                else         { key = this._pickVariant('tree_birch2', V.birch2, wx, wy, 2002); cfg = TUNING.trees.birch2; }
                break;
            case BIOME.OAK:
                key = this._pickVariant('tree_oak', V.oak, wx, wy, 3001); cfg = TUNING.trees.oak;
                break;
            case BIOME.SWAMP:
                if (r < 0.75) { key = this._pickVariant('tree_dead',  V.dead,  wx, wy, 4001); cfg = TUNING.trees.dead; }
                else          { key = this._pickVariant('tree_dead2', V.dead2, wx, wy, 4002); cfg = TUNING.trees.dead2; }
                break;
            case BIOME.GRASS:
                if (r < 0.35) { key = this._pickVariant('tree_birch', V.birch, wx, wy, 5001); cfg = TUNING.trees.birch; }
                break;
            case BIOME.DEAD:
                if (r < 0.5) { key = this._pickVariant('tree_dead',  V.dead,  wx, wy, 6001); cfg = TUNING.trees.dead; }
                else         { key = this._pickVariant('tree_dead2', V.dead2, wx, wy, 6002); cfg = TUNING.trees.dead2; }
                break;
        }
        if (!key || !cfg) return;
        const obstacle = { bodyW: 10, bodyH: 6, yOff: 1 };
        this._addObject(wx, wy, key, cfg, obstacle);
    }

    _placeDecor(wx, wy) {
        const biome = this.biomeGen.getBiome(wx, wy);
        const r = hash2D(Math.floor(wx), Math.floor(wy), 7711);
        const V = TUNING.assetVariants;
        const logRoll = hash2D(Math.floor(wx), Math.floor(wy), 8822) < TUNING.density.logRarity;

        let baseKey = null, cfg = null;
        switch (biome) {
            case BIOME.GRASS:
            case BIOME.OAK:
                if (logRoll)       { baseKey = 'log';    cfg = TUNING.decor.log; }
                else if (r < 0.55) { baseKey = 'fern_0'; cfg = TUNING.decor.fern; }
                else if (r < 0.80) { baseKey = 'rock_0'; cfg = TUNING.decor.rock; }
                else if (r < 0.92) { baseKey = 'rock_1'; cfg = TUNING.decor.rock; }
                else               { baseKey = 'fern_1'; cfg = TUNING.decor.fern; }
                break;
            case BIOME.BIRCH:
            case BIOME.PINE:
                if (logRoll)       { baseKey = 'log';    cfg = TUNING.decor.log; }
                else if (r < 0.50) { baseKey = 'fern_0'; cfg = TUNING.decor.fern; }
                else if (r < 0.75) { baseKey = 'rock_0'; cfg = TUNING.decor.rock; }
                else if (r < 0.90) { baseKey = 'rock_1'; cfg = TUNING.decor.rock; }
                else               { baseKey = 'fern_1'; cfg = TUNING.decor.fern; }
                break;
            case BIOME.SWAMP:
            case BIOME.DEAD:
                if (logRoll)       { baseKey = 'log';    cfg = TUNING.decor.log; }
                else if (r < 0.7)  { baseKey = 'fern_1'; cfg = TUNING.decor.fern; }
                else               { baseKey = 'rock_1'; cfg = TUNING.decor.rock; }
                break;
            case BIOME.SAND:
                baseKey = r < 0.6 ? 'rock_0' : 'rock_1';
                cfg = TUNING.decor.rock;
                break;
        }
        if (!baseKey || !cfg) return;

        let prefix, count;
        if (baseKey === 'log') {
            prefix = ['log_0', 'log_1', 'log_2', 'log_3'][
                Math.floor(hash2D(Math.round(wx), Math.round(wy), 9333) * 4)
                ];
            count = V.log;
        } else {
            prefix = baseKey;
            count = baseKey.startsWith('fern') ? V.fern : V.rockSmall;
            if (baseKey === 'rock_0') count = V.rockPebble;
            if (baseKey === 'rock_1') count = V.rockSmall;
        }
        const key = this._pickVariant(prefix, count, wx, wy, 5501);
        const isBlocking = prefix.startsWith('rock') || prefix.startsWith('log');
        const obstacleCfg = isBlocking ? (TUNING.obstacles[prefix] ?? null) : null;
        this._addObject(wx, wy, key, cfg, obstacleCfg);
    }

    _placeBush(wx, wy) {
        const biome = this.biomeGen.getBiome(wx, wy);
        const V = TUNING.assetVariants;
        const r = hash2D(Math.floor(wx), Math.floor(wy), 8433);
        let prefix = 'bush_green';
        if (biome === BIOME.OAK || biome === BIOME.PINE) {
            prefix = r < 0.4 ? 'bush_green' : (r < 0.7 ? 'bush_berry' : 'bush_dark');
        } else if (biome === BIOME.BIRCH) {
            prefix = r < 0.55 ? 'bush_green' : 'bush_autumn';
        } else if (biome === BIOME.GRASS) {
            prefix = r < 0.6 ? 'bush_green' : 'bush_berry';
        } else if (biome === BIOME.DEAD) {
            prefix = r < 0.5 ? 'bush_dark' : 'bush_autumn';
        }
        const key = this._pickVariant(prefix, V.bush, wx, wy, 6601);
        this._addObject(wx, wy, key, TUNING.decor.bush, null);
    }

    _placeFlower(wx, wy) {
        const r = hash2D(Math.floor(wx), Math.floor(wy), 7007);
        const order = ['flower_daisy', 'flower_poppy', 'flower_cornflower',
            'flower_pink', 'flower_bell', 'flower_spike'];
        const prefix = order[Math.floor(r * order.length)];
        const key = this._pickVariant(prefix, TUNING.assetVariants.flower, wx, wy, 7008);
        this._addObject(wx, wy, key, TUNING.decor.flower, null);
    }

    _placeMushroom(wx, wy) {
        const r = hash2D(Math.floor(wx), Math.floor(wy), 8008);
        let prefix;
        if (r < 0.4)      prefix = 'mushroom_boletus';
        else if (r < 0.7) prefix = 'mushroom_toadstool';
        else if (r < 0.9) prefix = 'mushroom_amanita';
        else              prefix = 'mushroom_cluster';
        const key = this._pickVariant(prefix, TUNING.assetVariants.mushroom, wx, wy, 8009);
        this._addObject(wx, wy, key, TUNING.decor.mushroom, null);
    }

    _placeStump(wx, wy) {
        const r = hash2D(Math.floor(wx), Math.floor(wy), 9009);
        let prefix;
        if (r < 0.35)      prefix = 'stump_plain';
        else if (r < 0.65) prefix = 'stump_mossy';
        else if (r < 0.85) prefix = 'stump_sprout';
        else               prefix = 'stump_mushrooms';
        const key = this._pickVariant(prefix, TUNING.assetVariants.stump, wx, wy, 9010);
        const obstacleCfg = TUNING.obstacles[prefix] ?? null;
        this._addObject(wx, wy, key, TUNING.decor.stump, obstacleCfg);
    }

    _placePebble(wx, wy) {
        const r = hash2D(Math.floor(wx), Math.floor(wy), 1101);
        let prefix;
        if (r < 0.55)      prefix = 'pebble_scatter';
        else if (r < 0.85) prefix = 'pebble_single';
        else               prefix = 'pebble_cluster';
        const key = this._pickVariant(prefix, TUNING.assetVariants.pebble, wx, wy, 1102);
        this._addObject(wx, wy, key, TUNING.decor.pebble, null);
    }

    _placeMoss(wx, wy) {
        const r = hash2D(Math.floor(wx), Math.floor(wy), 1201);
        const prefix = r < 0.7 ? 'moss_flat' : 'moss_mound';
        const key = this._pickVariant(prefix, TUNING.assetVariants.moss, wx, wy, 1202);
        this._addObject(wx, wy, key, TUNING.decor.moss, null);
    }

    _placeFormation(wx, wy) {
        const r = hash2D(Math.floor(wx), Math.floor(wy), 1301);
        let prefix;
        if (r < 0.35)      prefix = 'formation_outcrop';
        else if (r < 0.6)  prefix = 'formation_ridge';
        else if (r < 0.82) prefix = 'formation_peak';
        else if (r < 0.94) prefix = 'formation_mountain';
        else               prefix = 'formation_plateau';
        const key = this._pickVariant(prefix, TUNING.assetVariants.formation, wx, wy, 1302);
        const obstacleCfg = TUNING.obstacles[prefix] ?? null;
        this._addObject(wx, wy, key, TUNING.decor.formation, obstacleCfg);
    }

    _placeGrass(wx, wy) {
        const V = TUNING.assetVariants;
        const key = this._pickVariant('grass', V.grass, wx, wy, 99551);
        const ix = Math.round(wx);
        const iy = Math.round(wy);
        const sprite = this.scene.add.image(ix, iy, key);
        sprite.setOrigin(0.5, 1);
        sprite.setDepth(DEPTH.ENTITIES + iy);
        this._maybeWind(sprite, key);
        this.objects.push({ sprite, shadow: null, contact: null, isSilhouette: false });
    }

    _addObject(wx, wy, key, cfg = {}, obstacleCfg = null) {
        const ix = Math.round(wx);
        const yOff = cfg.yOff ?? 0;
        const baseY = Math.round(wy + yOff);

        const sprite = this.scene.add.image(ix, baseY, key);
        sprite.setOrigin(0.5, 1);
        sprite.setDepth(DEPTH.ENTITIES + wy);

        let shadow = null, contact = null;
        if (TUNING.silhouetteShadow.enabled) {
            const S = TUNING.silhouetteShadow;
            const squash   = cfg.shadowSquash   ?? S.squash;
            const alphaMul = cfg.shadowAlphaMul ?? 1;

            shadow = this.scene.add.image(ix, baseY, key);
            shadow.setOrigin(0.5, 1);
            shadow.setTintFill(S.color);
            shadow.setAlpha(S.baseAlpha * alphaMul);
            shadow.setScale(1, squash);
            shadow.setDepth(DEPTH.SHADOW);
            shadow._squash = squash;
            shadow._alphaMul = alphaMul;

            contact = this.scene.add.image(ix, baseY + 1, key);
            contact.setOrigin(0.5, 1);
            contact.setTintFill(0x120e23);
            contact.setAlpha(0.5);
            contact.setScale(1, 0.12);
            contact.setDepth(DEPTH.SHADOW + 2);
        }

        this._maybeWind(sprite, key);

        this.objects.push({ sprite, shadow, contact, isSilhouette: !!shadow });

        if (obstacleCfg && obstacleCfg.solid !== false && this.obstaclesGroup) {
            const zone = this.scene.add.zone(
                ix,
                baseY - (obstacleCfg.yOff ?? 0),
                obstacleCfg.bodyW,
                obstacleCfg.bodyH,
            ).setOrigin(0.5, 1);
            this.scene.physics.add.existing(zone, true);
            this.obstaclesGroup.add(zone);
            this.obstacles.push(zone);
        }
    }

    applyShadowParams(params) {
        for (const o of this.objects) {
            if (!o.sprite) continue;
            if (o.shadow && o.isSilhouette) {
                o.shadow.x = o.sprite.x + params.offsetX;
                o.shadow.y = o.sprite.y;
                o.shadow.scaleX = params.stretch;
                o.shadow.scaleY = o.shadow._squash;
                o.shadow.alpha  = params.alpha * o.shadow._alphaMul;
            }
        }
        for (const a of this.animals) a.applyShadowParams(params);
    }

    // ── Пиксельный шум растительности (аудио) ───────────────
    _collectVegetation() {
        this.vegItems.length = 0;
        for (const o of this.objects) {
            if (!o.sprite || !o.sprite.texture) continue;
            const key = o.sprite.texture.key || '';
            let kind = null;
            if (key.startsWith('grass'))      kind = 'grass';
            else if (key.startsWith('fern'))  kind = 'fern';
            else if (key.startsWith('bush'))  kind = 'bush';
            if (!kind) continue;
            this.vegItems.push({ x: o.sprite.x, y: o.sprite.y, kind, lastPlayed: 0 });
        }
    }

    tryVegAudio(player) {
        if (!this.vegItems.length) return;
        const R2 = 22 * 22;
        const px = player.x, py = player.y;
        const now = performance.now();

        let best = null, bestD = R2;
        for (const it of this.vegItems) {
            const dx = it.x - px, dy = it.y - py;
            const d2 = dx * dx + dy * dy;
            if (d2 > R2) continue;
            if (now - it.lastPlayed < 380) continue;
            if (d2 < bestD) { bestD = d2; best = it; }
        }
        if (!best) return;
        best.lastPlayed = now;
        ambience.rustle(best.kind);
    }

    _insideBuildingZone(wx, wy) {
        return isInsideAnyBuilding(wx, wy);
    }

    destroy() {
        if (this.sprite) this.sprite.destroy();
        if (this.texKey && this.scene.textures.exists(this.texKey)) {
            this.scene.textures.remove(this.texKey);
        }
        // Отписка от ветра — чтобы WindSystem не тянул мёртвые ссылки.
        if (this.windSystem) {
            for (const o of this.objects) {
                if (o.sprite) this.windSystem.unregister(o.sprite);
            }
        }
        for (const o of this.objects) {
            o.sprite?.destroy();
            o.shadow?.destroy();
            o.contact?.destroy();
        }
        this.objects.length = 0;

        for (const a of this.animals) a.destroy();
        this.animals.length = 0;

        for (const z of this.obstacles) {
            this.obstaclesGroup?.remove(z, true, true);
        }
        this.obstacles.length = 0;
    }
}