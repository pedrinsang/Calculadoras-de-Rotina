// Aviso sonoro de laudo novo (Início e Secretaria).
// A escolha de ligar/desligar fica salva neste navegador e vale depois de recarregar a página.
// O navegador só libera som depois de um clique ou tecla na página: ao recarregar com o aviso
// ligado, o som fica pronto e é liberado no primeiro toque em qualquer lugar da tela.
const CHAVE_PREFERENCIA = 'avisoSonoroLaudos';

let contextoAudio = null;
let habilitado = lerPreferencia();
const botoes = new Set();

function lerPreferencia() {
  try { return localStorage.getItem(CHAVE_PREFERENCIA) === '1'; } catch (_) { return false; }
}

function salvarPreferencia(valor) {
  try {
    if (valor) localStorage.setItem(CHAVE_PREFERENCIA, '1');
    else localStorage.removeItem(CHAVE_PREFERENCIA);
  } catch (_) { /* navegador sem armazenamento: vale só nesta página */ }
}

function obterContexto() {
  const AudioContextDisponivel = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextDisponivel) throw new Error('Este navegador não oferece suporte a avisos sonoros.');
  contextoAudio ||= new AudioContextDisponivel();
  return contextoAudio;
}

const somLiberado = () => contextoAudio?.state === 'running';

function atualizarBotao(botao) {
  const icone = habilitado ? 'bi-volume-up-fill' : 'bi-volume-mute-fill';
  const rotulo = !habilitado
    ? 'Ativar aviso sonoro'
    : somLiberado()
      ? 'Desativar aviso sonoro'
      : 'Aviso sonoro ligado: clique em qualquer lugar da página para liberar o som';
  botao.innerHTML = `<i class="bi ${icone}" aria-hidden="true"></i>`;
  botao.setAttribute('aria-label', rotulo);
  botao.title = rotulo;
  botao.setAttribute('aria-pressed', String(habilitado));
}

const atualizarBotoes = () => botoes.forEach(atualizarBotao);

// Com o aviso já ligado ao abrir a página, libera o som no primeiro clique ou tecla.
let esperandoToque = false;
function liberarNoPrimeiroToque() {
  if (esperandoToque) return;
  esperandoToque = true;
  const liberar = evento => {
    if (!habilitado || somLiberado()) return parar();
    // O clique no próprio botão de som é tratado pelo botão (libera e mantém ligado).
    if ([...botoes].some(b => b.contains(evento.target))) return;
    contextoAudio?.resume().then(() => { atualizarBotoes(); parar(); }).catch(() => {});
  };
  const parar = () => {
    esperandoToque = false;
    document.removeEventListener('pointerdown', liberar, true);
    document.removeEventListener('keydown', liberar, true);
  };
  document.addEventListener('pointerdown', liberar, true);
  document.addEventListener('keydown', liberar, true);
}

export function configurarControleSonoro(botao) {
  if (!botao || botoes.has(botao)) return;
  botoes.add(botao);

  if (habilitado) {
    try {
      obterContexto();
      liberarNoPrimeiroToque();
    } catch (erro) {
      habilitado = false;
      console.error('Não foi possível preparar o aviso sonoro:', erro);
    }
  }
  atualizarBotao(botao);

  botao.addEventListener('click', async () => {
    try {
      if (habilitado && somLiberado()) {
        habilitado = false;
        salvarPreferencia(false);
        atualizarBotoes();
        return;
      }

      await obterContexto().resume();
      habilitado = true;
      salvarPreferencia(true);
      atualizarBotoes();
      await sinalizarLaudoNovo();
    } catch (erro) {
      botao.title = erro.message;
      botao.setAttribute('aria-label', erro.message);
      console.error('Não foi possível ativar o aviso sonoro:', erro);
    }
  });
}

export async function sinalizarLaudoNovo() {
  if (!habilitado || !contextoAudio) return;
  // Sem um toque na página o navegador mantém o som bloqueado; nesse caso o aviso é pulado,
  // para não tocar atrasado quando alguém clicar.
  if (!somLiberado()) return;

  [740, 880].forEach((frequencia, indice) => {
    const inicio = contextoAudio.currentTime + indice * 0.22;
    const oscilador = contextoAudio.createOscillator();
    const volume = contextoAudio.createGain();
    oscilador.type = 'sine';
    oscilador.frequency.setValueAtTime(frequencia, inicio);
    volume.gain.setValueAtTime(0.0001, inicio);
    volume.gain.exponentialRampToValueAtTime(0.12, inicio + 0.025);
    volume.gain.exponentialRampToValueAtTime(0.0001, inicio + 0.17);
    oscilador.connect(volume);
    volume.connect(contextoAudio.destination);
    oscilador.start(inicio);
    oscilador.stop(inicio + 0.18);
  });
}
