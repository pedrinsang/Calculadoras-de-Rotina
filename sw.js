const CACHE_NAME = 'virologia-cache-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/assets/styles.css',
  '/hub.html',
  '/soroneutralizacao.html',
  '/vacinas.html',
  '/elisa.html',
  '/icons/icon-192x192.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => response || fetch(event.request))
  );
});