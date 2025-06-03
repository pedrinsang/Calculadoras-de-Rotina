import { initializeApp } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  fetchSignInMethodsForEmail,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";

import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  query,
  setDoc,
  doc,
  where,
  getDoc
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

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Configurar persistência com base na preferência armazenada
(async () => {
  const manterConectado = localStorage.getItem("manterConectado") === "true";
  if (manterConectado) {
    await setPersistence(auth, browserLocalPersistence);
  } else {
    await setPersistence(auth, browserSessionPersistence);
  }
})();

// Elementos da UI
let alertMessage;
let loginForm;
let cadastroForm;
let forgotPasswordForm;
let loginButton;
let cadastroButton;
let resetPasswordButton;

// Inicialização quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', function() {
  console.log("Desenvolvido por Pedro Ruiz Sangoi e Alexandre Werle Suares, com auxílio do DeepSeek Chat.");
  
  // Inicializar elementos da UI
  initUI();
  
  // Configurar event listeners
  setupEventListeners();
  
  // Detectar estado de autenticação
  checkAuthState();
  
  // Configurar suporte a PWA
  setupPWA();
});

// Inicializar referências para elementos da UI
function initUI() {
  alertMessage = document.getElementById('alert-message');
  loginForm = document.getElementById("login-form");
  cadastroForm = document.getElementById("cadastro-form");
  forgotPasswordForm = document.getElementById("forgot-password-form");
  loginButton = document.getElementById("login-button");
  cadastroButton = document.getElementById("cadastro-button");
  resetPasswordButton = document.getElementById("send-reset-button");
  
  // Configurar toggle de senha
  setupTogglePassword();
}


// Configurar todos os event listeners
function setupEventListeners() {
  // Alternar entre formulários
  document.getElementById("show-cadastro").addEventListener('click', (e) => {
    e.preventDefault();
    showForm("cadastro-form");
  });

  document.getElementById("show-login").addEventListener('click', (e) => {
    e.preventDefault();
    showForm("login-form");
  });

  document.getElementById("show-forgot-password").addEventListener('click', (e) => {
    e.preventDefault();
    showForm("forgot-password-form");
  });

  document.getElementById("show-login-from-forgot").addEventListener('click', (e) => {
    e.preventDefault();
    showForm("login-form");
  });
  
  // Eventos principais
  loginButton.addEventListener('click', handleLogin);
  cadastroButton.addEventListener('click', handleCadastro);
  resetPasswordButton.addEventListener('click', handlePasswordReset);
  
  // Validação de sigla em tempo real
  document.getElementById("cadastro-sigla").addEventListener('input', function(e) {
    this.value = this.value.replace(/[^a-zA-Z]/g, '').toUpperCase();
    if (this.value.length > 3) {
      this.value = this.value.substring(0, 3);
    }
  });
  
  // Enter para submeter formulários
  loginForm.addEventListener("keypress", function(event) {
    if (event.key === "Enter") {
      event.preventDefault();
      loginButton.click();
    }
  });

  cadastroForm.addEventListener("keypress", function(event) {
    if (event.key === "Enter") {
      event.preventDefault();
      cadastroButton.click();
    }
  });
}

// Funções auxiliares UI
function showAlert(message, type = 'alert-danger') {
  alertMessage.textContent = message;
  alertMessage.className = `alert ${type}`;
  alertMessage.style.display = 'block';
  
  setTimeout(() => {
    alertMessage.style.display = 'none';
  }, 5000);
}

function showForm(formId) {
  loginForm.style.display = "none";
  cadastroForm.style.display = "none";
  forgotPasswordForm.style.display = "none";
  document.getElementById(formId).style.display = "block";
  alertMessage.style.display = 'none';
}

function setupTogglePassword() {
  document.querySelectorAll('.toggle-password').forEach(toggle => {
    toggle.addEventListener('click', function() {
      const targetId = this.getAttribute('data-target');
      const input = document.getElementById(targetId);
      if (input.type === 'password') {
        input.type = 'text';
      } else {
        input.type = 'password';
      }
    });
  });
}

function setLoading(button, isLoading) {
  const buttonText = button.querySelector('span');
  if (isLoading) {
    button.disabled = true;
    buttonText.innerHTML = `
      <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
      <span>Processando...</span>
    `;
  } else {
    button.disabled = false;
    buttonText.textContent = button.id === 'login-button' ? 'Entrar' : 
                          button.id === 'cadastro-button' ? 'Cadastrar' : 
                          'Enviar Link de Recuperação';
  }
}

