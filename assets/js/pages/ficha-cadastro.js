import { signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";
import { getDoc, doc } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js";
import { app, auth, db } from "../firebase.js";

// Firebase via módulo compartilhado

document.addEventListener('DOMContentLoaded', function () {
  console.log("Página de Ficha de Cadastro carregada");
  
  // Render otimista a partir do cache; onAuthStateChanged cuidará da validação
  const usuario = JSON.parse(localStorage.getItem("usuario") || sessionStorage.getItem("usuario") || '{}');
  if (usuario?.nome) {
    const userNameEl = document.querySelector('.user-name');
    if (userNameEl) userNameEl.textContent = usuario.nome;
    if (usuario.role === 'admin') {
      const adminBtn = document.getElementById('admin-button');
      if (adminBtn) adminBtn.style.display = 'flex';
    }
    const userActions = document.querySelector('.user-actions');
    if (userActions) userActions.style.display = 'flex';
  }

  // Event listener para o botão admin
  const adminButton = document.getElementById('admin-button');
  if (adminButton) {
    adminButton.addEventListener('click', function() {
      window.location.href = 'admin.html';
    });
  }

  // Configurar botão de logout
  const logoutBtn = document.getElementById('logout-button');
  if (logoutBtn) logoutBtn.addEventListener('click', async () => {
    try {
      // Limpar dados primeiro
      localStorage.removeItem('usuario');
      localStorage.removeItem('manterConectado');
      sessionStorage.removeItem('usuario');

      // Em seguida fazer logout do Firebase
      await signOut(auth);

      // Redirecionar
      window.location.href = "../index.html?logout=true";
    } catch (error) {
      alert("Erro ao desconectar: " + error.message);
    }
  });
});

// Verificação de usuário ativo/inativo
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "../index.html";
    return;
  }
  try {
    let stored = JSON.parse(localStorage.getItem('usuario') || sessionStorage.getItem('usuario') || '{}');
    if (!stored?.nome) {
      const snap = await getDoc(doc(db, 'usuarios', user.uid));
      if (snap.exists()) {
        stored = snap.data();
        const manter = localStorage.getItem('manterConectado') === 'true';
        if (manter) localStorage.setItem('usuario', JSON.stringify(stored));
        else sessionStorage.setItem('usuario', JSON.stringify(stored));
      }
    }
    if (stored && stored.ativo === false) {
      window.location.href = "desativado.html";
      return;
    }
    const userNameEl = document.querySelector('.user-name');
    if (userNameEl && stored?.nome) userNameEl.textContent = stored.nome;
    if (stored?.role === 'admin') {
      const adminBtn = document.getElementById('admin-button');
      if (adminBtn) adminBtn.style.display = 'flex';
    }
    const userActions = document.querySelector('.user-actions');
    if (userActions) userActions.style.display = 'flex';
  } catch (error) {
    console.error("Erro ao verificar status do usuário:", error);
  }
});
