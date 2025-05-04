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

        // Criar a tabela de resultados
        modal.innerHTML = `
            <div class="modal-resultados-content">
                <h3 style="margin-bottom: 15px; color: #1b5e20;">Registrar Resultados - ${tarefa.tipo}</h3>
                <p><strong>ID:</strong> ${tarefa.id} | <strong>Quantidade:</strong> ${tarefa.quantidade} amostras</p>
                
                <table class="tabela-resultados">
                    <thead>
                        <tr>
                            <th>Resultado</th>
                            <th>Identificação das amostras</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>Negativas (&lt; 1:4)</td>
                            <td><input type="text" id="negativas" value="${tarefa.resultados?.negativas || ''}"></td>
                        </tr>
                        <tr>
                            <td colspan="2" style="text-align: center; font-weight: bold;">Positivas</td>
                        </tr>
                        <tr>
                            <td>Título 4</td>
                            <td><input type="text" id="titulo4" value="${tarefa.resultados?.titulo4 || ''}"></td>
                        </tr>
                        <tr>
                            <td>Título 8</td>
                            <td><input type="text" id="titulo8" value="${tarefa.resultados?.titulo8 || ''}"></td>
                        </tr>
                        <tr>
                            <td>Título 16</td>
                            <td><input type="text" id="titulo16" value="${tarefa.resultados?.titulo16 || ''}"></td>
                        </tr>
                        <tr>
                            <td>Título 32</td>
                            <td><input type="text" id="titulo32" value="${tarefa.resultados?.titulo32 || ''}"></td>
                        </tr>
                        <tr>
                            <td>Título 64</td>
                            <td><input type="text" id="titulo64" value="${tarefa.resultados?.titulo64 || ''}"></td>
                        </tr>
                        <tr>
                            <td>Título 128</td>
                            <td><input type="text" id="titulo128" value="${tarefa.resultados?.titulo128 || ''}"></td>
                        </tr>
                        <tr>
                            <td>Título 256</td>
                            <td><input type="text" id="titulo256" value="${tarefa.resultados?.titulo256 || ''}"></td>
                        </tr>
                        <tr>
                            <td>Título 512</td>
                            <td><input type="text" id="titulo512" value="${tarefa.resultados?.titulo512 || ''}"></td>
                        </tr>
                        <tr>
                            <td>Impróprias</td>
                            <td><input type="text" id="improprias" value="${tarefa.resultados?.improprias || ''}"></td>
                        </tr>
                        <tr>
                            <td>Tóxicas</td>
                            <td><input type="text" id="toxicas" value="${tarefa.resultados?.toxicas || ''}"></td>
                        </tr>
                        <tr>
                            <td>Quantidade insuficiente</td>
                            <td><input type="text" id="insuficiente" value="${tarefa.resultados?.insuficiente || ''}"></td>
                        </tr>
                    </tbody>
                </table>
                
                <div style="margin-top: 20px; display: flex; justify-content: flex-end; gap: 10px;">
                    <button id="cancelar-resultados" class="button" style="background-color: #d32f2f;">Cancelar</button>
                    <button id="salvar-resultados" class="button">Salvar Resultados</button>
                </div>
                
                <button id="fechar-modal-resultados"
                    style="position: absolute; top: 15px; right: 15px; padding: 5px 10px; background: #d32f2f; color: white; border: none; border-radius: 4px; cursor: pointer;">
                    X
                </button>
            </div>
        `;

        document.body.appendChild(modal);

        // Event listeners para o modal
        const fecharModal = () => {
            document.body.removeChild(modal);
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
                <h3 style="margin-bottom: 15px; color: #1b5e20;">Registrar Resultados - ${tarefa.tipo}</h3>
                <p><strong>ID:</strong> ${tarefa.id} | <strong>Quantidade:</strong> ${tarefa.quantidade} amostras</p>
                
                <table class="tabela-resultados">
                    <thead>
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
                                           class="input-identificacao"
                                           data-index="${index}"
                                           value="${amostra.identificacao}"
                                           placeholder="Identificação #${amostra.id}">
                                </td>
                                <td>
                                    <select class="select-resultado" data-index="${index}">
                                        <option value="">Selecione...</option>
                                        <option value="positivo" ${amostra.resultado === "positivo" ? "selected" : ""}>Positivo</option>
                                        <option value="negativo" ${amostra.resultado === "negativo" ? "selected" : ""}>Negativo</option>
                                    </select>
                                </td>
                            </tr>
                        `).join("")}
                    </tbody>
                </table>
                
                <div style="margin-top: 20px; display: flex; justify-content: flex-end; gap: 10px;">
                    <button id="cancelar-resultados" class="button" style="background-color: #d32f2f;">Cancelar</button>
                    <button id="salvar-resultados" class="button">Salvar Resultados</button>
                </div>
                
                <button id="fechar-modal-resultados"
                    style="position: absolute; top: 15px; right: 15px; padding: 5px 10px; background: #d32f2f; color: white; border: none; border-radius: 4px; cursor: pointer;">
                    X
                </button>
            </div>
        `;

        document.body.appendChild(modal);

        // Fechar modal
        const fecharModal = () => {
            if (document.body.contains(modal)) document.body.removeChild(modal);
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
                <h3 style="margin-bottom: 15px; color: #1b5e20;">Registrar Resultados - ${tarefa.tipo} ${tarefa.complemento || ''}</h3>
                <p><strong>ID:</strong> ${tarefa.id} | <strong>Quantidade:</strong> ${tarefa.quantidade} amostras</p>
                
                <table class="tabela-resultados">
                    <thead>
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
                                           class="input-identificacao"
                                           data-index="${index}"
                                           value="${amostra.identificacao}"
                                           placeholder="Identificação #${amostra.id}">
                                </td>
                                <td>
                                    <select class="select-resultado" data-index="${index}">
                                        <option value="">Selecione...</option>
                                        <option value="positivo" ${amostra.resultado === "positivo" ? "selected" : ""}>Positivo</option>
                                        <option value="negativo" ${amostra.resultado === "negativo" ? "selected" : ""}>Negativo</option>
                                    </select>
                                </td>
                            </tr>
                        `).join("")}
                    </tbody>
                </table>
                
                <div style="margin-top: 20px; display: flex; justify-content: flex-end; gap: 10px;">
                    <button id="cancelar-resultados" class="button" style="background-color: #d32f2f;">Cancelar</button>
                    <button id="salvar-resultados" class="button">Salvar Resultados</button>
                </div>
                
                <button id="fechar-modal-resultados"
                    style="position: absolute; top: 15px; right: 15px; padding: 5px 10px; background: #d32f2f; color: white; border: none; border-radius: 4px; cursor: pointer;">
                    X
                </button>
            </div>
        `;

        document.body.appendChild(modal);

        // Fechar modal
        const fecharModal = () => {
            if (document.body.contains(modal)) document.body.removeChild(modal);
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
                <h3 style="margin-bottom: 15px; color: #1b5e20;">Registrar Resultados - ${tarefa.tipo} ${tarefa.complemento || ''}</h3>
                <p><strong>ID:</strong> ${tarefa.id} | <strong>Quantidade:</strong> ${tarefa.quantidade} amostras</p>
                
                <table class="tabela-resultados">
                    <thead>
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
                                           class="input-identificacao"
                                           data-index="${index}"
                                           value="${amostra.identificacao}"
                                           placeholder="Identificação #${amostra.id}">
                                </td>
                                <td>
                                    <select class="select-resultado" data-index="${index}">
                                        <option value="">Selecione...</option>
                                        <option value="positivo" ${amostra.resultado === "positivo" ? "selected" : ""}>Positivo</option>
                                        <option value="negativo" ${amostra.resultado === "negativo" ? "selected" : ""}>Negativo</option>
                                    </select>
                                </td>
                            </tr>
                        `).join("")}
                    </tbody>
                </table>
                
                <div style="margin-top: 20px; display: flex; justify-content: flex-end; gap: 10px;">
                    <button id="cancelar-resultados" class="button" style="background-color: #d32f2f;">Cancelar</button>
                    <button id="salvar-resultados" class="button">Salvar Resultados</button>
                </div>
                
                <button id="fechar-modal-resultados"
                    style="position: absolute; top: 15px; right: 15px; padding: 5px 10px; background: #d32f2f; color: white; border: none; border-radius: 4px; cursor: pointer;">
                    X
                </button>
            </div>
        `;

        document.body.appendChild(modal);

        // Fechar modal
        const fecharModal = () => {
            if (document.body.contains(modal)) document.body.removeChild(modal);
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
                <h3 style="margin-bottom: 15px; color: #1b5e20;">Registrar Resultados - ${tarefa.tipo} ${tarefa.complemento || ''}</h3>
                <p><strong>ID:</strong> ${tarefa.id} | <strong>Quantidade:</strong> ${tarefa.quantidade} amostras</p>
                
                <table class="tabela-resultados">
                    <thead>
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
                                           class="input-identificacao"
                                           data-index="${index}"
                                           value="${amostra.identificacao}"
                                           placeholder="Identificação #${amostra.id}">
                                </td>
                                <td>
                                    <input type="text"
                                           class="input-resultado"  // Changed class name here
                                           data-index="${index}"
                                           value="${amostra.resultado}"
                                           placeholder="Resultado #${amostra.id}">
                                </td>
                            </tr>
                        `).join("")}
                    </tbody>
                </table>
                
                <div style="margin-top: 20px; display: flex; justify-content: flex-end; gap: 10px;">
                    <button id="cancelar-resultados" class="button" style="background-color: #d32f2f;">Cancelar</button>
                    <button id="salvar-resultados" class="button">Salvar Resultados</button>
                </div>
                
                <button id="fechar-modal-resultados"
                    style="position: absolute; top: 15px; right: 15px; padding: 5px 10px; background: #d32f2f; color: white; border: none; border-radius: 4px; cursor: pointer;">
                    X
                </button>
            </div>
        `;

        document.body.appendChild(modal);

        // Fechar modal
        const fecharModal = () => {
            if (document.body.contains(modal)) document.body.removeChild(modal);
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

export { registrarResultadoSN, registrarResultadoELISA, registrarResultadoPCR, registrarResultadoRAIVA, registrarResultadoICC };
