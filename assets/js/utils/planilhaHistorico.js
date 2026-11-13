// ============================================================================
// Planilha do arquivo anual do Histórico (Excel formatado, gerado no navegador)
//
// Abas:
//   Resumo                 totais por teste e por mês
//   SN, ELISA, Molecular…  uma aba por teste, uma linha por tarefa
//   Resultados detalhados  uma linha por amostra (e por agente, no multiplex)
//
// Usa ExcelJS (gratuito), carregado só quando o admin pede a planilha.
// ============================================================================

const EXCELJS = "https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js";

// Cores (as mesmas do app)
const COR = {
    tinta: "FF0F2419", suave: "FF4B6155", verde: "FF14532D", verdeClaro: "FFDCEBE1",
    linha: "FFD6E3DA", zebra: "FFF4F8F5", branco: "FFFFFFFF",
    posFundo: "FFFBE4DF", posTexto: "FF8F2A19", negFundo: "FFDCEBE1", negTexto: "FF14532D",
    alertaFundo: "FFFDF3DC", alertaTexto: "FF7D5200"
};

// Testes: nome da aba, cor da aba e ordem
const TESTES = {
    sn:        { aba: "SN",        nome: "Soroneutralização", cor: "FF23774A" },
    elisa:     { aba: "ELISA",     nome: "ELISA",             cor: "FFE3A21A" },
    molecular: { aba: "Molecular", nome: "Molecular (PCR)",   cor: "FF5B62C9" },
    vacina:    { aba: "Vacinas",   nome: "Vacinas",           cor: "FF1D8A95" },
    icc:       { aba: "ICC",       nome: "ICC",               cor: "FFC04A6F" },
    raiva:     { aba: "Raiva",     nome: "Raiva",             cor: "FFC75A32" },
    outros:    { aba: "Outros",    nome: "Outros testes",     cor: "FF6B7C72" }
};

const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

// Campos de resultado da SN, na ordem do laudo
const CAMPOS_SN = [
    ["negativas", "Negativas (< 1:4)"], ["titulo4", "1:4"], ["titulo8", "1:8"], ["titulo16", "1:16"],
    ["titulo32", "1:32"], ["titulo64", "1:64"], ["titulo128", "1:128"], ["titulo256", "1:256"],
    ["titulo512", "≥ 1:512"], ["improprias", "Impróprias"], ["toxicas", "Tóxicas"], ["insuficiente", "Qtd. insuficiente"]
];

// Nomes legíveis dos agentes do PCR multiplex
const AGENTES = {
    coronavirusBovino: "Coronavírus bovino", rotavirusBovino: "Rotavírus bovino",
    coronavirusEquino: "Coronavírus equino", rotavirusEquino: "Rotavírus equino",
    vaccinia: "Vaccinia vírus", pseudocowpox: "Pseudocowpox", estomatitePapular: "Estomatite papular",
    herpesvirus: "Herpesvírus", ecoli: "E. coli", salmonella: "Salmonella", cryptosporidium: "Cryptosporidium",
    brsv: "BRSV", bohv: "BoHV", bvdv: "BVDV", bpiv3: "BPIV-3", virusRaiva: "Vírus da raiva",
    ehv1: "EHV-1", flavivirus: "Flavivírus", alphavirus: "Alphavírus", veev: "VEEV"
};

// ---------- utilidades ----------

function carregarExcelJS() {
    if (window.ExcelJS) return Promise.resolve(window.ExcelJS);
    return new Promise((ok, erro) => {
        const s = document.createElement("script");
        s.src = EXCELJS;
        s.onload = () => ok(window.ExcelJS);
        s.onerror = () => erro(new Error("Não foi possível carregar o gerador de planilhas (verifique a internet)."));
        document.head.appendChild(s);
    });
}

export function categoriaDoTipo(tipo) {
    const t = String(tipo || "").toUpperCase();
    if (t.startsWith("SN")) return "sn";
    if (t.startsWith("ELISA")) return "elisa";
    if (t === "MOLECULAR" || t === "PCR") return "molecular";
    if (t === "VACINA") return "vacina";
    if (t === "ICC") return "icc";
    if (t === "RAIVA") return "raiva";
    return "outros";
}

