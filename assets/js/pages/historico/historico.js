import {
    collection,
    getDocs,
    query,
    where,
    orderBy,
    Timestamp,
    deleteDoc,
    doc,
    getDoc,
    addDoc,
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";
import { db, auth } from "../../main.js"; // Fix the path
import { gerarDocx } from './baixarDoc.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";

document.addEventListener('DOMContentLoaded', function() {
    console.log("Desenvolvido por Pedro Ruiz Sangoi e Alexandre Werle Suares, com auxílio do DeepSeek Chat.");
});

// Variável para armazenar todas as tarefas
let todasTarefas = [];
// Variável para controlar o modal aberto
let modalAtual = null;

export function mostrarFeedback(mensagem, tipo = "success") {
    // Verificar se container de notificações existe, senão criar
    let container = document.querySelector('.toastify-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toastify-container';
        document.body.appendChild(container);
    }
    
    // Gerar ID único para a notificação
    const notificationId = `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    // Configurar título e ícone com base no tipo
    let titulo, icone;
    switch(tipo) {
        case "success":
            titulo = "Sucesso";
            icone = '<i class="bi bi-check-circle-fill"></i>';
            break;
        case "error":
            titulo = "Erro";
            icone = '<i class="bi bi-x-circle-fill"></i>';
            tipo = "error"; // Normalizando o nome da classe
            break;
        case "warning":
            titulo = "Atenção";
            icone = '<i class="bi bi-exclamation-triangle-fill"></i>';
            break;
        case "info":
            titulo = "Informação";
            icone = '<i class="bi bi-info-circle-fill"></i>';
            break;
        default:
            titulo = "Notificação";
            icone = '<i class="bi bi-bell-fill"></i>';
    }
    
    // Criar elemento de notificação
    const notification = document.createElement('div');
    notification.id = notificationId;
    notification.className = `notification notification-${tipo}`;
    notification.innerHTML = `
        <div class="notification-icon">
            ${icone}
        </div>
        <div class="notification-content">
            <div class="notification-title">${titulo}</div>
            <div class="notification-message">${mensagem}</div>
        </div>
        <button class="notification-close" aria-label="Fechar">&times;</button>
        <div class="notification-progress"></div>
    `;
    
    // Adicionar ao container
    container.appendChild(notification);
    
    // Mostrar com animação
    setTimeout(() => {
        notification.classList.add('show');
        
        // Animar a barra de progresso
        const progressBar = notification.querySelector('.notification-progress');
        progressBar.style.animation = 'progress 5s linear forwards';
        
        // Configurar evento de fechar no botão
        const closeButton = notification.querySelector('.notification-close');
        closeButton.addEventListener('click', () => {
            fecharNotificacao(notification);
        });
        
        // Auto-fechar após 5 segundos
        setTimeout(() => {
            fecharNotificacao(notification);
        }, 5000);
        
    }, 10);
    
    // Função para fechar notificação com animação
    function fecharNotificacao(element) {
        element.classList.add('hide');
        setTimeout(() => {
            if (element && element.parentNode) {
                element.parentNode.removeChild(element);
            }
        }, 300);
    }
}

// Assegurar que as funções do módulo são acessíveis globalmente
window.mostrarFeedback = mostrarFeedback;

// Atualize a função filtrarTarefas
function filtrarTarefas(termo) {
  const historicoList = document.getElementById("historico-list");
  const searchInput = document.getElementById("search-input");
  const searchButton = document.getElementById("search-button");
  
  // Adicionar indicador visual de busca ativa
  if (termo) {
    searchInput.classList.add("border-primary");
    // Remova todas as classes relacionadas a cores e adicione a classe de aviso
    searchButton.classList.remove("btn-success");
    searchButton.classList.add("btn-warning", "text-white");
    searchButton.innerHTML = `<i class="bi bi-x-circle"></i> Limpar`;
  } else {
    searchInput.classList.remove("border-primary");
    // Remova classes de aviso e adicione a classe de sucesso
    searchButton.classList.remove("btn-warning");
    searchButton.classList.add("btn-success", "text-white");
    searchButton.innerHTML = `<i class="bi bi-search"></i> Buscar`;
  }
  
  // Se não houver termo de busca, mostrar todas as tarefas
  if (!termo) {
    renderizarTarefas(todasTarefas);
    return;
  }

  historicoList.innerHTML = `<div class="text-center my-3"><div class="spinner-border text-success" role="status"></div><p class="mt-2">Procurando...</p></div>`;

  // Dividir a busca em termos para busca mais precisa
  const termos = termo.toLowerCase().split(" ").filter(t => t.length > 0);
  
  const tarefasFiltradas = todasTarefas.filter(tarefa => {
    // Se não houver termos, retorna true
    if (termos.length === 0) return true;
    
    // Campos de texto para busca
    const camposDeBusca = [
      tarefa.id || '',
      tarefa.tipo || '',
      tarefa.observacoes || '',
      tarefa.complemento || '',
      typeof tarefa.proprietario === 'object' 
          ? tarefa.proprietario?.nome || ''
          : tarefa.proprietario || '',
      tarefa.siglaResponsavel || ''
    ];
    
    // Converte todos para lowercase
    const textoCompleto = camposDeBusca.join(' ').toLowerCase();
    
    // Verifica se TODOS os termos existem em pelo menos um dos campos
    return termos.every(termo => textoCompleto.includes(termo));
  });

  if (tarefasFiltradas.length === 0) {
    historicoList.innerHTML = `
      <div class="alert alert-info text-center" role="alert">
        <i class="bi bi-search me-2"></i>
        Nenhuma tarefa encontrada com o termo "<strong>${termo}</strong>".
      </div>`;
  } else {
    renderizarTarefas(tarefasFiltradas);
    
    // Adicionar contador de resultados
    const resultCounter = document.createElement("div");
    resultCounter.className = "alert alert-success mb-3";
    resultCounter.innerHTML = `<i class="bi bi-check-circle me-2"></i> <strong>${tarefasFiltradas.length}</strong> ${tarefasFiltradas.length === 1 ? 'resultado encontrado' : 'resultados encontrados'} para "<strong>${termo}</strong>"`;
    historicoList.insertBefore(resultCounter, historicoList.firstChild);
  }
}

// Função para destacar termos de busca no texto
function destacarTermos(texto, termo) {
  if (!termo || !texto) return texto;
  
  const termos = termo.toLowerCase().split(" ").filter(t => t.length > 0);
  let resultado = texto;
  
  termos.forEach(t => {
    const regex = new RegExp(t, 'gi');
    resultado = resultado.replace(regex, match => `<mark>${match}</mark>`);
  });
  
  return resultado;
}

// Adicione esta função para implementar debounce
function debounce(func, timeout = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => { func.apply(this, args); }, timeout);
  };
}

// Substitua ambos os blocos DOMContentLoaded por um único bloco organizado
document.addEventListener("DOMContentLoaded", () => {
  // Botão voltar
  document.getElementById("voltar-button").onclick = () => {
    window.location.href = "mural.html";
  };

  const searchInput = document.getElementById("search-input");
  const searchButton = document.getElementById("search-button");

  // Certifique-se de que o botão sempre tenha estas classes independente do estado
  searchButton.classList.add("btn-sm", "rounded-pill", "fixed-width-button");

  // Busca com debounce ao digitar
  const debouncedSearch = debounce(() => {
    filtrarTarefas(searchInput.value);
  }, 400);

  searchInput.addEventListener("input", debouncedSearch);

  // Configurar botão de busca para alternar entre buscar e limpar
  searchButton.addEventListener("click", () => {
    if (searchInput.value) {
      if (searchButton.classList.contains("btn-warning")) {
        // Está no modo limpar
        searchInput.value = "";
        filtrarTarefas("");
      } else {
        filtrarTarefas(searchInput.value);
      }
    } else {
      filtrarTarefas("");
    }
  });

  // Permite buscar pressionando Enter
  searchInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      filtrarTarefas(searchInput.value);
    }
  });

  onAuthStateChanged(auth, (user) => {
    if (user) {
      excluirTarefasAntigas().then(() => {
        carregarHistorico();
      });
    } else {
      window.location.href = "index.html";
    }
  });
});

// Função para renderizar as tarefas na lista
function renderizarTarefas(tarefas) {
  const historicoList = document.getElementById("historico-list");
  const searchTermo = document.getElementById("search-input").value;
  
  if (!tarefas.length) {
    historicoList.innerHTML = "<p class='text-center mt-4'>Não há tarefas disponíveis.</p>";
    return;
  }
  
  // Limpa apenas o conteúdo principal, mantém o contador se existir
  const counterAlert = historicoList.querySelector('.alert-success');
  historicoList.innerHTML = "";
  if (counterAlert) {
    historicoList.appendChild(counterAlert);
  }

  tarefas.forEach((tarefa) => {
    const historicoItem = document.createElement("div");
    historicoItem.className = "historico-item";
    
    const showResultsButton = tarefa.tipo.includes("SN") || 
                            tarefa.tipo.includes("ELISA") ||
                            tarefa.tipo.includes("PCR") ||
                            tarefa.tipo.includes("RAIVA") ||
                            tarefa.tipo.includes("ICC");

    // Destacar texto nos principais campos se houver busca ativa
    const id = searchTermo ? destacarTermos(tarefa.id || 'Sem ID', searchTermo) : (tarefa.id || 'Sem ID');
    const tipo = searchTermo ? destacarTermos(tarefa.tipo || 'N/A', searchTermo) : (tarefa.tipo || 'N/A');
    const complemento = tarefa.complemento ? (searchTermo ? destacarTermos(tarefa.complemento, searchTermo) : tarefa.complemento) : '';

    historicoItem.innerHTML = `
      <div class="d-flex justify-content-between align-items-start flex-wrap">
        <div>
          <h5 class="mb-1 text-success fw-bold">${id}</h5>
          <div class="mb-1"><span class="fw-medium">Tipo:</span> ${tipo}${complemento ? ` ${complemento}` : ''}</div>
          <div><span class="fw-medium">Concluído em:</span> ${tarefa.dataConclusao?.toDate().toLocaleDateString("pt-BR") || 'N/A'}</div>
          ${typeof tarefa.proprietario === 'object' && tarefa.proprietario?.nome ? 
            `<div><span class="fw-medium">Proprietário:</span> ${searchTermo ? destacarTermos(tarefa.proprietario.nome, searchTermo) : tarefa.proprietario.nome}</div>` : 
            (tarefa.proprietario ? `<div><span class="fw-medium">Proprietário:</span> ${searchTermo ? destacarTermos(tarefa.proprietario, searchTermo) : tarefa.proprietario}</div>` : '')}
        </div>
        <div class="d-flex flex-wrap gap-2 mt-2">
          <button class="btn btn-info text-white btn-sm" onclick="mostrarDetalhes('${tarefa.docId}')">
            <i class="bi bi-info-circle me-1"></i>Detalhes
          </button>
          <button class="btn btn-primary btn-sm" onclick="voltarParaMural('${tarefa.docId}')">
            <i class="bi bi-arrow-counterclockwise me-1"></i>Restaurar
          </button>
          ${showResultsButton ? `
          <button class="btn btn-warning text-white btn-sm" onclick="mostrarResultados('${tarefa.docId}')">
            <i class="bi bi-clipboard-data me-1"></i>Resultados
          </button>` : ''}
        </div>
      </div>
    `;
    historicoList.appendChild(historicoItem);
  });
}

// ADICIONE ESTAS NOVAS FUNÇÕES
window.voltarParaMural = async (id) => {
  try {
    if (!confirm("Tem certeza que deseja enviar esta tarefa de volta ao mural?")) return;
    
    // Obter os dados da tarefa do histórico
    const historicoRef = doc(db, "historico", id);
    const historicoSnap = await getDoc(historicoRef);
    
    if (!historicoSnap.exists()) {
      mostrarFeedback("Tarefa não encontrada no histórico", "error");
      return;
    }
    
    const tarefa = historicoSnap.data();
    
    // Adicionar de volta ao mural
    await addDoc(collection(db, "tarefas"), {
      id: tarefa.id,
      tipo: tarefa.tipo,
      quantidade: tarefa.quantidade,
      gramatura: tarefa.gramatura || null,
      dataRecebimento: tarefa.dataRecebimento,
      observacoes: tarefa.observacoes || "",
      status: "pendente",
      criadoEm: Timestamp.now(),
      criadoPor: auth.currentUser.uid,
      siglaResponsavel: tarefa.siglaResponsavel || "N/A",
      resultados: tarefa.resultados || null
    });
    
    // Remover do histórico
    await deleteDoc(historicoRef);
    
    // Recarregar o histórico
    carregarHistorico();
    mostrarFeedback("Tarefa enviada de volta ao mural com sucesso!", "success");
  } catch (error) {
    console.error("Erro ao enviar tarefa para o mural:", error);
    mostrarFeedback(`Erro: ${error.message}`, "error");
  }
};

// Função para formatar data para exibição
function formatarDataParaExibicao(data) {
  if (!data) return "Data não disponível";
  
  const dia = String(data.getDate()).padStart(2, '0');
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const ano = data.getFullYear();
  const hora = String(data.getHours()).padStart(2, '0');
  const minutos = String(data.getMinutes()).padStart(2, '0');
  
  return `${dia}/${mes}/${ano} - ${hora}:${minutos}`;
}


// Function to show task details in the Bootstrap modal
window.mostrarDetalhes = async (id) => {
  try {
    const docRef = doc(db, "historico", id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) throw new Error("Tarefa não encontrada");
    
    const tarefa = docSnap.data();
    let siglaUsuario = "N/A";
    
    if (tarefa.siglaResponsavel && tarefa.siglaResponsavel !== "N/A") {
      siglaUsuario = tarefa.siglaResponsavel;
    } else if (tarefa.criadoPor) {
      // Lógica existente para buscar sigla
      const usuarioRef = doc(db, "usuarios", tarefa.criadoPor);
      const usuarioSnap = await getDoc(usuarioRef);
      if (usuarioSnap.exists()) {
        siglaUsuario = usuarioSnap.data().sigla || "N/A";
      }
    }

    const dataRecebimento = tarefa.dataRecebimento?.toDate 
      ? formatarDataParaExibicao(tarefa.dataRecebimento.toDate())
      : "Data não disponível";
    
    const dataConclusao = tarefa.dataConclusao?.toDate 
      ? formatarDataParaExibicao(tarefa.dataConclusao.toDate())
      : "Data não disponível";

    // Remove existing modal if present
    let modalElement = document.getElementById("modal-detalhes");
    if (modalElement) {
      modalElement.remove();
    }
    
    // Status badge with appropriate color
    let statusBadge = '<span class="badge bg-success">Concluído</span>';

    // Criar modal com layout aprimorado
    const modalHTML = `
      <div class="modal fade" id="modal-detalhes" tabindex="-1" aria-labelledby="detalhesTarefaLabel" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content border-0 shadow">
            <div class="modal-header bg-light">
              <h5 class="modal-title" id="detalhesTarefaLabel">
                <i class="bi bi-info-circle-fill text-success me-2"></i>
                <span class="fw-bold text-success">Detalhes da Tarefa</span>
              </h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Fechar"></button>
            </div>
            <div class="modal-body p-4">
              <div class="card border-0 mb-3 shadow-sm">
                <div class="card-body">
                  <h6 class="card-subtitle mb-3 text-success fw-bold">
                    <i class="bi bi-card-heading me-2"></i>Informações Básicas
                  </h6>
                  <div class="row mb-2">
                    <div class="col-5 text-muted">ID:</div>
                    <div class="col-7 fw-medium">${tarefa.id || 'N/A'}</div>
                  </div>
                  <div class="row mb-2">
                    <div class="col-5 text-muted">Tipo:</div>
                    <div class="col-7 fw-medium">${tarefa.tipo || 'N/A'}</div>
                  </div>
                  <div class="row mb-2">
                    <div class="col-5 text-muted">Quantidade:</div>
                    <div class="col-7 fw-medium">${tarefa.quantidade || '0'} ${tarefa.tipo === "VACINA" 
                      ? `vacinas${tarefa.gramatura ? ` (${tarefa.gramatura}g)` : ''}` 
                      : "amostras"}</div>
                  </div>
                  ${tarefa.complemento ? `
                  <div class="row mb-2">
                    <div class="col-5 text-muted">Complemento:</div>
                    <div class="col-7 fw-medium">${tarefa.complemento.trim()}</div>
                  </div>` : ''}
                </div>
              </div>
              
              <div class="card border-0 mb-3 shadow-sm">
                <div class="card-body">
                  <h6 class="card-subtitle mb-3 text-success fw-bold">
                    <i class="bi bi-people-fill me-2"></i>Contatos
                  </h6>
                  <div class="row mb-2">
                    <div class="col-5 text-muted">Proprietário:</div>
                    <div class="col-7 fw-medium">${typeof tarefa.proprietario === 'object' 
                      ? tarefa.proprietario?.nome || 'N/A'
                      : tarefa.proprietario || 'N/A'}</div>
                  </div>
                  <div class="row mb-2">
                    <div class="col-5 text-muted">Veterinário:</div>
                    <div class="col-7 fw-medium">${typeof tarefa.veterinario === 'object'
                      ? tarefa.veterinario?.nome || 'N/A'
                      : tarefa.veterinario || 'N/A'}</div>
                  </div>
                </div>
              </div>
              
              <div class="card border-0 mb-3 shadow-sm">
                <div class="card-body">
                  <h6 class="card-subtitle mb-3 text-success fw-bold">
                    <i class="bi bi-calendar3 me-2"></i>Status e Datas
                  </h6>
                  <div class="row mb-2">
                    <div class="col-5 text-muted">Status:</div>
                    <div class="col-7">${statusBadge}</div>
                  </div>
                  <div class="row mb-2">
                    <div class="col-5 text-muted">Recebimento:</div>
                    <div class="col-7 fw-medium">${dataRecebimento}</div>
                  </div>
                  <div class="row mb-2">
                    <div class="col-5 text-muted">Conclusão:</div>
                    <div class="col-7 fw-medium">${dataConclusao}</div>
                  </div>
                  <div class="row mb-2">
                    <div class="col-5 text-muted">Responsável:</div>
                    <div class="col-7 fw-medium">${siglaUsuario}</div>
                  </div>
                </div>
              </div>
              
              ${tarefa.observacoes ? `
              <div class="card border-0 shadow-sm">
                <div class="card-body">
                  <h6 class="card-subtitle mb-3 text-success fw-bold">
                    <i class="bi bi-card-text me-2"></i>Observações
                  </h6>
                  <div class="bg-light p-3 rounded" style="white-space: pre-wrap; word-break: break-word; font-size: 0.95rem;">
${tarefa.observacoes.trim()}
                  </div>
                </div>
              </div>` : ''}
            </div>
          </div>
        </div>
      </div>
    `;
    
    // Add modal to body
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Show modal using Bootstrap
    const modal = new bootstrap.Modal(document.getElementById('modal-detalhes'));
    modal.show();
  } catch (error) {
    console.error("Erro ao mostrar detalhes:", error);
    mostrarFeedback(`Erro: ${error.message}`, "error");
  }
};

// Função para excluir tarefas concluídas há mais de 1 ano
async function excluirTarefasAntigas() {
  try {
    const umAnoAtras = new Date();
    umAnoAtras.setFullYear(umAnoAtras.getFullYear() - 1);
    
    const q = query(
      collection(db, "historico"),
      where("dataConclusao", "<", umAnoAtras)
    );

    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) return;
    
    // Excluir cada documento encontrado
    const promises = [];
    querySnapshot.forEach((doc) => {
      promises.push(deleteDoc(doc.ref));
    });
    
    await Promise.all(promises);
    console.log(`${promises.length} tarefas antigas foram excluídas automaticamente`);
    
  } catch (error) {
    console.error("Erro ao excluir tarefas antigas:", error);
  }
}
      

// Carregar histórico
async function carregarHistorico() {
  const historicoList = document.getElementById("historico-list");
  historicoList.innerHTML = '<p>Carregando histórico...</p>';

  try {
    const user = auth.currentUser;
    if (!user) throw new Error("Usuário não autenticado");

    // Calcula data de 1 ano atrás
    const umAnoAtras = new Date();
    umAnoAtras.setFullYear(umAnoAtras.getFullYear() - 1);
    
    const q = query(
      collection(db, "historico"),
      where("dataConclusao", ">=", umAnoAtras),
      orderBy("dataConclusao", "desc")
    );

    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      historicoList.innerHTML = "<p>Nenhuma tarefa concluída encontrada no último ano.</p>";
      return;
    }

    // Armazena todas as tarefas para busca local
    todasTarefas = [];
    querySnapshot.forEach((doc) => {
      const tarefa = doc.data();
      tarefa.docId = doc.id;
      todasTarefas.push(tarefa);
    });

    // Renderiza todas as tarefas
    renderizarTarefas(todasTarefas);
  } catch (error) {
    console.error("Erro ao carregar histórico:", error);
    historicoList.innerHTML = `<p>Erro ao carregar histórico: ${error.message}</p>`;
  }
}

