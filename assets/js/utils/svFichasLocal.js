// Banco LOCAL antigo (IndexedDB) das fichas SV.
// Usado apenas para migrar fichas criadas antes da mudança para o Firestore.
// Depois de enviada ao Firestore, a ficha é apagada daqui.

const DB_NAME = 'virologia-ufsm';
const DB_VERSION = 1;
const STORE = 'fichasSV';

let dbPromise = null;

function abrirDB() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
        if (!('indexedDB' in window)) { resolve(null); return; }
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
    return abrirDB().then(db => {
        if (!db) return undefined;
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE, modo);
            let resultado;
            const req = fn(tx.objectStore(STORE));
            if (req) req.onsuccess = () => { resultado = req.result; };
            tx.oncomplete = () => resolve(resultado);
            tx.onerror = () => reject(tx.error);
            tx.onabort = () => reject(tx.error || new Error('Transação cancelada'));
        });
    });
}

export function listarFichasLocais() {
    return executar('readonly', store => store.getAll()).then(lista => lista || []);
}

export function excluirFichaLocal(protocolo) {
    return executar('readwrite', store => store.delete(protocolo));
}