// Data do Firestore -> Date "local tratado como UTC" (o Excel não tem fuso; evita mudar o dia)
function dataExcel(v) {
    const d = v?.toDate ? v.toDate() : (v instanceof Date ? v : null);
    if (!d || isNaN(d)) return null;
    return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes()));
}

const texto = (v) => (v === null || v === undefined) ? "" : String(v).trim();

function nomeAgente(chave) {
    return AGENTES[chave] || chave.replace(/([a-z])([A-Z0-9])/g, "$1 $2").replace(/^./, c => c.toUpperCase());
}

// "positivo", "Reagente", "NEG" -> Positivo / Negativo / …
function classificar(valor) {
    const s = texto(valor).toLowerCase();
    if (!s) return "";
    if (/n[ãa]o\s*reagente|negativ|^neg$/.test(s)) return "Negativo";
    if (/positiv|reagente|^pos$/.test(s)) return "Positivo";
    if (/inconclusiv/.test(s)) return "Inconclusivo";
    return texto(valor).charAt(0).toUpperCase() + texto(valor).slice(1);
}

function pessoa(obj, campo) {
    if (!obj) return "";
    if (typeof obj === "string") return campo === "nome" ? obj : "";
    return texto(obj[campo]);
}

// Linhas detalhadas (uma por amostra / agente) a partir dos resultados da tarefa
function linhasDeResultado(t) {
    const r = t.resultados;
    if (!r) return [];
    if (categoriaDoTipo(t.tipo) === "sn") {
        return CAMPOS_SN.filter(([c]) => texto(r[c])).map(([c, rotulo]) => ({
            amostra: texto(r[c]), agente: "", resultado: c === "negativas" ? "Negativo" : rotulo
        }));
    }
    if (!Array.isArray(r.amostras)) return [];
    const linhas = [];
    r.amostras.forEach((a, i) => {
        const nome = texto(a.identificacao) || `Amostra ${i + 1}`;
        if ("resultado" in a) {
            linhas.push({ amostra: nome, agente: "", resultado: classificar(a.resultado) || texto(a.resultado) });
        }
        Object.entries(a).forEach(([k, v]) => {
            if (["identificacao", "resultado", "observacao", "observacoes", "id"].includes(k)) return;
            if (typeof v !== "string" && typeof v !== "boolean") return;
            const val = typeof v === "boolean" ? (v ? "Positivo" : "Negativo") : classificar(v);
            if (val) linhas.push({ amostra: nome, agente: nomeAgente(k), resultado: val });
        });
    });
    return linhas;
}

// Resumo em uma frase, para a aba do teste: "Positivo (2): A1, A3 · Negativo (5): …"
function resumoResultado(t) {
    const linhas = linhasDeResultado(t);
    if (!linhas.length) return "";
    if (categoriaDoTipo(t.tipo) === "sn") return ""; // a aba de SN tem uma coluna por título
    const comAgente = linhas.some(l => l.agente);
    if (comAgente) {
        const positivos = linhas.filter(l => l.resultado === "Positivo");
        if (!positivos.length) return "Todas negativas";
        const porAgente = {};
        positivos.forEach(l => (porAgente[l.agente] ||= []).push(l.amostra));
        return Object.entries(porAgente).map(([ag, am]) => `${ag}: ${am.join(", ")}`).join(" · ");
    }
    const grupos = {};
    linhas.forEach(l => (grupos[l.resultado] ||= []).push(l.amostra));
    return Object.entries(grupos).map(([res, am]) => `${res} (${am.length}): ${am.join(", ")}`).join(" · ");
}

// ---------- estilo ----------

const borda = { style: "thin", color: { argb: COR.linha } };
const bordas = { top: borda, left: borda, bottom: borda, right: borda };

function titulo(ws, textoTitulo, subtitulo, ncol) {
    ws.mergeCells(1, 1, 1, Math.max(ncol, 4));
    const c = ws.getCell(1, 1);
    c.value = textoTitulo;
    c.font = { name: "Calibri", size: 16, bold: true, color: { argb: COR.verde } };
    c.alignment = { vertical: "middle" };
    ws.getRow(1).height = 28;
    ws.mergeCells(2, 1, 2, Math.max(ncol, 4));
    const s = ws.getCell(2, 1);
    s.value = subtitulo;
    s.font = { name: "Calibri", size: 10, color: { argb: COR.suave } };
    ws.getRow(3).height = 6;
}