function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

// Handlers de ação principais
async function handleLogin() {
  const email = document.getElementById("login-email").value.trim();
  const senha = document.getElementById("login-senha").value;
  const manterConectado = document.getElementById("manter-conectado").checked;

  try {
    setLoading(loginButton, true);

    // Definir persistência antes do login
    if (manterConectado) {
      await setPersistence(auth, browserLocalPersistence);
      localStorage.setItem("manterConectado", "true");
    } else {
      await setPersistence(auth, browserSessionPersistence);
      localStorage.removeItem("manterConectado");
    }

    // Fazer login
    const userCredential = await signInWithEmailAndPassword(auth, email, senha);
    const user = userCredential.user;

    // Buscar dados do usuário no Firestore
    const q = query(collection(db, "usuarios"), where("uid", "==", user.uid));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      showAlert('Erro: usuário não encontrado no banco de dados.', 'alert-danger');
      return;
    }

    // Salvar dados do usuário
    const usuario = querySnapshot.docs[0].data();
    localStorage.setItem("usuario", JSON.stringify(usuario));
    
    // Configurar persistência baseada na preferência
    if (manterConectado) {
      localStorage.setItem("manterConectado", "true");
    } else {
      sessionStorage.setItem("usuario", JSON.stringify(usuario));
      localStorage.removeItem("manterConectado");
    }

    // Redirecionar para o hub
    window.location.href = "pages/hub.html"; 
  } catch (error) {
    console.error("Erro ao fazer login:", error);
    if (error.code === 'auth/user-not-found') {
      showAlert('Usuário não encontrado. Verifique seu email ou cadastre-se.', 'alert-danger');
    } else if (error.code === 'auth/wrong-password') {
      showAlert('Senha incorreta. Tente novamente.', 'alert-danger');
    } else {
      showAlert('Erro ao fazer login: ' + error.message, 'alert-danger');
    }
  } finally {
    setLoading(loginButton, false);
  }
}

// Substitua a função verifySecretCodeFromFirestore por esta versão sem logs:

async function verifySecretCodeFromFirestore(inputCode) {
  try {
    const configDoc = await getDoc(doc(db, "configuracoes", "sistema"));
    
    if (!configDoc.exists()) {
      return false;
    }
    
    const configData = configDoc.data();
    
    // Buscar o código secreto considerando possíveis variações no nome do campo
    const codigoCorreto = configData.codigoSecreto || 
                         configData["codigoSecreto "] || // Campo com espaço extra
                         configData["codigo_secreto"] ||
                         configData["codigo"];
    
    const sistemaAtivo = configData.ativo;
    
    // Verificar se o sistema está ativo e se o código corresponde
    return sistemaAtivo && inputCode === codigoCorreto;
    
  } catch (error) {
    return false;
  }
}

// Sistema de proteção contra ataques de força bruta (mantido)
const bruteForceProtection = {
  attempts: parseInt(localStorage.getItem('codeVerifyAttempts') || '0'),
  lastAttempt: parseInt(localStorage.getItem('codeVerifyLastAttempt') || '0'),
  maxAttempts: 5,
  lockoutDuration: 30000, // 30 segundos
  
  recordAttempt: function() {
    const now = Date.now();
    
    // Resetar contador se passou tempo suficiente desde o último bloqueio
    if (now - this.lastAttempt > this.lockoutDuration) {
      this.attempts = 0;
    }
    
    this.lastAttempt = now;
    this.attempts++;
    
    // Armazenar no localStorage para persistir entre refreshes da página
    localStorage.setItem('codeVerifyAttempts', this.attempts);
    localStorage.setItem('codeVerifyLastAttempt', this.lastAttempt);
    
    return this.attempts <= this.maxAttempts;
  },
  
  isLocked: function() {
    const now = Date.now();
    const attempts = parseInt(localStorage.getItem('codeVerifyAttempts') || '0');
    const lastAttempt = parseInt(localStorage.getItem('codeVerifyLastAttempt') || '0');
    
    // Se passou tempo suficiente, remover bloqueio
    if (now - lastAttempt > this.lockoutDuration) {
      localStorage.setItem('codeVerifyAttempts', '0');
      return false;
    }
    
    return attempts > this.maxAttempts;
  },
  
  remainingLockTime: function() {
    const now = Date.now();
    const lastAttempt = parseInt(localStorage.getItem('codeVerifyLastAttempt') || '0');
    const remaining = Math.ceil((this.lockoutDuration - (now - lastAttempt)) / 1000);
    return Math.max(0, remaining);
  }
};

