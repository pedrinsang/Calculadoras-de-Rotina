import { 
    collection,
    getDocs,
    Timestamp,
    deleteDoc,
    doc,
    updateDoc,
    getDoc,
    addDoc,
    query,
    where,
    orderBy
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

import { db, auth } from "../../main.js";
import { registrarResultadoSN, registrarResultadoELISA, registrarResultadoPCR, registrarResultadoRAIVA, registrarResultadoICC} from "./regresultado.js";

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";

document.addEventListener('DOMContentLoaded', function() {
    console.log("Desenvolvido por Pedro Ruiz Sangoi e Alexandre Werle Suares, com auxílio do DeepSeek Chat.");
});

// Funções de UI
export function mostrarLoading() {
  document.getElementById("loading").style.display = "flex";
}

export function esconderLoading() {
  document.getElementById("loading").style.display = "none";
}

export function mostrarFeedback(mensagem, tipo = "success") {
  const feedback = document.createElement("div");
  feedback.className = `feedback ${tipo}`;
  feedback.textContent = mensagem;
  document.body.appendChild(feedback);
  
  setTimeout(() => {
    feedback.remove();
  }, 3000);
}

function mostrarFormulario(edicao = false) {
  const form = document.getElementById("mural-form");
  const muralList = document.getElementById("mural-list");
  const adicionarTarefaBtn = document.getElementById("adicionar-tarefa");
  const filtrosWrapper = document.querySelector(".filtros-wrapper"); // Adicionado
  
  form.style.display = "block";
  muralList.style.display = "none";
  adicionarTarefaBtn.style.display = "none";
  filtrosWrapper.style.display = "none"; // Adicionado
  
  if (!edicao) {
    form.reset();
    form.onsubmit = adicionarTarefa;
  }
}

function esconderFormulario() {
  document.getElementById("mural-form").style.display = "none";
  document.getElementById("mural-list").style.display = "block";
  document.getElementById("adicionar-tarefa").style.display = "block";
  document.querySelector(".filtros-wrapper").style.display = "flex"; // Adicionado
}

// Funções auxiliares para datas
function normalizarDataParaUTC(dataString) {
  const dataLocal = new Date(dataString);
  return new Date(Date.UTC(
    dataLocal.getFullYear(),
    dataLocal.getMonth(),
    dataLocal.getDate()
  ));
}

export function formatarDataParaExibicao(dataUTC) {
  return dataUTC.toLocaleDateString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
}

// Add this function before adicionarTarefa
async function getSiglaUsuario(user) {
    try {
        if (!user) return "N/A";
        
        const userRef = doc(db, "usuarios", user.uid);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
            return userSnap.data().sigla || "N/A";
        }
        
        return "N/A";
    } catch (error) {
        console.error("Erro ao obter sigla do usuário:", error);
        return "N/A";
    }
}

// Funções de Tarefas

