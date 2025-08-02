import { mostrarLoading, esconderLoading, mostrarFeedback } from "./mural.js";
import { 
    doc,
    getDoc,
    updateDoc,
    Timestamp
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";
import { db } from "../../main.js";

// Função para registrar resultado SN
async function registrarResultadoSN(id) {
    try {
        mostrarLoading();

        const tarefaRef = doc(db, "tarefas", id);
        const tarefaSnap = await getDoc(tarefaRef);

        if (!tarefaSnap.exists()) throw new Error("Tarefa não encontrada");

        const tarefa = tarefaSnap.data();

        // Criar o modal de resultados
        const modal = document.createElement("div");
        modal.className = "modal-resultados";

        // Substitua o HTML do modal SN com este layout mais organizado:

        modal.innerHTML = `
            <div class="modal-resultados-content" style="max-width: 5   00px;">
                <h4 class="text-success mb-2"><i class="bi bi-clipboard-data me-2"></i>Resultados - ${tarefa.tipo}</h4>
                <div class="small mb-3">
                    <span class="me-3"><strong>ID:</strong> ${tarefa.id}</span>
                    <span><strong>Quantidade:</strong> ${tarefa.quantidade}</span>
                </div>
                
                <table class="table table-sm table-bordered">
                    <thead class="table-success">
                        <tr>
                            <th>Categoria</th>
                            <th>Identificação</th>
                        </tr>
                    </thead>
                    <tbody>
                        <!-- Negativos -->
                        <tr>
                            <td class="table-light"><strong>Negativas (<1:4)</strong></td>
                            <td><input type="text" id="negativas" class="form-control form-control-sm" value="${tarefa.resultados?.negativas || ''}"></td>
                        </tr>
                        
                        <!-- Títulos -->
                        <tr class="table-light">
                            <td colspan="2" class="text-center fw-bold">Títulos Positivos</td>
                        </tr>
                        <tr>
                            <td><strong>1:4</strong></td>
                            <td><input type="text" id="titulo4" class="form-control form-control-sm" value="${tarefa.resultados?.titulo4 || ''}"></td>
                        </tr>
                        <tr>
                            <td><strong>1:8</strong></td>
                            <td><input type="text" id="titulo8" class="form-control form-control-sm" value="${tarefa.resultados?.titulo8 || ''}"></td>
                        </tr>
                        <tr>
                            <td><strong>1:16</strong></td>
                            <td><input type="text" id="titulo16" class="form-control form-control-sm" value="${tarefa.resultados?.titulo16 || ''}"></td>
                        </tr>
                        <tr>
                            <td><strong>1:32</strong></td>
                            <td><input type="text" id="titulo32" class="form-control form-control-sm" value="${tarefa.resultados?.titulo32 || ''}"></td>
                        </tr>
                        <tr>
                            <td><strong>1:64</strong></td>
                            <td><input type="text" id="titulo64" class="form-control form-control-sm" value="${tarefa.resultados?.titulo64 || ''}"></td>
                        </tr>
                        <tr>
                            <td><strong>1:128</strong></td>
                            <td><input type="text" id="titulo128" class="form-control form-control-sm" value="${tarefa.resultados?.titulo128 || ''}"></td>
                        </tr>
                        <tr>
                            <td><strong>1:256</strong></td>
                            <td><input type="text" id="titulo256" class="form-control form-control-sm" value="${tarefa.resultados?.titulo256 || ''}"></td>
                        </tr>
                        <tr>
                            <td><strong>1:≥512</strong></td>
                            <td><input type="text" id="titulo512" class="form-control form-control-sm" value="${tarefa.resultados?.titulo512 || ''}"></td>
                        </tr>
                        
                        <!-- Outros -->
                        <tr class="table-light">
                            <td colspan="2" class="text-center fw-bold">Outros</td>
                        </tr>
                        <tr>
                            <td><strong>Impróprias</strong></td>
                            <td><input type="text" id="improprias" class="form-control form-control-sm" value="${tarefa.resultados?.improprias || ''}"></td>
                        </tr>
                        <tr>
                            <td><strong>Tóxicas</strong></td>
                            <td><input type="text" id="toxicas" class="form-control form-control-sm" value="${tarefa.resultados?.toxicas || ''}"></td>
                        </tr>
                        <tr>
                            <td><strong>Quant. insuf.</strong></td>
                            <td><input type="text" id="insuficiente" class="form-control form-control-sm" value="${tarefa.resultados?.insuficiente || ''}"></td>
                        </tr>
                    </tbody>
                </table>
                
                <div class="d-flex justify-content-end gap-2 mt-3">
                    <button id="cancelar-resultados" class="btn btn-sm btn-danger rounded-pill px-3">
                        <i class="bi bi-x-circle me-1"></i>Cancelar
                    </button>
                    <button id="salvar-resultados" class="btn btn-sm btn-success rounded-pill px-3">
                        <i class="bi bi-save me-1"></i>Salvar
                    </button>
                </div>
                
                <button id="fechar-modal-resultados"
                    class="btn btn-sm btn-outline-danger position-absolute top-0 end-0 m-2 rounded-circle"
                    style="width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; padding: 0;">
                    <i class="bi bi-x"></i>
                </button>
            </div>
        `;

        document.body.appendChild(modal);

        // Event listeners para o modal
        const fecharModal = () => {
            if (document.body.contains(modal)) {
                document.body.removeChild(modal);
            }
            document.removeEventListener("keydown", handleKeyDown);
        };

        modal.querySelector("#fechar-modal-resultados").onclick = fecharModal;
        modal.querySelector("#cancelar-resultados").onclick = fecharModal;

        modal.querySelector("#salvar-resultados").onclick = async () => {
            try {
                mostrarLoading();

                const resultados = {
                    negativas: document.getElementById("negativas").value,
                    titulo4: document.getElementById("titulo4").value,
                    titulo8: document.getElementById("titulo8").value,
                    titulo16: document.getElementById("titulo16").value,
                    titulo32: document.getElementById("titulo32").value,
                    titulo64: document.getElementById("titulo64").value,
                    titulo128: document.getElementById("titulo128").value,
                    titulo256: document.getElementById("titulo256").value,
                    titulo512: document.getElementById("titulo512").value,
                    improprias: document.getElementById("improprias").value,
                    toxicas: document.getElementById("toxicas").value,
                    insuficiente: document.getElementById("insuficiente").value,
                    dataRegistro: Timestamp.now()
                };

                await updateDoc(tarefaRef, {
                    resultados: resultados,
                    status: "resultados-registrados",
                    atualizadoEm: Timestamp.now()
                });

                fecharModal();
                mostrarFeedback("Resultados salvos com sucesso!", "success");
            } catch (error) {
                console.error("Erro ao salvar resultados:", error);
                mostrarFeedback(`Erro: ${error.message}`, "error");
            } finally {
                esconderLoading();
            }
        };

        // Fechar modal ao clicar fora
        modal.onclick = (e) => {
            if (e.target === modal) fecharModal();
        };

        // Fechar com ESC
        const handleKeyDown = (e) => {
            if (e.key === "Escape") fecharModal();
        };
        document.addEventListener("keydown", handleKeyDown);

    } catch (error) {
        console.error("Erro ao registrar resultado:", error);
        mostrarFeedback(`Erro: ${error.message}`, "error");
    } finally {
        esconderLoading();
    }
}

// Função para registrar resultado ELISA
async function registrarResultadoELISA(id) {
    try {
        mostrarLoading();

        const tarefaRef = doc(db, "tarefas", id);
        const tarefaSnap = await getDoc(tarefaRef);

        if (!tarefaSnap.exists()) throw new Error("Tarefa não encontrada");

        const tarefa = tarefaSnap.data();

        // Array de amostras baseado na quantidade
        const amostras = [];
        for (let i = 0; i < tarefa.quantidade; i++) {
            amostras.push({
                id: i + 1,
                identificacao: tarefa.resultados?.amostras?.[i]?.identificacao || "",
                resultado: tarefa.resultados?.amostras?.[i]?.resultado || ""
            });
        }

        // Criar o modal
        const modal = document.createElement("div");
        modal.className = "modal-resultados";

        modal.innerHTML = `
            <div class="modal-resultados-content">
                <h3 class="text-success mb-3"><i class="bi bi-clipboard-data me-2"></i>Registrar Resultados - ${tarefa.tipo}${tarefa.subTipo ? ` - ${tarefa.subTipo}` : ''}</h3>
                <div class="alert alert-light border-start border-success border-4">
                    <div class="row">
                        <div class="col-md-6"><strong><i class="bi bi-upc me-2"></i>ID:</strong> ${tarefa.id}</div>
                        <div class="col-md-6"><strong><i class="bi bi-123 me-2"></i>Quantidade:</strong> ${tarefa.quantidade}</div>
                    </div>
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
                            ${amostras.map((amostra, index) => `
                                <tr>
                                    <td>
                                        <input type="text"
                                               class="form-control input-identificacao"
                                               data-index="${index}"
                                               value="${amostra.identificacao}"
                                               placeholder="Identificação #${amostra.id}">
                                    </td>
                                    <td>
                                        <select class="form-select select-resultado" data-index="${index}">
                                            <option value="">Selecione...</option>
                                            <option value="positivo" ${amostra.resultado === "positivo" ? "selected" : ""}>Positivo</option>
                                            <option value="negativo" ${amostra.resultado === "negativo" ? "selected" : ""}>Negativo</option>
                                        </select>
                                    </td>
                                </tr>
                            `).join("")}
                        </tbody>
                    </table>
                </div>
                
                <div class="mt-4 d-flex justify-content-end gap-3">
                    <button id="cancelar-resultados" class="btn btn-danger rounded-pill px-4">
                        <i class="bi bi-x-circle me-1"></i>Cancelar
                    </button>
                    <button id="salvar-resultados" class="btn btn-success rounded-pill px-4">
                        <i class="bi bi-save me-1"></i>Salvar Resultados
                    </button>
                </div>
                
                <button id="fechar-modal-resultados"
                    class="btn btn-sm btn-outline-danger position-absolute top-0 end-0 m-3 rounded-circle"
                    style="width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;">
                    <i class="bi bi-x-lg"></i>
                </button>
            </div>
        `;

        document.body.appendChild(modal);

        // Fechar modal
        const fecharModal = () => {
            if (document.body.contains(modal)) {
                document.body.removeChild(modal);
            }
            document.removeEventListener("keydown", handleKeyDown);
        };

        modal.querySelector("#fechar-modal-resultados").onclick = fecharModal;
        modal.querySelector("#cancelar-resultados").onclick = fecharModal;

        modal.querySelector("#salvar-resultados").onclick = async () => {
            try {
                mostrarLoading();
                const amostrasAtualizadas = [];
                const identificacoes = modal.querySelectorAll(".input-identificacao");
                const resultados = modal.querySelectorAll(".select-resultado");

                for (let i = 0; i < tarefa.quantidade; i++) {
                    amostrasAtualizadas.push({
                        id: i + 1,
                        identificacao: identificacoes[i].value.trim(),
                        resultado: resultados[i].value
                    });
                }

                await updateDoc(tarefaRef, {
                    resultados: {
                        amostras: amostrasAtualizadas,
                        dataRegistro: Timestamp.now()
                    },
                    status: "resultados-registrados",
                    atualizadoEm: Timestamp.now()
                });

                fecharModal();
                mostrarFeedback("Resultados salvos com sucesso!", "success");
            } catch (error) {
                console.error("Erro ao salvar resultados:", error);
                mostrarFeedback(`Erro: ${error.message}`, "error");
            } finally {
                esconderLoading();
            }
        };

        // Fechar modal ao clicar fora
        modal.onclick = (e) => {
            if (e.target === modal) fecharModal();
        };

        // Fechar com ESC
        const handleKeyDown = (e) => {
            if (e.key === "Escape") fecharModal();
        };
        document.addEventListener("keydown", handleKeyDown);

    } catch (error) {
        mostrarFeedback(`Erro: ${error.message}`, "error");
    } finally {
        esconderLoading();
    }
}

// Função para registrar resultado Molecular
async function registrarResultadoMolecular(id) {
    try {
        mostrarLoading();

        const tarefaRef = doc(db, "tarefas", id);
        const tarefaSnap = await getDoc(tarefaRef);

        if (!tarefaSnap.exists()) throw new Error("Tarefa não encontrada");

        const tarefa = tarefaSnap.data();

        // Verificar o tipo específico de Molecular e chamar a função apropriada
        switch(tarefa.subTipo) {
            case "PCR":
            case "RT-PCR":
                return registrarResultadoMolecularSimples(tarefa, tarefaRef);
            case "Duplex Rota e Corona Bovino":
                return registrarResultadoDuplexRotaCoronaBovino(tarefa, tarefaRef);
            case "Duplex Rota e Corona Equino":
                return registrarResultadoDuplexRotaCoronaEquino(tarefa, tarefaRef);
            case "Multiplex Crostas Bovina":
                return registrarResultadoMultiplexCrostasBovina(tarefa, tarefaRef);
            case "Multiplex Diarreia Neonatal Bovina":
                return registrarResultadoMultiplexDiarreiaBovinaNeonatal(tarefa, tarefaRef);
            case "Multiplex Doença Respiratória Bovina":
                return registrarResultadoMultiplexDoencaRespiratoriaBovina(tarefa, tarefaRef);
            case "Multiplex Encefalites Equina":
                return registrarResultadoMultiplexEncefalitesEquina(tarefa, tarefaRef);
            default:
                return registrarResultadoMolecularSimples(tarefa, tarefaRef);
        }

    } catch (error) {
        console.error("Erro ao registrar resultado PCR:", error);
        mostrarFeedback(`Erro: ${error.message}`, "error");
    } finally {
        esconderLoading();
    }
}

// Função para PCR simples (sem seleção de DNA/RNA)
async function registrarResultadoMolecularSimples(tarefa, tarefaRef) {
    // Array de amostras baseado na quantidade
    const amostras = [];
    for (let i = 0; i < tarefa.quantidade; i++) {
        amostras.push({
            id: i + 1,
            identificacao: tarefa.resultados?.amostras?.[i]?.identificacao || "",
            resultado: tarefa.resultados?.amostras?.[i]?.resultado || ""
        });
    }

    // Criar o modal
    const modal = document.createElement("div");
    modal.className = "modal-resultados";

    modal.innerHTML = `
        <div class="modal-resultados-content">
            <h3 class="text-success mb-3"><i class="bi bi-clipboard-data me-2"></i>Registrar Resultados - ${tarefa.tipo}${tarefa.subTipo ? ` - ${tarefa.subTipo}` : ''}</h3>
            <div class="alert alert-light border-start border-success border-4">
                <div class="row">
                    <div class="col-md-6"><strong><i class="bi bi-upc me-2"></i>ID:</strong> ${tarefa.id}</div>
                    <div class="col-md-6"><strong><i class="bi bi-123 me-2"></i>Quantidade:</strong> ${tarefa.quantidade}</div>
                </div>
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
                        ${amostras.map((amostra, index) => `
                            <tr>
                                <td>
                                    <input type="text"
                                           class="form-control input-identificacao"
                                           data-index="${index}"
                                           value="${amostra.identificacao}"
                                           placeholder="Identificação #${amostra.id}">
                                </td>
                                <td>
                                    <select class="form-select select-resultado" data-index="${index}">
                                        <option value="">Selecione...</option>
                                        <option value="positivo" ${amostra.resultado === "positivo" ? "selected" : ""}>Positivo</option>
                                        <option value="negativo" ${amostra.resultado === "negativo" ? "selected" : ""}>Negativo</option>
                                    </select>
                                </td>
                            </tr>
                        `).join("")}
                    </tbody>
                </table>
            </div>
            
            <div class="mt-4 d-flex justify-content-end gap-3">
                <button id="cancelar-resultados" class="btn btn-danger rounded-pill px-4">
                    <i class="bi bi-x-circle me-1"></i>Cancelar
                </button>
                <button id="salvar-resultados" class="btn btn-success rounded-pill px-4">
                    <i class="bi bi-save me-1"></i>Salvar Resultados
                </button>
            </div>
            
            <button id="fechar-modal-resultados"
                class="btn btn-sm btn-outline-danger position-absolute top-0 end-0 m-3 rounded-circle"
                style="width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;">
                <i class="bi bi-x-lg"></i>
            </button>
        </div>
    `;

    document.body.appendChild(modal);

    // Fechar modal
    const fecharModal = () => {
        if (document.body.contains(modal)) {
            document.body.removeChild(modal);
        }
        document.removeEventListener("keydown", handleKeyDown);
    };

    modal.querySelector("#fechar-modal-resultados").onclick = fecharModal;
    modal.querySelector("#cancelar-resultados").onclick = fecharModal;

    modal.querySelector("#salvar-resultados").onclick = async () => {
        try {
            mostrarLoading();
            const amostrasAtualizadas = [];
            const identificacoes = modal.querySelectorAll(".input-identificacao");
            const resultados = modal.querySelectorAll(".select-resultado");

            for (let i = 0; i < tarefa.quantidade; i++) {
                amostrasAtualizadas.push({
                    id: i + 1,
                    identificacao: identificacoes[i].value.trim(),
                    resultado: resultados[i].value
                });
            }

            await updateDoc(tarefaRef, {
                resultados: {
                    amostras: amostrasAtualizadas,
                    dataRegistro: Timestamp.now()
                },
                status: "resultados-registrados",
                atualizadoEm: Timestamp.now()
            });

            fecharModal();
            mostrarFeedback("Resultados salvos com sucesso!", "success");
        } catch (error) {
            console.error("Erro ao salvar resultados:", error);
            mostrarFeedback(`Erro: ${error.message}`, "error");
        } finally {
            esconderLoading();
        }
    };

    // Fechar modal ao clicar fora
    modal.onclick = (e) => {
        if (e.target === modal) fecharModal();
    };

    // Fechar com ESC
    const handleKeyDown = (e) => {
        if (e.key === "Escape") fecharModal();
    };
    document.addEventListener("keydown", handleKeyDown);
}

// Função para Duplex Rota e Corona Bovino
async function registrarResultadoDuplexRotaCoronaBovino(tarefa, tarefaRef) {
    // Array de amostras baseado na quantidade
    const amostras = [];
    for (let i = 0; i < tarefa.quantidade; i++) {
        amostras.push({
            id: i + 1,
            identificacao: tarefa.resultados?.amostras?.[i]?.identificacao || "",
            coronavirusBovino: tarefa.resultados?.amostras?.[i]?.coronavirusBovino || "",
            rotavirusBovino: tarefa.resultados?.amostras?.[i]?.rotavirusBovino || ""
        });
    }

    // Criar o modal
    const modal = document.createElement("div");
    modal.className = "modal-resultados";

    modal.innerHTML = `
        <div class="modal-resultados-content">
            <h3 class="text-success mb-3"><i class="bi bi-clipboard-data me-2"></i>Registrar Resultados - ${tarefa.tipo} - ${tarefa.subTipo}</h3>
            <div class="alert alert-light border-start border-success border-4">
                <div class="row">
                    <div class="col-md-6"><strong><i class="bi bi-upc me-2"></i>ID:</strong> ${tarefa.id}</div>
                    <div class="col-md-6"><strong><i class="bi bi-123 me-2"></i>Quantidade:</strong> ${tarefa.quantidade}</div>
                </div>
            </div>
            
            <!-- Tabela para Coronavírus Bovino (BCoV) -->
            <div class="mb-4">
                <h5 class="text-primary mb-3"><i class="bi bi-virus me-2"></i>Coronavírus Bovino (BCoV)</h5>
                <div class="table-responsive">
                    <table class="tabela-resultados table table-hover">
                        <thead class="table-primary">
                            <tr>
                                <th>Identificação da amostra</th>
                                <th>Resultado - BCoV</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${amostras.map((amostra, index) => `
                                <tr>
                                    <td>
                                        <input type="text"
                                               class="form-control input-identificacao"
                                               data-index="${index}"
                                               value="${amostra.identificacao}"
                                               placeholder="Identificação #${amostra.id}">
                                    </td>
                                    <td>
                                        <select class="form-select select-coronavirus" data-index="${index}">
                                            <option value="">Selecione...</option>
                                            <option value="positivo" ${amostra.coronavirusBovino === "positivo" ? "selected" : ""}>Positivo</option>
                                            <option value="negativo" ${amostra.coronavirusBovino === "negativo" ? "selected" : ""}>Negativo</option>
                                        </select>
                                    </td>
                                </tr>
                            `).join("")}
                        </tbody>
                    </table>
                </div>
            </div>
            
            <!-- Tabela para Rotavírus Bovino (BRoV) -->
            <div class="mb-4">
                <h5 class="text-info mb-3"><i class="bi bi-virus2 me-2"></i>Rotavírus Bovino (BRoV)</h5>
                <div class="table-responsive">
                    <table class="tabela-resultados table table-hover">
                        <thead class="table-info">
                            <tr>
                                <th>Identificação da amostra</th>
                                <th>Resultado - BRoV</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${amostras.map((amostra, index) => `
                                <tr>
                                    <td>
                                        <span class="form-control-plaintext">${amostra.identificacao || `Amostra #${amostra.id}`}</span>
                                    </td>
                                    <td>
                                        <select class="form-select select-rotavirus" data-index="${index}">
                                            <option value="">Selecione...</option>
                                            <option value="positivo" ${amostra.rotavirusBovino === "positivo" ? "selected" : ""}>Positivo</option>
                                            <option value="negativo" ${amostra.rotavirusBovino === "negativo" ? "selected" : ""}>Negativo</option>
                                        </select>
                                    </td>
                                </tr>
                            `).join("")}
                        </tbody>
                    </table>
                </div>
            </div>
            
            <div class="mt-4 d-flex justify-content-end gap-3">
                <button id="cancelar-resultados" class="btn btn-danger rounded-pill px-4">
                    <i class="bi bi-x-circle me-1"></i>Cancelar
                </button>
                <button id="salvar-resultados" class="btn btn-success rounded-pill px-4">
                    <i class="bi bi-save me-1"></i>Salvar Resultados
                </button>
            </div>
            
            <button id="fechar-modal-resultados"
                class="btn btn-sm btn-outline-danger position-absolute top-0 end-0 m-3 rounded-circle"
                style="width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;">
                <i class="bi bi-x-lg"></i>
            </button>
        </div>
    `;

    document.body.appendChild(modal);

    // Fechar modal
    const fecharModal = () => {
        if (document.body.contains(modal)) {
            document.body.removeChild(modal);
        }
        document.removeEventListener("keydown", handleKeyDown);
    };

    modal.querySelector("#fechar-modal-resultados").onclick = fecharModal;
    modal.querySelector("#cancelar-resultados").onclick = fecharModal;

    // Sincronizar identificação entre as tabelas
    const inputsIdentificacao = modal.querySelectorAll(".input-identificacao");
    inputsIdentificacao.forEach((input, index) => {
        input.addEventListener('input', function() {
            const identificacao = this.value;
            // Atualizar o texto na segunda tabela
            const span = modal.querySelectorAll('.form-control-plaintext')[index];
            if (span) {
                span.textContent = identificacao || `Amostra #${index + 1}`;
            }
        });
    });

    modal.querySelector("#salvar-resultados").onclick = async () => {
        try {
            mostrarLoading();
            const amostrasAtualizadas = [];
            const identificacoes = modal.querySelectorAll(".input-identificacao");
            const resultadosCorona = modal.querySelectorAll(".select-coronavirus");
            const resultadosRota = modal.querySelectorAll(".select-rotavirus");

            for (let i = 0; i < tarefa.quantidade; i++) {
                amostrasAtualizadas.push({
                    id: i + 1,
                    identificacao: identificacoes[i].value.trim(),
                    coronavirusBovino: resultadosCorona[i].value,
                    rotavirusBovino: resultadosRota[i].value
                });
            }

            await updateDoc(tarefaRef, {
                resultados: {
                    amostras: amostrasAtualizadas,
                    dataRegistro: Timestamp.now()
                },
                status: "resultados-registrados",
                atualizadoEm: Timestamp.now()
            });

            fecharModal();
            mostrarFeedback("Resultados salvos com sucesso!", "success");
        } catch (error) {
            console.error("Erro ao salvar resultados:", error);
            mostrarFeedback(`Erro: ${error.message}`, "error");
        } finally {
            esconderLoading();
        }
    };

    // Fechar modal ao clicar fora
    modal.onclick = (e) => {
        if (e.target === modal) fecharModal();
    };

    // Fechar com ESC
    const handleKeyDown = (e) => {
        if (e.key === "Escape") fecharModal();
    };
    document.addEventListener("keydown", handleKeyDown);
}

// Função para Duplex Rota e Corona Equino  
async function registrarResultadoDuplexRotaCoronaEquino(tarefa, tarefaRef) {
    // Array de amostras baseado na quantidade
    const amostras = [];
    for (let i = 0; i < tarefa.quantidade; i++) {
        amostras.push({
            id: i + 1,
            identificacao: tarefa.resultados?.amostras?.[i]?.identificacao || "",
            coronavirusEquino: tarefa.resultados?.amostras?.[i]?.coronavirusEquino || "",
            rotavirusEquino: tarefa.resultados?.amostras?.[i]?.rotavirusEquino || ""
        });
    }

    // Criar o modal
    const modal = document.createElement("div");
    modal.className = "modal-resultados";

    modal.innerHTML = `
        <div class="modal-resultados-content">
            <h3 class="text-success mb-3"><i class="bi bi-clipboard-data me-2"></i>Registrar Resultados - ${tarefa.tipo} - ${tarefa.subTipo}</h3>
            <div class="alert alert-light border-start border-success border-4">
                <div class="row">
                    <div class="col-md-6"><strong><i class="bi bi-upc me-2"></i>ID:</strong> ${tarefa.id}</div>
                    <div class="col-md-6"><strong><i class="bi bi-123 me-2"></i>Quantidade:</strong> ${tarefa.quantidade}</div>
                </div>
            </div>
            
            <!-- Tabela para Coronavírus Equino -->
            <div class="mb-4">
                <h5 class="text-primary mb-3"><i class="bi bi-virus me-2"></i>Coronavírus Equino</h5>
                <div class="table-responsive">
                    <table class="tabela-resultados table table-hover">
                        <thead class="table-primary">
                            <tr>
                                <th>Identificação da amostra</th>
                                <th>Resultado - Coronavírus Equino</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${amostras.map((amostra, index) => `
                                <tr>
                                    <td>
                                        <input type="text"
                                               class="form-control input-identificacao"
                                               data-index="${index}"
                                               value="${amostra.identificacao}"
                                               placeholder="Identificação #${amostra.id}">
                                    </td>
                                    <td>
                                        <select class="form-select select-coronavirus" data-index="${index}">
                                            <option value="">Selecione...</option>
                                            <option value="positivo" ${amostra.coronavirusEquino === "positivo" ? "selected" : ""}>Positivo</option>
                                            <option value="negativo" ${amostra.coronavirusEquino === "negativo" ? "selected" : ""}>Negativo</option>
                                        </select>
                                    </td>
                                </tr>
                            `).join("")}
                        </tbody>
                    </table>
                </div>
            </div>
            
            <!-- Tabela para Rotavírus Equino -->
            <div class="mb-4">
                <h5 class="text-info mb-3"><i class="bi bi-virus2 me-2"></i>Rotavírus Equino</h5>
                <div class="table-responsive">
                    <table class="tabela-resultados table table-hover">
                        <thead class="table-info">
                            <tr>
                                <th>Identificação da amostra</th>
                                <th>Resultado - Rotavírus Equino</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${amostras.map((amostra, index) => `
                                <tr>
                                    <td>
                                        <span class="form-control-plaintext">${amostra.identificacao || `Amostra #${amostra.id}`}</span>
                                    </td>
                                    <td>
                                        <select class="form-select select-rotavirus" data-index="${index}">
                                            <option value="">Selecione...</option>
                                            <option value="positivo" ${amostra.rotavirusEquino === "positivo" ? "selected" : ""}>Positivo</option>
                                            <option value="negativo" ${amostra.rotavirusEquino === "negativo" ? "selected" : ""}>Negativo</option>
                                        </select>
                                    </td>
                                </tr>
                            `).join("")}
                        </tbody>
                    </table>
                </div>
            </div>
            
            <div class="mt-4 d-flex justify-content-end gap-3">
                <button id="cancelar-resultados" class="btn btn-danger rounded-pill px-4">
                    <i class="bi bi-x-circle me-1"></i>Cancelar
                </button>
                <button id="salvar-resultados" class="btn btn-success rounded-pill px-4">
                    <i class="bi bi-save me-1"></i>Salvar Resultados
                </button>
            </div>
            
            <button id="fechar-modal-resultados"
                class="btn btn-sm btn-outline-danger position-absolute top-0 end-0 m-3 rounded-circle"
                style="width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;">
                <i class="bi bi-x-lg"></i>
            </button>
        </div>
    `;

    document.body.appendChild(modal);

    // Fechar modal
    const fecharModal = () => {
        if (document.body.contains(modal)) {
            document.body.removeChild(modal);
        }
        document.removeEventListener("keydown", handleKeyDown);
    };

    modal.querySelector("#fechar-modal-resultados").onclick = fecharModal;
    modal.querySelector("#cancelar-resultados").onclick = fecharModal;

    // Sincronizar identificação entre as tabelas
    const inputsIdentificacao = modal.querySelectorAll(".input-identificacao");
    inputsIdentificacao.forEach((input, index) => {
        input.addEventListener('input', function() {
            const identificacao = this.value;
            // Atualizar o texto na segunda tabela
            const span = modal.querySelectorAll('.form-control-plaintext')[index];
            if (span) {
                span.textContent = identificacao || `Amostra #${index + 1}`;
            }
        });
    });

    modal.querySelector("#salvar-resultados").onclick = async () => {
        try {
            mostrarLoading();
            const amostrasAtualizadas = [];
            const identificacoes = modal.querySelectorAll(".input-identificacao");
            const resultadosCorona = modal.querySelectorAll(".select-coronavirus");
            const resultadosRota = modal.querySelectorAll(".select-rotavirus");

            for (let i = 0; i < tarefa.quantidade; i++) {
                amostrasAtualizadas.push({
                    id: i + 1,
                    identificacao: identificacoes[i].value.trim(),
                    coronavirusEquino: resultadosCorona[i].value,
                    rotavirusEquino: resultadosRota[i].value
                });
            }

            await updateDoc(tarefaRef, {
                resultados: {
                    amostras: amostrasAtualizadas,
                    dataRegistro: Timestamp.now()
                },
                status: "resultados-registrados",
                atualizadoEm: Timestamp.now()
            });

            fecharModal();
            mostrarFeedback("Resultados salvos com sucesso!", "success");
        } catch (error) {
            console.error("Erro ao salvar resultados:", error);
            mostrarFeedback(`Erro: ${error.message}`, "error");
        } finally {
            esconderLoading();
        }
    };

    // Fechar modal ao clicar fora
    modal.onclick = (e) => {
        if (e.target === modal) fecharModal();
    };

    // Fechar com ESC
    const handleKeyDown = (e) => {
        if (e.key === "Escape") fecharModal();
    };
    document.addEventListener("keydown", handleKeyDown);
}

// Função para Multiplex Crostas Bovina
async function registrarResultadoMultiplexCrostasBovina(tarefa, tarefaRef) {
    // Array de amostras baseado na quantidade
    const amostras = [];
    for (let i = 0; i < tarefa.quantidade; i++) {
        amostras.push({
            id: i + 1,
            identificacao: tarefa.resultados?.amostras?.[i]?.identificacao || "",
            vaccinia: tarefa.resultados?.amostras?.[i]?.vaccinia || "",
            pseudocowpox: tarefa.resultados?.amostras?.[i]?.pseudocowpox || "",
            estomatitePapular: tarefa.resultados?.amostras?.[i]?.estomatitePapular || "",
            herpesvirus: tarefa.resultados?.amostras?.[i]?.herpesvirus || ""
        });
    }

    // Criar o modal
    const modal = document.createElement("div");
    modal.className = "modal-resultados";

    modal.innerHTML = `
        <div class="modal-resultados-content" style="max-width: 90%; max-height: 85vh; overflow-y: auto;">
            <h3 class="text-success mb-3"><i class="bi bi-clipboard-data me-2"></i>Registrar Resultados - ${tarefa.tipo} - ${tarefa.subTipo}</h3>
            <div class="alert alert-light border-start border-success border-4">
                <div class="row">
                    <div class="col-md-6"><strong><i class="bi bi-upc me-2"></i>ID:</strong> ${tarefa.id}</div>
                    <div class="col-md-6"><strong><i class="bi bi-123 me-2"></i>Quantidade:</strong> ${tarefa.quantidade}</div>
                </div>
            </div>
            
            <!-- Tabela para Vaccínia -->
            <div class="mb-4">
                <h5 class="text-primary mb-3"><i class="bi bi-virus me-2"></i>Vaccínia</h5>
                <div class="table-responsive">
                    <table class="tabela-resultados table table-hover table-sm">
                        <thead class="table-primary">
                            <tr>
                                <th>Identificação da amostra</th>
                                <th>Resultado - Vaccínia</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${amostras.map((amostra, index) => `
                                <tr>
                                    <td>
                                        <input type="text"
                                               class="form-control form-control-sm input-identificacao"
                                               data-index="${index}"
                                               value="${amostra.identificacao}"
                                               placeholder="Identificação #${amostra.id}">
                                    </td>
                                    <td>
                                        <select class="form-select form-select-sm select-vaccinia" data-index="${index}">
                                            <option value="">Selecione...</option>
                                            <option value="positivo" ${amostra.vaccinia === "positivo" ? "selected" : ""}>Positivo</option>
                                            <option value="negativo" ${amostra.vaccinia === "negativo" ? "selected" : ""}>Negativo</option>
                                        </select>
                                    </td>
                                </tr>
                            `).join("")}
                        </tbody>
                    </table>
                </div>
            </div>
            
            <!-- Tabela para Pseudocowpox -->
            <div class="mb-4">
                <h5 class="text-info mb-3"><i class="bi bi-virus2 me-2"></i>Pseudocowpox</h5>
                <div class="table-responsive">
                    <table class="tabela-resultados table table-hover table-sm">
                        <thead class="table-info">
                            <tr>
                                <th>Identificação da amostra</th>
                                <th>Resultado - Pseudocowpox</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${amostras.map((amostra, index) => `
                                <tr>
                                    <td>
                                        <span class="form-control-plaintext text-sm">${amostra.identificacao || `Amostra #${amostra.id}`}</span>
                                    </td>
                                    <td>
                                        <select class="form-select form-select-sm select-pseudocowpox" data-index="${index}">
                                            <option value="">Selecione...</option>
                                            <option value="positivo" ${amostra.pseudocowpox === "positivo" ? "selected" : ""}>Positivo</option>
                                            <option value="negativo" ${amostra.pseudocowpox === "negativo" ? "selected" : ""}>Negativo</option>
                                        </select>
                                    </td>
                                </tr>
                            `).join("")}
                        </tbody>
                    </table>
                </div>
            </div>
            
            <!-- Tabela para Estomatite Papular Bovina -->
            <div class="mb-4">
                <h5 class="text-warning mb-3"><i class="bi bi-virus me-2"></i>Estomatite Papular Bovina</h5>
                <div class="table-responsive">
                    <table class="tabela-resultados table table-hover table-sm">
                        <thead class="table-warning">
                            <tr>
                                <th>Identificação da amostra</th>
                                <th>Resultado - Estomatite Papular</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${amostras.map((amostra, index) => `
                                <tr>
                                    <td>
                                        <span class="form-control-plaintext text-sm">${amostra.identificacao || `Amostra #${amostra.id}`}</span>
                                    </td>
                                    <td>
                                        <select class="form-select form-select-sm select-estomatite" data-index="${index}">
                                            <option value="">Selecione...</option>
                                            <option value="positivo" ${amostra.estomatitePapular === "positivo" ? "selected" : ""}>Positivo</option>
                                            <option value="negativo" ${amostra.estomatitePapular === "negativo" ? "selected" : ""}>Negativo</option>
                                        </select>
                                    </td>
                                </tr>
                            `).join("")}
                        </tbody>
                    </table>
                </div>
            </div>
            
            <!-- Tabela para Herpesvírus Bovino tipo 2 -->
            <div class="mb-4">
                <h5 class="text-danger mb-3"><i class="bi bi-virus2 me-2"></i>Herpesvírus Bovino tipo 2</h5>
                <div class="table-responsive">
                    <table class="tabela-resultados table table-hover table-sm">
                        <thead class="table-danger">
                            <tr>
                                <th>Identificação da amostra</th>
                                <th>Resultado - BoHV-2</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${amostras.map((amostra, index) => `
                                <tr>
                                    <td>
                                        <span class="form-control-plaintext text-sm">${amostra.identificacao || `Amostra #${amostra.id}`}</span>
                                    </td>
                                    <td>
                                        <select class="form-select form-select-sm select-herpesvirus" data-index="${index}">
                                            <option value="">Selecione...</option>
                                            <option value="positivo" ${amostra.herpesvirus === "positivo" ? "selected" : ""}>Positivo</option>
                                            <option value="negativo" ${amostra.herpesvirus === "negativo" ? "selected" : ""}>Negativo</option>
                                        </select>
                                    </td>
                                </tr>
                            `).join("")}
                        </tbody>
                    </table>
                </div>
            </div>
            
            <div class="mt-4 d-flex justify-content-end gap-3">
                <button id="cancelar-resultados" class="btn btn-danger rounded-pill px-4">
                    <i class="bi bi-x-circle me-1"></i>Cancelar
                </button>
                <button id="salvar-resultados" class="btn btn-success rounded-pill px-4">
                    <i class="bi bi-save me-1"></i>Salvar Resultados
                </button>
            </div>
            
            <button id="fechar-modal-resultados"
                class="btn btn-sm btn-outline-danger position-absolute top-0 end-0 m-3 rounded-circle"
                style="width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;">
                <i class="bi bi-x-lg"></i>
            </button>
        </div>
    `;

    document.body.appendChild(modal);

    // Fechar modal
    const fecharModal = () => {
        if (document.body.contains(modal)) {
            document.body.removeChild(modal);
        }
        document.removeEventListener("keydown", handleKeyDown);
    };

    modal.querySelector("#fechar-modal-resultados").onclick = fecharModal;
    modal.querySelector("#cancelar-resultados").onclick = fecharModal;

    // Sincronizar identificação entre as tabelas
    const inputsIdentificacao = modal.querySelectorAll(".input-identificacao");
    inputsIdentificacao.forEach((input, index) => {
        input.addEventListener('input', function() {
            const identificacao = this.value;
            // Atualizar o texto nas outras tabelas (Multiplex Crostas tem 4 tabelas: Vaccínia, Pseudocowpox, Estomatite, Herpesvírus)
            const spans = modal.querySelectorAll('.form-control-plaintext');
            // Para 4 tabelas: spans estão agrupados por 3 (segunda, terceira e quarta tabela de cada amostra)
            const spansParaEstaAmostra = [
                index + tarefa.quantidade * 0, // Pseudocowpox (segunda tabela)  
                index + tarefa.quantidade * 1, // Estomatite (terceira tabela)
                index + tarefa.quantidade * 2  // Herpesvírus (quarta tabela)
            ];
            
            spansParaEstaAmostra.forEach(spanIndex => {
                if (spans[spanIndex]) {
                    spans[spanIndex].textContent = identificacao || `Amostra #${index + 1}`;
                }
            });
        });
    });

    modal.querySelector("#salvar-resultados").onclick = async () => {
        try {
            mostrarLoading();
            const amostrasAtualizadas = [];
            const identificacoes = modal.querySelectorAll(".input-identificacao");
            const resultadosVaccinia = modal.querySelectorAll(".select-vaccinia");
            const resultadosPseudocowpox = modal.querySelectorAll(".select-pseudocowpox");
            const resultadosEstomatite = modal.querySelectorAll(".select-estomatite");
            const resultadosHerpesvirus = modal.querySelectorAll(".select-herpesvirus");

            for (let i = 0; i < tarefa.quantidade; i++) {
                amostrasAtualizadas.push({
                    id: i + 1,
                    identificacao: identificacoes[i].value.trim(),
                    vaccinia: resultadosVaccinia[i].value,
                    pseudocowpox: resultadosPseudocowpox[i].value,
                    estomatitePapular: resultadosEstomatite[i].value,
                    herpesvirus: resultadosHerpesvirus[i].value
                });
            }

            await updateDoc(tarefaRef, {
                resultados: {
                    amostras: amostrasAtualizadas,
                    dataRegistro: Timestamp.now()
                },
                status: "resultados-registrados",
                atualizadoEm: Timestamp.now()
            });

            fecharModal();
            mostrarFeedback("Resultados salvos com sucesso!", "success");
        } catch (error) {
            console.error("Erro ao salvar resultados:", error);
            mostrarFeedback(`Erro: ${error.message}`, "error");
        } finally {
            esconderLoading();
        }
    };

    // Fechar modal ao clicar fora
    modal.onclick = (e) => {
        if (e.target === modal) fecharModal();
    };

    // Fechar com ESC
    const handleKeyDown = (e) => {
        if (e.key === "Escape") fecharModal();
    };
    document.addEventListener("keydown", handleKeyDown);
}

// Função para Multiplex Diarreia Neonatal Bovina
async function registrarResultadoMultiplexDiarreiaBovinaNeonatal(tarefa, tarefaRef) {
    // Array de amostras baseado na quantidade
    const amostras = [];
    for (let i = 0; i < tarefa.quantidade; i++) {
        amostras.push({
            id: i + 1,
            identificacao: tarefa.resultados?.amostras?.[i]?.identificacao || "",
            ecoli: tarefa.resultados?.amostras?.[i]?.ecoli || "",
            salmonella: tarefa.resultados?.amostras?.[i]?.salmonella || "",
            coronavirusBovino: tarefa.resultados?.amostras?.[i]?.coronavirusBovino || "",
            rotavirusBovino: tarefa.resultados?.amostras?.[i]?.rotavirusBovino || "",
            cryptosporidium: tarefa.resultados?.amostras?.[i]?.cryptosporidium || ""
        });
    }

    // Criar o modal
    const modal = document.createElement("div");
    modal.className = "modal-resultados";

    modal.innerHTML = `
        <div class="modal-resultados-content" style="max-width: 95%; max-height: 90vh; overflow-y: auto;">
            <h3 class="text-success mb-3"><i class="bi bi-clipboard-data me-2"></i>Registrar Resultados - ${tarefa.tipo} - ${tarefa.subTipo}</h3>
            <div class="alert alert-light border-start border-success border-4">
                <div class="row">
                    <div class="col-md-6"><strong><i class="bi bi-upc me-2"></i>ID:</strong> ${tarefa.id}</div>
                    <div class="col-md-6"><strong><i class="bi bi-123 me-2"></i>Quantidade:</strong> ${tarefa.quantidade}</div>
                </div>
            </div>
            
            <!-- Tabela para E. coli -->
            <div class="mb-3">
                <h6 class="text-primary mb-2"><i class="bi bi-virus me-2"></i>E. coli</h6>
                <div class="table-responsive">
                    <table class="tabela-resultados table table-hover table-sm">
                        <thead class="table-primary">
                            <tr>
                                <th style="width: 60%;">Identificação da amostra</th>
                                <th style="width: 40%;">Resultado - E. coli</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${amostras.map((amostra, index) => `
                                <tr>
                                    <td>
                                        <input type="text"
                                               class="form-control form-control-sm input-identificacao"
                                               data-index="${index}"
                                               value="${amostra.identificacao}"
                                               placeholder="Identificação #${amostra.id}">
                                    </td>
                                    <td>
                                        <select class="form-select form-select-sm select-ecoli" data-index="${index}">
                                            <option value="">Selecione...</option>
                                            <option value="positivo" ${amostra.ecoli === "positivo" ? "selected" : ""}>Positivo</option>
                                            <option value="negativo" ${amostra.ecoli === "negativo" ? "selected" : ""}>Negativo</option>
                                        </select>
                                    </td>
                                </tr>
                            `).join("")}
                        </tbody>
                    </table>
                </div>
            </div>
            
            <!-- Tabela para Salmonella -->
            <div class="mb-3">
                <h6 class="text-info mb-2"><i class="bi bi-virus2 me-2"></i>Salmonella</h6>
                <div class="table-responsive">
                    <table class="tabela-resultados table table-hover table-sm">
                        <thead class="table-info">
                            <tr>
                                <th style="width: 60%;">Identificação da amostra</th>
                                <th style="width: 40%;">Resultado - Salmonella</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${amostras.map((amostra, index) => `
                                <tr>
                                    <td>
                                        <span class="form-control-plaintext small">${amostra.identificacao || `Amostra #${amostra.id}`}</span>
                                    </td>
                                    <td>
                                        <select class="form-select form-select-sm select-salmonella" data-index="${index}">
                                            <option value="">Selecione...</option>
                                            <option value="positivo" ${amostra.salmonella === "positivo" ? "selected" : ""}>Positivo</option>
                                            <option value="negativo" ${amostra.salmonella === "negativo" ? "selected" : ""}>Negativo</option>
                                        </select>
                                    </td>
                                </tr>
                            `).join("")}
                        </tbody>
                    </table>
                </div>
            </div>
            
            <!-- Tabela para Coronavírus Bovino -->
            <div class="mb-3">
                <h6 class="text-warning mb-2"><i class="bi bi-virus me-2"></i>Coronavírus Bovino</h6>
                <div class="table-responsive">
                    <table class="tabela-resultados table table-hover table-sm">
                        <thead class="table-warning">
                            <tr>
                                <th style="width: 60%;">Identificação da amostra</th>
                                <th style="width: 40%;">Resultado - BCoV</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${amostras.map((amostra, index) => `
                                <tr>
                                    <td>
                                        <span class="form-control-plaintext small">${amostra.identificacao || `Amostra #${amostra.id}`}</span>
                                    </td>
                                    <td>
                                        <select class="form-select form-select-sm select-coronavirus" data-index="${index}">
                                            <option value="">Selecione...</option>
                                            <option value="positivo" ${amostra.coronavirusBovino === "positivo" ? "selected" : ""}>Positivo</option>
                                            <option value="negativo" ${amostra.coronavirusBovino === "negativo" ? "selected" : ""}>Negativo</option>
                                        </select>
                                    </td>
                                </tr>
                            `).join("")}
                        </tbody>
                    </table>
                </div>
            </div>
            
            <!-- Tabela para Rotavírus Bovino -->
            <div class="mb-3">
                <h6 class="text-danger mb-2"><i class="bi bi-virus2 me-2"></i>Rotavírus Bovino</h6>
                <div class="table-responsive">
                    <table class="tabela-resultados table table-hover table-sm">
                        <thead class="table-danger">
                            <tr>
                                <th style="width: 60%;">Identificação da amostra</th>
                                <th style="width: 40%;">Resultado - BRoV</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${amostras.map((amostra, index) => `
                                <tr>
                                    <td>
                                        <span class="form-control-plaintext small">${amostra.identificacao || `Amostra #${amostra.id}`}</span>
                                    </td>
                                    <td>
                                        <select class="form-select form-select-sm select-rotavirus" data-index="${index}">
                                            <option value="">Selecione...</option>
                                            <option value="positivo" ${amostra.rotavirusBovino === "positivo" ? "selected" : ""}>Positivo</option>
                                            <option value="negativo" ${amostra.rotavirusBovino === "negativo" ? "selected" : ""}>Negativo</option>
                                        </select>
                                    </td>
                                </tr>
                            `).join("")}
                        </tbody>
                    </table>
                </div>
            </div>
            
            <!-- Tabela para Cryptosporidium parvum -->
            <div class="mb-4">
                <h6 class="text-secondary mb-2"><i class="bi bi-virus me-2"></i>Cryptosporidium parvum</h6>
                <div class="table-responsive">
                    <table class="tabela-resultados table table-hover table-sm">
                        <thead class="table-secondary">
                            <tr>
                                <th style="width: 60%;">Identificação da amostra</th>
                                <th style="width: 40%;">Resultado - C. parvum</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${amostras.map((amostra, index) => `
                                <tr>
                                    <td>
                                        <span class="form-control-plaintext small">${amostra.identificacao || `Amostra #${amostra.id}`}</span>
                                    </td>
                                    <td>
                                        <select class="form-select form-select-sm select-cryptosporidium" data-index="${index}">
                                            <option value="">Selecione...</option>
                                            <option value="positivo" ${amostra.cryptosporidium === "positivo" ? "selected" : ""}>Positivo</option>
                                            <option value="negativo" ${amostra.cryptosporidium === "negativo" ? "selected" : ""}>Negativo</option>
                                        </select>
                                    </td>
                                </tr>
                            `).join("")}
                        </tbody>
                    </table>
                </div>
            </div>
            
            <div class="mt-4 d-flex justify-content-end gap-3">
                <button id="cancelar-resultados" class="btn btn-danger rounded-pill px-4">
                    <i class="bi bi-x-circle me-1"></i>Cancelar
                </button>
                <button id="salvar-resultados" class="btn btn-success rounded-pill px-4">
                    <i class="bi bi-save me-1"></i>Salvar Resultados
                </button>
            </div>
            
            <button id="fechar-modal-resultados"
                class="btn btn-sm btn-outline-danger position-absolute top-0 end-0 m-3 rounded-circle"
                style="width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;">
                <i class="bi bi-x-lg"></i>
            </button>
        </div>
    `;

    document.body.appendChild(modal);

    // Fechar modal
    const fecharModal = () => {
        if (document.body.contains(modal)) {
            document.body.removeChild(modal);
        }
        document.removeEventListener("keydown", handleKeyDown);
    };

    modal.querySelector("#fechar-modal-resultados").onclick = fecharModal;
    modal.querySelector("#cancelar-resultados").onclick = fecharModal;

    // Sincronizar identificação entre as tabelas
    const inputsIdentificacao = modal.querySelectorAll(".input-identificacao");
    inputsIdentificacao.forEach((input, index) => {
        input.addEventListener('input', function() {
            const identificacao = this.value;
            // Atualizar o texto nas outras tabelas (Multiplex Diarreia tem 5 tabelas: E.coli, Salmonella, Coronavírus, Rotavírus, Cryptosporidium)
            const spans = modal.querySelectorAll('.form-control-plaintext');
            // Para 5 tabelas: spans estão agrupados por 4 (segunda, terceira, quarta e quinta tabela de cada amostra)
            const spansParaEstaAmostra = [
                index + tarefa.quantidade * 0, // Salmonella (segunda tabela)  
                index + tarefa.quantidade * 1, // Coronavírus (terceira tabela)
                index + tarefa.quantidade * 2, // Rotavírus (quarta tabela)
                index + tarefa.quantidade * 3  // Cryptosporidium (quinta tabela)
            ];
            
            spansParaEstaAmostra.forEach(spanIndex => {
                if (spans[spanIndex]) {
                    spans[spanIndex].textContent = identificacao || `Amostra #${index + 1}`;
                }
            });
        });
    });

    modal.querySelector("#salvar-resultados").onclick = async () => {
        try {
            mostrarLoading();
            const amostrasAtualizadas = [];
            const identificacoes = modal.querySelectorAll(".input-identificacao");
            const resultadosEcoli = modal.querySelectorAll(".select-ecoli");
            const resultadosSalmonella = modal.querySelectorAll(".select-salmonella");
            const resultadosCorona = modal.querySelectorAll(".select-coronavirus");
            const resultadosRota = modal.querySelectorAll(".select-rotavirus");
            const resultadosCrypto = modal.querySelectorAll(".select-cryptosporidium");

            for (let i = 0; i < tarefa.quantidade; i++) {
                amostrasAtualizadas.push({
                    id: i + 1,
                    identificacao: identificacoes[i].value.trim(),
                    ecoli: resultadosEcoli[i].value,
                    salmonella: resultadosSalmonella[i].value,
                    coronavirusBovino: resultadosCorona[i].value,
                    rotavirusBovino: resultadosRota[i].value,
                    cryptosporidium: resultadosCrypto[i].value
                });
            }

            await updateDoc(tarefaRef, {
                resultados: {
                    amostras: amostrasAtualizadas,
                    dataRegistro: Timestamp.now()
                },
                status: "resultados-registrados",
                atualizadoEm: Timestamp.now()
            });

            fecharModal();
            mostrarFeedback("Resultados salvos com sucesso!", "success");
        } catch (error) {
            console.error("Erro ao salvar resultados:", error);
            mostrarFeedback(`Erro: ${error.message}`, "error");
        } finally {
            esconderLoading();
        }
    };

    // Fechar modal ao clicar fora
    modal.onclick = (e) => {
        if (e.target === modal) fecharModal();
    };

    // Fechar com ESC
    const handleKeyDown = (e) => {
        if (e.key === "Escape") fecharModal();
    };
    document.addEventListener("keydown", handleKeyDown);
}

// Função para Multiplex Doença Respiratória Bovina
async function registrarResultadoMultiplexDoencaRespiratoriaBovina(tarefa, tarefaRef) {
    // Array de amostras baseado na quantidade
    const amostras = [];
    for (let i = 0; i < tarefa.quantidade; i++) {
        amostras.push({
            id: i + 1,
            identificacao: tarefa.resultados?.amostras?.[i]?.identificacao || "",
            coronavirusBovino: tarefa.resultados?.amostras?.[i]?.coronavirusBovino || "",
            brsv: tarefa.resultados?.amostras?.[i]?.brsv || "",
            bohv: tarefa.resultados?.amostras?.[i]?.bohv || "",
            bvdv: tarefa.resultados?.amostras?.[i]?.bvdv || "",
            bpiv3: tarefa.resultados?.amostras?.[i]?.bpiv3 || ""
        });
    }

    // Criar o modal
    const modal = document.createElement("div");
    modal.className = "modal-resultados";

    modal.innerHTML = `
        <div class="modal-resultados-content" style="max-width: 95%; max-height: 90vh; overflow-y: auto;">
            <h3 class="text-success mb-3"><i class="bi bi-clipboard-data me-2"></i>Registrar Resultados - ${tarefa.tipo} - ${tarefa.subTipo}</h3>
            <div class="alert alert-light border-start border-success border-4">
                <div class="row">
                    <div class="col-md-6"><strong><i class="bi bi-upc me-2"></i>ID:</strong> ${tarefa.id}</div>
                    <div class="col-md-6"><strong><i class="bi bi-123 me-2"></i>Quantidade:</strong> ${tarefa.quantidade}</div>
                </div>
            </div>
            
            <!-- Tabela para Coronavírus bovino -->
            <div class="mb-3">
                <h6 class="text-primary mb-2"><i class="bi bi-virus me-2"></i>Coronavírus bovino</h6>
                <div class="table-responsive">
                    <table class="tabela-resultados table table-hover table-sm">
                        <thead class="table-primary">
                            <tr>
                                <th style="width: 60%;">Identificação da amostra</th>
                                <th style="width: 40%;">Resultado - BCoV</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${amostras.map((amostra, index) => `
                                <tr>
                                    <td>
                                        <input type="text"
                                               class="form-control form-control-sm input-identificacao"
                                               data-index="${index}"
                                               value="${amostra.identificacao}"
                                               placeholder="Identificação #${amostra.id}">
                                    </td>
                                    <td>
                                        <select class="form-select form-select-sm select-coronavirus" data-index="${index}">
                                            <option value="">Selecione...</option>
                                            <option value="positivo" ${amostra.coronavirusBovino === "positivo" ? "selected" : ""}>Positivo</option>
                                            <option value="negativo" ${amostra.coronavirusBovino === "negativo" ? "selected" : ""}>Negativo</option>
                                        </select>
                                    </td>
                                </tr>
                            `).join("")}
                        </tbody>
                    </table>
                </div>
            </div>
            
            <!-- Tabela para BRSV -->
            <div class="mb-3">
                <h6 class="text-info mb-2"><i class="bi bi-virus2 me-2"></i>BRSV (Vírus Respiratório Sincicial Bovino)</h6>
                <div class="table-responsive">
                    <table class="tabela-resultados table table-hover table-sm">
                        <thead class="table-info">
                            <tr>
                                <th style="width: 60%;">Identificação da amostra</th>
                                <th style="width: 40%;">Resultado - BRSV</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${amostras.map((amostra, index) => `
                                <tr>
                                    <td>
                                        <span class="form-control-plaintext small">${amostra.identificacao || `Amostra #${amostra.id}`}</span>
                                    </td>
                                    <td>
                                        <select class="form-select form-select-sm select-brsv" data-index="${index}">
                                            <option value="">Selecione...</option>
                                            <option value="positivo" ${amostra.brsv === "positivo" ? "selected" : ""}>Positivo</option>
                                            <option value="negativo" ${amostra.brsv === "negativo" ? "selected" : ""}>Negativo</option>
                                        </select>
                                    </td>
                                </tr>
                            `).join("")}
                        </tbody>
                    </table>
                </div>
            </div>
            
            <!-- Tabela para BoHV-1/5 -->
            <div class="mb-3">
                <h6 class="text-warning mb-2"><i class="bi bi-virus me-2"></i>BoHV-1/5 (Herpesvírus Bovino)</h6>
                <div class="table-responsive">
                    <table class="tabela-resultados table table-hover table-sm">
                        <thead class="table-warning">
                            <tr>
                                <th style="width: 60%;">Identificação da amostra</th>
                                <th style="width: 40%;">Resultado - BoHV-1/5</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${amostras.map((amostra, index) => `
                                <tr>
                                    <td>
                                        <span class="form-control-plaintext small">${amostra.identificacao || `Amostra #${amostra.id}`}</span>
                                    </td>
                                    <td>
                                        <select class="form-select form-select-sm select-bohv" data-index="${index}">
                                            <option value="">Selecione...</option>
                                            <option value="positivo" ${amostra.bohv === "positivo" ? "selected" : ""}>Positivo</option>
                                            <option value="negativo" ${amostra.bohv === "negativo" ? "selected" : ""}>Negativo</option>
                                        </select>
                                    </td>
                                </tr>
                            `).join("")}
                        </tbody>
                    </table>
                </div>
            </div>
            
            <!-- Tabela para BVDV -->
            <div class="mb-3">
                <h6 class="text-danger mb-2"><i class="bi bi-virus2 me-2"></i>BVDV (Vírus da Diarreia Viral Bovina)</h6>
                <div class="table-responsive">
                    <table class="tabela-resultados table table-hover table-sm">
                        <thead class="table-danger">
                            <tr>
                                <th style="width: 60%;">Identificação da amostra</th>
                                <th style="width: 40%;">Resultado - BVDV</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${amostras.map((amostra, index) => `
                                <tr>
                                    <td>
                                        <span class="form-control-plaintext small">${amostra.identificacao || `Amostra #${amostra.id}`}</span>
                                    </td>
                                    <td>
                                        <select class="form-select form-select-sm select-bvdv" data-index="${index}">
                                            <option value="">Selecione...</option>
                                            <option value="positivo" ${amostra.bvdv === "positivo" ? "selected" : ""}>Positivo</option>
                                            <option value="negativo" ${amostra.bvdv === "negativo" ? "selected" : ""}>Negativo</option>
                                        </select>
                                    </td>
                                </tr>
                            `).join("")}
                        </tbody>
                    </table>
                </div>
            </div>
            
            <!-- Tabela para BPIV-3 -->
            <div class="mb-4">
                <h6 class="text-secondary mb-2"><i class="bi bi-virus me-2"></i>BPIV-3 (Parainfluenza Bovina tipo 3)</h6>
                <div class="table-responsive">
                    <table class="tabela-resultados table table-hover table-sm">
                        <thead class="table-secondary">
                            <tr>
                                <th style="width: 60%;">Identificação da amostra</th>
                                <th style="width: 40%;">Resultado - BPIV-3</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${amostras.map((amostra, index) => `
                                <tr>
                                    <td>
                                        <span class="form-control-plaintext small">${amostra.identificacao || `Amostra #${amostra.id}`}</span>
                                    </td>
                                    <td>
                                        <select class="form-select form-select-sm select-bpiv3" data-index="${index}">
                                            <option value="">Selecione...</option>
                                            <option value="positivo" ${amostra.bpiv3 === "positivo" ? "selected" : ""}>Positivo</option>
                                            <option value="negativo" ${amostra.bpiv3 === "negativo" ? "selected" : ""}>Negativo</option>
                                        </select>
                                    </td>
                                </tr>
                            `).join("")}
                        </tbody>
                    </table>
                </div>
            </div>
            
            <div class="mt-4 d-flex justify-content-end gap-3">
                <button id="cancelar-resultados" class="btn btn-danger rounded-pill px-4">
                    <i class="bi bi-x-circle me-1"></i>Cancelar
                </button>
                <button id="salvar-resultados" class="btn btn-success rounded-pill px-4">
                    <i class="bi bi-save me-1"></i>Salvar Resultados
                </button>
            </div>
            
            <button id="fechar-modal-resultados"
                class="btn btn-sm btn-outline-danger position-absolute top-0 end-0 m-3 rounded-circle"
                style="width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;">
                <i class="bi bi-x-lg"></i>
            </button>
        </div>
    `;

    document.body.appendChild(modal);

    // Fechar modal
    const fecharModal = () => {
        if (document.body.contains(modal)) {
            document.body.removeChild(modal);
        }
        document.removeEventListener("keydown", handleKeyDown);
    };

    modal.querySelector("#fechar-modal-resultados").onclick = fecharModal;
    modal.querySelector("#cancelar-resultados").onclick = fecharModal;

    // Sincronizar identificação entre as tabelas
    const inputsIdentificacao = modal.querySelectorAll(".input-identificacao");
    inputsIdentificacao.forEach((input, index) => {
        input.addEventListener('input', function() {
            const identificacao = this.value;
            // Atualizar o texto nas outras tabelas (Multiplex Respiratória tem 5 tabelas: Coronavírus, BRSV, BoHV-1, BVDV, BPIV-3)
            const spans = modal.querySelectorAll('.form-control-plaintext');
            // Para 5 tabelas: spans estão agrupados por 4 (segunda, terceira, quarta e quinta tabela de cada amostra)
            const spansParaEstaAmostra = [
                index + tarefa.quantidade * 0, // BRSV (segunda tabela)  
                index + tarefa.quantidade * 1, // BoHV-1 (terceira tabela)
                index + tarefa.quantidade * 2, // BVDV (quarta tabela)
                index + tarefa.quantidade * 3  // BPIV-3 (quinta tabela)
            ];
            
            spansParaEstaAmostra.forEach(spanIndex => {
                if (spans[spanIndex]) {
                    spans[spanIndex].textContent = identificacao || `Amostra #${index + 1}`;
                }
            });
        });
    });

    modal.querySelector("#salvar-resultados").onclick = async () => {
        try {
            mostrarLoading();
            const amostrasAtualizadas = [];
            const identificacoes = modal.querySelectorAll(".input-identificacao");
            const resultadosCorona = modal.querySelectorAll(".select-coronavirus");
            const resultadosBrsv = modal.querySelectorAll(".select-brsv");
            const resultadosBohv = modal.querySelectorAll(".select-bohv");
            const resultadosBvdv = modal.querySelectorAll(".select-bvdv");
            const resultadosBpiv3 = modal.querySelectorAll(".select-bpiv3");

            for (let i = 0; i < tarefa.quantidade; i++) {
                amostrasAtualizadas.push({
                    id: i + 1,
                    identificacao: identificacoes[i].value.trim(),
                    coronavirusBovino: resultadosCorona[i].value,
                    brsv: resultadosBrsv[i].value,
                    bohv: resultadosBohv[i].value,
                    bvdv: resultadosBvdv[i].value,
                    bpiv3: resultadosBpiv3[i].value
                });
            }

            await updateDoc(tarefaRef, {
                resultados: {
                    amostras: amostrasAtualizadas,
                    dataRegistro: Timestamp.now()
                },
                status: "resultados-registrados",
                atualizadoEm: Timestamp.now()
            });

            fecharModal();
            mostrarFeedback("Resultados salvos com sucesso!", "success");
        } catch (error) {
            console.error("Erro ao salvar resultados:", error);
            mostrarFeedback(`Erro: ${error.message}`, "error");
        } finally {
            esconderLoading();
        }
    };

    // Fechar modal ao clicar fora
    modal.onclick = (e) => {
        if (e.target === modal) fecharModal();
    };

    // Fechar com ESC
    const handleKeyDown = (e) => {
        if (e.key === "Escape") fecharModal();
    };
    document.addEventListener("keydown", handleKeyDown);
}

// Função para Multiplex Encefalites Equina
async function registrarResultadoMultiplexEncefalitesEquina(tarefa, tarefaRef) {
    // Array de amostras baseado na quantidade
    const amostras = [];
    for (let i = 0; i < tarefa.quantidade; i++) {
        amostras.push({
            id: i + 1,
            identificacao: tarefa.resultados?.amostras?.[i]?.identificacao || "",
            virusRaiva: tarefa.resultados?.amostras?.[i]?.virusRaiva || "",
            ehv1: tarefa.resultados?.amostras?.[i]?.ehv1 || "",
            flavivirus: tarefa.resultados?.amostras?.[i]?.flavivirus || "",
            alphavirus: tarefa.resultados?.amostras?.[i]?.alphavirus || "",
            veev: tarefa.resultados?.amostras?.[i]?.veev || ""
        });
    }

    // Criar o modal
    const modal = document.createElement("div");
    modal.className = "modal-resultados";

    modal.innerHTML = `
        <div class="modal-resultados-content" style="max-width: 95%; max-height: 90vh; overflow-y: auto;">
            <h3 class="text-success mb-3"><i class="bi bi-clipboard-data me-2"></i>Registrar Resultados - ${tarefa.tipo} - ${tarefa.subTipo}</h3>
            <div class="alert alert-light border-start border-success border-4">
                <div class="row">
                    <div class="col-md-6"><strong><i class="bi bi-upc me-2"></i>ID:</strong> ${tarefa.id}</div>
                    <div class="col-md-6"><strong><i class="bi bi-123 me-2"></i>Quantidade:</strong> ${tarefa.quantidade}</div>
                </div>
            </div>
            
            <!-- Tabela para Vírus da Raiva -->
            <div class="mb-3">
                <h6 class="text-primary mb-2"><i class="bi bi-virus me-2"></i>Vírus da Raiva</h6>
                <div class="table-responsive">
                    <table class="tabela-resultados table table-hover table-sm">
                        <thead class="table-primary">
                            <tr>
                                <th style="width: 60%;">Identificação da amostra</th>
                                <th style="width: 40%;">Resultado - Raiva</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${amostras.map((amostra, index) => `
                                <tr>
                                    <td>
                                        <input type="text"
                                               class="form-control form-control-sm input-identificacao"
                                               data-index="${index}"
                                               value="${amostra.identificacao}"
                                               placeholder="Identificação #${amostra.id}">
                                    </td>
                                    <td>
                                        <select class="form-select form-select-sm select-raiva" data-index="${index}">
                                            <option value="">Selecione...</option>
                                            <option value="positivo" ${amostra.virusRaiva === "positivo" ? "selected" : ""}>Positivo</option>
                                            <option value="negativo" ${amostra.virusRaiva === "negativo" ? "selected" : ""}>Negativo</option>
                                        </select>
                                    </td>
                                </tr>
                            `).join("")}
                        </tbody>
                    </table>
                </div>
            </div>
            
            <!-- Tabela para EHV-1 -->
            <div class="mb-3">
                <h6 class="text-info mb-2"><i class="bi bi-virus2 me-2"></i>EHV-1 (Herpesvírus Equino tipo 1)</h6>
                <div class="table-responsive">
                    <table class="tabela-resultados table table-hover table-sm">
                        <thead class="table-info">
                            <tr>
                                <th style="width: 60%;">Identificação da amostra</th>
                                <th style="width: 40%;">Resultado - EHV-1</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${amostras.map((amostra, index) => `
                                <tr>
                                    <td>
                                        <span class="form-control-plaintext small">${amostra.identificacao || `Amostra #${amostra.id}`}</span>
                                    </td>
                                    <td>
                                        <select class="form-select form-select-sm select-ehv1" data-index="${index}">
                                            <option value="">Selecione...</option>
                                            <option value="positivo" ${amostra.ehv1 === "positivo" ? "selected" : ""}>Positivo</option>
                                            <option value="negativo" ${amostra.ehv1 === "negativo" ? "selected" : ""}>Negativo</option>
                                        </select>
                                    </td>
                                </tr>
                            `).join("")}
                        </tbody>
                    </table>
                </div>
            </div>
            
            <!-- Tabela para Flavivírus -->
            <div class="mb-3">
                <h6 class="text-warning mb-2"><i class="bi bi-virus me-2"></i>Flavivírus</h6>
                <div class="table-responsive">
                    <table class="tabela-resultados table table-hover table-sm">
                        <thead class="table-warning">
                            <tr>
                                <th style="width: 60%;">Identificação da amostra</th>
                                <th style="width: 40%;">Resultado - Flavivírus</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${amostras.map((amostra, index) => `
                                <tr>
                                    <td>
                                        <span class="form-control-plaintext small">${amostra.identificacao || `Amostra #${amostra.id}`}</span>
                                    </td>
                                    <td>
                                        <select class="form-select form-select-sm select-flavivirus" data-index="${index}">
                                            <option value="">Selecione...</option>
                                            <option value="positivo" ${amostra.flavivirus === "positivo" ? "selected" : ""}>Positivo</option>
                                            <option value="negativo" ${amostra.flavivirus === "negativo" ? "selected" : ""}>Negativo</option>
                                        </select>
                                    </td>
                                </tr>
                            `).join("")}
                        </tbody>
                    </table>
                </div>
            </div>
            
            <!-- Tabela para Alphavírus -->
            <div class="mb-3">
                <h6 class="text-danger mb-2"><i class="bi bi-virus2 me-2"></i>Alphavírus</h6>
                <div class="table-responsive">
                    <table class="tabela-resultados table table-hover table-sm">
                        <thead class="table-danger">
                            <tr>
                                <th style="width: 60%;">Identificação da amostra</th>
                                <th style="width: 40%;">Resultado - Alphavírus</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${amostras.map((amostra, index) => `
                                <tr>
                                    <td>
                                        <span class="form-control-plaintext small">${amostra.identificacao || `Amostra #${amostra.id}`}</span>
                                    </td>
                                    <td>
                                        <select class="form-select form-select-sm select-alphavirus" data-index="${index}">
                                            <option value="">Selecione...</option>
                                            <option value="positivo" ${amostra.alphavirus === "positivo" ? "selected" : ""}>Positivo</option>
                                            <option value="negativo" ${amostra.alphavirus === "negativo" ? "selected" : ""}>Negativo</option>
                                        </select>
                                    </td>
                                </tr>
                            `).join("")}
                        </tbody>
                    </table>
                </div>
            </div>
            
            <!-- Tabela para VEEV -->
            <div class="mb-4">
                <h6 class="text-secondary mb-2"><i class="bi bi-virus me-2"></i>VEEV (Vírus da Encefalite Equina Venezuelana)</h6>
                <div class="table-responsive">
                    <table class="tabela-resultados table table-hover table-sm">
                        <thead class="table-secondary">
                            <tr>
                                <th style="width: 60%;">Identificação da amostra</th>
                                <th style="width: 40%;">Resultado - VEEV</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${amostras.map((amostra, index) => `
                                <tr>
                                    <td>
                                        <span class="form-control-plaintext small">${amostra.identificacao || `Amostra #${amostra.id}`}</span>
                                    </td>
                                    <td>
                                        <select class="form-select form-select-sm select-veev" data-index="${index}">
                                            <option value="">Selecione...</option>
                                            <option value="positivo" ${amostra.veev === "positivo" ? "selected" : ""}>Positivo</option>
                                            <option value="negativo" ${amostra.veev === "negativo" ? "selected" : ""}>Negativo</option>
                                        </select>
                                    </td>
                                </tr>
                            `).join("")}
                        </tbody>
                    </table>
                </div>
            </div>
            
            <div class="mt-4 d-flex justify-content-end gap-3">
                <button id="cancelar-resultados" class="btn btn-danger rounded-pill px-4">
                    <i class="bi bi-x-circle me-1"></i>Cancelar
                </button>
                <button id="salvar-resultados" class="btn btn-success rounded-pill px-4">
                    <i class="bi bi-save me-1"></i>Salvar Resultados
                </button>
            </div>
            
            <button id="fechar-modal-resultados"
                class="btn btn-sm btn-outline-danger position-absolute top-0 end-0 m-3 rounded-circle"
                style="width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;">
                <i class="bi bi-x-lg"></i>
            </button>
        </div>
    `;

    document.body.appendChild(modal);

    // Fechar modal
    const fecharModal = () => {
        if (document.body.contains(modal)) {
            document.body.removeChild(modal);
        }
        document.removeEventListener("keydown", handleKeyDown);
    };

    modal.querySelector("#fechar-modal-resultados").onclick = fecharModal;
    modal.querySelector("#cancelar-resultados").onclick = fecharModal;

    // Sincronizar identificação entre as tabelas
    const inputsIdentificacao = modal.querySelectorAll(".input-identificacao");
    inputsIdentificacao.forEach((input, index) => {
        input.addEventListener('input', function() {
            const identificacao = this.value;
            // Atualizar o texto nas outras tabelas (Multiplex Encefalites tem 5 tabelas: Raiva, EHV-1, Flavivírus, Alphavírus, VEEV)
            const spans = modal.querySelectorAll('.form-control-plaintext');
            // Para 5 tabelas: spans estão agrupados por 4 (segunda, terceira, quarta e quinta tabela de cada amostra)
            const spansParaEstaAmostra = [
                index + tarefa.quantidade * 0, // EHV-1 (segunda tabela)  
                index + tarefa.quantidade * 1, // Flavivírus (terceira tabela)
                index + tarefa.quantidade * 2, // Alphavírus (quarta tabela)
                index + tarefa.quantidade * 3  // VEEV (quinta tabela)
            ];
            
            spansParaEstaAmostra.forEach(spanIndex => {
                if (spans[spanIndex]) {
                    spans[spanIndex].textContent = identificacao || `Amostra #${index + 1}`;
                }
            });
        });
    });

    modal.querySelector("#salvar-resultados").onclick = async () => {
        try {
            mostrarLoading();
            const amostrasAtualizadas = [];
            const identificacoes = modal.querySelectorAll(".input-identificacao");
            const resultadosRaiva = modal.querySelectorAll(".select-raiva");
            const resultadosEhv1 = modal.querySelectorAll(".select-ehv1");
            const resultadosFlavivirus = modal.querySelectorAll(".select-flavivirus");
            const resultadosAlphavirus = modal.querySelectorAll(".select-alphavirus");
            const resultadosVeev = modal.querySelectorAll(".select-veev");

            for (let i = 0; i < tarefa.quantidade; i++) {
                amostrasAtualizadas.push({
                    id: i + 1,
                    identificacao: identificacoes[i].value.trim(),
                    virusRaiva: resultadosRaiva[i].value,
                    ehv1: resultadosEhv1[i].value,
                    flavivirus: resultadosFlavivirus[i].value,
                    alphavirus: resultadosAlphavirus[i].value,
                    veev: resultadosVeev[i].value
                });
            }

            await updateDoc(tarefaRef, {
                resultados: {
                    amostras: amostrasAtualizadas,
                    dataRegistro: Timestamp.now()
                },
                status: "resultados-registrados",
                atualizadoEm: Timestamp.now()
            });

            fecharModal();
            mostrarFeedback("Resultados salvos com sucesso!", "success");
        } catch (error) {
            console.error("Erro ao salvar resultados:", error);
            mostrarFeedback(`Erro: ${error.message}`, "error");
        } finally {
            esconderLoading();
        }
    };

    // Fechar modal ao clicar fora
    modal.onclick = (e) => {
        if (e.target === modal) fecharModal();
    };

    // Fechar com ESC
    const handleKeyDown = (e) => {
        if (e.key === "Escape") fecharModal();
    };
    document.addEventListener("keydown", handleKeyDown);
}

async function registrarResultadoRAIVA(id) {
    try {
        mostrarLoading();

        const tarefaRef = doc(db, "tarefas", id);
        const tarefaSnap = await getDoc(tarefaRef);

        if (!tarefaSnap.exists()) throw new Error("Tarefa não encontrada");

        const tarefa = tarefaSnap.data();

        // Array de amostras baseado na quantidade
        const amostras = [];
        for (let i = 0; i < tarefa.quantidade; i++) {
            amostras.push({
                id: i + 1,
                identificacao: tarefa.resultados?.amostras?.[i]?.identificacao || "",
                resultado: tarefa.resultados?.amostras?.[i]?.resultado || ""
            });
        }

        // Criar o modal
        const modal = document.createElement("div");
        modal.className = "modal-resultados";

        modal.innerHTML = `
            <div class="modal-resultados-content">
                <h3 class="text-success mb-3"><i class="bi bi-clipboard-data me-2"></i>Registrar Resultados - ${tarefa.tipo}${tarefa.subTipo ? ` - ${tarefa.subTipo}` : ''}</h3>
                <div class="alert alert-light border-start border-success border-4">
                    <div class="row">
                        <div class="col-md-6"><strong><i class="bi bi-upc me-2"></i>ID:</strong> ${tarefa.id}</div>
                        <div class="col-md-6"><strong><i class="bi bi-123 me-2"></i>Quantidade:</strong> ${tarefa.quantidade}</div>
                    </div>
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
                            ${amostras.map((amostra, index) => `
                                <tr>
                                    <td>
                                        <input type="text"
                                               class="form-control input-identificacao"
                                               data-index="${index}"
                                               value="${amostra.identificacao}"
                                               placeholder="Identificação #${amostra.id}">
                                    </td>
                                    <td>
                                        <select class="form-select select-resultado" data-index="${index}">
                                            <option value="">Selecione...</option>
                                            <option value="positivo" ${amostra.resultado === "positivo" ? "selected" : ""}>Positivo</option>
                                            <option value="negativo" ${amostra.resultado === "negativo" ? "selected" : ""}>Negativo</option>
                                        </select>
                                    </td>
                                </tr>
                            `).join("")}
                        </tbody>
                    </table>
                </div>
                
                <div class="mt-4 d-flex justify-content-end gap-3">
                    <button id="cancelar-resultados" class="btn btn-danger rounded-pill px-4">
                        <i class="bi bi-x-circle me-1"></i>Cancelar
                    </button>
                    <button id="salvar-resultados" class="btn btn-success rounded-pill px-4">
                        <i class="bi bi-save me-1"></i>Salvar Resultados
                    </button>
                </div>
                
                <button id="fechar-modal-resultados"
                    class="btn btn-sm btn-outline-danger position-absolute top-0 end-0 m-3 rounded-circle"
                    style="width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;">
                    <i class="bi bi-x-lg"></i>
                </button>
            </div>
        `;

        document.body.appendChild(modal);

        // Fechar modal
        const fecharModal = () => {
            if (document.body.contains(modal)) {
                document.body.removeChild(modal);
            }
            document.removeEventListener("keydown", handleKeyDown);
        };

        modal.querySelector("#fechar-modal-resultados").onclick = fecharModal;
        modal.querySelector("#cancelar-resultados").onclick = fecharModal;

        modal.querySelector("#salvar-resultados").onclick = async () => {
            try {
                mostrarLoading();
                const amostrasAtualizadas = [];
                const identificacoes = modal.querySelectorAll(".input-identificacao");
                const resultados = modal.querySelectorAll(".select-resultado");

                for (let i = 0; i < tarefa.quantidade; i++) {
                    amostrasAtualizadas.push({
                        id: i + 1,
                        identificacao: identificacoes[i].value.trim(),
                        resultado: resultados[i].value
                    });
                }

                await updateDoc(tarefaRef, {
                    resultados: {
                        amostras: amostrasAtualizadas,
                        dataRegistro: Timestamp.now()
                    },
                    status: "resultados-registrados",
                    atualizadoEm: Timestamp.now()
                });

                fecharModal();
                mostrarFeedback("Resultados salvos com sucesso!", "success");
            } catch (error) {
                console.error("Erro ao salvar resultados:", error);
                mostrarFeedback(`Erro: ${error.message}`, "error");
            } finally {
                esconderLoading();
            }
        };

        // Fechar modal ao clicar fora
        modal.onclick = (e) => {
            if (e.target === modal) fecharModal();
        };

        // Fechar com ESC
        const handleKeyDown = (e) => {
            if (e.key === "Escape") fecharModal();
        };
        document.addEventListener("keydown", handleKeyDown);

    } catch (error) {
        mostrarFeedback(`Erro: ${error.message}`, "error");
    } finally {
        esconderLoading();
    }
}

async function registrarResultadoICC(id) {
    try {
        mostrarLoading();

        const tarefaRef = doc(db, "tarefas", id);
        const tarefaSnap = await getDoc(tarefaRef);

        if (!tarefaSnap.exists()) throw new Error("Tarefa não encontrada");

        const tarefa = tarefaSnap.data();

        // Array de amostras baseado na quantidade
        const amostras = [];
        for (let i = 0; i < tarefa.quantidade; i++) {
            amostras.push({
                id: i + 1,
                identificacao: tarefa.resultados?.amostras?.[i]?.identificacao || "",
                resultado: tarefa.resultados?.amostras?.[i]?.resultado || ""
            });
        }

        // Criar o modal
        const modal = document.createElement("div");
        modal.className = "modal-resultados";

        modal.innerHTML = `
            <div class="modal-resultados-content">
                <h3 class="text-success mb-3"><i class="bi bi-clipboard-data me-2"></i>Registrar Resultados - ${tarefa.tipo}${tarefa.subTipo ? ` - ${tarefa.subTipo}` : ''}</h3>
                <div class="alert alert-light border-start border-success border-4">
                    <div class="row">
                        <div class="col-md-6"><strong><i class="bi bi-upc me-2"></i>ID:</strong> ${tarefa.id}</div>
                        <div class="col-md-6"><strong><i class="bi bi-123 me-2"></i>Quantidade:</strong> ${tarefa.quantidade}</div>
                    </div>
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
                            ${amostras.map((amostra, index) => `
                                <tr>
                                    <td>
                                        <input type="text"
                                               class="form-control input-identificacao"
                                               data-index="${index}"
                                               value="${amostra.identificacao}"
                                               placeholder="Identificação #${amostra.id}">
                                    </td>
                                    <td>
                                        <input type="text"
                                               class="form-control input-resultado"
                                               data-index="${index}"
                                               value="${amostra.resultado}"
                                               placeholder="Resultado #${amostra.id}">
                                    </td>
                                </tr>
                            `).join("")}
                        </tbody>
                    </table>
                </div>
                
                <div class="mt-4 d-flex justify-content-end gap-3">
                    <button id="cancelar-resultados" class="btn btn-danger rounded-pill px-4">
                        <i class="bi bi-x-circle me-1"></i>Cancelar
                    </button>
                    <button id="salvar-resultados" class="btn btn-success rounded-pill px-4">
                        <i class="bi bi-save me-1"></i>Salvar Resultados
                    </button>
                </div>
                
                <button id="fechar-modal-resultados"
                    class="btn btn-sm btn-outline-danger position-absolute top-0 end-0 m-3 rounded-circle"
                    style="width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;">
                    <i class="bi bi-x-lg"></i>
                </button>
            </div>
        `;

        document.body.appendChild(modal);

        // Fechar modal
        const fecharModal = () => {
            if (document.body.contains(modal)) {
                document.body.removeChild(modal);
            }
            document.removeEventListener("keydown", handleKeyDown);
        };

        modal.querySelector("#fechar-modal-resultados").onclick = fecharModal;
        modal.querySelector("#cancelar-resultados").onclick = fecharModal;

        modal.querySelector("#salvar-resultados").onclick = async () => {
            try {
                mostrarLoading();
                const amostrasAtualizadas = [];
                const rows = modal.querySelectorAll(".tabela-resultados tbody tr");

                for (let i = 0; i < rows.length; i++) {
                    const row = rows[i];
                    const identificacao = row.querySelector(".input-identificacao").value.trim();
                    const resultado = row.querySelector(".input-resultado").value.trim();

                    amostrasAtualizadas.push({
                        id: i + 1,
                        identificacao: identificacao,
                        resultado: resultado
                    });
                }

                await updateDoc(tarefaRef, {
                    resultados: {
                        amostras: amostrasAtualizadas,
                        dataRegistro: Timestamp.now()
                    },
                    status: "resultados-registrados",
                    atualizadoEm: Timestamp.now()
                });

                fecharModal();
                mostrarFeedback("Resultados salvos com sucesso!", "success");
            } catch (error) {
                console.error("Erro ao salvar resultados:", error);
                mostrarFeedback(`Erro: ${error.message}`, "error");
            } finally {
                esconderLoading();
            }
        };

        // Fechar modal ao clicar fora
        modal.onclick = (e) => {
            if (e.target === modal) fecharModal();
        };

        // Fechar com ESC
        const handleKeyDown = (e) => {
            if (e.key === "Escape") fecharModal();
        };
        document.addEventListener("keydown", handleKeyDown);

    } catch (error) {
        mostrarFeedback(`Erro: ${error.message}`, "error");
    } finally {
        esconderLoading();
    }
}

export { registrarResultadoSN, registrarResultadoELISA, registrarResultadoMolecular, registrarResultadoRAIVA, registrarResultadoICC };
