// Casca de aplicativo: barra de abas (embaixo no celular, lateral no computador)
// e barra superior que ganha título quando o título grande sai da tela.
// Uso: <body class="app" data-tab="inicio"> e <script src="../assets/js/utils/app-shell.js" defer></script>
(function () {
  // Endereços calculados a partir deste arquivo: funciona em pages/ e em pages/ficha/
  var script = document.currentScript;
  var base = script ? script.src : location.href;
  var pagina = function (nome) { return new URL('../../../pages/' + nome, base).href; };
  var imagem = function (nome) { return new URL('../../images/' + nome, base).href; };

  var ABAS = [
    { id: 'inicio',     href: 'hub.html',            icone: 'bi-house',          iconeAtivo: 'bi-house-fill',          rotulo: 'Início' },
    { id: 'mural',      href: 'mural.html',          icone: 'bi-kanban',         iconeAtivo: 'bi-kanban-fill',         rotulo: 'Mural' },
    { id: 'fichas',     href: 'ficha-cadastro.html', icone: 'bi-clipboard-plus', iconeAtivo: 'bi-clipboard-plus-fill', rotulo: 'Fichas' },
    { id: 'protocolos', href: 'protocolos.html',     icone: 'bi-journal-text',   iconeAtivo: 'bi-journal-bookmark-fill', rotulo: 'Protocolos' },
    { id: 'conta',      href: 'conta.html',          icone: 'bi-person-circle',  iconeAtivo: 'bi-person-circle',       rotulo: 'Conta' }
  ];

  function montarAbas() {
    var atual = document.body.dataset.tab || '';
    var nav = document.createElement('nav');
    nav.className = 'tab-bar';
    nav.setAttribute('aria-label', 'Navegação principal');
    nav.innerHTML =
      '<a class="tab-bar-logo" href="' + pagina('hub.html') + '" aria-label="Início"><img src="' + imagem('logo-sv.png') + '" alt=""></a>' +
      ABAS.map(function (a) {
        var ativo = a.id === atual;
        return '<a class="tab' + (ativo ? ' is-active' : '') + '" href="' + pagina(a.href) + '"' +
          (ativo ? ' aria-current="page"' : '') + '>' +
          '<span class="tab-icone"><i class="bi ' + (ativo ? a.iconeAtivo : a.icone) + '"></i></span>' +
          '<span class="tab-rotulo">' + a.rotulo + '</span></a>';
      }).join('');
    document.body.appendChild(nav);
  }

  // Barra superior: sombra ao rolar e título pequeno quando o grande some
  function observarRolagem() {
    var barra = document.querySelector('.app-bar');
    if (!barra) return;
    var titulo = document.querySelector('.large-title');
    var atualizar = function () {
      barra.classList.toggle('is-scrolled', window.scrollY > 4);
      if (titulo) {
        var fim = titulo.getBoundingClientRect().bottom;
        barra.classList.toggle('show-title', fim < barra.getBoundingClientRect().bottom + 4);
      }
    };
    window.addEventListener('scroll', atualizar, { passive: true });
    atualizar();
  }

  function iniciar() {
    if (!document.body.classList.contains('app')) return;
    montarAbas();
    observarRolagem();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar);
  } else {
    iniciar();
  }
})();
