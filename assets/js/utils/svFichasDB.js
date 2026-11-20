// Fichas de Requisição de Exames / Laudo do Setor de Virologia — guardadas no Firestore
// (coleção "fichasSV"), compartilhadas entre todos os usuários e dispositivos.
// Cada ficha é UM documento, identificado pelo protocolo (ex.: "SV 07/26"), atualizado nas 3 etapas.
import {
    doc, getDoc, getDocs, collection, runTransaction, onSnapshot, query, where,
    serverTimestamp, writeBatch
} from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js";
import { db } from "../firebase.js";
import { listarFichasLocais, excluirFichaLocal } from "./svFichasLocal.js";
import {
    criarEventoAuditoria,
    exigirAdministradorAtual,
    exigirSecretariaAtual,
    novaReferenciaAuditoria,
    obterAtorAuditoria
} from "./auditoria.js";

export const STATUS = {
    AGUARDANDO: 'Aguardando análise',
    LAUDO_EMITIDO: 'Laudo emitido'
};

const COLECAO = 'fichasSV';

// "/" não é permitido em IDs de documento: "SV 07/26" -> "SV 07-26"
export function idDoc(protocolo) {
    return String(protocolo).trim().replace(/\//g, '-');
}

function refFicha(protocolo) {
    return doc(db, COLECAO, idDoc(protocolo));
}

// Firestore rejeita campos undefined; JSON remove-os.
function limpar(obj) {
    return JSON.parse(JSON.stringify(obj));
}

export class ProtocoloEmUsoError extends Error {
    constructor(protocolo) {
        super(`O protocolo ${protocolo} já está em uso.`);
        this.name = 'ConstraintError';
        this.protocolo = protocolo;
    }
}

export async function obterFicha(protocolo) {
    const snap = await getDoc(refFicha(protocolo));
    return snap.exists() ? snap.data() : undefined;
}

export async function listarFichas() {
    const snap = await getDocs(collection(db, COLECAO));
    return snap.docs.map(d => d.data());
}

// Chama callback(lista) sempre que qualquer ficha mudar (em qualquer dispositivo).
// Retorna a função para parar de observar.
export function observarFichas(callback, onErro) {
    return onSnapshot(collection(db, COLECAO),
        snap => callback(snap.docs.map(d => d.data())),
        err => onErro?.(err));
}

export function observarLaudosAguardandoEnvio(callback, onErro, onNovosLaudos) {
    let idsAnteriores = null;
    let sincronizouServidor = false;
    return onSnapshot(query(
        collection(db, COLECAO),
        where('status', '==', STATUS.LAUDO_EMITIDO)
    ), { includeMetadataChanges: true }, snap => {
        const fichas = snap.docs
            .map(d => d.data())
            .filter(f => f.envioLaudo?.enviado !== true);
        const idsAtuais = new Set(fichas.map(f => idDoc(f.protocolo)));
        if (!snap.metadata.fromCache) {
            if (sincronizouServidor && idsAnteriores) {
                const novos = fichas.filter(f => !idsAnteriores.has(idDoc(f.protocolo)));
                if (novos.length) onNovosLaudos?.(novos);
            }
            sincronizouServidor = true;
            idsAnteriores = idsAtuais;
        } else if (!sincronizouServidor) {
            idsAnteriores = idsAtuais;
        }
        callback(fichas);
    }, err => onErro?.(err));
}

export async function marcarLaudoEnviado(protocolo) {
    await exigirSecretariaAtual();

    const referencia = refFicha(protocolo);
    const snapshot = await getDoc(referencia);
    if (!snapshot.exists()) throw new Error(`Ficha ${protocolo} não encontrada.`);

    const antes = snapshot.data();
    if (antes.status !== STATUS.LAUDO_EMITIDO) {
        throw new Error('Somente laudos emitidos podem ser marcados como enviados.');
    }
    if (antes.envioLaudo?.enviado === true) {
        throw new Error('Este laudo já foi marcado como enviado.');
    }

    const ator = await obterAtorAuditoria();
    const dataRegistro = new Date().toISOString();
    const envioLaudo = {
        enviado: true,
        data: dataRegistro,
        uid: ator.uid,
        nome: ator.nome
    };
    const depois = { ...antes, envioLaudo };
    const lote = writeBatch(db);
    lote.update(referencia, {
        envioLaudo: { ...envioLaudo, data: serverTimestamp() }
    });
    lote.set(novaReferenciaAuditoria(), criarEventoAuditoria({
        ator,
        acao: 'marcou laudo como enviado ao cliente',
        modulo: 'Secretaria',
        registroId: idDoc(protocolo),
        registroNome: protocolo,
        antes,
        depois
    }));
    await lote.commit();
    return depois;
}

// Cria uma ficha nova. Falha (ProtocoloEmUsoError) se o protocolo já existir — nunca sobrescreve.
export async function criarFicha(ficha) {
    const agora = new Date().toISOString();
    const registro = limpar({ criadoEm: agora, atualizadoEm: agora, ...ficha });
    const ref = refFicha(ficha.protocolo);
    const ator = await obterAtorAuditoria();
    const referenciaAuditoria = novaReferenciaAuditoria();
    await runTransaction(db, async (tx) => {
        const atual = await tx.get(ref);
        if (atual.exists()) throw new ProtocoloEmUsoError(ficha.protocolo);
        tx.set(ref, registro);
        tx.set(referenciaAuditoria, criarEventoAuditoria({
            ator,
            acao: 'criou ficha',
            modulo: 'Fichas',
            registroId: idDoc(ficha.protocolo),
            registroNome: ficha.protocolo,
            antes: {},
            depois: registro
        }));
    });
    return registro;
}

// Atualiza a MESMA ficha (mesmo protocolo), substituindo só os campos de primeiro nível alterados.
export async function atualizarFicha(protocolo, alteracoes) {
    await exigirAdministradorAtual();
    const ref = refFicha(protocolo);
    const ator = await obterAtorAuditoria();
    const referenciaAuditoria = novaReferenciaAuditoria();
    return runTransaction(db, async (tx) => {
        const snap = await tx.get(ref);
        if (!snap.exists()) throw new Error(`Ficha ${protocolo} não encontrada.`);
        const atual = snap.data();
        const registro = limpar({
            ...atual, ...alteracoes, protocolo,
            criadoEm: atual.criadoEm, atualizadoEm: new Date().toISOString()
        });
        tx.set(ref, registro);
        tx.set(referenciaAuditoria, criarEventoAuditoria({
            ator,
            acao: 'atualizou ficha',
            modulo: 'Fichas',
            registroId: idDoc(protocolo),
            registroNome: protocolo,
            antes: atual,
            depois: registro
        }));
        return registro;
    });
}

// Renomeia uma ficha existente e mantém o protocolo no campo de identificação.
export async function renomearFicha(protocoloAtual, novoProtocolo) {
    await exigirAdministradorAtual();
    const atualRef = refFicha(protocoloAtual);
    const novoRef = refFicha(novoProtocolo);
    const ator = await obterAtorAuditoria();
    const referenciaAuditoria = novaReferenciaAuditoria();
    return runTransaction(db, async (tx) => {
        const atualSnap = await tx.get(atualRef);
        if (!atualSnap.exists()) throw new Error(`Ficha ${protocoloAtual} não encontrada.`);
        if (atualRef.id !== novoRef.id) {
            const novoSnap = await tx.get(novoRef);
            if (novoSnap.exists()) throw new ProtocoloEmUsoError(novoProtocolo);
        }
        const atual = atualSnap.data();
        const registro = limpar({
            ...atual,
            protocolo: novoProtocolo,
            identificacao: {
                ...(atual.identificacao || {}),
                protocolo: novoProtocolo
            },
            atualizadoEm: new Date().toISOString()
        });
        tx.set(novoRef, registro);
        if (atualRef.id !== novoRef.id) tx.delete(atualRef);
        tx.set(referenciaAuditoria, criarEventoAuditoria({
            ator,
            acao: 'renomeou ficha',
            modulo: 'Fichas',
            registroId: idDoc(novoProtocolo),
            registroNome: novoProtocolo,
            antes: atual,
            depois: registro
        }));
        return registro;
    });
}

// ------------------------------------------------------------------
// Migração: fichas que ficaram só no navegador (IndexedDB, versão anterior) vão para o Firestore.
// Se o protocolo já existe no Firestore com OUTRA ficha, a ficha local recebe um protocolo novo
// (gerado por `gerarProtocolo`) e guarda o antigo em `protocoloAnterior`.
// Retorna { enviadas, renumeradas: [{ de, para }] }.
// ------------------------------------------------------------------
let migracaoEmAndamento = null;

export function migrarFichasLocais(gerarProtocolo) {
    if (!migracaoEmAndamento) migracaoEmAndamento = executarMigracao(gerarProtocolo).finally(() => { migracaoEmAndamento = null; });
    return migracaoEmAndamento;
}

async function executarMigracao(gerarProtocolo) {
    const resultado = { enviadas: 0, renumeradas: [] };
    let locais = [];
    try { locais = await listarFichasLocais(); }
    catch (err) { console.warn('[SV] Não foi possível ler fichas locais antigas:', err); return resultado; }

    for (const local of locais) {
        try {
            const existente = await obterFicha(local.protocolo);
            if (existente && existente.criadoEm === local.criadoEm) {
                // já enviada antes (mesma ficha)
            } else if (!existente) {
                await criarFicha(local);
                resultado.enviadas++;
            } else {
                let criada = false;
                for (let i = 0; i < 5 && !criada; i++) {
                    const novo = await gerarProtocolo();
                    try {
                        await criarFicha({
                            ...local,
                            protocolo: novo,
                            protocoloAnterior: local.protocolo,
                            identificacao: { ...(local.identificacao || {}), protocolo: novo }
                        });
                        criada = true;
                        resultado.enviadas++;
                        resultado.renumeradas.push({ de: local.protocolo, para: novo });
                    } catch (err) {
                        if (err?.name !== 'ConstraintError') throw err;
                    }
                }
                if (!criada) continue; // mantém no local para tentar depois
            }
            await excluirFichaLocal(local.protocolo);
        } catch (err) {
            console.error(`[SV] Falha ao migrar a ficha ${local.protocolo}:`, err);
        }
    }
    return resultado;
}
