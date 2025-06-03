import { getAuth, signOut } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js";

// Configuração do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAJneFO6AYsj5_w3hIKzPGDa8yR6Psng4M",
  authDomain: "hub-de-calculadoras.firebaseapp.com",
  projectId: "hub-de-calculadoras",
  storageBucket: "hub-de-calculadoras.appspot.com",
  messagingSenderId: "203883856586",
  appId: "1:203883856586:web:a00536536a32ae76c5aa33",
  measurementId: "G-7H314CT9SH"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

document.addEventListener('DOMContentLoaded', function () {
  console.log("Desenvolvido por Pedro Ruiz Sangoi e Alexandre Werle Soares");
  
  // Verificar se usuário está autenticado
  const usuario = JSON.parse(localStorage.getItem("usuario") || sessionStorage.getItem("usuario") || '{}');
  if (!usuario.nome) {
    window.location.href = "../index.html";
  } else {
    document.querySelector('.user-name').textContent = usuario.nome;
    
    // Garantir que elementos de ação do usuário estão visíveis
    document.querySelector('.user-actions').style.display = 'flex';
  }

  // Configurar botão de logout
  document.getElementById('logout-button').addEventListener('click', async () => {
    try {
      // Limpar dados primeiro
      localStorage.removeItem('usuario');
      localStorage.removeItem('manterConectado');
      sessionStorage.removeItem('usuario');

      // Em seguida fazer logout do Firebase
      await signOut(auth);

      // Redirecionar com flag para evitar o loop
      window.location.href = "../index.html?logout=true";
    } catch (error) {
      alert("Erro ao desconectar: " + error.message);
    }
  });

  // Forçar recálculo do layout para garantir centralização
  setTimeout(() => {
    document.body.style.display = 'none';
    // Força reflow
    void document.body.offsetHeight;
    document.body.style.display = 'flex';
  }, 50);
});