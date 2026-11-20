import { db } from '../firebase.js';
import {
  collection,
  doc,
  getDocs,
  query,
  setDoc,
  where,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js';
import { gerarProtocolo } from './protocolosDB.js';
import { criarRequisicoes } from './requisicoesDB.js';
import { registrarAuditoria } from './auditoria.js';

export function novoUuid() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 3 | 8);
    return v.toString(16);
  });
}

export async function criarEntrada({ dados, laboratorios, criadoPor }) {
  if (!dados || !Array.isArray(laboratorios) || !laboratorios.length) {
    throw new Error('Informe os dados e ao menos um laboratorio');
  }

  const entradaId = novoUuid();
  const protocolo = await gerarProtocolo({ laboratorio: 'SECRETARIA', prefixo: 'SEC' });
  const entrada = {
    id: entradaId,
    protocolo,
    laboratorioOrigem: 'SECRETARIA',
    dados,
    statusConsolidado: 'Recebido',
    laboratorios,
    criadoEm: serverTimestamp(),
    criadoPor
  };

  await setDoc(doc(db, 'entradasSecretaria', entradaId), entrada);
  await criarRequisicoes({
    entradaId,
    protocoloEntrada: protocolo,
    laboratorios,
    dados,
    criadoPor
  });
  await registrarAuditoria({
    uid: criadoPor,
    operacao: 'CRIAR_ENTRADA',
    entidade: 'entradasSecretaria',
    entidadeId: entradaId,
    detalhes: { protocolo, laboratorios }
  });
  return entrada;
}

export async function listarEntradas({ laboratorio } = {}) {
  let q = query(collection(db, 'entradasSecretaria'));
  if (laboratorio) q = query(q, where('laboratorios', 'array-contains', laboratorio));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ ...d.data(), docId: d.id }));
}
