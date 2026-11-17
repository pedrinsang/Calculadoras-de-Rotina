// Etapa 3 — consulta, PDF e impressão da ficha completa.
import { exigirLogin, mostrarAviso } from "./sv-comum.js";
import { htmlFicha, baixarPDF } from "./sv-impressao.js";
import { obterFicha } from "../../utils/svFichasDB.js";
import { observarTarefasDaFicha, fichaComResultadosDoMural } from "./sv-mural.js";

const protocolo = new URLSearchParams(location.search).get('id');
const folha = document.getElementById('folha');
let fichaSalva = null;
let ficha = null; // ficha com os resultados do Mural aplicados (o que é exibido/impresso)

async function iniciar() {
    if (!protocolo || !(fichaSalva = await obterFicha(protocolo))) {
        folha.innerHTML = '<p class="sv-vazio">Ficha não encontrada. <a href="sv-fichas.html">Voltar para a lista</a></p>';
        return;
    }
    document.title = `Ficha ${protocolo} - Setor de Virologia`;
    ficha = fichaSalva;
    folha.innerHTML = htmlFicha(ficha);
    // Resultados lançados no Mural aparecem na ficha em tempo real
    let primeiraLeitura = true;
    observarTarefasDaFicha(protocolo, tarefas => {
        ficha = fichaComResultadosDoMural(fichaSalva, tarefas);
        folha.innerHTML = htmlFicha(ficha);
        if (primeiraLeitura) {
            primeiraLeitura = false;
            if (new URLSearchParams(location.search).get('imprimir') === '1') setTimeout(() => window.print(), 400);
        }
    });
    const id = encodeURIComponent(protocolo);
    document.getElementById('btn-editar').href = `sv-requisicao.html?id=${id}`;
    document.getElementById('btn-laudar').href = `sv-laudo.html?id=${id}`;
}

document.getElementById('btn-imprimir').addEventListener('click', () => window.print());

document.getElementById('btn-pdf').addEventListener('click', async (e) => {
    if (!ficha) return;
    const btn = e.currentTarget;
    const original = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="bi bi-hourglass-split"></i> Gerando…';
    try {
        await baixarPDF(folha.querySelector('.ficha-sv'), ficha);
        mostrarAviso('PDF gerado.');
    } catch (err) {
        console.error(err);
        mostrarAviso('Erro ao gerar PDF: ' + (err?.message || err), 'erro');
    } finally {
        btn.disabled = false;
        btn.innerHTML = original;
    }
});

exigirLogin(iniciar);
