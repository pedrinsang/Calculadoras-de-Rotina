// Lista e busca das fichas SV (por protocolo, proprietário ou data de entrada).
import { exigirLogin, esc, dataBR, mostrarAviso, examesMarcados, proximoProtocolo, usuarioArmazenado } from "./sv-comum.js";
import { observarFichas, migrarFichasLocais, STATUS } from "../../utils/svFichasDB.js";
import { tarefasAtivasDaFicha, excluirFichaComTarefas, descreverTarefa, statusTarefa } from "./sv-mural.js";

const $ = (id) => document.getElementById(id);
let fichas = [];
let ehAdmin = false;

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
                ${ehAdmin ? `<button type="button" class="sv-btn sv-btn-pequeno sv-btn-perigo" data-excluir="${esc(f.protocolo)}" title="Excluir ficha e tarefas do Mural"><i class="bi bi-trash"></i> Excluir</button>` : ''}
            </div>
        </article>`;
    }).join('');
}

let carregou = false;

// Exclui a ficha e as tarefas dela no Mural (só admin)
async function excluir(protocolo, botao) {
    botao.disabled = true;
    try {
        const tarefas = await tarefasAtivasDaFicha(protocolo);
        const lista = tarefas.length
            ? '\n\nTambém serão apagadas do Mural:\n' + tarefas.map(t => `• ${descreverTarefa(t)} (${statusTarefa(t)}${t.resultados ? ', COM resultados' : ''})`).join('\n')
            : '\n\nNão há tarefas desta ficha no Mural.';
        const ok = confirm(`Excluir a ficha ${protocolo}?${lista}\n\nIsso não pode ser desfeito. (Tarefas já concluídas continuam no Histórico.)`);
        if (!ok) return;
        const n = await excluirFichaComTarefas(protocolo, tarefas);
        mostrarAviso(`Ficha ${protocolo} excluída${n ? ` com ${n} tarefa${n === 1 ? '' : 's'} do Mural` : ''}.`);
    } catch (err) {
        console.error('Erro ao excluir ficha:', err);
        const semPermissao = err?.code === 'permission-denied';
        mostrarAviso(semPermissao ? 'Sem permissão para excluir: só administradores podem excluir fichas.' : 'Erro ao excluir: ' + (err?.message || err), 'erro');
    } finally {
        botao.disabled = false;
    }
}

$('lista').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-excluir]');
    if (btn) excluir(btn.dataset.excluir, btn);
});

async function iniciar() {
    ehAdmin = usuarioArmazenado()?.role === 'admin';
    $('lista').innerHTML = '<p class="sv-vazio">Carregando fichas…</p>';
    const params = new URLSearchParams(location.search);
    const salvo = params.get('salvo');
    if (salvo) {
        const mural = Number(params.get('mural') || 0);
        mostrarAviso(`Ficha ${salvo} salva.` + (mural ? ` ${mural} tarefa${mural === 1 ? '' : 's'} criada${mural === 1 ? '' : 's'} no Mural.` : ''));
        history.replaceState(null, '', location.pathname);
    }

    // Lista em tempo real: fichas criadas/alteradas por outras pessoas aparecem sozinhas
    observarFichas(lista => {
        fichas = lista;
        carregou = true;
        render();
    }, err => {
        console.error(err);
        mostrarAviso('Erro ao carregar as fichas: ' + (err?.message || err), 'erro');
        if (!carregou) $('lista').innerHTML = '<p class="sv-vazio">Não foi possível carregar as fichas. Verifique a conexão e recarregue a página.</p>';
    });

    // Fichas antigas que ficaram só neste navegador vão para o banco compartilhado
    try {
        const { enviadas, renumeradas } = await migrarFichasLocais(proximoProtocolo);
        if (renumeradas.length) {
            alert('Algumas fichas salvas só neste aparelho tinham o mesmo protocolo de fichas de outra pessoa e foram renumeradas:\n\n'
                + renumeradas.map(r => `${r.de} → ${r.para}`).join('\n'));
        } else if (enviadas) {
            mostrarAviso(`${enviadas} ficha${enviadas === 1 ? '' : 's'} deste aparelho enviada${enviadas === 1 ? '' : 's'} para o banco compartilhado.`);
        }
    } catch (err) {
        console.error('[SV] Erro na migração das fichas locais:', err);
    }
}

['busca-texto', 'busca-de', 'busca-ate', 'busca-status'].forEach(id => $(id).addEventListener('input', render));

exigirLogin(iniciar);
