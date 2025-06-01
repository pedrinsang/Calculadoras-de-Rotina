document.addEventListener('DOMContentLoaded', function() {
  console.log("Desenvolvido por Pedro Ruiz Sangoi e Alexandre Werle Soares, com auxílio do DeepSeek Chat.");
  
  // Event listeners para os botões de navegação
  document.getElementById('voltar-hub').addEventListener('click', function() {
    window.location.href = "hub.html";
  });
  
  document.getElementById('acessar-mural').addEventListener('click', function() {
    window.location.href = "mural.html";
  });
});

function abrirImagem() {
  window.open("https://i.pinimg.com/736x/5b/09/2b/5b092b1687e129c5f6714bf69bf1b3f1.jpg", "_blank");
}

function calcular() {
  const titulacaoInput = document.getElementById('titulacao').value.trim();
  const amostras = parseInt(document.getElementById('amostras').value);

  if (!titulacaoInput || isNaN(amostras) || amostras < 1) {
    alert("Preencha todos os campos corretamente!");
    return;
  }

  // Converter titulação para potência de 10
  let expoente = parseFloat(titulacaoInput.replace("10^", "").replace(",", "."));
  const valorDecimal = Math.pow(10, expoente);
  const volumeVirus = valorDecimal / 2000;

  // Cálculo de placas necessárias
  let placasNecessarias;
  if (amostras <= 6) {
    placasNecessarias = 1;
  } else {
    placasNecessarias = 1 + Math.ceil((amostras - 6) / 12);
  }
  
  // Cálculo de volume preciso por amostra
  let volumeTotal = 0;
  if (amostras <= 6) {
    // Primeira placa completa (5ml)
    volumeTotal = 5000;
  } else {
    // Primeira placa (6 amostras)
    volumeTotal = 5000;
    
    // Amostras restantes
    const amostrasRestantes = amostras - 6;
    
    // Calcular volume para placas adicionais
    const volumePorAmostra = 5000 / 12; // ~416.67µl por amostra
    volumeTotal += Math.ceil(amostrasRestantes * volumePorAmostra);
  }

  // Aplicar margem de segurança de 20%
  const volumeComMargem = Math.ceil(volumeTotal * 1.2);

  // Calcular quantidade inicial
  let quantidadeInicial = volumeComMargem / volumeVirus;
  
  // Calcular diluições
  let diluicoes = [];
  let fatorDiluicao = 1;
  let quantidadeAtual = quantidadeInicial;
  
  diluicoes.push({fator: fatorDiluicao, valor: quantidadeAtual});
  
  // Continua multiplicando por 10 até que a quantidade seja > 100µl
  while (quantidadeAtual <= 100) {
    quantidadeAtual *= 10;
    fatorDiluicao *= 10;
    diluicoes.push({fator: fatorDiluicao, valor: quantidadeAtual});
  }

  // Construir resultado com Bootstrap
  let resultadoHTML = `
    <div class="row">
      <div class="col-md-6 mb-2">
        <strong class="text-success">Titulação:</strong> 
        <span>10<sup>${expoente}</sup> = ${valorDecimal.toLocaleString('pt-BR', {maximumFractionDigits: 4})}</span>
      </div>
      <div class="col-md-6 mb-2">
        <strong class="text-success">TCID<sub>50</sub>:</strong> 
        <span>${volumeVirus.toLocaleString('pt-BR', {maximumFractionDigits: 4})}</span>
      </div>
      <div class="col-md-6 mb-2">
        <strong class="text-success">Amostras:</strong> ${amostras}
      </div>
      <div class="col-md-6 mb-2">
        <strong class="text-success">Placas:</strong> ${placasNecessarias}
      </div>
      <div class="col-md-6 mb-2">
        <strong class="text-success">Volume Mínimo:</strong> 
        <span>${(volumeTotal/1000).toLocaleString('pt-BR', {maximumFractionDigits: 2})} ml</span>
      </div>
      <div class="col-md-6 mb-2">
        <strong class="text-success">Volume Margem:</strong> 
        <span>${(volumeComMargem/1000).toLocaleString('pt-BR', {maximumFractionDigits: 2})} ml</span>
      </div>
      <div class="col-12 mb-2">
        <strong class="text-success">Volume Viral:</strong> 
        <span>${diluicoes[0].valor.toLocaleString('pt-BR', {maximumFractionDigits: 4})} µl</span>
      </div>
    </div>

    <hr class="my-3">

    <h5 class="text-success mb-3">Diluições Necessárias:</h5>
    <div class="diluicoes">`;

  diluicoes.forEach((dil, index) => {
    let notacao = index === 0 ? '' : `×10<sup>${index}</sup>`;
    resultadoHTML += `<div class="mb-1">10<sup>${expoente}</sup> ${notacao} → 
      <span class="badge bg-success">${dil.valor.toLocaleString('pt-BR', {maximumFractionDigits: 4})} µl</span></div>`;
  });

  resultadoHTML += `</div>`;

  // Mostrar resultado e botão de copiar
  const resultadoDiv = document.getElementById('resultado');
  resultadoDiv.innerHTML = resultadoHTML;
  resultadoDiv.classList.remove('d-none');
  
  document.getElementById('copiar-resultado').classList.remove('d-none');
}

