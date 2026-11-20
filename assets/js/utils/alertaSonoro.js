let contextoAudio = null;
let habilitado = false;

function atualizarBotao(botao) {
  const icone = habilitado ? 'bi-volume-up-fill' : 'bi-volume-mute-fill';
  const rotulo = habilitado ? 'Desativar aviso sonoro' : 'Ativar aviso sonoro';
  botao.innerHTML = `<i class="bi ${icone}" aria-hidden="true"></i>`;
  botao.setAttribute('aria-label', rotulo);
  botao.title = rotulo;
  botao.setAttribute('aria-pressed', String(habilitado));
}

export function configurarControleSonoro(botao) {
  if (!botao) return;
  atualizarBotao(botao);

  botao.addEventListener('click', async () => {
    try {
      if (habilitado) {
        habilitado = false;
        atualizarBotao(botao);
        return;
      }

      const AudioContextDisponivel = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextDisponivel) throw new Error('Este navegador não oferece suporte a avisos sonoros.');
      contextoAudio ||= new AudioContextDisponivel();
      await contextoAudio.resume();
      habilitado = true;
      atualizarBotao(botao);
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
  if (contextoAudio.state === 'suspended') await contextoAudio.resume();

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
