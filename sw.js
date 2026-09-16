// Underhood Service Worker
// Кэширует оболочку + ассеты, отдаёт из кэша при оффлайне.

const VERSION = 'v1.0.0';
const CACHE_STATIC = `underhood-static-${VERSION}`;
const CACHE_RUNTIME = `underhood-runtime-${VERSION}`;

// Файлы оболочки — грузим при установке
const PRECACHE = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  // Phaser через CDN кэшируем отдельно (см. ниже)
];

// ─── INSTALL ────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_STATIC)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

// ─── ACTIVATE ───────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_STATIC && k !== CACHE_RUNTIME)
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ─── FETCH ──────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // ─── Стратегия 1: HTML — network-first, fallback на кэш
  // (позволяет обновлять игру, но не ломается оффлайн)
  if (req.mode === 'navigate' || url.pathname.endsWith('.html')) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_STATIC).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match('./index.html')))
    );
    return;
  }

  // ─── Стратегия 2: JS, CSS, PNG, JSON, WASM — cache-first
  const cacheable = /\.(js|mjs|css|png|jpg|jpeg|webp|svg|gif|json|wasm|ogg|mp3|wav)$/i;
  if (cacheable.test(url.pathname)) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((res) => {
          // Не кэшируем чужое и битое
          if (!res || res.status !== 200 || res.type === 'opaque') return res;
          const copy = res.clone();
          caches.open(CACHE_RUNTIME).then((c) => c.put(req, copy));
          return res;
        });
      })
    );
    return;
  }

  // ─── Стратегия 3: CDN (Phaser) — stale-while-revalidate
  if (url.host === 'cdn.jsdelivr.net') {
    event.respondWith(
      caches.open(CACHE_RUNTIME).then((cache) =>
        cache.match(req).then((cached) => {
          const fetchPromise = fetch(req).then((res) => {
            cache.put(req, res.clone());
            return res;
          }).catch(() => cached);
          return cached || fetchPromise;
        })
      )
    );
    return;
  }

  // Всё остальное — как обычно
});

// ─── Сообщения от страницы (напр. «обновись») ──────────────
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
