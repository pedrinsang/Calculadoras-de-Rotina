import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";
import {
  collection, doc, getDoc, getDocs, limit, orderBy, query, startAfter
} from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js";
import { auth, db } from "../firebase.js";
import { perfilDoUsuario, nomeDoPerfil } from "../utils/perfis.js";

const TAMANHO_PAGINA = 40;
const lista = document.getElementById('auditoria-lista');
const status = document.getElementById('auditoria-status');
const botaoMais = document.getElementById('auditoria-mais');
let ultimoDocumento = null;
let carregando = false;

function esc(valor) {
  return String(valor ?? '').replace(/[&<>"']/g, caractere => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[caractere]));
}

function dataBR(valor) {
  const data = valor?.toDate ? valor.toDate() : new Date(valor);
  return Number.isNaN(data.getTime()) ? 'Data indisponível' : data.toLocaleString('pt-BR');
}

function nomeAcao(acao) {
  return ({
    criar: 'Criou',
    atualizar: 'Alterou',
    excluir: 'Excluiu',
    iniciar: 'Iniciou',
    concluir: 'Concluiu',
    restaurar: 'Restaurou'
  })[acao] || acao || 'Alteração';
}

function cardAuditoria(item) {
  const alteracoes = Array.isArray(item.alteracoes) ? item.alteracoes : [];
  return `
    <article class="vu-auditoria-card">
      <div class="vu-auditoria-cabecalho">
        <span class="vu-auditoria-icone"><i class="bi bi-journal-check"></i></span>
        <div class="vu-auditoria-autor">
          <strong>${esc(item.ator?.nome || 'Usuário')}</strong>
          <span>${esc(item.ator?.perfil || nomeDoPerfil(perfilDoUsuario(item.ator || {})))}</span>
        </div>
        <time>${esc(dataBR(item.criadoEm))}</time>
      </div>
      <p class="vu-auditoria-resumo"><strong>${esc(nomeAcao(item.acao))}</strong> · ${esc(item.modulo || 'Aplicativo')} · ${esc(item.registroNome || item.registroId || 'Registro')}</p>
      ${alteracoes.length ? `
        <details class="vu-auditoria-detalhes">
          <summary>${alteracoes.length} campo(s) alterado(s)</summary>
          <ul>${alteracoes.map(alteracao => `
            <li><strong>${esc(alteracao.campo)}:</strong> ${esc(alteracao.antes)} <i class="bi bi-arrow-right"></i> ${esc(alteracao.depois)}</li>
          `).join('')}</ul>
        </details>` : ''}
    </article>`;
}

async function carregarMais() {
  if (carregando) return;
  carregando = true;
  botaoMais.disabled = true;
  status.textContent = 'Carregando histórico…';

  try {
    const partesConsulta = [orderBy('criadoEm', 'desc'), limit(TAMANHO_PAGINA)];
    if (ultimoDocumento) partesConsulta.splice(1, 0, startAfter(ultimoDocumento));
    const snapshot = await getDocs(query(collection(db, 'auditoria'), ...partesConsulta));

    if (snapshot.empty && !ultimoDocumento) {
      status.textContent = 'Ainda não há alterações registradas.';
      botaoMais.hidden = true;
      return;
    }

    lista.insertAdjacentHTML('beforeend', snapshot.docs.map(item => cardAuditoria({
      ...item.data(),
      registroId: item.data().registroId || item.id
    })).join(''));
    ultimoDocumento = snapshot.docs.at(-1) || ultimoDocumento;
    status.textContent = '';
    botaoMais.hidden = snapshot.size < TAMANHO_PAGINA;
  } catch (error) {
    console.error('Erro ao carregar auditoria:', error);
    status.textContent = `Não foi possível carregar a auditoria: ${error.message}`;
    botaoMais.hidden = false;
  } finally {
    carregando = false;
    botaoMais.disabled = false;
  }
}

botaoMais.addEventListener('click', carregarMais);

onAuthStateChanged(auth, async usuario => {
  if (!usuario) {
    location.href = '../index.html?app';
    return;
  }

  try {
    const cadastro = await getDoc(doc(db, 'usuarios', usuario.uid));
    await carregarMais();
  } catch (error) {
    console.error('Erro ao validar acesso à auditoria:', error);
    status.textContent = `Não foi possível validar seu acesso: ${error.message}`;
  }
});
