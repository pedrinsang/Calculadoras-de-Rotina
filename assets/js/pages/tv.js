// TV da sala de diagnóstico: exames pendentes, prazos e laudos emitidos nos últimos 7 dias.
// Dados ao vivo (onSnapshot): a tela se atualiza sozinha, sem recarregar.
import { collection, query, where, onSnapshot, Timestamp } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js";
import { db } from "../firebase.js";
import { observarFichas, STATUS } from "../utils/svFichasDB.js";

const LINHAS = 7;
const EMITIDOS = 4;
const DIAS_EMITIDOS = 7;

const estado = { tarefas: [], historico: [], fichas: [] };
const $ = id => document.getElementById(id);
const esc = t => String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const dia0 = d => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const dd = d => d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
const paraData = v => v?.toDate ? v.toDate() : (v instanceof Date ? v : null);

function area(tarefa = {}, nomeExameTarefa = '') {
  const t = String(tarefa.tipo || '').toUpperCase();
  const exame = (nomeExameTarefa || `${tarefa.subTipo || ''} ${tarefa.alvo || ''} ${tarefa.exameFichaNome || ''}`).toUpperCase();
  if (t.startsWith('SN') && /BVDV/.test(exame)) return { cor: '#a78bfa', nome: 'SN BVDV' };
  if (t.startsWith('SN') && /IBR|BOHV/.test(exame)) return { cor: '#58b77a', nome: 'SN IBR/BoHV' };
  if (t.startsWith('SN')) return { cor: '#58b77a', nome: 'SN' };
  if (t.startsWith('ELISA')) return { cor: '#f0b44c', nome: 'ELISA' };
  if (`${t} ${exame}`.includes('PCR')) return { cor: '#438fe0', nome: 'PCR' };
  if (t.startsWith('RAIVA')) return { cor: '#ff8a75', nome: 'Raiva' };
  if (t.startsWith('ICC')) return { cor: '#b9a3ff', nome: 'ICC' };
  if (t.startsWith('VACINA')) return { cor: '#7cb4ff', nome: 'Vacina' };
  return { cor: '#c6e87a', nome: t || 'Outros' };
}

function nomesExame(tarefa) {
  const texto = [tarefa.tipo, tarefa.subTipo, tarefa.alvo, tarefa.exameFichaNome].filter(Boolean).join(' ');
  if (!/BVDV/i.test(texto) || !/(?:BoHV\s*-?\s*1|IBR)/i.test(texto)) return [nomeExame(tarefa)];
  if (String(tarefa.tipo || '').toUpperCase().startsWith('SN')) return ['SN BVDV', 'SN IBR/BoHV'];
  if (`${tarefa.tipo || ''} ${tarefa.subTipo || ''}`.toUpperCase().includes('PCR')) return ['PCR BVDV', 'PCR BoHV-1'];
  return [nomeExame(tarefa)];
}

function tique() {
  const agora = new Date();
  const hora = agora.getHours();
  const saudacao = hora >= 6 && hora < 12
    ? 'Bom dia'
    : hora >= 12 && hora < 18
      ? 'Boa tarde'
      : 'Boa noite';
  $('tv-hora').textContent = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  $('tv-data').textContent = cap(agora.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }));
  $('tv-saudacao').textContent = saudacao;
  if (agora.getHours() === 5 && agora.getMinutes() === 0 && agora.getSeconds() < 20) location.reload();
}

function pendentes() {
  return estado.tarefas
    .filter(t => t.status !== 'concluido')
    .map(t => ({ t, prazo: paraData(t.dataPrazo) }))
    .sort((a, b) => (a.prazo?.getTime() ?? Infinity) - (b.prazo?.getTime() ?? Infinity));
}

function nomeExame(tarefa) {
  const ficha = String(tarefa.exameFichaNome || '').trim();
  if (ficha) return ficha;
  const tipo = String(tarefa.tipo || '').trim();
  const subTipo = String(tarefa.subTipo || '').trim();
  const alvo = String(tarefa.alvo || '').trim();
  const base = subTipo
    ? (tipo && !subTipo.toLowerCase().startsWith(tipo.toLowerCase()) ? `${tipo} ${subTipo}` : subTipo)
    : tipo;
  return alvo && !base.toLowerCase().includes(alvo.toLowerCase()) ? `${base} · ${alvo}` : base || alvo;
}

function statusExame(tarefa) {
  if (tarefa.status === 'em-progresso' || tarefa.status === 'em_analise') return 'Em processamento';
  if (tarefa.status === 'resultados-registrados' || tarefa.resultados) return 'Resultados lançados';
  return 'Pendente';
}

