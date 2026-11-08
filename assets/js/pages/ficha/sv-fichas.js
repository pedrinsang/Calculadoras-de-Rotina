// Lista e busca das fichas SV (por protocolo, proprietário ou data de entrada).
import { exigirLogin, esc, dataBR, mostrarAviso, examesMarcados } from "./sv-comum.js";
import { listarFichas, STATUS } from "../../utils/svFichasDB.js";

const $ = (id) => document.getElementById(id);
let fichas = [];

function normalizar(t) {
    return String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

// número do protocolo para ordenar (ano desc, número desc)
function chaveOrdem(f) {
    const m = String(f.protocolo).match(/(\d+)\s*\/\s*(\d{2})/);
    return m ? parseInt(m[2], 10) * 100000 + parseInt(m[1], 10) : 0;
}

function filtrar() {
    const texto = normalizar($('busca-texto').value);
    const textoSemEspaco = texto.replace(/\s/g, '');
    const de = $('busca-de').value;
    const ate = $('busca-ate').value;
    const status = $('busca-status').value;
    return fichas.filter(f => {
        const data = f.identificacao?.dataEntrada || '';
        if (de && data < de) return false;
        if (ate && data > ate) return false;
        if (status && f.status !== status) return false;
        if (!texto) return true;
        const prot = normalizar(f.protocolo).replace(/\s/g, '');
        return prot.includes(textoSemEspaco) || normalizar(f.proprietario?.nome).includes(texto);
    }).sort((a, b) => chaveOrdem(b) - chaveOrdem(a));
}

function render() {
    const lista = filtrar();
    if (!lista.length) {
        $('lista').innerHTML = `<p class="sv-vazio">${fichas.length ? 'Nenhuma ficha encontrada com esses filtros.' : 'Nenhuma ficha salva ainda. Clique em <strong>Nova requisição</strong>.'}</p>`;
        return;
    }
    $('lista').innerHTML = lista.map(f => {
        const id = encodeURIComponent(f.protocolo);
        const emitido = f.status === STATUS.LAUDO_EMITIDO;
        const exames = examesMarcados(f).length;
        return `
        <article class="sv-card">
            <div>
                <h3>${esc(f.protocolo)}<span class="sv-status ${emitido ? 'sv-status-emitido' : 'sv-status-aguardando'}">${esc(f.status)}</span></h3>
                <p><strong>${esc(f.proprietario?.nome || '—')}</strong>${f.proprietario?.cidade ? ' · ' + esc(f.proprietario.cidade) : ''}</p>
                <p>Entrada: ${esc(dataBR(f.identificacao?.dataEntrada)) || '—'} · ${exames} exame${exames === 1 ? '' : 's'} · Recebido por ${esc(f.identificacao?.recebidoPor || '—')}</p>
            </div>
            <div class="sv-card-acoes">
                <a class="sv-btn sv-btn-pequeno" href="sv-requisicao.html?id=${id}" title="Editar requisição"><i class="bi bi-pencil"></i> Requisição</a>
                <a class="sv-btn sv-btn-pequeno ${emitido ? '' : 'sv-btn-primario'}" href="sv-laudo.html?id=${id}"><i class="bi bi-clipboard2-pulse"></i> ${emitido ? 'Ver laudo' : 'Laudar'}</a>
                <a class="sv-btn sv-btn-pequeno sv-btn-azul" href="sv-visualizar.html?id=${id}"><i class="bi bi-eye"></i> Visualizar / PDF</a>
            </div>
        </article>`;
    }).join('');
}

async function iniciar() {
    try {
        fichas = await listarFichas();
    } catch (err) {
        console.error(err);
        mostrarAviso('Erro ao abrir o banco local: ' + (err?.message || err), 'erro');
    }
    const salvo = new URLSearchParams(location.search).get('salvo');
    if (salvo) {
        mostrarAviso(`Ficha ${salvo} salva.`);
        history.replaceState(null, '', location.pathname);
    }
    render();
}

['busca-texto', 'busca-de', 'busca-ate', 'busca-status'].forEach(id => $(id).addEventListener('input', render));

exigirLogin(iniciar);
