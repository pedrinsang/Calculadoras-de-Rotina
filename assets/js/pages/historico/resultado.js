import { doc, getDoc } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js";
import { db } from "../../firebase.js";
import { mostrarFeedback } from "./historico.js";
import { gerarDocx } from "./baixarDoc.js";

let modalAtual = null;

// Função auxiliar para formatar o tipo completo da tarefa
function formatarTipoCompleto(tarefa) {
    if (tarefa.subTipo) {
        return `${tarefa.tipo} - ${tarefa.subTipo}`;
    } else if (tarefa.pcrTipo) {
        return `${tarefa.tipo} - ${tarefa.pcrTipo}`;
    } else if (tarefa.complemento) {
        return `${tarefa.tipo} - ${tarefa.complemento}`;
    } else {
        return tarefa.tipo;
    }
}

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
        
        console.log("🔍 [resultado.js] DEBUG - Dados da tarefa:", {
            id: tarefa.id,
            tipo: tarefa.tipo,
            subTipo: tarefa.subTipo,
            pcrTipo: tarefa.pcrTipo,
            complemento: tarefa.complemento
        });
        
        // Check for both SN, ELISA, and Molecular/PCR types
        const isSN = tarefa.tipo && (tarefa.tipo.includes("SN IBR") || tarefa.tipo.includes("SN BVDV") || tarefa.tipo.includes("SN HoBi") || tarefa.tipo.includes("SN EHV-1") || (tarefa.tipo === "SN" && tarefa.subTipo));
        const isELISA = tarefa.tipo.includes("ELISA") || (tarefa.tipo === "ELISA" && tarefa.subTipo);
        const isPCRSimples = tarefa.tipo === "PCR";
        const isMolecular = tarefa.tipo === "MOLECULAR";
        const isRAIVA = tarefa.tipo.includes("RAIVA");
        const isICC = tarefa.tipo.includes("ICC");
        
        console.log("🔍 [resultado.js] DEBUG - Flags de detecção:", {
            isSN, isELISA, isPCRSimples, isMolecular, isRAIVA, isICC,
            tipoOriginal: tarefa.tipo
        });
        
        if (!isSN && !isELISA && !isPCRSimples && !isMolecular && !isRAIVA && !isICC) {
            mostrarFeedback("Este tipo de tarefa não possui resultados específicos", "warning");
            return;
        }
        
        if (!tarefa.resultados) {
            console.log("❌ [resultado.js] Tarefa sem resultados registrados");
            mostrarFeedback("Esta tarefa não possui resultados registrados", "warning");
            return;
        }
        
        console.log("✅ [resultado.js] Tarefa possui resultados:", tarefa.resultados);

        // Cria o modal apenas se não houver nenhum aberto
        if (!modalAtual) {
            const modal = document.createElement("div");
            modal.className = "modal-resultados";
            modal.style.opacity = "0";

            // Conteúdo base do modal
            const modalContent = `
                <div class="modal-resultados-content">
                    <div class="modal-resultados-header">
                        <h3>${formatarTipoCompleto(tarefa)}</h3>
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
                        ${getTableContent(tarefa, isSN, isELISA, isPCRSimples, isMolecular, isRAIVA, isICC)}
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
            if (tarefa.tipo === "SN IBR" || tarefa.tipo === "SN BVDV" || tarefa.tipo === "SN HoBi" || tarefa.tipo === "SN EHV-1") {
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
function getTableContent(tarefa, isSN, isELISA, isPCRSimples, isMolecular, isRAIVA, isICC) {
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
    } else if (isPCRSimples) {
        // Para PCR simples - tabela básica sem avisos
        console.log("✅ [resultado.js] Usando PCR simples - sem detecção automática");
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
                            <td>
                                <span class="badge ${getBadgeClass(amostra.resultado)}">
                                    ${formatarResultado(amostra.resultado)}
                                </span>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    } else if (isMolecular) {
        // Para MOLECULAR - detectar tipo específico de PCR
        console.log("🔬 [resultado.js] Usando MOLECULAR - com detecção automática");
        const tipoPCR = detectarTipoPCR(tarefa);
        return gerarTabelaPCR(tarefa, tipoPCR);
    } else {
        // Para ELISA, RAIVA, ICC - tabela simples
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

// Função para detectar o tipo específico de PCR
function detectarTipoPCR(tarefa) {
    const resultados = tarefa.resultados;
    
    console.log("🔍 [resultado.js] DEBUG PCR - Dados da tarefa:", {
        id: tarefa.id,
        tipo: tarefa.tipo,
        subTipo: tarefa.subTipo,
        pcrTipo: tarefa.pcrTipo,
        complemento: tarefa.complemento,
        temAmostras: resultados.amostras && resultados.amostras.length > 0
    });
    
    if (!resultados.amostras || resultados.amostras.length === 0) {
        console.log("❌ [resultado.js] Sem amostras");
        return 'simples';
    }
    
    // 1. PRIMEIRA PRIORIDADE: Detectar pelo campo subTipo (MOLECULAR)
    if (tarefa.subTipo) {
        console.log("✅ [resultado.js] Detectado pelo subTipo:", tarefa.subTipo);
        const subTipoLower = tarefa.subTipo.toLowerCase();
        
        if (subTipoLower.includes('duplex')) {
            if (subTipoLower.includes('bovino')) return 'duplexBovino';
            if (subTipoLower.includes('equino')) return 'duplexEquino';
            if (subTipoLower.includes('rota e corona') || (subTipoLower.includes('rota') && subTipoLower.includes('corona'))) return 'duplexRotaCorona';
        }
        
        if (subTipoLower.includes('multiplex')) {
            if (subTipoLower.includes('crostas')) return 'multiplexCrostas';
            if (subTipoLower.includes('diarreia')) return 'multiplexDiarreia';
            if (subTipoLower.includes('respirator')) return 'multiplexRespiratoria';
            if (subTipoLower.includes('encefalite')) {
                console.log("🎯 [resultado.js] Retornando multiplexEncefalites");
                return 'multiplexEncefalites';
            }
        }
    }
    
    // 2. SEGUNDA PRIORIDADE: Detectar pelo campo pcrTipo
    if (tarefa.pcrTipo) {
        console.log("✅ [resultado.js] Detectado pelo pcrTipo:", tarefa.pcrTipo);
        const pcrTipoLower = tarefa.pcrTipo.toLowerCase();
        
        if (pcrTipoLower.includes('duplex')) {
            if (pcrTipoLower.includes('bovino')) return 'duplexBovino';
            if (pcrTipoLower.includes('equino')) return 'duplexEquino';
            if (pcrTipoLower.includes('rota e corona') || (pcrTipoLower.includes('rota') && pcrTipoLower.includes('corona'))) return 'duplexRotaCorona';
        }
        
        if (pcrTipoLower.includes('multiplex')) {
            if (pcrTipoLower.includes('crostas')) return 'multiplexCrostas';
            if (pcrTipoLower.includes('diarreia')) return 'multiplexDiarreia';
            if (pcrTipoLower.includes('respirator')) return 'multiplexRespiratoria';
            if (pcrTipoLower.includes('encefalite')) return 'multiplexEncefalites';
        }
    }
    
    // 3. TERCEIRA PRIORIDADE: Detectar pelo complemento
    if (tarefa.complemento) {
        const complementoLower = tarefa.complemento.toLowerCase();
        console.log("🔍 [resultado.js] Analisando complemento:", complementoLower);
        
        if (complementoLower.includes('duplex')) {
            if (complementoLower.includes('bovino')) return 'duplexBovino';
            if (complementoLower.includes('equino')) return 'duplexEquino';
            if (complementoLower.includes('rota e corona') || (complementoLower.includes('rota') && complementoLower.includes('corona'))) return 'duplexRotaCorona';
        }
        
        if (complementoLower.includes('multiplex')) {
            if (complementoLower.includes('crostas')) return 'multiplexCrostas';
            if (complementoLower.includes('diarreia')) return 'multiplexDiarreia';
            if (complementoLower.includes('respirator')) return 'multiplexRespiratoria';
            if (complementoLower.includes('encefalite')) return 'multiplexEncefalites';
        }
    }
    
    // 4. QUARTA PRIORIDADE: Detectar pelas propriedades das amostras
    const primeiraAmostra = resultados.amostras[0];
    const propriedades = Object.keys(primeiraAmostra);
    console.log("🔍 [resultado.js] Propriedades da primeira amostra:", propriedades);
    
    // Duplex Bovino
    if (primeiraAmostra.coronavirusBovino !== undefined && primeiraAmostra.rotavirusBovino !== undefined) {
        console.log("✅ [resultado.js] Detectado Duplex Bovino pelas propriedades");
        return 'duplexBovino';
    }
    
    // Duplex Equino
    if (primeiraAmostra.coronavirusEquino !== undefined && primeiraAmostra.rotavirusEquino !== undefined) {
        console.log("✅ [resultado.js] Detectado Duplex Equino pelas propriedades");
        return 'duplexEquino';
    }
    
    // Multiplex Crostas
    if (primeiraAmostra.vaccinia !== undefined || primeiraAmostra.pseudocowpox !== undefined || 
        primeiraAmostra.estomatitePapular !== undefined || primeiraAmostra.herpesvirus !== undefined) {
        console.log("✅ [resultado.js] Detectado Multiplex Crostas pelas propriedades");
        return 'multiplexCrostas';
    }
    
    // Multiplex Diarreia
    if (primeiraAmostra.ecoli !== undefined || primeiraAmostra.salmonella !== undefined || 
        primeiraAmostra.cryptosporidium !== undefined) {
        console.log("✅ [resultado.js] Detectado Multiplex Diarreia pelas propriedades");
        return 'multiplexDiarreia';
    }
    
    // Multiplex Respiratória
    if (primeiraAmostra.brsv !== undefined || primeiraAmostra.bohv !== undefined || 
        primeiraAmostra.bvdv !== undefined || primeiraAmostra.bpiv3 !== undefined || 
        primeiraAmostra.coronavirusBovino !== undefined) {
        console.log("✅ [resultado.js] Detectado Multiplex Respiratória pelas propriedades");
        return 'multiplexRespiratoria';
    }
    
    // Multiplex Encefalites
    if (primeiraAmostra.virusRaiva !== undefined || primeiraAmostra.ehv1 !== undefined || 
        primeiraAmostra.flavivirus !== undefined || primeiraAmostra.alphavirus !== undefined || 
        primeiraAmostra.veev !== undefined) {
        console.log("✅ [resultado.js] Detectado Multiplex Encefalites pelas propriedades");
        return 'multiplexEncefalites';
    }
    
    console.log("⚠️ [resultado.js] Usando PCR simples como fallback");
    return 'simples';
}

// Função para gerar tabela específica de PCR baseada no tipo
function gerarTabelaPCR(tarefa, tipoPCR) {
    const resultados = tarefa.resultados;
    
    console.log("📊 [resultado.js] gerarTabelaPCR chamada com tipoPCR:", tipoPCR);
    
    switch (tipoPCR) {
        case 'duplexBovino':
            return gerarTabelaDuplexBovino(resultados);
        case 'duplexEquino':
            return gerarTabelaDuplexEquino(resultados);
        case 'duplexRotaCorona':
            return gerarTabelaDuplexRotaCorona(resultados);
        case 'multiplexCrostas':
            return gerarTabelaMultiplexCrostas(resultados);
        case 'multiplexDiarreia':
            return gerarTabelaMultiplexDiarreia(resultados);
        case 'multiplexRespiratoria':
            return gerarTabelaMultiplexRespiratoria(resultados);
        case 'multiplexEncefalites':
            console.log("🎯 [resultado.js] Chamando gerarTabelaMultiplexEncefalites");
            return gerarTabelaMultiplexEncefalites(resultados);
        default:
            console.log("⚠️ [resultado.js] Usando PCR simples como fallback para:", tipoPCR);
            return gerarTabelaPCRSimples(tarefa, resultados);
    }
}

// Duplex Bovino
function gerarTabelaDuplexBovino(resultados) {
    return `
        <div class="row">
            <div class="col-md-6">
                <h6 class="text-primary mb-3"><i class="bi bi-virus me-2"></i>Coronavírus Bovino</h6>
                <table class="tabela-resultados tabela-resultados-view compact-table">
                    <thead>
                        <tr><th>Identificação</th><th>Resultado</th></tr>
                    </thead>
                    <tbody>
                        ${resultados.amostras.map((amostra, index) => `
                            <tr>
                                <td>${amostra.identificacao || `Amostra ${index + 1}`}</td>
                                <td><span class="badge ${getBadgeClass(amostra.coronavirusBovino)}">${formatarResultado(amostra.coronavirusBovino)}</span></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            <div class="col-md-6">
                <h6 class="text-info mb-3"><i class="bi bi-virus2 me-2"></i>Rotavírus Bovino</h6>
                <table class="tabela-resultados tabela-resultados-view compact-table">
                    <thead>
                        <tr><th>Identificação</th><th>Resultado</th></tr>
                    </thead>
                    <tbody>
                        ${resultados.amostras.map((amostra, index) => `
                            <tr>
                                <td>${amostra.identificacao || `Amostra ${index + 1}`}</td>
                                <td><span class="badge ${getBadgeClass(amostra.rotavirusBovino)}">${formatarResultado(amostra.rotavirusBovino)}</span></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

// Duplex RT-PCR Rota e Corona Bovino
function gerarTabelaDuplexRotaCorona(resultados) {
    return `
        <div class="row">
            <div class="col-md-6">
                <h6 class="text-primary mb-3"><i class="bi bi-virus me-2"></i>Coronavírus Bovino (BCoV)</h6>
                <table class="tabela-resultados tabela-resultados-view compact-table">
                    <thead>
                        <tr><th>Identificação</th><th>Resultado</th></tr>
                    </thead>
                    <tbody>
                        ${resultados.amostras.map((amostra, index) => `
                            <tr>
                                <td>${amostra.identificacao || `Amostra ${index + 1}`}</td>
                                <td><span class="badge ${getBadgeClass(amostra.bcov || amostra.BCoV || amostra.coronavirusBovino)}">${formatarResultado(amostra.bcov || amostra.BCoV || amostra.coronavirusBovino)}</span></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            <div class="col-md-6">
                <h6 class="text-info mb-3"><i class="bi bi-virus2 me-2"></i>Rotavírus Bovino (BRoV)</h6>
                <table class="tabela-resultados tabela-resultados-view compact-table">
                    <thead>
                        <tr><th>Identificação</th><th>Resultado</th></tr>
                    </thead>
                    <tbody>
                        ${resultados.amostras.map((amostra, index) => `
                            <tr>
                                <td>${amostra.identificacao || `Amostra ${index + 1}`}</td>
                                <td><span class="badge ${getBadgeClass(amostra.brov || amostra.BRoV || amostra.rotavirusBovino)}">${formatarResultado(amostra.brov || amostra.BRoV || amostra.rotavirusBovino)}</span></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

// Duplex Equino
function gerarTabelaDuplexEquino(resultados) {
    console.log("🐎 [gerarTabelaDuplexEquino] Dados recebidos:", JSON.stringify(resultados, null, 2));
    return `
        <div class="row">
            <div class="col-md-6">
                <h6 class="text-primary mb-3"><i class="bi bi-virus me-2"></i>Coronavírus Equino (CoV)</h6>
                <table class="tabela-resultados tabela-resultados-view compact-table">
                    <thead>
                        <tr><th>Identificação</th><th>Resultado</th></tr>
                    </thead>
                    <tbody>
                        ${resultados.amostras.map((amostra, index) => {
                            // Buscar o valor de CoV com fallbacks
                            const covResult = amostra.cov || amostra.CoV || amostra.coronavirusEquino || amostra['coronavírus equino'] || amostra.cequino || amostra.CEquino || "";
                            console.log(`🦠 [CoV] Amostra ${index + 1}: cov=${amostra.cov}, CoV=${amostra.CoV}, coronavirusEquino=${amostra.coronavirusEquino}, resultado=${covResult}`);
                            return `
                            <tr>
                                <td>${amostra.identificacao || `Amostra ${index + 1}`}</td>
                                <td><span class="badge ${getBadgeClass(covResult)}">${formatarResultado(covResult)}</span></td>
                            </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
            <div class="col-md-6">
                <h6 class="text-info mb-3"><i class="bi bi-virus2 me-2"></i>Rotavírus Equino (RoV)</h6>
                <table class="tabela-resultados tabela-resultados-view compact-table">
                    <thead>
                        <tr><th>Identificação</th><th>Resultado</th></tr>
                    </thead>
                    <tbody>
                        ${resultados.amostras.map((amostra, index) => {
                            // Buscar o valor de RoV com fallbacks
                            const rovResult = amostra.rov || amostra.RoV || amostra.rotavirusEquino || amostra['rotavírus equino'] || amostra.requino || amostra.REquino || "";
                            console.log(`🌀 [RoV] Amostra ${index + 1}: rov=${amostra.rov}, RoV=${amostra.RoV}, rotavirusEquino=${amostra.rotavirusEquino}, resultado=${rovResult}`);
                            return `
                            <tr>
                                <td>${amostra.identificacao || `Amostra ${index + 1}`}</td>
                                <td><span class="badge ${getBadgeClass(rovResult)}">${formatarResultado(rovResult)}</span></td>
                            </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

// Multiplex Crostas
function gerarTabelaMultiplexCrostas(resultados) {
    return `
        <div class="row">
            <div class="col-md-6">
                <h6 class="text-danger mb-3"><i class="bi bi-virus me-2"></i>Vaccinia</h6>
                <table class="tabela-resultados tabela-resultados-view compact-table">
                    <thead>
                        <tr><th>Identificação</th><th>Resultado</th></tr>
                    </thead>
                    <tbody>
                        ${resultados.amostras.map((amostra, index) => `
                            <tr>
                                <td>${amostra.identificacao || `Amostra ${index + 1}`}</td>
                                <td><span class="badge ${getBadgeClass(amostra.vaccinia)}">${formatarResultado(amostra.vaccinia)}</span></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                
                <h6 class="text-warning mb-3 mt-4"><i class="bi bi-virus2 me-2"></i>Pseudocowpox</h6>
                <table class="tabela-resultados tabela-resultados-view compact-table">
                    <thead>
                        <tr><th>Identificação</th><th>Resultado</th></tr>
                    </thead>
                    <tbody>
                        ${resultados.amostras.map((amostra, index) => `
                            <tr>
                                <td>${amostra.identificacao || `Amostra ${index + 1}`}</td>
                                <td><span class="badge ${getBadgeClass(amostra.pseudocowpox)}">${formatarResultado(amostra.pseudocowpox)}</span></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            <div class="col-md-6">
                <h6 class="text-success mb-3"><i class="bi bi-virus me-2"></i>Estomatite Papular</h6>
                <table class="tabela-resultados tabela-resultados-view compact-table">
                    <thead>
                        <tr><th>Identificação</th><th>Resultado</th></tr>
                    </thead>
                    <tbody>
                        ${resultados.amostras.map((amostra, index) => `
                            <tr>
                                <td>${amostra.identificacao || `Amostra ${index + 1}`}</td>
                                <td><span class="badge ${getBadgeClass(amostra.estomatitePapular)}">${formatarResultado(amostra.estomatitePapular)}</span></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                
                <h6 class="text-secondary mb-3 mt-4"><i class="bi bi-virus2 me-2"></i>Herpesvírus Bovino 2</h6>
                <table class="tabela-resultados tabela-resultados-view compact-table">
                    <thead>
                        <tr><th>Identificação</th><th>Resultado</th></tr>
                    </thead>
                    <tbody>
                        ${resultados.amostras.map((amostra, index) => `
                            <tr>
                                <td>${amostra.identificacao || `Amostra ${index + 1}`}</td>
                                <td><span class="badge ${getBadgeClass(amostra.herpesvirus)}">${formatarResultado(amostra.herpesvirus)}</span></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

// Multiplex Diarreia
function gerarTabelaMultiplexDiarreia(resultados) {
    return `
        <div class="row">
            <div class="col-md-6">
                <h6 class="text-danger mb-3"><i class="bi bi-virus me-2"></i>E. coli</h6>
                <table class="tabela-resultados tabela-resultados-view compact-table">
                    <thead>
                        <tr><th>Identificação</th><th>Resultado</th></tr>
                    </thead>
                    <tbody>
                        ${resultados.amostras.map((amostra, index) => `
                            <tr>
                                <td>${amostra.identificacao || `Amostra ${index + 1}`}</td>
                                <td><span class="badge ${getBadgeClass(amostra.ecoli)}">${formatarResultado(amostra.ecoli)}</span></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                
                <h6 class="text-warning mb-3 mt-4"><i class="bi bi-virus2 me-2"></i>Salmonella</h6>
                <table class="tabela-resultados tabela-resultados-view compact-table">
                    <thead>
                        <tr><th>Identificação</th><th>Resultado</th></tr>
                    </thead>
                    <tbody>
                        ${resultados.amostras.map((amostra, index) => `
                            <tr>
                                <td>${amostra.identificacao || `Amostra ${index + 1}`}</td>
                                <td><span class="badge ${getBadgeClass(amostra.salmonella)}">${formatarResultado(amostra.salmonella)}</span></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                
                <h6 class="text-success mb-3 mt-4"><i class="bi bi-virus me-2"></i>Cryptosporidium</h6>
                <table class="tabela-resultados tabela-resultados-view compact-table">
                    <thead>
                        <tr><th>Identificação</th><th>Resultado</th></tr>
                    </thead>
                    <tbody>
                        ${resultados.amostras.map((amostra, index) => `
                            <tr>
                                <td>${amostra.identificacao || `Amostra ${index + 1}`}</td>
                                <td><span class="badge ${getBadgeClass(amostra.cryptosporidium)}">${formatarResultado(amostra.cryptosporidium)}</span></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            <div class="col-md-6">
                <h6 class="text-primary mb-3"><i class="bi bi-virus me-2"></i>Coronavírus Bovino</h6>
                <table class="tabela-resultados tabela-resultados-view compact-table">
                    <thead>
                        <tr><th>Identificação</th><th>Resultado</th></tr>
                    </thead>
                    <tbody>
                        ${resultados.amostras.map((amostra, index) => `
                            <tr>
                                <td>${amostra.identificacao || `Amostra ${index + 1}`}</td>
                                <td><span class="badge ${getBadgeClass(amostra.coronavirusBovino)}">${formatarResultado(amostra.coronavirusBovino)}</span></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                
                <h6 class="text-info mb-3 mt-4"><i class="bi bi-virus2 me-2"></i>Rotavírus Bovino</h6>
                <table class="tabela-resultados tabela-resultados-view compact-table">
                    <thead>
                        <tr><th>Identificação</th><th>Resultado</th></tr>
                    </thead>
                    <tbody>
                        ${resultados.amostras.map((amostra, index) => `
                            <tr>
                                <td>${amostra.identificacao || `Amostra ${index + 1}`}</td>
                                <td><span class="badge ${getBadgeClass(amostra.rotavirusBovino)}">${formatarResultado(amostra.rotavirusBovino)}</span></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

function gerarTabelaMultiplexRespiratoria(resultados) {
    return `
        <div class="row">
            <div class="col-md-6">
                <h6 class="text-primary mb-3"><i class="bi bi-virus me-2"></i>Coronavírus Bovino</h6>
                <table class="tabela-resultados tabela-resultados-view compact-table">
                    <thead>
                        <tr><th>Identificação</th><th>Resultado</th></tr>
                    </thead>
                    <tbody>
                        ${resultados.amostras.map((amostra, index) => `
                            <tr>
                                <td>${amostra.identificacao || `Amostra ${index + 1}`}</td>
                                <td><span class="badge ${getBadgeClass(amostra.coronavirusBovino)}">${formatarResultado(amostra.coronavirusBovino)}</span></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                
                <h6 class="text-info mb-3 mt-4"><i class="bi bi-virus2 me-2"></i>BRSV</h6>
                <table class="tabela-resultados tabela-resultados-view compact-table">
                    <thead>
                        <tr><th>Identificação</th><th>Resultado</th></tr>
                    </thead>
                    <tbody>
                        ${resultados.amostras.map((amostra, index) => `
                            <tr>
                                <td>${amostra.identificacao || `Amostra ${index + 1}`}</td>
                                <td><span class="badge ${getBadgeClass(amostra.brsv)}">${formatarResultado(amostra.brsv)}</span></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                
                <h6 class="text-success mb-3 mt-4"><i class="bi bi-virus me-2"></i>BoHV-1</h6>
                <table class="tabela-resultados tabela-resultados-view compact-table">
                    <thead>
                        <tr><th>Identificação</th><th>Resultado</th></tr>
                    </thead>
                    <tbody>
                        ${resultados.amostras.map((amostra, index) => `
                            <tr>
                                <td>${amostra.identificacao || `Amostra ${index + 1}`}</td>
                                <td><span class="badge ${getBadgeClass(amostra.bohv)}">${formatarResultado(amostra.bohv)}</span></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            <div class="col-md-6">
                <h6 class="text-danger mb-3"><i class="bi bi-virus me-2"></i>BVDV</h6>
                <table class="tabela-resultados tabela-resultados-view compact-table">
                    <thead>
                        <tr><th>Identificação</th><th>Resultado</th></tr>
                    </thead>
                    <tbody>
                        ${resultados.amostras.map((amostra, index) => `
                            <tr>
                                <td>${amostra.identificacao || `Amostra ${index + 1}`}</td>
                                <td><span class="badge ${getBadgeClass(amostra.bvdv)}">${formatarResultado(amostra.bvdv)}</span></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                
                <h6 class="text-secondary mb-3 mt-4"><i class="bi bi-virus2 me-2"></i>BPIV-3</h6>
                <table class="tabela-resultados tabela-resultados-view compact-table">
                    <thead>
                        <tr><th>Identificação</th><th>Resultado</th></tr>
                    </thead>
                    <tbody>
                        ${resultados.amostras.map((amostra, index) => `
                            <tr>
                                <td>${amostra.identificacao || `Amostra ${index + 1}`}</td>
                                <td><span class="badge ${getBadgeClass(amostra.bpiv3)}">${formatarResultado(amostra.bpiv3)}</span></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

function gerarTabelaMultiplexEncefalites(resultados) {
    console.log("🎯 [resultado.js] gerarTabelaMultiplexEncefalites executada com resultados:", resultados);
    
    return `
        <div class="row">
            <div class="col-md-6">
                <h6 class="text-danger mb-3"><i class="bi bi-virus me-2"></i>Vírus da Raiva</h6>
                <table class="tabela-resultados tabela-resultados-view compact-table">
                    <thead>
                        <tr><th>Identificação</th><th>Resultado</th></tr>
                    </thead>
                    <tbody>
                        ${resultados.amostras.map((amostra, index) => `
                            <tr>
                                <td>${amostra.identificacao || `Amostra ${index + 1}`}</td>
                                <td><span class="badge ${getBadgeClass(amostra.virusRaiva)}">${formatarResultado(amostra.virusRaiva)}</span></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                
                <h6 class="text-primary mb-3 mt-4"><i class="bi bi-virus2 me-2"></i>EHV-1</h6>
                <table class="tabela-resultados tabela-resultados-view compact-table">
                    <thead>
                        <tr><th>Identificação</th><th>Resultado</th></tr>
                    </thead>
                    <tbody>
                        ${resultados.amostras.map((amostra, index) => `
                            <tr>
                                <td>${amostra.identificacao || `Amostra ${index + 1}`}</td>
                                <td><span class="badge ${getBadgeClass(amostra.ehv1)}">${formatarResultado(amostra.ehv1)}</span></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                
                <h6 class="text-warning mb-3 mt-4"><i class="bi bi-virus me-2"></i>Flavivírus</h6>
                <table class="tabela-resultados tabela-resultados-view compact-table">
                    <thead>
                        <tr><th>Identificação</th><th>Resultado</th></tr>
                    </thead>
                    <tbody>
                        ${resultados.amostras.map((amostra, index) => `
                            <tr>
                                <td>${amostra.identificacao || `Amostra ${index + 1}`}</td>
                                <td><span class="badge ${getBadgeClass(amostra.flavivirus)}">${formatarResultado(amostra.flavivirus)}</span></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            <div class="col-md-6">
                <h6 class="text-success mb-3"><i class="bi bi-virus me-2"></i>Alphavírus</h6>
                <table class="tabela-resultados tabela-resultados-view compact-table">
                    <thead>
                        <tr><th>Identificação</th><th>Resultado</th></tr>
                    </thead>
                    <tbody>
                        ${resultados.amostras.map((amostra, index) => `
                            <tr>
                                <td>${amostra.identificacao || `Amostra ${index + 1}`}</td>
                                <td><span class="badge ${getBadgeClass(amostra.alphavirus)}">${formatarResultado(amostra.alphavirus)}</span></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                
                <h6 class="text-secondary mb-3 mt-4"><i class="bi bi-virus2 me-2"></i>VEEV</h6>
                <table class="tabela-resultados tabela-resultados-view compact-table">
                    <thead>
                        <tr><th>Identificação</th><th>Resultado</th></tr>
                    </thead>
                    <tbody>
                        ${resultados.amostras.map((amostra, index) => `
                            <tr>
                                <td>${amostra.identificacao || `Amostra ${index + 1}`}</td>
                                <td><span class="badge ${getBadgeClass(amostra.veev)}">${formatarResultado(amostra.veev)}</span></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

// PCR Simples (fallback)
function gerarTabelaPCRSimples(tarefa, resultados) {
    const primeiraAmostra = resultados.amostras && resultados.amostras[0] ? resultados.amostras[0] : {};
    const propriedades = Object.keys(primeiraAmostra);
    
    // Verificar se é PCR simples molecular legítimo (tipo MOLECULAR + subTipo PCR ou RT-PCR ou Duplex RT-PCR)
    const isPCRSimplesLegitimo = tarefa.tipo === "MOLECULAR" && (
        tarefa.subTipo === "PCR" || 
        tarefa.subTipo === "RT-PCR" || 
        tarefa.subTipo === "Duplex RT-PCR Rota e Corona Bovino" || 
        tarefa.subTipo === "Duplex Rota e Corona Bovino" ||
        tarefa.subTipo === "Duplex RT-PCR Rota e Corona Equino" || 
        tarefa.subTipo === "Duplex Rota e Corona Equino" ||
        (tarefa.subTipo && (
            tarefa.subTipo.includes("Duplex RT-PCR Rota e Corona") || 
            tarefa.subTipo.includes("Duplex Rota e Corona")
        ))
    );
    
    console.log("🔍 [resultado.js] gerarTabelaPCRSimples - isPCRSimplesLegitimo:", isPCRSimplesLegitimo, {
        tipo: tarefa.tipo,
        subTipo: tarefa.subTipo
    });
    
    return `
        ${!isPCRSimplesLegitimo ? `
            <div class="alert alert-warning mb-3">
                <strong>PCR não identificado automaticamente</strong><br>
                <small>Tipo: ${tarefa.pcrTipo || 'N/A'} | Complemento: ${tarefa.complemento || 'N/A'}</small><br>
                <small>Propriedades encontradas: ${propriedades.join(', ') || 'Nenhuma'}</small>
            </div>
        ` : ''}
        <table class="tabela-resultados tabela-resultados-view compact-table">
            <thead>
                <tr>
                    <th>Identificação da amostra</th>
                    <th>Resultado</th>
                </tr>
            </thead>
            <tbody>
                ${resultados.amostras.map((amostra, index) => `
                    <tr>
                        <td>${amostra.identificacao || `Amostra ${index + 1}`}</td>
                        <td>
                            <span class="badge ${getBadgeClass(amostra.resultado)}">
                                ${formatarResultado(amostra.resultado)}
                            </span>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

// Funções auxiliares
function getBadgeClass(resultado) {
    if (!resultado) return 'bg-secondary';
    const res = resultado.toLowerCase();
    if (res === 'positivo') return 'bg-success';
    if (res === 'negativo') return 'bg-danger';
    return 'bg-secondary';
}

function formatarResultado(resultado) {
    if (!resultado) return 'N/A';
    return resultado.charAt(0).toUpperCase() + resultado.slice(1);
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
            
            /* Estilos específicos para PCR */
            .alert-warning {
                border-left: 4px solid #ffc107;
                background-color: #fff3cd;
                border-color: #ffeaa7;
            }
            
            .badge {
                font-size: 0.8rem;
                padding: 0.4em 0.6em;
                border-radius: 0.35rem;
                font-weight: 500;
            }
            
            .compact-table {
                font-size: 0.9rem;
            }
            
            .compact-table th,
            .compact-table td {
                padding: 0.4rem 0.5rem;
                vertical-align: middle;
            }
            
            .row .col-md-6 h6 {
                border-bottom: 2px solid;
                padding-bottom: 0.3rem;
                margin-bottom: 1rem;
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
