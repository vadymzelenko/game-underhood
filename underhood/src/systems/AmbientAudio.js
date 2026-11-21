import { TUNING } from '../config/TuningConfig.js';

/**
 * Фоновый эмбиент.
 *
 *   • Лес: 3 bandpass-слоя белого шума (та самая «первая версия»).
 *   • Птицы: 5 разных синтезированных пресетов + файлы bird_*.
 *   • Шелест: короткий highpass-шум с per-kind cutoff.
 *
 * Файлы в TUNING.audio.files переопределяют синтез. Пустая строка
 * или отсутствующий файл → используется синтез.
 *
 * Публичный API:
 *   ambience.start()             — включить (по первому user input)
 *   ambience.resume()            — снять suspend после autoplay policy
 *   ambience.rustle(kind)        — короткий шум ('grass'|'fern'|'bush')
 *   ambience.stop()              — приглушить
 *   ambience.registerFile(k,p)   — ручная регистрация файла
 */
class AmbientAudio {
    constructor() {
        this.ctx = null;
        this.master = null;
        this.forestGain = null;
        this.birdGain = null;
        this.rustleGain = null;

        this._started = false;
        this._birdTimer = null;
        this._noiseBuffer = null;

        // Indoor-зона: тихий гул дома, скрипы, эхо-шаги
        this._indoor = false;
        this._indoorNodes = [];
        this._creakTimer = null;

        // Лес может состоять из нескольких узлов (по слою) или одного
        // (если подгрузился файл). Храним массив для остановки/перезапуска.
        this._forestNodes = [];
        this._forestUsingFile = false;

        this._files = new Map();      // key -> path
        this._buffers = new Map();    // key -> AudioBuffer
        this._onFilesReady = null;
    }

    registerFile(key, path) {
        if (!key || !path) return;
        this._files.set(key, path);
    }

    _ensureContext() {
        if (this.ctx) return true;
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return false;
        try {
            this.ctx = new AC();
        } catch {
            return false;
        }

        const cfg = TUNING.audio;
        this.master = this.ctx.createGain();
        this.master.gain.value = cfg.masterVolume ?? 0.5;
        this.master.connect(this.ctx.destination);

        this.forestGain = this.ctx.createGain();
        this.forestGain.gain.value = 0;
        this.forestGain.connect(this.master);

        this.birdGain = this.ctx.createGain();
        this.birdGain.gain.value = cfg.birds?.volume ?? 0.35;
        this.birdGain.connect(this.master);

        this.rustleGain = this.ctx.createGain();
        this.rustleGain.gain.value = cfg.rustle?.volume ?? 0.30;
        this.rustleGain.connect(this.master);

        this.indoorGain = this.ctx.createGain();
        this.indoorGain.gain.value = 0;
        this.indoorGain.connect(this.master);

        this.stepGain = this.ctx.createGain();
        this.stepGain.gain.value = cfg.footstep?.volume ?? 0.16;
        this.stepGain.connect(this.master);

        this.creakGain = this.ctx.createGain();
        this.creakGain.gain.value = cfg.indoor?.volume ?? 0.30;
        this.creakGain.connect(this.master);

        // Ревербератор (эхо помещения) для шагов и скрипов
        this._reverb = this.ctx.createConvolver();
        this._reverb.buffer = this._buildImpulse(1.4, 2.5);
        this._reverbWet = this.ctx.createGain();
        this._reverbWet.gain.value = 0.6;
        this._reverb.connect(this._reverbWet);
        this._reverbWet.connect(this.master);

        this._noiseBuffer = this._buildNoiseBuffer(3);
        return true;
    }

    _buildNoiseBuffer(seconds) {
        const sr = this.ctx.sampleRate;
        const len = Math.max(1, Math.floor(sr * seconds));
        const buf = this.ctx.createBuffer(1, len, sr);
        const d = buf.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
        return buf;
    }

    /** Импульсная характеристика для реверба (эхо помещения). */
    _buildImpulse(duration, decay) {
        const sr = this.ctx.sampleRate;
        const len = Math.floor(sr * duration);
        const buf = this.ctx.createBuffer(2, len, sr);
        for (let ch = 0; ch < 2; ch++) {
            const d = buf.getChannelData(ch);
            for (let i = 0; i < len; i++) {
                d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
            }
        }
        return buf;
    }