async function adicionarTarefa(e) {
    e.preventDefault();
    mostrarLoading();
  
    try {
        const user = auth.currentUser;
        if (!user) throw new Error("Usuário não autenticado");

        // Get form elements and validate they exist
        const idInput = document.getElementById("id");
        const tipoInput = document.getElementById("tipo");
        const quantidadeInput = document.getElementById("quantidade");
        const gramaturaInput = document.getElementById("gramatura");
        const complementoInput = document.getElementById("complemento");
        const dataInput = document.getElementById("data");
        const proprietarioNomeInput = document.getElementById("proprietario-nome");
        const proprietarioMunicipioInput = document.getElementById("proprietario-municipio");
        const proprietarioContatoInput = document.getElementById("proprietario-contato");
        const veterinarioNomeInput = document.getElementById("veterinario-nome");
        const veterinarioMunicipioInput = document.getElementById("veterinario-municipio");
        const veterinarioContatoInput = document.getElementById("veterinario-contato");
        const observacoesInput = document.getElementById("observacoes");

        // Validate required fields exist
        if (!idInput || !tipoInput || !quantidadeInput || !dataInput) {
            throw new Error("Campos obrigatórios não encontrados no formulário");
        }

        // Get values with null checks
        const novaTarefa = {
            id: idInput.value.trim(),
            tipo: tipoInput.value,
            quantidade: parseInt(quantidadeInput.value),
            gramatura: tipoInput.value === "VACINA" && gramaturaInput 
                ? parseFloat(gramaturaInput.value) || null
                : null,
            complemento: (tipoInput.value === "PCR" || tipoInput.value === "RAIVA") && complementoInput
                ? complementoInput.value.trim()
                : null,
            proprietario: {
                nome: proprietarioNomeInput ? proprietarioNomeInput.value.trim() : "",
                municipio: proprietarioMunicipioInput ? proprietarioMunicipioInput.value.trim() : "",
                contato: proprietarioContatoInput ? proprietarioContatoInput.value.trim() : ""
            },
            veterinario: {
                nome: veterinarioNomeInput ? veterinarioNomeInput.value.trim() : "",
                municipio: veterinarioMunicipioInput ? veterinarioMunicipioInput.value.trim() : "",
                contato: veterinarioContatoInput ? veterinarioContatoInput.value.trim() : ""
            },
            dataRecebimento: new Date(dataInput.value),
            observacoes: observacoesInput ? observacoesInput.value.trim() : "",
            status: "pendente",
            criadoEm: Timestamp.now(),
            criadoPor: user.uid,
            siglaResponsavel: await getSiglaUsuario(user)
        };

        // Validate required data
        if (!novaTarefa.id) throw new Error("ID é obrigatório");
        if (isNaN(novaTarefa.quantidade)) throw new Error("Quantidade inválida");
        if (novaTarefa.quantidade <= 0) throw new Error("Quantidade deve ser maior que zero");

        // Add to Firestore
        await addDoc(collection(db, "tarefas"), {
            ...novaTarefa,
            dataRecebimento: Timestamp.fromDate(novaTarefa.dataRecebimento)
        });

        esconderFormulario();
        carregarTarefas();
        mostrarFeedback("Tarefa adicionada com sucesso!", "success");
    } catch (error) {
        console.error("Erro ao adicionar tarefa:", error);
        mostrarFeedback(`Erro: ${error.message}`, "error");
    } finally {
        esconderLoading();
    }
}

