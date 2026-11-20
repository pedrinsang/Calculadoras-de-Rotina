import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js';
import { auth } from '../firebase.js';
import { criarEntrada, listarEntradas } from '../utils/entradasDB.js';
import { listarRequisicoes } from '../utils/requisicoesDB.js';
import { ambienteAtivo } from '../utils/permissoesDB.js';

const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[c]));

async function carregarPainel() {
  const [entradas, requisicoes] = await Promise.all([
    listarEntradas(),
    listarRequisicoes()
  ]);

  document.getElementById('lista-entradas').innerHTML = entradas.length
    ? entradas.map(e => `<article class="vu-item"><span class="vu-item-texto"><b>${esc(e.protocolo)}</b><span class="vu-item-desc">${esc(e.dados?.solicitante)} · ${esc(e.statusConsolidado)}</span></span></article>`).join('')
    : '<p>Nenhuma entrada cadastrada.</p>';

  document.getElementById('lista-requisicoes').innerHTML = requisicoes.length
    ? requisicoes.map(r => `<article class="vu-item"><span class="vu-item-texto"><b>${esc(r.protocolo)}</b><span class="vu-item-desc">${esc(r.laboratorio)} · ${esc(r.status)}</span></span></article>`).join('')
    : '<p>Nenhuma requisição distribuída.</p>';

  document.getElementById('resumo-relatorios').textContent =
    `${entradas.length} entradas e ${requisicoes.length} requisições registradas.`;
}

document.addEventListener('DOMContentLoaded', () => {
  const guardado = JSON.parse(localStorage.getItem('usuario') || sessionStorage.getItem('usuario') || '{}');
  if (guardado.nome) document.querySelectorAll('[data-nome]').forEach(el => el.textContent = guardado.nome);

  document.querySelector('[data-ir-nova]')?.addEventListener('click', () => {
    document.getElementById('nova').scrollIntoView({ behavior: 'smooth' });
  });

  document.querySelector('[data-sair]')?.addEventListener('click', async () => {
    await signOut(auth);
    localStorage.removeItem('usuario');
    sessionStorage.removeItem('usuario');
    window.location.href = '../index.html?logout=true';
  });

  document.getElementById('entrada-form')?.addEventListener('submit', async event => {
    event.preventDefault();
    const form = event.currentTarget;
    const fd = new FormData(form);
    const laboratorios = fd.getAll('laboratorios');
    const dados = Object.fromEntries(Array.from(fd.entries()).filter(([key]) => key !== 'laboratorios'));
    const feedback = document.getElementById('entrada-feedback');
    try {
      const entrada = await criarEntrada({
        dados,
        laboratorios,
        criadoPor: auth.currentUser?.uid || null
      });
      feedback.textContent = `Entrada ${entrada.protocolo} cadastrada e distribuída.`;
      form.reset();
      await carregarPainel();
    } catch (erro) {
      console.error('Erro ao criar entrada:', erro);
      feedback.textContent = 'Não foi possível cadastrar a entrada.';
    }
  });
});

onAuthStateChanged(auth, async user => {
  if (!user) {
    window.location.href = '../index.html';
    return;
  }
  if (ambienteAtivo() !== 'SECRETARIA') {
    window.location.href = ambienteAtivo() === 'VIROLOGIA' ? 'hub.html' : 'hub.html';
    return;
  }
  await carregarPainel();
});
