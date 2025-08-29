import { signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";
import { getDoc, doc } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js";
import { app, auth, db } from "../firebase.js";

// Firebase já inicializado via módulo compartilhado

document.addEventListener('DOMContentLoaded', function () {
  console.log("Desenvolvido por Pedro Ruiz Sangoi e Alexandre Werle Soares");
  
  // Render otimista se houver cache; não redireciona aqui
  const usuario = JSON.parse(localStorage.getItem("usuario") || sessionStorage.getItem("usuario") || '{}');
  if (usuario?.nome) {
    const nameEl = document.querySelector('.user-name');
    if (nameEl) nameEl.textContent = usuario.nome;
    if (usuario.role === 'admin') {
      const btn = document.getElementById('admin-button');
      if (btn) btn.style.display = 'flex';
    }
    const actions = document.querySelector('.user-actions');
    if (actions) actions.style.display = 'flex';
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
    // Reconstituir 'usuario' se não houver em storage
    let stored = JSON.parse(localStorage.getItem("usuario") || sessionStorage.getItem("usuario") || '{}');
    if (!stored?.nome) {
      const snap = await getDoc(doc(db, 'usuarios', user.uid));
      if (snap.exists()) {
        stored = snap.data();
        const manter = localStorage.getItem('manterConectado') === 'true';
        if (manter) {
          localStorage.setItem('usuario', JSON.stringify(stored));
        } else {
          sessionStorage.setItem('usuario', JSON.stringify(stored));
        }
      }
    }

    // Verificar ativo/inativo
    if (stored && stored.ativo === false) {
      console.log("Usuário inativo detectado, redirecionando...");
      window.location.href = "desativado.html";
      return;
    }

    // Atualizar UI
    const nameEl = document.querySelector('.user-name');
    if (nameEl && stored?.nome) nameEl.textContent = stored.nome;
    const isAdmin = stored?.role === 'admin';
    const btn = document.getElementById('admin-button');
    if (btn) btn.style.display = isAdmin ? 'flex' : 'none';
    const actions = document.querySelector('.user-actions');
    if (actions) actions.style.display = 'flex';
  } catch (error) {
    console.error("Erro ao verificar status do usuário:", error);
    // Em caso de erro, manter usuário na tela
  }
});