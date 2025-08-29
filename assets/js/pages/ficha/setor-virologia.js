import { signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";
import { getDoc, doc, getDocs, collection } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js";
import { app, auth, db } from "../../../js/firebase.js";

// Firebase via módulo compartilhado

document.addEventListener('DOMContentLoaded', function () {
  console.log("Página Setor de Virologia carregada");
  // Inicializar autocomplete de identificação (se o campo existir)
  try {
    inicializarAutocompleteIdentificacao();
  } catch (e) {
    console.warn('Autocomplete identificação indisponível:', e);
  }
  
  // Render otimista se houver cache; validação no onAuthStateChanged
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
    
    // Atualizar sugestões locais de identificação (para autocomplete futuro)
    try {
      const campo = (fichaData?.identificacao || '').toString();
      const tokens = campo.split(/\n|,/).map(s => s.trim()).filter(Boolean);
      if (tokens.length) {
        const setLocal = new Set(JSON.parse(localStorage.getItem('sugestoesIdentificacao') || '[]'));
        tokens.forEach(t => setLocal.add(t));
        const arr = Array.from(setLocal).slice(0, 800);
        localStorage.setItem('sugestoesIdentificacao', JSON.stringify(arr));
        cacheSugestoesIdent = arr;
      }
    } catch {}

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

// ---------------- Autocomplete de Identificação -----------------
let cacheSugestoesIdent = [];

async function carregarSugestoesIdentificacao() {
  // Tenta cache local primeiro
  if (cacheSugestoesIdent.length) return cacheSugestoesIdent;
  try {
    const setLocal = new Set(JSON.parse(localStorage.getItem('sugestoesIdentificacao') || '[]'));
    // Buscar do Firestore
    const snap = await getDocs(collection(db, 'tarefas'));
    snap.forEach(docSnap => {
      const data = docSnap.data();
      // Buscar em resultados.amostras[].identificacao
      const amostras = data?.resultados?.amostras;
      if (Array.isArray(amostras)) {
        amostras.forEach(a => {
          const id = (a?.identificacao || a?.id || '').toString().trim();
          if (id) setLocal.add(id);
        });
      }
      // Também considerar possível campo direto
      const possivel = (data?.identificacao || data?.id || '').toString().trim();
      if (possivel) setLocal.add(possivel);
    });
    cacheSugestoesIdent = Array.from(setLocal).slice(0, 500);
    localStorage.setItem('sugestoesIdentificacao', JSON.stringify(cacheSugestoesIdent));
  } catch (err) {
    console.warn('Falha ao carregar sugestões do Firestore, usando cache local:', err);
    try {
      cacheSugestoesIdent = JSON.parse(localStorage.getItem('sugestoesIdentificacao') || '[]');
    } catch {}
  }
  return cacheSugestoesIdent;
}

function criarListaSugestoes(anchorEl) {
  const container = document.createElement('div');
  container.className = 'autocomplete-ident-list';
  container.style.position = 'absolute';
  container.style.zIndex = '1000';
  container.style.background = '#fff';
  container.style.border = '1px solid #ccc';
  container.style.borderRadius = '6px';
  container.style.boxShadow = '0 4px 10px rgba(0,0,0,.08)';
  container.style.maxHeight = '220px';
  container.style.overflowY = 'auto';
  container.style.minWidth = anchorEl.offsetWidth + 'px';
  container.style.display = 'none';
  anchorEl.parentElement.style.position = 'relative';
  anchorEl.parentElement.appendChild(container);
  return container;
}

function posicionarLista(container, anchorEl) {
  const rect = anchorEl.getBoundingClientRect();
  container.style.top = (anchorEl.offsetTop + anchorEl.offsetHeight + 6) + 'px';
  container.style.left = anchorEl.offsetLeft + 'px';
}

function renderSugestoes(container, itens, onPick) {
  container.innerHTML = '';
  itens.slice(0, 8).forEach(txt => {
    const item = document.createElement('div');
    item.textContent = txt;
    item.style.padding = '8px 10px';
    item.style.cursor = 'pointer';
    item.addEventListener('mousedown', (ev) => {
      ev.preventDefault();
      onPick(txt);
    });
    item.addEventListener('mouseenter', () => {
      item.style.background = '#f5f5f5';
    });
    item.addEventListener('mouseleave', () => {
      item.style.background = 'transparent';
    });
    container.appendChild(item);
  });
  container.style.display = itens.length ? 'block' : 'none';
}

function extrairTokenAtual(text, caret) {
  const before = text.slice(0, caret);
  const lastBreak = Math.max(before.lastIndexOf('\n'), before.lastIndexOf(','));
  const start = lastBreak === -1 ? 0 : lastBreak + 1;
  const token = before.slice(start).trim();
  return { start, end: caret, token };
}

async function inicializarAutocompleteIdentificacao() {
  const input = document.getElementById('identificacao');
  if (!input) return;
  const lista = criarListaSugestoes(input);
  posicionarLista(lista, input);
  window.addEventListener('resize', () => posicionarLista(lista, input));

  // Carregar sugestões (lazy)
  carregarSugestoesIdentificacao();

  function aplicarSugestao(txt) {
    const caret = input.selectionStart || input.value.length;
    const { start, end } = extrairTokenAtual(input.value, caret);
    const prefix = input.value.slice(0, start);
    const suffix = input.value.slice(end);
    const needsSep = prefix && !prefix.endsWith('\n') && !prefix.endsWith(',');
    const sep = needsSep ? ', ' : '';
    input.value = prefix + sep + txt + suffix;
    // posicionar caret depois do texto inserido
    const pos = (prefix + sep + txt).length;
    input.setSelectionRange(pos, pos);
    lista.style.display = 'none';
  }

  input.addEventListener('input', async () => {
    const caret = input.selectionStart || input.value.length;
    const { token } = extrairTokenAtual(input.value, caret);
    if (!token) { lista.style.display = 'none'; return; }
    const todos = await carregarSugestoesIdentificacao();
    const lower = token.toLowerCase();
    const existentes = new Set(input.value.split(/\n|,/).map(s => s.trim()).filter(Boolean));
    const filtrados = todos.filter(t => t.toLowerCase().includes(lower) && !existentes.has(t));
    renderSugestoes(lista, filtrados, aplicarSugestao);
  });

  input.addEventListener('blur', () => {
    setTimeout(() => { lista.style.display = 'none'; }, 150);
  });
}

// Verificação de usuário ativo/inativo
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "../../index.html";
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
      console.log("Usuário inativo detectado, redirecionando...");
      window.location.href = "../desativado.html";
      return;
    }
    const nameEl = document.querySelector('.user-name');
    if (nameEl && stored?.nome) nameEl.textContent = stored.nome;
    if (stored?.role === 'admin') {
      const btn = document.getElementById('admin-button');
      if (btn) btn.style.display = 'flex';
    }
    const actions = document.querySelector('.user-actions');
    if (actions) actions.style.display = 'flex';
  } catch (error) {
    console.error("Erro ao verificar status do usuário:", error);
  }
});
