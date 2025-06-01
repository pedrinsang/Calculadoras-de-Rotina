let calculadoraAtiva = null;

document.addEventListener('DOMContentLoaded', function() {
  console.log("Desenvolvido por Pedro Ruiz Sangoi e Alexandre Werle Soares");
  
  // Adicionar evento de change para checkboxes
  document.querySelectorAll('.form-check-input').forEach(checkbox => {
    checkbox.addEventListener('change', function() {
      if (this.checked) {
        this.nextElementSibling.classList.add('completed');
      } else {
        this.nextElementSibling.classList.remove('completed');
      }
    });
  });
});

function toggleCalculator(tipo) {
  // Esconder todas as calculadoras
  document.querySelectorAll('.calculadora-section').forEach(el => {
    el.style.display = 'none';
    el.classList.remove('active');
  });
  
  document.querySelectorAll('.option-card').forEach(el => {
    el.classList.remove('active');
  });
  
  // Ativar a calculadora selecionada
  if (tipo !== calculadoraAtiva) {
    const novaCalculadora = document.getElementById(tipo);
    const novoBotao = document.getElementById(`opcao-${tipo}`);
    
    novaCalculadora.style.display = 'block';
    setTimeout(() => {
      novaCalculadora.classList.add('active');
    }, 10);
    novoBotao.classList.add('active');
    calculadoraAtiva = tipo;
  } else {
    calculadoraAtiva = null;
  }
}

function calcularLeucose() {
  const amostras = parseFloat(document.getElementById('amostras-leucose').value);
  const controles = parseFloat(document.getElementById('controles-leucose').value);

  if (isNaN(amostras) || isNaN(controles) || amostras < 0 || controles < 0) {
    alert("Por favor, insira valores válidos.");
    return;
  }

  // Total de poços (amostras + controles)
  const totalPocos = amostras + controles;

  // Volumes por poço (em µL) conforme protocolo:
  const volumeSolucaoLavagemPasso2 = 50;   // Passo 2: 50 µL da solução 1:10
  const volumeLavagemPasso8 = 300 * 3;     // Passo 8: 300 µL, 3 lavagens = 900 µL
  const volumeLavagemPasso11 = 300 * 3;    // Passo 11: igual ao passo 8 = 900 µL
  const volumeConjugado = 100;             // Passo 9: 100 µL do conjugado 1:100

  // Cálculo da Solução de Lavagem TOTAL por poço:
  const volumeLavagemPorPoco = volumeSolucaoLavagemPasso2 + volumeLavagemPasso8 + volumeLavagemPasso11; // 50 + 900 + 900 = 1.850 µL/poço

  // Volume total de Solução de Lavagem (1:10) para todos os poços:
  const volumeTotalLavagem = totalPocos * volumeLavagemPorPoco; // em µL
  const volumeConcentradoLavagem = volumeTotalLavagem / 10;      // Concentrado (10X) em µL
  const volumeAguaLavagem = volumeTotalLavagem - volumeConcentradoLavagem; // Água em µL

  // Cálculo do Conjugado (diluição 1:100):
  const volumeTotalConjugado = totalPocos * volumeConjugado;     // Conjugado diluído em µL
  const volumeConcentradoConjugado = volumeTotalConjugado / 100; // Concentrado (100X) em µL

  // Exibir resultados:
  const resultadoDiv = document.getElementById('resultado-leucose');
  resultadoDiv.innerHTML = `
    <div class="row">
      <div class="col-12 mb-2">
        <h5 class="text-success">Resultado ELISA Leucose</h5>
      </div>
      <div class="col-md-6 mb-2">
        <strong class="text-success">Total de poços:</strong> ${totalPocos}
      </div>
      <div class="col-md-6 mb-2">
        <strong class="text-success">Volume por poço:</strong> ${(volumeLavagemPorPoco / 1000).toFixed(2)} mL
      </div>
      
      <div class="col-12 mt-2">
        <h6 class="text-success">Solução de Lavagem (1:10):</h6>
      </div>
      <div class="col-md-6 mb-2">
        <strong>Volume Total:</strong> ${(volumeTotalLavagem / 1000).toFixed(2)} mL
      </div>
      <div class="col-md-6 mb-2">
        <strong>Concentrado (10X):</strong> ${(volumeConcentradoLavagem / 1000).toFixed(2)} mL
      </div>
      <div class="col-md-6 mb-2">
        <strong>Água Destilada:</strong> ${(volumeAguaLavagem / 1000).toFixed(2)} mL
      </div>
      
      <div class="col-12 mt-2">
        <h6 class="text-success">Conjugado (1:100):</h6>
      </div>
      <div class="col-md-6 mb-2">
        <strong>Volume Diluído:</strong> ${(volumeTotalConjugado / 1000).toFixed(2)} mL
      </div>
      <div class="col-md-6 mb-2">
        <strong>Concentrado (100X):</strong> ${volumeConcentradoConjugado.toFixed(2)} µL
      </div>
    </div>
  `;

  resultadoDiv.classList.remove('d-none');
  document.getElementById('copiar-resultado-leucose').classList.remove('d-none');
}

