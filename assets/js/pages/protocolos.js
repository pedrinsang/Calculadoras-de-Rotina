import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";
import {
  collection, doc, getDoc, getDocs, serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js";
import {
  deleteObject, getDownloadURL, ref, uploadBytes
} from "https://www.gstatic.com/firebasejs/11.4.0/firebase-storage.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-storage.js";
import { app, auth, db } from "../firebase.js";
import { exigirAdministradorAtual, gravarComAuditoria } from "../utils/auditoria.js";
import { usuarioEhAdministrador } from "../utils/perfis.js";

const COLECAO_DOCUMENTOS = 'protocolos_tecnicos';
const TAMANHO_MAXIMO_PDF = 25 * 1024 * 1024;
const storage = getStorage(app);
let documentosGerenciaveis = [];
let usuarioAdmin = false;

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

  document.getElementById("filter-type").addEventListener("change", () => {
    carregarProtocolos(
      document.getElementById("search-input").value,
      document.getElementById("filter-category").value
    );
  });

  document.getElementById("pop-form").addEventListener("submit", cadastrarDocumento);
  document.getElementById("protocolos-list").addEventListener("click", tratarAcaoDocumento);

  // Navegação
  document.getElementById("hub-button").addEventListener("click", () => {
    window.location.href = "hub.html";
  });

  document.getElementById("mural-button").addEventListener("click", () => {
    window.location.href = "mural.html";
  });

  // Pílulas de categoria (espelham o select escondido)
  if (window.VirologiaUFSM) window.VirologiaUFSM.iniciar(document);
  window.scrollTo(0, 0); // Garante que a página comece no topo

  onAuthStateChanged(auth, inicializarDocumentosGerenciaveis);
});

// Nomes das categorias, na ordem em que aparecem na lista
const NOMES_CATEGORIA = {
  'cultivo-celular': 'Cultivo celular',
  'virologia': 'Técnicas virológicas',
  'imunologia': 'Técnicas imunológicas',
  'molecular': 'Biologia molecular',
  'microscopia': 'Microscopia',
  'hemaglutinacao': 'Hemaglutinação',
  'soroneutralizacao': 'Soroneutralização',
  'esterilizacao': 'Esterilização e limpeza'
};

