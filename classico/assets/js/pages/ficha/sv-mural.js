// Ligação entre a ficha SV (Requisição de Exames / Laudo) e o Mural.
//
// - Ao salvar a requisição, cada exame marcado vira uma tarefa no Mural (coleção "tarefas"),
//   com o mesmo protocolo como ID e os campos fichaSV (protocolo) e exameFicha (id do exame).
// - Os resultados lançados no Mural (tarefas e histórico) são lidos em tempo real e convertidos
//   para o formato da ficha: títulos de VN por amostra e resultado por exame.
import {
    collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, onSnapshot, Timestamp, writeBatch
} from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js";
import { db } from "../../firebase.js";
import { calcularDataPrazo, parseDateInputLocal } from "../../utils/prazosMural.js";
import { idDoc } from "../../utils/svFichasDB.js";
import { examesMarcados, nomeExame, separarIdentificacoes, amostrasDaVN, classeResultado, resultadoGeral } from "./sv-comum.js";

// ------------------------------------------------------------------
// Exame da ficha -> tarefa do Mural
// ------------------------------------------------------------------
function subtipoSNOutro(texto) {
    const t = String(texto || '').toLowerCase();
    if (/hobi/.test(t)) return 'SN HoBi';
    if (/bvdv.?2/.test(t)) return 'SN BVDV-2';
    if (/bvdv/.test(t)) return 'SN BVDV-1';
    if (/ehv|equin/.test(t)) return 'SN EHV-1';
    if (/ibr|bohv/.test(t)) return 'SN IBR';
    return null;
}

const MOLECULAR_ESPECIAL = {
    pcr_multiplex_crostas: 'Multiplex Crostas Bovina',
    painel_brd: 'Multiplex Doença Respiratória Bovina',
    painel_dnb: 'Multiplex Diarreia Neonatal Bovina',
    rtpcr_encefalites_equinas: 'Multiplex Encefalites Equina'
};

// Retorna { tipo, subTipo, alvo } ou null (exame sem tarefa correspondente no Mural)
export function tarefaParaExame(ficha, item) {
    const outro = (ficha?.examesOutros?.[item.id] || '').trim();
    switch (item.id) {
        case 'sorologia_bvdv': return { tipo: 'SN', subTipo: 'SN BVDV-1', alvo: null };
        case 'sorologia_bohv1_ibr': return { tipo: 'SN', subTipo: 'SN IBR', alvo: null };
        case 'sorologia_outro': return { tipo: 'SN', subTipo: subtipoSNOutro(outro), alvo: outro || null };
        case 'elisa_bvdv_pi_antigeno': return { tipo: 'ELISA', subTipo: 'ELISA BVDV', alvo: null };
        case 'elisa_leucose_anticorpo': return { tipo: 'ELISA', subTipo: 'ELISA LEUCOSE', alvo: null };
        case 'raiva_imunofluorescencia': return { tipo: 'RAIVA', subTipo: null, alvo: 'Imunofluorescência' };
        case 'raiva_pcr': return { tipo: 'RAIVA', subTipo: null, alvo: 'PCR' };
        case 'vacina_papilomatose': return { tipo: 'VACINA', subTipo: null, alvo: null };
    }
    if (MOLECULAR_ESPECIAL[item.id]) return { tipo: 'MOLECULAR', subTipo: MOLECULAR_ESPECIAL[item.id], alvo: null };
    const grupo = item.grupo?.id;
    if (grupo === 'isolamento') return { tipo: 'ICC', subTipo: null, alvo: item.outro ? (outro || null) : item.nome };
    if (grupo === 'pcr') return { tipo: 'MOLECULAR', subTipo: 'PCR', alvo: item.outro ? (outro || null) : item.nome };
    if (grupo === 'rtpcr') return { tipo: 'MOLECULAR', subTipo: 'RT-PCR', alvo: item.outro ? (outro || null) : item.nome };
    // Investigação de abortos e demais itens: sem tarefa automática
    return null;
}

