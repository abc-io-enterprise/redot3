const CACHE_NAME = 'abc-io-account-v1';
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './abc-io_logo.png',
  './favicon.ico'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;
  if (request.url.includes('/api/') || request.url.includes('/api/v1/')) {
    // Network-first for API calls
    event.respondWith(
      fetch(request).catch(() => caches.match(request).then(r => r || new Response(JSON.stringify({ offline: true }), { headers: { 'Content-Type': 'application/json' } })))
    );
    return;
  }
  event.respondWith(
    caches.match(request).then(cached => cached || fetch(request).then(response => {
      const clone = response.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
      return response;
    }).catch(() => caches.match('./index.html')))
  );
});
