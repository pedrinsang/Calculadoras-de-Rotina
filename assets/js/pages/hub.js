import { signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";
import { getDoc, doc, getDocs, collection } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js";
import { calcularDataPrazo, obterPrazoDiasTeste } from "../utils/prazosMural.js";
import { app, auth, db } from "../firebase.js";

// Firebase já inicializado via módulo compartilhado

// Preenche o nome no topo e o primeiro nome na saudação
function mostrarNome(nome) {
  if (!nome) return;
  const nameEl = document.querySelector('.user-name');
  if (nameEl) nameEl.textContent = nome;
  const firstEl = document.querySelector('.user-first-name');
  if (firstEl) firstEl.textContent = nome.trim().split(/\s+/)[0];
}

function saudacaoDoHorario() {
  const h = new Date().getHours();
  if (h < 5) return 'Boa noite';
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

document.addEventListener('DOMContentLoaded', function () {
  console.log("Desenvolvido por Pedro Ruiz Sangoi e Alexandre Werle Soares");

  const greetingEl = document.getElementById('hub-greeting');
  if (greetingEl) greetingEl.textContent = saudacaoDoHorario();

  // Render otimista se houver cache; não redireciona aqui
  const usuario = JSON.parse(localStorage.getItem("usuario") || sessionStorage.getItem("usuario") || '{}');
  if (usuario?.nome) {
    mostrarNome(usuario.nome);
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
});

// ---------- Painel "Hoje no Mural" ----------
// Mesmo critério do Mural: vencida = passou do prazo; vencendo = faltam 2 dias ou menos.
function diasAteOPrazo(dataPrazo, tipoPrazo) {
  const hoje = new Date();
  if (tipoPrazo === 'corridos') {
    return Math.ceil((dataPrazo.getTime() - hoje.getTime()) / 86400000);
  }
  let dias = 0;
  const d = new Date(hoje);
  while (d < dataPrazo) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() >= 1 && d.getDay() <= 5) dias++;
  }
  return dias;
}

function prazoDaTarefa(t) {
  const tipoPrazo = t.tipoPrazo || obterPrazoDiasTeste(t.tipo, t.subTipo).tipo;
  if (t.dataPrazo?.toDate) return { dataPrazo: t.dataPrazo.toDate(), tipoPrazo };
  const recebido = t.dataRecebimento?.toDate ? t.dataRecebimento.toDate()
    : (t.criadoEm?.toDate ? t.criadoEm.toDate() : new Date());
  return { dataPrazo: calcularDataPrazo(recebido, t.tipo, t.subTipo).dataPrazo, tipoPrazo };
}

function mostrarNumero(id, valor) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = valor;
  const stat = el.closest('.stat');
  stat?.classList.toggle('is-zero', valor === 0);
  stat?.classList.add('conta-anim');
}

async function carregarResumoMural() {
  const totalEl = document.getElementById('hoje-total');
  if (!totalEl) return;
  try {
    const snap = await getDocs(collection(db, 'tarefas'));
    const agora = new Date();
    let vencidas = 0, vencendo = 0, andamento = 0;
    let maisAtrasada = null, proxima = null;
    snap.forEach(d => {
      const t = d.data();
      if (t.status === 'concluido') return;
      if (t.status === 'em-progresso') andamento++;
      const { dataPrazo, tipoPrazo } = prazoDaTarefa(t);
      if (agora > dataPrazo) {
        vencidas++;
        if (!maisAtrasada || dataPrazo < maisAtrasada.dataPrazo) maisAtrasada = { id: t.id, dataPrazo };
      } else {
        if (diasAteOPrazo(dataPrazo, tipoPrazo) <= 2) vencendo++;
        if (!proxima || dataPrazo < proxima.dataPrazo) proxima = { id: t.id, dataPrazo };
      }
    });
    const total = snap.size;
    totalEl.textContent = total === 0 ? 'nenhuma tarefa' : `${total} ${total === 1 ? 'tarefa' : 'tarefas'}`;
    mostrarNumero('hoje-vencidas', vencidas);
    mostrarNumero('hoje-vencendo', vencendo);
    mostrarNumero('hoje-andamento', andamento);

    const prox = document.getElementById('hoje-proxima');
    const dia = dt => dt.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    if (prox) {
      if (maisAtrasada) {
        prox.innerHTML = `<i class="bi bi-exclamation-octagon"></i><span>Mais atrasada: <strong>${maisAtrasada.id}</strong> · venceu ${dia(maisAtrasada.dataPrazo)}</span><i class="bi bi-arrow-right"></i>`;
      } else if (proxima) {
        prox.innerHTML = `<i class="bi bi-calendar-check"></i><span>Próximo prazo: <strong>${proxima.id}</strong> · ${dia(proxima.dataPrazo)}</span><i class="bi bi-arrow-right"></i>`;
      } else {
        prox.innerHTML = `<i class="bi bi-check2-circle"></i><span>Tudo em dia por aqui</span><i class="bi bi-arrow-right"></i>`;
      }
    }
  } catch (erro) {
    console.warn('Não foi possível carregar o resumo do Mural:', erro);
    totalEl.textContent = 'abrir o Mural';
  }
}

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
    mostrarNome(stored?.nome);
    const isAdmin = stored?.role === 'admin';
    const btn = document.getElementById('admin-button');
    if (btn) btn.style.display = isAdmin ? 'flex' : 'none';
    const actions = document.querySelector('.user-actions');
    if (actions) actions.style.display = 'flex';

    carregarResumoMural();
  } catch (error) {
    console.error("Erro ao verificar status do usuário:", error);
    // Em caso de erro, manter usuário na tela
  }
});