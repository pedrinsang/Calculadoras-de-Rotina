// Banco local (IndexedDB) das fichas de Requisição de Exames / Laudo do Setor de Virologia.
// Cada ficha é UM registro, com chave = protocolo (ex.: "SV 07/26"), atualizado nas 3 etapas.

const DB_NAME = 'virologia-ufsm';
const DB_VERSION = 1;
const STORE = 'fichasSV';

export const STATUS = {
    AGUARDANDO: 'Aguardando análise',
    LAUDO_EMITIDO: 'Laudo emitido'
};

let dbPromise = null;

function abrirDB() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
        if (!('indexedDB' in window)) {
            reject(new Error('Este navegador não suporta armazenamento local (IndexedDB).'));
            return;
        }
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains(STORE)) {
                const store = db.createObjectStore(STORE, { keyPath: 'protocolo' });
                store.createIndex('status', 'status', { unique: false });
                store.createIndex('dataEntrada', 'identificacao.dataEntrada', { unique: false });
            }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => { dbPromise = null; reject(req.error); };
    });
    return dbPromise;
}

function executar(modo, fn) {
    return abrirDB().then(db => new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, modo);
        const store = tx.objectStore(STORE);
        let resultado;
        const req = fn(store);
        if (req) req.onsuccess = () => { resultado = req.result; };
        tx.oncomplete = () => resolve(resultado);
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error || new Error('Transação cancelada'));
    }));
}

export function obterFicha(protocolo) {
    return executar('readonly', store => store.get(protocolo));
}

export function listarFichas() {
    return executar('readonly', store => store.getAll()).then(lista => lista || []);
}

// Cria uma ficha nova. Falha se o protocolo já existir (não sobrescreve outra ficha).
export function criarFicha(ficha) {
    const agora = new Date().toISOString();
    const registro = { ...ficha, criadoEm: agora, atualizadoEm: agora };
    return executar('readwrite', store => store.add(registro)).then(() => registro);
}

// Atualiza a MESMA ficha (mesmo protocolo), mesclando os campos alterados.
export async function atualizarFicha(protocolo, alteracoes) {
    const atual = await obterFicha(protocolo);
    if (!atual) throw new Error(`Ficha ${protocolo} não encontrada.`);
    const registro = { ...atual, ...alteracoes, protocolo, criadoEm: atual.criadoEm, atualizadoEm: new Date().toISOString() };
    await executar('readwrite', store => store.put(registro));
    return registro;
}

export function excluirFicha(protocolo) {
    return executar('readwrite', store => store.delete(protocolo));
}