// Tabela com cabeçalho verde, linhas zebradas, filtro e cabeçalho congelado
function tabela(ws, linhaInicio, colunas, dados, { corCabecalho = COR.verde, congelar = true } = {}) {
    colunas.forEach((col, i) => {
        ws.getColumn(i + 1).width = col.largura || 14;
        const c = ws.getCell(linhaInicio, i + 1);
        c.value = col.titulo;
        c.font = { bold: true, color: { argb: COR.branco }, size: 10 };
        c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: corCabecalho } };
        c.alignment = { vertical: "middle", horizontal: col.centro ? "center" : "left", wrapText: true };
        c.border = bordas;
    });
    ws.getRow(linhaInicio).height = 30;

    dados.forEach((linha, n) => {
        const row = ws.getRow(linhaInicio + 1 + n);
        colunas.forEach((col, i) => {
            const c = row.getCell(i + 1);
            const v = col.valor(linha);
            c.value = (v === "" || v === undefined) ? null : v;
            c.font = { size: 10, color: { argb: COR.tinta }, ...(col.negrito ? { bold: true } : {}) };
            c.alignment = { vertical: "top", wrapText: !!col.quebrar, horizontal: col.centro ? "center" : "left" };
            c.border = bordas;
            if (col.formato) c.numFmt = col.formato;
            if (n % 2 === 1) c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COR.zebra } };
            if (col.colorir) col.colorir(c, v);
        });
    });

    const ultima = linhaInicio + dados.length;
    if (dados.length) {
        ws.autoFilter = { from: { row: linhaInicio, column: 1 }, to: { row: ultima, column: colunas.length } };
    }
    if (congelar) ws.views = [{ state: "frozen", ySplit: linhaInicio, xSplit: 1, showGridLines: false }];
    return ultima;
}

function colorirResultado(c, v) {
    if (v === "Positivo" || (typeof v === "string" && v.startsWith("1:")) || v === "≥ 1:512") {
        c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COR.posFundo } };
        c.font = { ...c.font, bold: true, color: { argb: COR.posTexto } };
    } else if (v === "Negativo") {
        c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COR.negFundo } };
        c.font = { ...c.font, color: { argb: COR.negTexto } };
    } else if (v) {
        c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COR.alertaFundo } };
        c.font = { ...c.font, color: { argb: COR.alertaTexto } };
    }
}

// ---------- colunas comuns ----------

const DATA = "dd/mm/yyyy";
const DATA_HORA = "dd/mm/yyyy hh:mm";

const colIdentificacao = { titulo: "Identificação", largura: 16, negrito: true, valor: t => texto(t.id) };
const colSubtipo = { titulo: "Teste / alvo", largura: 24, quebrar: true,
    valor: t => [t.subTipo || (categoriaDoTipo(t.tipo) === "outros" ? t.tipo : ""), t.alvo].filter(Boolean).join(" · ") || texto(t.tipo) };
const colAmostras = { titulo: "Nº de amostras", largura: 10, centro: true, valor: t => Number(t.quantidade) || null };
const colMaterial = { titulo: "Material recebido", largura: 18, quebrar: true, valor: t => texto(t.materialRecebido) };
const colProprietario = { titulo: "Proprietário", largura: 24, quebrar: true, valor: t => pessoa(t.proprietario, "nome") };
const colMunicipio = { titulo: "Município", largura: 16, valor: t => pessoa(t.proprietario, "municipio") };
const colContato = { titulo: "Contato", largura: 16, valor: t => pessoa(t.proprietario, "contato") };
const colVet = { titulo: "Médico veterinário", largura: 22, quebrar: true, valor: t => pessoa(t.veterinario, "nome") };
const colCrmv = { titulo: "CRMV", largura: 11, valor: t => pessoa(t.veterinario, "crmv") };
const colRecebido = { titulo: "Recebido em", largura: 12, centro: true, formato: DATA, valor: t => dataExcel(t.dataRecebimento || t.criadoEm) };
const colPrazo = { titulo: "Prazo", largura: 12, centro: true, formato: DATA, valor: t => dataExcel(t.dataPrazo) };
const colConcluido = { titulo: "Concluído em", largura: 16, centro: true, formato: DATA_HORA, valor: t => dataExcel(t.dataConclusao) };
const colResponsavel = { titulo: "Responsável", largura: 11, centro: true, valor: t => texto(t.siglaResponsavel) };
const colObs = { titulo: "Observações", largura: 34, quebrar: true, valor: t => texto(t.observacoes) };
const colCodigo = { titulo: "Código interno", largura: 22, valor: t => t.__docId };