// Função para carregar tarefas
async function carregarTarefas(filtro = "Todos", ordem = "recentes") {
    mostrarLoading();
    const muralList = document.getElementById("mural-list");
    muralList.innerHTML = "<p>Carregando tarefas...</p>";

    try {
        const user = auth.currentUser;
        if (!user) throw new Error("Usuário não autenticado");

        let q;
        if (filtro === "Todos") {
            q = query(
                collection(db, "tarefas"),
                orderBy("criadoEm", ordem === "recentes" ? "desc" : "asc")
            );
        } else {
            q = query(
                collection(db, "tarefas"),
                where("tipo", "==", filtro),
                orderBy("criadoEm", ordem === "recentes" ? "desc" : "asc")
            );
        }

        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            muralList.innerHTML = "<p>Nenhuma tarefa encontrada.</p>";
            return;
        }

        muralList.innerHTML = "";
        querySnapshot.forEach((doc) => {
            const tarefa = doc.data();
            const dataRecebimento = tarefa.dataRecebimento?.toDate
                ? formatarDataParaExibicao(tarefa.dataRecebimento.toDate())
                : "Data não disponível";

            const statusClass = tarefa.status === 'em-progresso' ? 'em-progresso' : '';
            
            // Fix the check for PCR tasks
            const showResultsButton = tarefa.tipo === "SN IBR" || 
                                    tarefa.tipo === "SN BVDV" || 
                                    tarefa.tipo === "ELISA LEUCOSE" ||
                                    tarefa.tipo === "ELISA BVDV" ||
                                    tarefa.tipo === "PCR" ||
                                    tarefa.tipo === "RAIVA" ||
                                    tarefa.tipo === "ICC";

            const amostraItem = document.createElement("div");
            amostraItem.className = `amostra-item ${statusClass}`;
            amostraItem.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <strong>ID:</strong> ${tarefa.id}<br>
                        <strong>Tipo:</strong> ${tarefa.tipo}${(tarefa.tipo === "PCR" || tarefa.tipo === "RAIVA") && tarefa.complemento ? ` ${tarefa.complemento}` : ''}<br>
                        <strong>Quantidade:</strong> ${tarefa.quantidade || '0'}<br>
                        <strong>Recebimento:</strong> ${dataRecebimento}
                    </div>
                    <div class="status-buttons">
                        <button class="btn-progresso" onclick="marcarProgresso('${doc.id}')">Progresso</button>
                        <button class="btn-concluido" onclick="concluirTarefa('${doc.id}')">Concluir</button>
                        ${showResultsButton ? `
                            <button class="btn-resultado" onclick="registrarResultado('${doc.id}')">Resultados</button>
                        ` : ''}
                        
                        <div class="actions-dropdown">
                            <button class="dropdown-toggle">Mais</button>
                            <div class="dropdown-content">
                                <button onclick="mostrarDetalhes('${doc.id}')">Detalhes</button>
                                <button onclick="editarTarefa('${doc.id}')">Editar</button>
                                <button onclick="excluirTarefa('${doc.id}')">Excluir</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            muralList.appendChild(amostraItem);
        });

        // Adiciona eventos para o dropdown em mobile
        document.querySelectorAll('.dropdown-toggle').forEach(toggle => {
            toggle.addEventListener('click', function(e) {
                e.stopPropagation();
                const dropdown = this.closest('.actions-dropdown');
                
                document.querySelectorAll('.actions-dropdown').forEach(d => {
                    if (d !== dropdown) d.classList.remove('active');
                });
                
                dropdown.classList.toggle('active');
            });
        });

        // Fecha dropdowns ao clicar fora
        document.addEventListener('click', function(e) {
            if (!e.target.closest('.actions-dropdown')) {
                document.querySelectorAll('.actions-dropdown').forEach(d => {
                    d.classList.remove('active');
                });
            }
        });

        // Fecha ao rolar a página
        window.addEventListener('scroll', function() {
            document.querySelectorAll('.actions-dropdown').forEach(dropdown => {
                dropdown.classList.remove('active');
            });
        });

        // Adiciona hover apenas para desktop
        if (window.innerWidth > 480) {
            document.querySelectorAll('.amostra-item').forEach(item => {
                item.addEventListener('mouseenter', function() {
                    this.style.zIndex = '11';
                });
                
                item.addEventListener('mouseleave', function() {
                    this.style.zIndex = '';
                    const dropdown = this.querySelector('.actions-dropdown');
                    if (dropdown) dropdown.classList.remove('active');
                });
            });
            
            document.querySelectorAll('.dropdown-content').forEach(dropdown => {
                dropdown.addEventListener('mouseleave', function() {
                    this.closest('.actions-dropdown').classList.remove('active');
                });
            });
        }

    } catch (error) {
        console.error("Erro ao carregar tarefas:", error);
        muralList.innerHTML = `
            <p class="error">Erro ao carregar tarefas: ${error.message}</p>
            <p>Verifique o console para mais detalhes.</p>
        `;
    } finally {
        esconderLoading();
    }
}

// Make it available globally
window.carregarTarefas = carregarTarefas;

// Funções globais
window.marcarProgresso = async (id) => {
  try {
    const tarefaRef = doc(db, "tarefas", id);
    const tarefaSnap = await getDoc(tarefaRef);
    
    if (!tarefaSnap.exists()) throw new Error("Tarefa não encontrada");
    
    const tarefa = tarefaSnap.data();
    const novoStatus = tarefa.status === 'em-progresso' ? 'pendente' : 'em-progresso';
    
    await updateDoc(tarefaRef, { 
      status: novoStatus,
      atualizadoEm: Timestamp.now()
    });
    
    carregarTarefas(document.getElementById("filtro-tipo").value);
    mostrarFeedback(`Tarefa marcada como ${novoStatus === 'em-progresso' ? 'em progresso' : 'pendente'}`, "success");
  } catch (error) {
    console.error("Erro ao atualizar status:", error);
    mostrarFeedback(`Erro: ${error.message}`, "error");
  }
};