// Para tarefas antigas/criadas à mão (sem exameFicha): descobre a qual exame da ficha pertencem
function exameDaTarefa(ficha, t) {
    if (t.exameFicha) return t.exameFicha;
    const marcados = examesMarcados(ficha);
    const marcado = (id) => marcados.some(i => i.id === id) ? id : null;
    const tipo = String(t.tipo || '').toUpperCase();
    const sub = String(t.subTipo || '');
    const alvo = String(t.alvo || '').toLowerCase();
    if (tipo.startsWith('SN')) {
        const s = `${tipo} ${sub}`;
        if (/IBR/i.test(s)) return marcado('sorologia_bohv1_ibr') || marcado('sorologia_outro');
        if (/BVDV/i.test(s)) return marcado('sorologia_bvdv') || marcado('sorologia_outro');
        return marcado('sorologia_outro');
    }
    if (tipo.startsWith('ELISA')) {
        const s = `${tipo} ${sub}`;
        if (/LEUCOSE/i.test(s)) return marcado('elisa_leucose_anticorpo');
        if (/BVDV/i.test(s)) return marcado('elisa_bvdv_pi_antigeno');
        return null;
    }
    if (tipo === 'RAIVA') return /pcr/.test(alvo) ? marcado('raiva_pcr') : (marcado('raiva_imunofluorescencia') || marcado('raiva_pcr'));
    if (tipo === 'VACINA') return marcado('vacina_papilomatose');
    if (tipo === 'ICC') return marcados.find(i => i.grupo.id === 'isolamento')?.id || null;
    if (tipo === 'MOLECULAR' || tipo === 'PCR') {
        const especial = Object.entries(MOLECULAR_ESPECIAL).find(([, s]) => s === sub);
        if (especial) return marcado(especial[0]);
        const grupo = sub === 'RT-PCR' ? 'rtpcr' : sub === 'PCR' ? 'pcr' : null;
        const candidatos = marcados.filter(i => (!grupo || i.grupo.id === grupo) && (i.grupo.id === 'pcr' || i.grupo.id === 'rtpcr'));
        const porAlvo = candidatos.find(i => alvo && (alvo.includes(i.nome.toLowerCase()) || i.nome.toLowerCase().includes(alvo)));
        return porAlvo?.id || (candidatos.length === 1 ? candidatos[0].id : null);
    }
    return null;
}

// ------------------------------------------------------------------
// Criação / atualização das tarefas a partir da ficha
// ------------------------------------------------------------------
function dadosBaseTarefa(ficha) {
    const ids = separarIdentificacoes(ficha.amostras?.identificacao);
    const am = ficha.amostras || {};
    return {
        quantidade: Math.max(ids.length, 1),
        proprietario: {
            nome: ficha.proprietario?.nome || '',
            municipio: ficha.proprietario?.cidade || '',
            contato: ficha.proprietario?.contato || ''
        },
        veterinario: {
            nome: ficha.veterinario?.nome || '',
            crmv: ficha.veterinario?.crmv || '',
            municipio: '',
            contato: [ficha.veterinario?.celular, ficha.veterinario?.email].filter(Boolean).join(' · ')
        },
        observacoes: [am.observacoes, ids.length ? `Amostras: ${ids.join(', ')}` : ''].filter(Boolean).join('\n'),
        materialRecebido: [am.especie, am.tipo].filter(Boolean).join(' – ')
    };
}

async function buscar(colecao, campo, valor) {
    const snap = await getDocs(query(collection(db, colecao), where(campo, '==', valor)));
    return snap.docs.map(d => ({ docId: d.id, colecao, ...d.data() }));
}

function semResultados(t) {
    return !t.resultados && (t.status || 'pendente') === 'pendente';
}

// Cria as tarefas que faltam, atualiza as que ainda não começaram e remove as de exames desmarcados
// (só se ainda estiverem pendentes e sem resultados). Retorna { criadas, atualizadas, removidas }.
export async function sincronizarTarefasDaFicha(ficha, usuario = {}) {
    const protocolo = ficha.protocolo;
    const [ativas, concluidas] = await Promise.all([
        buscar('tarefas', 'fichaSV', protocolo),
        buscar('historico', 'fichaSV', protocolo)
    ]);
    const desejadas = examesMarcados(ficha)
        .map(item => ({ item, alvo: tarefaParaExame(ficha, item) }))
        .filter(x => x.alvo);
    const idsDesejados = new Set(desejadas.map(x => x.item.id));
    const jaExiste = new Set([...ativas, ...concluidas].map(t => t.exameFicha));
    const base = dadosBaseTarefa(ficha);
    const resultado = { criadas: 0, atualizadas: 0, removidas: 0 };

    const recebimento = parseDateInputLocal(ficha.identificacao?.dataEntrada) || new Date();
    if (ficha.identificacao?.dataEntrada) {
        const agora = new Date();
        recebimento.setHours(agora.getHours(), agora.getMinutes(), 0, 0);
    }

    for (const { item, alvo } of desejadas) {
        if (jaExiste.has(item.id)) continue;
        const { dataPrazo, prazoInfo } = calcularDataPrazo(recebimento, alvo.tipo, alvo.subTipo);
        await addDoc(collection(db, 'tarefas'), {
            id: protocolo,
            tipo: alvo.tipo,
            subTipo: alvo.subTipo,
            alvo: alvo.alvo,
            gramatura: null,
            ...base,
            status: 'pendente',
            criadoEm: Timestamp.fromDate(recebimento),
            dataRecebimento: Timestamp.fromDate(recebimento),
            dataPrazo: Timestamp.fromDate(dataPrazo),
            diasPrazo: prazoInfo.dias,
            tipoPrazo: prazoInfo.tipo,
            criadoPor: usuario.uid || null,
            siglaResponsavel: usuario.sigla || 'N/A',
            fichaSV: protocolo,
            exameFicha: item.id,
            exameFichaNome: nomeExame(ficha, item)
        });
        resultado.criadas++;
    }

    for (const t of ativas) {
        if (!semResultados(t)) continue;
        const ref = doc(db, 'tarefas', t.docId);
        if (!idsDesejados.has(t.exameFicha)) {
            await deleteDoc(ref);
            resultado.removidas++;
            continue;
        }
        const item = desejadas.find(x => x.item.id === t.exameFicha);
        const alvoAtual = item?.alvo || {};
        await updateDoc(ref, {
            ...base,
            subTipo: alvoAtual.subTipo ?? t.subTipo ?? null,
            alvo: alvoAtual.alvo ?? t.alvo ?? null,
            exameFichaNome: item ? nomeExame(ficha, item.item) : (t.exameFichaNome || null),
            atualizadoEm: Timestamp.now()
        });
        resultado.atualizadas++;
    }
    return resultado;
}

