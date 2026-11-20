import { db } from '../firebase.js';
import {
  collection,
  doc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js';
import { gerarProtocolo } from './protocolosDB.js';
const PREFIXOS = {
  LABAC: 'SB',
  LADOPAR: 'LDP',
  VIROLOGIA: 'SV'
};

function novoUuid() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 3 | 8);
    return v.toString(16);
  });
}

export async function criarRequisicoes({ entradaId, protocoloEntrada, laboratorios, dados, criadoPor }) {
  const requisicoes = [];
  for (const laboratorio of laboratorios) {
    if (!PREFIXOS[laboratorio]) continue;
    const id = novoUuid();
    const protocolo = await gerarProtocolo({ laboratorio, prefixo: PREFIXOS[laboratorio] });
    const requisicao = {
      id,
      entradaId,
      protocoloEntrada,
      laboratorio,
      protocolo,
      status: 'Aguardando analise',
      criadoEm: serverTimestamp(),
      criadoPor,
      responsavel: null,
      exames: dados.exames || [],
      resultados: [],
      laudo: null
    };
    await setDoc(doc(db, 'requisicoes', id), requisicao);
    requisicoes.push(requisicao);
  }
  return requisicoes;
}

export async function listarRequisicoes({ laboratorio } = {}) {
  let q = query(collection(db, 'requisicoes'));
  if (laboratorio) q = query(q, where('laboratorio', '==', laboratorio));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ ...d.data(), docId: d.id }));
}

export async function atualizarStatusRequisicao(id, status, dadosExtras = {}) {
  await updateDoc(doc(db, 'requisicoes', id), {
    status,
    atualizadoEm: serverTimestamp(),
    ...dadosExtras
  });
}
