// Imports do Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js";
import { 
    getFirestore,
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
} from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js";
import { 
    getAuth,
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";

// Imports locais
import { registrarResultadoSN, registrarResultadoELISA, registrarResultadoMolecular, registrarResultadoRAIVA, registrarResultadoICC} from "./regresultado.js";

// Configuração do Firebase
const firebaseConfig = {
    apiKey: "AIzaSyAJneFO6AYsj5_w3hIKzPGDa8yR6Psng4M",
    authDomain: "hub-de-calculadoras.firebaseapp.com",
    projectId: "hub-de-calculadoras",
    storageBucket: "hub-de-calculadoras.appspot.com",
    messagingSenderId: "203883856586",
    appId: "1:203883856586:web:a00536536a32ae76c5aa33",
    measurementId: "G-7H314CT9SH"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

document.addEventListener('DOMContentLoaded', function() {
    console.log("Desenvolvido por Pedro Ruiz Sangoi e Alexandre Werle Suares, com auxílio do DeepSeek Chat.");
});

// Verificação de usuário ativo/inativo no início
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "../index.html";
        return;
    }
    
    try {
        const userDoc = await getDoc(doc(db, "usuarios", user.uid));
        if (userDoc.exists()) {
            const userData = userDoc.data();
            if (userData.ativo === false) {
                window.location.href = "desativado.html";
                return;
            }
        }
    } catch (error) {
        console.error("Erro ao verificar status do usuário:", error);
    }
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
            icone = '<i class="bi bi-exclamation-circle-fill"></i>';
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
            tipo = "info"; // Padrão para tipos desconhecidos
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
        <button class="notification-close" aria-label="Fechar">
            <i class="bi bi-x"></i>
        </button>
    `;
    
    // Adicionar ao container
    container.appendChild(notification);
    
    // Mostrar com animação
    setTimeout(() => {
        notification.classList.add('show');
        
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

// Atualizar a função formatarDataParaExibicao para mostrar também a hora
export function formatarDataParaExibicao(dataUTC) {
    return dataUTC.toLocaleDateString("pt-BR", {
        timeZone: "America/Sao_Paulo",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}

// Obter sigla do usuário
async function getSiglaUsuario(user) {
    try {
        const userRef = doc(db, "usuarios", user.uid);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
            return userSnap.data().sigla || "N/A";
        }
        return "N/A";
    } catch (error) {
        console.error("Erro ao buscar sigla do usuário:", error);
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
        const pcrTipoInput = document.getElementById("pcr-tipo-modal");
        const snTipoInput = document.getElementById("sn-tipo-modal");
        const elisaTipoInput = document.getElementById("elisa-tipo-modal");
        const alvoInput = document.getElementById("alvo-modal");
        const proprietarioNomeInput = document.getElementById("proprietario-nome-modal");
        const proprietarioMunicipioInput = document.getElementById("proprietario-municipio-modal");
        const proprietarioContatoInput = document.getElementById("proprietario-contato-modal");
        const veterinarioNomeInput = document.getElementById("veterinario-nome-modal");
        const veterinarioMunicipioInput = document.getElementById("veterinario-municipio-modal");
        const veterinarioContatoInput = document.getElementById("veterinario-contato-modal");
        const observacoesInput = document.getElementById("observacoes-modal");
        const materialRecebidoInput = document.getElementById("material-recebido-modal");

        // Validate required fields exist
        if (!idInput || !tipoInput || !quantidadeInput) {
            throw new Error("Campos obrigatórios não encontrados no formulário");
        }

        // Determinar subtipo baseado no tipo principal
        let subTipo = null;
        let alvo = null;
        if (tipoInput.value === "MOLECULAR" && pcrTipoInput) {
            subTipo = pcrTipoInput.value.trim() || null;
            // Capturar alvo apenas para PCR e RT-PCR simples
            if ((subTipo === "PCR" || subTipo === "RT-PCR") && alvoInput) {
                alvo = alvoInput.value.trim() || null;
            }
        } else if (tipoInput.value === "SN" && snTipoInput) {
            subTipo = snTipoInput.value.trim() || null;
        } else if (tipoInput.value === "ELISA" && elisaTipoInput) {
            subTipo = elisaTipoInput.value.trim() || null;
        }

        const novaTarefa = {
            id: idInput.value.trim(),
            tipo: tipoInput.value,
            subTipo: subTipo,
            alvo: alvo, // Adicionar campo alvo
            quantidade: parseInt(quantidadeInput.value),
            gramatura: tipoInput.value === "VACINA" && gramaturaInput 
                ? parseFloat(gramaturaInput.value) || null
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
            observacoes: observacoesInput ? observacoesInput.value.trim() : "",
            materialRecebido: materialRecebidoInput ? materialRecebidoInput.value.trim() : "",
            status: "pendente",
            criadoEm: Timestamp.now(), // Apenas criadoEm, removendo dataRecebimento
            criadoPor: user.uid,
            siglaResponsavel: await getSiglaUsuario(user) // Aguarda a busca da sigla
        };

        // Validate required data
        if (!novaTarefa.id) throw new Error("ID é obrigatório");
        if (isNaN(novaTarefa.quantidade)) throw new Error("Quantidade inválida");
        if (novaTarefa.quantidade <= 0) throw new Error("Quantidade deve ser maior que zero");

        // Add to Firestore
        await addDoc(collection(db, "tarefas"), novaTarefa);

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
    
    const gramaturaContainer = document.getElementById('gramatura-container-modal');
    if (gramaturaContainer) {
        gramaturaContainer.style.display = tipoValue === "VACINA" ? "block" : "none";
    }
    
    const pcrContainer = document.getElementById('pcr-container-modal');
    if (pcrContainer) {
        pcrContainer.style.display = tipoValue === "MOLECULAR" ? "block" : "none";
    }
    
    const snContainer = document.getElementById('sn-container-modal');
    if (snContainer) {
        snContainer.style.display = tipoValue === "SN" ? "block" : "none";
    }
    
    const elisaContainer = document.getElementById('elisa-container-modal');
    if (elisaContainer) {
        elisaContainer.style.display = tipoValue === "ELISA" ? "block" : "none";
    }
    
    // Configurar menus flutuantes
    try {
        configurarMenusFlutantes();
    } catch (error) {
        console.warn('Erro ao configurar menu PCR:', error);
    }
}

// Função para configurar todos os menus flutuantes
function configurarMenusFlutantes() {
    configurarMenuPCR();
    configurarMenuSN();
    configurarMenuELISA();
    configurarTipoChangeListener();
}

// Função para configurar o listener do tipo de teste
function configurarTipoChangeListener() {
    const tipoModalSelect = document.getElementById('tipo-modal');
    if (!tipoModalSelect || tipoModalSelect.hasAttribute('data-tipo-configured')) {
        return;
    }
    
    tipoModalSelect.setAttribute('data-tipo-configured', 'true');
    
    tipoModalSelect.addEventListener('change', function() {
        const tipoValue = this.value;
        
        // Controlar gramatura (VACINA)
        const gramaturaContainer = document.getElementById('gramatura-container-modal');
        if (gramaturaContainer) {
            gramaturaContainer.style.display = tipoValue === "VACINA" ? "block" : "none";
        }
        
        // Controlar containers dos submenus
        const pcrContainer = document.getElementById('pcr-container-modal');
        const alvoContainer = document.getElementById('alvo-container-modal');
        if (pcrContainer) {
            pcrContainer.style.display = tipoValue === "MOLECULAR" ? "block" : "none";
            if (tipoValue !== "MOLECULAR") {
                const pcrInput = document.getElementById('pcr-tipo-modal');
                if (pcrInput) pcrInput.value = '';
                // Ocultar e limpar campo alvo também
                if (alvoContainer) {
                    alvoContainer.style.display = 'none';
                    const alvoInput = document.getElementById('alvo-modal');
                    if (alvoInput) alvoInput.value = '';
                }
            }
        }
        
        const snContainer = document.getElementById('sn-container-modal');
        if (snContainer) {
            snContainer.style.display = tipoValue === "SN" ? "block" : "none";
            if (tipoValue !== "SN") {
                const snInput = document.getElementById('sn-tipo-modal');
                if (snInput) snInput.value = '';
            }
        }
        
        const elisaContainer = document.getElementById('elisa-container-modal');
        if (elisaContainer) {
            elisaContainer.style.display = tipoValue === "ELISA" ? "block" : "none";
            if (tipoValue !== "ELISA") {
                const elisaInput = document.getElementById('elisa-tipo-modal');
                if (elisaInput) elisaInput.value = '';
            }
        }
    });
}
function configurarMenuPCR() {
    const pcrTipoInput = document.getElementById('pcr-tipo-modal');
    const pcrFloatingMenu = document.getElementById('pcr-floating-menu');
    const alvoContainer = document.getElementById('alvo-container-modal');
    
    // Verificar se todos os elementos existem
    if (!pcrTipoInput || !pcrFloatingMenu) {
        console.warn('Elementos PCR não encontrados. Funcionalidade PCR pode não funcionar corretamente.');
        return;
    }
    
    // Verificar se já foi configurado
    if (pcrTipoInput.hasAttribute('data-pcr-configured')) {
        return;
    }
    
    pcrTipoInput.setAttribute('data-pcr-configured', 'true');
    
    // Configurar eventos do menu flutuante PCR
    pcrTipoInput.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const rect = this.getBoundingClientRect();
        
        // Usar posição fixed
        pcrFloatingMenu.style.position = 'fixed';
        pcrFloatingMenu.style.top = rect.bottom + 'px';
        pcrFloatingMenu.style.left = rect.left + 'px';
        pcrFloatingMenu.style.width = rect.width + 'px';
        pcrFloatingMenu.style.zIndex = '9999';
        pcrFloatingMenu.classList.add('show');
    });
    
    // Configurar clicks nos items do menu
    if (!pcrFloatingMenu.hasAttribute('data-pcr-configured')) {
        pcrFloatingMenu.setAttribute('data-pcr-configured', 'true');
        
        pcrFloatingMenu.addEventListener('click', function(e) {
            if (e.target.classList.contains('pcr-menu-item')) {
                const value = e.target.getAttribute('data-value');
                pcrTipoInput.value = value;
                
                // Remover seleção anterior
                document.querySelectorAll('.pcr-menu-item').forEach(item => {
                    item.classList.remove('selected');
                });
                
                // Adicionar seleção atual
                e.target.classList.add('selected');
                
                // Mostrar/ocultar campo alvo baseado na seleção
                if (alvoContainer) {
                    if (value === 'PCR' || value === 'RT-PCR') {
                        alvoContainer.style.display = 'block';
                        // Focar no campo alvo para facilitar o preenchimento
                        setTimeout(() => {
                            const alvoInput = document.getElementById('alvo-modal');
                            if (alvoInput) alvoInput.focus();
                        }, 100);
                    } else {
                        alvoContainer.style.display = 'none';
                        // Limpar o campo alvo se não for PCR simples
                        const alvoInput = document.getElementById('alvo-modal');
                        if (alvoInput) alvoInput.value = '';
                    }
                }
                
                // Fechar menu
                pcrFloatingMenu.classList.remove('show');
            }
        });
        
        // Fechar menu ao clicar fora
        document.addEventListener('click', function(e) {
            if (!pcrTipoInput.contains(e.target) && !pcrFloatingMenu.contains(e.target)) {
                pcrFloatingMenu.classList.remove('show');
            }
        });
    }
}

// Função para configurar o menu flutuante de SN
function configurarMenuSN() {
    const snTipoInput = document.getElementById('sn-tipo-modal');
    const snFloatingMenu = document.getElementById('sn-floating-menu');
    
    if (!snTipoInput || !snFloatingMenu) {
        return;
    }
    
    if (!snTipoInput.hasAttribute('data-sn-configured')) {
        snTipoInput.setAttribute('data-sn-configured', 'true');
        
        snTipoInput.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const rect = this.getBoundingClientRect();
            snFloatingMenu.style.position = 'fixed';
            snFloatingMenu.style.top = rect.bottom + 'px';
            snFloatingMenu.style.left = rect.left + 'px';
            snFloatingMenu.style.width = rect.width + 'px';
            snFloatingMenu.style.zIndex = '9999';
            snFloatingMenu.classList.add('show');
        });
    }
    
    if (!snFloatingMenu.hasAttribute('data-sn-configured')) {
        snFloatingMenu.setAttribute('data-sn-configured', 'true');
        
        snFloatingMenu.addEventListener('click', function(e) {
            if (e.target.classList.contains('sn-menu-item')) {
                const value = e.target.getAttribute('data-value');
                snTipoInput.value = value;
                
                document.querySelectorAll('.sn-menu-item').forEach(item => {
                    item.classList.remove('selected');
                });
                
                e.target.classList.add('selected');
                snFloatingMenu.classList.remove('show');
            }
        });
        
        document.addEventListener('click', function(e) {
            if (!snTipoInput.contains(e.target) && !snFloatingMenu.contains(e.target)) {
                snFloatingMenu.classList.remove('show');
            }
        });
    }
}

// Função para configurar o menu flutuante de ELISA
function configurarMenuELISA() {
    const elisaTipoInput = document.getElementById('elisa-tipo-modal');
    const elisaFloatingMenu = document.getElementById('elisa-floating-menu');
    
    if (!elisaTipoInput || !elisaFloatingMenu) {
        return;
    }
    
    if (!elisaTipoInput.hasAttribute('data-elisa-configured')) {
        elisaTipoInput.setAttribute('data-elisa-configured', 'true');
        
        elisaTipoInput.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const rect = this.getBoundingClientRect();
            elisaFloatingMenu.style.position = 'fixed';
            elisaFloatingMenu.style.top = rect.bottom + 'px';
            elisaFloatingMenu.style.left = rect.left + 'px';
            elisaFloatingMenu.style.width = rect.width + 'px';
            elisaFloatingMenu.style.zIndex = '9999';
            elisaFloatingMenu.classList.add('show');
        });
    }
    
    if (!elisaFloatingMenu.hasAttribute('data-elisa-configured')) {
        elisaFloatingMenu.setAttribute('data-elisa-configured', 'true');
        
        elisaFloatingMenu.addEventListener('click', function(e) {
            if (e.target.classList.contains('elisa-menu-item')) {
                const value = e.target.getAttribute('data-value');
                elisaTipoInput.value = value;
                
                document.querySelectorAll('.elisa-menu-item').forEach(item => {
                    item.classList.remove('selected');
                });
                
                e.target.classList.add('selected');
                elisaFloatingMenu.classList.remove('show');
            }
        });
        
        document.addEventListener('click', function(e) {
            if (!elisaTipoInput.contains(e.target) && !elisaFloatingMenu.contains(e.target)) {
                elisaFloatingMenu.classList.remove('show');
            }
        });
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

        // Lógica de filtro atualizada para nova estrutura
        let q;
        if (filtro === "Todos") {
            q = query(
                collection(db, "tarefas"),
                orderBy("criadoEm", ordem === "recentes" ? "desc" : "asc")
            );
        } else if (filtro === "SN") {
            // Para SN, incluímos tanto os novos (tipo="SN") quanto os antigos (tipo específico de SN)
            q = query(
                collection(db, "tarefas"),
                orderBy("criadoEm", ordem === "recentes" ? "desc" : "asc")
            );
        } else if (filtro === "ELISA") {
            // Para ELISA, incluímos tanto os novos (tipo="ELISA") quanto os antigos (tipo específico de ELISA)
            q = query(
                collection(db, "tarefas"),
                orderBy("criadoEm", ordem === "recentes" ? "desc" : "asc")
            );
        } else if (filtro === "MOLECULAR") {
            // Para MOLECULAR, incluímos tanto os novos (tipo="MOLECULAR") quanto os antigos (tipo="PCR")
            q = query(
                collection(db, "tarefas"),
                orderBy("criadoEm", ordem === "recentes" ? "desc" : "asc")
            );
        } else {
            // Para outros tipos, filtramos normalmente
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
            
            // Aplicar filtro manual para SN, ELISA e MOLECULAR que incluem dados antigos
            let incluirTarefa = true;
            if (filtro === "SN") {
                incluirTarefa = tarefa.tipo === "SN" || 
                              tarefa.tipo === "SN IBR" || 
                              tarefa.tipo === "SN BVDV-1" ||
                              tarefa.tipo === "SN BVDV-2" ||
                              tarefa.tipo === "SN HoBi" ||
                              tarefa.tipo === "SN EHV-1";
            } else if (filtro === "ELISA") {
                incluirTarefa = tarefa.tipo === "ELISA" ||
                              tarefa.tipo === "ELISA LEUCOSE" ||
                              tarefa.tipo === "ELISA BVDV";
            } else if (filtro === "MOLECULAR") {
                incluirTarefa = tarefa.tipo === "MOLECULAR" ||
                              tarefa.tipo === "PCR";
            } else if (filtro !== "Todos") {
                incluirTarefa = tarefa.tipo === filtro;
            }
            
            if (!incluirTarefa) {
                return; // Pula esta tarefa
            }
            const dataRecebimento = tarefa.dataRecebimento?.toDate
                ? formatarDataParaExibicao(tarefa.dataRecebimento.toDate())
                : "Data não disponível";

            const statusClass = tarefa.status === 'em-progresso' ? 'em-progresso' : '';
            const concluidoClass = tarefa.status === 'concluido' ? 'concluido' : statusClass;

            const showResultsButton = (tarefa.tipo === "SN" && tarefa.subTipo) || 
                                    (tarefa.tipo === "ELISA" && tarefa.subTipo) ||
                                    (tarefa.tipo === "MOLECULAR" && tarefa.subTipo) ||
                                    tarefa.tipo === "RAIVA" ||
                                    tarefa.tipo === "ICC" ||
                                    // Compatibilidade com dados antigos
                                    tarefa.tipo === "SN IBR" || 
                                    tarefa.tipo === "SN BVDV-1" ||
                                    tarefa.tipo === "SN BVDV-2" ||
                                    tarefa.tipo === "SN HoBi" ||
                                    tarefa.tipo === "SN EHV-1" ||
                                    tarefa.tipo === "ELISA LEUCOSE" ||
                                    tarefa.tipo === "ELISA BVDV" ||
                                    tarefa.tipo === "PCR";

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
                
                <!-- Dropdown "Mais" sem estilos inline -->
                <button type="button" class="btn btn-sm btn-purple dropdown-toggle" 
                        data-bs-toggle="dropdown" aria-expanded="false">
                  <i class="bi bi-three-dots-vertical"></i> <span class="d-none d-sm-inline">Mais</span>
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
                    <div class="mb-1"><span class="fw-medium">Tipo:</span> ${tipoDisplay}${tarefa.subTipo ? ` - ${tarefa.subTipo}` : ''}${tarefa.alvo && (tarefa.subTipo === 'PCR' || tarefa.subTipo === 'RT-PCR') ? ` - ${tarefa.alvo}` : ''}</div>
                    <div class="mb-1"><span class="fw-medium">Quantidade:</span> ${tarefa.quantidade || '0'}</div>
                    <div><span class="fw-medium">Recebimento:</span> ${
    tarefa.criadoEm?.toDate
        ? formatarDataParaExibicao(tarefa.criadoEm.toDate())
        : "Data não disponível"
}</div>
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
        // Encontra o botão e o card
        const botao = document.querySelector(`button.btn-progresso[data-id="${id}"]`);
        
        // Adiciona classes temporárias em vez de manipular estilos inline
        if (botao) {
            botao.disabled = true;
            botao.classList.add('processing');
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
        
        // Remove classes temporárias após um delay
        setTimeout(() => {
            const botao = document.querySelector(`button.btn-progresso[data-id="${id}"]`);
            if (botao) {
                botao.disabled = false;
                botao.classList.remove('processing');
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
            // criadoEm já está preservado com o mesmo valor de dataRecebimento
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
        
        // Controlar e preencher containers dos submenus
        if (tipo === "MOLECULAR") {
            document.getElementById("pcr-container-modal").style.display = "block";
            document.getElementById("pcr-tipo-modal").value = tarefa.subTipo || "";
        } else {
            document.getElementById("pcr-container-modal").style.display = "none";
        }
        
        if (tipo === "SN") {
            document.getElementById("sn-container-modal").style.display = "block";
            document.getElementById("sn-tipo-modal").value = tarefa.subTipo || "";
        } else {
            document.getElementById("sn-container-modal").style.display = "none";
        }
        
        if (tipo === "ELISA") {
            document.getElementById("elisa-container-modal").style.display = "block";
            document.getElementById("elisa-tipo-modal").value = tarefa.subTipo || "";
        } else {
            document.getElementById("elisa-container-modal").style.display = "none";
        }
        
        const dataRecebimento = tarefa.dataRecebimento?.toDate();
        if (dataRecebimento) {
            const dataLocal = new Date(dataRecebimento.getTime() - dataRecebimento.getTimezoneOffset() * 60000);
            document.getElementById("data-modal").value = dataLocal.toISOString().split("T")[0];
        }
        
        document.getElementById("observacoes-modal").value = tarefa.observacoes || "";
        document.getElementById("material-recebido-modal").value = tarefa.materialRecebido || "";

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
        
        // Configurar todos os menus flutuantes
        configurarMenusFlutantes();

        // Configurar o botão salvar para atualizar tarefa
        document.getElementById('salvar-tarefa-modal').onclick = async () => {
            try {
                mostrarLoading();
                
                // NOVO: Capturar os valores atuais dos filtros antes da atualização
                const filtroTipoAtual = document.getElementById("filtro-tipo").value;
                const filtroOrdemAtual = document.getElementById("filtro-ordem").value;
                
                // Obter valores dos campos
                const tipoValue = document.getElementById("tipo-modal").value;
                const updateData = {
                    id: document.getElementById("id-modal").value,
                    tipo: tipoValue,
                    quantidade: parseInt(document.getElementById("quantidade-modal").value),
                    atualizadoEm: Timestamp.now(),
                    observacoes: document.getElementById("observacoes-modal").value.trim(),
                    materialRecebido: document.getElementById("material-recebido-modal").value.trim()
                };

                // Adicionar campos condicionais
                if (tipoValue === "VACINA") {
                    const gramaturaInput = document.getElementById("gramatura-modal");
                    updateData.gramatura = gramaturaInput ? parseFloat(gramaturaInput.value) || null : null;
                } else {
                    updateData.gramatura = null;
                }

                // Determinar subtipo baseado no tipo principal
                let subTipo = null;
                if (tipoValue === "MOLECULAR") {
                    const pcrTipoInput = document.getElementById("pcr-tipo-modal");
                    subTipo = pcrTipoInput ? pcrTipoInput.value.trim() : null;
                } else if (tipoValue === "SN") {
                    const snTipoInput = document.getElementById("sn-tipo-modal");
                    subTipo = snTipoInput ? snTipoInput.value.trim() : null;
                } else if (tipoValue === "ELISA") {
                    const elisaTipoInput = document.getElementById("elisa-tipo-modal");
                    subTipo = elisaTipoInput ? elisaTipoInput.value.trim() : null;
                }
                
                updateData.subTipo = subTipo;
                
                // Remover campos antigos se existirem
                updateData.pcrTipo = null;

                // Atualizar campos de proprietário e veterinário
                const proprietarioNome = document.getElementById("proprietario-nome-modal").value.trim();
                const proprietarioMunicipio = document.getElementById("proprietario-municipio-modal").value.trim();
                const proprietarioContato = document.getElementById("proprietario-contato-modal").value.trim();
                
                updateData.proprietario = {
                    nome: proprietarioNome,
                    municipio: proprietarioMunicipio,
                    contato: proprietarioContato
                };

                const veterinarioNome = document.getElementById("veterinario-nome-modal").value.trim();
                const veterinarioMunicipio = document.getElementById("veterinario-municipio-modal").value.trim();
                const veterinarioContato = document.getElementById("veterinario-contato-modal").value.trim();
                
                updateData.veterinario = {
                    nome: veterinarioNome,
                    municipio: veterinarioMunicipio,
                    contato: veterinarioContato
                };

                // Atualizar a tarefa
                await updateDoc(tarefaRef, updateData);
                
                // Fechar o modal
                const modal = bootstrap.Modal.getInstance(document.getElementById('tarefa-modal'));
                if (modal) modal.hide();
                
                // MODIFICADO: Carregar tarefas mantendo os filtros atuais
                carregarTarefas(filtroTipoAtual, filtroOrdemAtual);
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
            // Busca a sigla do usuário no banco, se não estiver salva na tarefa
            try {
                const userRef = doc(db, "usuarios", tarefa.criadoPor);
                const userSnap = await getDoc(userRef);
                if (userSnap.exists()) {
                    siglaUsuario = userSnap.data().sigla || "N/A";
                }
            } catch (e) {
                // Se der erro, mantém "N/A"
            }
        }

        // Formatar data/hora de recebimento (registro)
        const dataRecebimento = tarefa.criadoEm?.toDate
            ? formatarDataParaExibicao(tarefa.criadoEm.toDate())
            : "Data não disponível";

        // Remove modal antigo se existir
        let modalElement = document.getElementById("modal-detalhes");
        if (modalElement) modalElement.remove();

        // Status badge
        let statusBadge = "";
        if (tarefa.status === 'em-progresso') {
            statusBadge = '<span class="badge bg-primary">Em Progresso</span>';
        } else if (tarefa.status === 'concluido') {
            statusBadge = '<span class="badge bg-success">Concluído</span>';
        } else {
            statusBadge = '<span class="badge bg-warning text-dark">Pendente</span>';
        }

        // Modal HTML igual ao do histórico
        const modalContent = `
            <div class="modal-header bg-light">
                <h5 class="modal-title">
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
                            <div class="col-7 fw-medium">${tarefa.tipo || 'N/A'}${tarefa.subTipo ? ` - ${tarefa.subTipo}` : ''}</div>
                        </div>
                        <div class="row mb-2">
                            <div class="col-5 text-muted">Quantidade:</div>
                            <div class="col-7 fw-medium">${tarefa.quantidade || '0'} ${tarefa.tipo === "VACINA" 
                                ? `vacinas${tarefa.gramatura ? ` (${tarefa.gramatura}g)` : ''}` 
                                : "amostras"}</div>
                        </div>
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
                ${tarefa.materialRecebido ? `
                <div class="card border-0 mb-3 shadow-sm">
                    <div class="card-body">
                        <h6 class="card-subtitle mb-3 text-success fw-bold">
                            <i class="bi bi-box-seam me-2"></i>Material Recebido
                        </h6>
                        <div class="bg-light p-3 rounded" style="white-space: pre-wrap; word-break: break-word; font-size: 0.95rem;">
${tarefa.materialRecebido}
                        </div>
                    </div>
                </div>` : ''}
                ${tarefa.observacoes ? `
                <div class="card border-0 shadow-sm">
                    <div class="card-body">
                        <h6 class="card-subtitle mb-3 text-success fw-bold">
                            <i class="bi bi-card-text me-2"></i>Observações
                        </h6>
                        <div class="bg-light p-3 rounded" style="white-space: pre-wrap; word-break: break-word; font-size: 0.95rem;">
${tarefa.observacoes}
                        </div>
                    </div>
                </div>` : ''}
            </div>
        `;

        // Cria e mostra o modal
        const modalDiv = document.createElement("div");
        modalDiv.className = "modal fade";
        modalDiv.id = "modal-detalhes";
        modalDiv.tabIndex = -1;
        modalDiv.innerHTML = `
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content border-0 shadow">
                    ${modalContent}
                </div>
            </div>
        `;
        document.body.appendChild(modalDiv);

        const modal = new bootstrap.Modal(modalDiv);
        modal.show();

        modalDiv.addEventListener('hidden.bs.modal', function () {
            modalDiv.remove();
        });

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

        if (tipo === "ELISA") {
            await registrarResultadoELISA(id);
            return;
        }
        if (tipo === "SN" || tipo.includes("SN ")) {
            await registrarResultadoSN(id);
            return;
        }
        if (tipo === "MOLECULAR" || tipo === "PCR") {
            await registrarResultadoMolecular(id);
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
        
        
        // Inicializar autenticação e carregar dados (recuperada do primeiro evento)
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

        // Correção para o botão "Voltar ao Hub"
        const voltarHubBtn = document.getElementById("voltar-hub");
        if (voltarHubBtn) {
            voltarHubBtn.addEventListener('click', () => {
                window.location.href = "hub.html";
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