// Função handleCadastro atualizada para usar Firestore
async function handleCadastro() {
  const nome = document.getElementById("cadastro-nome").value.trim();
  const sigla = document.getElementById("cadastro-sigla").value.trim().toUpperCase();
  const email = document.getElementById("cadastro-email").value.trim();
  const senha = document.getElementById("cadastro-senha").value;
  const codigo = document.getElementById("cadastro-codigo").value;

  // Verificar bloqueio por tentativas excessivas
  if (bruteForceProtection.isLocked()) {
    const remainingSeconds = bruteForceProtection.remainingLockTime();
    showAlert(`Muitas tentativas incorretas. Tente novamente em ${remainingSeconds} segundos.`, 'alert-danger');
    return;
  }

  // Validações básicas
  let isValid = true;
  
  if (nome.length < 3) {
    document.getElementById("cadastro-nome").classList.add('is-invalid');
    isValid = false;
  } else {
    document.getElementById("cadastro-nome").classList.remove('is-invalid');
  }
  
  if (!validateEmail(email)) {
    document.getElementById("cadastro-email").classList.add('is-invalid');
    isValid = false;
  } else {
    document.getElementById("cadastro-email").classList.remove('is-invalid');
  }
  
  if (senha.length < 6) {
    document.getElementById("cadastro-senha").classList.add('is-invalid');
    isValid = false;
  } else {
    document.getElementById("cadastro-senha").classList.remove('is-invalid');
  }
  
  if (!codigo) {
    document.getElementById("cadastro-codigo").classList.add('is-invalid');
    isValid = false;
  } else {
    document.getElementById("cadastro-codigo").classList.remove('is-invalid');
  }

  if (!isValid) {
    showAlert('Por favor, corrija os erros no formulário.', 'alert-danger');
    return;
  }

  try {
    setLoading(cadastroButton, true);
    
    // Verificar o código secreto usando Firestore
    const codeIsValid = await verifySecretCodeFromFirestore(codigo);
    
    // Registrar tentativa para proteção contra força bruta
    const canContinue = bruteForceProtection.recordAttempt();
    
    if (!codeIsValid) {
      document.getElementById("cadastro-codigo").classList.add('is-invalid');
      document.getElementById("cadastro-codigo").value = "";
      
      if (!canContinue) {
        // Bloqueio por muitas tentativas
        showAlert(`Muitas tentativas incorretas. Sistema bloqueado por ${bruteForceProtection.lockoutDuration/1000} segundos.`, 'alert-danger');
      } else {
        showAlert('Código secreto inválido. Tente novamente.', 'alert-danger');
      }
      
      return;
    }
    
    // Resetar contador de tentativas após sucesso
    localStorage.setItem('codeVerifyAttempts', '0');
    
    // Verificar se email já existe
    const methods = await fetchSignInMethodsForEmail(auth, email);
    if (methods && methods.length > 0) {
      showAlert('Este email já está em uso. Por favor, faça login.', 'alert-warning');
      return;
    }

    // Criar usuário no Authentication
    const userCredential = await createUserWithEmailAndPassword(auth, email, senha);
    const user = userCredential.user;

    // Salvar dados no Firestore
    await setDoc(doc(db, "usuarios", user.uid), {
      uid: user.uid,
      nome,
      sigla,
      email,
      dataCadastro: new Date().toISOString()
    });

    showAlert('Cadastro realizado com sucesso!', 'alert-success');
    showForm("login-form");
    
    // Limpar formulário
    document.getElementById("cadastro-nome").value = "";
    document.getElementById("cadastro-sigla").value = "";
    document.getElementById("cadastro-email").value = "";
    document.getElementById("cadastro-senha").value = "";
    document.getElementById("cadastro-codigo").value = "";
  } catch (error) {
    console.error("Erro ao cadastrar:", error);
    showAlert('Erro ao cadastrar: ' + error.message, 'alert-danger');
  } finally {
    setLoading(cadastroButton, false);
  }
}

