// Etapa 2 — o responsável técnico preenche resultados, títulos de VN e laudo final
// na MESMA ficha (mesmo protocolo); ao emitir, o status vira "Laudo emitido".
import {
    exigirLogin, esc, dataBR, separarIdentificacoes, hojeISO, mostrarAviso, examesMarcados, nomeExame, OPCOES_RESULTADO,
    renderVNForm, coletarVNForm, renderCobrancaForm, coletarCobrancaForm
} from "./sv-comum.js";
import { obterFicha, atualizarFicha, STATUS } from "../../utils/svFichasDB.js";
import { observarTarefasDaFicha, resultadosDoMural, descreverTarefa, statusTarefa } from "./sv-mural.js";

const $ = (id) => document.getElementById(id);
const protocolo = new URLSearchParams(location.search).get('id');
let ficha = null;

function renderResumo(f) {
    const itens = [
        ['Protocolo', f.protocolo],
        ['Data de entrada', dataBR(f.identificacao?.dataEntrada)],
        ['Recebido por', f.identificacao?.recebidoPor],
        ['Proprietário', f.proprietario?.nome],
        ['Cidade', f.proprietario?.cidade],
        ['Veterinário(a)', f.veterinario?.nome],
        ['Espécie', f.amostras?.especie],
        ['Amostra / tipo', f.amostras?.tipo],
        ['Data da coleta', dataBR(f.amostras?.dataColeta)],
        ['Identificação', separarIdentificacoes(f.amostras?.identificacao).join(', ')]
    ];
    $('resumo').innerHTML = itens.map(([r, v]) => `<div><span>${esc(r)}</span>${esc(v || '—')}</div>`).join('') +
        (f.amostras?.historico ? `<div style="grid-column:1/-1"><span>Histórico</span>${esc(f.amostras.historico)}</div>` : '');
    const emitido = f.status === STATUS.LAUDO_EMITIDO;
    $('status-atual').textContent = f.status;
    $('status-atual').className = `sv-status ${emitido ? 'sv-status-emitido' : 'sv-status-aguardando'}`;
}

function renderResultados(f) {
    const marcados = examesMarcados(f);
    const res = f.laudo?.resultados || {};
    if (!marcados.length) {
        $('resultados').innerHTML = '<p class="sv-dica">Nenhum exame marcado na requisição. <a href="sv-requisicao.html?id=' + encodeURIComponent(f.protocolo) + '">Editar requisição</a></p>';
    } else {
        $('resultados').innerHTML = marcados.map(i => {
            const r = res[i.id] || {};
            return `
            <div class="sv-resultado" data-resultado="${i.id}">
                <div class="sv-resultado-nome"><span>${esc(nomeExame(f, i))}</span><small>${esc(i.grupo.secao ? i.grupo.secao + ' · ' : '')}${esc(i.grupo.titulo)}</small></div>
                <select aria-label="Resultado de ${esc(nomeExame(f, i))}">
                    ${OPCOES_RESULTADO.map(o => `<option value="${esc(o)}" ${r.resultado === o ? 'selected' : ''}>${o ? esc(o) : 'Resultado…'}</option>`).join('')}
                </select>
                <input type="text" placeholder="Detalhes / valor / observação" value="${esc(r.detalhe || '')}" aria-label="Detalhes de ${esc(nomeExame(f, i))}">
            </div>`;
        }).join('');
    }
    const temAborto = marcados.some(i => i.grupo.secao);
    $('campo-aborto-resultado').hidden = !temAborto && !f.laudo?.abortoTesteResultado;
    $('aborto-teste-resultado').value = f.laudo?.abortoTesteResultado || '';
}

function coletarLaudo() {
    const resultados = {};
    document.querySelectorAll('[data-resultado]').forEach(el => {
        resultados[el.dataset.resultado] = {
            resultado: el.querySelector('select').value,
            detalhe: el.querySelector('input').value.trim()
        };
    });
    return {
        resultados,
        abortoTesteResultado: $('aborto-teste-resultado').value.trim(),
        conclusao: $('conclusao').value.trim(),
        dataEmissao: $('data-emissao').value,
        analisadoPor: $('analisado-por').value.trim()
    };
}

async function salvar(emitir) {
    const laudo = coletarLaudo();
    if (emitir) {
        if (!laudo.conclusao) {
            $('conclusao').focus();
            mostrarAviso('Escreva o laudo final antes de emitir.', 'erro');
            return;
        }
        if (!laudo.dataEmissao) laudo.dataEmissao = hojeISO();
    }
    const botoes = [$('btn-rascunho'), $('btn-emitir')];
    botoes.forEach(b => { b.disabled = true; });
    try {
        const status = emitir ? STATUS.LAUDO_EMITIDO : (ficha.status || STATUS.AGUARDANDO);
        ficha = await atualizarFicha(protocolo, {
            laudo,
            vn: coletarVNForm($('vn')),
            cobranca: coletarCobrancaForm($('cobranca')),
            status
        });
        if (emitir) {
            location.href = `sv-visualizar.html?id=${encodeURIComponent(protocolo)}`;
            return;
        }
        renderResumo(ficha);
        mostrarAviso('Alterações salvas.');
    } catch (err) {
        console.error(err);
        mostrarAviso('Erro ao salvar: ' + (err?.message || err), 'erro');
    } finally {
        botoes.forEach(b => { b.disabled = false; });
    }
}

