import { DEPTH } from '../utils/Constants.js';
import { TUNING } from '../config/TuningConfig.js';
import { SPECIES, getAnimalSheet } from './Animals.js';

const AI_DT = 1 / 20;
const FLEE_ALERT_MS = 400;

/**
 * Существо на карте.
 *
 *   • Наземные (flying: false): ходьба, коллизии по осям, тень на земле.
 *   • Летающие (flying: true): стейт-машина
 *       flying → (шанс) landing → perched → takeoff → flying
 *     с плавным изменением высоты (altitude), при испуге — flee.
 *
 * this.x / this.y — координаты «ног на земле» (для теней и AI).
 * this.altitude   — высота центра спрайта над землёй.
 * Спрайт рендерится в (x, y - altitude), тень — в (x, y).
 */
export class AnimalSprite {
    constructor(scene, speciesKey, variant, size, x, y) {
        this.scene = scene;
        this.speciesKey = speciesKey;
        this.spec = SPECIES[speciesKey];
        this.dead = false;

        // ── Летающий режим ──────────────────────────────────
        this.flying = this.spec.flying === true;
        const acfg = (TUNING.animals && TUNING.animals[speciesKey]) || {};
        this.hoverHeight = acfg.hoverHeight ?? 42;
        this.perchHeight = acfg.perchHeight ?? 28;
        this.hoverAmp    = acfg.hoverAmp    ?? 2;
        this.hoverSpeed  = acfg.hoverSpeed  ?? 1.8;
        this.fleeLift    = acfg.fleeLift    ?? 0;

        // Позиция
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;

        this.altitude = this.flying ? this.hoverHeight : 0;
        this._targetAlt = this.altitude;
        this._hoverPhase = Math.random() * Math.PI * 2;

        // Спрайт-шит
        const info = getAnimalSheet(scene, speciesKey, variant, size);
        this.textureKey = info.key;
        this.frameCount = info.frames;

        const originY = this.flying ? 0.5 : 1;
        this.sprite = scene.add.sprite(this.x, this._visualY(), info.key, 0)
            .setOrigin(0.5, originY)
            .setDepth(DEPTH.ENTITIES + this.y);

        // Тень — всегда на земле, у летающих бледнее и плоское.
        const shadowAlpha  = this.flying ? (acfg.shadowAlpha ?? 0.20) : 0.35;
        const shadowSquash = this.flying ? (acfg.shadowSquash ?? 0.14) : 0.22;
        this.shadow = scene.add.image(this.x, this.y, info.key, 0)
            .setOrigin(0.5, 1)
            .setTintFill(0x0a0a19)
            .setAlpha(shadowAlpha)
            .setScale(1, shadowSquash)
            .setDepth(DEPTH.SHADOW);
        this._shadowAlpha  = shadowAlpha;
        this._shadowSquash = shadowSquash;

        // Состояние AI
        this.state = this.flying ? 'flying' : 'idle';
        this.stateTimer = 1 + Math.random() * 3;
        this.targetX = x;
        this.targetY = y;
        this.speed = this.spec.speed;

        // Анимация
        this._animT = 0;
        this._frame = 0;

        // Аккумулятор AI
        this._aiAccum = 0;
    }

    _visualY() {
        return this.flying ? this.y - this.altitude : this.y;
    }

