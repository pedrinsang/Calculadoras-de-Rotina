import { doc, getDoc } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";
import { db } from "../../main.js";
import { mostrarFeedback } from "./historico.js";
import { gerarDocx } from "./baixarDoc.js";

let modalAtual = null;

window.mostrarResultados = async (id) => {
    try {
        // Se já existe um modal aberto, fecha ele primeiro
        if (modalAtual) {
            fecharModalComAnimacao();
            // Remove qualquer event listener existente do ESC
            document.removeEventListener("keydown", handleKeyDown);
            await new Promise(resolve => setTimeout(resolve, 300)); // Aguarda a animação terminar
        }

        const tarefaRef = doc(db, "historico", id);
        const tarefaSnap = await getDoc(tarefaRef);
        
        if (!tarefaSnap.exists()) throw new Error("Tarefa não encontrada no histórico");
        
        const tarefa = tarefaSnap.data();
        
        // Check for both SN, ELISA, and PCR types
        const isSN = tarefa.tipo && (tarefa.tipo.includes("SN IBR") || tarefa.tipo.includes("SN BVDV"));
        const isELISA = tarefa.tipo.includes("ELISA");
        const isPCR = tarefa.tipo.includes("PCR");
        const isRAIVA = tarefa.tipo.includes("RAIVA");
        const isICC = tarefa.tipo.includes("ICC");
        
        if (!isSN && !isELISA && !isPCR && !isRAIVA && !isICC) {
            mostrarFeedback("Este tipo de tarefa não possui resultados específicos", "warning");
            return;
        }
        
        if (!tarefa.resultados) {
            mostrarFeedback("Esta tarefa não possui resultados registrados", "warning");
            return;
        }

        // Cria o modal apenas se não houver nenhum aberto
        if (!modalAtual) {
            const modal = document.createElement("div");
            modal.className = "modal-resultados";
            modal.style.opacity = "0";

            // Conteúdo base do modal
            const modalContent = `
                <div class="modal-resultados-content">
                    <div class="modal-resultados-header">
                        <h3>${tarefa.tipo} ${tarefa.complemento || ''}</h3>
                        <button id="fechar-modal-x" class="modal-close-btn" aria-label="Fechar">
                            <i class="bi bi-x"></i>
                        </button>
                    </div>
                    
                    <div class="modal-resultados-subheader">
                        <div class="modal-resultados-info">
                            <span><i class="bi bi-tag"></i> ID: ${tarefa.id || ''}</span>
                            <span><i class="bi bi-collection"></i> Amostras: ${tarefa.quantidade || '0'}</span>
                            <span><i class="bi bi-calendar-event"></i> Data de Conclusão: ${formatarData(tarefa.dataConclusao || tarefa.data)}</span>
                        </div>
                        
                        <button id="baixar-docx" class="btn-download-results">
                            <i class="bi bi-file-earmark-word"></i> Baixar Resultados
                        </button>
                    </div>
                    
                    <div class="modal-resultados-body">
                        ${getTableContent(tarefa, isSN, isELISA, isPCR, isRAIVA, isICC)}
                    </div>
                </div>
            `;
            
            modal.innerHTML = modalContent;
            document.body.appendChild(modal);
            modalAtual = modal;

            // Adiciona CSS para o modal
            adicionarEstilosModal();
            
            // Animar entrada
            setTimeout(() => {
                modal.style.opacity = "1";
                const modalContent = modal.querySelector('.modal-resultados-content');
                modalContent.style.transform = "translateY(0)";
                modalContent.style.opacity = "1";
            }, 10);

            // Update the button click handler
            if (tarefa.tipo === "SN IBR" || tarefa.tipo === "SN BVDV") {
                const btnCopiar = modal.querySelector("#copiar-resultados");
                if (btnCopiar) {
                    btnCopiar.onclick = () => {
                        copiarResultados(tarefa);
                    };
                }
            }
            
            const btnBaixar = modal.querySelector("#baixar-docx");
            if (btnBaixar) {
                btnBaixar.onclick = () => {
                    gerarDocx(tarefa);
                };
            }
            
            // Função para fechar o modal com animação
            const fecharModalComAnimacao = () => {
                if (modalAtual) {
                    const modalContent = modalAtual.querySelector('.modal-resultados-content');
                    modalAtual.style.opacity = "0";
                    modalContent.style.transform = "translateY(-20px)";
                    modalContent.style.opacity = "0";
                    
                    setTimeout(() => {
                        if (modalAtual && modalAtual.parentNode) {
                            document.body.removeChild(modalAtual);
                            modalAtual = null;
                        }
                    }, 300);
                }
            };
            
            window.fecharModalComAnimacao = fecharModalComAnimacao;

            // Função para lidar com o ESC
            const handleKeyDown = (e) => {
                if (e.key === "Escape") {
                    fecharModalComAnimacao();
                    document.removeEventListener("keydown", handleKeyDown);
                }
            };

            // Adiciona o listener do ESC
            document.addEventListener("keydown", handleKeyDown);

            // Configura os botões de fechar
            modal.querySelector("#fechar-modal-x").onclick = () => {
                fecharModalComAnimacao();
                document.removeEventListener("keydown", handleKeyDown);
            };

            // Fecha ao clicar fora do conteúdo, mas apenas se o clique for diretamente no fundo
            modal.onclick = (e) => {
                if (e.target === modal) {
                    fecharModalComAnimacao();
                    document.removeEventListener("keydown", handleKeyDown);
                }
            };
        }
    } catch (error) {
        console.error("Erro ao mostrar resultados:", error);
        mostrarFeedback(`Erro: ${error.message}`, "error");
    }
};