function copiarResultado() {
  try {
    // Obter os valores diretamente dos campos de entrada
    const titulacaoInput = document.getElementById('titulacao').value.trim();
    const amostras = document.getElementById('amostras').value;
    
    // Converter titulação para formato legível
    const expoente = titulacaoInput.replace("10^", "").replace(",", ".");
    const valorDecimal = Math.pow(10, parseFloat(expoente)).toLocaleString('pt-BR', {maximumFractionDigits: 4});
    const volumeVirus = (Math.pow(10, parseFloat(expoente)) / 2000).toLocaleString('pt-BR', {maximumFractionDigits: 4});
    
    // Calcular placas necessárias
    const placasNecessarias = amostras <= 6 ? 1 : 1 + Math.ceil((amostras - 6) / 12);
    
    // Calcular volumes
    let volumeTotal = amostras <= 6 ? 5000 : 5000 + Math.ceil((amostras - 6) * (5000 / 12));
    const volumeComMargem = Math.ceil(volumeTotal * 1.2);
    
    // Calcular quantidade inicial e diluições
    let quantidadeInicial = volumeComMargem / (Math.pow(10, parseFloat(expoente)) / 2000);
    let diluicoes = [quantidadeInicial];
    
    // Adicionar diluições até que a quantidade seja > 100µl
    while (quantidadeInicial <= 100) {
      quantidadeInicial *= 10;
      diluicoes.push(quantidadeInicial);
    }
    
    // Construir texto formatado para cópia
    const textoParaCopiar = [
      `Titulação: 10^${expoente} = ${valorDecimal}`,
      `Ajuste TCID₅₀: ${valorDecimal} / 2000 = ${volumeVirus}`,
      `Amostras: ${amostras}`,
      `Placas Necessárias: ${placasNecessarias}`,
      `Volume Mínimo: ${(volumeTotal/1000).toLocaleString('pt-BR', {maximumFractionDigits: 2})} ml`,
      `Volume com Margem: ${(volumeComMargem/1000).toLocaleString('pt-BR', {maximumFractionDigits: 2})} ml`,
      `Volume Viral: ${diluicoes[0].toLocaleString('pt-BR', {maximumFractionDigits: 4})} µl`,
      '',
      `Diluições:`
    ];
    
    // Adicionar cada diluição ao texto
    diluicoes.forEach((dil, index) => {
      const notacao = index === 0 ? '' : ` ×10^${index}`;
      textoParaCopiar.push(`10^${expoente}${notacao} → ${dil.toLocaleString('pt-BR', {maximumFractionDigits: 4})} µl`);
    });

    // Juntar tudo com quebras de linha
    const textoFinal = textoParaCopiar.join('\n');

    // Criar elemento temporário para copiar
    const textarea = document.createElement('textarea');
    textarea.value = textoFinal;
    document.body.appendChild(textarea);
    textarea.select();
    
    // Executar cópia
    const copiado = document.execCommand('copy');
    document.body.removeChild(textarea);
    
    // Feedback visual
    const btn = document.getElementById('copiar-resultado');
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
window.calcular = calcular;
window.copiarResultado = copiarResultado;
window.abrirImagem = abrirImagem;