window.concluirTarefa = async (id) => {
  try {
    if (!confirm("Tem certeza que deseja concluir esta tarefa?")) return;
    mostrarLoading();
    
    const tarefaRef = doc(db, "tarefas", id);
    const tarefaSnap = await getDoc(tarefaRef);
    
    if (!tarefaSnap.exists()) throw new Error("Tarefa não encontrada");
    
    const tarefa = tarefaSnap.data();
    await addDoc(collection(db, "historico"), {
      ...tarefa,
      dataConclusao: Timestamp.now(),
      concluidoPor: auth.currentUser.uid
    });
    
    await deleteDoc(tarefaRef);
    carregarTarefas();
    mostrarFeedback("Tarefa concluída com sucesso!", "success");
  } catch (error) {
    console.error("Erro ao concluir:", error);
    mostrarFeedback(`Erro: ${error.message}`, "error");
  } finally {
    esconderLoading();
  }
};

window.excluirTarefa = async (id) => {
  try {
    if (!confirm("Tem certeza que deseja excluir esta tarefa?")) return;
    mostrarLoading();
    
    await deleteDoc(doc(db, "tarefas", id));
    carregarTarefas();
    mostrarFeedback("Tarefa excluída com sucesso!", "success");
  } catch (error) {
    console.error("Erro ao excluir:", error);
    mostrarFeedback(`Erro: ${error.message}`, "error");
  } finally {
    esconderLoading();
  }
};

window.editarTarefa = async (id) => {
  try {
    mostrarLoading();
    const tarefaRef = doc(db, "tarefas", id);
    const tarefaSnap = await getDoc(tarefaRef);
    
    if (!tarefaSnap.exists()) throw new Error("Tarefa não encontrada");
    
    const tarefa = tarefaSnap.data();
    document.getElementById("id").value = tarefa.id;
    document.getElementById("tipo").value = tarefa.tipo;
    document.getElementById("quantidade").value = tarefa.quantidade;
    
    // Mostrar/ocultar campos condicionais
    const tipo = tarefa.tipo;
    if (tipo === "VACINA") {
      document.getElementById("gramatura-container").style.display = "block";
      document.getElementById("gramatura").value = tarefa.gramatura || "";
    } else {
      document.getElementById("gramatura-container").style.display = "none";
    }
    
    if (tipo === "PCR" || tipo === "RAIVA") {
      document.getElementById("complemento-container").style.display = "block";
      document.getElementById("complemento").value = tarefa.complemento || "";
    } else {
      document.getElementById("complemento-container").style.display = "none";
    }
    
    const dataRecebimento = tarefa.dataRecebimento?.toDate();
    if (dataRecebimento) {
      const dataLocal = new Date(dataRecebimento.getTime() - dataRecebimento.getTimezoneOffset() * 60000);
      document.getElementById("data").value = dataLocal.toISOString().split("T")[0];
    }
    
    document.getElementById("observacoes").value = tarefa.observacoes || "";

    if (tarefa.proprietario) {
        document.getElementById("proprietario-nome").value = tarefa.proprietario.nome || "";
        document.getElementById("proprietario-municipio").value = tarefa.proprietario.municipio || "";
        document.getElementById("proprietario-contato").value = tarefa.proprietario.contato || "";
    }
    
    if (tarefa.veterinario) {
        document.getElementById("veterinario-nome").value = tarefa.veterinario.nome || "";
        document.getElementById("veterinario-municipio").value = tarefa.veterinario.municipio || "";
        document.getElementById("veterinario-contato").value = tarefa.veterinario.contato || "";
    }

    mostrarFormulario(true);
    
    document.getElementById("mural-form").onsubmit = async (e) => {
      e.preventDefault();
      try {
        mostrarLoading();
        
        const dataInput = document.getElementById("data").value;
        const dataLocal = new Date(dataInput);
        const dataUTC = new Date(dataLocal.getTime() + dataLocal.getTimezoneOffset() * 60000);
        
        await updateDoc(tarefaRef, {
          id: document.getElementById("id").value,
          tipo: document.getElementById("tipo").value,
          quantidade: parseInt(document.getElementById("quantidade").value),
          gramatura: document.getElementById("tipo").value === "VACINA" 
                    ? (document.getElementById("gramatura").value 
                       ? parseFloat(document.getElementById("gramatura").value) 
                       : null)
                    : null,
          complemento: (document.getElementById("tipo").value === "PCR" || 
                       document.getElementById("tipo").value === "RAIVA")
                    ? document.getElementById("complemento").value.trim()
                    : null,
          proprietario: {
            nome: document.getElementById("proprietario-nome").value.trim(),
            municipio: document.getElementById("proprietario-municipio").value.trim(),
            contato: document.getElementById("proprietario-contato").value.trim()
          },
          veterinario: {
            nome: document.getElementById("veterinario-nome").value.trim(),
            municipio: document.getElementById("veterinario-municipio").value.trim(),
            contato: document.getElementById("veterinario-contato").value.trim()
          },
          dataRecebimento: Timestamp.fromDate(dataUTC),
          atualizadoEm: Timestamp.now(),
          observacoes: document.getElementById("observacoes").value.trim()
        });
        
        esconderFormulario();
        carregarTarefas();
        mostrarFeedback("Tarefa atualizada com sucesso!", "success");
      } catch (error) {
        console.error("Erro ao atualizar:", error);
        mostrarFeedback(`Erro: ${error.message}`, "error");
      } finally {
        esconderLoading();
      }
    };
  } catch (error) {
    console.error("Erro ao editar:", error);
    mostrarFeedback(`Erro: ${error.message}`, "error");
  } finally {
    esconderLoading();
  }
};

