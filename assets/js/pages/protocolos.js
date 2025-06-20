document.addEventListener('DOMContentLoaded', function () {
  console.log("Desenvolvido por Pedro Ruiz Sangoi e Alexandre Werle Suares, com auxílio do DeepSeek Chat.");
  
  // Carregar todos os protocolos inicialmente
  carregarProtocolos();

  // Busca ao digitar
  document.getElementById("search-input").addEventListener("input", (e) => {
    const categoria = document.getElementById("filter-category").value;
    carregarProtocolos(e.target.value, categoria);
  });

  // Filtro por categoria
  document.getElementById("filter-category").addEventListener("change", (e) => {
    const busca = document.getElementById("search-input").value;
    carregarProtocolos(busca, e.target.value);
  });

  // Navegação
  document.getElementById("hub-button").addEventListener("click", () => {
    window.location.href = "hub.html";
  });

  document.getElementById("mural-button").addEventListener("click", () => {
    window.location.href = "mural.html";
  });

  // Força o recálculo do layout e corrige altura do body na entrada
  document.body.style.height = window.innerHeight + 'px';
  window.scrollTo(0, 0); // Garante que a página comece no topo
});

// Ajuste de altura ao redimensionar
window.addEventListener('resize', function() {
  document.body.style.height = window.innerHeight + 'px';
});

// Funções de UI
function mostrarLoading() {
  document.getElementById("loading").style.display = "flex";
}

function esconderLoading() {
  document.getElementById("loading").style.display = "none";
}

function mostrarFeedback(mensagem, tipo = "success") {
  const feedback = document.createElement("div");
  feedback.className = `feedback ${tipo}`;
  feedback.innerHTML = `
    <i class="${tipo === 'success' ? 'bi bi-check-circle' : 'bi bi-exclamation-circle'} me-2"></i>
    ${mensagem}
  `;
  document.body.appendChild(feedback);

  setTimeout(() => {
    feedback.remove();
  }, 3000);
}

function carregarProtocolos(filtro = '', categoria = 'todos') {
  mostrarLoading();
  const protocolosList = document.getElementById("protocolos-list");

  try {
    // Filtrar protocolos
    let protocolosFiltrados = protocolos.filter(protocolo => {
      const buscaMatch = protocolo.titulo.toLowerCase().includes(filtro.toLowerCase()) ||
        protocolo.descricao.toLowerCase().includes(filtro.toLowerCase()) ||
        protocolo.tags.some(tag => tag.toLowerCase().includes(filtro.toLowerCase()));

      const categoriaMatch = categoria === 'todos' || protocolo.categoria === categoria;

      return buscaMatch && categoriaMatch;
    });

    if (protocolosFiltrados.length === 0) {
      protocolosList.innerHTML = `
        <div class="alert alert-info text-center" role="alert">
          <i class="bi bi-info-circle me-2"></i>
          Nenhum protocolo encontrado com os critérios de busca.
        </div>`;
      return;
    }

    // Ordenar por título
    protocolosFiltrados.sort((a, b) => a.titulo.localeCompare(b.titulo));

    // Renderizar protocolos
    protocolosList.innerHTML = '';
    protocolosFiltrados.forEach(protocolo => {
      const protocoloItem = document.createElement("div");
      protocoloItem.className = "protocolo-item";

      protocoloItem.innerHTML = `
        <div class="protocolo-header">
          <h5 class="mb-0 text-success fw-bold">
            ${protocolo.titulo} <span class="protocolo-id">(${protocolo.id})</span>
          </h5>
          <div class="protocolo-actions">
            <button class="btn btn-success btn-sm rounded-pill px-3" onclick="abrirProtocolo('${protocolo.arquivo}')">
              <i class="bi bi-file-earmark-text me-1"></i>Visualizar
            </button>
          </div>
        </div>
        <p class="mt-2 mb-1 text-muted">${protocolo.descricao}</p>
        <div class="protocolo-tags">
          ${protocolo.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
        </div>
      `;

      protocolosList.appendChild(protocoloItem);
    });
  } catch (error) {
    console.error("Erro ao carregar protocolos:", error);
    protocolosList.innerHTML = `
      <div class="alert alert-danger text-center" role="alert">
        <i class="bi bi-exclamation-triangle me-2"></i>
        Erro ao carregar protocolos: ${error.message}
      </div>
    `;
  } finally {
    esconderLoading();
  }
}

