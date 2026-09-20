import { TUNING } from '../config/TuningConfig.js';

/**
 * Цикл дня и ночи. Отдаёт:
 *   • timeOfDay (0..24)
 *   • lightAngleNorm  (-1..1): -1 = утро (тень влево), +1 = вечер (тень вправо)
 *   • shadowAlpha      (0..1)
 *   • shadowStretchX   (1..maxStretch) — растяжение силуэта
 *   • shadowOffsetX    (px) — сдвиг силуэта по X
 *   • ambient          { alpha, color } — глобальный тонирующий overlay
 */
export class DayNightCycle {
    constructor(scene) {
        this.scene = scene;
        const C = TUNING.dayNight;
        this.timeOfDay = C.startHour;
        this._daySec   = C.dayLengthSec;
        this._ambientAlpha = C.nightAmbientAlpha;
        this._ambientColor = C.nightTintColor;
    }

    update(deltaMs) {
        const C = TUNING.dayNight;
        if (!C.enabled) return;
        // 24 часа за dayLengthSec реальных секунд
        const hoursPerSec = 24 / this._daySec;
        this.timeOfDay = (this.timeOfDay + (deltaMs / 1000) * hoursPerSec) % 24;
    }

    /** -1..1 — где «солнце» по X. Ночь → тянет к 0. */
    getLightAngleNorm() {
        const C = TUNING.dayNight;
        const t = this.timeOfDay;
        if (t < C.dawnHour || t > C.duskEndHour) return 0;
        // 6..19 — день, мапим в -1..1
        const tt = (t - C.sunriseHour) / (C.sunsetHour - C.sunriseHour);
        return Math.max(-1, Math.min(1, tt * 2 - 1));
    }

    /** Насколько «активна» тень сейчас — 0 ночью, 1 в полдень. */
    getDayIntensity() {
        const C = TUNING.dayNight;
        const t = this.timeOfDay;
        if (t <= C.dawnHour || t >= C.duskEndHour) return 0;
        if (t < C.sunriseHour) return (t - C.dawnHour) / (C.sunriseHour - C.dawnHour);
        if (t > C.sunsetHour)  return (C.duskEndHour - t) / (C.duskEndHour - C.sunsetHour);
        return 1;
    }

    getShadowParams() {
        const C = TUNING.silhouetteShadow;
        const n = this.getLightAngleNorm();     // -1..1
        const intensity = this.getDayIntensity();

        // Тень сдвигается ПРОТИВ солнца: утром (n=-1) тень вправо (+), вечером влево (-)
        const offsetX = -n * C.offsetRange;
        // Стретч: полдень (n=0) — минимум, крайние часы — максимум
        const stretch = 1 + Math.abs(n) * (C.maxStretch - 1);
        // Прозрачность: ночью почти не видно, днём/утром/вечером хорошо
        const alpha = C.minAlpha + intensity * (C.maxAlpha - C.minAlpha);

        return { offsetX, stretch, alpha };
    }

    /** Параметры глобального ambient overlay (сумрак/ночь). */
    getAmbient() {
        const C = TUNING.dayNight;
        const t = this.timeOfDay;

        let targetAlpha = C.dayAmbientAlpha;
        let targetColor = C.nightTintColor;

        if (t < C.dawnHour || t > C.duskEndHour) {
            targetAlpha = C.nightAmbientAlpha;
            targetColor = C.nightTintColor;
        } else if (t < C.sunriseHour) {
            // рассвет
            const k = (t - C.dawnHour) / (C.sunriseHour - C.dawnHour);
            targetAlpha = C.nightAmbientAlpha * (1 - k);
            targetColor = C.dawnTintColor;
        } else if (t > C.sunsetHour) {
            // закат
            const k = (C.duskEndHour - t) / (C.duskEndHour - C.sunsetHour);
            targetAlpha = C.nightAmbientAlpha * (1 - k);
            targetColor = C.duskTintColor;
        }

        // Плавный lerp
        const L = C.ambientLerp;
        this._ambientAlpha += (targetAlpha - this._ambientAlpha) * L;
        this._ambientColor = targetColor;

        return { alpha: this._ambientAlpha, color: this._ambientColor };
    }
}