window.mostrarDetalhes = async (id) => {
  try {
      mostrarLoading();
      const docRef = doc(db, "tarefas", id);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) throw new Error("Tarefa não encontrada");
      
      const tarefa = docSnap.data();
      let siglaUsuario = "N/A";
    
      if (tarefa.siglaResponsavel && tarefa.siglaResponsavel !== "N/A") {
          siglaUsuario = tarefa.siglaResponsavel;
          console.log("Usando sigla existente:", siglaUsuario);
      } else if (tarefa.criadoPor) {
          try {
              console.log("Buscando usuário:", tarefa.criadoPor);
              const userRef = doc(db, "usuarios", tarefa.criadoPor);
              const userSnap = await getDoc(userRef);
              console.log("Usuário existe:", userSnap.exists());
              
              if (userSnap.exists()) {
                  const userData = userSnap.data();
                  console.log("Dados do usuário:", userData);
                  siglaUsuario = userData.sigla || "N/A";
                  console.log("Sigla encontrada:", siglaUsuario);
                  
                  // Apenas atualize se encontrar uma sigla válida
                  if (siglaUsuario !== "N/A") {
                      await updateDoc(docRef, {
                          siglaResponsavel: siglaUsuario
                      });
                  }
              }
          } catch (userError) {
              console.error("Error fetching user:", userError);
          }
      }

      const dataRecebimento = tarefa.dataRecebimento?.toDate 
          ? formatarDataParaExibicao(tarefa.dataRecebimento.toDate())
          : "Data não disponível";

      // Create modal structure
      const modal = document.createElement("div");
      modal.id = "modal-detalhes";
      modal.style.cssText = `
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0,0,0,0.5);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
      `;

      // Handle both old and new task formats
      const proprietarioNome = typeof tarefa.proprietario === 'object' 
          ? tarefa.proprietario?.nome || 'N/A'
          : tarefa.proprietario || 'N/A';

      const veterinarioNome = typeof tarefa.veterinario === 'object'
          ? tarefa.veterinario?.nome || 'N/A'
          : tarefa.veterinario || 'N/A';

      const modalContent = document.createElement("div");
      modalContent.style.cssText = `
          background: white;
          padding: 25px;
          border-radius: 10px;
          max-width: 90%;
          max-height: 90vh;
          overflow-y: auto;
          width: 500px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          position: relative;
      `;

      modalContent.innerHTML = `
          <h3 style="margin-bottom: 15px; margin-top: 0px; color: #1b5e20;">Detalhes da Tarefa</h3>
          
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
              <span>${proprietarioNome}</span>
          </div>

          <div style="margin-bottom: 15px;">
              <strong style="display: inline-block; width: 120px;">Veterinário:</strong>
              <span>${veterinarioNome}</span>
          </div>
          
          <div style="margin-bottom: 15px;">
              <strong style="display: inline-block; width: 120px;">Recebimento:</strong>
              <span>${dataRecebimento}</span>
          </div>
          
          <div style="margin-bottom: 15px;">
              <strong style="display: inline-block; width: 120px;">Status:</strong>
              <span>${tarefa.status === 'em-progresso' ? 'Em Progresso' : 'Pendente'}</span>
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
      `;

      modal.appendChild(modalContent);
      document.body.appendChild(modal);

      // Add event listeners
      document.getElementById("fechar-modal").onclick = () => {
          document.body.removeChild(modal);
      };

      modal.onclick = (e) => {
          if (e.target === modal) {
              document.body.removeChild(modal);
          }
      };

      document.addEventListener("keydown", (e) => {
          if (e.key === "Escape") document.body.removeChild(modal);
      });

  } catch (error) {
      console.error("Erro ao mostrar detalhes:", error);
      mostrarFeedback(`Erro: ${error.message}`, "error");
  } finally {
      esconderLoading();
  }
};

