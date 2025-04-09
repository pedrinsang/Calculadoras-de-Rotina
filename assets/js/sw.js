const CACHE_NAME = 'Cache-alpha1.2'; // Atualizei a versão
const OFFLINE_PAGE = './pages/offline.html';
const ASSETS = [
  './',
  '/index.html',
  '/pages/hub.html',
  '/pages/soroneutralizacao.html',
  '/pages/vacinas.html',
  '/pages/elisa.html',
  '/pages/protocolos.html',
  '/icons/icon-72x72.png',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/assets/images/logo.png',
  '/manifest.json',
  '/icons/favicon.ico',
  OFFLINE_PAGE
];

// Lista de todos os PDFs de protocolos
const PROTOCOLOS_PDFS = [
  '../protocolos/Meios de Cultivo.pdf',
  '../protocolos/Cultivo Celular Primário.pdf',
  '../protocolos/Manutencao-Congelamento-Descongelamento.pdf',
  '../protocolos/Contagem Celular.pdf',
  '../protocolos/Determinação da viabilidade celular.pdf',
  '../protocolos/MTT.pdf',
  '../protocolos/Inoculação em ovo embrionado.pdf',
  '../protocolos/Preparação de crostas para microscopia.pdf',
  '../protocolos/Preparação de fezes para microscopia.pdf',
  '../protocolos/Separação da capa flogística.pdf',
  '../protocolos/Isolamento viral em cultivo celular.pdf',
  '../protocolos/Amplificação viral (estoque).pdf',
  '../protocolos/Inativação viral com BEI (Etilenamina Binária).pdf',
  '../protocolos/Ultracentrifugação de vírus.pdf',
  '../protocolos/Contagem de vírus por ensaio de placa.pdf',
  '../protocolos/Titulação viral em microplacas de 96 cavidades.pdf',
  '../protocolos/Titulação viral por PFU.pdf',
  '../protocolos/Liofilização.pdf',
  '../protocolos/Imunoperoxidase em cultivo celular.pdf',
  '../protocolos/Preparação de lâminas para o controle positivo e negativo de imunofluorescência.pdf',
  '../protocolos/Imunofluorescência (IFA).pdf',
  '../protocolos/Processamento de tecidos para imuno-histoquímica.pdf',
  '../protocolos/Imuno-histoquímica.pdf',
  '../protocolos/Separação de soro e inativação do complemento.pdf',
  '../protocolos/Coagulação por glutaraldeído.pdf',
  '../protocolos/Turvação por sulfato de zinco.pdf',
  '../protocolos/Determinação de imunoglobulinas no colostro.pdf',
  '../protocolos/Hemaglutinação e inibição da hemaglutinação para o vírus da influenza equina.pdf',
  '../protocolos/Hemaglutinação e inibição da hemaglutinação para o parvovírus suíno.pdf',
  '../protocolos/Hemaglutinação para parvovírus bovino.pdf',
  '../protocolos/Hemaglutinação e inibição da hemaglutinação para parvovírus canino.pdf',
  '../protocolos/Soroneutralizacao.pdf',
  '../protocolos/Imunodifusão.pdf',
  '../protocolos/Vacinas papilomatose.pdf',
  '../protocolos/Diagnóstico de raiva.pdf',
  '../protocolos/Extração de DNA.pdf',
  '../protocolos/Extração de DNA com Fenol-Clorofórmio.pdf',
  '../protocolos/Precipitação de DNA por Etanol.pdf',
  '../protocolos/Extração de DNA de plasmídeo.pdf',
  '../protocolos/Extração de plasmídeo (Microprep. de 50μL de cultura).pdf',
  '../protocolos/Extração de DNA plasmidial (Miniprep).pdf',
  '../protocolos/Extração de DNA plasmidial (Midiprep).pdf',
  '../protocolos/Extração de DNA viral.pdf',
  '../protocolos/Cuidados necessários para se trabalhar com RNA.pdf',
  '../protocolos/Extração de RNA (Tirzo)pdf',
  '../protocolos/Preparação de bactérias competentes.pdf',
  '../protocolos/Transformação rápida de bactérias com plasmídeo.pdf',
  '../protocolos/Transferção de DNA por eletroporação.pdf',
  '../protocolos/Digestação de DNA com endonuclease.pdf',
  '../protocolos/Dosagem de proteína – Coomasie blue.pdf',
  '../protocolos/Reação em cadeia da polimerase (PCR).pdf',
  '../protocolos/Descarte de material da biologia molecular.pdf',
  '../protocolos/Protocolos de limpeza e esterilização.pdf',
  '../protocolos/Protocolo de utilização das autoclaves.pdf',
  '../protocolos/Protocolo de utilização do forno de esterilização.pdf',
  '../protocolos/Limpeza e descarte do material utilizado na biologia molecular.pdf',
  '../protocolos/Limpeza das estufas de CO2.pdf',
  '../protocolos/Limpeza dos banhos-maria.pdf',
  '../protocolos/Limpeza dos fluxos laminares.pdf',
  '../protocolos/Soluções extras.pdf'
];

// ========== INSTALAÇÃO ==========
self.addEventListener('install', (event) => {
  self.skipWaiting(); // Força ativação imediata
  console.log(`[SW] Instalando nova versão: ${CACHE_NAME}`);

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        // Cache dos assets principais primeiro
        return cache.addAll(ASSETS.map(url => new Request(url, { cache: 'reload' })))
          .then(() => {
            // Adiciona PDFs em background sem bloquear a instalação
            return cache.addAll(PROTOCOLOS_PDFS).catch(error => {
              console.warn('[SW] Alguns PDFs não foram cacheados:', error);
            });
          });
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
    // Primeiro tenta buscar do cache
    const cachedResponse = await caches.match(request);

    // Se estiver online, faz fetch para atualizar o cache
    if (navigator.onLine) {
      const fetchPromise = fetch(request).then(networkResponse => {
        // Atualiza o cache em background
        caches.open(CACHE_NAME).then(cache => {
          cache.put(request, networkResponse.clone());
        });
        return networkResponse;
      }).catch(() => cachedResponse); // Se falhar, usa o cache

      // Retorna do cache imediatamente enquanto atualiza em background
      return cachedResponse || fetchPromise;
    }

    // Offline - retorna do cache ou página offline
    return cachedResponse || caches.match(OFFLINE_PAGE);
  } catch (error) {
    console.error('[SW] Erro na estratégia de PDF:', error);
    return caches.match(OFFLINE_PAGE);
  }
}

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