async function iniciar(usuario) {
    ficha = protocolo ? await obterFicha(protocolo) : null;
    if (!ficha) {
        $('carregando').innerHTML = 'Ficha não encontrada. <a href="sv-fichas.html">Buscar ficha</a>';
        return;
    }
    const id = encodeURIComponent(protocolo);
    $('link-requisicao').href = `sv-requisicao.html?id=${id}`;
    $('link-visualizar').href = `sv-visualizar.html?id=${id}`;
    document.title = `Laudo ${protocolo} - Setor de Virologia`;
    $('subtitulo').textContent = `Etapa 2 · Análise e laudo da ficha ${protocolo}`;

    renderResumo(ficha);
    renderResultados(ficha);
    renderVNForm($('vn'), ficha, ficha.amostras?.identificacao);
    renderCobrancaForm($('cobranca'), ficha.cobranca || {});
    $('conclusao').value = ficha.laudo?.conclusao || '';
    $('data-emissao').value = ficha.laudo?.dataEmissao || hojeISO();
    $('analisado-por').value = ficha.laudo?.analisadoPor || usuario?.nome || '';
    if (ficha.status === STATUS.LAUDO_EMITIDO) $('btn-emitir').innerHTML = '<i class="bi bi-check2-circle"></i> Salvar e reemitir laudo';

    $('carregando').hidden = true;
    $('form-laudo').hidden = false;

    // Resultados lançados no Mural entram na ficha em tempo real
    observarTarefasDaFicha(protocolo, aplicarMural, () => {
        $('mural-painel').innerHTML = '<span class="sv-mural-aviso">Não foi possível ler as tarefas do Mural agora.</span>';
    });
}

// ------------------------------------------------------------------
// Mural -> laudo
// ------------------------------------------------------------------
function aplicarMural(tarefas) {
    const m = resultadosDoMural(ficha, tarefas);
    renderPainelMural(tarefas, m);

    // Resultado por exame: o Mural tem prioridade quando já há resultado lançado
    Object.entries(m.resultados).forEach(([exame, r]) => {
        const el = document.querySelector(`[data-resultado="${exame}"]`);
        if (!el) return;
        const sel = el.querySelector('select');
        if (r.resultado && [...sel.options].some(o => o.value === r.resultado)) sel.value = r.resultado;
        if (r.detalhe) el.querySelector('input').value = r.detalhe;
        const nome = el.querySelector('.sv-resultado-nome span');
        if (nome && !nome.querySelector('.sv-mural-selo')) nome.insertAdjacentHTML('beforeend', '<span class="sv-mural-selo">do Mural</span>');
    });

    // VN: amostras e títulos vindos da SN do Mural substituem as do vírus correspondente
    if (Object.keys(m.vn).length) {
        const atual = coletarVNForm($('vn'));
        renderVNForm($('vn'), { ...ficha, vn: { ...atual, ...m.vn } }, ficha.amostras?.identificacao);
        Object.keys(m.vn).forEach(v => {
            const h = document.querySelector(`[data-vn="${v}"] h4`);
            if (h && !h.querySelector('.sv-mural-selo')) h.insertAdjacentHTML('beforeend', '<span class="sv-mural-selo">do Mural</span>');
        });
    }
}

function renderPainelMural(tarefas, m) {
    const painel = $('mural-painel');
    if (!tarefas.length) {
        painel.innerHTML = `<strong>Mural:</strong> nenhuma tarefa ligada a esta ficha.
            <a href="sv-requisicao.html?id=${encodeURIComponent(protocolo)}">Abra e salve a requisição</a> para criá-las.`;
        return;
    }
    const nomes = Object.fromEntries(examesMarcados(ficha).map(i => [i.id, nomeExame(ficha, i)]));
    const itens = Object.entries(m.tarefasPorExame).flatMap(([exame, ts]) =>
        ts.map(t => `<li><strong>${esc(nomes[exame] || t.exameFichaNome || exame)}</strong> — ${esc(descreverTarefa(t))}: ${esc(statusTarefa(t))}</li>`));
    m.semVinculo.forEach(t => itens.push(`<li class="sv-mural-aviso">${esc(descreverTarefa(t))}: ${esc(statusTarefa(t))} (não ligada a nenhum exame marcado)</li>`));
    const comResultado = tarefas.filter(t => t.resultados).length;
    painel.innerHTML = `<strong>Mural:</strong> ${tarefas.length} tarefa${tarefas.length === 1 ? '' : 's'}, ${comResultado} com resultado.
        Os resultados lançados no Mural preenchem os campos abaixo automaticamente.
        <ul>${itens.join('')}</ul>
        <a href="../mural.html">Abrir o Mural</a>`;
}

$('form-laudo').addEventListener('submit', (e) => { e.preventDefault(); salvar(true); });
$('btn-rascunho').addEventListener('click', () => salvar(false));

exigirLogin(iniciar);
