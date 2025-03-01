document.addEventListener("DOMContentLoaded", function() {
  // Verifica se o usuário está em um dispositivo móvel
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  const splashImage = document.getElementById("splash-logo");

  if (splashImage) {
    // Define a imagem correta
    splashImage.src = isMobile ? "assets/splash-portrait.png" : "assets/imagem_pc.png";
  }

  // Esconde a splash screen após 3 segundos
  setTimeout(() => {
    const splashScreen = document.getElementById("splash-screen");
    if (splashScreen) {
      splashScreen.classList.add("hide");
    }
  }, 3000);
});

// Função para calcular os valores
function calcular() {
  const titulacao = document.getElementById("titulacao")?.value;
  const amostras = parseInt(document.getElementById("amostras")?.value, 10);

  if (!titulacao || isNaN(amostras)) {
    alert("Por favor, insira valores válidos.");
    return;
  }

  // Atualiza o resultado
  const resultadoDiv = document.getElementById("resultado");
  if (resultadoDiv) {
    resultadoDiv.innerHTML = `<strong>Resultado:</strong> Cálculo realizado com sucesso!<br>`;
  }
}

// Função genérica para expandir/recolher seções
function toggleSection(sectionId) {
  const section = document.getElementById(sectionId);
  if (section) {
    section.style.display = section.style.display === "block" ? "none" : "block";
  }
}

// Função para abrir imagem (implemente conforme necessário)
function abrirImagem() {
  alert("Abrir imagem");
}
