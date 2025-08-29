const CACHE_NAME = 'cache-v1.2.2'; // atualize quando mudar assets
const OFFLINE_PAGE = './pages/offline.html';
// Use caminhos relativos ao escopo para funcionar em subpaths
const ASSETS = [
  './',
  './index.html',
  './pages/hub.html',
  './pages/soroneutralizacao.html',
  './pages/vacinas.html',
  './pages/elisa.html',
  './pages/protocolos.html',
  './icons/icon-72x72.png',
  './icons/icon-192x192.png',
  './icons/icon-512x512.png',
  './assets/images/logo.png',
  './manifest.json',
  './icons/favicon.ico',
  OFFLINE_PAGE
];

// ========== INSTALAÇÃO ==========
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(
      ASSETS.map(url => new Request(url, { cache: 'reload' }))
    )).catch(err => console.warn('[SW] Falha ao pré-cachear alguns assets:', err))
  );
});

// ========== INTERCEPTA REQUISIÇÕES ==========
self.addEventListener('fetch', (event) => {
  // Ignora requisições não-GET e extensões do Chrome
  if (event.request.method !== 'GET' || event.request.url.startsWith('chrome-extension://')) return;

  const requestUrl = new URL(event.request.url);

  // Estratégia para páginas HTML
  if (event.request.destination === 'document') {
    event.respondWith(
      networkFirstThenCache(event.request)
    );
  }
  // Estratégia para PDFs - Cache First com atualização em background
  else if (event.request.url.endsWith('.pdf')) {
    event.respondWith(
      pdfCacheStrategy(event.request)
    );
  }
  // Estratégia para outros assets
  else {
    event.respondWith(
      cacheFirstThenNetwork(event.request)
    );
  }
});

// ========== ESTRATÉGIA PARA PDFs ==========
async function pdfCacheStrategy(request) {
  try {
    // Tenta buscar do cache primeiro para resposta rápida
    const cachedResponse = await caches.match(request);

    // Em paralelo, tenta buscar da rede para atualizar cache
    const networkFetch = fetch(request).then(networkResponse => {
      caches.open(CACHE_NAME).then(cache => cache.put(request, networkResponse.clone()));
      return networkResponse;
    }).catch(() => null);

    // Se havia cache, retorna-o imediatamente; caso contrário, aguarda rede
    if (cachedResponse) return cachedResponse;
    const networkResponse = await networkFetch;
    return networkResponse || caches.match(OFFLINE_PAGE);
  } catch (error) {
    console.error('[SW] Erro na estratégia de PDF:', error);
    return caches.match(OFFLINE_PAGE);
  }
}

// ========== ATIVAÇÃO ==========
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Força todos os clients a usar o novo SW
      return self.clients.claim();
    })
  );

  // Notifica todos os clients sobre a atualização
  notifyClients();
});

// ========== FUNÇÕES AUXILIARES ==========
async function networkFirstThenCache(request) {
  try {
    // Tenta buscar da rede
    const networkResponse = await fetch(request);

    // Atualiza o cache em background
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, networkResponse.clone());

    return networkResponse;
  } catch (error) {
    // Retorna do cache ou página offline
    const cachedResponse = await caches.match(request);
  // para navegadores que não respeitam destination, garanta offline para docs
  if (cachedResponse) return cachedResponse;
  if (request.mode === 'navigate') return caches.match(OFFLINE_PAGE);
  return caches.match(OFFLINE_PAGE);
  }
}

async function cacheFirstThenNetwork(request) {
  const cachedResponse = await caches.match(request);

  // Atualiza o cache em background (sem depender de navigator.onLine)
  fetch(request).then(networkResponse => {
    caches.open(CACHE_NAME).then(cache => cache.put(request, networkResponse.clone()));
  }).catch(() => {});

  return cachedResponse || fetch(request).catch(() => caches.match(OFFLINE_PAGE));
}

function notifyClients() {
  self.clients.matchAll({ type: 'window' }).then(clients => {
    clients.forEach(client => {
      client.postMessage({
        type: 'APP_UPDATE',
        version: CACHE_NAME,
        message: 'Nova versão disponível!',
        timestamp: Date.now()
      });
    });
  });
}

// ========== COMUNICAÇÃO COM A APLICAÇÃO ==========
self.addEventListener('message', (event) => {
  if (event.data === 'FORCE_UPDATE') {
  self.skipWaiting();
  }
});
