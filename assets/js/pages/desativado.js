// Imports do Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js";
import { 
    getAuth, 
    onAuthStateChanged, 
    signOut,
    deleteUser 
} from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";
import { 
    getFirestore, 
    doc, 
    getDoc, 
    deleteDoc 
} from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js";

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
const db = getFirestore(app);
const auth = getAuth(app);

let usuarioAtual = null;

document.addEventListener('DOMContentLoaded', function() {
    console.log("Página de conta desativada carregada");
    
    // Verificar autenticação
    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            // Se não está logado, redirecionar para login
            window.location.href = "../index.html";
            return;
        }
        
        // Carregar dados do usuário
        await carregarDadosUsuario(user.uid);
        configurarEventListeners();
    });
});

// Carregar dados do usuário
async function carregarDadosUsuario(uid) {
    try {
        const userDoc = await getDoc(doc(db, "usuarios", uid));
        
        if (userDoc.exists()) {
            usuarioAtual = userDoc.data();
            
            // Verificar se realmente está inativo
            if (usuarioAtual.ativo !== false) {
                // Se está ativo, redirecionar para hub
                window.location.href = "hub.html";
                return;
            }
            
            // Preencher dados na tela
            document.getElementById('user-nome').textContent = usuarioAtual.nome;
            document.getElementById('user-email').textContent = usuarioAtual.email;
            
            // Data de desativação
            const dataDesativacao = usuarioAtual.dataDesativacao ? 
                new Date(usuarioAtual.dataDesativacao).toLocaleDateString('pt-BR') : 
                'Não informada';
            document.getElementById('data-desativacao').textContent = dataDesativacao;
            
        } else {
            console.error("Dados do usuário não encontrados");
            await fazerLogout();
        }
        
    } catch (error) {
        console.error("Erro ao carregar dados do usuário:", error);
        await fazerLogout();
    }
}

// Configurar event listeners
function configurarEventListeners() {
    // Botão de excluir conta
    document.querySelector('.btn-excluir-conta').addEventListener('click', () => {
        const modal = new bootstrap.Modal(document.getElementById('modalConfirmacao'));
        modal.show();
    });
    
    // Botão de contato
    document.querySelector('.btn-contato').addEventListener('click', () => {
        const modal = new bootstrap.Modal(document.getElementById('modalContato'));
        modal.show();
    });
    
    // Botão de logout
    document.querySelector('.btn-logout').addEventListener('click', fazerLogout);
    
    // Checkbox de confirmação
    document.getElementById('confirmo-exclusao').addEventListener('change', function() {
        document.getElementById('btn-confirmar-exclusao').disabled = !this.checked;
    });
    
    // Botão de confirmar exclusão
    document.getElementById('btn-confirmar-exclusao').addEventListener('click', excluirConta);
}

// Excluir conta do usuário
async function excluirConta() {
    const btnConfirmar = document.getElementById('btn-confirmar-exclusao');
    const textOriginal = btnConfirmar.innerHTML;
    
    try {
        // Mostrar loading
        btnConfirmar.disabled = true;
        btnConfirmar.innerHTML = `
            <span class="spinner-border spinner-border-sm me-2" role="status"></span>
            Excluindo...
        `;
        
        const user = auth.currentUser;
        if (!user) {
            throw new Error("Usuário não autenticado");
        }
        
        console.log(`Iniciando exclusão da conta: ${usuarioAtual.nome} (${user.uid})`);
        
        // 1. Excluir dados do Firestore
        await deleteDoc(doc(db, "usuarios", user.uid));
        console.log("✅ Dados removidos do Firestore");
        
        // 2. Excluir conta do Authentication
        await deleteUser(user);
        console.log("✅ Conta removida do Authentication");
        
        // 3. Limpar dados locais
        localStorage.clear();
        sessionStorage.clear();
        
        // 4. Mostrar sucesso e redirecionar
        alert(`✅ Conta excluída com sucesso!

Sua conta foi completamente removida do sistema:
• Dados pessoais excluídos
• Histórico de atividades removido
• Acesso ao sistema revogado

Obrigado por ter usado nossos serviços.`);
        
        // Redirecionar para página inicial
        window.location.href = "../index.html";
        
    } catch (error) {
        console.error("Erro ao excluir conta:", error);
        
        // Restaurar botão
        btnConfirmar.disabled = false;
        btnConfirmar.innerHTML = textOriginal;
        
        // Mostrar erro específico
        let mensagemErro = "Erro desconhecido";
        
        if (error.code === 'auth/requires-recent-login') {
            mensagemErro = "Por segurança, você precisa fazer login novamente antes de excluir a conta.";
            setTimeout(() => {
                fazerLogout();
            }, 3000);
        } else if (error.code === 'permission-denied') {
            mensagemErro = "Sem permissão para excluir a conta. Entre em contato com o suporte.";
        } else {
            mensagemErro = error.message;
        }
        
        alert(`❌ Erro ao excluir conta: ${mensagemErro}`);
    }
}

// Fazer logout
async function fazerLogout() {
    try {
        await signOut(auth);
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = "../index.html?logout=true";
    } catch (error) {
        console.error("Erro ao fazer logout:", error);
        window.location.href = "../index.html";
    }
}

// Utility function para mostrar alerts customizados
function mostrarAlert(titulo, mensagem, tipo = 'info') {
    const alert = document.createElement('div');
    alert.className = `alert alert-${tipo} alert-dismissible fade show position-fixed`;
    alert.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
    
    alert.innerHTML = `
        <strong>${titulo}</strong><br>
        ${mensagem}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(alert);
    
    // Auto remover após 5 segundos
    setTimeout(() => {
        if (alert.parentNode) {
            alert.remove();
        }
    }, 5000);
}