// Etapa 3 — monta a ficha completa (requisição + laudo + cobrança) no layout da ficha original
// "Requisição de Exames / Laudo" e exporta em PDF.
import {
    GRUPOS_EXAMES, RESPONSAVEL_TECNICO, classificarVN, resumoVN,
    esc, dataBR, moedaBR, examesMarcados, nomeExame, virusVN, separarIdentificacoes,
    amostrasDaVN, gruposPorResultado, detalheAutomatico
} from "./sv-comum.js";
import { STATUS } from "../../utils/svFichasDB.js";

const IMG = '../../assets/images/';

function marca(ficha, item) {
    const marcado = ficha.exames?.[item.id] === true;
    const outroTexto = item.outro ? (ficha.examesOutros?.[item.id] || '') : '';
    const nome = `<span class="${marcado ? 'exame-marcado' : ''}">${esc(item.nome)}</span>`;
    const extra = item.outro ? ` <span class="pontilhado">${esc(outroTexto) || '&nbsp;'}</span>` : '';
    return `<span class="item-exame">(${marcado ? ' X ' : '&nbsp;&nbsp;&nbsp;&nbsp;'}) ${nome}${extra}</span>`;
}

function campo(rotulo, valor, attrs = '') {
    return `<td ${attrs}><span class="rotulo">${esc(rotulo)}</span> ${esc(valor || '')}</td>`;
}

function simNao(v) { return v === true ? 'Sim' : v === false ? 'Não' : '—'; }

// Uma linha por amostra: identificação, título e se é positiva ou negativa.
function tabelaVN(nomeVirus, linhas) {
    const lista = (linhas || []).filter(l => l.amostra || l.titulo);
    const corpo = lista.length
        ? lista.map(l => {
            const c = classificarVN(l.titulo);
            const pos = c === 'Positiva' ? 'vn-pos' : '';
            return `<tr><td class="${pos}">${esc(l.amostra || '—')}</td><td class="centro ${pos}">${esc(l.titulo || '')}</td>
                <td class="centro ${pos}">${esc(c)}</td></tr>`;
        }).join('')
        : Array.from({ length: 6 }, () => '<tr><td>&nbsp;</td><td></td><td></td></tr>').join('');
    const r = resumoVN(lista);
    const resumo = lista.length ? `
        <p class="vn-resumo">
            <span class="rotulo">Positivas (${r.positivas.length}):</span> <strong>${esc(r.positivas.join(', ') || '—')}</strong><br>
            <span class="rotulo">Negativas (${r.negativas.length}):</span> ${esc(r.negativas.join(', ') || '—')}
            ${r.naoAvaliaveis.length ? `<br><span class="rotulo">Não avaliáveis (${r.naoAvaliaveis.length}):</span> ${esc(r.naoAvaliaveis.join(', '))}` : ''}
        </p>` : '';
    return `
    <div class="vn-bloco evitar-quebra">
        <p class="vn-virus"><span class="rotulo">Vírus:</span> ${esc(nomeVirus)}</p>
        <table class="tabela vn">
            <tr><th class="cinza">Amostra (identificação)</th><th class="cinza" style="width:20%">Título</th><th class="cinza" style="width:26%">Resultado</th></tr>
            ${corpo}
        </table>
        ${resumo}
    </div>`;
}

function classeRes(r) { return r === 'Positivo' ? 'res-pos' : ''; }

// Linhas de um exame no quadro do laudo. Com resultado por amostra/pool, cada classificação
// fica na sua própria linha (Positivo: Pool 3 / Negativo: Pool 1, Pool 2) — nunca misturadas.
function linhasLaudo(f, item, r) {
    const nome = `<span class="exame-marcado">${esc(nomeExame(f, item))}</span><br><small>${esc(item.grupo.titulo)}</small>`;
    const vn = item.grupo.id === 'sorologia' ? amostrasDaVN(f.vn?.[item.id]) : [];
    const amostras = vn.length ? vn : (r.amostras || []);
    if (!amostras.length) {
        return `<tr><td>${nome}</td><td class="centro ${classeRes(r.resultado)}">${esc(r.resultado || '')}</td><td>${esc(r.detalhe || '')}</td></tr>`;
    }
    const grupos = gruposPorResultado(amostras);
    const obs = r.detalhe && !detalheAutomatico(r.detalhe) ? r.detalhe : '';
    const total = grupos.length + (obs ? 1 : 0);
    const linhas = grupos.map((g, n) => `<tr>${n === 0 ? `<td rowspan="${total}">${nome}</td>` : ''}
            <td class="centro ${classeRes(g.resultado)}">${esc(g.resultado)}</td>
            <td class="${classeRes(g.resultado)}">${esc(g.amostras.join(', '))}</td></tr>`);
    if (obs) linhas.push(`<tr><td colspan="2"><span class="rotulo">Obs.:</span> ${esc(obs)}</td></tr>`);
    return linhas.join('');
}

