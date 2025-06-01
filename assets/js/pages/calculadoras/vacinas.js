let calculadoraAtiva = null;

document.addEventListener('DOMContentLoaded', function() {
  console.log("Desenvolvido por Pedro Ruiz Sangoi e Alexandre Werle Soares, com auxílio do ChatGPT.");
});

function toggleCalculator(tipo) {
  // Esconder todas as calculadoras e resetar opções
  document.querySelectorAll('.calculadora-section').forEach(el => {
    el.classList.remove('active');
  });
  
  document.querySelectorAll('.option-card').forEach(el => {
    el.classList.remove('active');
  });
  
  // Ativar a calculadora selecionada
  if (tipo !== calculadoraAtiva) {
    document.getElementById(tipo).classList.add('active');
    document.getElementById(`opcao-${tipo}`).classList.add('active');
    calculadoraAtiva = tipo;
  } else {
    calculadoraAtiva = null;
  }
}

function calcularBovina() {
  const papiloma = parseFloat(document.getElementById('papiloma-bovina').value);
  const vacinas = parseFloat(document.getElementById('vacinas-bovina').value);
  
  if (isNaN(papiloma) || isNaN(vacinas) || papiloma <= 0 || vacinas <= 0) {
    alert("Por favor, preencha ambos os campos com valores válidos.");
    return;
  }

  const necessario = vacinas * 5;
  const vacinasExtras = Math.floor((papiloma - necessario) / 5);
  
  const resultadoDiv = document.getElementById('resultado-bovina');
  resultadoDiv.innerHTML = `
    <div class="row">
      <div class="col-md-6 mb-2">
        <strong class="text-success">Papiloma Necessário:</strong> 
        <span>${necessario}g</span>
      </div>
      <div class="col-md-6 mb-2">
        <strong class="text-success">Vacinas Extras:</strong> 
        <span>${vacinasExtras >= 0 ? vacinasExtras : 0}</span>
      </div>
      <div class="col-md-6 mb-2">
        <strong class="text-success">Hanks:</strong> 
        <span>${vacinas * 20}ml</span>
      </div>
      <div class="col-md-6 mb-2">
        <strong class="text-success">Clorofórmio:</strong> 
        <span>${vacinas * 5}ml</span>
      </div>
      <div class="col-12 mb-2">
        <strong class="text-success">Volume Total:</strong> 
        <span>${vacinas * 15}ml</span>
      </div>
    </div>
  `;
  
  resultadoDiv.classList.remove('d-none');
  document.getElementById('copiar-resultado-bovina').classList.remove('d-none');
}

function calcularCanina() {
  const papiloma = parseFloat(document.getElementById('papiloma-canina').value);
  const vacinas = parseFloat(document.getElementById('vacinas-canina').value);
  
  if (isNaN(papiloma) || isNaN(vacinas) || papiloma <= 0 || vacinas <= 0) {
    alert("Por favor, preencha ambos os campos com valores válidos.");
    return;
  }

  const necessario = vacinas * 1;
  const vacinasExtras = Math.floor(papiloma - necessario);
  
  const resultadoDiv = document.getElementById('resultado-canina');
  resultadoDiv.innerHTML = `
    <div class="row">
      <div class="col-md-6 mb-2">
        <strong class="text-success">Papiloma Necessário:</strong> 
        <span>${necessario}g</span>
      </div>
      <div class="col-md-6 mb-2">
        <strong class="text-success">Vacinas Extras:</strong> 
        <span>${vacinasExtras >= 0 ? vacinasExtras : 0}</span>
      </div>
      <div class="col-md-6 mb-2">
        <strong class="text-success">Hanks:</strong> 
        <span>${vacinas * 10}ml</span>
      </div>
      <div class="col-md-6 mb-2">
        <strong class="text-success">Clorofórmio:</strong> 
        <span>${vacinas * 1}ml</span>
      </div>
      <div class="col-12 mb-2">
        <strong class="text-success">Volume Total:</strong> 
        <span>${vacinas * 6}ml</span>
      </div>
    </div>
  `;
  
  resultadoDiv.classList.remove('d-none');
  document.getElementById('copiar-resultado-canina').classList.remove('d-none');
}

