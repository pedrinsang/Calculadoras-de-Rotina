// ============================================================================
// Arquivo anual do Histórico (só no painel de Administração)
//
// Regra: o app guarda 2 anos (o ano passado e o atual). Quando existir
// registro de um ano mais antigo, o admin:
//   1. baixa o Excel daquele ano (gerado no navegador, sem custo no Firebase);
//   2. só então pode excluir do app exatamente os registros que foram no Excel.
// Uma vez por ano. Substitui a antiga exclusão automática do Histórico.
// ============================================================================
import {
    collection, query, where, orderBy, limit, getDocs, getCountFromServer,
    writeBatch, Timestamp
} from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js";
import { db } from "../firebase.js";

const ANOS_GUARDADOS = 2;          // ano atual + ano passado
const LOTE_EXCLUSAO = 450;         // abaixo do limite de 500 por batch do Firestore
const SHEETJS = "https://cdn.sheetjs.com/xlsx-0.20.3/package/xlsx.mjs";

// Colunas que aparecem primeiro na planilha (o resto vem depois, em ordem alfabética)
const COLUNAS_PRINCIPAIS = [
    "id", "tipo", "subTipo", "alvo", "quantidade", "gramatura", "materialRecebido",
    "proprietario.nome", "proprietario.municipio", "proprietario.contato",
    "veterinario.nome", "veterinario.crmv", "veterinario.municipio", "veterinario.contato",
    "dataRecebimento", "dataPrazo", "dataConclusao", "siglaResponsavel", "observacoes", "resultados"
];

