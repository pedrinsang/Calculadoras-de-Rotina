// Fichas de Requisição de Exames / Laudo do Setor de Virologia — guardadas no Firestore
// (coleção "fichasSV"), compartilhadas entre todos os usuários e dispositivos.
// Cada ficha é UM documento, identificado pelo protocolo (ex.: "SV 07/26"), atualizado nas 3 etapas.
import {
    doc, getDoc, getDocs, collection, runTransaction, onSnapshot
} from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js";
import { db } from "../firebase.js";
import { listarFichasLocais, excluirFichaLocal } from "./svFichasLocal.js";

export const STATUS = {
    AGUARDANDO: 'Aguardando análise',
    LAUDO_EMITIDO: 'Laudo emitido'
};

const COLECAO = 'fichasSV';

// "/" não é permitido em IDs de documento: "SV 07/26" -> "SV 07-26"
function idDoc(protocolo) {
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

// Cria uma ficha nova. Falha (ProtocoloEmUsoError) se o protocolo já existir — nunca sobrescreve.
export async function criarFicha(ficha) {
    const agora = new Date().toISOString();
    const registro = limpar({ criadoEm: agora, atualizadoEm: agora, ...ficha });
    const ref = refFicha(ficha.protocolo);
    await runTransaction(db, async (tx) => {
        const atual = await tx.get(ref);
        if (atual.exists()) throw new ProtocoloEmUsoError(ficha.protocolo);
        tx.set(ref, registro);
    });
    return registro;
}

// Atualiza a MESMA ficha (mesmo protocolo), substituindo só os campos de primeiro nível alterados.
export async function atualizarFicha(protocolo, alteracoes) {
    const ref = refFicha(protocolo);
    return runTransaction(db, async (tx) => {
        const snap = await tx.get(ref);
        if (!snap.exists()) throw new Error(`Ficha ${protocolo} não encontrada.`);
        const atual = snap.data();
        const registro = limpar({
            ...atual, ...alteracoes, protocolo,
            criadoEm: atual.criadoEm, atualizadoEm: new Date().toISOString()
        });
        tx.set(ref, registro);
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