function calcularFormol() {
  const volume = parseFloat(document.getElementById('volume-recuperado').value);
  
  if (isNaN(volume) || volume <= 0) {
    alert("Por favor, insira um volume válido.");
    return;
  }

  const formol = (volume * 0.5) / 100;
  const resultadoDiv = document.getElementById('resultado-formol');
  resultadoDiv.innerHTML = `
    <div class="text-center">
      <h5 class="mb-3">Resultado</h5>
      <div class="d-inline-block p-3 bg-light rounded-circle mb-3" style="width: 100px; height: 100px; border: 2px solid var(--verde-medio);">
        <div class="d-flex flex-column justify-content-center align-items-center h-100">
          <strong class="fs-5">${formol.toFixed(3)}</strong>
          <small>ml</small>
        </div>
      </div>
      <p class="mb-0">
        <strong class="d-block mb-2">Volume de Formol Necessário</strong>
        <span class="text-muted">(0,5% do volume total)</span>
      </p>
    </div>
  `;
  
  resultadoDiv.classList.remove('d-none');
  document.getElementById('copiar-resultado-formol').classList.remove('d-none');
}

function copiarResultado(tipo) {
  try {
    // Obter os valores para formatar o texto
    let textoFinal = '';
    
    if (tipo === 'bovina') {
      const papiloma = document.getElementById('papiloma-bovina').value;
      const vacinas = document.getElementById('vacinas-bovina').value;
      const necessario = vacinas * 5;
      const vacinasExtras = Math.floor((papiloma - necessario) / 5);
      
      textoFinal = `Vacina Bovina:\n` +
                  `Papiloma Necessário: ${necessario}g\n` +
                  `Vacinas Extras: ${vacinasExtras >= 0 ? vacinasExtras : 0}\n` +
                  `Hanks: ${vacinas * 20}ml\n` +
                  `Clorofórmio: ${vacinas * 5}ml\n` +
                  `Volume Total: ${vacinas * 15}ml`;
    }
    else if (tipo === 'canina') {
      const papiloma = document.getElementById('papiloma-canina').value;
      const vacinas = document.getElementById('vacinas-canina').value;
      const necessario = vacinas * 1;
      const vacinasExtras = Math.floor(papiloma - necessario);
      
      textoFinal = `Vacina Canina:\n` +
                  `Papiloma Necessário: ${necessario}g\n` +
                  `Vacinas Extras: ${vacinasExtras >= 0 ? vacinasExtras : 0}\n` +
                  `Hanks: ${vacinas * 10}ml\n` +
                  `Clorofórmio: ${vacinas * 1}ml\n` +
                  `Volume Total: ${vacinas * 6}ml`;
    }
    else if (tipo === 'formol') {
      const volume = document.getElementById('volume-recuperado').value;
      const formol = (volume * 0.5) / 100;
      
      textoFinal = `Cálculo de Formol:\n` +
                  `Volume Recuperado: ${volume}ml\n` +
                  `Formol Necessário: ${formol.toFixed(3)}ml (0,5% do volume total)`;
    }
    
    // Criar elemento temporário para copiar
    const textarea = document.createElement('textarea');
    textarea.value = textoFinal;
    document.body.appendChild(textarea);
    textarea.select();
    
    // Executar cópia
    const copiado = document.execCommand('copy');
    document.body.removeChild(textarea);
    
    // Feedback visual
    const btn = document.getElementById(`copiar-resultado-${tipo}`);
    if (copiado) {
      btn.innerHTML = '<i class="bi bi-check-circle me-1"></i> Copiado!';
      btn.classList.add('btn-success');
      btn.classList.remove('btn-outline-success');
      setTimeout(() => {
        btn.innerHTML = '<i class="bi bi-clipboard me-1"></i> Copiar Resultado';
        btn.classList.remove('btn-success');
        btn.classList.add('btn-outline-success');
      }, 2000);
    } else {
      throw new Error('Não foi possível copiar');
    }
  } catch (error) {
    console.error("Erro ao copiar:", error);
    alert("Erro ao copiar. Você pode selecionar e copiar manualmente.");
  }
}

// Tornar funções globalmente acessíveis
window.toggleCalculator = toggleCalculator;
window.calcularBovina = calcularBovina;
window.calcularCanina = calcularCanina;
window.calcularFormol = calcularFormol;
window.copiarResultado = copiarResultado;