function agruparPorProtocolo(lista) {
  const grupos = new Map();
  lista.forEach(({ t, prazo }, indice) => {
    const protocolo = String(t.fichaSV || t.id || `__sem-protocolo-${indice}`).trim();
    if (!grupos.has(protocolo)) grupos.set(protocolo, { tarefas: [], prazo, quantidade: 0, chegada: null });
    const grupo = grupos.get(protocolo);
    grupo.tarefas.push(t);
    if (prazo && (!grupo.prazo || prazo < grupo.prazo)) grupo.prazo = prazo;
    grupo.quantidade = Math.max(grupo.quantidade, Number(t.quantidade) || 0);
    const chegada = paraData(t.dataRecebimento) || paraData(t.criadoEm);
    if (chegada && (!grupo.chegada || chegada < grupo.chegada)) grupo.chegada = chegada;
  });
  return [...grupos.entries()].map(([protocolo, grupo]) => ({ protocolo, ...grupo }));
}

function emitidosRecentes() {
  const limite = dia0(new Date()); limite.setDate(limite.getDate() - DIAS_EMITIDOS);
  const mapa = new Map();
  const pegar = id => { if (!mapa.has(id)) mapa.set(id, { id, quando: null, exames: new Set(), laudo: false }); return mapa.get(id); };

  estado.historico.forEach(h => {
    const q = paraData(h.dataConclusao);
    if (!q || q < limite) return;
    const e = pegar(h.id || '—');
    if (!e.quando || q > e.quando) e.quando = q;
    e.exames.add(h.tipo || '');
  });

  estado.fichas.forEach(f => {
    if (f.status !== STATUS.LAUDO_EMITIDO || !f.laudo?.dataEmissao) return;
    const [a, m, d] = String(f.laudo.dataEmissao).split('-').map(Number);
    if (!a) return;
    const q = new Date(a, m - 1, d, 12);
    if (q < limite) return;
    const e = pegar(f.protocolo);
    e.laudo = true;
    if (!e.quando || q > e.quando) e.quando = q;
  });

  return [...mapa.values()].filter(e => e.quando).sort((a, b) => b.quando - a.quando);
}

function quandoTexto(d) {
  const n = Math.round((dia0(new Date()) - dia0(d)) / 864e5);
  return n <= 0 ? 'hoje' : n === 1 ? 'ontem' : `há ${n} dias`;
}

function desenharKpis(lista) {
  const hoje = dia0(new Date());
  let atras = 0, hojeN = 0, andando = 0;
  lista.forEach(({ t, prazo }) => {
    if (t.status === 'em-progresso') andando++;
    if (!prazo) return;
    const n = Math.round((dia0(prazo) - hoje) / 864e5);
    if (n < 0) atras++; else if (n === 0) hojeN++;
  });
  const k = (num, rot, cls = '') => `<div class="tv-kpi ${cls}"><strong>${num}</strong><span>${rot}</span></div>`;
  $('tv-kpis').innerHTML =
    k(lista.length, 'pendentes') +
    k(atras, 'atrasados', atras ? 'alerta' : '') +
    k(hojeN, 'vencem hoje', hojeN ? 'aviso' : '') +
    k(andando, 'em andamento');
}

function prazoHtml(prazo, t) {
  if (!prazo) return '<span class="tv-prazo">sem prazo</span>';
  const n = Math.round((dia0(prazo) - dia0(new Date())) / 864e5);
  const ate = `${dd(prazo)} · ${prazo.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}`;
  const and = t.status === 'em-progresso' ? 'em andamento' : '';
  if (n < 0) return `<span class="tv-prazo">Atrasado ${-n} d<small>venceu ${dd(prazo)}</small></span>`;
  if (n === 0) return `<span class="tv-prazo">Vence hoje<small>${and}</small></span>`;
  if (n === 1) return `<span class="tv-prazo">Amanhã<small>${and || ate}</small></span>`;
  return `<span class="tv-prazo">${ate}<small>${and || `em ${n} dias`}</small></span>`;
}

function desenharLista(lista) {
  const el = $('tv-lista');
  el.style.setProperty('--linhas', LINHAS);
  el.style.setProperty('--escala-linha', 1);
  const linhas = agruparPorProtocolo(lista);
  $('tv-pag').textContent = linhas.length ? `${linhas.length} no total` : '';

  if (!linhas.length) {
    configurarRolagem(el, false);
    $('tv-lista').innerHTML = '<li class="tv-vazio"><i class="bi bi-check2-circle"></i>Nenhum exame pendente</li>';
    return;
  }
  const hoje = dia0(new Date());
  let h = linhas.map(({ protocolo, tarefas, prazo, quantidade, chegada }) => {
    const n = prazo ? Math.round((dia0(prazo) - hoje) / 864e5) : 99;
    const urg = n < 0 ? 'atrasada' : n === 0 ? 'hoje' : n <= 2 ? 'breve' : '';
    const exames = new Map();
    tarefas.forEach(t => {
      const estado = statusExame(t);
      nomesExame(t).forEach(nome => {
        const chave = `${nome}\u0000${estado}`;
        if (nome && !exames.has(chave)) exames.set(chave, { nome, estado, cor: area(t, nome).cor });
      });
    });
    return `<li class="tv-linha ${urg}" style="--cor:${tarefas.length ? area(tarefas[0]).cor : '#8b9b91'}">
      <span class="tv-prot">${esc(protocolo || '—')}</span>
      <span class="tv-exame">${[...exames.values()].map(e => `<span class="tv-exame-item" style="--cor:${e.cor}"><b>${esc(e.nome)}</b><small>${esc(e.estado)}</small></span>`).join('')}</span>
      <span class="tv-chegada">${chegada ? dd(chegada) : '—'}</span>
      <span class="tv-qtd">${quantidade || '–'}</span>
      ${prazoHtml(prazo, tarefas[0] || {})}
    </li>`;
  }).join('');
  for (let i = linhas.length; i < LINHAS; i++) h += '<li class="tv-linha vazia"></li>';
  $('tv-lista').innerHTML = h;
  configurarRolagem(el, linhas.length > LINHAS);
}