    update(dt, player, isBlocked) {
        if (this.dead) return;

        // ── AI ──────────────────────────────────────────────
        this._aiAccum += dt;
        let safety = 4;
        while (this._aiAccum >= AI_DT && safety-- > 0) {
            this._aiTick(AI_DT, player);
            this._aiAccum -= AI_DT;
        }

        // ── Движение ────────────────────────────────────────
        const speed2 = this.vx * this.vx + this.vy * this.vy;

        if (this.flying) {
            // Полёт — свободное движение, без коллизий.
            if (speed2 > 4) {
                this.x += this.vx * dt;
                this.y += this.vy * dt;
            }
            // Плавная смена высоты (к _targetAlt).
            const k = Math.min(1, dt * 2.5);
            this.altitude += (this._targetAlt - this.altitude) * k;
        } else {
            // Ходьба — коллизии по осям.
            if (speed2 > 4) {
                let nx = this.x + this.vx * dt;
                let ny = this.y + this.vy * dt;
                if (isBlocked(nx, this.y)) { nx = this.x; this.vx = 0; }
                if (isBlocked(this.x, ny)) { ny = this.y; this.vy = 0; }
                this.x = nx;
                this.y = ny;
            }
        }

        // ── Рендер ──────────────────────────────────────────
        let visualY = this._visualY();
        if (this.flying && this.state === 'flying') {
            this._hoverPhase += dt * this.hoverSpeed;
            visualY += Math.sin(this._hoverPhase) * this.hoverAmp;
        }

        const ix = Math.round(this.x);
        const iy = Math.round(visualY);
        this.sprite.setPosition(ix, iy);
        // Сортировка по «земле» — птица не должна «прыгать» впереди/позади
        // ствола при изменении высоты.
        this.sprite.setDepth(DEPTH.ENTITIES + Math.round(this.y));
        this.shadow.setPosition(ix, Math.round(this.y));

        // Разворот
        if (this.vx < -1) this.sprite.setFlipX(true);
        else if (this.vx > 1) this.sprite.setFlipX(false);

        // ── Анимация ────────────────────────────────────────
        this._animate(dt, speed2);
    }

    _animate(dt, speed2) {
        if (this.flying) {
            if (this.state === 'perched') {
                if (this._frame !== 6) {
                    this._frame = 6;
                    this.sprite.setFrame(6);
                }
                return;
            }
            if (this.state === 'takeoff' && this.stateTimer > 0.6) {
                if (this._frame !== 7) {
                    this._frame = 7;
                    this.sprite.setFrame(7);
                }
                return;
            }
            // Летим — цикл 0..5
            const moving = speed2 > 4 || this.state === 'landing' || this.state === 'takeoff';
            if (moving) {
                const rate = this.spec.frameRate * (this.state === 'flee' ? 1.7 : 1);
                this._animT += dt * rate;
                if (this._animT >= 1) {
                    this._animT -= 1;
                    this._frame = (this._frame + 1) % 6;
                    this.sprite.setFrame(this._frame);
                }
            } else if (this._frame > 5) {
                this._frame = 0;
                this._animT = 0;
                this.sprite.setFrame(0);
            }
            return;
        }

        // Наземные
        const moving = speed2 > 4;
        if (moving) {
            const rate = this.spec.frameRate * (this.state === 'flee' ? 1.7 : 1);
            this._animT += dt * rate;
            if (this._animT >= 1) {
                this._animT -= 1;
                this._frame = (this._frame + 1) % this.frameCount;
                this.sprite.setFrame(this._frame);
            }
        } else if (this._frame !== 0) {
            this._frame = 0;
            this._animT = 0;
            this.sprite.setFrame(0);
        }
    }

    _aiTick(dt, player) {
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const dist2 = dx * dx + dy * dy;
        const fleeR = this.spec.fleeRadius;

        // Оценка приближения
        const prev = this._prevDist2 ?? dist2;
        const approaching = dist2 < prev - 0.5;
        this._approachScore = (this._approachScore ?? 0) * 0.75
            + (approaching ? 1 : -1) * 0.25;
        this._prevDist2 = dist2;

        const shouldFlee = dist2 < fleeR * fleeR && this._approachScore > 0.05;

        // ── Испуг — высший приоритет ───────────────────────
        if (shouldFlee) {
            this.state = 'flee';
            this.stateTimer = FLEE_ALERT_MS / 1000;
            if (this.flying) {
                // Взмываем вверх.
                this._targetAlt = this.hoverHeight + this.fleeLift;
            }
            const jitter = (Math.random() - 0.5) * 0.35;
            const ang = Math.atan2(-dy, -dx) + jitter;
            this.vx = Math.cos(ang) * this.spec.fleeSpeed;
            this.vy = Math.sin(ang) * this.spec.fleeSpeed;
            return;
        }

        if (this.state === 'flee') {
            this.stateTimer -= dt;
            if (this.stateTimer > 0) return;
            // Игрок ушёл — успокаиваемся.
            this.state = this.flying ? 'flying' : 'idle';
            this.stateTimer = 0.6 + Math.random() * 1.2;
            this.vx = 0; this.vy = 0;
            if (this.flying) this._targetAlt = this.hoverHeight;
            this._approachScore = 0;
            return;
        }

        this.stateTimer -= dt;

        if (this.flying) this._flyingTick(dt);
        else             this._groundTick(dt);
    }

