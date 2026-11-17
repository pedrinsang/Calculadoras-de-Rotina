// Utilitários de UI compartilhados (loading, feedback)
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