export function htmlFicha(f) {
    const id = f.identificacao || {};
    const p = f.proprietario || {};
    const v = f.veterinario || {};
    const a = f.amostras || {};
    const c = f.cobranca || {};
    const laudo = f.laudo || {};
    const emitido = f.status === STATUS.LAUDO_EMITIDO;

    const gruposPrincipais = GRUPOS_EXAMES.filter(g => !g.secao);
    const gruposAborto = GRUPOS_EXAMES.filter(g => g.secao);

    const linhasExames = gruposPrincipais.map(g => {
        let corpo = g.itens.map(i => marca(f, i)).join(' ');
        if (g.id === 'vacina') {
            corpo += ` &nbsp; <span class="rotulo">nº de tratamentos:</span> ${esc(f.vacinaTratamentos ?? '')}`;
        }
        return `<tr><th class="cinza-claro">${esc(g.titulo)}</th></tr><tr><td class="itens">${corpo}</td></tr>`;
    }).join('');

    const virus = virusVN(f);
    const blocosVN = virus.length
        ? virus.map(vv => tabelaVN(vv.nome, f.vn?.[vv.id])).join('')
        : tabelaVN('', []) + tabelaVN('', []);

    const marcados = examesMarcados(f);
    const resultados = laudo.resultados || {};
    const linhasResultado = marcados.length
        ? marcados.map(i => linhasLaudo(f, i, resultados[i.id] || {})).join('')
        : '<tr><td colspan="3" class="centro">Nenhum exame marcado.</td></tr>';

    return `
<article class="ficha-sv">
    <header class="cab">
        <img src="${IMG}logo-sv.png" alt="Setor de Virologia UFSM" class="cab-logo">
        <div class="cab-titulo">
            <div class="cab-setor">Setor de Virologia</div>
            <div class="cab-doc">Requisição de Exames / Laudo</div>
        </div>
        <img src="${IMG}logo-ufsm.png" alt="UFSM" class="cab-logo">
    </header>

    <table class="tabela">
        <tr><th class="cinza-escuro">Protocolo:</th><th class="cinza-escuro">Data de entrada</th><th class="cinza-escuro">Recebido por:</th></tr>
        <tr><td class="centro forte">${esc(f.protocolo)}</td><td class="centro">${esc(dataBR(id.dataEntrada))}</td><td class="centro">${esc(id.recebidoPor)}</td></tr>
    </table>

    <table class="tabela">
        <tr>${campo('Proprietário:', p.nome, 'colspan="2"')}</tr>
        <tr>${campo('Endereço:', p.endereco)}${campo('Cidade:', p.cidade)}</tr>
        <tr>${campo('CPF:', p.cpf)}${campo('E-mail/celular:', p.contato)}</tr>
    </table>

    <table class="tabela">
        <tr>${campo('Veterinário (a):', v.nome)}${campo('CRMV:', v.crmv)}</tr>
        <tr>${campo('E-mail:', v.email)}${campo('Celular:', v.celular)}</tr>
    </table>

    <table class="tabela">
        <tr><th colspan="3" class="cinza-escuro">Identificação das amostras</th></tr>
        <tr>${campo('Espécie:', a.especie)}${campo('Amostra / tipo:', a.tipo)}${campo('Data da coleta:', dataBR(a.dataColeta))}</tr>
        <tr><td class="rotulo">Informações adicionais</td>
            <td colspan="2"><span class="rotulo">Raça:</span> ${esc(a.raca)} &nbsp;&nbsp; <span class="rotulo">Idade:</span> ${esc(a.idade)} &nbsp;&nbsp; <span class="rotulo">Identificação:</span> ${esc(separarIdentificacoes(a.identificacao).join(', '))}</td></tr>
        <tr><td colspan="3" class="texto-longo"><span class="rotulo">Histórico:</span> ${esc(a.historico)}</td></tr>
        <tr><td colspan="3" class="texto-longo"><span class="rotulo">Observações:</span> ${esc(a.observacoes)}</td></tr>
    </table>

    <table class="tabela exames">
        <tr><th class="cinza-escuro">Exames solicitados</th></tr>
        ${linhasExames}
    </table>

    <div class="evitar-quebra">
    <p class="titulo-secao">Investigação de etiologia de abortos</p>
    <table class="tabela">
        ${gruposAborto.map(g => `<tr><th class="cinza-medio" style="width:26%">${esc(g.titulo)}</th><td class="itens">${g.itens.map(i => marca(f, i)).join('<br>')}</td></tr>`).join('')}
    </table>
    <p class="linha-texto"><span class="rotulo">Teste/ resultado:</span> ${esc(laudo.abortoTesteResultado || '')}</p>
    </div>

    <table class="tabela evitar-quebra">
        <tr><th colspan="2" class="cinza-escuro">Cobrança e Pagamento</th></tr>
        <tr><td><span class="rotulo">Cobrança realizada?</span> ${simNao(c.realizada)}${c.realizada && c.dataCobranca ? ` &nbsp; <span class="rotulo">Data da cobrança:</span> ${esc(dataBR(c.dataCobranca))}` : ''}</td>
            <td><span class="rotulo">Pagamento realizado?</span> ${simNao(c.pagamentoRealizado)}${c.pagamentoRealizado && c.dataPagamento ? ` &nbsp; <span class="rotulo">Data do pagamento:</span> ${esc(dataBR(c.dataPagamento))}` : ''}</td></tr>
        <tr><td><span class="rotulo">Valor cobrado:</span> ${esc(moedaBR(c.valor))}</td><td><span class="rotulo">Forma de pagamento:</span> ${esc(c.formaPagamento || '')}</td></tr>
        <tr><td colspan="2"><span class="rotulo">Observações sobre a cobrança:</span> ${esc(c.observacoes || '')}</td></tr>
    </table>

    <section class="caixa-resultados">
        <span class="canto canto-se"></span><span class="canto canto-sd"></span><span class="canto canto-ie"></span><span class="canto canto-id"></span>
        <p class="titulo-secao">Resultados vírus-neutralização</p>
        <div class="vn-grade">${blocosVN}</div>

        <p class="titulo-secao">Laudo</p>
        <table class="tabela">
            <tr><th class="cinza-claro" style="width:46%">Exame</th><th class="cinza-claro" style="width:16%">Resultado</th><th class="cinza-claro">Observação</th></tr>
            ${linhasResultado}
            <tr><td colspan="3" class="texto-longo"><span class="rotulo">Laudo final:</span> ${esc(laudo.conclusao || '')}</td></tr>
            <tr><td colspan="3"><span class="rotulo">Status:</span> ${esc(f.status || '')}
                ${laudo.dataEmissao ? ` &nbsp; <span class="rotulo">Emitido em:</span> ${esc(dataBR(laudo.dataEmissao))}` : ''}
                ${laudo.analisadoPor ? ` &nbsp; <span class="rotulo">Análise:</span> ${esc(laudo.analisadoPor)}` : ''}</td></tr>
        </table>
    </section>

    <div class="assinatura evitar-quebra">
        ${emitido ? `<img src="${IMG}Assinatura.png" alt="Assinatura">` : '<div class="assinatura-espaco"></div>'}
        <div class="assinatura-linha">${esc(RESPONSAVEL_TECNICO)}</div>
    </div>

    <footer class="rodape-ficha">${esc(RESPONSAVEL_TECNICO)}</footer>
</article>`;
}

