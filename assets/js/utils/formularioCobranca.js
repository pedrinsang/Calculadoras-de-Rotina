const JSZIP_URL = "https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js";
const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";

const TEMPLATES = {
    sv: new URL("../../templates/formulario-cobranca-sv.docx", import.meta.url),
    labac: new URL("../../templates/formulario-cobranca-labac.docx", import.meta.url),
    ladopar: new URL("../../templates/formulario-cobranca-ladopar.docx", import.meta.url)
};

function valorTexto(valor, fallback = "") {
    if (valor === null || valor === undefined) return fallback;
    const texto = String(valor).trim();
    return texto || fallback;
}

function normalizarData(valor) {
    if (!valor) return null;
    if (valor.toDate) return valor.toDate();
    if (valor.seconds) return new Date(valor.seconds * 1000);
    if (typeof valor === "string") {
        // Datas "yyyy-mm-dd" (input type=date) nao devem passar por new Date(string),
        // que interpreta como UTC e pode voltar um dia com o fuso do Brasil.
        const partesIso = valor.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (partesIso) {
            const [, ano, mes, dia] = partesIso;
            return new Date(Number(ano), Number(mes) - 1, Number(dia));
        }
    }
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

// Normaliza uma tarefa do Mural/Historico (Setor de Virologia) para o formato comum do formulario.
function normalizarDadosTarefa(tarefa) {
    const dados = tarefa || {};
    return {
        protocolo: dados.id,
        dataRecebimento: dados.dataRecebimento || dados.criadoEm,
        proprietarioNome: obterCampoPessoa(dados.proprietario, "nome"),
        veterinarioNome: obterCampoPessoa(dados.veterinario, "nome"),
        veterinarioCrmv: obterCampoPessoa(dados.veterinario, "crmv"),
        paciente: dados.paciente || dados.animal || "",
        servico: formatarServico(dados),
        prazo: obterPrazo(dados),
        quantidade: valorTexto(dados.quantidade)
    };
}

// Normaliza os dados da ficha de encaminhamento LABAC para o formato comum do formulario.
function normalizarDadosLabac(ficha) {
    const dados = ficha || {};
    const exames = Array.isArray(dados.exames) ? dados.exames : [];
    return {
        protocolo: dados["protocolo"],
        dataRecebimento: dados["data-chegada"],
        proprietarioNome: dados["proprietario-nome"],
        veterinarioNome: dados["medico-nome"],
        veterinarioCrmv: dados["medico-crmv"],
        paciente: dados["identificacao-animal"],
        servico: exames.join(", "),
        prazo: "",
        quantidade: ""
    };
}

// Normaliza os dados da ficha de requisicao LADOPAR para o formato comum do formulario.
function normalizarDadosLadopar(ficha) {
    const dados = ficha || {};
    const servicos = [
        ...(dados.sorologia || []),
        ...(dados.coproparasitologicos || []),
        ...(dados["pesquisa-direta"] || []),
        ...(dados.biocarrapaticidograma || []),
        ...(dados.pcr || [])
    ];
    return {
        protocolo: dados["ldp"],
        dataRecebimento: dados["data"],
        proprietarioNome: dados["proprietario-nome"],
        veterinarioNome: dados["medico-nome"],
        veterinarioCrmv: dados["medico-crmv"],
        paciente: [dados["amostra-especie"], dados["amostra-nome"]].map((v) => valorTexto(v)).filter(Boolean).join(" - "),
        servico: servicos.join(", "),
        prazo: "",
        quantidade: dados["amostra-total"]
    };
}

const NORMALIZADORES = {
    sv: normalizarDadosTarefa,
    labac: normalizarDadosLabac,
    ladopar: normalizarDadosLadopar
};

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

function textoParagrafo(paragrafo) {
    const nos = paragrafo.getElementsByTagNameNS(W_NS, "t");
    let texto = "";
    for (let i = 0; i < nos.length; i++) texto += nos[i].textContent;
    return texto;
}

// Reconstroi um paragrafo "Rotulo: valor preenchido pelo usuario", preservando o rotulo
// (tudo ate os ':') que ja vem escrito no modelo e descartando qualquer exemplo/resquicio
// de preenchimento anterior que estivesse no resto do paragrafo.
function preencherRotulo(paragrafo, valor) {
    const textoAtual = textoParagrafo(paragrafo);
    const indiceDoisPontos = textoAtual.lastIndexOf(":");
    const rotulo = (indiceDoisPontos === -1 ? textoAtual : textoAtual.slice(0, indiceDoisPontos + 1)).trim();
    const texto = valorTexto(valor);
    definirParagrafo(paragrafo, texto ? `${rotulo} ${texto}` : rotulo);
}

function preencherDocumentoXml(xml, dados) {
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

    const linhaProtocolo = filhosDiretos(primeiroFilho(linhas[2], "tc"), "p");
    anexarAoParagrafo(linhaProtocolo[0], dados.protocolo);
    anexarAoParagrafo(linhaProtocolo[1], formatarData(dados.dataRecebimento));

    const linhaDados = filhosDiretos(linhas[3], "tc");
    const dadosEsquerda = filhosDiretos(linhaDados[0], "p");
    anexarAoParagrafo(dadosEsquerda[0], dados.proprietarioNome);
    anexarAoParagrafo(dadosEsquerda[1], dados.veterinarioNome);
    anexarAoParagrafo(dadosEsquerda[2], dados.paciente);
    const dadosDireita = filhosDiretos(linhaDados[1], "p");
    anexarAoParagrafo(dadosDireita[0], dados.veterinarioCrmv);

    const linhaItem = filhosDiretos(linhas[5], "tc");
    definirCelula(linhaItem[1], dados.protocolo);
    definirCelula(linhaItem[2], dados.servico);
    definirCelula(linhaItem[3], dados.prazo);
    definirCelula(linhaItem[4], valorTexto(dados.quantidade));

    const linhasObs = filhosDiretos(tabelaObservacoes, "tr");
    const dataSantaMaria = filhosDiretos(primeiroFilho(linhasObs[5], "tc"), "p")[0];
    definirParagrafo(dataSantaMaria, `Santa Maria, ${formatarDataExtenso(new Date())}`);

    return new XMLSerializer().serializeToString(xmlDoc);
}

// Preenche o modelo oficial de formulario de cobranca do LABAC/LADOPAR (enviado pela secretaria),
// que tem uma tabela de item com colunas de preco (Valor unitario/Importancia) e nao possui
// sistema de tarefas: linha 2 = protocolo/data, linha 3 = proprietario/veterinario/paciente/crmv,
// linha 5 = item 01 (identificacao/servico/quantidade).
function preencherDocumentoLaboratorio(xml, dados) {
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

    const linhaProtocolo = filhosDiretos(primeiroFilho(linhas[2], "tc"), "p");
    preencherRotulo(linhaProtocolo[0], dados.protocolo);
    preencherRotulo(linhaProtocolo[1], formatarData(dados.dataRecebimento));

    const linhaDados = filhosDiretos(linhas[3], "tc");
    const dadosEsquerda = filhosDiretos(linhaDados[0], "p");
    preencherRotulo(dadosEsquerda[0], dados.proprietarioNome);
    preencherRotulo(dadosEsquerda[1], dados.veterinarioNome);
    preencherRotulo(dadosEsquerda[2], dados.paciente);
    const dadosDireita = filhosDiretos(linhaDados[1], "p");
    preencherRotulo(dadosDireita[0], dados.veterinarioCrmv);

    const linhaItem = filhosDiretos(linhas[5], "tc");
    definirCelula(linhaItem[1], dados.paciente);
    definirCelula(linhaItem[2], dados.servico);
    if (valorTexto(dados.quantidade)) definirCelula(linhaItem[4], valorTexto(dados.quantidade));

    const linhasObs = filhosDiretos(tabelaObservacoes, "tr");
    const dataSantaMaria = filhosDiretos(primeiroFilho(linhasObs[5], "tc"), "p")[0];
    definirParagrafo(dataSantaMaria, `Santa Maria, ${formatarDataExtenso(new Date())}`);

    return new XMLSerializer().serializeToString(xmlDoc);
}

const PREENCHEDORES = {
    sv: preencherDocumentoXml,
    labac: preencherDocumentoLaboratorio,
    ladopar: preencherDocumentoLaboratorio
};

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

async function gerarWordAPartirDoModelo(laboratorio, dados) {
    const templateUrl = TEMPLATES[laboratorio];
    if (!templateUrl) throw new Error(`Nao ha modelo de formulario de cobranca para "${laboratorio}".`);

    const JSZip = await carregarJsZip();
    const resposta = await fetch(templateUrl);
    if (!resposta.ok) throw new Error("Nao foi possivel carregar o modelo do formulario de cobranca.");

    const modelo = await resposta.arrayBuffer();
    const zip = await JSZip.loadAsync(modelo);
    const documentXml = await zip.file("word/document.xml").async("string");
    const headerXml = await zip.file("word/header2.xml").async("string");
    const footerXml = await zip.file("word/footer2.xml").async("string");
    const headerRels = await zip.file("word/_rels/header2.xml.rels").async("string");

    zip.file("word/document.xml", PREENCHEDORES[laboratorio](documentXml, dados));

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
    await baixarBlob(blob, `formulario-cobranca-${laboratorio}-${nomeArquivoSeguro(dados.protocolo)}.docx`);
}

// Gera o formulario de cobranca de uma tarefa do Mural/Historico (Setor de Virologia).
export async function gerarFormularioCobrancaWord(tarefa) {
    await gerarWordAPartirDoModelo("sv", normalizarDadosTarefa(tarefa));
}

// Gera o formulario de cobranca a partir dos dados preenchidos na ficha de um laboratorio
// (LABAC ou LADOPAR), que nao possuem sistema de tarefas proprio.
export async function gerarFormularioCobrancaFicha(laboratorio, dadosFicha) {
    const normalizador = NORMALIZADORES[laboratorio];
    if (!normalizador) throw new Error(`Laboratorio "${laboratorio}" nao suportado para formulario de cobranca.`);
    await gerarWordAPartirDoModelo(laboratorio, normalizador(dadosFicha));
}
