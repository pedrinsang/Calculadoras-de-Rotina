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

// Substitua suas funções de loading com estas:
export function mostrarLoading() {
    const loading = document.getElementById("loading");
    if (loading) {
        loading.style.display = "flex";
    } else {
        // Cria o loading dinamicamente se não existir
        const loadingDiv = document.createElement("div");
        loadingDiv.id = "loading";
        loadingDiv.className = "position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center";
        loadingDiv.style.background = "rgba(0,0,0,0.2)";
        loadingDiv.style.zIndex = "1050";
        
        loadingDiv.innerHTML = `
            <div style="background: white; padding: 20px; border-radius: 10px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
                <div class="spinner" style="border: 4px solid #f3f3f3; border-radius: 50%; border-top: 4px solid #2e7d32; width: 30px; height: 30px; animation: spin 1s linear infinite; display: inline-block; vertical-align: middle; margin-right: 10px;"></div>
                <span style="color: #2e7d32; font-weight: bold;">Carregando...</span>
            </div>
        `;
        
        document.body.appendChild(loadingDiv);
        
        // Adiciona a animação do spinner
        const style = document.createElement('style');
        style.textContent = `
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
    }
}

export function esconderLoading() {
    const loadings = document.querySelectorAll('#loading');
    loadings.forEach(loading => {
        loading.remove(); // REMOVE completamente em vez de esconder
    });
}

export function mostrarFeedback(mensagem, tipo = "success") {
    const feedback = document.getElementById("feedback");
    if (!feedback) return;
    
    const alert = document.createElement("div");
    alert.className = `alert alert-${tipo} alert-dismissible fade show`;
    alert.role = "alert";
    
    alert.innerHTML = `
        ${mensagem}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    feedback.appendChild(alert);
    
    setTimeout(() => {
        alert.classList.remove("show");
        setTimeout(() => alert.remove(), 150);
    }, 5000);
}

function mostrarFormulario(edicao = false) {
    const form = document.getElementById("mural-form");
    const muralList = document.getElementById("mural-list");
    const adicionarTarefaBtn = document.getElementById("adicionar-tarefa");
    const filtrosWrapper = document.querySelector(".filtros-wrapper");
    
    if (form) form.style.display = "block";
    if (muralList) muralList.style.display = "none";
    if (adicionarTarefaBtn) adicionarTarefaBtn.style.display = "none";
    if (filtrosWrapper) filtrosWrapper.style.display = "none";
    
    if (!edicao && form) {
        form.reset();
        form.onsubmit = adicionarTarefa;
    }
}

function esconderFormulario() {
    const form = document.getElementById("mural-form");
    const muralList = document.getElementById("mural-list");
    const adicionarTarefaBtn = document.getElementById("adicionar-tarefa");
    const filtrosWrapper = document.querySelector(".filtros-wrapper");
    
    if (form) form.style.display = "none";
    if (muralList) muralList.style.display = "block";
    if (adicionarTarefaBtn) adicionarTarefaBtn.style.display = "inline-block";
    if (filtrosWrapper) filtrosWrapper.style.display = "flex";
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

// Obter sigla do usuário
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
    try {
        const muralList = document.getElementById("mural-list");
        if (!muralList) {
            console.error("Elemento mural-list não encontrado");
            esconderLoading();
            return;
        }

        muralList.innerHTML = "<p>Carregando tarefas...</p>";

        const user = auth.currentUser;
        if (!user) {
            esconderLoading();
            window.location.href = "../index.html";
            return;
        }

        // Verificar conexão com a internet
        if (!navigator.onLine) {
            muralList.innerHTML = '<p class="text-danger">Sem conexão com a internet. Verifique sua conexão e tente novamente.</p>';
            esconderLoading();
            return;
        }

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
            esconderLoading();
            return;
        }

        muralList.innerHTML = "";
        querySnapshot.forEach((doc) => {
            const tarefa = doc.data();
            const dataRecebimento = tarefa.dataRecebimento?.toDate
                ? formatarDataParaExibicao(tarefa.dataRecebimento.toDate())
                : "Data não disponível";

            const statusClass = tarefa.status === 'em-progresso' ? 'em-progresso' : '';
            const concluidoClass = tarefa.status === 'concluido' ? 'concluido' : statusClass;

            const showResultsButton = tarefa.tipo === "SN IBR" || 
                                    tarefa.tipo === "SN BVDV" || 
                                    tarefa.tipo === "ELISA LEUCOSE" ||
                                    tarefa.tipo === "ELISA BVDV" ||
                                    tarefa.tipo === "PCR" ||
                                    tarefa.tipo === "RAIVA" ||
                                    tarefa.tipo === "ICC";

            const amostraItem = document.createElement("div");
            amostraItem.className = `card mb-4 shadow-sm ${concluidoClass}`;
            amostraItem.innerHTML = `
  <div class="card-body">
    <div class="d-flex justify-content-between align-items-center flex-wrap">
      <div class="mb-2">
        <h5 class="card-title mb-1 text-success fw-bold">${tarefa.id}</h5>
        <div class="mb-1"><span class="fw-medium">Tipo:</span> ${tarefa.tipo}${(tarefa.tipo === "PCR" || tarefa.tipo === "RAIVA") && tarefa.complemento ? ` ${tarefa.complemento}` : ''}</div>
        <div class="mb-1"><span class="fw-medium">Quantidade:</span> ${tarefa.quantidade || '0'}</div>
        <div><span class="fw-medium">Recebimento:</span> ${dataRecebimento}</div>
      </div>
      <div class="d-flex gap-2">
        <div class="btn-group">
          <button class="btn btn-primary btn-sm btn-progresso" data-id="${doc.id}">
            <i class="bi bi-arrow-clockwise me-1"></i>Progresso
          </button>
          <button class="btn btn-success btn-sm btn-concluir" data-id="${doc.id}">
            <i class="bi bi-check2-all me-1"></i>Concluir
          </button>
          ${showResultsButton ? `<button class="btn btn-warning btn-sm text-white btn-resultados" data-id="${doc.id}">
            <i class="bi bi-clipboard-data me-1"></i>Resultados
          </button>` : ''}
          <div class="btn-group">
            <button type="button" class="btn btn-purple btn-sm dropdown-toggle" 
                    style="background-color: #6f42c1; color: white;" 
                    data-bs-toggle="dropdown" aria-expanded="false">
              <i class="bi bi-three-dots-vertical"></i> Mais
            </button>
            <ul class="dropdown-menu dropdown-menu-end">
              <li><a class="dropdown-item btn-detalhes" href="#" data-id="${doc.id}">
                <i class="bi bi-info-circle me-2"></i>Detalhes</a></li>
              <li><a class="dropdown-item btn-editar" href="#" data-id="${doc.id}">
                <i class="bi bi-pencil-square me-2"></i>Editar</a></li>
              <li><hr class="dropdown-divider"></li>
              <li><a class="dropdown-item text-danger btn-excluir" href="#" data-id="${doc.id}">
                <i class="bi bi-trash3 me-2"></i>Excluir</a></li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </div>
`;
            muralList.appendChild(amostraItem);
        });

        // Adiciona event listeners para os botões
        document.querySelectorAll('.btn-progresso').forEach(btn => {
            btn.addEventListener('click', () => window.marcarProgresso(btn.dataset.id));
        });

        document.querySelectorAll('.btn-concluir').forEach(btn => {
            btn.addEventListener('click', () => window.concluirTarefa(btn.dataset.id));
        });

        document.querySelectorAll('.btn-resultados').forEach(btn => {
            btn.addEventListener('click', () => window.registrarResultado(btn.dataset.id));
        });

        document.querySelectorAll('.btn-detalhes').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                window.mostrarDetalhes(btn.dataset.id);
            });
        });

        document.querySelectorAll('.btn-editar').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                window.editarTarefa(btn.dataset.id);
            });
        });

        document.querySelectorAll('.btn-excluir').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                window.excluirTarefa(btn.dataset.id);
            });
        });

    } catch (error) {
        console.error("Erro ao carregar tarefas:", error);
        const muralList = document.getElementById("mural-list");
        if (muralList) {
            muralList.innerHTML = `
                <p class="text-danger">Erro ao carregar tarefas: ${error.message}</p>
                <p>Verifique o console para mais detalhes.</p>
            `;
        }
    } finally {
        esconderLoading();
    }
}

