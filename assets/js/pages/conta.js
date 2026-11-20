import { 
  signOut, 
  sendPasswordResetEmail,
  onAuthStateChanged,
  deleteUser,
  reauthenticateWithCredential,
  EmailAuthProvider
} from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";
import { 
  doc, 
  getDoc, 
} from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js";
import { app, auth, db } from "../firebase.js";
import { gravarComAuditoria } from "../utils/auditoria.js";

// Firebase já inicializado via módulo compartilhado

// Avisos no padrão do sistema (cai no alert() se o ui.js não carregar)
function avisarConta(msg) {
  const texto = String(msg ?? "").trim();
  if (!window.VirologiaUFSM?.aviso) { window.alert(texto); return; }
  const erro = /erro|não foi possível|por favor|deve |não foi carregado/i.test(texto);
  const sucesso = /sucesso|enviado/i.test(texto);
  const tipo = erro ? "erro" : sucesso ? "ok" : "info";
  if (texto.length <= 60) window.VirologiaUFSM.aviso({ tipo, titulo: texto });
  else window.VirologiaUFSM.aviso({ tipo, titulo: erro ? "Algo deu errado" : "Pronto", texto });
}


document.addEventListener('DOMContentLoaded', function() {
  console.log("Página conta.html carregada");
  
  // Mostrar mensagem de carregamento
  // (insertAdjacentHTML só acrescenta; "innerHTML +=" recriava a página e apagava os eventos da casca)
  document.body.insertAdjacentHTML('beforeend', '<div id="loading-overlay" class="vu-carregando-tela"><div class="vu-carregando" role="status"><div class="vu-placa">' +
    Array.from({ length: 12 }, (_, i) => `<i style="--d:${i}"></i>`).join('') + '</div><span>Carregando seus dados…</span></div></div>');
  
  // Verificar autenticação de forma assíncrona
  onAuthStateChanged(auth, async (user) => {
    console.log("Estado de autenticação verificado:", user ? "Usuário logado" : "Usuário não logado");
    
    if (!user) {
      console.log("Redirecionando: nenhum usuário autenticado");
      window.location.href = "../index.html";
      return;
    }
    
    // Usuário autenticado: reconstruir dados se não estiverem no storage
    let usuarioStorage = JSON.parse(localStorage.getItem("usuario") || sessionStorage.getItem("usuario") || '{}');
    if (!usuarioStorage?.nome) {
      try {
        const snap = await getDoc(doc(db, "usuarios", user.uid));
        if (snap.exists()) {
          usuarioStorage = { uid: user.uid, ...snap.data() };
          const manter = localStorage.getItem("manterConectado") === "true";
          if (manter) {
            localStorage.setItem("usuario", JSON.stringify(usuarioStorage));
          } else {
            sessionStorage.setItem("usuario", JSON.stringify(usuarioStorage));
          }
        }
      } catch (e) {
        console.warn("Não foi possível reconstruir usuário do Firestore:", e);
      }
    }
    
    try {
      console.log("Carregando dados do usuário do Firestore");
      const userDoc = await getDoc(doc(db, "usuarios", user.uid));
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        
        // Preencher campos do formulário
        document.getElementById('nome').value = userData.nome || '';
        document.getElementById('sigla').value = userData.sigla || '';
        document.getElementById('email').value = userData.email || '';
        
        // Formatar data de cadastro se disponível (aceita texto, número ou Timestamp do Firestore)
        if (userData.dataCadastro) {
          const date = userData.dataCadastro.toDate ? userData.dataCadastro.toDate() : new Date(userData.dataCadastro);
          if (!isNaN(date)) document.getElementById('data-cadastro').value = date.toLocaleDateString('pt-BR');
        }

        // Cartão do perfil no topo
        const nomePerfil = (userData.nome || '').trim();
        document.querySelectorAll('[data-conta-nome]').forEach(el => { el.textContent = nomePerfil || 'Minha conta'; });
        document.querySelectorAll('[data-conta-iniciais]').forEach(el => {
          el.textContent = (userData.sigla || nomePerfil.split(/\s+/).map(p => p[0]).join('') || '··').slice(0, 2).toUpperCase();
        });
        document.querySelectorAll('[data-conta-detalhe]').forEach(el => {
          el.textContent = [userData.sigla ? `Sigla ${userData.sigla}` : '', userData.email || ''].filter(Boolean).join(' · ');
        });
        
        // Preencher campos do formulário de edição
        document.getElementById('edit-nome').value = userData.nome || '';
        document.getElementById('edit-sigla').value = userData.sigla || '';
      } else {
        console.log("Documento do usuário não encontrado no Firestore");
      }
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      avisarConta("Erro ao carregar dados: " + error.message);
    }
    
    // Função auxiliar para adicionar event listeners com segurança
    function addSafeEventListener(id, event, handler) {
      const element = document.getElementById(id);
      if (element) {
        element.addEventListener(event, handler);
      } else {
        console.error(`Elemento com ID '${id}' não encontrado`);
      }
    }

    // Se chegou aqui, usuário está autenticado e temos dados
    document.getElementById('loading-overlay').remove();
    
    // Preencher campos do formulário
    document.getElementById('nome').value = usuarioStorage.nome || '';
    document.getElementById('sigla').value = usuarioStorage.sigla || '';
    document.getElementById('email').value = usuarioStorage.email || '';
    
    // Adicionar event listeners com verificação de existência
    addSafeEventListener('voltar-hub', 'click', function() {
      window.location.href = 'hub.html';
    });
    
    
    // Configurar edição de perfil
    addSafeEventListener('edit-profile-btn', 'click', () => {
      // Garantir que Bootstrap está disponível
      if (typeof bootstrap !== 'undefined') {
        const modal = new bootstrap.Modal(document.getElementById('edit-profile-modal'));
        modal.show();
      } else {
        console.error("Bootstrap não está disponível");
        avisarConta("Erro: Bootstrap não foi carregado corretamente");
      }
    });
    
    // Salvar alterações no perfil
    addSafeEventListener('save-profile-btn', 'click', async () => {
      const nome = document.getElementById('edit-nome').value.trim();
      const sigla = document.getElementById('edit-sigla').value.trim().toUpperCase();
      
      if (nome.length < 3) {
        avisarConta("O nome deve ter pelo menos 3 caracteres");
        return;
      }
      
      // Validar sigla (máximo 3 letras)
      if (sigla.length > 3) {
        avisarConta("A sigla deve ter no máximo 3 letras");
        return;
      }
      
      try {
        // Atualizar no Firestore
        const referencia = doc(db, "usuarios", usuarioStorage.uid);
        const snapshot = await getDoc(referencia);
        if (!snapshot.exists()) throw new Error('Cadastro do usuário não encontrado.');
        await gravarComAuditoria({
          operacao: 'atualizar',
          referencia,
          antes: snapshot.data(),
          dados: {
            nome,
            sigla,
            atualizadoEm: new Date().toISOString()
          },
          modulo: 'Gestão de pessoas',
          registroId: usuarioStorage.uid,
          registroNome: nome,
          acao: 'atualizou dados do perfil'
        });
        
        // Atualizar no storage local
        usuarioStorage.nome = nome;
        usuarioStorage.sigla = sigla;
        localStorage.setItem("usuario", JSON.stringify(usuarioStorage));
        if (localStorage.getItem("manterConectado") !== "true") {
          sessionStorage.setItem("usuario", JSON.stringify(usuarioStorage));
        }
        
        // Atualizar formulário
        document.getElementById('nome').value = nome;
        document.getElementById('sigla').value = sigla;
        
        // Fechar modal e mostrar feedback
        if (typeof bootstrap !== 'undefined') {
          bootstrap.Modal.getInstance(document.getElementById('edit-profile-modal')).hide();
          avisarConta("Perfil atualizado com sucesso!");
        } else {
          document.getElementById('edit-profile-modal').style.display = 'none';
          avisarConta("Perfil atualizado com sucesso!");
        }
      } catch (error) {
        console.error("Erro ao atualizar perfil:", error);
        avisarConta("Erro ao atualizar: " + error.message);
      }
    });
    
    // Configurar alteração de senha
    addSafeEventListener('change-password-btn', 'click', async () => {
      try {
        await sendPasswordResetEmail(auth, user.email);
        avisarConta("Email de redefinição de senha enviado! Verifique sua caixa de entrada.");
      } catch (error) {
        console.error("Erro ao enviar email de redefinição:", error);
        avisarConta("Erro: " + error.message);
      }
    });
    
    // Sanitizar sigla para 3 letras maiúsculas
    document.getElementById('edit-sigla').addEventListener('input', function() {
      this.value = this.value.replace(/[^a-zA-Z]/g, '').toUpperCase();
      if (this.value.length > 3) {
        this.value = this.value.substring(0, 3);
      }
    });
    
    // CONFIGURAR EXCLUSÃO DE CONTA
    addSafeEventListener('delete-account-btn', 'click', () => {
      if (typeof bootstrap !== 'undefined') {
        const deleteModal = new bootstrap.Modal(document.getElementById('delete-account-modal'));
        deleteModal.show();
      } else {
        console.error("Bootstrap não está disponível");
        avisarConta("Erro: Bootstrap não foi carregado corretamente");
      }
    });
    
    // Verificar texto de confirmação
    document.getElementById('delete-confirmation-input').addEventListener('input', function() {
      const confirmText = "EXCLUIR MINHA CONTA";
      const confirmButton = document.getElementById('confirm-delete-btn');
      
      if (this.value === confirmText) {
        confirmButton.removeAttribute('disabled');
      } else {
        confirmButton.setAttribute('disabled', 'disabled');
      }
    });
    
    // Botão de confirmação da exclusão
    addSafeEventListener('confirm-delete-btn', 'click', async function() {
      if (this.hasAttribute('disabled')) {
        return; // Extra verificação
      }
      
      try {
        // Mostrar spinner
        this.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Excluindo...';
        this.disabled = true;
        
        // Obter usuário atual
        const user = auth.currentUser;
        
        // Solicitar senha para reautenticação
        const senha = document.getElementById('delete-password').value;
        if (!senha) {
          avisarConta("Por favor, digite sua senha para confirmar a exclusão.");
          this.disabled = false;
          this.innerHTML = '<i class="bi bi-trash3"></i> Excluir Permanentemente';
          return;
        }
        
        // Reautenticar usuário
        const credential = EmailAuthProvider.credential(user.email, senha);
        await reauthenticateWithCredential(user, credential);
        
        // Primeiro deletar dados do Firestore
        await gravarComAuditoria({
          operacao: 'excluir',
          referencia: doc(db, "usuarios", user.uid),
          antes: { ...usuarioStorage },
          modulo: 'Gestão de pessoas',
          registroId: user.uid,
          registroNome: usuarioStorage.nome || user.displayName,
          acao: 'excluiu a própria conta',
          ator: {
            uid: user.uid,
            nome: usuarioStorage.nome || user.displayName,
            role: usuarioStorage.role,
            perfilAcesso: usuarioStorage.perfilAcesso
          }
        });
        console.log("Dados do usuário excluídos do Firestore");
        
        // Depois excluir a conta do Authentication
        await deleteUser(user);
        console.log("Conta do usuário excluída do Firebase Authentication");
        
        // Limpar dados locais
        localStorage.removeItem("usuario");
        localStorage.removeItem("manterConectado");
        sessionStorage.removeItem("usuario");
        
        window.alert("Sua conta foi excluída com sucesso!");
        window.location.href = "../index.html?deleted=true";
        
      } catch (error) {
        console.error("Erro ao excluir conta:", error);
        
        if (error.code === 'auth/requires-recent-login') {
          avisarConta("Não foi possível autenticar. Faça login novamente antes de excluir sua conta.");
          await signOut(auth);
          window.location.href = "../index.html?action=reauth&intent=delete";
          return;
        }
        
        if (error.code === 'auth/wrong-password') {
          avisarConta("Senha incorreta. Tente novamente.");
        } else {
          avisarConta("Erro ao excluir conta: " + error.message);
        }
        
        this.disabled = false;
        this.innerHTML = '<i class="bi bi-trash3"></i> Excluir Permanentemente';
      }
    });
  });
});
