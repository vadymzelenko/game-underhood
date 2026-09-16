/**
 * Рисует текстуру попиксельно из «карты» — массива строк.
 * Каждый символ = ключ в PALETTE-словаре (передаётся отдельно).
 * '.' или ' ' = прозрачный пиксель.
 */
export function createPixelTexture(scene, key, map, charToColor) {
    const h = map.length;
    const w = map[0].length;

    const g = scene.make.graphics({ add: false });

    for (let y = 0; y < h; y++) {
        const row = map[y];
        for (let x = 0; x < w; x++) {
            const ch = row[x];
            if (ch === '.' || ch === ' ') continue;
            const color = charToColor[ch];
            if (color === undefined) continue;
            g.fillStyle(color, 1);
            g.fillRect(x, y, 1, 1);
        }
    }

    g.generateTexture(key, w, h);
    g.destroy();
}