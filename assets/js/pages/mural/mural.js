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
async function adicionarTarefaModal() {
    mostrarLoading();
  
    try {
        const user = auth.currentUser;
        if (!user) throw new Error("Usuário não autenticado");

        // Get form elements from modal
        const idInput = document.getElementById("id-modal");
        const tipoInput = document.getElementById("tipo-modal");
        const quantidadeInput = document.getElementById("quantidade-modal");
        const gramaturaInput = document.getElementById("gramatura-modal");
        const complementoInput = document.getElementById("complemento-modal");
        const dataInput = document.getElementById("data-modal");
        const proprietarioNomeInput = document.getElementById("proprietario-nome-modal");
        const proprietarioMunicipioInput = document.getElementById("proprietario-municipio-modal");
        const proprietarioContatoInput = document.getElementById("proprietario-contato-modal");
        const veterinarioNomeInput = document.getElementById("veterinario-nome-modal");
        const veterinarioMunicipioInput = document.getElementById("veterinario-municipio-modal");
        const veterinarioContatoInput = document.getElementById("veterinario-contato-modal");
        const observacoesInput = document.getElementById("observacoes-modal");

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

        // Fechar o modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('tarefa-modal'));
        if (modal) modal.hide();
        
        carregarTarefas();
        mostrarFeedback("Tarefa adicionada com sucesso!", "success");
    } catch (error) {
        console.error("Erro ao adicionar tarefa:", error);
        mostrarFeedback(`Erro: ${error.message}`, "error");
    } finally {
        esconderLoading();
    }
}

