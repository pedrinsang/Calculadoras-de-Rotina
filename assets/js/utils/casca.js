// Casca do app para as páginas antigas: barra lateral (computador) e abas (celular).
// Move o conteúdo da página para dentro da casca sem recriar nenhum elemento,
// então os IDs e eventos que cada página usa continuam funcionando.
// Carregue como módulo ANTES do script da página.
import { signOut } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";
import { auth } from "../firebase.js";

const corpo = document.body;
const naPastaFicha = location.pathname.includes('/pages/ficha/');
const base = naPastaFicha ? '../' : '';
const raiz = naPastaFicha ? '../../' : '../';
const arquivo = (location.pathname.split('/').pop() || '').replace('.html', '');

// Qual item fica marcado
const chaves = {
  hub: 'inicio', mural: 'mural', historico: 'historico', 'ficha-cadastro': 'fichas',
  soroneutralizacao: 'sn', vacinas: 'vacinas', elisa: 'elisa', protocolos: 'protocolos',
  admin: 'admin', conta: 'conta'
};
const atual = naPastaFicha ? 'fichas' : (chaves[arquivo] || '');
const abaAtiva = { mural: 1, historico: 1, fichas: 2, conta: 3 }[atual] ?? 0;

const nav = (chave, href, icone, nome, extra = '') =>
  `<a class="vu-nav${chave === 'admin' ? ' so-admin' : ''}" href="${base}${href}"${chave === atual ? ' aria-current="page"' : ''}${chave === 'admin' ? ' hidden' : ''}><i class="bi ${icone} vu-ico"></i>${nome}${extra}</a>`;

const lateral = `
<aside class="vu-lateral" aria-label="Menu principal">
  <div class="vu-lateral-marca"><img src="${raiz}assets/images/logo-sv.png" alt=""><div><b>Virologia UFSM</b><small>Setor de Virologia</small></div></div>
  ${nav('inicio', 'hub.html', 'bi-house', 'Início')}
  ${nav('mural', 'mural.html', 'bi-kanban', 'Mural')}
  ${nav('fichas', 'ficha-cadastro.html', 'bi-clipboard2-pulse', 'Fichas')}
  ${nav('historico', 'historico.html', 'bi-clock-history', 'Histórico')}
  <p class="vu-sobrelinha">Calculadoras</p>
  ${nav('sn', 'soroneutralizacao.html', 'bi-calculator', 'Soroneutralização')}
  ${nav('vacinas', 'vacinas.html', 'bi-droplet', 'Vacinas')}
  ${nav('elisa', 'elisa.html', 'bi-eyedropper', 'ELISA')}
  <p class="vu-sobrelinha">Consulta</p>
  ${nav('protocolos', 'protocolos.html', 'bi-journal-text', 'Protocolos')}
  ${nav('admin', 'admin.html', 'bi-shield-check', 'Administração')}
  <div class="vu-lateral-pe">
    <span class="vu-avatar" data-iniciais>··</span>
    <div><b data-nome></b><a href="${base}conta.html"${atual === 'conta' ? ' aria-current="page"' : ''}>Minha conta</a></div>
    <button type="button" class="vu-btn" data-sair aria-label="Sair da conta" title="Sair da conta"><i class="bi bi-box-arrow-right"></i></button>
  </div>
</aside>`;

const aba = (i, href, icone, nome) =>
  `<a class="vu-aba" href="${base}${href}"${i === abaAtiva ? ' aria-current="page"' : ''}><i class="bi ${icone} vu-ico"></i>${nome}</a>`;
const abas = `
<nav class="vu-abas vu-abas-fixa" style="--ativa:${abaAtiva}" aria-label="Navegação">
  <span class="vu-abas-marca"></span>
  ${aba(0, 'hub.html', 'bi-house', 'Início')}
  ${aba(1, 'mural.html', 'bi-kanban', 'Mural')}
  ${aba(2, 'ficha-cadastro.html', 'bi-clipboard2-pulse', 'Fichas')}
  ${aba(3, 'conta.html', 'bi-person', 'Conta')}
</nav>`;

// Monta a casca e muda o conteúdo da página para dentro dela
corpo.classList.add('vu-app', 'vu-antiga');
const casca = document.createElement('div');
casca.className = 'vu-casca';
casca.innerHTML = lateral;
const main = document.createElement('main');
main.className = 'vu-casca-main';
[...corpo.childNodes].forEach(no => { if (no.nodeName !== 'SCRIPT') main.appendChild(no); });
casca.appendChild(main);
corpo.prepend(casca);
corpo.insertAdjacentHTML('beforeend', abas);

// Botões de "voltar ao hub" e logos repetidos ficam escondidos (a navegação já está na casca).
// Continuam na página porque os scripts ainda procuram por eles.
main.querySelectorAll('#voltar-hub, #hub-button, #acessar-mural, #mural-button, .back-button-container').forEach(el => el.classList.add('vu-oculto'));
main.querySelectorAll('img.logo').forEach(img => {
  if (/logo-sv|logo-sv-2/.test(img.getAttribute('src') || '')) img.classList.add('vu-oculto');
});

// Usuário (o que já está guardado no aparelho)
try {
  const u = JSON.parse(localStorage.getItem('usuario') || sessionStorage.getItem('usuario') || '{}');
  if (u?.nome) {
    const nome = u.nome.trim();
    const iniciais = (u.sigla || nome.split(/\s+/).map(p => p[0]).join('')).slice(0, 2).toUpperCase();
    casca.querySelectorAll('[data-nome]').forEach(el => { el.textContent = nome; });
    casca.querySelectorAll('[data-iniciais]').forEach(el => { el.textContent = iniciais; });
  }
  casca.querySelectorAll('.so-admin').forEach(el => { el.hidden = u?.role !== 'admin'; });
} catch (_) { /* sem dados guardados: a casca fica genérica */ }

// Sair da conta
casca.querySelectorAll('[data-sair]').forEach(botao => {
  botao.addEventListener('click', async () => {
    try {
      localStorage.removeItem('usuario');
      localStorage.removeItem('manterConectado');
      sessionStorage.removeItem('usuario');
      await signOut(auth);
      location.href = `${raiz}index.html?logout=true`;
    } catch (erro) {
      alert('Não foi possível sair: ' + erro.message);
    }
  });
});
