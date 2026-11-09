// Service worker — estratégia "rede primeiro": quando há internet, TODOS os arquivos do site
// (HTML, JS, CSS, imagens, PDFs) vêm sempre do servidor, revalidando o cache HTTP.
// Assim qualquer coisa enviada ao GitHub aparece na próxima abertura/recarga, sem precisar
// mudar a versão abaixo. O cache só é usado quando o aparelho está offline.
// Mude CACHE_NAME apenas se alterar este arquivo (o próprio sw.js).
const CACHE_NAME = 'cache-v2.0.0';
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
  // Ativa a nova versão imediatamente, sem esperar as abas antigas fecharem
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(
      ASSETS.map(url => new Request(url, { cache: 'reload' }))
    )).catch(err => console.warn('[SW] Falha ao pré-cachear alguns assets:', err))
  );
});

// ========== ATIVAÇÃO ==========
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(nomes => Promise.all(nomes.filter(n => n !== CACHE_NAME).map(n => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

// ========== INTERCEPTA REQUISIÇÕES ==========
self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  // Só arquivos do próprio site. Firebase/Firestore, CDNs etc. seguem direto para a rede.
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(redePrimeiro(request, event));
});

async function redePrimeiro(request, event) {
  try {
    let resposta;
    try {
      // 'no-cache' força revalidar com o servidor (ignora o cache HTTP do navegador)
      resposta = await fetch(new Request(request, { cache: 'no-cache' }));
    } catch (e) {
      if (e instanceof TypeError && !navigator.onLine) throw e;
      resposta = await fetch(request);
    }
    if (resposta && resposta.ok && resposta.type === 'basic') {
      const copia = resposta.clone();
      event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.put(request, copia)).catch(() => {}));
    }
    return resposta;
  } catch (erro) {
    const doCache = await caches.match(request, { ignoreSearch: request.mode === 'navigate' });
    if (doCache) return doCache;
    if (request.mode === 'navigate' || request.destination === 'document') {
      return (await caches.match(OFFLINE_PAGE)) || Response.error();
    }
    return Response.error();
  }
}

// ========== COMUNICAÇÃO COM A APLICAÇÃO ==========
self.addEventListener('message', (event) => {
  if (event.data === 'FORCE_UPDATE') self.skipWaiting();
});
