// Aviso do endereço alternativo (Vercel).
// Algumas redes (como a da UFSM) bloqueiam o github.io. Quem já usou o site tem uma cópia
// guardada pelo service worker; esta cópia abre mesmo com o bloqueio e mostra o link novo.
// Só age no github.io, com internet, quando o servidor não responde.
(function () {
  var NOVO = 'https://rotina-labs.vercel.app/';
  if (!location.hostname.endsWith('github.io') || !navigator.onLine) return;

  function mostrar() {
    if (document.getElementById('aviso-endereco-novo')) return;
    var caminho = location.pathname.replace(/^\/(Calculadoras-de-Rotina\/?)?/, '');
    var destino = NOVO + caminho + location.search + location.hash;
    var aviso = document.createElement('div');
    aviso.id = 'aviso-endereco-novo';
    aviso.setAttribute('role', 'alert');
    aviso.style.cssText = 'position:fixed;left:12px;right:12px;bottom:calc(84px + env(safe-area-inset-bottom));z-index:99999;' +
      'max-width:480px;margin:0 auto;padding:14px 16px;border-radius:16px;background:#8a5200;color:#fff;' +
      'font:600 15px/1.4 system-ui,sans-serif;box-shadow:0 12px 30px -10px rgba(0,0,0,.5);text-align:center';
    aviso.innerHTML = 'Esta rede está bloqueando o endereço do site.<br>' +
      '<a style="display:inline-block;margin-top:8px;padding:8px 16px;border-radius:10px;background:#fff;color:#5c3700;text-decoration:none">' +
      'Abrir em rotina-labs.vercel.app</a>';
    aviso.querySelector('a').href = destino;
    (document.body || document.documentElement).appendChild(aviso);
  }

  // Endereço com "?" nunca vem do cache do service worker: se falhar, o servidor está inacessível
  var controle = new AbortController();
  var prazo = setTimeout(function () { controle.abort(); }, 10000);
  fetch('https://' + location.host + '/Calculadoras-de-Rotina/manifest.json?ping=' + Date.now(), { cache: 'no-store', signal: controle.signal })
    .then(function (r) { clearTimeout(prazo); if (!r.ok) throw 0; })
    .catch(function () {
      clearTimeout(prazo);
      if (!navigator.onLine) return;
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mostrar);
      else mostrar();
    });
})();
