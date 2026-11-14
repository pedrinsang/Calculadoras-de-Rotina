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

  /* Contador + / −: .vu-contador com data-min, data-max, data-passo */
  function contador(raiz) {
    var out = raiz.querySelector('output');
    var min = +raiz.getAttribute('data-min') || 0, max = +raiz.getAttribute('data-max') || 999, passo = +raiz.getAttribute('data-passo') || 1;
    raiz.querySelectorAll('button').forEach(function (b) {
      b.addEventListener('click', function () {
        var v = Math.max(min, Math.min(max, (+out.value || 0) + (b.hasAttribute('data-mais') ? passo : -passo)));
        out.value = v; out.textContent = v;
        out.classList.remove('mudou'); void out.offsetWidth; out.classList.add('mudou');
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

  function iniciar(raiz) {
    raiz = raiz || document;
    raiz.querySelectorAll('[data-vu-contar]').forEach(contar);
    raiz.querySelectorAll('.vu-filtros').forEach(filtros);
    raiz.querySelectorAll('.vu-abas').forEach(abas);
    raiz.querySelectorAll('.vu-contador').forEach(contador);
    raiz.querySelectorAll('.vu-opcoes').forEach(opcoes);
  }

  window.VirologiaUFSM = { iniciar: iniciar, contar: contar };
})();
