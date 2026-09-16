import {
    makeTree, makeBush, makePlayerSheet,
} from './ProceduralAssets.js';

/**
 * ┌─────────────────────────────────────────────────────────────┐
 * │  РЕЕСТР АССЕТОВ                                             │
 * │                                                             │
 * │  ★ ЭТО ЕДИНСТВЕННЫЙ ФАЙЛ, КОТОРЫЙ ПРАВИТСЯ ПРИ ДОБАВЛЕНИИ   │
 * │    АССЕТОВ. Вся игровая логика подхватывает их через        │
 * │    ключи (например 'tree_0', 'player').                     │
 * │                                                             │
 * │  ПРАВИЛА ЗАПОЛНЕНИЯ:                                        │
 * │  ─ images: { key: { path?, procedure? } }                   │
 * │  ─ spritesheets: { key: { path?, frameWidth, frameHeight,   │
 * │                     procedure? } }                          │
 * │  ─ characters: { key: CharacterDef }                        │
 * │                                                             │
 * │  ЛОГИКА ЗАГРУЗКИ:                                           │
 * │  1. Если есть path → грузим файл из /assets/…               │
 * │  2. Если файл не найден, но есть procedure → генерим кодом  │
 * │  3. Если path нет, но есть procedure → сразу генерим        │
 * │                                                             │
 * │  CharacterDef (авто-анимации):                              │
 * │    texture:                  ключ спрайтшита                │
 * │    directions:               ['down','up','left','right']   │
 * │    walkFramesPerDirection:   сколько кадров в строке        │
 * │    idleFrame:                индекс idle-кадра в строке     │
 * │    walkRate / idleRate:      fps анимаций                   │
 * └─────────────────────────────────────────────────────────────┘
 */

export const ASSET_REGISTRY = {
    // ─────────────────────────────────────────────────────────────
    //  ОДИНОЧНЫЕ КАРТИНКИ
    // ─────────────────────────────────────────────────────────────
    images: {
        tree_0: { path: 'assets/world/tree_0.png', procedure: () => makeTree(101, 13.2, 4) },
        tree_1: { path: 'assets/world/tree_1.png', procedure: () => makeTree(217, 12.0, 3) },
        tree_2: { path: 'assets/world/tree_2.png', procedure: () => makeTree(353, 14.2, 5) },

        // ── ПРИМЕР: пользовательские ассеты ──
        // bush_0: { path: 'assets/world/bush_0.png' },
        // rock_0: { path: 'assets/world/rock_0.png' },
        // cabin_0: { path: 'assets/buildings/cabin_0.png' },
        // chest: { path: 'assets/items/chest.png' },
    },

    // ─────────────────────────────────────────────────────────────
    //  СПРАЙТШИТЫ (раскладываются по сетке frameWidth × frameHeight)
    // ─────────────────────────────────────────────────────────────
    spritesheets: {
        player: {
            path: 'assets/characters/player.png',   // ваш PNG: 4 столбца × 4 строки кадров
            frameWidth: 16,
            frameHeight: 24,
            procedure: () => makePlayerSheet(16, 24),
        },

        // ── ПРИМЕРЫ для добавления ──
        // dog:    { path: 'assets/animals/dog.png',    frameWidth: 16, frameHeight: 16,
        //           procedure: () => makePlayerSheet(16, 16) },
        // child:  { path: 'assets/characters/child.png', frameWidth: 16, frameHeight: 24,
        //           procedure: () => makePlayerSheet(16, 24) },
    },

    // ─────────────────────────────────────────────────────────────
    //  ПЕРСОНАЖИ — автоматически строятся idle/walk × 4 направления
    // ─────────────────────────────────────────────────────────────
    characters: {
        player: {
            texture: 'player',
            directions: ['down', 'up', 'left', 'right'],
            walkFramesPerDirection: 4,
            idleFrame: 0,
            walkRate: 8,
            idleRate: 1,
        },

        // ── ПРИМЕР: новый персонаж без единой строчки логики ──
        // dog: {
        //   texture: 'dog',
        //   directions: ['down', 'up', 'left', 'right'],
        //   walkFramesPerDirection: 4,
        //   idleFrame: 0,
        //   walkRate: 10,
        //   idleRate: 2,
        // },
    },
};