// Gera o PDF da ficha (mesmo layout da tela/impressão) e baixa o arquivo.
const HTML2PDF_URL = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';

function carregarHtml2Pdf() {
    if (window.html2pdf) return Promise.resolve(window.html2pdf);
    return new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = HTML2PDF_URL;
        s.onload = () => resolve(window.html2pdf);
        s.onerror = () => reject(new Error('Não foi possível carregar o gerador de PDF (verifique a internet).'));
        document.head.appendChild(s);
    });
}

export async function baixarPDF(elemento, ficha) {
    const html2pdf = await carregarHtml2Pdf();
    const nome = `Ficha_${String(ficha.protocolo).replace(/[\\/:*?"<>|\s]+/g, '_')}.pdf`;
    document.body.classList.add('gerando-pdf');
    try {
        await html2pdf().set({
            margin: [10, 10, 16, 10],
            filename: nome,
            image: { type: 'jpeg', quality: 0.96 },
            // windowWidth sem a barra de rolagem: senão a captura sai deslocada e corta a borda direita
            html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff', scrollX: 0, scrollY: 0, windowWidth: document.documentElement.clientWidth },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
            pagebreak: { mode: ['css', 'legacy'], avoid: ['tr', '.evitar-quebra'] }
        }).from(elemento).toPdf().get('pdf').then(pdf => {
            // Rodapé em todas as páginas
            const total = pdf.internal.getNumberOfPages();
            const largura = pdf.internal.pageSize.getWidth();
            const altura = pdf.internal.pageSize.getHeight();
            for (let i = 1; i <= total; i++) {
                pdf.setPage(i);
                pdf.setDrawColor(150);
                pdf.line(10, altura - 11, largura - 10, altura - 11);
                pdf.setFont('helvetica', 'normal');
                pdf.setFontSize(8.5);
                pdf.setTextColor(60);
                pdf.text(RESPONSAVEL_TECNICO, largura / 2, altura - 7, { align: 'center' });
                pdf.text(`${ficha.protocolo} · ${i}/${total}`, largura - 10, altura - 3.5, { align: 'right' });
            }
        }).save();
    } finally {
        document.body.classList.remove('gerando-pdf');
    }
}
