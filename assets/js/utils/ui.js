/* Virologia UFSM — comportamentos dos componentes. Script clássico, sem dependências. Chame VirologiaUFSM.iniciar(raiz) depois de montar a tela. */
(function () {
  var calmo = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Números que contam: <span data-vu-contar="12">0</span>; prefixo/sufixo em data-vu-antes / data-vu-depois */
  function contar(el) {
    var alvo = parseFloat(el.getAttribute('data-vu-contar')) || 0;
    var antes = el.getAttribute('data-vu-antes') || '', depois = el.getAttribute('data-vu-depois') || '';
    if (calmo) { el.textContent = antes + alvo + depois; return; }
    var t0 = null, dur = 900;
    function passo(t) {
      if (!t0) t0 = t;
      var p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3);
      el.textContent = antes + Math.round(alvo * e) + depois;
      if (p < 1) requestAnimationFrame(passo);
    }
    requestAnimationFrame(passo);
  }

  /* Grupo com indicador deslizante: .vu-filtros (aria-pressed) */
  function filtros(raiz) {
    var marca = raiz.querySelector('.vu-filtros-marca');
    var itens = raiz.querySelectorAll('.vu-filtro');
    function mover(b) {
      if (!marca) return;
      marca.style.width = b.offsetWidth + 'px';
      marca.style.translate = (b.offsetLeft - 6) + 'px 0';
    }
    itens.forEach(function (b) {
      b.addEventListener('click', function () {
        itens.forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
        mover(b);
      });
    });
    var ativo = raiz.querySelector('.vu-filtro[aria-pressed="true"]') || itens[0];
    if (ativo) requestAnimationFrame(function () { mover(ativo); });
  }

  /* Barra de abas: .vu-abas com --ativa = índice da aba atual */
  function abas(raiz) {
    var itens = raiz.querySelectorAll('.vu-aba');
    itens.forEach(function (a, i) {
      a.addEventListener('click', function (ev) {
        var destino = a.getAttribute('href');
        if (!destino || destino === '#') ev.preventDefault(); // links reais navegam normalmente
        itens.forEach(function (x) { x.removeAttribute('aria-current'); });
        a.setAttribute('aria-current', 'page');
        raiz.style.setProperty('--ativa', i);
      });
    });
  }

  /* Contador + / −: .vu-contador com data-min, data-max, data-passo.
     O valor fica num <output> ou num <input> (aí dá para digitar também). */
  function contador(raiz) {
    var campo = raiz.querySelector('output, input');
    var min = +raiz.getAttribute('data-min') || 0, max = +raiz.getAttribute('data-max') || 999, passo = +raiz.getAttribute('data-passo') || 1;
    raiz.querySelectorAll('button').forEach(function (b) {
      b.addEventListener('click', function () {
        var v = Math.max(min, Math.min(max, (+campo.value || 0) + (b.hasAttribute('data-mais') ? passo : -passo)));
        campo.value = v;
        if (campo.tagName === 'OUTPUT') campo.textContent = v;
        else { campo.dispatchEvent(new Event('input', { bubbles: true })); campo.dispatchEvent(new Event('change', { bubbles: true })); }
        campo.classList.remove('mudou'); void campo.offsetWidth; campo.classList.add('mudou');
      });
    });
  }

  /* Opções tocáveis: .vu-opcao com aria-pressed; em .vu-opcoes[data-unica] só uma fica marcada */
  function opcoes(raiz) {
    var unica = raiz.hasAttribute('data-unica');
    raiz.querySelectorAll('.vu-opcao').forEach(function (b) {
      b.addEventListener('click', function () {
        if (unica) raiz.querySelectorAll('.vu-opcao').forEach(function (x) { x.setAttribute('aria-pressed', 'false'); });
        b.setAttribute('aria-pressed', unica ? 'true' : String(b.getAttribute('aria-pressed') !== 'true'));
      });
    });
  }

  /* Espelho: pílulas (.vu-opcoes ou .vu-filtros com data-espelho="idDoSelect")
     controlam um <select> escondido. Cada botão tem data-valor. A lógica antiga
     continua ouvindo o "change" do select, então nada mais precisa mudar. */
  function marcarEspelho(grupo) {
    var sel = document.getElementById(grupo.getAttribute('data-espelho'));
    if (!sel) return;
    var botoes = grupo.querySelectorAll('[data-valor]');
    botoes.forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-valor') === sel.value)); });
    var ativo = grupo.querySelector('[aria-pressed="true"]');
    var marca = grupo.querySelector('.vu-filtros-marca');
    if (marca && ativo) { marca.style.width = ativo.offsetWidth + 'px'; marca.style.translate = (ativo.offsetLeft - 6) + 'px 0'; }
  }
  function espelho(grupo) {
    var sel = document.getElementById(grupo.getAttribute('data-espelho'));
    if (!sel) return;
    grupo.querySelectorAll('[data-valor]').forEach(function (b) {
      b.addEventListener('click', function () {
        if (sel.value === b.getAttribute('data-valor')) return marcarEspelho(grupo);
        sel.value = b.getAttribute('data-valor');
        sel.dispatchEvent(new Event('input', { bubbles: true }));
        sel.dispatchEvent(new Event('change', { bubbles: true }));
        marcarEspelho(grupo);
      });
    });
    sel.addEventListener('change', function () { marcarEspelho(grupo); });
    requestAnimationFrame(function () { marcarEspelho(grupo); });
  }
  function sincronizarEspelhos(raiz) {
    (raiz || document).querySelectorAll('[data-espelho]').forEach(marcarEspelho);
  }

  /* Folha de confirmação: substitui o confirm() do navegador.
     VirologiaUFSM.confirmar({ titulo, texto, sim, nao, perigo, icone }) → Promise<boolean> */
  function confirmar(op) {
    op = typeof op === 'string' ? { titulo: op } : (op || {});
    return new Promise(function (resolver) {
      var antes = document.activeElement;
      var fundo = document.createElement('div');
      fundo.className = 'vu-folha-fundo';
      fundo.innerHTML =
        '<div class="vu-folha" role="dialog" aria-modal="true" aria-labelledby="vu-folha-titulo">' +
        (op.icone !== false ? '<span class="vu-folha-icone' + (op.perigo ? '' : ' vu-folha-icone--ok') + '"><i class="bi ' + (op.icone || (op.perigo ? 'bi-trash3' : 'bi-question-circle')) + '"></i></span>' : '') +
        '<h3 id="vu-folha-titulo"></h3>' + (op.texto ? '<p></p>' : '') +
        '<div class="vu-folha-acoes">' +
        '<button type="button" class="vu-btn ' + (op.perigo ? 'vu-btn-perigo' : 'vu-btn-principal') + ' vu-btn-largo" data-sim></button>' +
        '<button type="button" class="vu-btn vu-btn-fantasma vu-btn-largo" data-nao></button>' +
        '</div></div>';
      fundo.querySelector('h3').textContent = op.titulo || 'Tem certeza?';
      if (op.texto) fundo.querySelector('p').textContent = op.texto;
      fundo.querySelector('[data-sim]').textContent = op.sim || 'Sim, continuar';
      fundo.querySelector('[data-nao]').textContent = op.nao || 'Cancelar';
      function fechar(r) {
        document.removeEventListener('keydown', tecla);
        fundo.classList.add('saindo');
        setTimeout(function () { fundo.remove(); if (antes && antes.focus) antes.focus(); }, calmo ? 0 : 200);
        resolver(r);
      }
      function tecla(e) { if (e.key === 'Escape') fechar(false); }
      fundo.querySelector('[data-sim]').addEventListener('click', function () { fechar(true); });
      fundo.querySelector('[data-nao]').addEventListener('click', function () { fechar(false); });
      fundo.addEventListener('click', function (e) { if (e.target === fundo) fechar(false); });
      document.addEventListener('keydown', tecla);
      document.body.appendChild(fundo);
      fundo.querySelector('[data-nao]').focus();
    });
  }

  /* Aviso no topo da tela: VirologiaUFSM.aviso({ tipo: 'ok'|'erro'|'info'|'atencao', titulo, texto }) */
  function aviso(op) {
    var lista = document.querySelector('.vu-avisos-tela');
    if (!lista) { lista = document.createElement('div'); lista.className = 'vu-avisos-tela'; lista.setAttribute('aria-live', 'polite'); document.body.appendChild(lista); }
    var tipo = op.tipo || 'info';
    var icones = { ok: 'bi-check2', erro: 'bi-exclamation-circle', info: 'bi-info-circle', atencao: 'bi-exclamation-triangle' };
    var el = document.createElement('div');
    el.className = 'vu-aviso vu-aviso-' + tipo;
    el.setAttribute('role', tipo === 'erro' ? 'alert' : 'status');
    el.innerHTML = '<span class="vu-aviso-icone"><i class="bi ' + icones[tipo] + '"></i></span><div><p class="vu-aviso-titulo"></p><p class="vu-aviso-texto"></p></div>' +
      '<button type="button" class="vu-aviso-fechar" aria-label="Fechar aviso"><i class="bi bi-x-lg"></i></button>' + (tipo === 'erro' ? '' : '<span class="vu-aviso-tempo"></span>');
    el.querySelector('.vu-aviso-titulo').textContent = op.titulo || '';
    el.querySelector('.vu-aviso-texto').textContent = op.texto || '';
    if (!op.texto) el.querySelector('.vu-aviso-texto').remove();
    function fechar() { el.classList.add('saindo'); setTimeout(function () { el.remove(); }, 250); }
    el.querySelector('.vu-aviso-fechar').addEventListener('click', fechar);
    if (tipo !== 'erro') setTimeout(fechar, 4000);
    lista.appendChild(el);
    return el;
  }

  /* Carregando: microplaca que enche. Só aparece se a espera passar de meio segundo. */
  var esperas = 0, timerCarregando = null;
  function carregando(ligar, frase) {
    esperas = Math.max(0, esperas + (ligar ? 1 : -1));
    var tela = document.querySelector('.vu-carregando-tela');
    if (esperas > 0) {
      if (tela || timerCarregando) return;
      timerCarregando = setTimeout(function () {
        timerCarregando = null;
        if (esperas === 0 || document.querySelector('.vu-carregando-tela')) return;
        var t = document.createElement('div');
        t.className = 'vu-carregando-tela';
        var pocos = '';
        for (var i = 0; i < 12; i++) pocos += '<i style="--d:' + i + '"></i>';
        t.innerHTML = '<div class="vu-carregando" role="status"><div class="vu-placa">' + pocos + '</div><span></span></div>';
        t.querySelector('span').textContent = frase || 'Carregando…';
        document.body.appendChild(t);
      }, 500);
    } else {
      clearTimeout(timerCarregando); timerCarregando = null;
      if (tela) tela.remove();
    }
  }

  function iniciar(raiz) {
    raiz = raiz || document;
    raiz.querySelectorAll('[data-vu-contar]').forEach(contar);
    raiz.querySelectorAll('.vu-filtros:not([data-espelho])').forEach(filtros);
    raiz.querySelectorAll('.vu-abas').forEach(abas);
    raiz.querySelectorAll('.vu-contador').forEach(contador);
    raiz.querySelectorAll('.vu-opcoes:not([data-espelho])').forEach(opcoes);
    raiz.querySelectorAll('[data-espelho]').forEach(espelho);
  }

  window.VirologiaUFSM = {
    iniciar: iniciar, contar: contar, confirmar: confirmar, aviso: aviso,
    carregando: carregando, sincronizarEspelhos: sincronizarEspelhos
  };
})();
