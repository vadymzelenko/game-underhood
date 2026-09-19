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