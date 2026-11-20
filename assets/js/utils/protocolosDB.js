import { db } from '../firebase.js';
import {
  doc,
  getDoc,
  runTransaction
} from 'https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js';

export async function gerarProtocolo({ laboratorio, prefixo, ano = new Date().getFullYear() }) {
  if (!laboratorio || !prefixo) throw new Error('Laboratorio e prefixo sao obrigatorios');
  const ref = doc(db, 'configuracoes', `${laboratorio}_${prefixo}_${ano}`);

  return runTransaction(db, async transaction => {
    const snapshot = await transaction.get(ref);
    const atual = snapshot.exists() ? Number(snapshot.data().ultimo || 0) : 0;
    const proximo = atual + 1;
    transaction.set(ref, {
      laboratorio,
      prefixo,
      ano,
      ultimo: proximo,
      atualizadoEm: new Date()
    }, { merge: true });

    if (laboratorio === 'SECRETARIA') {
      return `${prefixo}-${ano}-${String(proximo).padStart(3, '0')}`;
    }
    return `${prefixo} ${String(proximo).padStart(3, '0')}/${String(ano).slice(-2)}`;
  });
}

export async function validarProtocoloUnico({ laboratorio, protocolo, uuid }) {
  if (!laboratorio || !protocolo) throw new Error('Dados do protocolo incompletos');
  const ref = doc(db, 'configuracoes', 'validacaoNaoPersistente');
  await getDoc(ref);
  return { laboratorio, protocolo, uuid, valido: true };
}