function abrirProtocolo(arquivo) {
  // Abrir em uma nova aba
  window.open(arquivo, '_blank');
}

// Tornar funções acessíveis globalmente
window.mostrarLoading = mostrarLoading;
window.esconderLoading = esconderLoading;
window.mostrarFeedback = mostrarFeedback;
window.carregarProtocolos = carregarProtocolos;
window.abrirProtocolo = abrirProtocolo;

// Dados dos protocolos
const protocolos = [
   {
        id: 'PROT-001',
        titulo: 'Meios de Cultivo Celular',
        descricao: 'Preparação de meios de cultura celular para manutenção de culturas.',
        categoria: 'cultivo-celular',
        tags: ['meios', 'antibióticos', 'antifúngicos', 'MEM', 'RPMI'],
        arquivo: '../assets/protocolos/Meios de Cultivo.pdf'
      },
      {
        id: 'PROT-002',
        titulo: 'Cultivo Celular Primário',
        descricao: 'Culturas celulares primárias a partir de tecidos animais.',
        categoria: 'cultivo-celular',
        tags: ['células', 'primário', 'cultivo'],
        arquivo: '../assets/protocolos/Cultivo Celular Primário.pdf'
      },
      {
        id: 'PROT-003',
        titulo: 'Manutenção de Células',
        descricao: 'Procedimentos para manutenção de células.',
        categoria: 'cultivo-celular',
        tags: ['manutenção', 'células', 'cultivo'],
        arquivo: '../assets/protocolos/Manutencao-Congelamento-Descongelamento de Células.pdf'
      },
      {
        id: 'PROT-004',
        titulo: 'Congelamento de Células',
        descricao: 'Criopreservação de culturas celulares.',
        categoria: 'cultivo-celular',
        tags: ['criopreservação', 'células', 'nitrogênio'],
        arquivo: '../assets/protocolos/Manutencao-Congelamento-Descongelamento de Células.pdf'
      },
      {
        id: 'PROT-005',
        titulo: 'Descongelamento de Células',
        descricao: 'Recuperação de culturas celulares a partir de estoques congelados.',
        categoria: 'cultivo-celular',
        tags: ['reativação', 'células', 'cultivo'],
        arquivo: '../assets/protocolos/Manutencao-Congelamento-Descongelamento de Células.pdf'
      },
      {
        id: 'PROT-006',
        titulo: 'Contagem Celular',
        descricao: 'Método para quantificação de células em suspensão.',
        categoria: 'cultivo-celular',
        tags: ['hemocitômetro', 'concentração', 'células'],
        arquivo: '../assets/protocolos/Contagem Celular.pdf'
      },
      {
        id: 'PROT-007',
        titulo: 'Determinação da Viabilidade Celular (Azul de Tripan)',
        descricao: 'Avaliação da viabilidade celular através do método de exclusão por corante Azul de Tripan.',
        categoria: 'cultivo-celular',
        tags: ['viabilidade', 'azul de tripan', 'células'],
        arquivo: '../assets/protocolos/Determinacao da viabilidade celular.pdf'
      },
      {
        id: 'PROT-008',
        titulo: 'MTT',
        descricao: 'Ensaio colorimétrico para avaliação de viabilidade e proliferação celular baseado na redução do sal de tetrazólio.',
        categoria: 'cultivo-celular',
        tags: ['ensaios', 'viabilidade', 'colorimétrico'],
        arquivo: '../assets/protocolos/MTT.pdf'
      },
      {
        id: 'PROT-009',
        titulo: 'Inoculação em Ovo Embrionado',
        descricao: 'Técnicas de inoculação viral em diferentes compartimentos de ovos embrionados (cório-alantóide, alantóide e gema).',
        categoria: 'virologia',
        tags: ['ovo', 'embrião', 'inoculação'],
        arquivo: '../assets/protocolos/Inoculacao em ovo embrionado.pdf'
      },
      {
        id: 'PROT-010',
        titulo: 'Preparação de Crostas para Microscopia Eletrônica',
        descricao: 'Processamento de amostras de crostas para visualização de partículas virais em microscopia eletrônica.',
        categoria: 'microscopia',
        tags: ['ME', 'preparação', 'amostras'],
        arquivo: '../assets/protocolos/Preparação de crostas para microscopia eletrônica.pdf'
      },
      {
        id: 'PROT-011',
        titulo: 'Preparação de Fezes para Microscopia Eletrônica',
        descricao: 'Processamento de amostras fecais para detecção de partículas virais em microscopia eletrônica.',
        categoria: 'microscopia',
        tags: ['fezes', 'ME', 'diagnóstico'],
        arquivo: '../assets/protocolos/Preparação de crostas para microscopia eletrônica.pdf'
      },
      {
        id: 'PROT-012',
        titulo: 'Separação da Capa Flogística',
        descricao: 'Método para separação da capa flogística (camada leucocitária) de amostras sanguíneas para isolamento viral.',
        categoria: 'virologia',
        tags: ['capa flogística', 'separação', 'amostras'],
        arquivo: '../assets/protocolos/Separação da capa flogística.pdf'
      },
      {
        id: 'PROT-013',
        titulo: 'Isolamento Viral em Cultivo Celular',
        descricao: 'Procedimento para isolamento de vírus a partir de amostras clínicas utilizando culturas celulares sensíveis.',
        categoria: 'virologia',
        tags: ['isolamento', 'vírus', 'cultivo'],
        arquivo: '../assets/protocolos/Isolamento e amplificacao viral.pdf'
      },
      {
        id: 'PROT-014',
        titulo: 'Amplificação Viral (Estoque)',
        descricao: 'Protocolo para amplificação de estoques virais em culturas celulares para obtenção de altos títulos virais.',
        categoria: 'virologia',
        tags: ['amplificação', 'estoque', 'vírus'],
        arquivo: '../assets/protocolos/Isolamento e amplificacao viral.pdf'
      },
      {
        id: 'PROT-015',
        titulo: 'Inativação Viral com BEI',
        descricao: 'Método de inativação viral utilizando Etilenamina Binária (BEI) para produção de antígenos inativados.',
        categoria: 'virologia',
        tags: ['inativação', 'BEI', 'segurança'],
        arquivo: '../assets/protocolos/Inativação viral com BEI (Etilenamina Binária).pdf'
      },
      {
        id: 'PROT-016',
        titulo: 'Ultracentrifugação de Vírus',
        descricao: 'Purificação de partículas virais através de ultracentrifugação em gradiente de sacarose.',
        categoria: 'virologia',
        tags: ['ultracentrifugação', 'purificação', 'vírus'],
        arquivo: '../assets/protocolos/Ultracentrifugação de vírus.pdf'
      },
      {
        id: 'PROT-017',
        titulo: 'Clonagem de Vírus por Ensaio de Placa',
        descricao: 'Método para clonagem viral através de plaqueamento em monocamadas celulares e isolamento de placas individuais.',
        categoria: 'virologia',
        tags: ['clonagem', 'placa', 'vírus'],
        arquivo: '../assets/protocolos/Clonagem de vírus por ensaio de placa.pdf'
      },
      {
        id: 'PROT-018',
        titulo: 'Titulação Viral em Microplacas',
        descricao: 'Determinação do título viral pelo método TCID50 (Dose Infectante para 50% das Culturas de Tecidos) em microplacas de 96 poços.',
        categoria: 'virologia',
        tags: ['titulação', 'TCID50', 'microplacas'],
        arquivo: '../assets/protocolos/Titulação viral em microplacas de 96 cavidades.pdf'
      },
      {
        id: 'PROT-019',
        titulo: 'Titulação Viral por PFU',
        descricao: 'Determinação do título viral em Unidades Formadoras de Placa (PFU) através de ensaios de plaqueamento em monocamadas celulares.',
        categoria: 'virologia',
        tags: ['PFU', 'titulação', 'placa'],
        arquivo: '../assets/protocolos/Titulação viral por PFU.pdf'
      },
      {
        id: 'PROT-020',
        titulo: 'Liofilização',
        descricao: 'Processo de desidratação de amostras biológicas para preservação a longo prazo através de congelamento e sublimação.',
        categoria: 'virologia',
        tags: ['liofilização', 'preservação', 'amostras'],
        arquivo: '../assets/protocolos/Liofilização.pdf'
      },
      {
        id: 'PROT-021',
        titulo: 'Imunoperoxidase em Cultivo Celular',
        descricao: 'Técnica de detecção de antígenos virais em culturas celulares utilizando o sistema peroxidase-antiperoxidase.',
        categoria: 'imunologia',
        tags: ['imunoperoxidase', 'células', 'marcação'],
        arquivo: '../assets/protocolos/Imunoperoxidase em cultivo celular.pdf'
      },
      {
        id: 'PROT-022',
        titulo: 'Preparação de Lâminas para Imunofluorescência',
        descricao: 'Preparação de controles positivos e negativos para ensaios de imunofluorescência em culturas celulares.',
        categoria: 'imunologia',
        tags: ['lâminas', 'controle', 'imunofluorescência'],
        arquivo: '../assets/protocolos/Imunofluorescência (IFA).pdf'
      },
      {
        id: 'PROT-023',
        titulo: 'Imunofluorescência (IFA)',
        descricao: 'Método para detecção de antígenos virais ou anticorpos específicos utilizando anticorpos conjugados com fluoróforos.',
        categoria: 'imunologia',
        tags: ['IFA', 'anticorpos', 'fluorescência'],
        arquivo: '../assets/protocolos/Imunofluorescência (IFA).pdf'
      },
      {
        id: 'PROT-024',
        titulo: 'Processamento de Tecidos para Imuno-histoquímica',
        descricao: 'Protocolo para fixação, inclusão em parafina e corte de tecidos para análise por imuno-histoquímica.',
        categoria: 'imunologia',
        tags: ['tecido', 'fixação', 'processamento'],
        arquivo: '../assets/protocolos/Imuno-histoquímica.pdf'
      },
      {
        id: 'PROT-025',
        titulo: 'Imuno-histoquímica',
        descricao: 'Técnica para detecção de antígenos em cortes de tecidos utilizando anticorpos específicos e sistemas de detecção enzimáticos.',
        categoria: 'imunologia',
        tags: ['IHC', 'tecido', 'marcação'],
        arquivo: '../assets/protocolos/Imuno-histoquímica.pdf'
      },
      {
        id: 'PROT-026',
        titulo: 'Separação de Soro e Inativação do Complemento',
        descricao: 'Obtenção de soro a partir de sangue total e inativação do sistema complementar por tratamento térmico.',
        categoria: 'imunologia',
        tags: ['soro', 'complemento', 'inativação'],
        arquivo: '../assets/protocolos/Separação de soro e inativação do complemento.pdf'
      },
      {
        id: 'PROT-027',
        titulo: 'Coagulação por Glutaraldeído',
        descricao: 'Método para coagulação de proteínas séricas utilizando glutaraldeído para ensaios imunológicos.',
        categoria: 'imunologia',
        tags: ['glutaraldeído', 'coagulação', 'soro'],
        arquivo: '../assets/protocolos/Coagulação por glutaraldeído.pdf'
      },
      {
        id: 'PROT-028',
        titulo: 'Turvação por Sulfato de Zinco',
        descricao: 'Técnica de precipitação de proteínas séricas utilizando sulfato de zinco para ensaios imunológicos.',
        categoria: 'imunologia',
        tags: ['sulfato de zinco', 'turvação', 'soro'],
        arquivo: '../assets/protocolos/Turvação por sulfato de zinco.pdf'
      },
      {
        id: 'PROT-029',
        titulo: 'Determinação de Imunoglobulinas no Colostro',
        descricao: 'Método para quantificação de imunoglobulinas em amostras de colostro animal.',
        categoria: 'imunologia',
        tags: ['imunoglobulinas', 'colostro', 'anticorpos'],
        arquivo: '../assets/protocolos/Determinação de imunoglobulinas no colostro.pdf'
      },
      {
        id: 'PROT-030',
        titulo: 'Hemaglutinação para Vírus da Influenza Equina',
        descricao: 'Ensaios de hemaglutinação e inibição da hemaglutinação para detecção e titulação do vírus da influenza equina.',
        categoria: 'hemaglutinacao',
        tags: ['influenza', 'equino', 'hemaglutinação'],
        arquivo: '../assets/protocolos/Hemaglutinação e sua inibição para o vírus da influenza equina.pdf'
      },
      {
        id: 'PROT-031',
        titulo: 'Hemaglutinação para Parvovírus',
        descricao: 'Ensaios de hemaglutinação e inibição da hemaglutinação para detecção de parvovírus suíno.',
        categoria: 'hemaglutinacao',
        tags: ['parvovírus', 'hemaglutinação'],
        arquivo: '../assets/protocolos/Hemaglutinação e sua inibicao para o parvovírus suíno.pdf'
      },
      {
        id: 'PROT-034',
        titulo: 'Soroneutralização para BVDV',
        descricao: 'Ensaios de soroneutralização para detecção de anticorpos contra o Vírus da Diarreia Viral Bovina (BVDV).',
        categoria: 'soroneutralizacao',
        tags: ['BVDV', 'soroneutralização', 'vírus'],
        arquivo: '../assets/protocolos/Soroneutralizacao.pdf'
      },
      {
        id: 'PROT-035',
        titulo: 'Soroneutralização para Herpesvírus Bovino',
        descricao: 'Ensaios de soroneutralização para detecção de anticorpos contra herpesvírus bovino tipos 1 e 5.',
        categoria: 'soroneutralizacao',
        tags: ['herpesvírus', 'bovino', 'soroneutralização'],
        arquivo: '../assets/protocolos/Soroneutralizacao.pdf'
      },
      {
        id: 'PROT-036',
        titulo: 'Soroneutralização para Herpesvírus Equino',
        descricao: 'Ensaios de soroneutralização para detecção de anticorpos contra herpesvírus equino (EHV).',
        categoria: 'soroneutralizacao',
        tags: ['herpesvírus', 'equino', 'soroneutralização'],
        arquivo: '../assets/protocolos/Soroneutralizacao.pdf'
      },
      {
        id: 'PROT-037',
        titulo: 'Soroneutralização para Cinomose',
        descricao: 'Ensaios de soroneutralização para detecção de anticorpos contra o vírus da cinomose canina.',
        categoria: 'soroneutralizacao',
        tags: ['cinomose', 'canino', 'soroneutralização'],
        arquivo: '../assets/protocolos/Soroneutralizacao.pdf'
      },
      {
        id: 'PROT-038',
        titulo: 'Imunodifusão em Gel de Ágar para Leucose Bovina',
        descricao: 'Ensaios de imunodifusão em gel de ágar para detecção de antígenos ou anticorpos contra o vírus da leucose bovina.',
        categoria: 'imunologia',
        tags: ['leucose', 'imunodifusão', 'bovino'],
        arquivo: '../assets/protocolos/Imunodifusão.pdf'
      },
      {
        id: 'PROT-039',
        titulo: 'Imunodifusão em Gel de Ágar para Língua Azul',
        descricao: 'Ensaios de imunodifusão em gel de ágar para detecção de antígenos ou anticorpos contra o vírus da língua azul.',
        categoria: 'imunologia',
        tags: ['língua azul', 'imunodifusão', 'bovino'],
        arquivo: '../assets/protocolos/Imunodifusão.pdf'
      },
      {
        id: 'PROT-040',
        titulo: 'Vacina contra Papilomatose',
        descricao: 'Preparação de vacina autógena contra papilomatose para bovinos, equinos e caninos a partir de tecido tumoral.',
        categoria: 'virologia',
        tags: ['papilomatose', 'vacina', 'bovino'],
        arquivo: '../assets/protocolos/Vacinas papilomatose.pdf'
      },
      {
        id: 'PROT-041',
        titulo: 'Diagnóstico de Raiva',
        descricao: 'Métodos para diagnóstico de raiva incluindo imunofluorescência direta e prova biológica em camundongos.',
        categoria: 'virologia',
        tags: ['raiva', 'diagnóstico', 'imunofluorescência'],
        arquivo: '../assets/protocolos/Diagnóstico de raiva.pdf'
      },
      {
        id: 'PROT-042',
        titulo: 'Extração de DNA (DNAzol)',
        descricao: 'Método rápido para extração de DNA genômico utilizando o reagente DNAzol.',
        categoria: 'molecular',
        tags: ['DNA', 'extração', 'DNAzol'],
        arquivo: '../assets/protocolos/Extracao de DNA.pdf'
      },
      {
        id: 'PROT-043',
        titulo: 'Extração de DNA com Fenol/Clorofórmio',
        descricao: 'Método tradicional para extração de DNA utilizando fenol e clorofórmio para purificação.',
        categoria: 'molecular',
        tags: ['DNA', 'fenol', 'clorofórmio'],
        arquivo: '../assets/protocolos/Extracao de DNA.pdf'
      },
      {
        id: 'PROT-044',
        titulo: 'Precipitação de DNA por Etanol',
        descricao: 'Protocolo para precipitação e recuperação de DNA utilizando etanol absoluto e acetato de sódio.',
        categoria: 'molecular',
        tags: ['DNA', 'precipitação', 'etanol'],
        arquivo: '../assets/protocolos/Precipitação de DNA por Etanol.pdf'
      },
      {
        id: 'PROT-045',
        titulo: 'Extração de DNA de Plasmídeo (Microprep)',
        descricao: 'Método rápido para extração de DNA plasmidial diretamente de colônias bacterianas.',
        categoria: 'molecular',
        tags: ['plasmídeo', 'microprep', 'DNA'],
        arquivo: '../assets/protocolos/Extração de DNA de plasmídeo.pdf'
      },
      {
        id: 'PROT-046',
        titulo: 'Extração de Plasmídeo (Microprep de Cultura)',
        descricao: 'Método rápido para extração de DNA plasmidial a partir de pequenos volumes de cultura bacteriana.',
        categoria: 'molecular',
        tags: ['plasmídeo', 'microprep', 'cultura'],
        arquivo: '../assets/protocolos/Extração de plasmídeo (Microprep. de 50μL de cultura).pdf'
      },
      {
        id: 'PROT-047',
        titulo: 'Extração de DNA Plasmidial (Miniprep)',
        descricao: 'Protocolo padrão para extração de DNA plasmidial em pequena escala utilizando colunas de sílica.',
        categoria: 'molecular',
        tags: ['plasmídeo', 'miniprep', 'DNA'],
        arquivo: '../assets/protocolos/Extração de DNA plasmidial (Miniprep).pdf'
      },
      {
        id: 'PROT-048',
        titulo: 'Extração de DNA Plasmidial (Midiprep)',
        descricao: 'Protocolo para extração de DNA plasmidial em média escala para obtenção de maiores quantidades de plasmídeo.',
        categoria: 'molecular',
        tags: ['plasmídeo', 'midiprep', 'DNA'],
        arquivo: '../assets/protocolos/Extração de DNA plasmidial (Midiprep).pdf'
      },
      {
        id: 'PROT-049',
        titulo: 'Extração de DNA Viral',
        descricao: 'Métodos para extração de DNA viral a partir de amostras clínicas ou culturas virais.',
        categoria: 'molecular',
        tags: ['DNA', 'viral', 'extração'],
        arquivo: '../assets/protocolos/Extração de DNA viral.pdf'
      },
      {
        id: 'PROT-050',
        titulo: 'Cuidados para Trabalhar com RNA',
        descricao: 'Boas práticas para manipulação de RNA visando evitar degradação por RNases ambientais.',
        categoria: 'molecular',
        tags: ['RNA', 'contaminação', 'RNase'],
        arquivo: '../assets/protocolos/Cuidados necessários para se trabalhar com RNA.pdf'
      },
      {
        id: 'PROT-051',
        titulo: 'Extração de RNA (Trizol)',
        descricao: 'Método para extração de RNA total utilizando o reagente Trizol (fenol-guanidinio).',
        categoria: 'molecular',
        tags: ['RNA', 'extração', 'Trizol'],
        arquivo: '../assets/protocolos/Extração de RNA (Trizol).pdf'
      },
      {
        id: 'PROT-052',
        titulo: 'Preparação de Bactérias Competentes',
        descricao: 'Protocolo para preparação de células bacterianas competentes para transformação por choque térmico.',
        categoria: 'molecular',
        tags: ['bactérias', 'competentes', 'transformação'],
        arquivo: '../assets/protocolos/Preparação de bactérias competentes.pdf'
      },
      {
        id: 'PROT-053',
        titulo: 'Transformação Rápida de Bactérias',
        descricao: 'Método rápido para transformação de bactérias competentes com DNA plasmidial.',
        categoria: 'molecular',
        tags: ['transformação', 'bactérias', 'plasmídeo'],
        arquivo: '../assets/protocolos/Transformação rápida de bactérias com plasmídeo.pdf'
      },
      {
        id: 'PROT-054',
        titulo: 'Transfecção de DNA por Eletroporação',
        descricao: 'Método para introdução de DNA em células eucarióticas utilizando pulsos elétricos de alta voltagem.',
        categoria: 'molecular',
        tags: ['eletroporação', 'transfecção', 'DNA'],
        arquivo: '../assets/protocolos/Transfecção de DNA por eletroporação.pdf'
      },
      {
        id: 'PROT-055',
        titulo: 'Digestão de DNA com Endonucleases',
        descricao: 'Protocolo para digestão de DNA com enzimas de restrição para análise ou clonagem molecular.',
        categoria: 'molecular',
        tags: ['restrição', 'enzimas', 'digestão'],
        arquivo: '../assets/protocolos/Digestão de DNA com endonuclease.pdf'
      },
      {
        id: 'PROT-056',
        titulo: 'Dosagem de Proteína - Coomassie Blue',
        descricao: 'Método colorimétrico para quantificação de proteínas utilizando o corante Coomassie Brilliant Blue.',
        categoria: 'molecular',
        tags: ['proteína', 'dosagem', 'colorimétrico'],
        arquivo: '../assets/protocolos/Dosagem de proteína – Coomassie blue.pdf'
      },
      {
        id: 'PROT-057',
        titulo: 'Reação em Cadeia da Polimerase (PCR)',
        descricao: 'Protocolo padrão para amplificação de sequências de DNA pela técnica de PCR convencional.',
        categoria: 'molecular',
        tags: ['PCR', 'amplificação', 'DNA'],
        arquivo: '../assets/protocolos/Reação em cadeia da polimerase (PCR).pdf'
      },
      {
        id: 'PROT-058',
        titulo: 'Descarte de Material da Biologia Molecular',
        descricao: 'Procedimentos para descarte seguro de resíduos gerados em técnicas de biologia molecular.',
        categoria: 'esterilizacao',
        tags: ['descarte', 'resíduos', 'biologia molecular'],
        arquivo: '../assets/protocolos/Descarte de material da biologia molecular.pdf'
      },
      {
        id: 'PROT-059',
        titulo: 'Protocolos de Limpeza e Esterilização',
        descricao: 'Procedimentos para limpeza e esterilização de materiais e superfícies em laboratório.',
        categoria: 'esterilizacao',
        tags: ['limpeza', 'esterilização', 'laboratório'],
        arquivo: '../assets/protocolos/Protocolos de limpeza e esterilização.pdf'
      },
      {
        id: 'PROT-066',
        titulo: 'Soluções Extras',
        descricao: 'Preparação de soluções adicionais utilizadas em cultivo celular e técnicas laboratoriais.',
        categoria: 'cultivo-celular',
        tags: ['soluções', 'preparo', 'laboratório'],
        arquivo: '../assets/protocolos/Soluções extras.pdf'
      }
    ];