// Função para preparar o modal para adicionar tarefa
function prepararModalAdicao() {
    const modal = document.getElementById('tarefa-modal');
    const modalTitle = modal.querySelector('.modal-title');
    const form = document.getElementById('mural-form-modal');
    
    // Configurar título
    modalTitle.innerHTML = '<i class="bi bi-plus-circle"></i> Nova Tarefa';
    
    // Resetar formulário
    form.reset();
    
    // Configurar o botão salvar para adicionar tarefa
    document.getElementById('salvar-tarefa-modal').onclick = adicionarTarefaModal;
    
    // Datas para hoje
    document.getElementById('data-modal').valueAsDate = new Date();
    
    // Ajustar campos condicionais
    const tipoValue = document.getElementById('tipo-modal').value;
    document.getElementById('gramatura-container-modal').style.display = 
        tipoValue === "VACINA" ? "block" : "none";
    document.getElementById('complemento-container-modal').style.display = 
        (tipoValue === "PCR" || tipoValue === "RAIVA") ? "block" : "none";
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

        // Substitua a parte do filtro na função carregarTarefas

        let q;
        if (filtro === "Todos") {
            q = query(
                collection(db, "tarefas"),
                orderBy("criadoEm", ordem === "recentes" ? "desc" : "asc")
            );
        } else if (filtro === "SN BVDV-1") {
            // Consulta especial para SN BVDV-1 que também inclui SN BVDV
            q = query(
                collection(db, "tarefas"),
                where("tipo", "in", ["SN BVDV-1", "SN BVDV"]),
                orderBy("criadoEm", ordem === "recentes" ? "desc" : "asc")
            );
        } else {
            // Consulta normal para outros tipos
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
                                    tarefa.tipo === "SN BVDV-1" ||
                                    tarefa.tipo === "SN BVDV-2" ||
                                    tarefa.tipo === "ELISA LEUCOSE" ||
                                    tarefa.tipo === "ELISA BVDV" ||
                                    tarefa.tipo === "PCR" ||
                                    tarefa.tipo === "RAIVA" ||
                                    tarefa.tipo === "ICC";

            const amostraItem = document.createElement("div");
            amostraItem.className = `card mb-4 shadow-sm ${concluidoClass}`;
            
            // Mantenha a estrutura original de botões
            const botoesHtml = `
              <div class="btn-group">
                <button class="btn btn-sm btn-primary btn-progresso" data-id="${doc.id}">
                  <i class="bi bi-arrow-clockwise me-1"></i><span class="btn-text-original">Progresso</span>
                </button>
                
                <button class="btn btn-sm btn-success btn-concluir" data-id="${doc.id}">
                  <i class="bi bi-check2-all me-1"></i>Concluir
                </button>
                
                ${showResultsButton ? `<button class="btn btn-sm btn-warning text-white btn-resultados" data-id="${doc.id}">
                  <i class="bi bi-clipboard-data me-1"></i>Resultado
                </button>` : ''}
                
                <!-- Dropdown "Mais" substitui os botões Editar e Excluir -->
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
            `;

            // Normalize o tipo para display
            let tipoDisplay = tarefa.tipo;
            if (tipoDisplay === "SN BVDV") {
                tipoDisplay = "SN BVDV-1";
            }

            // E use assim na construção do item
            amostraItem.innerHTML = `
              <div class="card-body">
                <div class="d-flex justify-content-between align-items-center flex-wrap">
                  <div class="mb-2">
                    <h5 class="card-title mb-1 text-success fw-bold">${tarefa.id}</h5>
                    <div class="mb-1"><span class="fw-medium">Tipo:</span> ${tipoDisplay}${(tarefa.tipo === "PCR" || tarefa.tipo === "RAIVA") && tarefa.complemento ? ` ${tarefa.complemento}` : ''}</div>
                    <div class="mb-1"><span class="fw-medium">Quantidade:</span> ${tarefa.quantidade || '0'}</div>
                    <div><span class="fw-medium">Recebimento:</span> ${dataRecebimento}</div>
                  </div>
                </div>
                
                <!-- Botões no formato original -->
                ${botoesHtml}
              </div>
            `;

            muralList.appendChild(amostraItem);
        });

        // Adiciona event listeners para os botões
        document.querySelectorAll('.btn-progresso').forEach(btn => {
            btn.addEventListener('click', async function() {
                // Salvar largura original do botão
                const originalWidth = this.offsetWidth;
                this.style.width = originalWidth + "px";
                
                // Desativar o botão durante a operação
                this.disabled = true;
                
                try {
                    // Chamar a função original
                    await window.marcarProgresso(this.dataset.id);
                    
                    // Atualizar apenas o texto dentro do span
                    const textSpan = this.querySelector('.btn-text-original');
                    if (textSpan) {
                        const tarefaRef = doc(db, "tarefas", this.dataset.id);
                        const tarefaSnap = await getDoc(tarefaRef);
                        
                        
                    }
                } catch (error) {
                    console.error("Erro ao atualizar status:", error);
                } finally {
                    // Reativar o botão
                    this.disabled = false;
                    
                    // Remover largura fixa após um momento
                    setTimeout(() => {
                        this.style.width = "";
                    }, 500);
                }
            });
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

        // Atualize esta parte na função carregarTarefas
        document.querySelectorAll('.btn-editar').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                window.editarTarefaModal(btn.dataset.id);
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

// Atualize a função marcarProgresso
window.marcarProgresso = async (id) => {
    mostrarLoading();
    try {
        // Encontra o botão, seu elemento pai e o card
        const botao = document.querySelector(`button.btn-progresso[data-id="${id}"]`);
        const btnGroup = botao ? botao.closest('.btn-group') : null;
        
        // Impedir layout shifts - fixa toda a largura do grupo de botões
        if (btnGroup) {
            btnGroup.style.width = btnGroup.offsetWidth + 'px';
        }
        
        // Fixa a largura específica do botão
        const larguraOriginal = botao ? botao.offsetWidth : null;
        if (botao) {
            botao.style.width = `${larguraOriginal}px`;
            botao.style.minWidth = `${larguraOriginal}px`;
        }
        
        // O resto da função permanece o mesmo...
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
        
        
        mostrarFeedback(`Tarefa atualizada com sucesso!`, "success");
    } catch (error) {
        console.error("Erro ao atualizar status:", error);
        mostrarFeedback(`Erro: ${error.message}`, "error");
    } finally {
        esconderLoading();
        
        // Restaura layout após um delay
        setTimeout(() => {
            const botao = document.querySelector(`button.btn-progresso[data-id="${id}"]`);
            const btnGroup = botao ? botao.closest('.btn-group') : null;
            
            if (btnGroup) btnGroup.style.width = '';
            if (botao) {
                botao.style.width = '';
                botao.style.minWidth = '';
            }
        }, 500);
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
window.editarTarefaModal = async (id) => {
    mostrarLoading();
    try {
        const tarefaRef = doc(db, "tarefas", id);
        const tarefaSnap = await getDoc(tarefaRef);
        
        if (!tarefaSnap.exists()) throw new Error("Tarefa não encontrada");
        
        const tarefa = tarefaSnap.data();
        const modal = document.getElementById('tarefa-modal');
        const modalTitle = modal.querySelector('.modal-title');
        
        // Configurar título
        modalTitle.innerHTML = '<i class="bi bi-pencil-square"></i> Editar Tarefa';
        
        // Preencher o formulário com dados existentes
        document.getElementById("id-modal").value = tarefa.id;
        document.getElementById("tipo-modal").value = tarefa.tipo;
        document.getElementById("quantidade-modal").value = tarefa.quantidade;
        
        // Mostrar/ocultar campos condicionais
        const tipo = tarefa.tipo;
        if (tipo === "VACINA") {
            document.getElementById("gramatura-container-modal").style.display = "block";
            document.getElementById("gramatura-modal").value = tarefa.gramatura || "";
        } else {
            document.getElementById("gramatura-container-modal").style.display = "none";
        }
        
        if (tipo === "PCR" || tipo === "RAIVA") {
            document.getElementById("complemento-container-modal").style.display = "block";
            document.getElementById("complemento-modal").value = tarefa.complemento || "";
        } else {
            document.getElementById("complemento-container-modal").style.display = "none";
        }
        
        const dataRecebimento = tarefa.dataRecebimento?.toDate();
        if (dataRecebimento) {
            const dataLocal = new Date(dataRecebimento.getTime() - dataRecebimento.getTimezoneOffset() * 60000);
            document.getElementById("data-modal").value = dataLocal.toISOString().split("T")[0];
        }
        
        document.getElementById("observacoes-modal").value = tarefa.observacoes || "";

        if (tarefa.proprietario) {
            document.getElementById("proprietario-nome-modal").value = tarefa.proprietario.nome || "";
            document.getElementById("proprietario-municipio-modal").value = tarefa.proprietario.municipio || "";
            document.getElementById("proprietario-contato-modal").value = tarefa.proprietario.contato || "";
        }
        
        if (tarefa.veterinario) {
            document.getElementById("veterinario-nome-modal").value = tarefa.veterinario.nome || "";
            document.getElementById("veterinario-municipio-modal").value = tarefa.veterinario.municipio || "";
            document.getElementById("veterinario-contato-modal").value = tarefa.veterinario.contato || "";

        }

        // Configurar o botão salvar para atualizar tarefa
        document.getElementById('salvar-tarefa-modal').onclick = async () => {
            try {
                mostrarLoading();
                
                const dataInput = document.getElementById("data-modal").value;
                const dataLocal = new Date(dataInput);
                const dataUTC = new Date(dataLocal.getTime() + dataLocal.getTimezoneOffset() * 60000);
                
                await updateDoc(tarefaRef, {
                    id: document.getElementById("id-modal").value,
                    tipo: document.getElementById("tipo-modal").value,
                    quantidade: parseInt(document.getElementById("quantidade-modal").value),
                    gramatura: document.getElementById("tipo-modal").value === "VACINA" 
                            ? (document.getElementById("gramatura-modal").value 
                            ? parseFloat(document.getElementById("gramatura-modal").value) 
                            : null)
                            : null,
                    complemento: (document.getElementById("tipo-modal").value === "PCR" || 
                            document.getElementById("tipo-modal").value === "RAIVA")
                            ? document.getElementById("complemento-modal").value.trim()
                            : null,
                    proprietario: {
                        nome: document.getElementById("proprietario-nome-modal").value.trim(),
                        municipio: document.getElementById("proprietario-municipio-modal").value.trim(),
                        contato: document.getElementById("proprietario-contato-modal").value.trim()
                    },
                    veterinario: {
                        nome: document.getElementById("veterinario-nome-modal").value.trim(),
                        municipio: document.getElementById("veterinario-municipio-modal").value.trim(),
                        contato: document.getElementById("veterinario-contato-modal").value.trim()
                    },
                    dataRecebimento: Timestamp.fromDate(dataUTC),
                    atualizadoEm: Timestamp.now(),
                    observacoes: document.getElementById("observacoes-modal").value.trim()
                });
                
                // Fechar o modal
                const modal = bootstrap.Modal.getInstance(document.getElementById('tarefa-modal'));
                if (modal) modal.hide();
                
                carregarTarefas();
                mostrarFeedback("Tarefa atualizada com sucesso!", "success");
            } catch (error) {
                console.error("Erro ao atualizar:", error);
                mostrarFeedback(`Erro: ${error.message}`, "error");
            } finally {
                esconderLoading();
            }
        };
        
        // Abrir o modal
        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();
        
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
            // Lógica existente para buscar sigla
            // ...
        }

        const dataRecebimento = tarefa.dataRecebimento?.toDate 
            ? formatarDataParaExibicao(tarefa.dataRecebimento.toDate())
            : "Data não disponível";

        // Remove existing modal if present
        let modalElement = document.getElementById("modal-detalhes");
        if (modalElement) {
            modalElement.remove();
        }
        
        // Status badge with appropriate color
        let statusBadge = "";
        if (tarefa.status === 'em-progresso') {
            statusBadge = '<span class="badge bg-primary">Em Progresso</span>';
        } else if (tarefa.status === 'concluido') {
            statusBadge = '<span class="badge bg-success">Concluído</span>';
        } else {
            statusBadge = '<span class="badge bg-warning text-dark">Pendente</span>';
        }

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
        const datalist = document.getElementById("proprietarios-list-modal");
        
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



// Atualizar inicialização para usar o modal
document.addEventListener("DOMContentLoaded", () => {
    try {
        // Proteção contra loading infinito (recuperada do evento anterior)
        setTimeout(() => {
            const loading = document.getElementById("loading");
            if (loading && loading.style.display === "flex") {
                console.warn("Loading timeout - forçando ocultação");
                loading.style.display = "none";
            }
        }, 10000); // 10 segundos de timeout
        
        // Botões e eventos
        const adicionarTarefaBtn = document.getElementById("adicionar-tarefa");
        const tipoInput = document.getElementById("tipo-modal");
        const filtroOrdemSelect = document.getElementById("filtro-ordem");
        const filtroTipoSelect = document.getElementById("filtro-tipo");
        const hubBtn = document.getElementById("hub-button");
        const historicoBtn = document.getElementById("historico-button");
        
        if (adicionarTarefaBtn) {
            adicionarTarefaBtn.addEventListener('click', () => {
                prepararModalAdicao();
                const modal = new bootstrap.Modal(document.getElementById('tarefa-modal'));
                modal.show();
            });
        }
        
        // Adicione isso dentro do evento DOMContentLoaded

        if (filtroTipoSelect) {
            filtroTipoSelect.addEventListener('change', function() {
                const filtroTipo = this.value;
                const filtroOrdem = document.getElementById("filtro-ordem").value;
                carregarTarefas(filtroTipo, filtroOrdem);
            });
        }

        if (filtroOrdemSelect) {
            filtroOrdemSelect.addEventListener('change', function() {
                const filtroTipo = document.getElementById("filtro-tipo").value;
                const filtroOrdem = this.value;
                carregarTarefas(filtroTipo, filtroOrdem);
            });
        }
        
        
        // Inicializar autenticação e carregar dados (recuperado do primeiro evento)
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

        // Adicionar event listeners para os botões de navegação
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
    } catch (error) {
        console.error("Erro na inicialização:", error);
        esconderLoading();
    }
});

// No modal
document.querySelector("#tarefa-modal .btn-close").addEventListener("click", () => {
  const modal = bootstrap.Modal.getInstance(document.getElementById('tarefa-modal'));
  if (modal) modal.hide();
});

document.querySelector("#tarefa-modal .modal-footer .mural-btn-outline").addEventListener("click", () => {
  const modal = bootstrap.Modal.getInstance(document.getElementById('tarefa-modal'));
  if (modal) modal.hide();
});

window.editarTarefa = async (id) => {
  // Remova referências a mostrarFormulario(true);
  // Substitua por:
  window.editarTarefaModal(id);
};

// Assegurar que as funções do módulo são acessíveis globalmente
window.mostrarFeedback = mostrarFeedback;
window.esconderLoading = esconderLoading;
window.mostrarLoading = mostrarLoading;