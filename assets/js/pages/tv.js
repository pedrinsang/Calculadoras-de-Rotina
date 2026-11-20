// TV da sala de diagnóstico: exames pendentes, prazos e laudos emitidos nos últimos 7 dias.
// Dados ao vivo (onSnapshot): a tela se atualiza sozinha, sem recarregar.
import { collection, query, where, onSnapshot, Timestamp } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js";
import { db } from "../firebase.js";
import { observarFichas, STATUS } from "../utils/svFichasDB.js";

const LINHAS = 8;
const EMITIDOS = 6;
const TROCA_MS = 12000;
const DIAS_EMITIDOS = 7;

const estado = { tarefas: [], historico: [], fichas: [], pagina: 0 };
const $ = id => document.getElementById(id);
const esc = t => String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const dia0 = d => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const dd = d => d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
const paraData = v => v?.toDate ? v.toDate() : (v instanceof Date ? v : null);

function area(tipo = '') {
  const t = String(tipo).toUpperCase();
  if (t.startsWith('SN')) return { cor: '#7ccf86', nome: 'SN' };
  if (t.startsWith('ELISA')) return { cor: '#f0b44c', nome: 'ELISA' };
  if (t.startsWith('MOLECULAR') || t === 'PCR') return { cor: '#5fd0d8', nome: 'PCR' };
  if (t.startsWith('RAIVA')) return { cor: '#ff8a75', nome: 'Raiva' };
  if (t.startsWith('ICC')) return { cor: '#b9a3ff', nome: 'ICC' };
  if (t.startsWith('VACINA')) return { cor: '#7cb4ff', nome: 'Vacina' };
  return { cor: '#c6e87a', nome: tipo || 'Outros' };
}

function tique() {
  const agora = new Date();
  $('tv-hora').textContent = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  $('tv-data').textContent = cap(agora.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }));
  if (agora.getHours() === 5 && agora.getMinutes() === 0 && agora.getSeconds() < 20) location.reload();
}

function pendentes() {
  return estado.tarefas
    .filter(t => t.status !== 'concluido')
    .map(t => ({ t, prazo: paraData(t.dataPrazo) }))
    .sort((a, b) => (a.prazo?.getTime() ?? Infinity) - (b.prazo?.getTime() ?? Infinity));
}

