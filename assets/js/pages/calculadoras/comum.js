// Partes comuns das calculadoras (soroneutralização, vacinas, ELISA). Script clássico.
(function () {
  const ui = () => window.VirologiaUFSM;

  // Número no formato brasileiro
  function num(valor, casas = 2) {
    return Number(valor).toLocaleString('pt-BR', { maximumFractionDigits: casas });
  }

  // Aviso do sistema (cai no alert se ui.js não carregou)
  function avisar(tipo, titulo, texto) {
    if (ui()) ui().aviso({ tipo, titulo, texto });
    else alert(texto ? `${titulo}\n${texto}` : titulo);
  }

  // Marca o campo com erro (treme e fica vermelho) até a pessoa mexer nele
  function marcarErro(id) {
    const campo = document.getElementById(id)?.closest('.vu-campo');
    if (!campo) return;
    campo.classList.remove('tem-erro'); void campo.offsetWidth; campo.classList.add('tem-erro');
    campo.addEventListener('input', () => campo.classList.remove('tem-erro'), { once: true });
  }

  // Mostra o cartão de resultado; no celular, rola até ele
  function mostrar(resultado, vazio) {
    if (vazio) vazio.classList.add('vu-oculto');
    resultado.classList.remove('d-none');
    resultado.style.animation = 'none'; void resultado.offsetWidth; resultado.style.animation = '';
    if (ui()) ui().iniciar(resultado);
    if (window.matchMedia('(max-width: 899.98px)').matches) {
      resultado.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  // Esconde o resultado (ao trocar de tipo ou mudar os dados)
  function esconder(resultado, vazio) {
    resultado.classList.add('d-none');
    if (vazio) vazio.classList.remove('vu-oculto');
  }

  // Copia o texto e dá retorno no próprio botão
  async function copiar(texto, botao) {
    let ok = false;
    try {
      await navigator.clipboard.writeText(texto);
      ok = true;
    } catch (_) {
      const area = document.createElement('textarea');
      area.value = texto;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed'; area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      try { ok = document.execCommand('copy'); } catch (_) { ok = false; }
      area.remove();
    }
    if (!ok) {
      avisar('erro', 'Não foi possível copiar', 'Selecione o resultado e copie manualmente.');
      return false;
    }
    if (botao) {
      const antes = botao.innerHTML;
      botao.innerHTML = '<i class="bi bi-check2"></i> Copiado';
      setTimeout(() => { botao.innerHTML = antes; }, 2000);
    }
    avisar('ok', 'Resultado copiado');
    return true;
  }

  // Monta o cartão de resultado escuro.
  // { titulo, valor, texto, linhas: [[nome, valor]], grupos: [{ titulo, linhas }], idCopiar }
  function cartao(op) {
    const linhas = (lista) => `<ul class="vu-resultado-linhas">${lista.map(([nome, valor]) =>
      `<li><span>${nome}</span><code>${valor}</code></li>`).join('')}</ul>`;
    return `
      <p class="vu-sobrelinha">${op.titulo}</p>
      ${op.valor ? `<span class="vu-resultado-valor">${op.valor}</span>` : ''}
      ${op.texto ? `<p class="vu-resultado-texto">${op.texto}</p>` : ''}
      ${op.linhas ? linhas(op.linhas) : ''}
      ${(op.grupos || []).map(g => `<p class="vu-sobrelinha vu-resultado-grupo">${g.titulo}</p>${linhas(g.linhas)}`).join('')}
      ${op.depois || ''}
      <div class="vu-resultado-acoes">
        <button type="button" class="vu-btn vu-btn-lima" id="${op.idCopiar}"><i class="bi bi-clipboard"></i> Copiar</button>
      </div>`;
  }

  window.Calc = { num, avisar, marcarErro, mostrar, esconder, copiar, cartao };
})();