const escapar = (t) => String(t ?? "").replace(/[&<>"']/g, c => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const numero = (n) => n.toLocaleString("pt-BR");

// Data do Firestore -> "dd/mm/aaaa hh:mm"
function formatarValor(v) {
    if (v && typeof v.toDate === "function") {
        const d = v.toDate();
        return d.toLocaleDateString("pt-BR") + " " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    }
    if (v instanceof Date) return v.toLocaleDateString("pt-BR");
    if (Array.isArray(v) || (v && typeof v === "object")) return JSON.stringify(v);
    return v ?? "";
}

// { proprietario: { nome } } -> { "proprietario.nome": ... }; "resultados" fica inteiro (texto JSON)
function achatar(obj, prefixo = "", saida = {}) {
    for (const [chave, valor] of Object.entries(obj)) {
        const nome = prefixo ? `${prefixo}.${chave}` : chave;
        const ehObjetoSimples = valor && typeof valor === "object" && !Array.isArray(valor)
            && typeof valor.toDate !== "function";
        if (ehObjetoSimples && nome !== "resultados" && prefixo === "") {
            achatar(valor, nome, saida);
        } else {
            saida[nome] = formatarValor(valor);
        }
    }
    return saida;
}

function intervaloDoAno(ano) {
    return [Timestamp.fromDate(new Date(ano, 0, 1)), Timestamp.fromDate(new Date(ano + 1, 0, 1))];
}

function consultaDoAno(ano) {
    const [inicio, fim] = intervaloDoAno(ano);
    return query(
        collection(db, "historico"),
        where("dataConclusao", ">=", inicio),
        where("dataConclusao", "<", fim),
        orderBy("dataConclusao", "asc")
    );
}

// Ano mais antigo com registro (lê 1 documento só)
async function anoMaisAntigo() {
    const snap = await getDocs(query(collection(db, "historico"), orderBy("dataConclusao", "asc"), limit(1)));
    if (snap.empty) return null;
    const data = snap.docs[0].data().dataConclusao;
    return data?.toDate ? data.toDate().getFullYear() : null;
}

export async function iniciarArquivoHistorico(container) {
    if (!container) return;

    // Estado da tela: documentos exportados ficam guardados para a exclusão usar exatamente os mesmos
    let docsExportados = null;
    let anoAlvo = null;

    const pintar = (html) => { container.innerHTML = html; };

    async function verificar() {
        docsExportados = null;
        pintar(`<p class="text-muted mb-0"><span class="spinner-border spinner-border-sm me-2"></span>Verificando o Histórico…</p>`);
        try {
            const anoAtual = new Date().getFullYear();
            const primeiroAnoGuardado = anoAtual - (ANOS_GUARDADOS - 1);
            const antigo = await anoMaisAntigo();

            if (antigo === null || antigo >= primeiroAnoGuardado) {
                pintar(`
                  <div class="arquivo-status arquivo-ok">
                    <i class="bi bi-check2-circle"></i>
                    <div>
                      <strong>Nada para arquivar agora.</strong>
                      <p>O app guarda ${primeiroAnoGuardado} e ${anoAtual}. Em janeiro de ${anoAtual + 1}
                      aparecerá aqui a opção de arquivar ${primeiroAnoGuardado}.</p>
                    </div>
                  </div>`);
                return;
            }

            anoAlvo = antigo;
            const total = (await getCountFromServer(consultaDoAno(anoAlvo))).data().count;
            const nomeArquivo = `historico-${anoAlvo}.xlsx`;

            pintar(`
              <div class="arquivo-status arquivo-pendente">
                <i class="bi bi-archive"></i>
                <div>
                  <strong>${numero(total)} ${total === 1 ? "registro" : "registros"} de ${anoAlvo} para arquivar.</strong>
                  <p>O app guarda só ${primeiroAnoGuardado} e ${anoAtual}. Baixe a planilha de ${anoAlvo}
                  e depois exclua esses registros do app.</p>
                </div>
              </div>
              <ol class="arquivo-passos">
                <li>
                  <button type="button" class="btn btn-success" id="arquivo-baixar">
                    <i class="bi bi-file-earmark-excel me-1"></i>Baixar Excel de ${anoAlvo}
                  </button>
                  <small id="arquivo-baixar-info">Salva <code>${nomeArquivo}</code> neste computador.</small>
                </li>
                <li>
                  <button type="button" class="btn btn-outline-danger" id="arquivo-excluir" disabled>
                    <i class="bi bi-trash3 me-1"></i>Excluir registros de ${anoAlvo}
                  </button>
                  <small>Libera depois que a planilha for baixada.</small>
                </li>
              </ol>`);

            container.querySelector("#arquivo-baixar").addEventListener("click", baixar);
            container.querySelector("#arquivo-excluir").addEventListener("click", excluir);
        } catch (erro) {
            console.error("Arquivo do Histórico:", erro);
            pintar(`<div class="alert alert-warning mb-0">Não foi possível verificar o Histórico: ${escapar(erro.message)}</div>`);
        }
    }

    async function baixar() {
        const botao = container.querySelector("#arquivo-baixar");
        const info = container.querySelector("#arquivo-baixar-info");
        botao.disabled = true;
        botao.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>Gerando planilha…`;
        try {
            const [snap, XLSX] = await Promise.all([getDocs(consultaDoAno(anoAlvo)), import(SHEETJS)]);
            if (snap.empty) throw new Error(`Nenhum registro de ${anoAlvo} encontrado.`);

            const linhas = snap.docs.map(d => ({ docId: d.id, ...achatar(d.data()) }));
            const todas = new Set(linhas.flatMap(l => Object.keys(l)));
            const colunas = ["docId", ...COLUNAS_PRINCIPAIS.filter(c => todas.has(c)),
                ...[...todas].filter(c => c !== "docId" && !COLUNAS_PRINCIPAIS.includes(c)).sort()];

            const planilha = XLSX.utils.json_to_sheet(linhas, { header: colunas });
            const livro = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(livro, planilha, `Histórico ${anoAlvo}`);
            XLSX.writeFile(livro, `historico-${anoAlvo}.xlsx`);

            // Guarda exatamente estes documentos para a exclusão
            docsExportados = snap.docs.map(d => d.ref);
            botao.innerHTML = `<i class="bi bi-check2 me-1"></i>Planilha baixada (${numero(docsExportados.length)} registros)`;
            botao.classList.replace("btn-success", "btn-outline-success");
            info.innerHTML = `Confira se <code>historico-${anoAlvo}.xlsx</code> está na pasta de downloads antes de excluir.`;
            container.querySelector("#arquivo-excluir").disabled = false;
        } catch (erro) {
            console.error("Erro ao gerar a planilha:", erro);
            botao.disabled = false;
            botao.innerHTML = `<i class="bi bi-file-earmark-excel me-1"></i>Tentar baixar de novo`;
            info.innerHTML = `<span class="text-danger">Não foi possível gerar a planilha: ${escapar(erro.message)}. Nada foi excluído.</span>`;
        }
    }

    async function excluir() {
        if (!docsExportados?.length) return;
        const n = docsExportados.length;
        const ok = confirm(
            `Excluir ${numero(n)} registros de ${anoAlvo} do Histórico?\n\n` +
            `Eles estão na planilha historico-${anoAlvo}.xlsx que você baixou. ` +
            `Depois de excluídos, só existirão nessa planilha.`
        );
        if (!ok) return;

        const botao = container.querySelector("#arquivo-excluir");
        botao.disabled = true;
        try {
            for (let i = 0; i < n; i += LOTE_EXCLUSAO) {
                const batch = writeBatch(db);
                docsExportados.slice(i, i + LOTE_EXCLUSAO).forEach(ref => batch.delete(ref));
                await batch.commit();
                botao.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>Excluindo… ${numero(Math.min(i + LOTE_EXCLUSAO, n))} de ${numero(n)}`;
            }
            pintar(`
              <div class="arquivo-status arquivo-ok">
                <i class="bi bi-check2-circle"></i>
                <div>
                  <strong>${numero(n)} registros de ${anoAlvo} arquivados.</strong>
                  <p>Guarde a planilha <code>historico-${anoAlvo}.xlsx</code> em um lugar seguro.</p>
                </div>
              </div>`);
            setTimeout(verificar, 4000);
        } catch (erro) {
            console.error("Erro ao excluir registros arquivados:", erro);
            botao.disabled = false;
            botao.innerHTML = `<i class="bi bi-trash3 me-1"></i>Tentar excluir de novo`;
            alert(`A exclusão parou no meio: ${erro.message}\nOs registros já excluídos estão na planilha; tente de novo para terminar.`);
        }
    }

    await verificar();
}