    // ── Загрузка файлов ─────────────────────────────────────
    _registerFromConfig() {
        const files = TUNING.audio?.files || {};
        for (const [key, path] of Object.entries(files)) {
            if (path) this.registerFile(key, path);
        }
    }

    async _loadFiles() {
        const tasks = [];
        for (const [key, path] of this._files) {
            if (this._buffers.has(key)) continue;
            tasks.push(this._loadOne(key, path));
        }
        if (tasks.length) await Promise.all(tasks);
    }

    async _loadOne(key, path) {
        try {
            const res = await fetch(path);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const arr = await res.arrayBuffer();
            const buf = await this.ctx.decodeAudioData(arr);
            this._buffers.set(key, buf);
            console.log(`[ambience] loaded "${key}" ← ${path}`);
        } catch (e) {
            console.warn(`[ambience] load failed "${key}" (${path}):`, e.message);
        }
    }

    // ── Public API ──────────────────────────────────────────
    start() {
        if (!TUNING.audio.enabled) return;
        if (!this._ensureContext()) return;
        if (this._started) return;
        this._started = true;

        this._registerFromConfig();

        // Синтез стартует сразу. Если файлы догрузятся позже — заменяем лес.
        this._loadFiles().then(() => {
            if (this._buffers.has('forest') && !this._forestUsingFile) {
                this._restartForest(true);
            }
        });

        if (TUNING.audio.forest.enabled) this._startForest();
        if (TUNING.audio.birds.enabled)  this._scheduleBird();

        // Если игрок уже в помещении (напр., до первого user-gesture) —
        // сразу включаем индор и глушим лес.
        if (this._indoor) {
            if (this.forestGain) this.forestGain.gain.value = 0;
            if (this.birdGain)   this.birdGain.gain.value = 0;
            this._startIndoor(this.ctx.currentTime, 0.001);
            this._scheduleCreak();
        }
    }

