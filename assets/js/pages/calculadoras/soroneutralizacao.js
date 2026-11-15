document.addEventListener('DOMContentLoaded', function() {
  console.log("Desenvolvido por Pedro Ruiz Sangoi e Alexandre Werle Soares, com auxílio do DeepSeek Chat.");

  // Event listeners para os botões de navegação (escondidos pela casca, mantidos por compatibilidade)
  document.getElementById('voltar-hub').addEventListener('click', function() {
    window.location.href = "hub.html";
  });

  document.getElementById('acessar-mural').addEventListener('click', function() {
    window.location.href = "mural.html";
  });

  // Enter ou o botão "Calcular" enviam o formulário
  document.getElementById('calculadora-form').addEventListener('submit', function(e) {
    e.preventDefault();
    calcular();
  });

  // Mudou um dado: o resultado antigo deixa de valer
  ['titulacao', 'amostras'].forEach(function(id) {
    document.getElementById(id).addEventListener('input', function() {
      Calc.esconder(document.getElementById('resultado'), document.getElementById('resultado-vazio'));
    });
  });

  if (window.VirologiaUFSM) window.VirologiaUFSM.iniciar(document);
});

function abrirImagem() {
  window.open("https://i.pinimg.com/736x/5b/09/2b/5b092b1687e129c5f6714bf69bf1b3f1.jpg", "_blank");
}

// Todas as contas num lugar só (usadas pelo resultado e pelo copiar)
function calcularSN(titulacaoInput, amostras) {
  const expoente = parseFloat(titulacaoInput.replace("10^", "").replace(",", "."));
  const valorDecimal = Math.pow(10, expoente);
  const volumeVirus = valorDecimal / 2000;

  // Placas: a 1ª leva 6 amostras; as demais, 12
  const placasNecessarias = amostras <= 6 ? 1 : 1 + Math.ceil((amostras - 6) / 12);

  // Volume: 5 ml da 1ª placa + ~416,67 µl por amostra extra
  let volumeTotal = 5000;
  if (amostras > 6) volumeTotal += Math.ceil((amostras - 6) * (5000 / 12));

  // Margem de segurança de 20%
  const volumeComMargem = Math.ceil(volumeTotal * 1.2);

  // Diluições: multiplica por 10 até passar de 100 µl
  let quantidadeAtual = volumeComMargem / volumeVirus;
  const diluicoes = [quantidadeAtual];
  while (quantidadeAtual <= 100) {
    quantidadeAtual *= 10;
    diluicoes.push(quantidadeAtual);
  }

  return { expoente, valorDecimal, volumeVirus, placasNecessarias, volumeTotal, volumeComMargem, diluicoes };
}

function lerDados() {
  const titulacaoInput = document.getElementById('titulacao').value.trim();
  const amostras = parseInt(document.getElementById('amostras').value, 10);
  const expoente = parseFloat(titulacaoInput.replace("10^", "").replace(",", "."));

  if (!titulacaoInput || isNaN(expoente)) {
    Calc.marcarErro('titulacao');
    Calc.avisar('erro', 'Confira a titulação', 'Use o formato 10^6,1 ou só o expoente (6,1).');
    return null;
  }
  if (isNaN(amostras) || amostras < 1) {
    Calc.marcarErro('amostras');
    Calc.avisar('erro', 'Confira o número de amostras', 'Precisa ser pelo menos 1.');
    return null;
  }
  return { titulacaoInput, amostras };
}

function calcular() {
  const dados = lerDados();
  if (!dados) return;

  const r = calcularSN(dados.titulacaoInput, dados.amostras);
  const e = Calc.num(r.expoente, 4);
  const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;

  const resultadoDiv = document.getElementById('resultado');
  resultadoDiv.innerHTML = Calc.cartao({
    titulo: 'Volume de vírus',
    valor: `${Calc.num(r.diluicoes[0], 4)} µl`,
    texto: `Para <b>${plural(dados.amostras, 'amostra', 'amostras')}</b> em <b>${plural(r.placasNecessarias, 'placa', 'placas')}</b>, já com 20% de margem.`,
    linhas: [
      [`Titulação 10<sup>${e}</sup>`, Calc.num(r.valorDecimal, 4)],
      ['Ajuste TCID<sub>50</sub> (÷ 2000)', Calc.num(r.volumeVirus, 4)],
      ['Volume mínimo', `${Calc.num(r.volumeTotal / 1000)} ml`],
      ['Volume com margem', `${Calc.num(r.volumeComMargem / 1000)} ml`]
    ],
    grupos: [{
      titulo: 'Diluições para pipetar',
      linhas: r.diluicoes.map((valor, i) => [
        `10<sup>${e}</sup>${i === 0 ? '' : ` ×10<sup>${i}</sup>`}`,
        `${Calc.num(valor, 4)} µl`
      ])
    }],
    depois: '<p class="vu-resultado-nota">Retire de MEM a mesma quantidade de vírus que for colocar.</p>',
    idCopiar: 'copiar-resultado'
  });
  document.getElementById('copiar-resultado').addEventListener('click', copiarResultado);

  Calc.mostrar(resultadoDiv, document.getElementById('resultado-vazio'));
}

function copiarResultado() {
  const dados = lerDados();
  if (!dados) return;
  const r = calcularSN(dados.titulacaoInput, dados.amostras);
  const expoente = dados.titulacaoInput.replace("10^", "").replace(",", ".");

  const texto = [
    `Titulação: 10^${expoente} = ${Calc.num(r.valorDecimal, 4)}`,
    `Ajuste TCID₅₀: ${Calc.num(r.valorDecimal, 4)} / 2000 = ${Calc.num(r.volumeVirus, 4)}`,
    `Amostras: ${dados.amostras}`,
    `Placas Necessárias: ${r.placasNecessarias}`,
    `Volume Mínimo: ${Calc.num(r.volumeTotal / 1000)} ml`,
    `Volume com Margem: ${Calc.num(r.volumeComMargem / 1000)} ml`,
    `Volume Viral: ${Calc.num(r.diluicoes[0], 4)} µl`,
    '',
    'Diluições:',
    ...r.diluicoes.map((dil, i) => `10^${expoente}${i === 0 ? '' : ` ×10^${i}`} → ${Calc.num(dil, 4)} µl`)
  ].join('\n');

  Calc.copiar(texto, document.getElementById('copiar-resultado'));
}

// Tornar funções globalmente acessíveis
window.calcular = calcular;
window.copiarResultado = copiarResultado;
window.abrirImagem = abrirImagem;
