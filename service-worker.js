<script>
  // Mostra a splash screen ao carregar
  document.addEventListener("DOMContentLoaded", function() {
    setTimeout(() => {
      document.getElementById("splash-screen").classList.add("hide");
    }, 3000); // Espera 3 segundos antes de sumir
  });
  
  // Função para calcular os valores
  function calcular() {
    const titulacao = document.getElementById('titulacao').value;
    const amostras = parseInt(document.getElementById('amostras').value);

    if (!titulacao || isNaN(amostras)) {
      alert("Por favor, insira valores válidos.");
      return;
    }

    // Lógica de cálculo (substitua pela sua lógica)
    const resultadoDiv = document.getElementById('resultado');
    resultadoDiv.innerHTML = `
      <strong>Resultado:</strong> Cálculo realizado com sucesso!<br>
    `;
  }

  // Funções para expandir/recolher as seções de ajuda
  function toggleAjuda() {
    const explicacao = document.getElementById('explicacao');
    explicacao.style.display = explicacao.style.display === 'block' ? 'none' : 'block';
  }

  function toggleEtapasSoroneutralizacao() {
    const etapas = document.getElementById('etapasSoroneutralizacao');
    etapas.style.display = etapas.style.display === 'block' ? 'none' : 'block';
  }

  function toggleObservacoesTeste() {
    const observacoes = document.getElementById('observacoesTeste');
    observacoes.style.display = observacoes.style.display === 'block' ? 'none' : 'block';
  }

  // Função para abrir imagem (pode ser implementada conforme necessário)
  function abrirImagem() {
    alert("Abrir imagem");
  }
</script>