    resume() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume().catch(() => {});
        }
    }

    stop() {
        this._started = false;
        if (this._birdTimer) {
            clearTimeout(this._birdTimer);
            this._birdTimer = null;
        }
        if (this.forestGain && this.ctx) {
            const t = this.ctx.currentTime;
            this.forestGain.gain.cancelScheduledValues(t);
            this.forestGain.gain.linearRampToValueAtTime(0, t + 0.5);
        }
    }

    // ── Лес ─────────────────────────────────────────────────
    _startForest() {
        const hasFile = this._buffers.has('forest');
        this._spawnForest(hasFile);
    }

    _restartForest(preferFile) {
        this._stopForest();
        const hasFile = preferFile && this._buffers.has('forest');
        this._spawnForest(hasFile);
    }

    _stopForest() {
        for (const n of this._forestNodes) {
            try { n.stop(); } catch {}
            try { n.disconnect(); } catch {}
        }
        this._forestNodes = [];
        this._forestUsingFile = false;
    }

    _spawnForest(useFile) {
        const cfg = TUNING.audio.forest;
        const t = this.ctx.currentTime;

        if (useFile) {
            // Один looping source из загруженного файла.
            const src = this.ctx.createBufferSource();
            src.buffer = this._buffers.get('forest');
            src.loop = true;
            src.connect(this.forestGain);
            src.start();
            this._forestNodes.push(src);
            this._forestUsingFile = true;
        } else {
            // ★ Первая версия: многослойный bandpass-шум.
            const layers = cfg.layers ?? [];
            for (const L of layers) {
                const src = this.ctx.createBufferSource();
                src.buffer = this._noiseBuffer;
                src.loop = true;

                const filter = this.ctx.createBiquadFilter();
                filter.type = 'bandpass';
                filter.frequency.value = L.freq;
                filter.Q.value = L.q;

                const g = this.ctx.createGain();
                g.gain.value = L.gain;

                src.connect(filter);
                filter.connect(g);
                g.connect(this.forestGain);
                src.start();
                this._forestNodes.push(src);
            }
            this._forestUsingFile = false;
        }

        this.forestGain.gain.cancelScheduledValues(t);
        this.forestGain.gain.setValueAtTime(0, t);
        this.forestGain.gain.linearRampToValueAtTime(cfg.volume, t + (cfg.fadeInSec ?? 2));
    }

    // ── Птицы ───────────────────────────────────────────────
    _scheduleBird() {
        const cfg = TUNING.audio.birds;
        const delay = cfg.minIntervalMs + Math.random() * (cfg.maxIntervalMs - cfg.minIntervalMs);
        this._birdTimer = setTimeout(() => {
            if (!this._started) return;
            if (this._indoor) { this._birdTimer = null; return; }
            this._singOnce();
            this._scheduleBird();
        }, delay);
    }

    _singOnce() {
        if (!this.ctx) return;
        const t = this.ctx.currentTime;
        const fileKey = this._pickBirdFileKey();
        if (fileKey) this._playBirdFile(fileKey, t);
        else          this._playBirdSynth(t);
    }

    _pickBirdFileKey() {
        const keys = [];
        for (const k of this._buffers.keys()) {
            if (k.startsWith('bird')) keys.push(k);
        }
        if (!keys.length) return null;
        return keys[Math.floor(Math.random() * keys.length)];
    }

    _playBirdFile(key, t) {
        const src = this.ctx.createBufferSource();
        src.buffer = this._buffers.get(key);
        src.playbackRate.value = 0.92 + Math.random() * 0.16;
        src.connect(this.birdGain);
        src.start(t);
    }

    _playBirdSynth(t) {
        const presets = [
            this._birdTit,
            this._birdSparrow,
            this._birdCuckoo,
            this._birdWarbler,
            this._birdWoodpecker,
        ];
        const p = presets[Math.floor(Math.random() * presets.length)];
        p.call(this, t);
    }

    // ── Пресеты птиц (синтез) ───────────────────────────────
    _birdTit(t0) {
        // Синица: 2–4 коротких высоких ноты.
        const n = 2 + Math.floor(Math.random() * 3);
        let t = t0;
        for (let i = 0; i < n; i++) {
            const osc = this.ctx.createOscillator();
            osc.type = 'triangle';
            const f = 2400 + Math.random() * 1800;
            osc.frequency.setValueAtTime(f, t);
            osc.frequency.linearRampToValueAtTime(f * 1.15, t + 0.05);

            const g = this.ctx.createGain();
            g.gain.setValueAtTime(0.0001, t);
            g.gain.exponentialRampToValueAtTime(0.4, t + 0.006);
            g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);

            osc.connect(g); g.connect(this.birdGain);
            osc.start(t); osc.stop(t + 0.09);
            t += 0.08 + Math.random() * 0.06;
        }
    }

    _birdSparrow(t0) {
        // Воробей: быстрая трель с нисходящей высотой.
        const n = 6 + Math.floor(Math.random() * 5);
        let t = t0;
        const baseF = 3000 + Math.random() * 800;
        for (let i = 0; i < n; i++) {
            const osc = this.ctx.createOscillator();
            osc.type = 'square';
            const f = baseF - i * 80 + Math.random() * 60;
            osc.frequency.setValueAtTime(f, t);

            const g = this.ctx.createGain();
            g.gain.setValueAtTime(0.0001, t);
            g.gain.exponentialRampToValueAtTime(0.22, t + 0.004);
            g.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);

            osc.connect(g); g.connect(this.birdGain);
            osc.start(t); osc.stop(t + 0.04);
            t += 0.035;
        }
    }

    _birdCuckoo(t0) {
        // Кукушка: две длинные ноты с вибрато.
        const notes = [
            { f: 700, dur: 0.28 },
            { f: 550, dur: 0.34 },
        ];
        let t = t0;
        for (const note of notes) {
            const osc = this.ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(note.f, t);

            const lfo = this.ctx.createOscillator();
            lfo.frequency.value = 6;
            const lfoGain = this.ctx.createGain();
            lfoGain.gain.value = 8;
            lfo.connect(lfoGain); lfoGain.connect(osc.frequency);

            const g = this.ctx.createGain();
            g.gain.setValueAtTime(0.0001, t);
            g.gain.exponentialRampToValueAtTime(0.35, t + 0.02);
            g.gain.setValueAtTime(0.35, t + note.dur * 0.7);
            g.gain.exponentialRampToValueAtTime(0.0001, t + note.dur);

            osc.connect(g); g.connect(this.birdGain);
            osc.start(t); lfo.start(t);
            osc.stop(t + note.dur + 0.02);
            lfo.stop(t + note.dur + 0.02);
            t += note.dur + 0.05;
        }
    }

    _birdWarbler(t0) {
        // Славка: длинная нота с FM-варблингом.
        const dur = 0.55 + Math.random() * 0.5;
        const f0 = 1800 + Math.random() * 800;

        const osc = this.ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f0, t0);
        osc.frequency.linearRampToValueAtTime(f0 * 0.6, t0 + dur);

        const lfo = this.ctx.createOscillator();
        lfo.frequency.value = 12 + Math.random() * 8;
        const lfoGain = this.ctx.createGain();
        lfoGain.gain.value = 200;
        lfo.connect(lfoGain); lfoGain.connect(osc.frequency);

        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(0.28, t0 + 0.03);
        g.gain.setValueAtTime(0.28, t0 + dur * 0.75);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

        osc.connect(g); g.connect(this.birdGain);
        osc.start(t0); lfo.start(t0);
        osc.stop(t0 + dur + 0.02);
        lfo.stop(t0 + dur + 0.02);
    }

    _birdWoodpecker(t0) {
        // Дятел: серия коротких стуков.
        const n = 6 + Math.floor(Math.random() * 4);
        let t = t0;
        for (let i = 0; i < n; i++) {
            const src = this.ctx.createBufferSource();
            src.buffer = this._noiseBuffer;

            const filter = this.ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.value = 2000 + Math.random() * 500;
            filter.Q.value = 8;

            const g = this.ctx.createGain();
            g.gain.setValueAtTime(0.0001, t);
            g.gain.exponentialRampToValueAtTime(0.3, t + 0.003);
            g.gain.exponentialRampToValueAtTime(0.0001, t + 0.025);

            src.connect(filter); filter.connect(g); g.connect(this.birdGain);
            src.start(t); src.stop(t + 0.03);
            t += 0.04 + Math.random() * 0.01;
        }
    }

    // ── Indoor-зона: смена эмбиента улица ↔ дом ──────────────
    setIndoor(on) {
        this._indoor = on;
        if (!this.ctx) return;

        const cfg = TUNING.audio;
        const t = this.ctx.currentTime;
        const fade = cfg.indoor?.fadeSec ?? 1.2;

        if (on) {
            if (this.forestGain) {
                this.forestGain.gain.cancelScheduledValues(t);
                this.forestGain.gain.setValueAtTime(this.forestGain.gain.value, t);
                this.forestGain.gain.linearRampToValueAtTime(0, t + fade);
            }
            if (this.birdGain) {
                this.birdGain.gain.cancelScheduledValues(t);
                this.birdGain.gain.setValueAtTime(this.birdGain.gain.value, t);
                this.birdGain.gain.linearRampToValueAtTime(0, t + fade);
            }
            this._startIndoor(t, fade);
            this._scheduleCreak();
        } else {
            this._stopIndoor(t, fade);
            if (this._creakTimer) { clearTimeout(this._creakTimer); this._creakTimer = null; }

            if (this.forestGain && cfg.forest.enabled) {
                this.forestGain.gain.cancelScheduledValues(t + fade);
                this.forestGain.gain.setValueAtTime(0, t + fade);
                this.forestGain.gain.linearRampToValueAtTime(cfg.forest.volume, t + fade + 0.5);
            }
            if (this.birdGain && cfg.birds.enabled) {
                this.birdGain.gain.cancelScheduledValues(t + fade);
                this.birdGain.gain.setValueAtTime(0, t + fade);
                this.birdGain.gain.linearRampToValueAtTime(cfg.birds.volume, t + fade + 0.5);
                if (!this._birdTimer) this._scheduleBird();
            }
        }
    }

    _startIndoor(t, fade) {
        this._stopIndoor(t, 0);
        const cfg = TUNING.audio.indoor;
        if (!cfg || cfg.enabled === false) return;

        const tone = cfg.roomTone ?? {};
        const src = this.ctx.createBufferSource();
        src.buffer = this._noiseBuffer;
        src.loop = true;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = tone.freq ?? 120;
        filter.Q.value = tone.q ?? 0.6;
        const g = this.ctx.createGain();
        g.gain.value = tone.gain ?? 0.5;
        src.connect(filter); filter.connect(g); g.connect(this.indoorGain);
        src.start();
        this._indoorNodes.push(src);

        const hum = this.ctx.createOscillator();
        hum.type = 'sine';
        hum.frequency.value = 50;
        const humGain = this.ctx.createGain();
        humGain.gain.value = 0.12;
        hum.connect(humGain); humGain.connect(this.indoorGain);
        hum.start();
        this._indoorNodes.push(hum);

        this.indoorGain.gain.cancelScheduledValues(t);
        this.indoorGain.gain.setValueAtTime(0, t);
        this.indoorGain.gain.linearRampToValueAtTime(cfg.volume ?? 0.3, t + (fade || 0.001));
    }

    _stopIndoor(t, fade) {
        for (const n of this._indoorNodes) {
            try { n.stop(); } catch {}
            try { n.disconnect(); } catch {}
        }
        this._indoorNodes.length = 0;
        if (this.indoorGain && this.ctx) {
            this.indoorGain.gain.cancelScheduledValues(t);
            this.indoorGain.gain.setValueAtTime(this.indoorGain.gain.value, t);
            this.indoorGain.gain.linearRampToValueAtTime(0, t + (fade || 0.001));
        }
    }

    /** Шаг — в помещении с эхом. */
    footstep() {
        if (!TUNING.audio.enabled || !TUNING.audio.footstep?.enabled) return;
        if (!this._ensureContext() || !this._started) return;
        const t = this.ctx.currentTime;

        const src = this.ctx.createBufferSource();
        src.buffer = this._noiseBuffer;
        src.loop = true;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 400 + Math.random() * 200;
        const g = this.ctx.createGain();
        const dur = 0.07;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.4, t + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        src.connect(filter); filter.connect(g);
        g.connect(this.stepGain);
        if (this._indoor && this._reverb) {
            const wet = this.ctx.createGain();
            wet.gain.value = TUNING.audio.footstep.indoorEcho ?? 0.5;
            g.connect(wet); wet.connect(this._reverb);
        }
        src.start(t); src.stop(t + dur + 0.05);
    }

    /** Скрип половицы — случайный, только в помещении. */
    creak() {
        if (!TUNING.audio.enabled || !TUNING.audio.indoor?.enabled) return;
        if (!this._ensureContext() || !this._started || !this._indoor) return;
        const t = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        osc.type = 'sawtooth';
        const f0 = 300 + Math.random() * 400;
        osc.frequency.setValueAtTime(f0, t);
        osc.frequency.linearRampToValueAtTime(f0 * (0.6 + Math.random() * 0.4), t + 0.4);

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 900;
        filter.Q.value = 6;

        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.06, t + 0.05);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);

        osc.connect(filter); filter.connect(g);
        g.connect(this.creakGain);
        if (this._reverb) {
            const wet = this.ctx.createGain();
            wet.gain.value = 0.8;
            g.connect(wet); wet.connect(this._reverb);
        }
        osc.start(t); osc.stop(t + 0.55);
    }

    _scheduleCreak() {
        if (!TUNING.audio.enabled || !TUNING.audio.indoor?.enabled) return;
        const cfg = TUNING.audio.indoor;
        const delay = cfg.creakMinMs + Math.random() * (cfg.creakMaxMs - cfg.creakMinMs);
        this._creakTimer = setTimeout(() => {
            if (!this._started || !this._indoor) { this._creakTimer = null; return; }
            this.creak();
            this._scheduleCreak();
        }, delay);
    }

    // ── Шелест под ногами (первая версия) ───────────────────
    rustle(kind = 'grass') {
        if (!TUNING.audio.enabled || !TUNING.audio.rustle.enabled) return;
        if (!this._ensureContext() || !this._started) return;

        const t = this.ctx.currentTime;

        // Если есть файл — играем его.
        const fileKey = `rustle_${kind}`;
        if (this._buffers.has(fileKey)) {
            const src = this.ctx.createBufferSource();
            src.buffer = this._buffers.get(fileKey);
            src.playbackRate.value = 0.9 + Math.random() * 0.2;
            src.connect(this.rustleGain);
            src.start(t);
            return;
        }

        // ★ Синтез как в первой версии: looping noise + highpass + огибающая.
        const cfg = TUNING.audio.rustle;
        const src = this.ctx.createBufferSource();
        src.buffer = this._noiseBuffer;
        src.loop = true;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = (cfg.cutoffHz && cfg.cutoffHz[kind]) || 1200;

        const g = this.ctx.createGain();
        const dur = 0.12 + Math.random() * 0.1;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.35, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);

        src.connect(filter);
        filter.connect(g);
        g.connect(this.rustleGain);
        src.start(t);
        src.stop(t + dur + 0.05);
    }
}

export const ambience = new AmbientAudio();