// Função para gerar o conteúdo da tabela de acordo com o tipo
function getTableContent(tarefa, isSN, isELISA, isPCR, isRAIVA, isICC) {
    if (isSN) {
        return `
            <table class="tabela-resultados tabela-resultados-view compact-table">
              <thead>
                <tr>
                  <th>Resultado</th>
                  <th>Identificação das amostras</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Negativas (&lt; 1:4)</td>
                  <td>${tarefa.resultados.negativas || '-'}</td>
                </tr>
                <tr>
                  <td colspan="2" style="text-align: center; font-weight: bold;">Positivas</td>
                </tr>
                <tr>
                  <td>Título 4</td>
                  <td>${tarefa.resultados.titulo4 || '-'}</td>
                </tr>
                <tr>
                  <td>Título 8</td>
                  <td>${tarefa.resultados.titulo8 || '-'}</td>
                </tr>
                <tr>
                  <td>Título 16</td>
                  <td>${tarefa.resultados.titulo16 || '-'}</td>
                </tr>
                <tr>
                  <td>Título 32</td>
                  <td>${tarefa.resultados.titulo32 || '-'}</td>
                </tr>
                <tr>
                  <td>Título 64</td>
                  <td>${tarefa.resultados.titulo64 || '-'}</td>
                </tr>
                <tr>
                  <td>Título 128</td>
                  <td>${tarefa.resultados.titulo128 || '-'}</td>
                </tr>
                <tr>
                  <td>Título 256</td>
                  <td>${tarefa.resultados.titulo256 || '-'}</td>
                </tr>
                <tr>
                  <td>Título ≥512</td>
                  <td>${tarefa.resultados.titulo512 || '-'}</td>
                </tr>
                <tr>
                  <td>Impróprias para testar</td>
                  <td>${tarefa.resultados.improprias || '-'}</td>
                </tr>
                <tr>
                  <td>Tóxicas</td>
                  <td>${tarefa.resultados.toxicas || '-'}</td>
                </tr>
                <tr>
                  <td>Quantidade insuficiente</td>
                  <td>${tarefa.resultados.insuficiente || '-'}</td>
                </tr>
              </tbody>
            </table>
        `;
    } else {
        return `
            <table class="tabela-resultados tabela-resultados-view compact-table">
                <thead>
                    <tr>
                        <th>Identificação da amostra</th>
                        <th>Resultado</th>
                    </tr>
                </thead>
                <tbody>
                    ${tarefa.resultados.amostras.map((amostra, index) => `
                        <tr>
                            <td>${amostra.identificacao || `Amostra ${index + 1}`}</td>
                            <td>${amostra.resultado || '-'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }
}

// Função para adicionar os estilos CSS do modal
function adicionarEstilosModal() {
    // Verifica se o estilo já existe
    if (!document.getElementById('modal-resultados-styles')) {
        const style = document.createElement('style');
        style.id = 'modal-resultados-styles';
        style.textContent = `
            .modal-resultados {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0, 0, 0, 0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 1060;
                backdrop-filter: blur(3px);
                transition: opacity 0.3s ease;
            }
            
            .modal-resultados-content {
                background-color: white;
                border-radius: 16px;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
                position: relative;
                width: 90%;
                max-width: 800px;
                max-height: 90vh;
                overflow-y: auto;
                transform: translateY(-20px);
                opacity: 0;
                transition: transform 0.3s ease, opacity 0.3s ease;
            }
            
            .modal-resultados-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 1.5rem 1.5rem 0.75rem;
                border-bottom: 1px solid rgba(0, 0, 0, 0.1);
            }
            
            .modal-resultados-header h3 {
                margin: 0;
                color: var(--verde-escuro, #1b5e20);
                font-weight: 700;
                font-size: 1.5rem;
            }
            
            .modal-close-btn {
                background: transparent;
                border: none;
                width: 36px;
                height: 36px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                transition: background 0.2s;
                color: #666;
                font-size: 1.5rem;
                padding: 0;
            }
            
            .modal-close-btn:hover {
                background-color: rgba(0, 0, 0, 0.05);
                color: #d32f2f;
            }
            
            .modal-resultados-subheader {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 0.75rem 1.5rem;
                background-color: rgba(33, 150, 83, 0.05);
                flex-wrap: wrap;
                gap: 10px;
                border-bottom: 1px solid rgba(0, 0, 0, 0.05);
                margin-bottom: 0; /* Reduzir espaço inferior */
            }
            
            .modal-resultados-info {
                display: flex;
                flex-wrap: wrap;
                gap: 15px;
            }
            
            .modal-resultados-info span {
                display: flex;
                align-items: center;
                color: #555;
                font-size: 0.9rem;
            }
            
            .modal-resultados-info span i {
                margin-right: 5px;
                color: var(--verde-escuro, #1b5e20);
            }
            
            .modal-resultados-body {
                padding: 0.75rem 1.5rem 1.5rem; /* Reduzir padding superior */
            }
            
            .btn-download-results {
                background-color: var(--verde-btn, #2e7d32);
                color: white;
                border: none;
                border-radius: 20px;
                padding: 8px 16px;
                cursor: pointer;
                font-weight: 500;
                transition: background-color 0.2s, transform 0.1s;
                display: flex;
                align-items: center;
                gap: 6px;
                box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
            }
            
            .btn-download-results:hover {
                background-color: var(--verde-btn-hover, #1b5e20);
                transform: translateY(-1px);
                box-shadow: 0 3px 8px rgba(0, 0, 0, 0.15);
            }
            
            .btn-download-results:active {
                transform: translateY(1px);
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
            }
            
            .tabela-resultados {
                margin-top: 0.5rem; /* Reduzir margem superior da tabela */
            }
            
            @media (max-width: 768px) {
                .modal-resultados-content {
                    width: 95%;
                    max-height: 95vh;
                }
                
                .modal-resultados-header {
                    padding: 1rem 1rem 0.5rem;
                }
                
                .modal-resultados-header h3 {
                    font-size: 1.25rem;
                }
                
                .modal-resultados-subheader {
                    flex-direction: column;
                    align-items: flex-start;
                    padding: 0.5rem 1rem;
                }
                
                .modal-resultados-info {
                    margin-bottom: 10px;
                }
                
                .modal-resultados-body {
                    padding: 1rem;
                }
                
                .btn-download-results {
                    width: 100%;
                    justify-content: center;
                }
            }
        `;
        document.head.appendChild(style);
    }
}

// Função para formatar data com segurança
function formatarData(data) {
    if (!data) {
        return "Pendente";
    }
    
    try {
        // Se é um timestamp do Firestore
        if (data && typeof data.toDate === 'function') {
            return new Date(data.toDate()).toLocaleDateString('pt-BR');
        } 
        // Se é um objeto com seconds (formato alternativo do Firestore)
        else if (data && data.seconds !== undefined) {
            return new Date(data.seconds * 1000).toLocaleDateString('pt-BR');
        }
        // Se já é um objeto Date
        else if (data instanceof Date) {
            return data.toLocaleDateString('pt-BR');
        }
        // Se é um timestamp numérico em milissegundos
        else if (typeof data === 'number') {
            return new Date(data).toLocaleDateString('pt-BR');
        }
        // Se é uma string ISO ou outra string de data
        else if (typeof data === 'string') {
            const parsedDate = new Date(data);
            // Verifica se a data é válida
            if (!isNaN(parsedDate.getTime())) {
                return parsedDate.toLocaleDateString('pt-BR');
            }
        }
        // Se chegou aqui, o formato não é reconhecido
        console.log("Formato de data não reconhecido:", data);
        return "Pendente";
    } catch (e) {
        console.error("Erro ao formatar data:", e, data);
        return "Pendente";
    }
}