// Expor funções no objeto window para acessibilidade
window.carregarTarefas = carregarTarefas;

// Função para marcar progresso
window.marcarProgresso = async (id) => {
    mostrarLoading();
    try {
        const tarefaRef = doc(db, "tarefas", id);
        const tarefaSnap = await getDoc(tarefaRef);
        
        if (!tarefaSnap.exists()) throw new Error("Tarefa não encontrada");
        
        const tarefa = tarefaSnap.data();
        const novoStatus = tarefa.status === 'em-progresso' ? 'pendente' : 'em-progresso';
        
        // Atualiza o card imediatamente na UI
        const cardElement = document.querySelector(`[data-id="${id}"]`).closest('.card');
        if (cardElement) {
            if (novoStatus === 'em-progresso') {
                cardElement.classList.add('em-progresso');
            } else {
                cardElement.classList.remove('em-progresso');
            }
        }
        
        // Salva no Firestore
        await updateDoc(tarefaRef, { 
            status: novoStatus,
            atualizadoEm: Timestamp.now()
        });
        
        mostrarFeedback(`Tarefa marcada como ${novoStatus === 'em-progresso' ? 'em progresso' : 'pendente'}`, "success");
    } catch (error) {
        console.error("Erro ao atualizar status:", error);
        mostrarFeedback(`Erro: ${error.message}`, "error");
    } finally {
        esconderLoading();
    }
};