function emitidosRecentes() {
  const limite = dia0(new Date()); limite.setDate(limite.getDate() - DIAS_EMITIDOS);
  const mapa = new Map();
  const pegar = id => { if (!mapa.has(id)) mapa.set(id, { id, quando: null, exames: new Set(), dono: '', laudo: false }); return mapa.get(id); };

  estado.historico.forEach(h => {
    const q = paraData(h.dataConclusao);
    if (!q || q < limite) return;
    const e = pegar(h.id || '—');
    if (!e.quando || q > e.quando) e.quando = q;
    e.exames.add(h.tipo || '');
    e.dono = e.dono || h.proprietario?.nome || '';
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
    e.dono = e.dono || f.proprietario?.nome || '';
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

function desenharSemana(lista) {
  const hoje = dia0(new Date());
  const cont = Array(7).fill(0); let atras = 0;
  lista.forEach(({ prazo }) => {
    if (!prazo) return;
    const n = Math.round((dia0(prazo) - hoje) / 864e5);
    if (n < 0) atras++; else if (n < 7) cont[n]++;
  });
  let h = `<div class="tv-dia atrasadas ${atras ? '' : 'zero'}"><span>atrasados</span><strong>${atras}</strong></div>`;
  cont.forEach((n, i) => {
    const d = new Date(hoje); d.setDate(d.getDate() + i);
    const rot = i === 0 ? 'hoje' : d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
    const fim = d.getDay() === 0 || d.getDay() === 6;
    h += `<div class="tv-dia${i === 0 ? ' hoje' : ''}${n ? '' : ' zero'}${fim ? ' fim' : ''}"><span>${rot} ${d.getDate()}</span><strong>${n}</strong></div>`;
  });
  $('tv-semana').innerHTML = h;

  const porArea = new Map();
  lista.forEach(({ t }) => {
    const a = area(t.tipo);
    const x = porArea.get(a.nome) || { ...a, n: 0 };
    x.n++; porArea.set(a.nome, x);
  });
  $('tv-chips').innerHTML = [...porArea.values()].sort((a, b) => b.n - a.n)
    .map(a => `<span class="tv-chip" style="--cor:${a.cor}"><i></i>${esc(a.nome)} <b>${a.n}</b></span>`).join('');
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
  const paginas = Math.max(1, Math.ceil(lista.length / LINHAS));
  if (estado.pagina >= paginas) estado.pagina = 0;
  const fatia = lista.slice(estado.pagina * LINHAS, (estado.pagina + 1) * LINHAS);
  $('tv-pag').textContent = lista.length ? `${lista.length} no total${paginas > 1 ? ` · página ${estado.pagina + 1} de ${paginas}` : ''}` : '';

  if (!lista.length) {
    $('tv-lista').innerHTML = '<li class="tv-vazio"><i class="bi bi-check2-circle"></i>Nenhum exame pendente</li>';
    return;
  }
  const hoje = dia0(new Date());
  let h = fatia.map(({ t, prazo }) => {
    const n = prazo ? Math.round((dia0(prazo) - hoje) / 864e5) : 99;
    const urg = n < 0 ? 'atrasada' : n === 0 ? 'hoje' : n <= 2 ? 'breve' : '';
    const a = area(t.tipo);
    const nome = [t.subTipo].filter(Boolean).join(' ');
    const sub = [t.exameFichaNome, t.proprietario?.nome].filter(Boolean).join(' · ');
    return `<li class="tv-linha ${urg}" style="--cor:${a.cor}">
      <span class="tv-prot">${esc(t.id || '—')}</span>
      <span class="tv-exame"><b>${esc(t.tipo || '')}${nome ? ' ' + esc(nome) : ''}</b>${sub ? `<small>${esc(sub)}</small>` : ''}</span>
      <span class="tv-qtd">${Number(t.quantidade) || '–'}</span>
      <span class="tv-resp">${esc(t.siglaResponsavel || '')}</span>
      ${prazoHtml(prazo, t)}
    </li>`;
  }).join('');
  for (let i = fatia.length; i < LINHAS; i++) h += '<li class="tv-linha vazia"></li>';
  $('tv-lista').innerHTML = h;
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
      <span class="e">${esc(exames || (e.laudo ? 'Laudo' : ''))}${e.dono ? `<small>${esc(e.dono)}</small>` : ''}</span>
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
    desenharSemana(lista);
    desenharLista(lista);
    desenharEmitidos();
  });
}

function status(ok, texto) {
  const el = $('tv-status');
  el.classList.toggle('off', !ok);
  el.querySelector('span').textContent = texto;
}
const falha = () => status(false, 'Sem conexão com o banco — mostrando o último dado recebido');
const ok = () => status(true, `Ao vivo · atualizado às ${new Date().toLocaleTimeString('pt-BR')}`);

function iniciarDados() {
  onSnapshot(collection(db, 'tarefas'), snap => {
    estado.tarefas = snap.docs.map(d => d.data()); ok(); desenhar();
  }, falha);

  const desde = dia0(new Date()); desde.setDate(desde.getDate() - DIAS_EMITIDOS);
  onSnapshot(query(collection(db, 'historico'), where('dataConclusao', '>=', Timestamp.fromDate(desde))), snap => {
    estado.historico = snap.docs.map(d => d.data()); ok(); desenhar();
  }, falha);

  observarFichas(lista => { estado.fichas = lista; ok(); desenhar(); }, falha);

  setInterval(() => {
    estado.pagina++;
    const lista = pendentes();
    const el = $('tv-lista');
    if (Math.ceil(lista.length / LINHAS) > 1) {
      el.classList.remove('troca'); void el.offsetWidth; el.classList.add('troca');
    }
    desenhar();
  }, TROCA_MS);
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
