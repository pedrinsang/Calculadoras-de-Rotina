import { getAuth, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js";
import { getFirestore, getDoc, doc } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js";

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
const db = getFirestore(app);

document.addEventListener('DOMContentLoaded', function () {
  console.log("Página Setor de Virologia carregada");
  
  // Verificar se usuário está autenticado
  const usuario = JSON.parse(localStorage.getItem("usuario") || sessionStorage.getItem("usuario") || '{}');
  
  if (!usuario.nome) {
    window.location.href = "../../index.html";
  } else {
    document.querySelector('.user-name').textContent = usuario.nome;
    
    // Verificar se usuário é admin
    if (usuario.role === 'admin') {
      document.getElementById('admin-button').style.display = 'flex';
    }
    
    // Garantir que elementos de ação do usuário estão visíveis
    document.querySelector('.user-actions').style.display = 'flex';
  }

  // Event listener para o botão admin
  const adminButton = document.getElementById('admin-button');
  if (adminButton) {
    adminButton.addEventListener('click', function() {
      window.location.href = '../admin.html';
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

      // Redirecionar
      window.location.href = "../../index.html?logout=true";
    } catch (error) {
      alert("Erro ao desconectar: " + error.message);
    }
  });

  // Manipulação do formulário
  const fichaForm = document.getElementById('ficha-form');
  if (fichaForm) {
    fichaForm.addEventListener('submit', function(e) {
      e.preventDefault();
      
      // Coletar dados do formulário
      const formData = new FormData(fichaForm);
      const fichaData = {};
      
      // Campos de texto simples
      for (let [key, value] of formData.entries()) {
        if (key !== 'exames') {
          fichaData[key] = value;
        }
      }
      
      // Exames selecionados (checkboxes)
      const examesSelecionados = formData.getAll('exames');
      fichaData.exames = examesSelecionados;
      
      // Adicionar timestamp
      fichaData.dataPreenchimento = new Date().toISOString();
      fichaData.laboratorio = 'Setor de Virologia';
      
      console.log('Dados da ficha:', fichaData);
      
      // Aqui você pode implementar o salvamento no Firebase
      salvarFicha(fichaData);
    });
  }

  // Lógica para mostrar/esconder campo "outros exames"
  const exameOutros = document.getElementById('exame-outros');
  const especificarOutros = document.getElementById('exames-outros-especificar');
  
  if (exameOutros && especificarOutros) {
    exameOutros.addEventListener('change', function() {
      especificarOutros.style.display = this.checked ? 'block' : 'none';
      especificarOutros.required = this.checked;
    });
  }
});

// Função para salvar a ficha
async function salvarFicha(fichaData) {
  try {
    // Mostrar loading
    const submitBtn = document.querySelector('.btn-primary');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="bi bi-hourglass-split"></i> Salvando...';
    submitBtn.disabled = true;
    
    // Simular salvamento (substitua pela lógica do Firebase)
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Sucesso
    submitBtn.innerHTML = '<i class="bi bi-check-lg"></i> Salvo!';
    submitBtn.style.backgroundColor = '#4caf50';
    
    setTimeout(() => {
      alert('Ficha salva com sucesso!');
      document.getElementById('ficha-form').reset();
      submitBtn.innerHTML = originalText;
      submitBtn.disabled = false;
      submitBtn.style.backgroundColor = '';
    }, 1000);
    
  } catch (error) {
    console.error('Erro ao salvar ficha:', error);
    alert('Erro ao salvar a ficha. Tente novamente.');
    
    // Restaurar botão
    const submitBtn = document.querySelector('.btn-primary');
    submitBtn.innerHTML = '<i class="bi bi-check-lg"></i> Salvar Ficha';
    submitBtn.disabled = false;
  }
}

// Verificação de usuário ativo/inativo
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "../../index.html";
        return;
    }
    
    try {
        // Verificar se usuário está ativo
        const userDoc = await getDoc(doc(db, "usuarios", user.uid));
        if (userDoc.exists()) {
            const userData = userDoc.data();
            if (userData.ativo === false) {
                console.log("Usuário inativo detectado, redirecionando...");
                window.location.href = "../desativado.html";
                return;
            }
        }
    } catch (error) {
        console.error("Erro ao verificar status do usuário:", error);
    }
});