// Função para concluir tarefa
window.concluirTarefa = async (id) => {
    if (!confirm("Tem certeza que deseja concluir esta tarefa?")) return;
    
    mostrarLoading();
    try {
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

// Função para excluir tarefa
window.excluirTarefa = async (id) => {
    if (!confirm("Tem certeza que deseja excluir esta tarefa?")) return;
    
    mostrarLoading();
    try {
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

// Função para editar tarefa
window.editarTarefa = async (id) => {
    mostrarLoading();
    try {
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

// Função para mostrar detalhes da tarefa
window.mostrarDetalhes = async (id) => {
    mostrarLoading();
    try {
        const docRef = doc(db, "tarefas", id);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) throw new Error("Tarefa não encontrada");
        
        const tarefa = docSnap.data();
        let siglaUsuario = "N/A";
        
        if (tarefa.siglaResponsavel && tarefa.siglaResponsavel !== "N/A") {
            siglaUsuario = tarefa.siglaResponsavel;
        } else if (tarefa.criadoPor) {
            try {
                const userRef = doc(db, "usuarios", tarefa.criadoPor);
                const userSnap = await getDoc(userRef);
                
                if (userSnap.exists()) {
                    const userData = userSnap.data();
                    siglaUsuario = userData.sigla || "N/A";
                    
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

        // Remove existing modal if present
        let modalElement = document.getElementById("modal-detalhes");
        if (modalElement) {
            modalElement.remove();
        }
        
        // Sempre usar o layout vertical para todas as resoluções
        const modalBody = `
            <div class="detalhe-item">
                <div class="detalhe-label">ID:</div>
                <div class="detalhe-valor">${tarefa.id || 'N/A'}</div>
            </div>
            
            <div class="detalhe-item">
                <div class="detalhe-label">Tipo:</div>
                <div class="detalhe-valor">${tarefa.tipo || 'N/A'}</div>
            </div>

            <div class="detalhe-item">
                <div class="detalhe-label">Responsável:</div>
                <div class="detalhe-valor">${siglaUsuario}</div>
            </div>

            <div class="detalhe-item">
                <div class="detalhe-label">Quantidade:</div>
                <div class="detalhe-valor">${tarefa.quantidade || '0'} ${tarefa.tipo === "VACINA" 
                    ? `vacinas${tarefa.gramatura ? ` (${tarefa.gramatura}g)` : ''}` 
                    : "amostras"}</div>
            </div>

            ${tarefa.complemento ? `
            <div class="detalhe-item">
                <div class="detalhe-label">Complemento:</div>
                <div class="detalhe-valor">${tarefa.complemento.trim()}</div>
            </div>` : ''}

            <div class="detalhe-item">
                <div class="detalhe-label">Proprietário:</div>
                <div class="detalhe-valor">${typeof tarefa.proprietario === 'object' 
                    ? tarefa.proprietario?.nome || 'N/A'
                    : tarefa.proprietario || 'N/A'}</div>
            </div>
            
            <div class="detalhe-item">
                <div class="detalhe-label">Veterinário:</div>
                <div class="detalhe-valor">${typeof tarefa.veterinario === 'object'
                    ? tarefa.veterinario?.nome || 'N/A'
                    : tarefa.veterinario || 'N/A'}</div>
            </div>
            
            <div class="detalhe-item">
                <div class="detalhe-label">Recebimento:</div>
                <div class="detalhe-valor">${dataRecebimento}</div>
            </div>
            
            <div class="detalhe-item">
                <div class="detalhe-label">Status:</div>
                <div class="detalhe-valor">${tarefa.status === 'em-progresso' ? 'Em Progresso' : 'Pendente'}</div>
            </div>
            
            ${tarefa.observacoes ? `
            <div class="detalhe-item" style="border-bottom: none;">
                <div class="detalhe-label">Observações:</div>
                <div class="detalhe-valor white-space-pre-line bg-light p-2 rounded">
                    ${tarefa.observacoes.trim()}
                </div>
            </div>` : ''}
        `;
        
        // Create new modal
        const modalHTML = `
            <div class="modal fade" id="modal-detalhes" tabindex="-1" aria-labelledby="detalhesTarefaLabel" aria-hidden="true">
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title text-success" id="detalhesTarefaLabel">Detalhes da Tarefa</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Fechar"></button>
                        </div>
                        <div class="modal-body">
                            ${modalBody}
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Add modal to body
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Show modal using Bootstrap
        if (typeof bootstrap !== 'undefined') {
          const modal = new bootstrap.Modal(document.getElementById('modal-detalhes'));
          modal.show();
        } else {
          console.error("Bootstrap não está disponível!");
          // Alternativa simples sem Bootstrap
          document.getElementById('modal-detalhes').style.display = 'block';
        }

    } catch (error) {
        console.error("Erro ao mostrar detalhes:", error);
        mostrarFeedback(`Erro: ${error.message}`, "error");
    } finally {
        esconderLoading();
    }
};

// Função para registrar resultados
window.registrarResultado = async (id) => {
    mostrarLoading();
    try {
        const tarefaRef = doc(db, "tarefas", id);
        const tarefaSnap = await getDoc(tarefaRef);
        
        if (!tarefaSnap.exists()) throw new Error("Tarefa não encontrada");
        
        const tarefa = tarefaSnap.data();
        const tipo = (tarefa.tipo || "").trim().toUpperCase();

        if (tipo.includes("ELISA")) {
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

        mostrarFeedback("Este tipo de tarefa não possui resultados específicos", "error");
    } catch (error) {
        console.error("Erro ao registrar resultado:", error);
        mostrarFeedback(`Erro: ${error.message}`, "error");
    } finally {
        esconderLoading();
    }
};

// Função para carregar proprietários sugeridos
async function carregarProprietariosSugeridos() {
    try {
        const proprietariosRef = collection(db, "proprietarios");
        const querySnapshot = await getDocs(proprietariosRef);
        const datalist = document.getElementById("proprietarios-list");
        
        if (!datalist) return;
        
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
    try {
        // Proteção contra loading infinito
        setTimeout(() => {
            const loading = document.getElementById("loading");
            if (loading && loading.style.display === "flex") {
                console.warn("Loading timeout - forçando ocultação");
                loading.style.display = "none";
            }
        }, 10000); // 10 segundos de timeout
        
        // Verificar elementos antes de adicionar event listeners
        const adicionarTarefaBtn = document.getElementById("adicionar-tarefa");
        const cancelarTarefaBtn = document.getElementById("cancelar-tarefa");
        const tipoInput = document.getElementById("tipo");
        const filtroOrdemSelect = document.getElementById("filtro-ordem");
        const filtroTipoSelect = document.getElementById("filtro-tipo");
        const hubBtn = document.getElementById("hub-button");
        const historicoBtn = document.getElementById("historico-button");
        
        if (adicionarTarefaBtn) {
            adicionarTarefaBtn.addEventListener('click', () => mostrarFormulario());
        }
        
        if (cancelarTarefaBtn) {
            cancelarTarefaBtn.addEventListener('click', esconderFormulario);
        }
        
        if (tipoInput) {
            tipoInput.addEventListener("change", function() {
                const showGramatura = this.value === "VACINA";
                const gramaturaContainer = document.getElementById("gramatura-container");
                if (gramaturaContainer) {
                    gramaturaContainer.style.display = showGramatura ? "block" : "none";
                }

                const showComplemento = this.value === "PCR" || this.value === "RAIVA";
                const complementoContainer = document.getElementById("complemento-container");
                if (complementoContainer) {
                    complementoContainer.style.display = showComplemento ? "block" : "none";
                }
                
                const complementoInput = document.getElementById("complemento");
                if (complementoInput) {
                    complementoInput.required = showComplemento;
                }
            });
        }
        
        if (filtroOrdemSelect) {
            filtroOrdemSelect.addEventListener("change", (e) => {
                const filtroTipo = filtroTipoSelect ? filtroTipoSelect.value : "Todos";
                carregarTarefas(filtroTipo, e.target.value);
            });
        }
        
        if (filtroTipoSelect) {
            filtroTipoSelect.addEventListener("change", (e) => {
                const ordem = filtroOrdemSelect ? filtroOrdemSelect.value : "recentes";
                carregarTarefas(e.target.value, ordem);
            });
        }
        
        if (hubBtn) {
            hubBtn.addEventListener('click', () => {
                window.location.href = "hub.html";
            });
        }
        
        if (historicoBtn) {
            historicoBtn.addEventListener('click', () => {
                window.location.href = "historico.html";
            });
        }

        // Inicializar autenticação e carregar dados
        mostrarLoading();
        onAuthStateChanged(auth, (user) => {
            try {
                if (user) {
                    Promise.all([
                        carregarProprietariosSugeridos(),
                        carregarTarefas()
                    ]).catch(error => {
                        console.error("Erro na inicialização:", error);
                        esconderLoading();
                    });
                } else {
                    esconderLoading();
                    window.location.href = "../index.html";
                }
            } catch (error) {
                console.error("Erro na verificação de autenticação:", error);
                esconderLoading();
            }
        });
    } catch (error) {
        console.error("Erro na inicialização:", error);
        esconderLoading(); // Garante que o loading será ocultado mesmo com erro
    }
});