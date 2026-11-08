// Etapa 3 — consulta, PDF e impressão da ficha completa.
import { exigirLogin, mostrarAviso } from "./sv-comum.js";
import { htmlFicha, baixarPDF } from "./sv-impressao.js";
import { obterFicha } from "../../utils/svFichasDB.js";

const protocolo = new URLSearchParams(location.search).get('id');
const folha = document.getElementById('folha');
let ficha = null;

async function iniciar() {
    if (!protocolo || !(ficha = await obterFicha(protocolo))) {
        folha.innerHTML = '<p class="sv-vazio">Ficha não encontrada. <a href="sv-fichas.html">Voltar para a lista</a></p>';
        return;
    }
    document.title = `Ficha ${protocolo} - Setor de Virologia`;
    folha.innerHTML = htmlFicha(ficha);
    const id = encodeURIComponent(protocolo);
    document.getElementById('btn-editar').href = `sv-requisicao.html?id=${id}`;
    document.getElementById('btn-laudar').href = `sv-laudo.html?id=${id}`;
    if (new URLSearchParams(location.search).get('imprimir') === '1') setTimeout(() => window.print(), 400);
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