function calcularBvdv() {
  const amostras = parseFloat(document.getElementById('amostras-bvdv').value);
  const controles = parseFloat(document.getElementById('controles-bvdv').value);

  if (isNaN(amostras) || isNaN(controles) || amostras < 0 || controles < 0) {
    alert("Por favor, insira valores válidos.");
    return;
  }

  // Total de poços (amostras + controles)
  const totalPocos = amostras + controles;
  
  // Volumes por cavidade (em µL)
  const volumeAnticorposDetecao = 50;
  const volumeConjugado = 100;
  const volumeSubstratoTMB = 100;
  const volumeSolucaoInterrupcao = 100;
  
  // Lavagem: 300 µL por poço, 10 lavagens (5 no passo 8 + 5 no passo 11)
  const volumeLavagemPorPoco = 300 * 10; // 3.000 µL = 3 mL por poço
  const volumeTotalLavagem = totalPocos * volumeLavagemPorPoco; // em µL
  
  // Preparo da Solução de Lavagem (diluição 1:10)
  const volumeConcentradoLavagem = volumeTotalLavagem / 10; // em µL
  const volumeAguaLavagem = volumeTotalLavagem - volumeConcentradoLavagem; // em µL

  const resultadoDiv = document.getElementById('resultado-bvdv');
  resultadoDiv.innerHTML = `
    <div class="row">
      <div class="col-12 mb-2">
        <h5 class="text-success">Resultado ELISA BVDV</h5>
      </div>
      <div class="col-md-6 mb-2">
        <strong class="text-success">Total de poços:</strong> ${totalPocos}
      </div>
      <div class="col-md-6 mb-2">
        <strong class="text-success">Volume por poço:</strong> ${(volumeLavagemPorPoco / 1000).toFixed(2)} mL
      </div>
      
      <div class="col-12 mt-2">
        <h6 class="text-success">Reagentes por poço:</h6>
      </div>
      <div class="col-md-6 mb-2">
        <strong>Anticorpos de Detecção:</strong> ${volumeAnticorposDetecao} µL
      </div>
      <div class="col-md-6 mb-2">
        <strong>Conjugado:</strong> ${volumeConjugado} µL
      </div>
      <div class="col-md-6 mb-2">
        <strong>Substrato TMB:</strong> ${volumeSubstratoTMB} µL
      </div>
      <div class="col-md-6 mb-2">
        <strong>Solução de Interrupção:</strong> ${volumeSolucaoInterrupcao} µL
      </div>
      
      <div class="col-12 mt-2">
        <h6 class="text-success">Solução de Lavagem (1:10):</h6>
      </div>
      <div class="col-md-6 mb-2">
        <strong>Volume Total:</strong> ${(volumeTotalLavagem / 1000).toFixed(2)} mL
      </div>
      <div class="col-md-6 mb-2">
        <strong>Concentrado (10X):</strong> ${(volumeConcentradoLavagem / 1000).toFixed(2)} mL
      </div>
      <div class="col-md-6 mb-2">
        <strong>Água Destilada:</strong> ${(volumeAguaLavagem / 1000).toFixed(2)} mL
      </div>
      
      <div class="col-12 mt-2">
        <h6 class="text-success">Volumes Totais de Reagentes:</h6>
      </div>
      <div class="col-md-6 mb-2">
        <strong>Anticorpos de Detecção:</strong> ${(totalPocos * volumeAnticorposDetecao / 1000).toFixed(2)} mL
      </div>
      <div class="col-md-6 mb-2">
        <strong>Conjugado:</strong> ${(totalPocos * volumeConjugado / 1000).toFixed(2)} mL
      </div>
      <div class="col-md-6 mb-2">
        <strong>Substrato TMB:</strong> ${(totalPocos * volumeSubstratoTMB / 1000).toFixed(2)} mL
      </div>
      <div class="col-md-6 mb-2">
        <strong>Solução de Interrupção:</strong> ${(totalPocos * volumeSolucaoInterrupcao / 1000).toFixed(2)} mL
      </div>
    </div>
  `;
  
  resultadoDiv.classList.remove('d-none');
  document.getElementById('copiar-resultado-bvdv').classList.remove('d-none');
}

function copiarResultado(tipo) {
  try {
    const resultadoDiv = document.getElementById(`resultado-${tipo}`);
    const textoParaCopiar = resultadoDiv.innerText.replace(/\s+/g, ' ').trim();
    
    const textarea = document.createElement('textarea');
    textarea.value = textoParaCopiar;
    document.body.appendChild(textarea);
    textarea.select();
    
    const copiado = document.execCommand('copy');
    document.body.removeChild(textarea);
    
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

function resetChecklist(tipo) {
  const checkboxes = document.querySelectorAll(`#protocolo${tipo.charAt(0).toUpperCase() + tipo.slice(1)} .form-check-input`);
  checkboxes.forEach(checkbox => {
    checkbox.checked = false;
    checkbox.nextElementSibling.classList.remove('completed');
  });
}

// Tornar funções globalmente acessíveis
window.toggleCalculator = toggleCalculator;
window.calcularLeucose = calcularLeucose;
window.calcularBvdv = calcularBvdv;
window.copiarResultado = copiarResultado;
window.resetChecklist = resetChecklist;