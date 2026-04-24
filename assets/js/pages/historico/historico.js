// Imports do Firebase - VERSÃO CORRIGIDA
import { app, auth, db } from "../../../js/firebase.js";
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
import { gerarFormularioCobrancaWord } from "../../utils/formularioCobranca.js";

// Prevenir erro da API do Google
window.__iframefcb190700 = function() {
    return null;
};

// Interceptar outros callbacks do Google
window.__google_recaptcha_client = false;
window.gapi = window.gapi || {};

// Prevenir erros de reCAPTCHA
if (typeof window.grecaptcha !== 'undefined') {
    window.grecaptcha.ready = function(callback) {
        if (callback) callback();
    };
} else {
    window.grecaptcha = {
        ready: function(callback) {
            if (callback) callback();
        },
        render: function() { return null; },
        execute: function() { return Promise.resolve(''); }
    };
}

// Interceptar erros globais da API do Google
window.addEventListener('error', function(e) {
    if (e.filename && e.filename.includes('api.js')) {
        e.preventDefault();
        return false;
    }
});

// Interceptar promises rejeitadas da API do Google
window.addEventListener('unhandledrejection', function(e) {
    if (e.reason && e.reason.toString().includes('Google')) {
        e.preventDefault();
    }
});

// ============================================================================
// CORREÇÃO PARA SERVICEWORKER
// ============================================================================

// Função para limpar ServiceWorkers problemáticos
async function limparServiceWorkers() {
    try {
        if ('serviceWorker' in navigator) {
            const registrations = await navigator.serviceWorker.getRegistrations();
            
            for (let registration of registrations) {
                await registration.unregister();
            }
            
            if (registrations.length > 0) {
                // Aguardar um pouco antes de recarregar
                setTimeout(() => {
                    window.location.reload();
                }, 1000);
                return true; // Indica que página será recarregada
            }
        }
        return false; // Não houve ServiceWorkers para remover
    } catch (error) {
        console.warn('Erro ao limpar ServiceWorkers:', error);
        return false;
    }
}

// Configuração do Firebase com configurações otimizadas
// Config centralizada via módulo compartilhado

// ============================================================================
// INICIALIZAÇÃO SEGURA DO FIREBASE
// ============================================================================

// Firebase já está pronto pelo módulo importado

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
    INTERVALO_VERIFICACAO: 60 * 60 * 1000, // verifica a cada hora
    INTERVALO_ENTRE_LIMPEZAS: 24 * 60 * 60 * 1000, // executa no máximo uma vez por dia
    BATCH_SIZE: 500 // Máximo de documentos por batch (limite do Firestore)
};

let limpezaAutomaticaIntervalId = null;
let limpezaEmAndamento = false;

// Verificar se precisa executar limpeza
function precisaExecutarLimpeza() {
    try {
        const ultimaLimpeza = localStorage.getItem(EXCLUSAO_CONFIG.CHAVE_ULTIMA_LIMPEZA);
        
        if (!ultimaLimpeza) {
            return true;
        }
        
        const timestampUltimaLimpeza = parseInt(ultimaLimpeza, 10);
        if (!Number.isFinite(timestampUltimaLimpeza)) return true;
        
        return Date.now() - timestampUltimaLimpeza >= EXCLUSAO_CONFIG.INTERVALO_ENTRE_LIMPEZAS;
        
    } catch (error) {
        console.warn('Erro ao verificar última limpeza do histórico:', error);
        return true; // Em caso de erro, executar limpeza
    }
}

// Registrar execução da limpeza
function registrarLimpeza() {
    localStorage.setItem(EXCLUSAO_CONFIG.CHAVE_ULTIMA_LIMPEZA, Date.now().toString());
}

