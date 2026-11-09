// Mantém o app sempre na última versão publicada no GitHub, em TODAS as páginas
// (importado por assets/js/firebase.js, que toda página carrega).
//
// 1. Registra o service worker (sw.js), que busca tudo da rede primeiro.
// 2. Quando um sw.js novo assume o controle, recarrega a página.
// 3. Em páginas que ficam abertas muito tempo (PWA em segundo plano), confere de tempos em tempos
//    e ao voltar para o app se os arquivos desta página mudaram no servidor (ETag/Last-Modified).
//    Se mudaram, recarrega sozinho — ou, se a pessoa já digitou algo na página, mostra um aviso
//    com botão "Atualizar" para não perder o que foi preenchido.

// este arquivo fica em assets/js/utils/ → raiz do site = três níveis acima
const SW_URL = new URL('../../../sw.js', import.meta.url);
const ESCOPO = new URL('../../../', import.meta.url);
const INTERVALO_VERIFICACAO = 10 * 60 * 1000; // 10 min
const AUSENCIA_MINIMA = 60 * 1000;            // ao voltar para o app depois de 1 min fora

let paginaEditada = false;
let assinaturaInicial = null;
let ultimaVerificacao = 0;
let escondidaDesde = 0;
let avisoMostrado = false;

function recarregar() {
    window.location.reload();
}

function mostrarAviso() {
    if (avisoMostrado) return;
    avisoMostrado = true;
    const barra = document.createElement('div');
    barra.setAttribute('role', 'status');
    barra.style.cssText = [
        'position:fixed', 'left:50%', 'bottom:16px', 'transform:translateX(-50%)', 'z-index:99999',
        'display:flex', 'gap:12px', 'align-items:center', 'max-width:calc(100% - 32px)',
        'background:#1f2937', 'color:#fff', 'padding:10px 14px', 'border-radius:10px',
        'box-shadow:0 6px 20px rgba(0,0,0,.25)', 'font:14px/1.3 system-ui,sans-serif'
    ].join(';');
    barra.innerHTML = '<span>Há uma nova versão do app. Salve o que estiver fazendo e atualize.</span>';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = 'Atualizar';
    btn.style.cssText = 'background:#22c55e;color:#fff;border:0;border-radius:8px;padding:6px 12px;font-weight:600;cursor:pointer;white-space:nowrap';
    btn.addEventListener('click', recarregar);
    barra.appendChild(btn);
    document.body.appendChild(barra);
}

function aplicarAtualizacao() {
    if (paginaEditada) mostrarAviso();
    else recarregar();
}

// ---------- 1 e 2: service worker ----------
function registrarSW() {
    if (!('serviceWorker' in navigator)) return null;
    const tinhaControlador = !!navigator.serviceWorker.controller;
    let trocando = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        // Na primeira instalação a página já veio da rede: não precisa recarregar
        if (!tinhaControlador || trocando) return;
        trocando = true;
        aplicarAtualizacao();
    });
    return navigator.serviceWorker
        .register(SW_URL.href, { scope: ESCOPO.pathname, updateViaCache: 'none' })
        .catch(err => { console.warn('[App] Falha ao registrar o service worker:', err); return null; });
}

// ---------- 3: arquivos desta página mudaram no servidor? ----------
function arquivosDaPagina() {
    const urls = new Set([location.href.split('#')[0]]);
    try {
        performance.getEntriesByType('resource').forEach(e => {
            const u = new URL(e.name);
            if (u.origin === location.origin && /\.(js|css|html)$/i.test(u.pathname)) urls.add(u.href);
        });
    } catch { /* sem Resource Timing */ }
    return [...urls];
}

async function assinatura() {
    const partes = await Promise.all(arquivosDaPagina().map(async url => {
        try {
            const r = await fetch(url, { method: 'HEAD', cache: 'no-store' });
            if (!r.ok) return '';
            return `${url}|${r.headers.get('etag') || ''}|${r.headers.get('last-modified') || ''}`;
        } catch { return null; } // offline: não dá para comparar
    }));
    if (partes.some(p => p === null)) return null;
    return partes.sort().join('\n');
}

async function verificarVersao(registro) {
    if (!navigator.onLine || Date.now() - ultimaVerificacao < 30 * 1000) return;
    ultimaVerificacao = Date.now();
    registro?.update?.().catch(() => {});
    const atual = await assinatura();
    if (!atual) return;
    if (!assinaturaInicial) { assinaturaInicial = atual; return; }
    if (atual !== assinaturaInicial) aplicarAtualizacao();
}

function iniciar() {
    // Qualquer digitação marca a página como "em edição" (não recarrega sozinha)
    document.addEventListener('input', () => { paginaEditada = true; }, true);

    const registroPromise = registrarSW() || Promise.resolve(null);

    registroPromise.then(registro => {
        // Guarda a assinatura dos arquivos depois que a página terminou de carregar
        setTimeout(() => verificarVersao(registro), 5000);
        setInterval(() => { if (!document.hidden) verificarVersao(registro); }, INTERVALO_VERIFICACAO);
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) { escondidaDesde = Date.now(); return; }
            if (escondidaDesde && Date.now() - escondidaDesde >= AUSENCIA_MINIMA) {
                ultimaVerificacao = 0;
                verificarVersao(registro);
            }
        });
    });
}

if (typeof window !== 'undefined' && !window.__atualizacaoAppIniciada) {
    window.__atualizacaoAppIniciada = true;
    if (document.readyState === 'complete') iniciar();
    else window.addEventListener('load', iniciar, { once: true });
}
