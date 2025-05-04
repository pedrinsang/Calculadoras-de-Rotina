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
  const feedback = document.createElement("div");
  feedback.className = `feedback ${tipo}`;
  feedback.textContent = mensagem;
  document.body.appendChild(feedback);
  
  setTimeout(() => {
      feedback.remove();
  }, 3000);
}

// Função para filtrar tarefas com base no termo de busca
function filtrarTarefas(termo) {
  const historicoList = document.getElementById("historico-list");
  historicoList.innerHTML = "";

  if (!termo) {
    // Se não houver termo de busca, mostrar todas as tarefas
    renderizarTarefas(todasTarefas);
    return;
  }

  const termoLower = termo.toLowerCase();
  const tarefasFiltradas = todasTarefas.filter(tarefa => {
    return (
      (tarefa.id && tarefa.id.toLowerCase().includes(termoLower)) ||
      (tarefa.tipo && tarefa.tipo.toLowerCase().includes(termoLower)) ||
      (tarefa.observacoes && tarefa.observacoes.toLowerCase().includes(termoLower))
    );
  });

  if (tarefasFiltradas.length === 0) {
    historicoList.innerHTML = "<p>Nenhuma tarefa encontrada com o termo de busca.</p>";
  } else {
    renderizarTarefas(tarefasFiltradas);
  }
}

