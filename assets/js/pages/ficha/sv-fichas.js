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
    const semLaudo = fichas.filter(f => f.status !== STATUS.LAUDO_EMITIDO).length;
    const resumo = $('sv-resumo');
    if (resumo) {
        resumo.textContent = fichas.length
            ? `${fichas.length} ficha${fichas.length === 1 ? '' : 's'} neste aparelho${semLaudo ? ` · ${semLaudo} sem laudo` : ''}`
            : 'Requisições e laudos salvos neste aparelho';
    }
    if (!lista.length) {
        $('lista').innerHTML = fichas.length
            ? `<div class="vu-vazio"><span class="vu-vazio-icone"><i class="bi bi-search" style="font-size:40px"></i></span><h3>Nada encontrado</h3><p>Nenhuma ficha com esses filtros. Tente outro protocolo, nome ou data.</p></div>`
            : `<div class="vu-vazio"><span class="vu-vazio-icone"><i class="bi bi-clipboard2-plus" style="font-size:40px"></i></span><h3>Nenhuma ficha ainda</h3><p>Quando uma amostra chegar, comece pela requisição. Os exames marcados vão sozinhos para o Mural.</p><a class="vu-btn vu-btn-principal" href="sv-requisicao.html"><i class="bi bi-plus-lg"></i> Nova requisição</a></div>`;
        return;
    }
    $('lista').innerHTML = lista.map(f => {
        const id = encodeURIComponent(f.protocolo);
        const emitido = f.status === STATUS.LAUDO_EMITIDO;
        const exames = examesMarcados(f).length;
        return `
        <article class="sv-card vu-ficha-cartao">
            <div class="vu-tarefa-corpo">
                <h3 class="vu-tarefa-nome vu-ficha-protocolo">${esc(f.protocolo)}</h3>
                <div class="vu-tarefa-selos">
                    ${emitido
                        ? '<span class="vu-selo vu-selo-feito"><i class="bi bi-check2"></i> Laudo emitido</span>'
                        : '<span class="vu-selo vu-selo-atencao"><i class="bi bi-hourglass-split"></i> Sem laudo</span>'}
                </div>
                <p class="vu-tarefa-info"><strong>${esc(f.proprietario?.nome || '—')}</strong>${f.proprietario?.cidade ? ' · ' + esc(f.proprietario.cidade) : ''}<br>
                    Entrada ${esc(dataBR(f.identificacao?.dataEntrada)) || '—'} · ${exames} exame${exames === 1 ? '' : 's'} · recebida por ${esc(f.identificacao?.recebidoPor || '—')}</p>
            </div>
            <div class="vu-tarefa-acoes">
                ${emitido
                    ? `<a class="vu-btn" href="sv-visualizar.html?id=${id}"><i class="bi bi-file-earmark-pdf"></i> Ver e imprimir</a>
                       <a class="vu-btn vu-btn-fantasma" href="sv-laudo.html?id=${id}"><i class="bi bi-clipboard2-pulse"></i> Laudo</a>`
                    : `<a class="vu-btn vu-btn-principal" href="sv-laudo.html?id=${id}"><i class="bi bi-clipboard2-pulse"></i> Laudar</a>
                       <a class="vu-btn" href="sv-visualizar.html?id=${id}"><i class="bi bi-eye"></i> Ver</a>`}
                <a class="vu-btn vu-btn-fantasma" href="sv-requisicao.html?id=${id}"><i class="bi bi-pencil"></i> Requisição</a>
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
if (window.VirologiaUFSM) window.VirologiaUFSM.iniciar(document);

exigirLogin(iniciar);