// ------------------------------------------------------------------
// Resultados do Mural -> formato da ficha
// ------------------------------------------------------------------
const CAMPOS_SN = [
    ['negativas', '<4'], ['titulo4', '4'], ['titulo8', '8'], ['titulo16', '16'], ['titulo32', '32'],
    ['titulo64', '64'], ['titulo128', '128'], ['titulo256', '256'], ['titulo512', '≥512'],
    ['improprias', 'Imprópria'], ['toxicas', 'Tóxica'], ['insuficiente', 'Insuficiente']
];

const ROTULOS_ALVO = {
    coronavirusBovino: 'Coronavírus bovino', rotavirusBovino: 'Rotavírus bovino',
    coronavirusEquino: 'Coronavírus equino', rotavirusEquino: 'Rotavírus equino',
    vaccinia: 'Vaccinia', pseudocowpox: 'Pseudocowpox', estomatitePapular: 'Estomatite papular', herpesvirus: 'Herpesvírus',
    ecoli: 'E. coli', salmonella: 'Salmonella', cryptosporidium: 'Cryptosporidium',
    brsv: 'BRSV', bohv: 'BoHV', bvdv: 'BVDV', bpiv3: 'BPIV-3',
    virusRaiva: 'Vírus da raiva', ehv1: 'EHV-1', flavivirus: 'Flavivírus', alphavirus: 'Alphavírus', veev: 'VEEV'
};

function separarLista(texto) {
    return String(texto || '').split(/[;\n]/).map(s => s.trim()).filter(Boolean);
}

function linhasVNdoSN(resultados) {
    const linhas = [];
    CAMPOS_SN.forEach(([campo, titulo]) => {
        separarLista(resultados?.[campo]).forEach(amostra => linhas.push({ amostra, titulo }));
    });
    return linhas;
}

// Mantém a ordem das amostras como foram identificadas na requisição
function ordenarPelaFicha(ficha, linhas) {
    const ordem = separarIdentificacoes(ficha.amostras?.identificacao).map(a => a.toLowerCase());
    const pos = (l) => { const i = ordem.indexOf(String(l.amostra).toLowerCase()); return i === -1 ? ordem.length : i; };
    return linhas
        .map((l, i) => ({ l, i }))
        .sort((a, b) => pos(a.l) - pos(b.l) || String(a.l.amostra).localeCompare(String(b.l.amostra), 'pt-BR', { numeric: true }) || a.i - b.i)
        .map(x => x.l);
}

// Amostras/pools do Mural -> [{ nome, resultado }], uma entrada por amostra (e por alvo, nos painéis)
function amostrasDoMural(amostras) {
    return (amostras || []).flatMap((a, i) => {
        const nome = a.identificacao || `Amostra ${a.id || i + 1}`;
        const campos = Object.entries(a).filter(([k, v]) => !['id', 'identificacao'].includes(k) && v !== '' && v != null);
        if (campos.length === 1 && campos[0][0] === 'resultado') return [{ nome, resultado: classeResultado(campos[0][1]) }];
        return campos.map(([k, v]) => ({ nome: `${nome} – ${ROTULOS_ALVO[k] || k}`, resultado: classeResultado(v) }));
    }).filter(a => a.resultado);
}

