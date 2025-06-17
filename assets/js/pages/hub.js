import { getAuth, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js";
import { getFirestore, getDoc, doc } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js"; // Adicionar getFirestore

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
const db = getFirestore(app); // Adicionar esta linha

document.addEventListener('DOMContentLoaded', function () {
  console.log("Desenvolvido por Pedro Ruiz Sangoi e Alexandre Werle Soares");
  
  // Verificar se usuário está autenticado
  const usuario = JSON.parse(localStorage.getItem("usuario") || sessionStorage.getItem("usuario") || '{}');
  
  if (!usuario.nome) {
    window.location.href = "../index.html";
  } else {
    document.querySelector('.user-name').textContent = usuario.nome;
    
    // Verificar se usuário é admin
    console.log("Role do usuário:", usuario.role);
    if (usuario.role === 'admin') {
      console.log("Mostrando botão admin");
      document.getElementById('admin-button').style.display = 'flex';
    }
    
    // Garantir que elementos de ação do usuário estão visíveis
    document.querySelector('.user-actions').style.display = 'flex';
  }

  // Event listener para o botão admin
  const adminButton = document.getElementById('admin-button');
  if (adminButton) {
    adminButton.addEventListener('click', function() {
      window.location.href = 'admin.html';
    });
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

// Verificação de usuário ativo/inativo
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "../index.html";
        return;
    }
    
    try {
        // Verificar se usuário está ativo
        const userDoc = await getDoc(doc(db, "usuarios", user.uid));
        if (userDoc.exists()) {
            const userData = userDoc.data();
            if (userData.ativo === false) {
                console.log("Usuário inativo detectado, redirecionando...");
                window.location.href = "desativado.html";
                return;
            }
        }
    } catch (error) {
        console.error("Erro ao verificar status do usuário:", error);
        // Em caso de erro, continuar normalmente
    }
});