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
                <h3 class="text-success mb-3"><i class="bi bi-clipboard-data me-2"></i>Registrar Resultados - ${tarefa.tipo} ${tarefa.complemento || ''}</h3>
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

// Função para registrar resultado PCR
async function registrarResultadoPCR(id) {
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
                <h3 class="text-success mb-3"><i class="bi bi-clipboard-data me-2"></i>Registrar Resultados - ${tarefa.tipo} ${tarefa.complemento || ''}</h3>
                <div class="alert alert-light border-start border-success border-4">
                    <div class="row">
                        <div class="col-md-6"><strong><i class="bi bi-upc me-2"></i>ID:</strong> ${tarefa.id}</div>
                        <div class="col-md-6"><strong><i class="bi bi-123 me-2"></i>Quantidade:</strong> ${tarefa.quantidade}</div>
                    </div>
                </div>
                <div class="row mb-3">
                    <div class="col-md-6">
                        <strong><i class="bi bi-dna me-2"></i>Tipo de Ácido Nucleico:</strong>
                        <div>
                            <label class="form-check-label me-3">
                                <input type="radio" name="acidoNucleico" value="DNA" ${!tarefa.resultados?.acidoNucleico || tarefa.resultados?.acidoNucleico === 'DNA' ? 'checked' : ''}>
                                DNA
                            </label>
                            <label class="form-check-label">
                                <input type="radio" name="acidoNucleico" value="RNA" ${tarefa.resultados?.acidoNucleico === 'RNA' ? 'checked' : ''}>
                                RNA
                            </label>
                        </div>
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
                const acidoNucleico = modal.querySelector('input[name="acidoNucleico"]:checked').value;

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
                        acidoNucleico: acidoNucleico,  // Save DNA/RNA selection
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
                <h3 class="text-success mb-3"><i class="bi bi-clipboard-data me-2"></i>Registrar Resultados - ${tarefa.tipo} ${tarefa.complemento || ''}</h3>
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
                <h3 class="text-success mb-3"><i class="bi bi-clipboard-data me-2"></i>Registrar Resultados - ${tarefa.tipo} ${tarefa.complemento || ''}</h3>
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

        modal.querySelector("#fechar-modal_resultados").onclick = fecharModal;
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

export { registrarResultadoSN, registrarResultadoELISA, registrarResultadoPCR, registrarResultadoRAIVA, registrarResultadoICC };