async function handlePasswordReset() {
  const email = document.getElementById("forgot-email").value.trim();

  if (!validateEmail(email)) {
    document.getElementById("forgot-email").classList.add('is-invalid');
    showAlert('Por favor, insira um email válido.', 'alert-danger');
    return;
  } else {
    document.getElementById("forgot-email").classList.remove('is-invalid');
  }

  try {
    setLoading(resetPasswordButton, true);
    
    await sendPasswordResetEmail(auth, email);
    
    showAlert('Email de recuperação enviado com sucesso! Verifique sua caixa de entrada.', 'alert-success');
    showForm("login-form");
  } catch (error) {
    console.error("Erro ao enviar email de recuperação:", error);
    if (error.code === 'auth/user-not-found') {
      showAlert('Nenhum usuário encontrado com este email.', 'alert-warning');
    } else {
      showAlert('Erro ao enviar email de recuperação: ' + error.message, 'alert-danger');
    }
  } finally {
    setLoading(resetPasswordButton, false);
  }
}

function checkAuthState() {
  onAuthStateChanged(auth, (user) => {
    // Verificar se estamos vindo de um logout recente
    const forceLogin = new URLSearchParams(window.location.search).get('logout') === 'true';
    
    if (user && !forceLogin) {
      // Verificar se também temos os dados do usuário armazenados
      const storedUser = JSON.parse(localStorage.getItem("usuario") || sessionStorage.getItem("usuario") || '{}');
      
      if (storedUser.nome) {
        // Só redirecionamos se ambas as condições forem atendidas
        window.location.href = "pages/hub.html";
      }
    }
  });
}

// PWA related functions
function setupPWA() {
  setupServiceWorker();
  setupInstallPrompt();
  handleIOSInstall();
  fixLayoutForMobile();
}

function setupServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
      navigator.serviceWorker.register('./sw.js', { scope: './' })
        .then(function(registration) {
          console.log('SW registrado com sucesso:', registration.scope);
          
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'activated') {
                if(confirm('Nova versão disponível! Recarregar agora?')) {
                  window.location.reload();
                }
              }
            });
          });
        })
        .catch(function(error) {
          console.error('Falha no registro do SW:', error);
        });
    });
    
    // Ouvir mensagens do Service Worker
    navigator.serviceWorker.addEventListener('message', event => {
      if (event.data.type === 'APP_UPDATE') {
        console.log('Nova versão:', event.data.version);
      }
    });
  }
}

// Variável para armazenar o evento de instalação
let deferredPrompt;
function setupInstallPrompt() {
  const installButton = document.getElementById('installBtn');

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    installButton.style.display = 'block';
  });

  installButton.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('Usuário aceitou a instalação');
    } else {
      console.log('Usuário rejeitou a instalação');
    }
    
    installButton.style.display = 'none';
    deferredPrompt = null;
  });

  window.addEventListener('appinstalled', () => {
    console.log('PWA instalado com sucesso!');
    installButton.style.display = 'none';
    deferredPrompt = null;
  });

  // Verifica se já está instalado
  if (window.matchMedia('(display-mode: standalone)').matches) {
    installButton.style.display = 'none';
  }
}

function handleIOSInstall() {
  function showIOSInstructions() {
    // Verifica se é iOS/Safari e se não está já instalado
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isSafari = navigator.userAgent.includes('Safari') && !navigator.userAgent.includes('Chrome');
    
    if ((isIOS || isSafari) && !window.navigator.standalone) {
      const iosDiv = document.getElementById('iosInstallInstructions');
      if (iosDiv) {
        iosDiv.style.display = 'flex';
        
        // Esconde após 15 segundos ou quando o usuário clica
        setTimeout(() => {
          iosDiv.style.display = 'none';
        }, 15000);
        
        iosDiv.onclick = () => iosDiv.style.display = 'none';
      }
    }
  }

  // Mostra ao carregar e também quando o usuário rola a página
  window.addEventListener('load', showIOSInstructions);
  window.addEventListener('scroll', showIOSInstructions);
}

function fixLayoutForMobile() {
  // Força o recálculo do layout para garantir centralização no PWA/mobile
  setTimeout(() => {
    document.body.style.display = 'none';
    // Força reflow
    void document.body.offsetHeight;
    document.body.style.display = 'flex';
  }, 50);
}