// Converte as tarefas do Mural em { vn, resultados, tarefasPorExame, semVinculo }
export function resultadosDoMural(ficha, tarefas) {
    const vn = {};
    const resultados = {};
    const tarefasPorExame = {};
    const semVinculo = [];
    for (const t of tarefas) {
        const exame = exameDaTarefa(ficha, t);
        if (!exame) { semVinculo.push(t); continue; }
        (tarefasPorExame[exame] ||= []).push(t);
        if (!t.resultados) continue;
        const tipo = String(t.tipo || '').toUpperCase();
        if (tipo.startsWith('SN')) {
            const linhas = linhasVNdoSN(t.resultados);
            vn[exame] = ordenarPelaFicha(ficha, [...(vn[exame] || []), ...linhas]);
            const amostras = amostrasDaVN(vn[exame]);
            resultados[exame] = { resultado: resultadoGeral(amostras), detalhe: '', amostras };
        } else if (Array.isArray(t.resultados.amostras)) {
            const amostras = [...(resultados[exame]?.amostras || []), ...amostrasDoMural(t.resultados.amostras)];
            resultados[exame] = { resultado: resultadoGeral(amostras), detalhe: '', amostras };
        }
    }
    return { vn, resultados, tarefasPorExame, semVinculo };
}

// Aplica os resultados do Mural sobre a ficha (o Mural tem prioridade nos exames que já têm resultado)
export function fichaComResultadosDoMural(ficha, tarefas) {
    const m = resultadosDoMural(ficha, tarefas);
    return {
        ...ficha,
        vn: { ...(ficha.vn || {}), ...m.vn },
        laudo: {
            ...(ficha.laudo || {}),
            resultados: { ...(ficha.laudo?.resultados || {}), ...m.resultados }
        }
    };
}

// Observa em tempo real as tarefas do Mural (ativas e concluídas) ligadas ao protocolo.
// Também pega tarefas criadas à mão no Mural com o mesmo ID ("SV 07/26").
export function observarTarefasDaFicha(protocolo, callback, onErro) {
    const fontes = [
        ['tarefas', 'fichaSV'], ['tarefas', 'id'], ['historico', 'fichaSV'], ['historico', 'id']
    ];
    const atuais = fontes.map(() => []);
    const prontas = fontes.map(() => false);
    const emitir = () => {
        if (!prontas.every(Boolean)) return;
        const mapa = new Map();
        atuais.flat().forEach(t => mapa.set(`${t.colecao}/${t.docId}`, t));
        callback([...mapa.values()]);
    };
    const cancelar = fontes.map(([colecao, campo], i) => onSnapshot(
        query(collection(db, colecao), where(campo, '==', protocolo)),
        snap => {
            atuais[i] = snap.docs.map(d => ({ docId: d.id, colecao, ...d.data() }));
            prontas[i] = true;
            emitir();
        },
        err => { prontas[i] = true; console.warn(`[SV] Não foi possível ler ${colecao}:`, err); onErro?.(err); emitir(); }
    ));
    return () => cancelar.forEach(c => c());
}

// Nome amigável de uma tarefa do Mural
export function descreverTarefa(t) {
    const partes = [t.subTipo || t.tipo];
    if (t.alvo) partes.push(t.alvo);
    return partes.filter(Boolean).join(' · ');
}

export function statusTarefa(t) {
    if (t.colecao === 'historico') return 'Concluída';
    if (t.status === 'resultados-registrados' || t.resultados) return 'Resultados lançados';
    if (t.status === 'em-progresso') return 'Em andamento';
    return 'Pendente';
}

// ------------------------------------------------------------------
// Exclusão: apaga a ficha e as tarefas dela no Mural, tudo de uma vez (se uma parte falhar,
// nada é apagado). O Histórico (tarefas já concluídas) é mantido como registro.
// ------------------------------------------------------------------
export async function tarefasAtivasDaFicha(protocolo) {
    const [porFicha, porId] = await Promise.all([
        buscar('tarefas', 'fichaSV', protocolo),
        buscar('tarefas', 'id', protocolo)
    ]);
    const mapa = new Map();
    [...porFicha, ...porId].forEach(t => mapa.set(t.docId, t));
    return [...mapa.values()];
}

export async function excluirFichaComTarefas(protocolo, tarefas) {
    const lista = tarefas || await tarefasAtivasDaFicha(protocolo);
    const batch = writeBatch(db);
    lista.forEach(t => batch.delete(doc(db, 'tarefas', t.docId)));
    batch.delete(doc(db, 'fichasSV', idDoc(protocolo)));
    await batch.commit();
    return lista.length;
}
