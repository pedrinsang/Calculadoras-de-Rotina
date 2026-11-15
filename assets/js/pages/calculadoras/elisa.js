let calculadoraAtiva = 'leucose';

document.addEventListener('DOMContentLoaded', function() {
  console.log("Desenvolvido por Pedro Ruiz Sangoi e Alexandre Werle Soares");

  // Passo a passo: a barra de progresso acompanha as caixas marcadas
  document.querySelectorAll('.vu-passos .form-check-input').forEach(checkbox => {
    checkbox.addEventListener('change', atualizarProgresso);
  });
  atualizarProgresso();

  document.getElementById('leucose').addEventListener('submit', function(e) { e.preventDefault(); calcularLeucose(); });
  document.getElementById('bvdv').addEventListener('submit', function(e) { e.preventDefault(); calcularBvdv(); });

  // Mudou um dado: o resultado daquele tipo deixa de valer
  ['leucose', 'bvdv'].forEach(function(tipo) {
    document.getElementById(tipo).addEventListener('input', function() {
      Calc.esconder(document.getElementById(`resultado-${tipo}`), document.getElementById('resultado-vazio'));
    });
  });

  if (window.VirologiaUFSM) window.VirologiaUFSM.iniciar(document);
});

function atualizarProgresso() {
  document.querySelectorAll('.vu-passos').forEach(lista => {
    const caixas = lista.querySelectorAll('.form-check-input');
    const feitas = lista.querySelectorAll('.form-check-input:checked').length;
    const progresso = lista.previousElementSibling;
    if (!progresso || !progresso.classList.contains('vu-progresso')) return;
    progresso.style.setProperty('--feito', `${caixas.length ? (feitas / caixas.length) * 100 : 0}%`);
    progresso.querySelector('.vu-progresso-texto').textContent = feitas === caixas.length
      ? `Tudo feito: ${feitas} de ${caixas.length} passos`
      : `${feitas} de ${caixas.length} passos feitos`;
  });
}

// Troca o tipo de ELISA (as pílulas do topo)
function toggleCalculator(tipo) {
  calculadoraAtiva = tipo;
  ['leucose', 'bvdv'].forEach(function(t) {
    const ativo = t === tipo;
    document.getElementById(t).classList.toggle('vu-oculto', !ativo);
    document.getElementById(`opcao-${t}`).setAttribute('aria-pressed', String(ativo));
    if (!ativo) document.getElementById(`resultado-${t}`).classList.add('d-none');
  });
  const resultado = document.getElementById(`resultado-${tipo}`);
  if (resultado.innerHTML.trim() !== '') Calc.mostrar(resultado, document.getElementById('resultado-vazio'));
  else Calc.esconder(resultado, document.getElementById('resultado-vazio'));
}

function lerElisa(tipo) {
  const amostras = parseFloat(document.getElementById(`amostras-${tipo}`).value);
  const controles = parseFloat(document.getElementById(`controles-${tipo}`).value);
  if (isNaN(amostras) || amostras < 0) {
    Calc.marcarErro(`amostras-${tipo}`);
    Calc.avisar('erro', 'Confira o número de amostras');
    return null;
  }
  if (isNaN(controles) || controles < 0) {
    Calc.marcarErro(`controles-${tipo}`);
    Calc.avisar('erro', 'Confira o número de controles');
    return null;
  }
  if (amostras + controles === 0) {
    Calc.marcarErro(`amostras-${tipo}`);
    Calc.avisar('erro', 'Nenhum poço para calcular', 'Informe pelo menos uma amostra ou controle.');
    return null;
  }
  return { amostras, controles, totalPocos: amostras + controles };
}

const mL = (uL) => `${Calc.num(uL / 1000)} mL`;
const placas = (pocos) => {
  const n = Math.ceil(pocos / 96);
  return n === 1 ? `<b>${pocos} de 96</b> poços da placa.` : `<b>${n} placas</b> de 96 poços.`;
};

// Leucose: lavagem 1:10 (50 µL + 2 × 3 lavagens de 300 µL por poço) e conjugado 1:100 (100 µL por poço)
function contasLeucose(totalPocos) {
  const volumeLavagemPorPoco = 50 + 300 * 3 + 300 * 3; // 1.850 µL/poço
  const volumeTotalLavagem = totalPocos * volumeLavagemPorPoco;
  const volumeConcentradoLavagem = volumeTotalLavagem / 10;
  const volumeAguaLavagem = volumeTotalLavagem - volumeConcentradoLavagem;
  const volumeTotalConjugado = totalPocos * 100;
  const volumeConcentradoConjugado = volumeTotalConjugado / 100;
  return { volumeLavagemPorPoco, volumeTotalLavagem, volumeConcentradoLavagem, volumeAguaLavagem, volumeTotalConjugado, volumeConcentradoConjugado };
}

// BVDV: lavagem 1:10 (10 lavagens de 300 µL por poço); reagentes por poço abaixo
const BVDV_POR_POCO = { anticorpos: 50, conjugado: 100, tmb: 100, interrupcao: 100 };
function contasBvdv(totalPocos) {
  const volumeLavagemPorPoco = 300 * 10; // 3 mL/poço
  const volumeTotalLavagem = totalPocos * volumeLavagemPorPoco;
  const volumeConcentradoLavagem = volumeTotalLavagem / 10;
  const volumeAguaLavagem = volumeTotalLavagem - volumeConcentradoLavagem;
  return { volumeLavagemPorPoco, volumeTotalLavagem, volumeConcentradoLavagem, volumeAguaLavagem };
}