// Excluir tarefas antigas com melhor performance e proteção
async function excluirTarefasAntigas() {
    if (limpezaEmAndamento) return 0;
    limpezaEmAndamento = true;

    return await executarComRetry(async () => {
        const user = auth.currentUser;
        if (!user) throw new Error("Usuário não autenticado para limpeza do histórico");

        // Calcular data limite usando a configuração de retenção
        const dataLimite = new Date();
        dataLimite.setDate(dataLimite.getDate() - EXCLUSAO_CONFIG.TEMPO_RETENCAO);
        
        // Buscar tarefas antigas
        const q = query(
            collection(db, "historico"),
            where("dataConclusao", "<", Timestamp.fromDate(dataLimite)),
            orderBy("dataConclusao", "asc")
        );

        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
            registrarLimpeza();
            return 0;
        }
        
        const totalDocumentos = querySnapshot.size;
        
        // Processar em batches para evitar timeout
        let documentosExcluidos = 0;
        const docs = querySnapshot.docs;
        
        for (let i = 0; i < docs.length; i += EXCLUSAO_CONFIG.BATCH_SIZE) {
            const batch = writeBatch(db);
            const batchDocs = docs.slice(i, i + EXCLUSAO_CONFIG.BATCH_SIZE);
            
            // Adicionar exclusões ao batch
            batchDocs.forEach(docSnapshot => {
                batch.delete(docSnapshot.ref);
            });
            
            // Executar batch
            await batch.commit();
            documentosExcluidos += batchDocs.length;
            
            // Pequena pausa entre batches para não sobrecarregar
            if (i + EXCLUSAO_CONFIG.BATCH_SIZE < docs.length) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }
        
        registrarLimpeza();
        
        // Mostrar feedback para o usuário se houver documentos excluídos
        if (documentosExcluidos > 0) {
            mostrarFeedback(
                `Limpeza automática: ${documentosExcluidos} tarefa${documentosExcluidos > 1 ? 's' : ''} antiga${documentosExcluidos > 1 ? 's' : ''} removida${documentosExcluidos > 1 ? 's' : ''} do sistema`,
                "info"
            );
        }
        
        return documentosExcluidos;
        
    }, 3, 2000).catch(error => {
        console.error("Erro na exclusão automática do histórico:", error);
        return 0;
    }).finally(() => {
        limpezaEmAndamento = false;
    });
}

async function executarLimpezaSeNecessaria() {
    if (!precisaExecutarLimpeza()) return 0;
    return excluirTarefasAntigas();
}

// Configurar exclusão automática periódica
function configurarLimpezaAutomatica() {
    if (limpezaAutomaticaIntervalId) {
        clearInterval(limpezaAutomaticaIntervalId);
    }
    
    limpezaAutomaticaIntervalId = setInterval(() => {
        executarLimpezaSeNecessaria();
    }, EXCLUSAO_CONFIG.INTERVALO_VERIFICACAO);
}

// ============================================================================
// FUNÇÕES PRINCIPAIS
// ============================================================================

