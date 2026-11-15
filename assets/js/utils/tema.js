/* Tema claro/escuro. Carregar no <head>, antes dos estilos, sem defer: aplica o tema antes de pintar.
   Escolha salva em localStorage 'vu-tema': 'auto' (segue o aparelho), 'claro' ou 'escuro'. */
(function () {
  var CHAVE = 'vu-tema';
  var raiz = document.documentElement;
  var midia = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  var COR_BARRA = { claro: '#f3f6ee', escuro: '#0b1510' };

  function escolha() {
    try { var v = localStorage.getItem(CHAVE); if (v === 'claro' || v === 'escuro') return v; } catch (e) {}
    return 'auto';
  }
  function efetivo(e) {
    if (e === 'claro' || e === 'escuro') return e;
    return midia && midia.matches ? 'escuro' : 'claro';
  }
  function aplicar() {
    var e = escolha(), t = efetivo(e);
    if (e === 'auto') raiz.removeAttribute('data-tema'); else raiz.setAttribute('data-tema', e);
    raiz.setAttribute('data-bs-theme', t === 'escuro' ? 'dark' : 'light');
    raiz.style.colorScheme = t === 'escuro' ? 'dark' : 'light';
    var metas = document.querySelectorAll('meta[name="theme-color"]');
    if (!metas.length && document.head) {
      var m = document.createElement('meta'); m.name = 'theme-color'; document.head.appendChild(m); metas = [m];
    }
    for (var i = 0; i < metas.length; i++) metas[i].setAttribute('content', COR_BARRA[t]);
    return t;
  }

  aplicar();
  document.addEventListener('DOMContentLoaded', aplicar);
  if (midia) {
    var mudou = function () { if (escolha() === 'auto') aplicar(); };
    if (midia.addEventListener) midia.addEventListener('change', mudou); else if (midia.addListener) midia.addListener(mudou);
  }
  // Outra aba mudou o tema
  window.addEventListener('storage', function (ev) { if (ev.key === CHAVE) aplicar(); });

  window.VirologiaTema = {
    escolha: escolha,
    atual: function () { return efetivo(escolha()); },
    definir: function (v) {
      try { if (v === 'claro' || v === 'escuro') localStorage.setItem(CHAVE, v); else localStorage.removeItem(CHAVE); } catch (e) {}
      return aplicar();
    }
  };
})();
