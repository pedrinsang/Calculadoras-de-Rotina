// Imports do Firebase - VERSÃO CORRIGIDA
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js";
import {
    getFirestore,
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
    writeBatch,
} from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js";
import { 
    getAuth,
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";

// Imports locais
import { gerarDocx } from './baixarDoc.js';

// ============================================================================
// CORREÇÃO PARA SERVICEWORKER
// ============================================================================

// Função para limpar ServiceWorkers problemáticos
async function limparServiceWorkers() {
    try {
        if ('serviceWorker' in navigator) {
            const registrations = await navigator.serviceWorker.getRegistrations();
            
            for (let registration of registrations) {
                console.log('🧹 Removendo ServiceWorker:', registration.scope);
                await registration.unregister();
            }
            
            if (registrations.length > 0) {
                console.log('✅ ServiceWorkers removidos - recarregando página...');
                // Aguardar um pouco antes de recarregar
                setTimeout(() => {
                    window.location.reload();
                }, 1000);
                return true; // Indica que página será recarregada
            }
        }
        return false; // Não houve ServiceWorkers para remover
    } catch (error) {
        console.warn('⚠️ Erro ao limpar ServiceWorkers:', error);
        return false;
    }
}

// Configuração do Firebase com configurações otimizadas
const firebaseConfig = {
    apiKey: "AIzaSyAJneFO6AYsj5_w3hIKzPGDa8yR6Psng4M",
    authDomain: "hub-de-calculadoras.firebaseapp.com",
    projectId: "hub-de-calculadoras",
    storageBucket: "hub-de-calculadoras.appspot.com",
    messagingSenderId: "203883856586",
    appId: "1:203883856586:web:a00536536a32ae76c5aa33",
    measurementId: "G-7H314CT9SH"
};

// ============================================================================
// INICIALIZAÇÃO SEGURA DO FIREBASE
// ============================================================================

let app, db, auth;

async function inicializarFirebase() {
    try {
        console.log('🔥 Inicializando Firebase...');
        
        // Inicializar Firebase
        app = initializeApp(firebaseConfig);
        
        // Configurar Firestore com configurações de rede otimizadas
        db = getFirestore(app);
        
        // Configurar Auth
        auth = getAuth(app);
        
        console.log('✅ Firebase inicializado com sucesso');
        return true;
        
    } catch (error) {
        console.error('❌ Erro ao inicializar Firebase:', error);
        
        // Se erro de rede, tentar limpar ServiceWorkers
        if (error.message.includes('ServiceWorker') || 
            error.message.includes('network') ||
            error.message.includes('intercepted')) {
            
            console.log('🔄 Erro de ServiceWorker detectado - tentando correção...');
            const recarregou = await limparServiceWorkers();
            
            if (!recarregou) {
                // Se não recarregou, mostrar instrução manual
                mostrarErroServiceWorker();
            }
        }
        
        return false;
    }
}

// Mostrar instruções para correção manual
function mostrarErroServiceWorker() {
    const errorDiv = document.createElement('div');
    errorDiv.innerHTML = `
        <div class="alert alert-danger alert-dismissible fade show position-fixed top-0 start-50 translate-middle-x mt-3" 
             style="z-index: 9999; max-width: 500px;" role="alert">
            <h6 class="alert-heading">
                <i class="bi bi-exclamation-triangle-fill me-2"></i>
                Erro de Conexão
            </h6>
            <p class="mb-2">ServiceWorker está causando problemas. Para corrigir:</p>
            <ol class="mb-3 small">
                <li>Pressione <kbd>F12</kbd> para abrir DevTools</li>
                <li>Vá na aba <strong>Application</strong></li>
                <li>Clique em <strong>Storage</strong> → <strong>Clear storage</strong></li>
                <li>Clique em <strong>Clear site data</strong></li>
                <li>Recarregue a página</li>
            </ol>
            <div class="d-flex gap-2">
                <button class="btn btn-sm btn-outline-danger" onclick="this.parentElement.parentElement.remove()">
                    Fechar
                </button>
                <button class="btn btn-sm btn-danger" onclick="window.location.reload()">
                    Tentar Novamente
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(errorDiv);
}

// ============================================================================
// SISTEMA COM RETRY E FALLBACK
// ============================================================================

// Função helper para executar operações Firebase com retry
async function executarComRetry(operacao, maxTentativas = 3, delay = 1000) {
    for (let tentativa = 1; tentativa <= maxTentativas; tentativa++) {
        try {
            return await operacao();
        } catch (error) {
            console.warn(`⚠️ Tentativa ${tentativa}/${maxTentativas} falhou:`, error.message);
            
            if (tentativa === maxTentativas) {
                throw error;
            }
            
            // Aguardar antes da próxima tentativa
            await new Promise(resolve => setTimeout(resolve, delay * tentativa));
        }
    }
}

// Variável para armazenar todas as tarefas
let todasTarefas = [];

// ============================================================================
// SISTEMA DE EXCLUSÃO AUTOMÁTICA
// ============================================================================

// Configurações da exclusão automática
const EXCLUSAO_CONFIG = {
    TEMPO_RETENCAO: 365, // dias (1 ano)
    CHAVE_ULTIMA_LIMPEZA: 'historico_ultima_limpeza',
    INTERVALO_VERIFICACAO: 24 * 60 * 60 * 1000, // 24 horas em ms
    BATCH_SIZE: 500 // Máximo de documentos por batch (limite do Firestore)
};

// Verificar se precisa executar limpeza
function precisaExecutarLimpeza() {
    try {
        const ultimaLimpeza = localStorage.getItem(EXCLUSAO_CONFIG.CHAVE_ULTIMA_LIMPEZA);
        
        if (!ultimaLimpeza) {
            console.log('🧹 Primeira execução - executando limpeza inicial');
            return true;
        }
        
        const ultimaExecucao = new Date(parseInt(ultimaLimpeza));
        const agora = new Date();
        const diferencaHoras = (agora - ultimaExecucao) / (1000 * 60 * 60);
        
        console.log(`⏰ Última limpeza: ${ultimaExecucao.toLocaleString()}`);
        console.log(`⏰ Diferença: ${Math.round(diferencaHoras)} horas`);
        
        return diferencaHoras >= 24; // Executar a cada 24 horas
        
    } catch (error) {
        console.warn('⚠️ Erro ao verificar última limpeza:', error);
        return true; // Em caso de erro, executar limpeza
    }
}

// Registrar execução da limpeza
function registrarLimpeza() {
    localStorage.setItem(EXCLUSAO_CONFIG.CHAVE_ULTIMA_LIMPEZA, Date.now().toString());
    console.log('✅ Limpeza registrada:', new Date().toLocaleString());
}

// Excluir tarefas antigas com melhor performance e proteção
async function excluirTarefasAntigas() {
    return await executarComRetry(async () => {
        console.log('🧹 Iniciando verificação de tarefas antigas...');
        
        // Calcular data limite (1 ano atrás)
        const dataLimite = new Date();
        dataLimite.setFullYear(dataLimite.getFullYear() - 1);
        
        console.log(`📅 Buscando tarefas anteriores a: ${dataLimite.toLocaleDateString()}`);
        
        // Buscar tarefas antigas
        const q = query(
            collection(db, "historico"),
            where("dataConclusao", "<", Timestamp.fromDate(dataLimite)),
            orderBy("dataConclusao", "asc")
        );

        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
            console.log('✅ Nenhuma tarefa antiga encontrada');
            registrarLimpeza();
            return 0;
        }
        
        const totalDocumentos = querySnapshot.size;
        console.log(`📦 ${totalDocumentos} tarefas antigas encontradas`);
        
        // Processar em batches para evitar timeout
        let documentosExcluidos = 0;
        const docs = querySnapshot.docs;
        
        for (let i = 0; i < docs.length; i += EXCLUSAO_CONFIG.BATCH_SIZE) {
            const batch = writeBatch(db);
            const batchDocs = docs.slice(i, i + EXCLUSAO_CONFIG.BATCH_SIZE);
            
            console.log(`🔥 Processando batch ${Math.floor(i / EXCLUSAO_CONFIG.BATCH_SIZE) + 1}/${Math.ceil(docs.length / EXCLUSAO_CONFIG.BATCH_SIZE)} (${batchDocs.length} documentos)`);
            
            // Adicionar exclusões ao batch
            batchDocs.forEach(docSnapshot => {
                batch.delete(docSnapshot.ref);
            });
            
            // Executar batch
            await batch.commit();
            documentosExcluidos += batchDocs.length;
            
            console.log(`✅ Batch executado: ${documentosExcluidos}/${totalDocumentos} documentos excluídos`);
            
            // Pequena pausa entre batches para não sobrecarregar
            if (i + EXCLUSAO_CONFIG.BATCH_SIZE < docs.length) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }
        
        registrarLimpeza();
        
        console.log(`🎉 Limpeza concluída: ${documentosExcluidos} tarefas antigas removidas`);
        
        // Mostrar feedback para o usuário se houver documentos excluídos
        if (documentosExcluidos > 0) {
            mostrarFeedback(
                `Limpeza automática: ${documentosExcluidos} tarefa${documentosExcluidos > 1 ? 's' : ''} antiga${documentosExcluidos > 1 ? 's' : ''} removida${documentosExcluidos > 1 ? 's' : ''} do sistema`,
                "info"
            );
        }
        
        return documentosExcluidos;
        
    }, 3, 2000).catch(error => {
        console.error("❌ Erro na exclusão automática:", error);
        
        // Registrar tentativa mesmo com erro para evitar loops
        registrarLimpeza();
        
        // Não mostrar erro para o usuário (processo em background)
        return 0;
    });
}

// Configurar exclusão automática periódica
function configurarLimpezaAutomatica() {
    // Executar verificação inicial
    if (precisaExecutarLimpeza()) {
        console.log('🚀 Executando limpeza inicial...');
        setTimeout(excluirTarefasAntigas, 2000); // Aguardar 2s após carregamento
    }
    
    // Configurar verificação periódica (a cada hora)
    setInterval(() => {
        if (precisaExecutarLimpeza()) {
            console.log('⏰ Hora da limpeza automática...');
            excluirTarefasAntigas();
        }
    }, 60 * 60 * 1000); // Verificar a cada hora
    
    console.log('⚙️ Sistema de limpeza automática configurado');
}

// ============================================================================
// FUNÇÕES PRINCIPAIS
// ============================================================================

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
            tipo = "info";
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

// Assegurar que as funções do módulo são acessíveis globalmente
window.mostrarFeedback = mostrarFeedback;

// ============================================================================
// CARREGAR HISTÓRICO
// ============================================================================

// Carregar histórico COM PROTEÇÃO
async function carregarHistorico() {
    const historicoList = document.getElementById("historico-list");
    historicoList.innerHTML = '<p>Carregando histórico...</p>';

    try {
        await executarComRetry(async () => {
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
        });
        
    } catch (error) {
        console.error("Erro ao carregar histórico:", error);
        historicoList.innerHTML = `
            <div class="alert alert-warning">
                <h6>Erro ao carregar histórico</h6>
                <p>${error.message}</p>
                <button class="btn btn-outline-warning btn-sm" onclick="carregarHistorico()">
                    <i class="bi bi-arrow-clockwise me-1"></i>Tentar Novamente
                </button>
            </div>
        `;
    }
}

// ============================================================================
// FILTRAR TAREFAS
// ============================================================================

// Filtrar tarefas
function filtrarTarefas(termo) {
    const historicoList = document.getElementById("historico-list");
    const searchInput = document.getElementById("search-input");
    const searchButton = document.getElementById("search-button");
    
    // Adicionar indicador visual de busca ativa
    if (termo) {
        searchInput.classList.add("border-primary");
        searchButton.classList.remove("btn-success");
        searchButton.classList.add("btn-warning", "text-white");
        searchButton.innerHTML = `<i class="bi bi-x-circle"></i> Limpar`;
    } else {
        searchInput.classList.remove("border-primary");
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

// Debounce function
function debounce(func, timeout = 300) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => { func.apply(this, args); }, timeout);
    };
}

// ============================================================================
// RENDERIZAR TAREFAS
// ============================================================================

// Renderizar tarefas na lista
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

        // Tratamento de proprietário para evitar [object Object]
        let proprietarioDisplay = 'N/A';
        
        if (typeof tarefa.proprietario === 'object') {
            // Se é um objeto com nome definido, use o nome
            if (tarefa.proprietario && tarefa.proprietario.nome) {
                proprietarioDisplay = searchTermo ? destacarTermos(tarefa.proprietario.nome, searchTermo) : tarefa.proprietario.nome;
            }
        } else if (tarefa.proprietario) {
            // Se não é um objeto, mas tem algum valor string
            proprietarioDisplay = searchTermo ? destacarTermos(tarefa.proprietario, searchTermo) : tarefa.proprietario;
        }
        
        historicoItem.innerHTML = `
            <div class="d-flex justify-content-between align-items-start flex-wrap">
                <div>
                    <h5 class="mb-1 text-success fw-bold">${id}</h5>
                    <div class="mb-1"><span class="fw-medium">Tipo:</span> ${tipo}${complemento ? ` ${complemento}` : ''}</div>
                    <div><span class="fw-medium">Concluído em:</span> ${tarefa.dataConclusao?.toDate().toLocaleDateString("pt-BR") || 'N/A'}</div>
                    <div><span class="fw-medium">Proprietário:</span> ${proprietarioDisplay}</div>
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

// ============================================================================
// FUNÇÕES DE AÇÃO
// ============================================================================

// Voltar tarefa para o mural
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
        
        // Adicionar de volta ao mural com TODOS os campos preservados
        await addDoc(collection(db, "tarefas"), {
            id: tarefa.id,
            tipo: tarefa.tipo,
            quantidade: tarefa.quantidade,
            gramatura: tarefa.gramatura || null,
            complemento: tarefa.complemento || null,
            proprietario: tarefa.proprietario || null,
            veterinario: tarefa.veterinario || null,
            observacoes: tarefa.observacoes || "",
            status: "pendente",
            criadoEm: tarefa.criadoEm || Timestamp.now(),
            criadoPor: tarefa.criadoPor || auth.currentUser.uid,
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

// Formatar data para exibição
function formatarDataParaExibicao(data) {
    if (!data) return "Data não disponível";
    
    const dia = String(data.getDate()).padStart(2, '0');
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const ano = data.getFullYear();
    const hora = String(data.getHours()).padStart(2, '0');
    const minutos = String(data.getMinutes()).padStart(2, '0');
    
    return `${dia}/${mes}/${ano} às ${hora}:${minutos}`;
}

// Mostrar detalhes da tarefa
window.mostrarDetalhes = async (id) => {
    try {
        const tarefaRef = doc(db, "historico", id);
        const tarefaSnap = await getDoc(tarefaRef);

        if (!tarefaSnap.exists()) {
            mostrarFeedback("Tarefa não encontrada", "error");
            return;
        }

        const tarefa = tarefaSnap.data();

        // Use criadoEm como data de recebimento
        const dataRecebimento = tarefa.criadoEm?.toDate
            ? formatarDataParaExibicao(tarefa.criadoEm.toDate())
            : "Data não disponível";

        const dataConclusao = tarefa.dataConclusao?.toDate
            ? formatarDataParaExibicao(tarefa.dataConclusao.toDate())
            : "Data não disponível";

        let proprietarioDisplay = 'N/A';
        if (typeof tarefa.proprietario === 'object') {
            if (tarefa.proprietario && tarefa.proprietario.nome) {
                proprietarioDisplay = tarefa.proprietario.nome;
            }
        } else if (tarefa.proprietario) {
            proprietarioDisplay = tarefa.proprietario;
        }

        // Montar o modal
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
                            <div class="col-7 fw-medium">${tarefa.tipo || 'N/A'}</div>
                        </div>
                        <div class="row mb-2">
                            <div class="col-5 text-muted">Quantidade:</div>
                            <div class="col-7 fw-medium">${tarefa.quantidade || '0'}</div>
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
                            <div class="col-7 fw-medium">${proprietarioDisplay}</div>
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
                            <div class="col-5 text-muted">Recebimento:</div>
                            <div class="col-7 fw-medium">${dataRecebimento}</div>
                        </div>
                        <div class="row mb-2">
                            <div class="col-5 text-muted">Conclusão:</div>
                            <div class="col-7 fw-medium">${dataConclusao}</div>
                        </div>
                        <div class="row mb-2">
                            <div class="col-5 text-muted">Responsável:</div>
                            <div class="col-7 fw-medium">${tarefa.siglaResponsavel || 'N/A'}</div>
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
${tarefa.observacoes}
                        </div>
                    </div>
                </div>` : ''}
            </div>
            <div class="modal-footer d-flex flex-wrap gap-1 justify-content-end">
                <button type="button" class="btn btn-secondary btn-sm px-2 py-1" data-bs-dismiss="modal" style="font-size: 0.8rem;">
                    <i class="bi bi-x-circle me-1"></i>Fechar
                </button>
                <button type="button" class="btn btn-warning btn-sm px-2 py-1" onclick="voltarParaMural('${id}')" style="font-size: 0.8rem;">
                    <i class="bi bi-arrow-counterclockwise me-1"></i>Restaurar
                </button>
                ${tarefa.resultados ? `
                    <button type="button" class="btn btn-primary btn-sm px-2 py-1" onclick="mostrarResultados('${id}')" style="font-size: 0.8rem;">
                        <i class="bi bi-clipboard-data me-1"></i>Resultados
                    </button>
                ` : ''}
            </div>
        `;

        // Remove modal antigo se existir
        let modalElement = document.getElementById("modal-detalhes");
        if (modalElement) modalElement.remove();

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
        mostrarFeedback("Erro ao carregar detalhes da tarefa", "error");
    }
};

// Função para mostrar resultados (se você tiver essa funcionalidade)
window.mostrarResultados = (id) => {
    console.log("Mostrar resultados para tarefa:", id);
    // Implementar conforme necessário
};

// ============================================================================
// INICIALIZAÇÃO PRINCIPAL
// ============================================================================

// Função de inicialização principal
function inicializarAplicacao() {
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

    // CONFIGURAR LIMPEZA AUTOMÁTICA
    configurarLimpezaAutomatica();
    
    // Verificação de autenticação e status do usuário
    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            window.location.href = "../index.html";
            return;
        }
        
        try {
            // Verificar se usuário está ativo
            await executarComRetry(async () => {
                const userDoc = await getDoc(doc(db, "usuarios", user.uid));
                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    if (userData.ativo === false) {
                        window.location.href = "desativado.html";
                        return;
                    }
                }
                
                // Se chegou até aqui, usuário está ativo - carregar histórico
                await carregarHistorico();
            });
            
        } catch (error) {
            console.error("Erro ao verificar status do usuário:", error);
            // Em caso de erro, tentar carregar histórico mesmo assim
            await carregarHistorico();
        }
    });
}

// ============================================================================
// EVENT LISTENERS PRINCIPAIS
// ============================================================================

document.addEventListener('DOMContentLoaded', async function() {
    console.log("Desenvolvido por Pedro Ruiz Sangoi e Alexandre Werle Suares, com auxílio do DeepSeek Chat.");
    
    // Tentar limpar ServiceWorkers primeiro
    const precisaRecarregar = await limparServiceWorkers();
    if (precisaRecarregar) return; // Página será recarregada
    
    // Inicializar Firebase
    const firebaseOK = await inicializarFirebase();
    if (!firebaseOK) return; // Erro será tratado na função
    
    // Continuar com a inicialização normal...
    inicializarAplicacao();
});

