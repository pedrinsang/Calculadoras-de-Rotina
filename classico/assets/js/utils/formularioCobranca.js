const JSZIP_URL = "https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js";
const TEMPLATE_URL = new URL("../../templates/formulario-cobranca-sv.docx", import.meta.url);
const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";

function valorTexto(valor, fallback = "") {
    if (valor === null || valor === undefined) return fallback;
    const texto = String(valor).trim();
    return texto || fallback;
}

function normalizarData(valor) {
    if (!valor) return null;
    if (valor.toDate) return valor.toDate();
    if (valor.seconds) return new Date(valor.seconds * 1000);
    const data = new Date(valor);
    return Number.isNaN(data.getTime()) ? null : data;
}

function formatarData(valor) {
    const data = normalizarData(valor);
    return data ? data.toLocaleDateString("pt-BR") : "";
}

function formatarDataExtenso(data = new Date()) {
    return data.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "long",
        year: "numeric"
    });
}

function obterCampoPessoa(pessoa, campo) {
    if (!pessoa) return "";
    if (typeof pessoa === "object") return valorTexto(pessoa[campo]);
    return campo === "nome" ? valorTexto(pessoa) : "";
}

function formatarServico(tarefa) {
    const partes = [tarefa.tipo, tarefa.subTipo, tarefa.alvo || tarefa.complemento]
        .map((parte) => valorTexto(parte))
        .filter(Boolean);
    return partes.join(" - ");
}

function obterPrazo(tarefa) {
    return tarefa.diasPrazo ? `${tarefa.diasPrazo} dias` : "dias";
}

