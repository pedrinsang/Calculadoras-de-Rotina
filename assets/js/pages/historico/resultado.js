import { doc, getDoc } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";
import { db } from "../../main.js";
import { mostrarFeedback } from "./historico.js";
import { gerarDocx } from "./baixarDoc.js";

let modalAtual = null;

window.mostrarResultados = async (id) => {
    try {
        // Se já existe um modal aberto, fecha ele primeiro
        if (modalAtual) {
            document.body.removeChild(modalAtual);
            modalAtual = null;
            // Remove qualquer event listener existente do ESC
            document.removeEventListener("keydown", handleKeyDown);
        }

        const tarefaRef = doc(db, "historico", id);
        const tarefaSnap = await getDoc(tarefaRef);
        
        if (!tarefaSnap.exists()) throw new Error("Tarefa não encontrada no histórico");
        
        const tarefa = tarefaSnap.data();
        
        // Check for both SN, ELISA, and PCR types
        const isSN = tarefa.tipo === "SN IBR" || tarefa.tipo === "SN BVDV";
        const isELISA = tarefa.tipo.includes("ELISA");
        const isPCR = tarefa.tipo.includes("PCR");
        const isRAIVA = tarefa.tipo.includes("RAIVA");
        const isICC = tarefa.tipo.includes("ICC");
        
        if (!isSN && !isELISA && !isPCR && !isRAIVA && !isICC) {
            mostrarFeedback("Este tipo de tarefa não possui resultados específicos", "error");
            return;
        }
        
        if (!tarefa.resultados) {
            mostrarFeedback("Esta tarefa não possui resultados registrados", "error");
            return;
        }

        // Cria o modal apenas se não houver nenhum aberto
        if (!modalAtual) {
            const modal = document.createElement("div");
            modal.className = "modal-resultados";

            if (isSN) {
                // Existing SN results table
                modal.innerHTML = `
                    <div class="modal-resultados-content">
                        <h3 style="margin-bottom: 15px; color: #1b5e20;">Resultados - ${tarefa.tipo}</h3>
                        <p style="display: flex; justify-content: space-between; align-items: center;">
                            <span><strong>ID:</strong> ${tarefa.id} | <strong>Quantidade:</strong> ${tarefa.quantidade} amostras</span>
                            <button id="baixar-docx" 
                                style="padding: 8px 15px; background: #1b5e20; color: white; border: none; border-radius: 4px; cursor: pointer;">
                                Baixar Resultados
                            </button>
                        </p>
                        
                        <table class="tabela-resultados tabela-resultados-view">
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
                                               
                        <button id="fechar-modal-x" 
                            style="position: absolute; top: 15px; right: 15px; padding: 5px 10px; background: #d32f2f; color: white; border: none; border-radius: 4px; cursor: pointer;">
                          X
                        </button>
                      </div>
                `;
            } else if (isELISA) {
                // ELISA results table
                modal.innerHTML = `
                    <div class="modal-resultados-content">
                        <h3 style="margin-bottom: 15px; color: #1b5e20;">Resultados - ${tarefa.tipo}</h3>
                        <p style="display: flex; justify-content: space-between; align-items: center;">
                            <span><strong>ID:</strong> ${tarefa.id} | <strong>Quantidade:</strong> ${tarefa.quantidade} amostras</span>
                            <button id="baixar-docx" 
                                style="padding: 8px 15px; background: #1b5e20; color: white; border: none; border-radius: 4px; cursor: pointer;">
                                Baixar Resultados
                            </button>
                        </p>
                        
                        <table class="tabela-resultados tabela-resultados-view">
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
                        
                        <button id="fechar-modal-x" 
                            style="position: absolute; top: 15px; right: 15px; padding: 5px 10px; background: #d32f2f; color: white; border: none; border-radius: 4px; cursor: pointer;">
                            X
                        </button>
                    </div>
                `;
            } else if (isPCR) {
                // PCR results table
                modal.innerHTML = `
                    <div class="modal-resultados-content">
                        <h3 style="margin-bottom: 15px; color: #1b5e20;">Resultados - ${tarefa.tipo} ${tarefa.complemento || ''}</h3>
                        <p style="display: flex; justify-content: space-between; align-items: center;">
                            <span><strong>ID:</strong> ${tarefa.id} | <strong>Quantidade:</strong> ${tarefa.quantidade} amostras</span>
                            <button id="baixar-docx" 
                                style="padding: 8px 15px; background: #1b5e20; color: white; border: none; border-radius: 4px; cursor: pointer;">
                                Baixar Resultados
                            </button>
                        </p>
                        
                        <table class="tabela-resultados tabela-resultados-view">
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
                        
                        <button id="fechar-modal-x" 
                            style="position: absolute; top: 15px; right: 15px; padding: 5px 10px; background: #d32f2f; color: white; border: none; border-radius: 4px; cursor: pointer;">
                            X
                        </button>
                    </div>
                `;
            } else if (isRAIVA) {
                // RAIVA results table
                modal.innerHTML = `
                    <div class="modal-resultados-content">
                        <h3 style="margin-bottom: 15px; color: #1b5e20;">Resultados - ${tarefa.tipo}</h3>
                        <p style="display: flex; justify-content: space-between; align-items: center;">
                            <span><strong>ID:</strong> ${tarefa.id} | <strong>Quantidade:</strong> ${tarefa.quantidade} amostras</span>
                            <button id="baixar-docx" 
                                style="padding: 8px 15px; background: #1b5e20; color: white; border: none; border-radius: 4px; cursor: pointer;">
                                Baixar Resultados
                            </button>
                        </p>
                        
                        <table class="tabela-resultados tabela-resultados-view">
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
                        
                        <button id="fechar-modal-x" 
                            style="position: absolute; top: 15px; right: 15px; padding: 5px 10px; background: #d32f2f; color: white; border: none; border-radius: 4px; cursor: pointer;">
                            X
                        </button>
                    </div>
                `;
            } else if (isICC) {
                // ICC results table
                modal.innerHTML = `
                    <div class="modal-resultados-content">
                        <h3 style="margin-bottom: 15px; color: #1b5e20;">Resultados - ${tarefa.tipo}</h3>
                        <p style="display: flex; justify-content: space-between; align-items: center;">
                            <span><strong>ID:</strong> ${tarefa.id} | <strong>Quantidade:</strong> ${tarefa.quantidade} amostras</span>
                            <button id="baixar-docx" 
                                style="padding: 8px 15px; background: #1b5e20; color: white; border: none; border-radius: 4px; cursor: pointer;">
                                Baixar Resultados
                            </button>
                        </p>
                        
                        <table class="tabela-resultados tabela-resultados-view">
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
                        
                        <button id="fechar-modal-x" 
                            style="position: absolute; top: 15px; right: 15px; padding: 5px 10px; background: #d32f2f; color: white; border: none; border-radius: 4px; cursor: pointer;">
                            X
                        </button>
                    </div>
                `;
            }

            document.body.appendChild(modal);
            modalAtual = modal;

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
            
            // Função para fechar o modal
            const fecharModal = (e) => {
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
                // Previne qualquer ação padrão da tecla
                e.preventDefault();
            };

            // Adiciona o listener do ESC
            document.addEventListener("keydown", handleKeyDown);

            // Configura os botões de fechar
            modal.querySelector("#fechar-modal-x").onclick = fecharModal;

            // Fecha ao clicar fora do conteúdo, mas apenas se o clique for diretamente no fundo
            modal.onclick = (e) => {
                if (e.target === modal) {
                    fecharModal();
                }
                // Previne a propagação do clique
                e.stopPropagation();
            };
        }
    } catch (error) {
        console.error("Erro ao mostrar resultados:", error);
        mostrarFeedback(`Erro: ${error.message}`, "error");
    }
};
