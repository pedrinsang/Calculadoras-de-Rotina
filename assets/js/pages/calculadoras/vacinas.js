let calculadoraAtiva = 'bovina';

// Quanto cada dose leva, por tipo de vacina
const RECEITAS = {
  bovina: { nome: 'Vacina bovina', papilomaPorDose: 5, hanks: 20, cloroformio: 5, volume: 15 },
  canina: { nome: 'Vacina canina', papilomaPorDose: 1, hanks: 10, cloroformio: 1, volume: 6 }
};

document.addEventListener('DOMContentLoaded', function() {
  console.log("Desenvolvido por Pedro Ruiz Sangoi e Alexandre Werle Soares, com auxílio do ChatGPT.");

  document.getElementById('bovina').addEventListener('submit', function(e) { e.preventDefault(); calcularBovina(); });
  document.getElementById('canina').addEventListener('submit', function(e) { e.preventDefault(); calcularCanina(); });
  document.getElementById('formol').addEventListener('submit', function(e) { e.preventDefault(); calcularFormol(); });

  // Mudou um dado: o resultado daquele tipo deixa de valer
  ['bovina', 'canina', 'formol'].forEach(function(tipo) {
    document.getElementById(tipo).addEventListener('input', function() {
      Calc.esconder(document.getElementById(`resultado-${tipo}`), document.getElementById('resultado-vazio'));
    });
  });

  if (window.VirologiaUFSM) window.VirologiaUFSM.iniciar(document);
});

// Troca o tipo de cálculo (as pílulas do topo)
function toggleCalculator(tipo) {
  calculadoraAtiva = tipo;
  ['bovina', 'canina', 'formol'].forEach(function(t) {
    const ativo = t === tipo;
    document.getElementById(t).classList.toggle('vu-oculto', !ativo);
    document.getElementById(`opcao-${t}`).setAttribute('aria-pressed', String(ativo));
    if (!ativo) document.getElementById(`resultado-${t}`).classList.add('d-none');
  });
  const resultado = document.getElementById(`resultado-${tipo}`);
  const temResultado = resultado.innerHTML.trim() !== '';
  if (temResultado) Calc.mostrar(resultado, document.getElementById('resultado-vazio'));
  else Calc.esconder(resultado, document.getElementById('resultado-vazio'));
}

function contasVacina(tipo, papiloma, vacinas) {
  const r = RECEITAS[tipo];
  const necessario = vacinas * r.papilomaPorDose;
  const vacinasExtras = Math.max(0, Math.floor((papiloma - necessario) / r.papilomaPorDose));
  return {
    necessario, vacinasExtras, falta: Math.max(0, necessario - papiloma),
    hanks: vacinas * r.hanks, cloroformio: vacinas * r.cloroformio, volume: vacinas * r.volume
  };
}

function lerVacina(tipo) {
  const papiloma = parseFloat(document.getElementById(`papiloma-${tipo}`).value);
  const vacinas = parseInt(document.getElementById(`vacinas-${tipo}`).value, 10);
  if (isNaN(papiloma) || papiloma <= 0) {
    Calc.marcarErro(`papiloma-${tipo}`);
    Calc.avisar('erro', 'Informe os gramas de papiloma');
    return null;
  }
  if (isNaN(vacinas) || vacinas <= 0) {
    Calc.marcarErro(`vacinas-${tipo}`);
    Calc.avisar('erro', 'Informe a quantidade de vacinas');
    return null;
  }
  return { papiloma, vacinas };
}

function calcularVacina(tipo) {
  const dados = lerVacina(tipo);
  if (!dados) return;
  const c = contasVacina(tipo, dados.papiloma, dados.vacinas);
  const n = Calc.num;
  const doses = `${dados.vacinas} ${dados.vacinas === 1 ? 'vacina' : 'vacinas'}`;

  const resultadoDiv = document.getElementById(`resultado-${tipo}`);
  resultadoDiv.innerHTML = Calc.cartao({
    titulo: RECEITAS[tipo].nome,
    valor: `${n(c.volume)} ml`,
    texto: c.falta > 0
      ? `Volume final para <b>${doses}</b>. Faltam <b>${n(c.falta)} g</b> de papiloma.`
      : `Volume final para <b>${doses}</b>. Sobra papiloma para mais <b>${c.vacinasExtras}</b>.`,
    linhas: [
      ['Papiloma necessário', `${n(c.necessario)} g`],
      ['Hanks', `${n(c.hanks)} ml`],
      ['Clorofórmio', `${n(c.cloroformio)} ml`],
      ['Volume total', `${n(c.volume)} ml`],
      ['Vacinas extras', `${c.vacinasExtras}`]
    ],
    idCopiar: `copiar-resultado-${tipo}`
  });
  document.getElementById(`copiar-resultado-${tipo}`).addEventListener('click', function() { copiarResultado(tipo); });
  Calc.mostrar(resultadoDiv, document.getElementById('resultado-vazio'));
}

function calcularBovina() { calcularVacina('bovina'); }
function calcularCanina() { calcularVacina('canina'); }

function calcularFormol() {
  const volume = parseFloat(document.getElementById('volume-recuperado').value);
  if (isNaN(volume) || volume <= 0) {
    Calc.marcarErro('volume-recuperado');
    Calc.avisar('erro', 'Informe o volume recuperado');
    return;
  }

  const formol = (volume * 0.5) / 100;
  const resultadoDiv = document.getElementById('resultado-formol');
  resultadoDiv.innerHTML = Calc.cartao({
    titulo: 'Formol necessário',
    valor: `${Calc.num(formol, 3)} ml`,
    texto: `0,5% de <b>${Calc.num(volume)} ml</b> recuperados.`,
    depois: '<p class="vu-resultado-nota"><i class="bi bi-exclamation-triangle"></i> Use equipamentos de proteção ao manipular formol.</p>',
    idCopiar: 'copiar-resultado-formol'
  });
  document.getElementById('copiar-resultado-formol').addEventListener('click', function() { copiarResultado('formol'); });
  Calc.mostrar(resultadoDiv, document.getElementById('resultado-vazio'));
}

function copiarResultado(tipo) {
  let textoFinal = '';

  if (tipo === 'bovina' || tipo === 'canina') {
    const dados = lerVacina(tipo);
    if (!dados) return;
    const c = contasVacina(tipo, dados.papiloma, dados.vacinas);
    textoFinal = `Vacina ${tipo === 'bovina' ? 'Bovina' : 'Canina'}:\n` +
                 `Papiloma Necessário: ${c.necessario}g\n` +
                 `Vacinas Extras: ${c.vacinasExtras}\n` +
                 `Hanks: ${c.hanks}ml\n` +
                 `Clorofórmio: ${c.cloroformio}ml\n` +
                 `Volume Total: ${c.volume}ml`;
  } else if (tipo === 'formol') {
    const volume = document.getElementById('volume-recuperado').value;
    const formol = (volume * 0.5) / 100;
    textoFinal = `Cálculo de Formol:\n` +
                 `Volume Recuperado: ${volume}ml\n` +
                 `Formol Necessário: ${formol.toFixed(3)}ml (0,5% do volume total)`;
  }

  Calc.copiar(textoFinal, document.getElementById(`copiar-resultado-${tipo}`));
}

// Tornar funções globalmente acessíveis
window.toggleCalculator = toggleCalculator;
window.calcularBovina = calcularBovina;
window.calcularCanina = calcularCanina;
window.calcularFormol = calcularFormol;
window.copiarResultado = copiarResultado;