function calcularLeucose() {
  const d = lerElisa('leucose');
  if (!d) return;
  const c = contasLeucose(d.totalPocos);

  const resultadoDiv = document.getElementById('resultado-leucose');
  resultadoDiv.innerHTML = Calc.cartao({
    titulo: 'ELISA Leucose',
    valor: `${d.totalPocos} poços`,
    texto: `${placas(d.totalPocos)} Lavagem: ${mL(c.volumeLavagemPorPoco)} por poço.`,
    grupos: [
      { titulo: 'Solução de lavagem (1:10)', linhas: [
        ['Volume total', mL(c.volumeTotalLavagem)],
        ['Concentrado (10X)', mL(c.volumeConcentradoLavagem)],
        ['Água destilada', mL(c.volumeAguaLavagem)]
      ] },
      { titulo: 'Conjugado (1:100)', linhas: [
        ['Volume diluído', mL(c.volumeTotalConjugado)],
        ['Concentrado (100X)', `${Calc.num(c.volumeConcentradoConjugado)} µL`]
      ] }
    ],
    idCopiar: 'copiar-resultado-leucose'
  });
  document.getElementById('copiar-resultado-leucose').addEventListener('click', function() { copiarResultado('leucose'); });
  Calc.mostrar(resultadoDiv, document.getElementById('resultado-vazio'));
}

function calcularBvdv() {
  const d = lerElisa('bvdv');
  if (!d) return;
  const c = contasBvdv(d.totalPocos);
  const total = (uL) => mL(d.totalPocos * uL);

  const resultadoDiv = document.getElementById('resultado-bvdv');
  resultadoDiv.innerHTML = Calc.cartao({
    titulo: 'ELISA BVDV',
    valor: `${d.totalPocos} poços`,
    texto: `${placas(d.totalPocos)} Lavagem: ${mL(c.volumeLavagemPorPoco)} por poço.`,
    grupos: [
      { titulo: 'Solução de lavagem (1:10)', linhas: [
        ['Volume total', mL(c.volumeTotalLavagem)],
        ['Concentrado (10X)', mL(c.volumeConcentradoLavagem)],
        ['Água destilada', mL(c.volumeAguaLavagem)]
      ] },
      { titulo: 'Volumes totais de reagentes', linhas: [
        ['Anticorpos de detecção', total(BVDV_POR_POCO.anticorpos)],
        ['Conjugado', total(BVDV_POR_POCO.conjugado)],
        ['Substrato TMB', total(BVDV_POR_POCO.tmb)],
        ['Solução de interrupção', total(BVDV_POR_POCO.interrupcao)]
      ] }
    ],
    depois: `<p class="vu-resultado-nota">Por poço: ${BVDV_POR_POCO.anticorpos} µL de anticorpos, ${BVDV_POR_POCO.conjugado} µL de conjugado, ${BVDV_POR_POCO.tmb} µL de TMB e ${BVDV_POR_POCO.interrupcao} µL de interrupção.</p>`,
    idCopiar: 'copiar-resultado-bvdv'
  });
  document.getElementById('copiar-resultado-bvdv').addEventListener('click', function() { copiarResultado('bvdv'); });
  Calc.mostrar(resultadoDiv, document.getElementById('resultado-vazio'));
}

function copiarResultado(tipo) {
  const d = lerElisa(tipo);
  if (!d) return;
  let linhas;
  if (tipo === 'leucose') {
    const c = contasLeucose(d.totalPocos);
    linhas = [
      'Resultado ELISA Leucose',
      `Total de poços: ${d.totalPocos}`,
      `Volume por poço: ${mL(c.volumeLavagemPorPoco)}`,
      'Solução de Lavagem (1:10):',
      `Volume Total: ${mL(c.volumeTotalLavagem)}`,
      `Concentrado (10X): ${mL(c.volumeConcentradoLavagem)}`,
      `Água Destilada: ${mL(c.volumeAguaLavagem)}`,
      'Conjugado (1:100):',
      `Volume Diluído: ${mL(c.volumeTotalConjugado)}`,
      `Concentrado (100X): ${Calc.num(c.volumeConcentradoConjugado)} µL`
    ];
  } else {
    const c = contasBvdv(d.totalPocos);
    const total = (uL) => mL(d.totalPocos * uL);
    linhas = [
      'Resultado ELISA BVDV',
      `Total de poços: ${d.totalPocos}`,
      `Volume por poço: ${mL(c.volumeLavagemPorPoco)}`,
      'Solução de Lavagem (1:10):',
      `Volume Total: ${mL(c.volumeTotalLavagem)}`,
      `Concentrado (10X): ${mL(c.volumeConcentradoLavagem)}`,
      `Água Destilada: ${mL(c.volumeAguaLavagem)}`,
      'Volumes Totais de Reagentes:',
      `Anticorpos de Detecção: ${total(BVDV_POR_POCO.anticorpos)}`,
      `Conjugado: ${total(BVDV_POR_POCO.conjugado)}`,
      `Substrato TMB: ${total(BVDV_POR_POCO.tmb)}`,
      `Solução de Interrupção: ${total(BVDV_POR_POCO.interrupcao)}`
    ];
  }
  Calc.copiar(linhas.join('\n'), document.getElementById(`copiar-resultado-${tipo}`));
}

function resetChecklist(tipo) {
  const checkboxes = document.querySelectorAll(`#protocolo${tipo.charAt(0).toUpperCase() + tipo.slice(1)} .form-check-input`);
  checkboxes.forEach(checkbox => { checkbox.checked = false; });
  atualizarProgresso();
}

// Tornar funções globalmente acessíveis
window.toggleCalculator = toggleCalculator;
window.calcularLeucose = calcularLeucose;
window.calcularBvdv = calcularBvdv;
window.copiarResultado = copiarResultado;
window.resetChecklist = resetChecklist;
