import { exigirLogin, mostrarAviso, esc } from "./ficha/sv-comum.js";
import {
  marcarLaudoEnviado,
  observarLaudosAguardandoEnvio
} from "../utils/svFichasDB.js";
import { usuarioPodeAcessarSecretariaAtual } from "../utils/auditoria.js";
import { configurarControleSonoro, sinalizarLaudoNovo } from "../utils/alertaSonoro.js";

const $ = id => document.getElementById(id);
let fichas = [];
let cancelarObservacao = null;

function dataBR(valor) {
  if (!valor) return '—';
  const data = /^\d{4}-\d{2}-\d{2}$/.test(valor)
    ? new Date(`${valor}T12:00:00`)
    : valor?.toDate ? valor.toDate() : new Date(valor);
  return Number.isNaN(data.getTime()) ? '—' : data.toLocaleDateString('pt-BR');
}

function normalizar(valor) {
  return String(valor || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

function render() {
  const busca = normalizar($('secretaria-busca').value);
  const lista = fichas
    .filter(f => !busca || normalizar(`${f.protocolo} ${f.proprietario?.nome}`).includes(busca))
    .sort((a, b) => String(b.laudo?.dataEmissao || '').localeCompare(String(a.laudo?.dataEmissao || '')));

  $('secretaria-resumo').textContent = `${fichas.length} ${fichas.length === 1 ? 'laudo aguardando' : 'laudos aguardando'} envio ao cliente`;
  if (!lista.length) {
    $('secretaria-lista').innerHTML = `<p class="secretaria-mensagem">${fichas.length
      ? 'Nenhum laudo corresponde à busca.'
      : 'Não há laudos aguardando envio.'}</p>`;
    return;
  }

  $('secretaria-lista').innerHTML = lista.map(f => {
    const protocolo = esc(f.protocolo);
    const id = encodeURIComponent(f.protocolo);
    return `<article class="secretaria-cartao">
      <div>
        <span class="secretaria-alerta"><i class="bi bi-exclamation-circle-fill" aria-hidden="true"></i> AGUARDANDO ENVIO</span>
        <h2>Protocolo ${protocolo}</h2>
        <p><strong>Cliente:</strong> ${esc(f.proprietario?.nome || 'Não informado')}</p>
        <p><strong>Laudo emitido em:</strong> ${esc(dataBR(f.laudo?.dataEmissao))}</p>
      </div>
      <div class="secretaria-acoes">
        <a class="vu-btn" href="ficha/sv-visualizar.html?id=${id}"><i class="bi bi-file-earmark-text"></i> Abrir ficha</a>
        <button type="button" class="vu-btn vu-btn-enviado" data-marcar-enviado="${protocolo}">
          <i class="bi bi-send-check"></i> Marcar como enviado
        </button>
      </div>
    </article>`;
  }).join('');
}

async function marcarEnviado(evento) {
  const botao = evento.target.closest('[data-marcar-enviado]');
  if (!botao) return;
  const protocolo = botao.dataset.marcarEnviado;
  if (!confirm(`Confirmar que o laudo ${protocolo} foi enviado ao cliente?`)) return;

  botao.disabled = true;
  $('secretaria-lista').setAttribute('aria-busy', 'true');
  try {
    await marcarLaudoEnviado(protocolo);
    mostrarAviso(`Laudo ${protocolo} marcado como enviado.`);
  } catch (erro) {
    console.error('Não foi possível registrar o envio do laudo:', erro);
    mostrarAviso(`Não foi possível marcar o laudo como enviado: ${erro.message}`, 'erro');
    botao.disabled = false;
  } finally {
    $('secretaria-lista').removeAttribute('aria-busy');
  }
}

async function iniciar() {
  try {
    if (!await usuarioPodeAcessarSecretariaAtual()) {
      $('secretaria-resumo').textContent = 'Acesso restrito à Secretaria e aos administradores.';
      $('secretaria-lista').innerHTML = '<p class="secretaria-mensagem">Peça a um administrador para atribuir o perfil Secretaria.</p>';
      return;
    }

    cancelarObservacao = observarLaudosAguardandoEnvio(
      resultado => {
        fichas = resultado;
        render();
      },
      erro => {
        console.error('Não foi possível carregar os laudos para envio:', erro);
        $('secretaria-resumo').textContent = 'Não foi possível carregar os laudos.';
        $('secretaria-lista').innerHTML = `<p class="secretaria-mensagem">Erro ao carregar: ${esc(erro.message)}</p>`;
      },
      () => {
        sinalizarLaudoNovo().catch(erro => console.error('Falha ao emitir o aviso sonoro:', erro));
      }
    );
    $('controle-som-laudos').hidden = false;
  } catch (erro) {
    console.error('Não foi possível verificar o acesso à Secretaria:', erro);
    $('secretaria-resumo').textContent = 'Não foi possível verificar o acesso.';
    $('secretaria-lista').innerHTML = `<p class="secretaria-mensagem">Erro ao verificar o acesso: ${esc(erro.message)}</p>`;
  }
}

$('secretaria-busca').addEventListener('input', render);
$('secretaria-lista').addEventListener('click', marcarEnviado);
configurarControleSonoro($('controle-som-laudos'));
window.addEventListener('pagehide', () => cancelarObservacao?.());
exigirLogin(iniciar);