async function carregarProprietariosSugeridos() {
  try {
    const proprietariosRef = collection(db, "proprietarios");
    const querySnapshot = await getDocs(proprietariosRef);
    const datalist = document.getElementById("proprietarios-list");
    
    // Limpa a lista atual
    datalist.innerHTML = "";
    
    // Adiciona cada proprietário como uma opção
    querySnapshot.forEach((doc) => {
      const proprietario = doc.data().nome;
      const option = document.createElement("option");
      option.value = proprietario;
      datalist.appendChild(option);
    });
  } catch (error) {
    console.error("Erro ao carregar proprietários:", error);
  }
}

// Inicialização
document.addEventListener("DOMContentLoaded", () => {
  // Event Listeners
  document.getElementById("adicionar-tarefa").onclick = () => mostrarFormulario();
  document.getElementById("cancelar-tarefa").onclick = esconderFormulario;
  
  document.getElementById("tipo").addEventListener("change", function() {

    const showGramatura = this.value === "VACINA";
    document.getElementById("gramatura-container").style.display = showGramatura ? "block" : "none";

    const showComplemento = this.value === "PCR" || this.value === "RAIVA";
    const complementoContainer = document.getElementById("complemento-container");
    complementoContainer.style.display = showComplemento ? "block" : "none";
    document.getElementById("complemento").required = showComplemento;
  });

  document.getElementById("filtro-ordem").addEventListener("change", (e) => {
    const filtroTipo = document.getElementById("filtro-tipo").value;
    carregarTarefas(filtroTipo, e.target.value);
  });

  document.getElementById("filtro-tipo").addEventListener("change", (e) => {
    const ordem = document.getElementById("filtro-ordem").value;
    carregarTarefas(e.target.value, ordem);
  });

  document.getElementById("hub-button").onclick = () => {
    window.location.href = "hub.html";
  };

  document.getElementById("historico-button").onclick = () => {
    window.location.href = "historico.html";
  };

  // Autenticação
  onAuthStateChanged(auth, (user) => {
    if (user) {
      console.log("Usuário autenticado:", user.uid);
      carregarProprietariosSugeridos(); // Adicione esta linha
      carregarTarefas();
    } else {
      console.log("Usuário não autenticado.");
      window.location.href = "index.html";
    }
  });
});

window.registrarResultado = async (id) => {
  try {
      mostrarLoading();
      
      const tarefaRef = doc(db, "tarefas", id);
      const tarefaSnap = await getDoc(tarefaRef);
      
      if (!tarefaSnap.exists()) throw new Error("Tarefa não encontrada");
      
      const tarefa = tarefaSnap.data();
      const tipo = (tarefa.tipo || "").trim().toUpperCase();

      if (tipo.includes("ELISA")) { // Updated this line
          await registrarResultadoELISA(id);
          return;
      }
      if (tipo.includes("SN")) {
          await registrarResultadoSN(id);
          return;
      }
      if (tipo.includes("PCR")) {
          await registrarResultadoPCR(id);
          return;
      }
      if (tipo === "RAIVA") {
          await registrarResultadoRAIVA(id);
          return;
      }
      if (tipo === "ICC") {
          await registrarResultadoICC(id);
          return;
      }
      // Se não for nenhum dos tipos acima, exibe mensagem de erro

      mostrarFeedback("Este tipo de tarefa não possui resultados específicos", "error");
  } catch (error) {
      console.error("Erro ao registrar resultado:", error);
      mostrarFeedback(`Erro: ${error.message}`, "error");
  } finally {
      esconderLoading();
  }
};