function textoSeguroP(t) {
  return String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

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
    ${textoSeguroP(mensagem)}
  `;
  document.body.appendChild(feedback);

  setTimeout(() => {
    feedback.remove();
  }, 3000);
}

async function inicializarDocumentosGerenciaveis(user) {
  usuarioAdmin = false;
  document.getElementById("pop-admin").hidden = true;

  if (!user) {
    documentosGerenciaveis = [];
    carregarProtocolos();
    return;
  }

  try {
    const usuario = await getDoc(doc(db, "usuarios", user.uid));
    if (auth.currentUser?.uid !== user.uid) return;
    usuarioAdmin = usuario.exists() && usuarioEhAdministrador(usuario.data());
    document.getElementById("pop-admin").hidden = !usuarioAdmin;
  } catch (error) {
    console.error("Erro ao verificar permissões para gerenciar documentos:", error);
    mostrarFeedback("Não foi possível verificar as permissões de administrador.", "error");
  }

  try {
    await carregarDocumentosGerenciaveis();
  } catch (error) {
    console.error("Erro ao buscar POPs e procedimentos cadastrados:", error);
    mostrarFeedback(`Não foi possível carregar os documentos adicionados: ${error.message}`, "error");
  }

  if (auth.currentUser?.uid === user.uid) carregarProtocolos();
}

async function carregarDocumentosGerenciaveis() {
  const snapshot = await getDocs(collection(db, COLECAO_DOCUMENTOS));
  documentosGerenciaveis = snapshot.docs.map(documento => {
    const dados = documento.data();
    if (dados.legacyId && dados.removido) {
      return {
        id: dados.legacyId,
        documentId: documento.id,
        legacyId: dados.legacyId,
        removido: true,
        documentoGerenciado: true
      };
    }

    if (!dados.titulo || !dados.descricao || !dados.categoria ||
        !['pop', 'procedimento'].includes(dados.tipoDocumento) ||
        !dados.storagePath || !dados.arquivo) {
      throw new Error(`O documento ${documento.id} está incompleto no cadastro.`);
    }

    const url = new URL(dados.arquivo);
    if (url.protocol !== 'https:' || url.hostname !== 'firebasestorage.googleapis.com') {
      throw new Error(`O arquivo do documento ${documento.id} não possui um endereço válido.`);
    }

    return {
      id: dados.legacyId || documento.id,
      documentId: documento.id,
      legacyId: dados.legacyId || null,
      documentoGerenciado: true,
      titulo: dados.titulo,
      descricao: dados.descricao,
      categoria: dados.categoria,
      tipoDocumento: dados.tipoDocumento,
      tags: [],
      arquivo: url.href,
      storagePath: dados.storagePath
    };
  });
}

function atualizarStatusAdmin(mensagem, erro = false) {
  const status = document.getElementById("pop-admin-status");
  status.textContent = mensagem;
  status.classList.toggle("erro", erro);
}

function validarPDF(arquivo) {
  if (!arquivo || arquivo.size === 0) throw new Error("Selecione um arquivo PDF.");
  if (!/\.pdf$/i.test(arquivo.name) || (arquivo.type && arquivo.type !== "application/pdf")) {
    throw new Error("O arquivo selecionado não é um PDF válido.");
  }
  if (arquivo.size > TAMANHO_MAXIMO_PDF) {
    throw new Error("O PDF deve ter no máximo 25 MB.");
  }
}

async function exigirAdministrador() {
  if (!auth.currentUser || !usuarioAdmin) {
    throw new Error("Apenas administradores autenticados podem gerenciar documentos.");
  }
  await exigirAdministradorAtual();
}

async function enviarPDF(arquivo) {
  await exigirAdministrador();
  validarPDF(arquivo);
  const caminho = `${COLECAO_DOCUMENTOS}/${auth.currentUser.uid}/${crypto.randomUUID()}.pdf`;
  const referencia = ref(storage, caminho);
  await uploadBytes(referencia, arquivo, { contentType: "application/pdf" });

  try {
    return { storagePath: caminho, arquivo: await getDownloadURL(referencia) };
  } catch (error) {
    try {
      await deleteObject(referencia);
    } catch (erroLimpeza) {
      console.error("Não foi possível remover um PDF cujo link falhou ao ser obtido:", erroLimpeza);
    }
    throw error;
  }
}

async function cadastrarDocumento(evento) {
  evento.preventDefault();
  const formulario = evento.currentTarget;
  const botao = document.getElementById("pop-submit");
  const arquivo = document.getElementById("pop-arquivo").files[0];
  let novoArquivo;

  try {
    await exigirAdministrador();
    validarPDF(arquivo);
    const dados = {
      titulo: formulario.elements.titulo.value.trim(),
      descricao: formulario.elements.descricao.value.trim(),
      tipoDocumento: formulario.elements.tipo.value,
      categoria: formulario.elements.categoria.value,
      tags: [],
      criadoPor: auth.currentUser.uid,
      atualizadoEm: serverTimestamp()
    };
    if (!dados.titulo || !dados.descricao) throw new Error("Preencha o nome e a descrição do documento.");

    botao.disabled = true;
    atualizarStatusAdmin("Enviando documento...");
    novoArquivo = await enviarPDF(arquivo);
    Object.assign(dados, novoArquivo);

    try {
      const cadastro = await gravarComAuditoria({
        operacao: 'criar',
        referencia: doc(collection(db, COLECAO_DOCUMENTOS)),
        dados,
        modulo: 'POPs e procedimentos',
        registroId: dados.titulo,
        registroNome: dados.titulo
      });
      documentosGerenciaveis.push({
        ...dados,
        id: cadastro.id,
        documentId: cadastro.id,
        legacyId: null,
        documentoGerenciado: true
      });
    } catch (error) {
      try {
        await deleteObject(ref(storage, novoArquivo.storagePath));
      } catch (erroLimpeza) {
        console.error("Não foi possível remover o PDF após falha ao salvar o cadastro:", erroLimpeza);
      }
      throw error;
    }

    formulario.reset();
    carregarProtocolos(
      document.getElementById("search-input").value,
      document.getElementById("filter-category").value
    );
    atualizarStatusAdmin("Documento adicionado com sucesso.");
    mostrarFeedback("Documento adicionado com sucesso.");
  } catch (error) {
    console.error("Erro ao adicionar POP ou procedimento:", error);
    atualizarStatusAdmin(`Não foi possível adicionar o documento: ${error.message}`, true);
    mostrarFeedback(`Não foi possível adicionar o documento: ${error.message}`, "error");
  } finally {
    botao.disabled = false;
  }
}

async function tratarAcaoDocumento(evento) {
  const botao = evento.target.closest("[data-document-action]");
  if (!botao) return;

  evento.preventDefault();
  const documento = documentosGerenciaveis.find(item => item.documentId === botao.dataset.documentId) ||
    (() => {
      const protocolo = protocolos.find(item => `legado-${item.id}` === botao.dataset.documentId);
      return protocolo ? {
        ...protocolo,
        documentId: botao.dataset.documentId,
        legacyId: protocolo.id,
        tipoDocumento: 'procedimento',
        documentoGerenciado: true
      } : null;
    })();
  if (!documento) {
    mostrarFeedback("Este documento não está mais disponível para alteração.", "error");
    return;
  }

  try {
    await exigirAdministrador();
    botao.disabled = true;
    if (botao.dataset.documentAction === "replace") {
      await substituirPDF(documento);
    } else if (botao.dataset.documentAction === "delete") {
      await excluirDocumento(documento);
    }
  } catch (error) {
    console.error("Erro ao gerenciar POP ou procedimento:", error);
    atualizarStatusAdmin(`Não foi possível concluir a operação: ${error.message}`, true);
    mostrarFeedback(`Não foi possível concluir a operação: ${error.message}`, "error");
  } finally {
    if (botao.isConnected) botao.disabled = false;
  }
}

function selecionarPDF() {
  return new Promise(resolve => {
    const campo = document.createElement("input");
    campo.type = "file";
    campo.accept = "application/pdf,.pdf";
    campo.addEventListener("change", () => resolve(campo.files[0] || null), { once: true });
    campo.addEventListener("cancel", () => resolve(null), { once: true });
    campo.click();
  });
}

async function substituirPDF(documento) {
  const arquivo = await selecionarPDF();
  if (!arquivo) return;

  validarPDF(arquivo);
  atualizarStatusAdmin(`Enviando nova versão de “${documento.titulo}”...`);
  const novoArquivo = await enviarPDF(arquivo);
  const dadosAtualizados = {
    titulo: documento.titulo,
    descricao: documento.descricao,
    tipoDocumento: documento.tipoDocumento || 'procedimento',
    categoria: documento.categoria,
    ...novoArquivo,
    atualizadoEm: serverTimestamp(),
    atualizadoPor: auth.currentUser.uid,
    tags: documento.tags || []
  };
  if (documento.legacyId) dadosAtualizados.legacyId = documento.legacyId;

  try {
    await gravarComAuditoria({
      operacao: documento.storagePath ? 'atualizar' : 'criar',
      referencia: doc(db, COLECAO_DOCUMENTOS, documento.documentId),
      antes: documento.storagePath ? documento : {},
      dados: dadosAtualizados,
      modulo: 'POPs e procedimentos',
      registroId: documento.legacyId || documento.documentId,
      registroNome: documento.titulo,
      acao: 'substituiu documento'
    });
  } catch (error) {
    try {
      await deleteObject(ref(storage, novoArquivo.storagePath));
    } catch (erroLimpeza) {
      console.error("Não foi possível remover o novo PDF após falha ao atualizar o cadastro:", erroLimpeza);
    }
    throw error;
  }

  const substituido = {
    ...documento,
    ...dadosAtualizados,
    id: documento.legacyId || documento.documentId,
    documentId: documento.documentId,
    documentoGerenciado: true
  };
  documentosGerenciaveis = [
    ...documentosGerenciaveis.filter(item => item.documentId !== documento.documentId),
    substituido
  ];
  carregarProtocolos(
    document.getElementById("search-input").value,
    document.getElementById("filter-category").value
  );

  if (documento.storagePath) {
    try {
      await deleteObject(ref(storage, documento.storagePath));
    } catch (error) {
      throw new Error(`O documento foi atualizado, mas não foi possível limpar o PDF anterior: ${error.message}`);
    }
  }

  atualizarStatusAdmin("PDF substituído com sucesso.");
  mostrarFeedback("PDF substituído com sucesso.");
}

async function excluirDocumento(documento) {
  const confirmar = window.VirologiaUFSM?.confirmar;
  const autorizado = confirmar
    ? await confirmar({
      titulo: "Excluir documento?",
      texto: documento.storagePath
        ? `“${documento.titulo}” será removido da lista e o PDF enviado será apagado.`
        : `“${documento.titulo}” deixará de aparecer na lista.`,
      sim: "Excluir",
      perigo: true,
      icone: "bi-trash3"
    })
    : window.confirm(`Excluir “${documento.titulo}” e apagar o PDF?`);
  if (!autorizado) return;

  atualizarStatusAdmin(`Excluindo “${documento.titulo}”...`);
  if (documento.legacyId) {
    const dadosRemovidos = {
      legacyId: documento.legacyId,
      removido: true,
      tipoDocumento: documento.tipoDocumento || 'procedimento',
      atualizadoEm: serverTimestamp(),
      atualizadoPor: auth.currentUser.uid
    };
    await gravarComAuditoria({
      operacao: documento.storagePath ? 'atualizar' : 'criar',
      referencia: doc(db, COLECAO_DOCUMENTOS, documento.documentId),
      antes: documento.storagePath ? documento : {},
      dados: dadosRemovidos,
      modulo: 'POPs e procedimentos',
      registroId: documento.legacyId,
      registroNome: documento.titulo,
      acao: 'excluiu documento'
    });
    documentosGerenciaveis = [
      ...documentosGerenciaveis.filter(item => item.documentId !== documento.documentId),
      {
        id: documento.legacyId,
        documentId: documento.documentId,
        legacyId: documento.legacyId,
        removido: true,
        documentoGerenciado: true
      }
    ];
  } else {
    await gravarComAuditoria({
      operacao: 'excluir',
      referencia: doc(db, COLECAO_DOCUMENTOS, documento.documentId),
      antes: documento,
      modulo: 'POPs e procedimentos',
      registroId: documento.documentId,
      registroNome: documento.titulo
    });
    documentosGerenciaveis = documentosGerenciaveis.filter(item => item.documentId !== documento.documentId);
  }
  carregarProtocolos(
    document.getElementById("search-input").value,
    document.getElementById("filter-category").value
  );
  if (documento.storagePath) {
    try {
      await deleteObject(ref(storage, documento.storagePath));
    } catch (error) {
      atualizarStatusAdmin(`Documento removido da lista, mas o PDF não pôde ser apagado: ${error.message}`, true);
      throw new Error(`O cadastro foi excluído, mas falhou a remoção do PDF: ${error.message}`);
    }
  }
  atualizarStatusAdmin("Documento excluído com sucesso.");
  mostrarFeedback("Documento excluído com sucesso.");
}

function carregarProtocolos(filtro = '', categoria = 'todos') {
  mostrarLoading();
  const protocolosList = document.getElementById("protocolos-list");

  try {
    const tipo = document.getElementById("filter-type").value;
    const substituicoes = new Map(
      documentosGerenciaveis.filter(item => item.legacyId).map(item => [item.legacyId, item])
    );
    const todosProtocolos = [
      ...protocolos
        .filter(protocolo => !substituicoes.get(protocolo.id)?.removido)
        .map(protocolo => substituicoes.get(protocolo.id) || {
          ...protocolo,
          tipoDocumento: 'procedimento',
          documentoGerenciado: true,
          legacyId: protocolo.id,
          documentId: `legado-${protocolo.id}`
        }),
      ...documentosGerenciaveis.filter(item => !item.legacyId)
    ];

    // Filtrar protocolos
    let protocolosFiltrados = todosProtocolos.filter(protocolo => {
      const buscaMatch = protocolo.titulo.toLowerCase().includes(filtro.toLowerCase()) ||
        protocolo.descricao.toLowerCase().includes(filtro.toLowerCase()) ||
        (protocolo.tags || []).some(tag => tag.toLowerCase().includes(filtro.toLowerCase()));

      const categoriaMatch = categoria === 'todos' || protocolo.categoria === categoria;
      const tipoMatch = tipo === 'todos' || protocolo.tipoDocumento === tipo;

      return buscaMatch && categoriaMatch && tipoMatch;
    });

    const resumo = document.getElementById("protocolos-resumo");
    if (resumo) {
      resumo.textContent = filtro || categoria !== 'todos' || tipo !== 'todos'
        ? `${protocolosFiltrados.length} de ${todosProtocolos.length} documentos`
        : `${todosProtocolos.length} PDFs do setor`;
    }

    if (protocolosFiltrados.length === 0) {
      protocolosList.innerHTML = `
        <div class="vu-vazio">
          <span class="vu-vazio-icone"><i class="bi bi-search" style="font-size:40px"></i></span>
          <h3>Nenhum documento encontrado</h3>
          <p>Tente outra palavra ou escolha “Todos” nos filtros.</p>
        </div>`;
      return;
    }

    // Ordenar por título e agrupar por categoria (como na identidade visual)
    protocolosFiltrados.sort((a, b) => a.titulo.localeCompare(b.titulo));
    const ordem = Object.keys(NOMES_CATEGORIA);
    const grupos = {};
    protocolosFiltrados.forEach(p => {
      const chave = `${p.tipoDocumento}:${p.categoria}`;
      (grupos[chave] ??= []).push(p);
    });
    const chaves = Object.keys(grupos).sort((a, b) => {
      const [tipoA, categoriaA] = a.split(':');
      const [tipoB, categoriaB] = b.split(':');
      return tipoA.localeCompare(tipoB) ||
        (ordem.indexOf(categoriaA) + 1 || 99) - (ordem.indexOf(categoriaB) + 1 || 99);
    });

    protocolosList.innerHTML = chaves.map(chave => `
      <section class="vu-secao vu-protocolos-grupo">
        <p class="vu-sobrelinha">${chave.startsWith('pop:') ? 'POPs' : 'Procedimentos técnicos'} · ${textoSeguroP(NOMES_CATEGORIA[chave.split(':')[1]] || 'Outros')}</p>
        <div class="vu-lista">
          ${grupos[chave].map(p => `
            <div class="vu-item cor-roxo vu-protocolo-item">
              <a class="vu-protocolo-link" href="${textoSeguroP(p.arquivo)}" target="_blank" rel="noopener noreferrer">
                <span class="vu-item-icone"><i class="bi bi-file-earmark-pdf vu-ico"></i></span>
                <span class="vu-item-texto">
                  <span class="vu-item-nome">${textoSeguroP(p.titulo)}</span>
                  <span class="vu-item-desc">${textoSeguroP(p.descricao)}</span>
                </span>
                <span class="vu-item-fim"><span class="vu-etiqueta vu-so-pc">${textoSeguroP(p.id)}</span><i class="bi bi-chevron-right vu-ico"></i></span>
              </a>
              ${p.documentoGerenciado && usuarioAdmin ? `
                <span class="vu-protocolo-acoes">
                  <button type="button" class="vu-btn vu-btn-fantasma" data-document-action="replace" data-document-id="${textoSeguroP(p.documentId)}" aria-label="Substituir PDF de ${textoSeguroP(p.titulo)}"><i class="bi bi-arrow-repeat"></i><span>Substituir PDF</span></button>
                  <button type="button" class="vu-btn vu-btn-perigo vu-btn-fantasma" data-document-action="delete" data-document-id="${textoSeguroP(p.documentId)}" aria-label="Excluir ${textoSeguroP(p.titulo)}"><i class="bi bi-trash3"></i><span>Excluir</span></button>
                </span>` : ''}
            </div>`).join('')}
        </div>
      </section>`).join('');
  } catch (error) {
    console.error("Erro ao carregar protocolos:", error);
    protocolosList.innerHTML = `
      <div class="alert alert-danger text-center" role="alert">
        <i class="bi bi-exclamation-triangle me-2"></i>
        Erro ao carregar documentos: ${textoSeguroP(error.message)}
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