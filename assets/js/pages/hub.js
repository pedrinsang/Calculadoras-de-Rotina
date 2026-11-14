import { signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";
import { getDoc, getDocs, doc, collection } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js";
import { auth, db } from "../firebase.js";

const ui = window.VirologiaUFSM;

// ---------- Dados do usuário na tela ----------
function mostrarUsuario(usuario) {
  if (!usuario) return;
  const nome = (usuario.nome || '').trim();
  const primeiro = nome.split(/\s+/)[0] || '';
  const iniciais = (usuario.sigla || nome.split(/\s+/).map(p => p[0]).join('') || '··').slice(0, 2).toUpperCase();

  document.querySelectorAll('[data-nome]').forEach(el => { el.textContent = nome; });
  document.querySelectorAll('[data-primeiro-nome]').forEach(el => { el.textContent = primeiro ? `, ${primeiro}` : ''; });
  document.querySelectorAll('[data-iniciais]').forEach(el => { el.textContent = iniciais; });
  document.querySelectorAll('.so-admin').forEach(el => { el.hidden = usuario.role !== 'admin'; });
}

function mostrarData() {
  const el = document.querySelector('[data-data-hoje]');
  if (!el) return;
  const texto = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  el.textContent = texto.charAt(0).toUpperCase() + texto.slice(1);
}

// ---------- Painel "Hoje no Mural" ----------
function contarAte(id, valor) {
  const el = document.getElementById(id);
  if (!el) return;
  el.setAttribute('data-vu-contar', String(valor));
  if (ui) ui.contar(el); else el.textContent = String(valor);
}

async function carregarPainelHoje() {
  const proxima = document.getElementById('hoje-proxima');
  try {
    const snap = await getDocs(collection(db, 'tarefas'));
    const fimDeHoje = new Date();
    fimDeHoje.setHours(23, 59, 59, 999);

    let total = 0, vencendo = 0, andando = 0, maisUrgente = null;
    snap.forEach(d => {
      const t = d.data();
      if (t.status === 'concluido') return;
      total++;
      if (t.status === 'em-progresso') andando++;
      const prazo = t.dataPrazo?.toDate ? t.dataPrazo.toDate() : null;
      if (prazo && prazo <= fimDeHoje) vencendo++;
      if (prazo && (!maisUrgente || prazo < maisUrgente.prazo)) maisUrgente = { prazo, t };
    });

    contarAte('hoje-total', total);
    contarAte('hoje-vencendo', vencendo);
    contarAte('hoje-andando', andando);

    document.querySelectorAll('[data-contagem-mural]').forEach(el => {
      el.textContent = String(total);
      el.hidden = total === 0;
    });

    if (proxima) {
      if (!maisUrgente) {
        proxima.textContent = total ? 'Abrir o Mural' : 'Nada pendente no Mural';
      } else {
        const t = maisUrgente.t;
        const teste = [t.tipo, t.subTipo].filter(Boolean).join(' ');
        const quando = maisUrgente.prazo < new Date() ? 'atrasada' : `vence ${maisUrgente.prazo.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`;
        proxima.textContent = `Próxima: ${teste}${t.id ? ' · ' + t.id : ''} (${quando})`;
      }
    }
  } catch (erro) {
    console.error('Erro ao carregar o painel do Mural:', erro);
    ['hoje-total', 'hoje-vencendo', 'hoje-andando'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = '–';
    });
    if (proxima) proxima.textContent = 'Não foi possível carregar. Abrir o Mural';
  }
}

// ---------- Início ----------
document.addEventListener('DOMContentLoaded', () => {
  console.log("Desenvolvido por Pedro Ruiz Sangoi e Alexandre Werle Soares");
  mostrarData();
  if (ui) ui.iniciar(document);

  // Mostra na hora o que já está guardado no aparelho
  const guardado = JSON.parse(localStorage.getItem("usuario") || sessionStorage.getItem("usuario") || '{}');
  if (guardado?.nome) mostrarUsuario(guardado);

  // Sair da conta (barra lateral e celular)
  document.querySelectorAll('[data-sair]').forEach(botao => {
    botao.addEventListener('click', async () => {
      try {
        localStorage.removeItem('usuario');
        localStorage.removeItem('manterConectado');
        sessionStorage.removeItem('usuario');
        await signOut(auth);
        window.location.href = "../index.html?logout=true";
      } catch (error) {
        alert("Não foi possível sair: " + error.message);
      }
    });
  });
});

// Verificação de usuário ativo/inativo
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "../index.html";
    return;
  }

  try {
    let stored = JSON.parse(localStorage.getItem("usuario") || sessionStorage.getItem("usuario") || '{}');
    if (!stored?.nome) {
      const snap = await getDoc(doc(db, 'usuarios', user.uid));
      if (snap.exists()) {
        stored = snap.data();
        const manter = localStorage.getItem('manterConectado') === 'true';
        (manter ? localStorage : sessionStorage).setItem('usuario', JSON.stringify(stored));
      }
    }

    if (stored && stored.ativo === false) {
      window.location.href = "desativado.html";
      return;
    }

    mostrarUsuario(stored);
    carregarPainelHoje();
  } catch (error) {
    console.error("Erro ao verificar status do usuário:", error);
  }
});