// Função para renderizar as tarefas na lista
function renderizarTarefas(tarefas) {
  const historicoList = document.getElementById("historico-list");
  historicoList.innerHTML = "";

  tarefas.forEach((tarefa) => {
    const historicoItem = document.createElement("div");
    historicoItem.className = "historico-item";
    
    
    const showResultsButton = tarefa.tipo.includes("SN") || 
                            tarefa.tipo.includes("ELISA") ||
                            tarefa.tipo.includes("PCR") ||
                            tarefa.tipo.includes("RAIVA") ||
                            tarefa.tipo.includes("ICC");

    historicoItem.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <div>
          <strong>ID:</strong> ${tarefa.id || 'Sem ID'}<br>
          <strong>Tipo:</strong> ${tarefa.tipo || 'N/A'}${tarefa.complemento ? ` ${tarefa.complemento}` : ''}
        </div>
        <div class="status-buttons">
          ${showResultsButton ? 
            `<button class="btn-resultados" onclick="mostrarResultados('${tarefa.docId}')">Resultados</button>` : ''}
          <button class="btn-voltar-mural" onclick="voltarParaMural('${tarefa.docId}')">Voltar ao Mural</button>
          <button class="btn-detalhes" onclick="mostrarDetalhes('${tarefa.docId}')">Detalhes</button>
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



// Função para mostrar detalhes da tarefa
window.mostrarDetalhes = async (id) => {
  try {
    // Se já existe um modal aberto, fecha ele primeiro
    if (modalAtual) {
        document.body.removeChild(modalAtual);
        modalAtual = null;
        // Remove qualquer event listener existente do ESC
        document.removeEventListener("keydown", handleKeyDown);
    }

    const docRef = doc(db, "historico", id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) throw new Error("Tarefa não encontrada");
    
    const tarefa = docSnap.data();
    let siglaUsuario = "N/A";

    if (tarefa.siglaResponsavel) {
        siglaUsuario = tarefa.siglaResponsavel;
    } else if (tarefa.criadoPor) {
        const usuarioRef = doc(db, "usuarios", tarefa.criadoPor);
        const usuarioSnap = await getDoc(usuarioRef);
        if (usuarioSnap.exists()) {
            siglaUsuario = usuarioSnap.data().sigla || "N/A";
        }
    }

    const dataRecebimento = tarefa.dataRecebimento?.toDate 
        ? tarefa.dataRecebimento.toDate().toLocaleDateString("pt-BR")
        : "Data não disponível";
    
    const dataConclusao = tarefa.dataConclusao?.toDate 
        ? tarefa.dataConclusao.toDate().toLocaleDateString("pt-BR")
        : "Data não disponível";

    // Cria o modal apenas se não houver nenhum aberto
    if (!modalAtual) {
        const modal = document.createElement("div");
        modal.id = "modal-detalhes";
        modal.className = "modal-detalhes";

        modal.innerHTML = `
            <div class="modal-content">
                <h3 style="margin-bottom: 15px; margin-top: 0px; color: #1b5e20;">Detalhes da Tarefa Concluída</h3>
                
                <div style="margin-bottom: 15px;">
                    <strong style="display: inline-block; width: 120px;">ID:</strong>
                    <span>${tarefa.id || 'N/A'}</span>
                </div>
                
                <div style="margin-bottom: 15px;">
                    <strong style="display: inline-block; width: 120px;">Tipo:</strong>
                    <span>${tarefa.tipo || 'N/A'}</span>
                </div>

                <div style="margin-bottom: 15px;">
                    <strong style="display: inline-block; width: 120px;">Responsável:</strong>
                    <span>${siglaUsuario}</span>
                </div>

                <div style="margin-bottom: 15px;">
                    <strong style="display: inline-block; width: 120px;">Quantidade:</strong>
                    <span>${tarefa.quantidade || '0'} ${tarefa.tipo === "VACINA" 
                        ? `vacinas${tarefa.gramatura ? ` (${tarefa.gramatura}g)` : ''}` 
                        : "amostras"}</span>
                </div>

                ${tarefa.complemento ? `
                <div style="margin-bottom: 15px;">
                    <strong style="display: inline-block; width: 120px;">Complemento:</strong>
                    <span>${tarefa.complemento.trim()}</span>
                </div>` : ''}

                <div style="margin-bottom: 15px;">
                    <strong style="display: inline-block; width: 120px;">Proprietário:</strong>
                    <span>${tarefa.proprietario || 'N/A'}</span>
                </div>
                
                <div style="margin-bottom: 15px;">
                    <strong style="display: inline-block; width: 120px;">Recebimento:</strong>
                    <span>${dataRecebimento}</span>
                </div>
                
                <div style="margin-bottom: 15px;">
                    <strong style="display: inline-block; width: 120px;">Conclusão:</strong>
                    <span>${dataConclusao}</span>
                </div>
                
                ${tarefa.observacoes ? `
                <div style="margin-bottom: 20px;">
                    <strong style="display: block; margin-bottom: 5px;">Observações:</strong>
                    <div style="background: #f8f9fa; padding: 12px; border-radius: 6px; border-left: 4px solid #1b5e20; white-space: pre-line; text-align: left;">
                        ${tarefa.observacoes.trim()}
                    </div>
                </div>` : ''}
                
                <button id="fechar-modal" 
                    style="position: absolute; top: 15px; right: 15px; padding: 5px 10px; background: #d32f2f; color: white; border: none; border-radius: 4px; cursor: pointer;">
                    X
                </button>
            </div>
        `;

        document.body.appendChild(modal);
        modalAtual = modal;

        // Função para fechar o modal
        const fecharModal = () => {
            if (modalAtual) {
                document.body.removeChild(modalAtual);
                modalAtual = null;
                // Remove o event listener ao fechar
                document.removeEventListener("keydown", handleKeyDown);
            }
        };

        // Função para lidar com o ESC
        const handleKeyDown = (e) => {
            if (e.key === "Escape") {
                fecharModal();
            }
            e.preventDefault();
        };

        // Adiciona o listener do ESC
        document.addEventListener("keydown", handleKeyDown);

        // Configura o botão de fechar
        modal.querySelector("#fechar-modal").onclick = fecharModal;

        // Fecha ao clicar fora do conteúdo
        modal.onclick = (e) => {
            if (e.target === modal) {
                fecharModal();
            }
            e.stopPropagation();
        };
    }
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

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("voltar-button").onclick = () => {
    window.location.href = "mural.html";
  };

  // Configura o evento de busca
  document.getElementById("search-button").addEventListener("click", () => {
    const termo = document.getElementById("search-input").value;
    filtrarTarefas(termo);
  });

  // Permite buscar pressionando Enter
  document.getElementById("search-input").addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      const termo = document.getElementById("search-input").value;
      filtrarTarefas(termo);
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


