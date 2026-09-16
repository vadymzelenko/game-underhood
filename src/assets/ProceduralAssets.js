import { PALETTE as P } from '../utils/Constants.js';
import { hash2D } from '../utils/MathUtils.js';

// ─────────────────────────────────────────────────────────────
//  ДЕРЕВО 32×40 (процедурное)
// ─────────────────────────────────────────────────────────────
export function makeTree(seed, radius, trunkW) {
    const W = 32, H = 40;
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    const set = (x, y, color) => {
        ctx.fillStyle = '#' + color.toString(16).padStart(6, '0');
        ctx.fillRect(x, y, 1, 1);
    };

    const ccx = W / 2, ccy = 16;

    // Ствол
    const tx = Math.floor(ccx - trunkW / 2);
    for (let y = ccy; y < H - 1; y++) {
        for (let x = tx; x < tx + trunkW; x++) {
            const isEdge = (x === tx) || (x === tx + trunkW - 1);
            const n = hash2D(x, y * 5, seed + 17);
            set(x, y, isEdge ? P.VERY_DARK : (n > 0.55 ? P.BROWN : P.DARK_BROWN));
        }
    }

    // Корни
    set(tx - 2, H - 3, P.VERY_DARK); set(tx - 1, H - 2, P.VERY_DARK);
    set(tx + trunkW + 1, H - 3, P.VERY_DARK); set(tx + trunkW, H - 2, P.VERY_DARK);

    // Крона
    for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
            const dx = x - ccx, dy = y - ccy;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const n = hash2D(x, y, seed);
            const r = radius + (n - 0.5) * 2.4;
            if (dist > r) continue;

            let color;
            if (dist > r - 1.5) {
                color = P.DARK_TEAL;
            } else {
                const hdx = x - (ccx - 4), hdy = y - (ccy - 4);
                const hdist = Math.sqrt(hdx * hdx + hdy * hdy);
                if (hdist < 3.4)      color = P.LIGHT_GREEN;
                else if (hdist < 5.4) color = P.GREEN;
                else if (dist > r - 4.5) color = P.TEAL;
                else                  color = P.GREEN;
            }
            set(x, y, color);
        }
    }

    return canvas;
}

// ─────────────────────────────────────────────────────────────
//  КУСТ 16×16 (пример процедурного ассета)
// ─────────────────────────────────────────────────────────────
export function makeBush(seed = 55) {
    const W = 16, H = 16;
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');

    const set = (x, y, color) => {
        ctx.fillStyle = '#' + color.toString(16).padStart(6, '0');
        ctx.fillRect(x, y, 1, 1);
    };

    for (let y = 4; y < 14; y++) {
        for (let x = 2; x < 14; x++) {
            const dx = x - 8, dy = y - 9;
            const d = Math.sqrt(dx * dx + dy * dy);
            const n = hash2D(x, y, seed);
            const r = 6 + (n - 0.5) * 2.2;
            if (d > r) continue;
            let c = P.GREEN;
            if (d > r - 1.2) c = P.DARK_TEAL;
            else if (d < 2.4) c = P.LIGHT_GREEN;
            set(x, y, c);
        }
    }
    return canvas;
}

// ─────────────────────────────────────────────────────────────
//  ЛИСТ ПЕРСОНАЖА 4×4 (направления × кадры)
//  Порядок строк: down, up, left, right
//  Порядок кадров: idle(0), walk(1), walk(2), walk(3)
// ─────────────────────────────────────────────────────────────
export function makePlayerSheet(fw = 16, fh = 24) {
    const cols = 4, rows = 4;
    const W = cols * fw, H = rows * fh;
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    const draw = (ox, oy, dir, frame) => {
        const set = (x, y, color) => {
            ctx.fillStyle = '#' + color.toString(16).padStart(6, '0');
            ctx.fillRect(ox + x, oy + y, 1, 1);
        };

        // Очищаем кадр
        ctx.clearRect(ox, oy, fw, fh);

        // ── Общие слои ──
        // Тело (куртка)
        for (let y = 8; y < 14; y++) for (let x = 4; x < 12; x++) set(x, y, P.RED);

        // Руки
        set(3, 9,  P.CREAM); set(3, 10, P.CREAM);
        set(12, 9, P.CREAM); set(12, 10, P.CREAM);

        // Голова
        for (let y = 4; y < 8; y++) for (let x = 5; x < 11; x++) set(x, y, P.CREAM);

        // Волосы
        for (let y = 2; y < 5; y++) for (let x = 4; x < 12; x++) set(x, y, P.DARK_BROWN);
        set(4, 5, P.DARK_BROWN); set(11, 5, P.DARK_BROWN);

        // Обувь (учитывая кадр анимации)
        const leftLegOff  = frame === 1 ? -1 : frame === 3 ? 1 : 0;
        const rightLegOff = frame === 3 ? -1 : frame === 1 ? 1 : 0;

        // Штаны
        set(5, 14 + Math.max(0, leftLegOff),  P.DARK_PURPLE);
        set(6, 14 + Math.max(0, leftLegOff),  P.DARK_PURPLE);
        set(9, 14 + Math.max(0, rightLegOff), P.DARK_PURPLE);
        set(10, 14 + Math.max(0, rightLegOff), P.DARK_PURPLE);

        // Ботинки
        set(5, 22 + leftLegOff,  P.VERY_DARK);
        set(6, 22 + leftLegOff,  P.VERY_DARK);
        set(9, 22 + rightLegOff, P.VERY_DARK);
        set(10, 22 + rightLegOff, P.VERY_DARK);

        // ── Детали по направлению ──
        if (dir === 'down') {
            set(7, 6, P.ALMOST_BLACK);
            set(9, 6, P.ALMOST_BLACK);
        } else if (dir === 'up') {
            // Только волосы — закрашиваем лицо
            for (let y = 4; y < 8; y++) for (let x = 5; x < 11; x++) set(x, y, P.DARK_BROWN);
        } else if (dir === 'left') {
            set(6, 6, P.ALMOST_BLACK);
            // Смещаем контур
            set(4, 4, P.DARK_BROWN); set(4, 5, P.DARK_BROWN);
        } else if (dir === 'right') {
            set(9, 6, P.ALMOST_BLACK);
            set(11, 4, P.DARK_BROWN); set(11, 5, P.DARK_BROWN);
        }
    };

    const dirs = ['down', 'up', 'left', 'right'];
    dirs.forEach((dir, row) => {
        for (let col = 0; col < cols; col++) {
            draw(col * fw, row * fh, dir, col);
        }
    });

    return canvas;
}