// ---------- montagem ----------

/**
 * Gera a planilha do ano e devolve um Blob .xlsx.
 * @param {Array<{id: string, dados: object}>} registros documentos do Histórico
 * @param {number} ano
 */
export async function gerarPlanilhaHistorico(registros, ano) {
    const ExcelJS = await carregarExcelJS();
    const tarefas = registros
        .map(r => ({ ...r.dados, __docId: r.id }))
        .sort((a, b) => (dataExcel(a.dataConclusao) || 0) - (dataExcel(b.dataConclusao) || 0));

    const livro = new ExcelJS.Workbook();
    livro.creator = "Setor de Virologia · UFSM";
    livro.created = new Date();
    const geradoEm = new Date().toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });

    const porTeste = {};
    tarefas.forEach(t => (porTeste[categoriaDoTipo(t.tipo)] ||= []).push(t));
    const testesPresentes = Object.keys(TESTES).filter(k => porTeste[k]?.length);

    // ----- Resumo -----
    const resumo = livro.addWorksheet("Resumo", { properties: { tabColor: { argb: COR.verde } } });
    titulo(resumo, `Histórico de ${ano} · Setor de Virologia UFSM`,
        `${tarefas.length} tarefas concluídas em ${ano} · planilha gerada em ${geradoEm}`, 6);

    const linhasTeste = testesPresentes.map(k => {
        const lista = porTeste[k];
        return {
            teste: TESTES[k].nome,
            tarefas: lista.length,
            amostras: lista.reduce((s, t) => s + (Number(t.quantidade) || 0), 0),
            primeira: dataExcel(lista[0].dataConclusao),
            ultima: dataExcel(lista[lista.length - 1].dataConclusao)
        };
    });
    let fim = tabela(resumo, 4, [
        { titulo: "Teste", largura: 24, negrito: true, valor: l => l.teste },
        { titulo: "Tarefas", largura: 11, centro: true, valor: l => l.tarefas },
        { titulo: "Amostras", largura: 11, centro: true, valor: l => l.amostras },
        { titulo: "Primeira conclusão", largura: 17, centro: true, formato: DATA, valor: l => l.primeira },
        { titulo: "Última conclusão", largura: 17, centro: true, formato: DATA, valor: l => l.ultima }
    ], linhasTeste, { congelar: false });
    const total = resumo.getRow(fim + 1);
    total.getCell(1).value = "Total";
    total.getCell(2).value = tarefas.length;
    total.getCell(3).value = linhasTeste.reduce((s, l) => s + l.amostras, 0);
    [1, 2, 3].forEach(i => {
        const c = total.getCell(i);
        c.font = { bold: true, color: { argb: COR.verde } };
        c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COR.verdeClaro } };
        c.alignment = { horizontal: i === 1 ? "left" : "center" };
        c.border = bordas;
    });
    resumo.autoFilter = undefined;

    // Tarefas por mês
    const inicioMes = fim + 4;
    const tituloMes = resumo.getCell(inicioMes - 1, 1);
    tituloMes.value = "Tarefas concluídas por mês";
    tituloMes.font = { bold: true, size: 12, color: { argb: COR.verde } };
    const contagemMes = MESES.map((m, i) => ({ mes: m, ...Object.fromEntries(testesPresentes.map(k =>
        [k, porTeste[k].filter(t => dataExcel(t.dataConclusao)?.getUTCMonth() === i).length])) }));
    tabela(resumo, inicioMes, [
        { titulo: "Mês", largura: 24, negrito: true, valor: l => l.mes },
        ...testesPresentes.map(k => ({ titulo: TESTES[k].aba, largura: 11, centro: true, valor: l => l[k] || null })),
        { titulo: "Total", largura: 11, centro: true, negrito: true, valor: l => testesPresentes.reduce((s, k) => s + l[k], 0) || null }
    ], contagemMes, { congelar: false });
    resumo.autoFilter = undefined;
    resumo.views = [{ showGridLines: false }];

    // ----- Uma aba por teste -----
    testesPresentes.forEach(k => {
        const info = TESTES[k];
        const lista = porTeste[k];
        const ws = livro.addWorksheet(info.aba, { properties: { tabColor: { argb: info.cor } } });

        let colunas;
        if (k === "sn") {
            colunas = [colIdentificacao, colSubtipo, colAmostras,
                ...CAMPOS_SN.map(([campo, rotulo]) => ({
                    titulo: rotulo, largura: campo === "negativas" ? 18 : 11, quebrar: true,
                    valor: t => texto(t.resultados?.[campo]),
                    colorir: (c, v) => v && colorirResultado(c, campo === "negativas" ? "Negativo" :
                        ["improprias", "toxicas", "insuficiente"].includes(campo) ? "aviso" : "Positivo")
                })),
                colProprietario, colMunicipio, colVet, colCrmv, colRecebido, colPrazo, colConcluido, colResponsavel, colObs, colCodigo];
        } else {
            colunas = [colIdentificacao, colSubtipo, colAmostras,
                ...(k === "vacina" ? [{ titulo: "Gramatura", largura: 11, centro: true, valor: t => Number(t.gramatura) || texto(t.gramatura) }] : []),
                { titulo: "Resultado", largura: 46, quebrar: true, valor: t => resumoResultado(t) },
                colMaterial, colProprietario, colMunicipio, colContato, colVet, colCrmv,
                colRecebido, colPrazo, colConcluido, colResponsavel, colObs, colCodigo];
        }
        titulo(ws, `${info.nome} · ${ano}`, `${lista.length} ${lista.length === 1 ? "tarefa concluída" : "tarefas concluídas"} · ordenadas pela data de conclusão`, colunas.length);
        tabela(ws, 4, colunas, lista, { corCabecalho: info.cor === "FFE3A21A" ? "FFB07A0A" : info.cor });
    });

    // ----- Resultados detalhados -----
    const det = [];
    tarefas.forEach(t => linhasDeResultado(t).forEach(l => det.push({ t, ...l })));
    if (det.length) {
        const ws = livro.addWorksheet("Resultados detalhados", { properties: { tabColor: { argb: COR.suave } } });
        const colunas = [
            { titulo: "Identificação", largura: 16, negrito: true, valor: d => texto(d.t.id) },
            { titulo: "Teste", largura: 18, valor: d => TESTES[categoriaDoTipo(d.t.tipo)].nome },
            { titulo: "Teste / alvo", largura: 24, quebrar: true, valor: d => colSubtipo.valor(d.t) },
            { titulo: "Amostra(s)", largura: 30, quebrar: true, valor: d => d.amostra },
            { titulo: "Agente", largura: 20, valor: d => d.agente },
            { titulo: "Resultado", largura: 18, centro: true, valor: d => d.resultado, colorir: colorirResultado },
            { titulo: "Proprietário", largura: 24, quebrar: true, valor: d => pessoa(d.t.proprietario, "nome") },
            { titulo: "Concluído em", largura: 16, centro: true, formato: DATA_HORA, valor: d => dataExcel(d.t.dataConclusao) }
        ];
        titulo(ws, `Resultados detalhados · ${ano}`, "Uma linha por amostra (no PCR multiplex, uma por agente). Na SN, as amostras aparecem agrupadas por título.", colunas.length);
        tabela(ws, 4, colunas, det);
    }

    // Impressão: paisagem, ajustada à largura da folha
    livro.eachSheet(ws => {
        ws.pageSetup = { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9 };
    });

    const buffer = await livro.xlsx.writeBuffer();
    return new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

export function baixarArquivo(blob, nome) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = nome;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
}
