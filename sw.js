const CACHE_NAME = 'virologia-cache-v2';
const ASSETS = [
  '/',
  './index.html',
  './hub.html',
  './soroneutralizacao.html',
  './vacinas.html',
  './elisa.html',
  './icons/icon-72x72.png',
  './icons/icon-192x192.png',
  './icons/icon-512x512.png',
  './images/logo-sv-2.jpg',
  './manifest.json',
  './favicon.ico'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Installing and caching assets');
        return Promise.all(
          ASSETS.map((asset) => {
            return fetch(asset, { cache: 'no-store', mode: 'no-cors' })
              .then((response) => {
                if (!response.ok) {
                  console.warn(`[Service Worker] Failed to fetch ${asset}: ${response.status}`);
                  return null;
                }
                return cache.put(asset, response);
              })
              .catch((err) => {
                console.error(`[Service Worker] Error caching ${asset}:`, err);
                return null;
              });
          })
        ).then(() => {
          console.log('[Service Worker] All assets processed (some may have failed)');
        });
      })
  );
});

self.addEventListener('fetch', (event) => {
  // Skip non-GET requests and chrome-extension requests
  if (event.request.method !== 'GET' || event.request.url.startsWith('chrome-extension://')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        // Return cached response if found
        if (cachedResponse) {
          console.log(`[Service Worker] Serving from cache: ${event.request.url}`);
          return cachedResponse;
        }

        // Otherwise fetch from network
        return fetch(event.request)
          .then((response) => {
            // Check if valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone the response for caching
            const responseToCache = response.clone();
            
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
                console.log(`[Service Worker] Caching new resource: ${event.request.url}`);
              });

            return response;
          })
          .catch((fetchError) => {
            console.error(`[Service Worker] Fetch failed: ${event.request.url}`, fetchError);
            // Return offline page or fallback content if needed
            return caches.match('/offline.html');
          });
      })
  );
});

self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (!cacheWhitelist.includes(cacheName)) {
            console.log(`[Service Worker] Deleting old cache: ${cacheName}`);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[Service Worker] Claiming clients');
      return self.clients.claim();
    })
  );
});