// Função para formatar o tipo de teste com detalhes do PCR
function formatarTipoTeste(tarefa) {
    let tipoFormatado = tarefa.tipo || 'N/A';
    
    // Nova estrutura com subTipo
    if (tarefa.subTipo) {
        tipoFormatado = `${tarefa.tipo} - ${tarefa.subTipo}`;
        
        // Adicionar alvo se for PCR/RT-PCR e tiver alvo definido
        if ((tarefa.subTipo === 'PCR' || tarefa.subTipo === 'RT-PCR') && tarefa.alvo) {
            tipoFormatado += ` - ${tarefa.alvo}`;
        }
    }
    // Compatibilidade com estrutura antiga - PCR com pcrTipo
    else if (tarefa.tipo === 'PCR' && tarefa.pcrTipo) {
        tipoFormatado = `PCR - ${tarefa.pcrTipo}`;
        
        // Adicionar alvo se tiver definido
        if (tarefa.alvo) {
            tipoFormatado += ` - ${tarefa.alvo}`;
        }
    }
    // Compatibilidade com estrutura antiga - PCR com complemento
    else if (tarefa.tipo === 'PCR' && tarefa.complemento) {
        tipoFormatado = `PCR - ${tarefa.complemento}`;
        
        // Adicionar alvo se tiver definido
        if (tarefa.alvo) {
            tipoFormatado += ` - ${tarefa.alvo}`;
        }
    }
    // Compatibilidade com tipos antigos que tinham subtipo no próprio tipo
    else if (tarefa.tipo && (tarefa.tipo.includes('SN ') || tarefa.tipo.includes('ELISA '))) {
        tipoFormatado = tarefa.tipo;
    }
    
    return tipoFormatado;
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

// ...existing code...
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
            tarefa.pcrTipo || '', // Adicionar tipo de PCR na busca
            tarefa.alvo || '', // Adicionar alvo na busca
            tarefa.observacoes || '',
            tarefa.complemento || '',
            typeof tarefa.proprietario === 'object' 
                ? tarefa.proprietario?.nome || ''
                : tarefa.proprietario || '',
            tarefa.siglaResponsavel || '',
            formatarTipoTeste(tarefa) // Incluir o tipo formatado completo na busca
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
        
        const showResultsButton = (tarefa.tipo === "SN" && tarefa.subTipo) ||
                                (tarefa.tipo === "ELISA" && tarefa.subTipo) ||
                                (tarefa.tipo === "MOLECULAR" && tarefa.subTipo) ||
                                tarefa.tipo === "RAIVA" ||
                                tarefa.tipo === "ICC" ||
                                // Compatibilidade com dados antigos
                                tarefa.tipo.includes("SN") ||
                                tarefa.tipo.includes("ELISA") ||
                                tarefa.tipo.includes("PCR");

        // Destacar texto nos principais campos se houver busca ativa
        const id = searchTermo ? destacarTermos(tarefa.id || 'Sem ID', searchTermo) : (tarefa.id || 'Sem ID');
        const tipoFormatado = formatarTipoTeste(tarefa);
        const tipo = searchTermo ? destacarTermos(tipoFormatado, searchTermo) : tipoFormatado;
        const complemento = tarefa.complemento && tarefa.tipo !== 'PCR' ? (searchTermo ? destacarTermos(tarefa.complemento, searchTermo) : tarefa.complemento) : '';

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
                    <div class="mb-1"><span class="fw-medium">Tipo:</span> ${tipo}${complemento ? ` - ${complemento}` : ''}</div>
                    <div><span class="fw-medium">Concluído em:</span> ${tarefa.dataConclusao?.toDate().toLocaleDateString("pt-BR") || 'N/A'}</div>
                    <div><span class="fw-medium">Proprietário:</span> ${proprietarioDisplay}</div>
                </div>
                <div class="d-flex flex-wrap gap-2 mt-2">
                    <div class="btn-group">
                        <button type="button" class="btn btn-purple btn-sm dropdown-toggle" data-bs-toggle="dropdown" aria-expanded="false">
                            <i class="bi bi-three-dots-vertical me-1"></i>Mais
                        </button>
                        <ul class="dropdown-menu dropdown-menu-end">
                            <li>
                                <a class="dropdown-item" href="#" onclick="event.preventDefault(); mostrarDetalhes('${tarefa.docId}')">
                                    <i class="bi bi-info-circle me-2"></i>Detalhes
                                </a>
                            </li>
                            <li>
                                <a class="dropdown-item" href="#" onclick="event.preventDefault(); gerarFormularioCobrancaHistorico('${tarefa.docId}')">
                                    <i class="bi bi-receipt me-2"></i>Formulario de cobranca
                                </a>
                            </li>
                        </ul>
                    </div>
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
            // Preservar estrutura nova e antiga de subtipos
            subTipo: tarefa.subTipo || null,
            pcrTipo: tarefa.pcrTipo || null,  // Para compatibilidade com dados antigos
            alvo: tarefa.alvo || null,  // Preservar campo alvo
            complemento: tarefa.complemento || null,
            proprietario: tarefa.proprietario || null,
            veterinario: tarefa.veterinario || null,
            observacoes: tarefa.observacoes || "",
            status: "pendente",
            criadoEm: tarefa.criadoEm || Timestamp.now(),
            criadoPor: tarefa.criadoPor || auth.currentUser.uid,
            siglaResponsavel: tarefa.siglaResponsavel || "N/A",
            resultados: tarefa.resultados || null,
            // Preservar também a data de recebimento se existir
            dataRecebimento: tarefa.dataRecebimento || null
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

window.gerarFormularioCobrancaHistorico = async (id) => {
    try {
        const tarefaRef = doc(db, "historico", id);
        const tarefaSnap = await getDoc(tarefaRef);

        if (!tarefaSnap.exists()) {
            mostrarFeedback("Tarefa nao encontrada", "error");
            return;
        }

        await gerarFormularioCobrancaWord(tarefaSnap.data());
        mostrarFeedback("Formulario de cobranca em Word baixado com sucesso!", "success");
    } catch (error) {
        console.error("Erro ao gerar formulario de cobranca:", error);
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
                            <div class="col-7 fw-medium">${formatarTipoTeste(tarefa)}</div>
                        </div>
                        <div class="row mb-2">
                            <div class="col-5 text-muted">Quantidade:</div>
                            <div class="col-7 fw-medium">${tarefa.quantidade || '0'}</div>
                        </div>
                        ${tarefa.alvo ? `
                        <div class="row mb-2">
                            <div class="col-5 text-muted">Alvo:</div>
                            <div class="col-7 fw-medium">${tarefa.alvo}</div>
                        </div>` : ''}
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
                        <div class="row mb-2">
                            <div class="col-5 text-muted">CRMV:</div>
                            <div class="col-7 fw-medium">${typeof tarefa.veterinario === 'object'
                                ? tarefa.veterinario?.crmv || 'N/A'
                                : 'N/A'}</div>
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

// Função para mostrar resultados
window.mostrarResultados = async (id) => {
    try {
        // Buscar tarefa no histórico
        const tarefaDoc = await getDoc(doc(db, "historico", id));
        
        if (!tarefaDoc.exists()) {
            mostrarFeedback("Tarefa não encontrada", "error");
            return;
        }
        
        const tarefa = tarefaDoc.data();
        
        if (!tarefa.resultados) {
            mostrarFeedback("Esta tarefa não possui resultados registrados", "warning");
            return;
        }
        
        // Gerar conteúdo baseado no tipo de teste
        let modalContent = '';
        
        if (tarefa.tipo === "SN") {
            modalContent = gerarModalResultadosSN(tarefa);
        } else if (tarefa.tipo === "MOLECULAR" || tarefa.tipo === "PCR") {
            modalContent = gerarModalResultadosPCRSimples(tarefa);
        } else {
            // Para outros tipos, mostrar uma mensagem direcionando para o botão "Resultados" detalhado
            modalContent = `
                <div class="modal-header bg-info text-white">
                    <h5 class="modal-title">
                        <i class="bi bi-clipboard-data me-2"></i>Resultados - ${tarefa.tipo}
                    </h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body text-center py-5">
                    <div class="alert alert-info">
                        <i class="bi bi-info-circle-fill me-2 fs-4"></i>
                        <h6 class="mt-2">Visualização detalhada disponível</h6>
                        <p class="mb-3">Para visualizar os resultados deste tipo de teste de forma detalhada, utilize o botão <strong>"Resultados"</strong> na tabela.</p>
                        <button type="button" class="btn btn-primary" data-bs-dismiss="modal">
                            <i class="bi bi-check-circle me-1"></i>Entendi
                        </button>
                    </div>
                </div>
            `;
        }
        
        // Remover modal antigo se existir
        let modalElement = document.getElementById("modal-resultados");
        if (modalElement) modalElement.remove();
        
        // Criar e mostrar o modal
        const modalDiv = document.createElement("div");
        modalDiv.className = "modal fade";
        modalDiv.id = "modal-resultados";
        modalDiv.tabIndex = -1;
        modalDiv.innerHTML = `
            <div class="modal-dialog modal-dialog-centered modal-lg">
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
        console.error("Erro ao mostrar resultados:", error);
        mostrarFeedback("Erro ao carregar resultados", "error");
    }
};

// Função para gerar modal de resultados SN
function gerarModalResultadosSN(tarefa) {
    const resultados = tarefa.resultados;
    
    return `
        <div class="modal-header bg-success text-white">
            <h5 class="modal-title">
                <i class="bi bi-clipboard-data me-2"></i>Resultados - ${formatarTipoTeste(tarefa)}
            </h5>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
        </div>
        <div class="modal-body">
            <div class="alert alert-light border-start border-success border-4 mb-4">
                <div class="row">
                    <div class="col-md-4"><strong>ID:</strong> ${tarefa.id}</div>
                    <div class="col-md-4"><strong>Quantidade:</strong> ${tarefa.quantidade}</div>
                    <div class="col-md-4"><strong>Data:</strong> ${resultados.dataRegistro ? new Date(resultados.dataRegistro.seconds * 1000).toLocaleDateString('pt-BR') : 'N/A'}</div>
                </div>
            </div>
            
            <div class="table-responsive">
                <table class="table table-sm table-bordered">
                    <thead class="table-success">
                        <tr>
                            <th>Categoria</th>
                            <th>Identificações</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${resultados.negativas ? `
                            <tr>
                                <td class="table-light"><strong>Negativas (&lt;1:4)</strong></td>
                                <td>${resultados.negativas}</td>
                            </tr>
                        ` : ''}
                        
                        <tr class="table-light">
                            <td colspan="2" class="text-center fw-bold">Títulos Positivos</td>
                        </tr>
                        
                        ${['titulo4', 'titulo8', 'titulo16', 'titulo32', 'titulo64', 'titulo128', 'titulo256', 'titulo512'].map(titulo => {
                            const valor = resultados[titulo];
                            const tituloLabel = titulo === 'titulo512' ? '1:≥512' : `1:${titulo.replace('titulo', '')}`;
                            return valor ? `
                                <tr>
                                    <td><strong>${tituloLabel}</strong></td>
                                    <td>${valor}</td>
                                </tr>
                            ` : '';
                        }).join('')}
                        
                        <tr class="table-light">
                            <td colspan="2" class="text-center fw-bold">Outros</td>
                        </tr>
                        
                        ${resultados.improprias ? `
                            <tr>
                                <td><strong>Impróprias</strong></td>
                                <td>${resultados.improprias}</td>
                            </tr>
                        ` : ''}
                        ${resultados.toxicas ? `
                            <tr>
                                <td><strong>Tóxicas</strong></td>
                                <td>${resultados.toxicas}</td>
                            </tr>
                        ` : ''}
                        ${resultados.insuficiente ? `
                            <tr>
                                <td><strong>Quant. insuf.</strong></td>
                                <td>${resultados.insuficiente}</td>
                            </tr>
                        ` : ''}
                    </tbody>
                </table>
            </div>
        </div>
        <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                <i class="bi bi-x-circle me-1"></i>Fechar
            </button>
        </div>
    `;
}

// Função para PCR simples
function gerarModalResultadosPCRSimples(tarefa) {
    const resultados = tarefa.resultados;
    
    return `
        <div class="modal-header bg-success text-white">
            <h5 class="modal-title">
                <i class="bi bi-clipboard-data me-2"></i>Resultados - ${formatarTipoTeste(tarefa)}
            </h5>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
        </div>
        <div class="modal-body">
            <div class="alert alert-light border-start border-success border-4 mb-4">
                <div class="row">
                    <div class="col-md-6"><strong><i class="bi bi-upc me-2"></i>ID:</strong> ${tarefa.id}</div>
                    <div class="col-md-6"><strong><i class="bi bi-123 me-2"></i>Quantidade:</strong> ${tarefa.quantidade}</div>
                </div>
            </div>
            <div class="alert alert-info mb-3">
                <i class="bi bi-info-circle me-2"></i>
                <strong>Nota:</strong> Para visualização detalhada dos resultados de testes Moleculares, use o botão "Resultados" no card da tarefa.
            </div>
            <div class="table-responsive">
                <table class="tabela-resultados table table-hover">
                    <thead class="table-success">
                        <tr>
                            <th>Identificação da amostra</th>
                            <th>Resultado</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${resultados.amostras && resultados.amostras.length > 0 ? resultados.amostras.map((amostra, index) => `
                            <tr>
                                <td>${amostra.identificacao || `Amostra ${index + 1}`}</td>
                                <td>
                                    <span class="badge ${amostra.resultado === 'positivo' ? 'bg-danger' : amostra.resultado === 'negativo' ? 'bg-success' : 'bg-secondary'}">
                                        ${amostra.resultado ? amostra.resultado.charAt(0).toUpperCase() + amostra.resultado.slice(1) : 'Não informado'}
                                    </span>
                                </td>
                            </tr>
                        `).join('') : `<tr><td colspan="2" class="text-center">Nenhuma amostra encontrada</td></tr>`}
                    </tbody>
                </table>
            </div>
        </div>
        <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                <i class="bi bi-x-circle me-1"></i>Fechar
            </button>
        </div>
    `;
}

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

                configurarLimpezaAutomatica();
                await executarLimpezaSeNecessaria();
                
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
    // Tentar limpar ServiceWorkers primeiro
    const precisaRecarregar = await limparServiceWorkers();
    if (precisaRecarregar) return; // Página será recarregada
    
    // Firebase já está inicializado via módulo compartilhado
    // Continuar com a inicialização normal...
    inicializarAplicacao();
});