function nomeArquivoSeguro(valor) {
    return valorTexto(valor, "tarefa").replace(/[\\/:*?"<>|]+/g, "_").replace(/\s+/g, "_");
}

async function carregarJsZip() {
    if (window.JSZip) return window.JSZip;

    await new Promise((resolve, reject) => {
        const existente = document.querySelector(`script[src="${JSZIP_URL}"]`);
        if (existente) {
            existente.addEventListener("load", resolve, { once: true });
            existente.addEventListener("error", reject, { once: true });
            return;
        }

        const script = document.createElement("script");
        script.src = JSZIP_URL;
        script.onload = resolve;
        script.onerror = () => reject(new Error("Nao foi possivel carregar a biblioteca para gerar Word."));
        document.head.appendChild(script);
    });

    if (!window.JSZip) throw new Error("Biblioteca para gerar Word indisponivel.");
    return window.JSZip;
}

function filhosDiretos(elemento, nomeLocal) {
    return Array.from(elemento.childNodes).filter((filho) => filho.localName === nomeLocal);
}

function primeiroFilho(elemento, nomeLocal) {
    return filhosDiretos(elemento, nomeLocal)[0] || null;
}

function criarTexto(xmlDoc, texto, modeloRun = null) {
    const run = xmlDoc.createElementNS(W_NS, "w:r");
    const modeloRPr = modeloRun ? primeiroFilho(modeloRun, "rPr") : null;
    if (modeloRPr) run.appendChild(modeloRPr.cloneNode(true));

    const text = xmlDoc.createElementNS(W_NS, "w:t");
    text.setAttributeNS("http://www.w3.org/XML/1998/namespace", "xml:space", "preserve");
    text.textContent = texto;
    run.appendChild(text);
    return run;
}

function definirParagrafo(paragrafo, texto) {
    const runs = filhosDiretos(paragrafo, "r");
    const modeloRun = runs[0] || null;
    runs.forEach((run) => run.remove());
    paragrafo.appendChild(criarTexto(paragrafo.ownerDocument, texto, modeloRun));
}

function anexarAoParagrafo(paragrafo, texto) {
    const valor = valorTexto(texto);
    if (!valor) return;
    const runs = filhosDiretos(paragrafo, "r");
    paragrafo.appendChild(criarTexto(paragrafo.ownerDocument, ` ${valor}`, runs[runs.length - 1] || runs[0]));
}

function definirCelula(celula, texto) {
    const paragrafo = celula.getElementsByTagNameNS(W_NS, "p")[0];
    if (paragrafo) definirParagrafo(paragrafo, texto);
}

function preencherDocumentoXml(xml, tarefa) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xml, "application/xml");
    const erroParser = xmlDoc.getElementsByTagName("parsererror")[0];
    if (erroParser) throw new Error("Nao foi possivel ler o modelo Word.");

    const tabelas = xmlDoc.getElementsByTagNameNS(W_NS, "tbl");
    const tabelaPrincipal = tabelas[0];
    const tabelaObservacoes = tabelas[1];
    if (!tabelaPrincipal || !tabelaObservacoes) {
        throw new Error("Modelo do formulario de cobranca invalido.");
    }

    const linhas = filhosDiretos(tabelaPrincipal, "tr");
    const recebimento = tarefa.dataRecebimento || tarefa.criadoEm;
    const paciente = tarefa.paciente || tarefa.animal || "";

    const linhaProtocolo = filhosDiretos(primeiroFilho(linhas[2], "tc"), "p");
    anexarAoParagrafo(linhaProtocolo[0], tarefa.id);
    anexarAoParagrafo(linhaProtocolo[1], formatarData(recebimento));

    const linhaDados = filhosDiretos(linhas[3], "tc");
    const dadosEsquerda = filhosDiretos(linhaDados[0], "p");
    anexarAoParagrafo(dadosEsquerda[0], obterCampoPessoa(tarefa.proprietario, "nome"));
    anexarAoParagrafo(dadosEsquerda[1], obterCampoPessoa(tarefa.veterinario, "nome"));
    anexarAoParagrafo(dadosEsquerda[2], paciente);
    const dadosDireita = filhosDiretos(linhaDados[1], "p");
    anexarAoParagrafo(dadosDireita[0], obterCampoPessoa(tarefa.veterinario, "crmv"));

    const linhaItem = filhosDiretos(linhas[5], "tc");
    definirCelula(linhaItem[1], tarefa.id);
    definirCelula(linhaItem[2], formatarServico(tarefa));
    definirCelula(linhaItem[3], obterPrazo(tarefa));
    definirCelula(linhaItem[4], valorTexto(tarefa.quantidade));

    const linhasObs = filhosDiretos(tabelaObservacoes, "tr");
    const dataSantaMaria = filhosDiretos(primeiroFilho(linhasObs[5], "tc"), "p")[0];
    definirParagrafo(dataSantaMaria, `Santa Maria, ${formatarDataExtenso(new Date())}`);

    return new XMLSerializer().serializeToString(xmlDoc);
}

async function baixarBlob(blob, nomeArquivo) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = nomeArquivo;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}

export async function gerarFormularioCobrancaWord(tarefa) {
    const JSZip = await carregarJsZip();
    const resposta = await fetch(TEMPLATE_URL);
    if (!resposta.ok) throw new Error("Nao foi possivel carregar o modelo do formulario de cobranca.");

    const modelo = await resposta.arrayBuffer();
    const zip = await JSZip.loadAsync(modelo);
    const documentXml = await zip.file("word/document.xml").async("string");
    const headerXml = await zip.file("word/header2.xml").async("string");
    const footerXml = await zip.file("word/footer2.xml").async("string");
    const headerRels = await zip.file("word/_rels/header2.xml.rels").async("string");

    zip.file("word/document.xml", preencherDocumentoXml(documentXml, tarefa || {}));

    zip.file("word/header1.xml", headerXml);
    zip.file("word/header2.xml", headerXml);
    zip.file("word/header3.xml", headerXml);
    zip.file("word/footer1.xml", footerXml);
    zip.file("word/footer2.xml", footerXml);
    zip.file("word/footer3.xml", footerXml);
    zip.file("word/_rels/header1.xml.rels", headerRels);
    zip.file("word/_rels/header2.xml.rels", headerRels);
    zip.file("word/_rels/header3.xml.rels", headerRels);

    const blob = await zip.generateAsync({ type: "blob", mimeType: DOCX_MIME });
    await baixarBlob(blob, `formulario-cobranca-${nomeArquivoSeguro(tarefa?.id)}.docx`);
}