let rolagemAutomatica = null;
let pausaRolagem = null;
function configurarRolagem(el, ativar) {
  clearInterval(rolagemAutomatica);
  clearTimeout(pausaRolagem);
  rolagemAutomatica = null;
  pausaRolagem = null;
  el.classList.toggle('tem-rolagem', ativar);
  el.scrollTop = 0;
  if (!ativar) return;

  rolagemAutomatica = setInterval(() => {
    if (el.scrollHeight <= el.clientHeight) return;
    const fim = el.scrollTop >= el.scrollHeight - el.clientHeight - 1;
    if (fim) {
      clearInterval(rolagemAutomatica);
      pausaRolagem = setTimeout(() => {
        el.scrollTop = 0;
        configurarRolagem(el, true);
      }, 3000);
      return;
    }
    el.scrollTop += 0.35;
  }, 40);
}

function desenharEmitidos() {
  const lista = emitidosRecentes();
  $('tv-emit-qtd').textContent = lista.length ? `${lista.length} protocolo${lista.length === 1 ? '' : 's'}` : '';
  if (!lista.length) {
    $('tv-emitidos').innerHTML = '<li class="tv-emit-vazio">Nada emitido nos últimos 7 dias</li>';
    return;
  }
  $('tv-emitidos').innerHTML = lista.slice(0, EMITIDOS).map(e => {
    const tipos = [...e.exames].filter(Boolean);
    const exames = tipos.slice(0, 3).join(', ') + (tipos.length > 3 ? ` +${tipos.length - 3}` : '');
    const q = quandoTexto(e.quando);
    return `<li class="tv-emit${q === 'hoje' ? ' novo' : ''}">
      <i class="bi ${e.laudo ? 'bi-patch-check-fill' : 'bi-check-circle'}"></i>
      <span class="p">${esc(e.id)}</span>
      <span class="e">${esc(exames || (e.laudo ? 'Laudo' : ''))}</span>
      <span class="q">${q}</span></li>`;
  }).join('');
}

let agendado = false;
function desenhar() {
  if (agendado) return;
  agendado = true;
  requestAnimationFrame(() => {
    agendado = false;
    const lista = pendentes();
    desenharKpis(lista);
    desenharLista(lista);
    desenharEmitidos();
  });
}

function status(ok, texto) {
  const el = $('tv-status');
  el.classList.toggle('off', !ok);
  el.querySelector('span').textContent = texto;
}
let ultimaAtualizacao = null;
function registrarAtualizacao() {
  ultimaAtualizacao = new Date();
  const hora = ultimaAtualizacao.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  $('tv-atualizacao').textContent = `Atualizado às ${hora}`;
}
const falha = () => status(false, 'Sem conexão com o banco — mostrando o último dado recebido');
const ok = () => { status(true, 'Ao vivo'); registrarAtualizacao(); };

function iniciarDados() {
  onSnapshot(collection(db, 'tarefas'), snap => {
    estado.tarefas = snap.docs.map(d => d.data()); ok(); desenhar();
  }, falha);

  const desde = dia0(new Date()); desde.setDate(desde.getDate() - DIAS_EMITIDOS);
  onSnapshot(query(collection(db, 'historico'), where('dataConclusao', '>=', Timestamp.fromDate(desde))), snap => {
    estado.historico = snap.docs.map(d => d.data()); ok(); desenhar();
  }, falha);

  observarFichas(lista => { estado.fichas = lista; ok(); desenhar(); }, falha);

  setInterval(desenhar, 60000);
}

let trava = null;
async function manterAcesa() {
  try { trava = await navigator.wakeLock?.request('screen'); } catch (_) { /* sem suporte: tudo bem */ }
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') manterAcesa(); });
function alternarTela() {
  if (document.fullscreenElement) document.exitFullscreen?.();
  else document.documentElement.requestFullscreen?.().catch(() => {});
}
$('tv-tela').addEventListener('click', alternarTela);
document.addEventListener('keydown', e => { if (e.key === 'f' || e.key === 'F') alternarTela(); });
window.addEventListener('offline', falha);
window.addEventListener('online', ok);

tique();
setInterval(tique, 1000);
iniciarDados();
manterAcesa();
