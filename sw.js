const CACHE_NAME = 'virologia-cache-v5'; // ⚠️ Altere este número SEMPRE que atualizar os arquivos!
const OFFLINE_PAGE = './offline.html';
const ASSETS = [
  './',
  './index.html',
  './hub.html',
  './soroneutralizacao.html',
  './vacinas.html',
  './elisa.html',
  './icons/icon-72x72.png',
  './icons/icon-192x192.png',
  './icons/icon-512x512.png',
  './images/logo-sv-2.png',
  './manifest.json',
  './favicon.ico',
  OFFLINE_PAGE
];

// ========== INSTALAÇÃO ==========
self.addEventListener('install', (event) => {
  self.skipWaiting(); // Força ativação imediata
  console.log(`[SW] Instalando nova versão: ${CACHE_NAME}`);

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        // Tenta buscar todos os assets da rede primeiro
        return cache.addAll(ASSETS.map(url => new Request(url, { cache: 'reload' })));
      })
      .catch(error => {
        console.error('[SW] Falha na instalação:', error);
      })
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
  // Estratégia para outros assets
  else {
    event.respondWith(
      cacheFirstThenNetwork(event.request)
    );
  }
});

// ========== ATIVAÇÃO ==========
self.addEventListener('activate', (event) => {
  console.log(`[SW] Versão ativada: ${CACHE_NAME}`);
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log(`[SW] Removendo cache antigo: ${cacheName}`);
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
    return cachedResponse || caches.match(OFFLINE_PAGE);
  }
}

async function cacheFirstThenNetwork(request) {
  const cachedResponse = await caches.match(request);
  
  // Atualiza o cache em background
  if (navigator.onLine) {
    fetch(request).then(networkResponse => {
      caches.open(CACHE_NAME).then(cache => cache.put(request, networkResponse));
    });
  }
  
  return cachedResponse || fetch(request);
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
    self.clients.claim();
  }
});