    // ── Стейт-машина летающих ───────────────────────────────
    _flyingTick(dt) {
        switch (this.state) {
            case 'flying': {
                const wdx = this.targetX - this.x;
                const wdy = this.targetY - this.y;
                const wd = Math.hypot(wdx, wdy);
                if (wd < 6 || this.stateTimer <= 0) {
                    // Решение: сесть или продолжить кружить.
                    if (Math.random() < 0.35) {
                        this.state = 'landing';
                        this.stateTimer = 1.5;
                        this._targetAlt = this.perchHeight;
                        this.vx = 0; this.vy = 0;
                    } else {
                        this._pickFlyTarget();
                        this.stateTimer = 2 + Math.random() * 4;
                    }
                } else {
                    this.vx = (wdx / wd) * this.speed;
                    this.vy = (wdy / wd) * this.speed;
                }
                break;
            }
            case 'landing': {
                this._targetAlt = this.perchHeight;
                if (Math.abs(this.altitude - this.perchHeight) < 1) {
                    this.altitude = this.perchHeight;
                    this.state = 'perched';
                    this.stateTimer = 2 + Math.random() * 4;
                    this.vx = 0; this.vy = 0;
                }
                break;
            }
            case 'perched': {
                this.vx = 0; this.vy = 0;
                if (this.stateTimer <= 0) {
                    this.state = 'takeoff';
                    this.stateTimer = 1.0;
                    this._targetAlt = this.hoverHeight;
                }
                break;
            }
            case 'takeoff': {
                this._targetAlt = this.hoverHeight;
                if (Math.abs(this.altitude - this.hoverHeight) < 1) {
                    this.state = 'flying';
                    this.stateTimer = 2 + Math.random() * 4;
                    this._pickFlyTarget();
                }
                break;
            }
        }
    }

    _pickFlyTarget() {
        const R = this.spec.wanderRadius;
        const a = Math.random() * Math.PI * 2;
        const rr = R * (0.3 + Math.random() * 0.7);
        this.targetX = this.x + Math.cos(a) * rr;
        this.targetY = this.y + Math.sin(a) * rr * 0.6;
    }

    // ── Стейт-машина наземных ───────────────────────────────
    _groundTick(dt) {
        if (this.stateTimer <= 0) this._pickNewState();

        if (this.state === 'idle') {
            this.vx = 0; this.vy = 0;
        } else if (this.state === 'wander') {
            const wdx = this.targetX - this.x;
            const wdy = this.targetY - this.y;
            const wd = Math.hypot(wdx, wdy);
            if (wd < 3) {
                this.state = 'idle';
                this.stateTimer = 0.8 + Math.random() * 2;
                this.vx = 0; this.vy = 0;
            } else {
                this.vx = (wdx / wd) * this.speed;
                this.vy = (wdy / wd) * this.speed;
            }
        }
    }

    _pickNewState() {
        const r = Math.random();
        if (r < 0.5) {
            this.state = 'idle';
            this.stateTimer = 1 + Math.random() * 2.5;
        } else {
            this.state = 'wander';
            this.stateTimer = 1.5 + Math.random() * 3;
            const R = this.spec.wanderRadius;
            const a = Math.random() * Math.PI * 2;
            const rr = R * (0.3 + Math.random() * 0.7);
            this.targetX = this.x + Math.cos(a) * rr;
            this.targetY = this.y + Math.sin(a) * rr * 0.3;
        }
    }

    applyShadowParams(params) {
        if (!this.shadow) return;
        this.shadow.x = Math.round(this.x + params.offsetX * 0.6);
        this.shadow.y = Math.round(this.y);
        this.shadow.scaleX = params.stretch;
        this.shadow.scaleY = this._shadowSquash;
        this.shadow.alpha = this._shadowAlpha * (params.alpha / 0.65);
    }

    destroy() {
        this.dead = true;
        this.sprite.destroy();
        this.shadow.destroy();
    }
}