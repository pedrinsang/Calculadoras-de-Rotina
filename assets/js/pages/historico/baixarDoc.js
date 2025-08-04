// Troque a função mostrarFeedback por:
function mostrarFeedback(mensagem, tipo = "success") {
    // Remove feedback anterior, se existir
    document.querySelectorAll('.feedback').forEach(fb => fb.remove());

    // Cria o elemento de feedback com classes Bootstrap
    const feedback = document.createElement("div");
    feedback.className = `feedback alert alert-${tipo === "success" ? "success" : "danger"} position-fixed top-0 end-0 m-3 shadow`;
    feedback.style.zIndex = 9999;
    feedback.style.minWidth = "260px";
    feedback.innerHTML = `
        <div class="d-flex align-items-center">
            <i class="bi ${tipo === "success" ? "bi-check-circle-fill" : "bi-exclamation-triangle-fill"} me-2"></i>
            <span>${mensagem}</span>
        </div>
    `;
    document.body.appendChild(feedback);

    setTimeout(() => {
      feedback.remove();
    }, 3000);
}

// Remove the duplicate function and keep only one loading function
async function carregarDocx() {
    return new Promise((resolve, reject) => {
        if (window.docx) {
            resolve();
            return;
        }

        const script = document.createElement('script');
        script.src = 'https://unpkg.com/docx@7.8.2/build/index.js';
        
        script.onload = () => {
            if (window.docx) {
                resolve();
            } else {
                reject(new Error("Biblioteca docx não foi carregada corretamente"));
            }
        };
        
        script.onerror = () => reject(new Error("Erro ao carregar biblioteca docx"));
        document.head.appendChild(script);
    });
}

// Primeiro, adicione a função para converter imagens em base64
async function getImageAsBase64(path) {
    try {
        // Fix path construction
        const isGitHubPages = window.location.hostname.includes('github.io');
        const repoName = 'Calculadoras-de-Rotina';
        
        // Build correct path
        const imagePath = isGitHubPages
            ? `/${repoName}/${path}` // GitHub Pages path
            : `/${path}`; // Local development path
            
        const response = await fetch(imagePath);
        
        if (!response.ok) {
            throw new Error(`Failed to load image: ${imagePath}`);
        }
        
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result.split(',')[1];
                resolve(base64String);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        console.error('Error loading image:', error);
        throw error;
    }
}

// Remove verificarDocxCarregado since we only need one function
export async function gerarDocx(tarefa) {
    try {
        await carregarDocx(); // Use the single loading function
        const { Document, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, Packer, VerticalAlign, ImageRun } = window.docx;
        const { BorderStyle } = window.docx;

        // Carregue as imagens
        const logoLabBase64 = await getImageAsBase64('assets/images/logo-sv.png');
        const logoUFSMBase64 = await getImageAsBase64('assets/images/logo-ufsm.png');
        const assinaturaBase64 = await getImageAsBase64('assets/images/Assinatura.png');

        // Lide com diferentes formatos de dados do proprietário e veterinário
        const proprietario = {
            nome: '',
            municipio: '',
            contato: ''
        };
        
        const veterinario = {
            nome: '',
            municipio: '',
            contato: ''
        };

        // Compatibilidade com formato antigo e novo
        if (tarefa.proprietario) {
            if (typeof tarefa.proprietario === 'object') {
                proprietario.nome = tarefa.proprietario.nome || '';
                proprietario.municipio = tarefa.proprietario.municipio || '';
                proprietario.contato = tarefa.proprietario.contato || '';
            } else if (typeof tarefa.proprietario === 'string') {
                proprietario.nome = tarefa.proprietario;
            }
        }

        if (tarefa.veterinario) {
            if (typeof tarefa.veterinario === 'object') {
                veterinario.nome = tarefa.veterinario.nome || '';
                veterinario.municipio = tarefa.veterinario.municipio || '';
                veterinario.contato = tarefa.veterinario.contato || '';
            } else if (typeof tarefa.veterinario === 'string') {
                veterinario.nome = tarefa.veterinario;
            }
        }

        // Adicione o cabeçalho com os logos no início do array sections
        const sections = [
            new Table({
                columnWidths: [3000, 3000, 3000],
                rows: [
                    new TableRow({
                        children: [
                            new TableCell({
                                children: [
                                    new Paragraph({
                                        children: [
                                            new ImageRun({
                                                data: logoLabBase64,
                                                transformation: {
                                                    width: 100,
                                                    height: 100
                                                }
                                            })
                                        ],
                                        alignment: AlignmentType.CENTER // Center logo
                                    })
                                ],
                                verticalAlign: VerticalAlign.CENTER,
                                borders: {
                                    top: { style: "none" },
                                    bottom: { style: "none" },
                                    left: { style: "none" },
                                    right: { style: "none" }
                                }
                            }),
                            new TableCell({
                                children: [
                                    new Paragraph({
                                        children: [
                                            new TextRun({
                                                text: "Setor de Virologia",
                                                bold: true,
                                                size: 28,
                                                font: "Arial"
                                            })
                                        ],
                                        alignment: AlignmentType.CENTER
                                    }),
                                    new Paragraph({
                                        children: [
                                            new TextRun({
                                                text: "Laboratório de Virologia",
                                                size: 24,
                                                font: "Arial"
                                            })
                                        ],
                                        alignment: AlignmentType.CENTER
                                    })
                                ],
                                verticalAlign: VerticalAlign.CENTER,
                                borders: {
                                    top: { style: "none" },
                                    bottom: { style: "none" },
                                    left: { style: "none" },
                                    right: { style: "none" }
                                }
                            }),
                            new TableCell({
                                children: [
                                    new Paragraph({
                                        children: [
                                            new ImageRun({
                                                data: logoUFSMBase64,
                                                transformation: {
                                                    width: 100,
                                                    height: 100
                                                }
                                            })
                                        ],
                                        alignment: AlignmentType.CENTER // Center logo
                                    })
                                ],
                                verticalAlign: VerticalAlign.CENTER,
                                borders: {
                                    top: { style: "none" },
                                    bottom: { style: "none" },
                                    left: { style: "none" },
                                    right: { style: "none" }
                                }
                            })
                        ],
                        tableHeader: true
                    })
                ],
                alignment: AlignmentType.CENTER, // Center the entire table
                width: { size: 80, type: WidthType.PERCENTAGE }, // Make table width 80% of page
                borders: {
                    top: { style: BorderStyle.NONE },
                    bottom: { style: BorderStyle.NONE },
                    left: { style: BorderStyle.NONE },
                    right: { style: BorderStyle.NONE },
                    insideHorizontal: { style: BorderStyle.NONE },
                    insideVertical: { style: BorderStyle.NONE }
                }
            }),
        ];

        // Define os textos variáveis conforme o tipo de teste
        let tituloLaudo, testeRealizado, nomeArquivo;
        const isELISA = tarefa.tipo.includes("ELISA");

        console.log("Tipo de teste:", tarefa.tipo); // Debug para verificar o tipo
        console.log("Dados completos da tarefa:", JSON.stringify(tarefa, null, 2)); // Debug completo

        // Função para formatar datas com múltiplas opções de fallback
        function formatarData(data, dataDefault = new Date()) {
            if (!data) return dataDefault.toLocaleDateString('pt-BR');
            
            // Se for um timestamp do Firebase
            if (data.toDate && typeof data.toDate === 'function') {
                return data.toDate().toLocaleDateString('pt-BR');
            }
            
            // Se for uma string de data
            if (typeof data === 'string') {
                const parsedDate = new Date(data);
                if (!isNaN(parsedDate.getTime())) {
                    return parsedDate.toLocaleDateString('pt-BR');
                }
            }
            
            // Se for um objeto Date
            if (data instanceof Date && !isNaN(data.getTime())) {
                return data.toLocaleDateString('pt-BR');
            }
            
            // Fallback para data atual
            return dataDefault.toLocaleDateString('pt-BR');
        }

        // Preparar as datas
        const dataEntrada = formatarData(tarefa.criadoEm || tarefa.dataRecebimento || tarefa.dataInicio);
        const dataLaudo = formatarData(tarefa.dataConclusao);
        
        console.log("Data de entrada formatada:", dataEntrada);
        console.log("Data do laudo formatada:", dataLaudo);
        console.log("criadoEm original:", tarefa.criadoEm);
        console.log("dataRecebimento original:", tarefa.dataRecebimento);

        // Função para extrair subtipo da SN
        function extrairSubtipoSN() {
            if (!isSN) return "";
            
            const tipoParaVerificar = tarefa.subTipo || tarefa.tipo;
            if (!tipoParaVerificar) return "";
            
            const tipoUpper = tipoParaVerificar.toUpperCase();
            
            // Detectar subtipo baseado na string
            if (tipoUpper.includes("IBR") || tipoUpper.includes("BOHV-1")) {
                return "IBR";
            } else if (tipoUpper.includes("BVDV-2")) {
                return "BVDV-2";
            } else if (tipoUpper.includes("BVDV-3") || tipoUpper.includes("HOBI")) {
                return "BVDV-3";
            } else if (tipoUpper.includes("BVDV-1") || (tipoUpper.includes("BVDV") && !tipoUpper.includes("BVDV-2") && !tipoUpper.includes("BVDV-3"))) {
                return "BVDV-1";
            } else if (tipoUpper.includes("EHV-1") || tipoUpper.includes("EHV1")) {
                return "EHV-1";
            }
            
            return "SN";
        }

        switch(tarefa.tipo) {
            case "SN IBR":
            case "SN BoHV-1":
            case "IBR":
                tituloLaudo = "Sorologia BoHV-1 (IBR)";
                testeRealizado = "Soro-Neutralização para BoHV-1 (cepa Cooper ~ 100TCID50)";
                nomeArquivo = "IBR";
                break;
            case "SN BVDV":
            case "SN BVDV-1":
            case "BVDV":
                tituloLaudo = "Sorologia BVDV";
                testeRealizado = "Soro-neutralização para BVDV-1 (cepa Singer ~ 100TCID50)";
                nomeArquivo = "BVDV";
                break;
            case "SN HoBi":
            case "SN BVDV-3":
                tituloLaudo = "Sorologia HoBi";
                testeRealizado = "Soro-neutralização para HoBi (cepa D32/00_'HoBi' ~ 100TCID50)";
                nomeArquivo = "HoBi";
                break;
            case "SN EHV-1":
            case "EHV-1":
                tituloLaudo = "Sorologia EHV-1";
                testeRealizado = "Soro-neutralização para EHV-1 (cepa Army 183 ~ 100TCID50)";
                nomeArquivo = "EHV-1";
                break;
            case "ELISA LEUCOSE":
                tituloLaudo = "Sorologia Vírus da Leucose Bovina";
                testeRealizado = "ELISA Anticorpo Vírus da Leucose Bovina (IDEXX®)";
                nomeArquivo = "ELISA_LEUCOSE";
                break;
            case "ELISA":
                // Verificar subtipo para ELISA
                if (tarefa.subTipo === "ELISA LEUCOSE") {
                    tituloLaudo = "Sorologia Vírus da Leucose Bovina";
                    testeRealizado = "ELISA Anticorpo Vírus da Leucose Bovina (IDEXX®)";
                    nomeArquivo = "ELISA_LEUCOSE";
                } else if (tarefa.subTipo === "ELISA BVDV") {
                    tituloLaudo = "Sorologia Vírus da Diarreia Bovina - BVDV";
                    testeRealizado = "ELISA para Antígeno contra Vírus da Diarreia Bovina - BVDV (IDEXX®)";
                    nomeArquivo = "ELISA_BVDV";
                } else {
                    tituloLaudo = "Laudo Laboratorial";
                    testeRealizado = "ELISA";
                    nomeArquivo = "ELISA";
                }
                break;
            case "ELISA BVDV":
                tituloLaudo = "Sorologia Vírus da Diarreia Bovina - BVDV";
                testeRealizado = "ELISA para Antígeno contra Vírus da Diarreia Bovina - BVDV";
                nomeArquivo = "ELISA_BVDV";
                break;
            case "PCR":
                // Check if DNA or RNA was selected
                if (tarefa.resultados?.acidoNucleico === 'RNA') {
                    tituloLaudo = "Diagnóstico Molecular (RT-PCR)";
                    testeRealizado = "RT-PCR - pesquisa de ácido nucléico viral (RNA)";
                } else {
                    tituloLaudo = "Diagnóstico Molecular (PCR)";
                    testeRealizado = "PCR - pesquisa de ácido nucléico viral (DNA)";
                }
                nomeArquivo = "PCR";
                break;
            case "MOLECULAR":
                // Verificar subtipo molecular específico
                if (tarefa.subTipo === "Multiplex Encefalites Equina") {
                    tituloLaudo = "Diagnóstico Molecular (Multiplex RT-PCR e PCR)";
                    testeRealizado = "Multiplex RT-PCR e PCR";
                    nomeArquivo = "MULTIPLEX_ENCEFALITES";
                } else if (tarefa.subTipo === "Multiplex Crostas Bovina") {
                    tituloLaudo = "Diagnóstico Molecular (Multiplex RT-PCR e PCR)";
                    testeRealizado = "Multiplex RT-PCR e PCR";
                    nomeArquivo = "MULTIPLEX_CROSTAS_BOV";
                } else if (tarefa.subTipo === "Multiplex RT-PCR e PCR Diarreia Neonatal Bovina" || (tarefa.subTipo && tarefa.subTipo.includes("Diarreia Neonatal"))) {
                    tituloLaudo = "Diagnóstico Molecular (Multiplex RT-PCR e PCR)";
                    testeRealizado = "Multiplex RT-PCR e PCR";
                    nomeArquivo = "MULTIPLEX_DIARREIA_NEONATAL_BOV";
                } else if (tarefa.subTipo === "Multiplex RT-PCR e PCR Doença Respiratória Bovina" || (tarefa.subTipo && tarefa.subTipo.includes("Doença Respiratória"))) {
                    tituloLaudo = "Diagnóstico Molecular (Multiplex RT-PCR e PCR)";
                    testeRealizado = "Multiplex RT-PCR e PCR";
                    nomeArquivo = "MULTIPLEX_DOENÇA_RESP_BOV";
                } else if (tarefa.subTipo === "Duplex RT-PCR Rota e Corona Bovino" || tarefa.subTipo === "Duplex Rota e Corona Bovino" || (tarefa.subTipo && (tarefa.subTipo.includes("Duplex RT-PCR Rota e Corona Bovino") || tarefa.subTipo.includes("Duplex Rota e Corona Bovino")))) {
                    tituloLaudo = "Diagnóstico Molecular (Duplex RT-PCR)";
                    testeRealizado = "Duplex RT-PCR";
                    nomeArquivo = "DUPLEX_RT-PCR_ROTA_CORONA_BOV";
                } else if (tarefa.subTipo === "Duplex RT-PCR Rota e Corona Equino" || tarefa.subTipo === "Duplex Rota e Corona Equino" || (tarefa.subTipo && (tarefa.subTipo.includes("Duplex RT-PCR Rota e Corona Equino") || tarefa.subTipo.includes("Duplex Rota e Corona Equino")))) {
                    tituloLaudo = "Diagnóstico Molecular (Duplex RT-PCR)";
                    testeRealizado = "Duplex RT-PCR";
                    nomeArquivo = "DUPLEX_RT-PCR_ROTA_CORONA_EQ";
                } else if (tarefa.subTipo && tarefa.subTipo.includes("Multiplex")) {
                    tituloLaudo = `Diagnóstico Molecular (${tarefa.subTipo})`;
                    testeRealizado = tarefa.subTipo;
                    nomeArquivo = "MULTIPLEX";
                } else if (tarefa.subTipo === "RT-PCR") {
                    tituloLaudo = "Diagnóstico Molecular (RT-PCR)";
                    testeRealizado = tarefa.alvo ? `RT-PCR - pesquisa de ácido nucléico viral (RNA)` : "RT-PCR - pesquisa de ácido nucléico viral (RNA)";
                    nomeArquivo = "RT-PCR";
                } else if (tarefa.subTipo === "PCR") {
                    tituloLaudo = "Diagnóstico Molecular (PCR)";
                    testeRealizado = tarefa.alvo ? `PCR - pesquisa de ácido nucléico viral (DNA)` : "PCR - pesquisa de ácido nucléico viral (DNA)";
                    nomeArquivo = "PCR";
                } else if (tarefa.resultados?.acidoNucleico === 'RNA') {
                    tituloLaudo = "Diagnóstico Molecular (RT-PCR)";
                    testeRealizado = "RT-PCR - pesquisa de ácido nucléico viral (RNA)";
                    nomeArquivo = "RT-PCR";
                } else {
                    tituloLaudo = "Diagnóstico Molecular (PCR)";
                    testeRealizado = "PCR - pesquisa de ácido nucléico viral (DNA)";
                    nomeArquivo = "PCR";
                }
                break;
            case "RAIVA":
                tituloLaudo = "Diagnóstico de RAIVA";
                testeRealizado = "(  ) Imunoflorescência (  ) RT-PCR";
                nomeArquivo = "RAIVA";
                break;
            case "ICC":
                tituloLaudo = "Isolamento em Cultivo Celular";
                testeRealizado = "Isolamento em Cultivo Celular";
                nomeArquivo = "ICC";
                break;
            default:
                // Caso padrão para tipos SN não específicos ou outros
                if (tarefa.tipo.includes("SN")) {
                    tituloLaudo = "Sorologia - Soroneutralização";
                    testeRealizado = "Soro-neutralização (SN)";
                    nomeArquivo = "SN";
                } else {
                    tituloLaudo = "Laudo Laboratorial";
                    testeRealizado = tarefa.tipo || "Teste não especificado";
                    nomeArquivo = "LAUDO";
                }
                break;
        }

        // Add a new condition for PCR type
        const isPCR = tarefa.tipo.includes("PCR");

        // Add a new condition for MOLECULAR type
        const isMOLECULAR = tarefa.tipo === "MOLECULAR";

        // Add a new condition for RAIVA type
        const isRAIVA = tarefa.tipo === "RAIVA";

        // Add a new condition for ICC type
        const isICC = tarefa.tipo === "ICC";

        // Add a new condition for SN type - mais flexível
        const isSN = tarefa.tipo && (tarefa.tipo.includes("SN") || tarefa.tipo.includes("Soro"));

        console.log("isSN detectado:", isSN); // Debug

        // Função para gerar os checkboxes de tipos de SN
        function gerarCheckboxesSN(tipoAtual) {
            console.log("=== DEBUG CHECKBOXES ===");
            console.log("Gerando checkboxes para tipo:", tipoAtual);
            console.log("SubTipo da tarefa:", tarefa.subTipo);
            console.log("Tipo original:", JSON.stringify(tipoAtual));
            
            // Usar subTipo se disponível, senão usar tipo
            const tipoParaVerificar = tarefa.subTipo || tipoAtual;
            console.log("Tipo que será verificado:", tipoParaVerificar);
            
            const tipos = [
                { codigo: "BVDV-1", nome: "BVDV-1" },
                { codigo: "BVDV-2", nome: "BVDV-2" }, 
                { codigo: "BVDV-3", nome: "BVDV-3/HoBi" },
                { codigo: "BoHV-1", nome: "BoHV-1" },
                { codigo: "EHV-1", nome: "EHV-1" }
            ];

            let checkboxes = "";
            tipos.forEach((tipo, index) => {
                let isSelected = false;
                
                // Lógica de detecção melhorada e corrigida
                if (tipoParaVerificar) {
                    const tipoUpper = tipoParaVerificar.toUpperCase();
                    
                    console.log(`Verificando ${tipo.nome}:`);
                    console.log(`  tipoUpper: "${tipoUpper}"`);
                    
                    // Lógica específica para cada tipo
                    if (tipo.codigo === "BoHV-1") {
                        // Para BoHV-1, verifica IBR ou BoHV-1
                        isSelected = tipoUpper.includes("IBR") || tipoUpper.includes("BOHV-1");
                        console.log(`  IBR/BoHV-1 check: ${isSelected}`);
                    } else if (tipo.codigo === "BVDV-1") {
                        // Para BVDV-1, verifica se tem BVDV mas não especifica 2 ou 3
                        isSelected = tipoUpper.includes("BVDV") && !tipoUpper.includes("BVDV-2") && !tipoUpper.includes("BVDV-3");
                        console.log(`  BVDV-1 check: ${isSelected}`);
                    } else if (tipo.codigo === "BVDV-2") {
                        // Para BVDV-2, verifica especificamente BVDV-2
                        isSelected = tipoUpper.includes("BVDV-2");
                        console.log(`  BVDV-2 check: ${isSelected}`);
                    } else if (tipo.codigo === "BVDV-3") {
                        // Para BVDV-3, verifica BVDV-3 ou HoBi
                        isSelected = tipoUpper.includes("BVDV-3") || tipoUpper.includes("HOBI");
                        console.log(`  BVDV-3/HoBi check: ${isSelected}`);
                    } else if (tipo.codigo === "EHV-1") {
                        // Para EHV-1, verifica EHV-1
                        isSelected = tipoUpper.includes("EHV-1") || tipoUpper.includes("EHV1");
                        console.log(`  EHV-1 check: ${isSelected}`);
                    }
                    
                    console.log(`  Resultado para ${tipo.nome}: ${isSelected}`);
                }
                
                const checkbox = isSelected ? "( X )" : "(     )";
                checkboxes += `${checkbox} ${tipo.nome}`;
                
                if (index < tipos.length - 1) {
                    checkboxes += "; ";
                }
            });

            console.log("Resultado final dos checkboxes:", checkboxes);
            console.log("=== FIM DEBUG CHECKBOXES ===");
            return checkboxes;
        }

        // Cria a tabela de resultados baseada no tipo
        let tabelaResultados;
        let tabelaResultadosEncefalites; // Declarar aqui para que seja acessível em todo o escopo
        let tituloSecao; // Para títulos específicos dos subtipos MOLECULAR
        let informacoes; // Para informações específicas dos subtipos MOLECULAR
        
        if (isELISA || isRAIVA || isICC) { // Add ICC here
            // Tabela ELISA, RAIVA e ICC
            tabelaResultados = new Table({
                columnWidths: [3000, 3000],
                rows: [
                    new TableRow({
                        children: [
                            new TableCell({
                                children: [new Paragraph({ 
                                    children: [new TextRun({ 
                                        text: "Identificação da amostra", 
                                        bold: true,
                                        size: 24,
                                        font: "Arial",
                                        color: "FFFFFF"
                                    })],
                                    alignment: AlignmentType.CENTER
                                })],
                                margins: {
                                    top: 100,
                                    bottom: 100,
                                    left: 100,
                                    right: 100
                                },
                                verticalAlign: VerticalAlign.CENTER,
                                shading: { 
                                    fill: "#1b5e20", 
                                    type: "clear"
                                }
                            }),
                            new TableCell({
                                children: [new Paragraph({ 
                                    children: [new TextRun({ 
                                        text: "Resultado", 
                                        bold: true,
                                        size: 24,
                                        font: "Arial",
                                        color: "FFFFFF"
                                    })],
                                    alignment: AlignmentType.CENTER
                                })],
                                margins: {
                                    top: 100,
                                    bottom: 100,
                                    left: 100,
                                    right: 100
                                },
                                verticalAlign: VerticalAlign.CENTER,
                                shading: { 
                                    fill: "#1b5e20", 
                                    type: "clear"
                                }
                            })
                        ]
                    }),
                    ...tarefa.resultados.amostras.map(amostra => 
                        new TableRow({
                            children: [
                                new TableCell({
                                    children: [new Paragraph({ 
                                        children: [new TextRun({
                                            text: amostra.identificacao || "-",
                                            size: 24,
                                            font: "Arial"
                                        })]
                                    })],
                                    margins: {
                                        top: 100,
                                        bottom: 100,
                                        left: 100,
                                        right: 100
                                    }
                                }),
                                new TableCell({
                                    children: [new Paragraph({ 
                                        children: [new TextRun({
                                            text: amostra.resultado || "-",
                                            size: 24,
                                            font: "Arial"
                                        })]
                                    })],
                                    margins: {
                                        top: 100,
                                        bottom: 100,
                                        left: 100,
                                        right: 100
                                    }
                                })
                            ]
                        })
                    ),
                    // Add Observações row for RAIVA and ICC
                    new TableRow({
                        children: [
                            new TableCell({
                                children: [new Paragraph({ 
                                    children: [new TextRun({ 
                                        text: "Observações:", 
                                        bold: true,
                                        size: 24,
                                        font: "Arial"
                                    })]
                                })],
                                columnSpan: 2,
                                margins: {
                                    top: 100,
                                    bottom: 100,
                                    left: 100,
                                    right: 100
                                }
                            })
                        ]
                    })
                ],
                width: { size: 100, type: WidthType.PERCENTAGE }
            });
        } else if (isPCR) {
            // Tabela PCR
            tabelaResultados = new Table({
                columnWidths: [3000, 3000],
                rows: [
                    // Cabeçalho com descrição do teste
                    new TableRow({
                        children: [
                            new TableCell({
                                children: [new Paragraph({
                                    children: [new TextRun({
                                        text: "Identificação da amostra",
                                        bold: true,
                                        size: 24,
                                        font: "Arial",
                                        color: "FFFFFF"
                                    })],
                                    alignment: AlignmentType.CENTER
                                })],
                                margins: {
                                    top: 100,
                                    bottom: 100,
                                    left: 100,
                                    right: 100
                                },
                                verticalAlign: VerticalAlign.CENTER,
                                shading: {
                                    fill: "#1b5e20",
                                    type: "clear"
                                }
                            }),
                            new TableCell({
                                children: [new Paragraph({
                                    children: [new TextRun({
                                        text: "Resultado",
                                        bold: true,
                                        size: 24,
                                        font: "Arial",
                                        color: "FFFFFF"
                                    })],
                                    alignment: AlignmentType.CENTER
                                })],
                                margins: {
                                    top: 100,
                                    bottom: 100,
                                    left: 100,
                                    right: 100
                                },
                                verticalAlign: VerticalAlign.CENTER,
                                shading: {
                                    fill: "#1b5e20",
                                    type: "clear"
                                }
                            })
                        ]
                    }),
                    
                    // Resultados das amostras
                    ...(tarefa.resultados?.amostras || []).map(amostra =>
                        new TableRow({
                            children: [
                                new TableCell({
                                    children: [new Paragraph({
                                        children: [new TextRun({
                                            text: amostra.identificacao || "-",
                                            size: 24,
                                            font: "Arial"
                                        })]
                                    })],
                                    margins: {
                                        top: 100,
                                        bottom: 100,
                                        left: 100,
                                        right: 100
                                    }
                                }),
                                new TableCell({
                                    children: [new Paragraph({
                                        children: [new TextRun({
                                            text: amostra.resultado || "-",
                                            size: 24,
                                            font: "Arial"
                                        })]
                                    })],
                                    margins: {
                                        top: 100,
                                        bottom: 100,
                                        left: 100,
                                        right: 100
                                    }
                                })
                            ]
                        })
                    ),
                    new TableRow({
                        children: [
                            new TableCell({
                                children: [new Paragraph({
                                    children: [new TextRun({
                                        text: testeRealizado,
                                        bold: true,
                                        size: 20,
                                        font: "Arial"
                                    })],
                                    alignment: AlignmentType.CENTER
                                })],
                                columnSpan: 2,
                                margins: {
                                    top: 100,
                                    bottom: 100,
                                    left: 100,
                                    right: 100
                                }
                            })
                        ]
                    }),
                    // Observações
                    new TableRow({
                        children: [
                            new TableCell({
                                children: [new Paragraph({
                                    children: [new TextRun({
                                        text: "Observações:",
                                        bold: true,
                                        size: 24,
                                        font: "Arial"
                                    })]
                                })],
                                columnSpan: 2,
                                margins: {
                                    top: 100,
                                    bottom: 100,
                                    left: 100,
                                    right: 100
                                }
                            })
                        ]
                    })
                ],
                width: { size: 100, type: WidthType.PERCENTAGE }
            });
        } else if (isMOLECULAR) {
            // Tabela específica para Diagnóstico Molecular
            console.log("=== DEBUG MOLECULAR ===");
            console.log("É MOLECULAR:", isMOLECULAR);
            console.log("SubTipo da tarefa:", tarefa.subTipo);
            console.log("Tipo da tarefa:", tarefa.tipo);
            console.log("Comparação 'Multiplex Encefalites Equina':", tarefa.subTipo === "Multiplex Encefalites Equina");
            console.log("Comparação 'Multiplex Crostas Bovina':", tarefa.subTipo === "Multiplex Crostas Bovina");
            console.log("Comparação 'Multiplex RT-PCR e PCR Diarreia Neonatal Bovina':", tarefa.subTipo === "Multiplex RT-PCR e PCR Diarreia Neonatal Bovina");
            console.log("Comparação 'Multiplex Diarreia Neonatal Bovina':", tarefa.subTipo === "Multiplex Diarreia Neonatal Bovina");
            console.log("Comparação 'Multiplex RT-PCR e PCR Doença Respiratória Bovina':", tarefa.subTipo === "Multiplex RT-PCR e PCR Doença Respiratória Bovina");
            console.log("Comparação 'Multiplex Doença Respiratória Bovina':", tarefa.subTipo === "Multiplex Doença Respiratória Bovina");
            console.log("Comparação 'Duplex RT-PCR Rota e Corona Bovino':", tarefa.subTipo === "Duplex RT-PCR Rota e Corona Bovino");
            console.log("Comparação 'Duplex Rota e Corona Bovino':", tarefa.subTipo === "Duplex Rota e Corona Bovino");
            console.log("Comparação 'Duplex RT-PCR Rota e Corona Equino':", tarefa.subTipo === "Duplex RT-PCR Rota e Corona Equino");
            console.log("Comparação 'Duplex Rota e Corona Equino':", tarefa.subTipo === "Duplex Rota e Corona Equino");
            console.log("Inclui 'Diarreia Neonatal':", tarefa.subTipo && tarefa.subTipo.includes("Diarreia Neonatal"));
            console.log("Inclui 'Doença Respiratória':", tarefa.subTipo && tarefa.subTipo.includes("Doença Respiratória"));
            console.log("Inclui 'Duplex RT-PCR Rota e Corona':", tarefa.subTipo && tarefa.subTipo.includes("Duplex RT-PCR Rota e Corona"));
            console.log("Inclui 'Duplex Rota e Corona':", tarefa.subTipo && tarefa.subTipo.includes("Duplex Rota e Corona"));
            console.log("Nome exato do subTipo recebido:", JSON.stringify(tarefa.subTipo));
            console.log("Tipo de dados do subTipo:", typeof tarefa.subTipo);
            console.log("=== FIM DEBUG MOLECULAR ===");
            
            if (tarefa.subTipo === "Multiplex Encefalites Equina") {

                // Adicionar tabela de resultados específica para Multiplex Encefalites
                tabelaResultadosEncefalites = new Table({
                    columnWidths: [1500, 1000, 1000, 1000, 1000, 1000],
                    rows: [
                        // Cabeçalho da tabela de resultados
                        new TableRow({
                            children: [
                                new TableCell({
                                    children: [new Paragraph({
                                        children: [new TextRun({
                                            text: "Identificação da amostra",
                                            bold: true,
                                            size: 20,
                                            font: "Arial",
                                            color: "FFFFFF"
                                        })],
                                        alignment: AlignmentType.CENTER
                                    })],
                                    margins: { top: 100, bottom: 100, left: 100, right: 100 },
                                    verticalAlign: VerticalAlign.CENTER,
                                    shading: { fill: "#1b5e20", type: "clear" },
                                    borders: {
                                        top: { style: "single", size: 1 },
                                        bottom: { style: "single", size: 1 },
                                        left: { style: "single", size: 1 },
                                        right: { style: "single", size: 1 }
                                    }
                                }),
                                new TableCell({
                                    children: [new Paragraph({
                                        children: [new TextRun({
                                            text: "RABV",
                                            bold: true,
                                            size: 20,
                                            font: "Arial",
                                            color: "FFFFFF"
                                        })],
                                        alignment: AlignmentType.CENTER
                                    })],
                                    margins: { top: 100, bottom: 100, left: 100, right: 100 },
                                    verticalAlign: VerticalAlign.CENTER,
                                    shading: { fill: "#1b5e20", type: "clear" },
                                    borders: {
                                        top: { style: "single", size: 1 },
                                        bottom: { style: "single", size: 1 },
                                        left: { style: "single", size: 1 },
                                        right: { style: "single", size: 1 }
                                    }
                                }),
                                new TableCell({
                                    children: [new Paragraph({
                                        children: [new TextRun({
                                            text: "EHV-1",
                                            bold: true,
                                            size: 20,
                                            font: "Arial",
                                            color: "FFFFFF"
                                        })],
                                        alignment: AlignmentType.CENTER
                                    })],
                                    margins: { top: 100, bottom: 100, left: 100, right: 100 },
                                    verticalAlign: VerticalAlign.CENTER,
                                    shading: { fill: "#1b5e20", type: "clear" },
                                    borders: {
                                        top: { style: "single", size: 1 },
                                        bottom: { style: "single", size: 1 },
                                        left: { style: "single", size: 1 },
                                        right: { style: "single", size: 1 }
                                    }
                                }),
                                new TableCell({
                                    children: [new Paragraph({
                                        children: [new TextRun({
                                            text: "Flavivirus",
                                            bold: true,
                                            size: 20,
                                            font: "Arial",
                                            color: "FFFFFF"
                                        })],
                                        alignment: AlignmentType.CENTER
                                    })],
                                    margins: { top: 100, bottom: 100, left: 100, right: 100 },
                                    verticalAlign: VerticalAlign.CENTER,
                                    shading: { fill: "#1b5e20", type: "clear" },
                                    borders: {
                                        top: { style: "single", size: 1 },
                                        bottom: { style: "single", size: 1 },
                                        left: { style: "single", size: 1 },
                                        right: { style: "single", size: 1 }
                                    }
                                }),
                                new TableCell({
                                    children: [new Paragraph({
                                        children: [new TextRun({
                                            text: "Alphavirus",
                                            bold: true,
                                            size: 20,
                                            font: "Arial",
                                            color: "FFFFFF"
                                        })],
                                        alignment: AlignmentType.CENTER
                                    })],
                                    margins: { top: 100, bottom: 100, left: 100, right: 100 },
                                    verticalAlign: VerticalAlign.CENTER,
                                    shading: { fill: "#1b5e20", type: "clear" },
                                    borders: {
                                        top: { style: "single", size: 1 },
                                        bottom: { style: "single", size: 1 },
                                        left: { style: "single", size: 1 },
                                        right: { style: "single", size: 1 }
                                    }
                                }),
                                new TableCell({
                                    children: [new Paragraph({
                                        children: [new TextRun({
                                            text: "VEEV",
                                            bold: true,
                                            size: 20,
                                            font: "Arial",
                                            color: "FFFFFF"
                                        })],
                                        alignment: AlignmentType.CENTER
                                    })],
                                    margins: { top: 100, bottom: 100, left: 100, right: 100 },
                                    verticalAlign: VerticalAlign.CENTER,
                                    shading: { fill: "#1b5e20", type: "clear" },
                                    borders: {
                                        top: { style: "single", size: 1 },
                                        bottom: { style: "single", size: 1 },
                                        left: { style: "single", size: 1 },
                                        right: { style: "single", size: 1 }
                                    }
                                })
                            ]
                        }),
                        // Linhas de dados
                        ...(tarefa.resultados?.amostras || []).map(amostra =>
                            new TableRow({
                                children: [
                                    new TableCell({
                                        children: [new Paragraph({
                                            children: [new TextRun({
                                                text: amostra.identificacao || "-",
                                                size: 20,
                                                font: "Arial"
                                            })],
                                            alignment: AlignmentType.CENTER
                                        })],
                                        margins: { top: 100, bottom: 100, left: 100, right: 100 },
                                        verticalAlign: VerticalAlign.CENTER,
                                        borders: {
                                            top: { style: "single", size: 1 },
                                            bottom: { style: "single", size: 1 },
                                            left: { style: "single", size: 1 },
                                            right: { style: "single", size: 1 }
                                        }
                                    }),
                                    new TableCell({
                                        children: [new Paragraph({
                                            children: [new TextRun({
                                                text: amostra.virusRaiva || "",
                                                size: 20,
                                                font: "Arial"
                                            })],
                                            alignment: AlignmentType.CENTER
                                        })],
                                        margins: { top: 100, bottom: 100, left: 100, right: 100 },
                                        verticalAlign: VerticalAlign.CENTER,
                                        borders: {
                                            top: { style: "single", size: 1 },
                                            bottom: { style: "single", size: 1 },
                                            left: { style: "single", size: 1 },
                                            right: { style: "single", size: 1 }
                                        }
                                    }),
                                    new TableCell({
                                        children: [new Paragraph({
                                            children: [new TextRun({
                                                text: amostra.ehv1 || "",
                                                size: 20,
                                                font: "Arial"
                                            })],
                                            alignment: AlignmentType.CENTER
                                        })],
                                        margins: { top: 100, bottom: 100, left: 100, right: 100 },
                                        verticalAlign: VerticalAlign.CENTER,
                                        borders: {
                                            top: { style: "single", size: 1 },
                                            bottom: { style: "single", size: 1 },
                                            left: { style: "single", size: 1 },
                                            right: { style: "single", size: 1 }
                                        }
                                    }),
                                    new TableCell({
                                        children: [new Paragraph({
                                            children: [new TextRun({
                                                text: amostra.flavivirus || "",
                                                size: 20,
                                                font: "Arial"
                                            })],
                                            alignment: AlignmentType.CENTER
                                        })],
                                        margins: { top: 100, bottom: 100, left: 100, right: 100 },
                                        verticalAlign: VerticalAlign.CENTER,
                                        borders: {
                                            top: { style: "single", size: 1 },
                                            bottom: { style: "single", size: 1 },
                                            left: { style: "single", size: 1 },
                                            right: { style: "single", size: 1 }
                                        }
                                    }),
                                    new TableCell({
                                        children: [new Paragraph({
                                            children: [new TextRun({
                                                text: amostra.alphavirus || "",
                                                size: 20,
                                                font: "Arial"
                                            })],
                                            alignment: AlignmentType.CENTER
                                        })],
                                        margins: { top: 100, bottom: 100, left: 100, right: 100 },
                                        verticalAlign: VerticalAlign.CENTER,
                                        borders: {
                                            top: { style: "single", size: 1 },
                                            bottom: { style: "single", size: 1 },
                                            left: { style: "single", size: 1 },
                                            right: { style: "single", size: 1 }
                                        }
                                    }),
                                    new TableCell({
                                        children: [new Paragraph({
                                            children: [new TextRun({
                                                text: amostra.veev || "",
                                                size: 20,
                                                font: "Arial"
                                            })],
                                            alignment: AlignmentType.CENTER
                                        })],
                                        margins: { top: 100, bottom: 100, left: 100, right: 100 },
                                        verticalAlign: VerticalAlign.CENTER,
                                        borders: {
                                            top: { style: "single", size: 1 },
                                            bottom: { style: "single", size: 1 },
                                            left: { style: "single", size: 1 },
                                            right: { style: "single", size: 1 }
                                        }
                                    })
                                ]
                            })
                        )
                    ],
                    width: { size: 100, type: WidthType.PERCENTAGE }
                });
            } else if (tarefa.subTipo === "Multiplex Crostas Bovina") {
                // Tabela específica para Multiplex Crostas Bovina
                console.log("=== DETECTOU MULTIPLEX CROSTAS BOVINA ===");
                console.log("Dados da tarefa.resultados:", JSON.stringify(tarefa.resultados, null, 2));
                console.log("Amostras:", tarefa.resultados?.amostras);
                console.log("=== FIM DEBUG CROSTAS ===");
                
                tabelaResultados = new Table({
                    columnWidths: [1500, 1000, 1000, 1000, 1000],
                    rows: [
                        // Cabeçalho da tabela de resultados
                        new TableRow({
                            children: [
                                new TableCell({
                                    children: [new Paragraph({
                                        children: [new TextRun({
                                            text: "Identificação da amostra",
                                            bold: true,
                                            size: 20,
                                            font: "Arial",
                                            color: "FFFFFF"
                                        })],
                                        alignment: AlignmentType.CENTER
                                    })],
                                    margins: { top: 100, bottom: 100, left: 100, right: 100 },
                                    verticalAlign: VerticalAlign.CENTER,
                                    shading: { fill: "#1b5e20", type: "clear" },
                                    borders: {
                                        top: { style: "single", size: 1 },
                                        bottom: { style: "single", size: 1 },
                                        left: { style: "single", size: 1 },
                                        right: { style: "single", size: 1 }
                                    }
                                }),
                                new TableCell({
                                    children: [new Paragraph({
                                        children: [new TextRun({
                                            text: "VaCV",
                                            bold: true,
                                            size: 20,
                                            font: "Arial",
                                            color: "FFFFFF"
                                        })],
                                        alignment: AlignmentType.CENTER
                                    })],
                                    margins: { top: 100, bottom: 100, left: 100, right: 100 },
                                    verticalAlign: VerticalAlign.CENTER,
                                    shading: { fill: "#1b5e20", type: "clear" },
                                    borders: {
                                        top: { style: "single", size: 1 },
                                        bottom: { style: "single", size: 1 },
                                        left: { style: "single", size: 1 },
                                        right: { style: "single", size: 1 }
                                    }
                                }),
                                new TableCell({
                                    children: [new Paragraph({
                                        children: [new TextRun({
                                            text: "PCPV",
                                            bold: true,
                                            size: 20,
                                            font: "Arial",
                                            color: "FFFFFF"
                                        })],
                                        alignment: AlignmentType.CENTER
                                    })],
                                    margins: { top: 100, bottom: 100, left: 100, right: 100 },
                                    verticalAlign: VerticalAlign.CENTER,
                                    shading: { fill: "#1b5e20", type: "clear" },
                                    borders: {
                                        top: { style: "single", size: 1 },
                                        bottom: { style: "single", size: 1 },
                                        left: { style: "single", size: 1 },
                                        right: { style: "single", size: 1 }
                                    }
                                }),
                                new TableCell({
                                    children: [new Paragraph({
                                        children: [new TextRun({
                                            text: "BPSV",
                                            bold: true,
                                            size: 20,
                                            font: "Arial",
                                            color: "FFFFFF"
                                        })],
                                        alignment: AlignmentType.CENTER
                                    })],
                                    margins: { top: 100, bottom: 100, left: 100, right: 100 },
                                    verticalAlign: VerticalAlign.CENTER,
                                    shading: { fill: "#1b5e20", type: "clear" },
                                    borders: {
                                        top: { style: "single", size: 1 },
                                        bottom: { style: "single", size: 1 },
                                        left: { style: "single", size: 1 },
                                        right: { style: "single", size: 1 }
                                    }
                                }),
                                new TableCell({
                                    children: [new Paragraph({
                                        children: [new TextRun({
                                            text: "BoHV-2",
                                            bold: true,
                                            size: 20,
                                            font: "Arial",
                                            color: "FFFFFF"
                                        })],
                                        alignment: AlignmentType.CENTER
                                    })],
                                    margins: { top: 100, bottom: 100, left: 100, right: 100 },
                                    verticalAlign: VerticalAlign.CENTER,
                                    shading: { fill: "#1b5e20", type: "clear" },
                                    borders: {
                                        top: { style: "single", size: 1 },
                                        bottom: { style: "single", size: 1 },
                                        left: { style: "single", size: 1 },
                                        right: { style: "single", size: 1 }
                                    }
                                })
                            ]
                        }),
                        // Linhas de dados
                        ...(tarefa.resultados?.amostras || []).map((amostra, index) => {
                            console.log(`=== AMOSTRA ${index + 1} ===`);
                            console.log("Dados completos da amostra:", JSON.stringify(amostra, null, 2));
                            console.log("TODOS OS CAMPOS DA AMOSTRA:");
                            Object.keys(amostra).forEach(key => {
                                console.log(`  ${key}: ${amostra[key]}`);
                            });
                            console.log("vaccinia:", amostra.vaccinia);
                            console.log("pseudocowpox:", amostra.pseudocowpox);
                            console.log("estomatitePapular:", amostra.estomatitePapular);
                            console.log("boHV2:", amostra.boHV2);
                            console.log("bohv2:", amostra.bohv2);
                            console.log("BoHV2:", amostra.BoHV2);
                            console.log("herpesvirus2:", amostra.herpesvirus2);
                            console.log("herpesvirus:", amostra.herpesvirus);
                            console.log("herpesvirus-bovino-2:", amostra["herpesvirus-bovino-2"]);
                            console.log("Herpesvirus Bovino 2:", amostra["Herpesvirus Bovino 2"]);
                            console.log("=== FIM AMOSTRA ===");
                            
                            return new TableRow({
                                children: [
                                    new TableCell({
                                        children: [new Paragraph({
                                            children: [new TextRun({
                                                text: amostra.identificacao || "-",
                                                size: 20,
                                                font: "Arial"
                                            })],
                                            alignment: AlignmentType.CENTER
                                        })],
                                        margins: { top: 100, bottom: 100, left: 100, right: 100 },
                                        verticalAlign: VerticalAlign.CENTER,
                                        borders: {
                                            top: { style: "single", size: 1 },
                                            bottom: { style: "single", size: 1 },
                                            left: { style: "single", size: 1 },
                                            right: { style: "single", size: 1 }
                                        }
                                    }),
                                    new TableCell({
                                        children: [new Paragraph({
                                            children: [new TextRun({
                                                text: amostra.vaccinia || "",
                                                size: 20,
                                                font: "Arial"
                                            })],
                                            alignment: AlignmentType.CENTER
                                        })],
                                        margins: { top: 100, bottom: 100, left: 100, right: 100 },
                                        verticalAlign: VerticalAlign.CENTER,
                                        borders: {
                                            top: { style: "single", size: 1 },
                                            bottom: { style: "single", size: 1 },
                                            left: { style: "single", size: 1 },
                                            right: { style: "single", size: 1 }
                                        }
                                    }),
                                    new TableCell({
                                        children: [new Paragraph({
                                            children: [new TextRun({
                                                text: amostra.pseudocowpox || "",
                                                size: 20,
                                                font: "Arial"
                                            })],
                                            alignment: AlignmentType.CENTER
                                        })],
                                        margins: { top: 100, bottom: 100, left: 100, right: 100 },
                                        verticalAlign: VerticalAlign.CENTER,
                                        borders: {
                                            top: { style: "single", size: 1 },
                                            bottom: { style: "single", size: 1 },
                                            left: { style: "single", size: 1 },
                                            right: { style: "single", size: 1 }
                                        }
                                    }),
                                    new TableCell({
                                        children: [new Paragraph({
                                            children: [new TextRun({
                                                text: amostra.estomatitePapular || "",
                                                size: 20,
                                                font: "Arial"
                                            })],
                                            alignment: AlignmentType.CENTER
                                        })],
                                        margins: { top: 100, bottom: 100, left: 100, right: 100 },
                                        verticalAlign: VerticalAlign.CENTER,
                                        borders: {
                                            top: { style: "single", size: 1 },
                                            bottom: { style: "single", size: 1 },
                                            left: { style: "single", size: 1 },
                                            right: { style: "single", size: 1 }
                                        }
                                    }),
                                    new TableCell({
                                        children: [new Paragraph({
                                            children: [new TextRun({
                                                text: amostra.herpesvirus || amostra.boHV2 || amostra.bohv2 || amostra.BoHV2 || amostra.herpesvirus2 || amostra["herpesvirus-bovino-2"] || amostra["Herpesvirus Bovino 2"] || "",
                                                size: 20,
                                                font: "Arial"
                                            })],
                                            alignment: AlignmentType.CENTER
                                        })],
                                        margins: { top: 100, bottom: 100, left: 100, right: 100 },
                                        verticalAlign: VerticalAlign.CENTER,
                                        borders: {
                                            top: { style: "single", size: 1 },
                                            bottom: { style: "single", size: 1 },
                                            left: { style: "single", size: 1 },
                                            right: { style: "single", size: 1 }
                                        }
                                    })
                                ]
                            });
                        })
                    ],
                    width: { size: 100, type: WidthType.PERCENTAGE }
                });
            } else if (tarefa.subTipo === "Multiplex RT-PCR e PCR Diarreia Neonatal Bovina" || (tarefa.subTipo && tarefa.subTipo.includes("Diarreia Neonatal"))) {
                // Tabela específica para Multiplex RT-PCR e PCR Diarreia Neonatal Bovina
                console.log("=== DETECTOU MULTIPLEX DIARREIA NEONATAL BOVINA ===");
                console.log("Dados da tarefa.resultados:", JSON.stringify(tarefa.resultados, null, 2));
                console.log("Amostras:", tarefa.resultados?.amostras);
                console.log("=== FIM DEBUG DIARREIA ===");
                
                tabelaResultados = new Table({
                    columnWidths: [1200, 800, 800, 800, 800, 800],
                    rows: [
                        // Cabeçalho da tabela de resultados
                        new TableRow({
                            children: [
                                new TableCell({
                                    children: [new Paragraph({
                                        children: [new TextRun({
                                            text: "Identificação da amostra",
                                            bold: true,
                                            size: 20,
                                            font: "Arial",
                                            color: "FFFFFF"
                                        })],
                                        alignment: AlignmentType.CENTER
                                    })],
                                    margins: { top: 100, bottom: 100, left: 100, right: 100 },
                                    verticalAlign: VerticalAlign.CENTER,
                                    shading: { fill: "#1b5e20", type: "clear" },
                                    borders: {
                                        top: { style: "single", size: 1 },
                                        bottom: { style: "single", size: 1 },
                                        left: { style: "single", size: 1 },
                                        right: { style: "single", size: 1 }
                                    }
                                }),
                                new TableCell({
                                    children: [new Paragraph({
                                        children: [new TextRun({
                                            text: "E. coli",
                                            bold: true,
                                            size: 20,
                                            font: "Arial",
                                            color: "FFFFFF"
                                        })],
                                        alignment: AlignmentType.CENTER
                                    })],
                                    margins: { top: 100, bottom: 100, left: 100, right: 100 },
                                    verticalAlign: VerticalAlign.CENTER,
                                    shading: { fill: "#1b5e20", type: "clear" },
                                    borders: {
                                        top: { style: "single", size: 1 },
                                        bottom: { style: "single", size: 1 },
                                        left: { style: "single", size: 1 },
                                        right: { style: "single", size: 1 }
                                    }
                                }),
                                new TableCell({
                                    children: [new Paragraph({
                                        children: [new TextRun({
                                            text: "Salmonella",
                                            bold: true,
                                            size: 20,
                                            font: "Arial",
                                            color: "FFFFFF"
                                        })],
                                        alignment: AlignmentType.CENTER
                                    })],
                                    margins: { top: 100, bottom: 100, left: 100, right: 100 },
                                    verticalAlign: VerticalAlign.CENTER,
                                    shading: { fill: "#1b5e20", type: "clear" },
                                    borders: {
                                        top: { style: "single", size: 1 },
                                        bottom: { style: "single", size: 1 },
                                        left: { style: "single", size: 1 },
                                        right: { style: "single", size: 1 }
                                    }
                                }),
                                new TableCell({
                                    children: [new Paragraph({
                                        children: [new TextRun({
                                            text: "BCoV",
                                            bold: true,
                                            size: 20,
                                            font: "Arial",
                                            color: "FFFFFF"
                                        })],
                                        alignment: AlignmentType.CENTER
                                    })],
                                    margins: { top: 100, bottom: 100, left: 100, right: 100 },
                                    verticalAlign: VerticalAlign.CENTER,
                                    shading: { fill: "#1b5e20", type: "clear" },
                                    borders: {
                                        top: { style: "single", size: 1 },
                                        bottom: { style: "single", size: 1 },
                                        left: { style: "single", size: 1 },
                                        right: { style: "single", size: 1 }
                                    }
                                }),
                                new TableCell({
                                    children: [new Paragraph({
                                        children: [new TextRun({
                                            text: "BRoV",
                                            bold: true,
                                            size: 20,
                                            font: "Arial",
                                            color: "FFFFFF"
                                        })],
                                        alignment: AlignmentType.CENTER
                                    })],
                                    margins: { top: 100, bottom: 100, left: 100, right: 100 },
                                    verticalAlign: VerticalAlign.CENTER,
                                    shading: { fill: "#1b5e20", type: "clear" },
                                    borders: {
                                        top: { style: "single", size: 1 },
                                        bottom: { style: "single", size: 1 },
                                        left: { style: "single", size: 1 },
                                        right: { style: "single", size: 1 }
                                    }
                                }),
                                new TableCell({
                                    children: [new Paragraph({
                                        children: [new TextRun({
                                            text: "Crypto",
                                            bold: true,
                                            size: 20,
                                            font: "Arial",
                                            color: "FFFFFF"
                                        })],
                                        alignment: AlignmentType.CENTER
                                    })],
                                    margins: { top: 100, bottom: 100, left: 100, right: 100 },
                                    verticalAlign: VerticalAlign.CENTER,
                                    shading: { fill: "#1b5e20", type: "clear" },
                                    borders: {
                                        top: { style: "single", size: 1 },
                                        bottom: { style: "single", size: 1 },
                                        left: { style: "single", size: 1 },
                                        right: { style: "single", size: 1 }
                                    }
                                })
                            ]
                        }),
                        // Linhas de dados
                        ...(tarefa.resultados?.amostras || []).map((amostra, index) => {
                            console.log(`=== AMOSTRA DIARREIA ${index + 1} ===`);
                            console.log("Dados completos da amostra:", JSON.stringify(amostra, null, 2));
                            console.log("TODOS OS CAMPOS DA AMOSTRA:");
                            Object.keys(amostra).forEach(key => {
                                console.log(`  ${key}: ${amostra[key]}`);
                            });
                            console.log("ecoli:", amostra.ecoli);
                            console.log("salmonella:", amostra.salmonella);
                            console.log("bcov:", amostra.bcov);
                            console.log("brov:", amostra.brov);
                            console.log("crypto:", amostra.crypto);
                            console.log("coronavirusBovino:", amostra.coronavirusBovino);
                            console.log("rotavirusBovino:", amostra.rotavirusBovino);
                            console.log("cryptosporidium:", amostra.cryptosporidium);
                            console.log("=== FIM AMOSTRA DIARREIA ===");
                            
                            return new TableRow({
                                children: [
                                    new TableCell({
                                        children: [new Paragraph({
                                            children: [new TextRun({
                                                text: amostra.identificacao || "-",
                                                size: 20,
                                                font: "Arial"
                                            })],
                                            alignment: AlignmentType.CENTER
                                        })],
                                        margins: { top: 100, bottom: 100, left: 100, right: 100 },
                                        verticalAlign: VerticalAlign.CENTER,
                                        borders: {
                                            top: { style: "single", size: 1 },
                                            bottom: { style: "single", size: 1 },
                                            left: { style: "single", size: 1 },
                                            right: { style: "single", size: 1 }
                                        }
                                    }),
                                    new TableCell({
                                        children: [new Paragraph({
                                            children: [new TextRun({
                                                text: amostra.ecoli || amostra["e-coli"] || amostra.eColi || amostra["E. coli"] || "",
                                                size: 20,
                                                font: "Arial"
                                            })],
                                            alignment: AlignmentType.CENTER
                                        })],
                                        margins: { top: 100, bottom: 100, left: 100, right: 100 },
                                        verticalAlign: VerticalAlign.CENTER,
                                        borders: {
                                            top: { style: "single", size: 1 },
                                            bottom: { style: "single", size: 1 },
                                            left: { style: "single", size: 1 },
                                            right: { style: "single", size: 1 }
                                        }
                                    }),
                                    new TableCell({
                                        children: [new Paragraph({
                                            children: [new TextRun({
                                                text: amostra.salmonella || amostra.Salmonella || "",
                                                size: 20,
                                                font: "Arial"
                                            })],
                                            alignment: AlignmentType.CENTER
                                        })],
                                        margins: { top: 100, bottom: 100, left: 100, right: 100 },
                                        verticalAlign: VerticalAlign.CENTER,
                                        borders: {
                                            top: { style: "single", size: 1 },
                                            bottom: { style: "single", size: 1 },
                                            left: { style: "single", size: 1 },
                                            right: { style: "single", size: 1 }
                                        }
                                    }),
                                    new TableCell({
                                        children: [new Paragraph({
                                            children: [new TextRun({
                                                text: amostra.coronavirusBovino || amostra.bcov || amostra.BCoV || amostra.coronavirus || amostra["coronavirus-bovino"] || "",
                                                size: 20,
                                                font: "Arial"
                                            })],
                                            alignment: AlignmentType.CENTER
                                        })],
                                        margins: { top: 100, bottom: 100, left: 100, right: 100 },
                                        verticalAlign: VerticalAlign.CENTER,
                                        borders: {
                                            top: { style: "single", size: 1 },
                                            bottom: { style: "single", size: 1 },
                                            left: { style: "single", size: 1 },
                                            right: { style: "single", size: 1 }
                                        }
                                    }),
                                    new TableCell({
                                        children: [new Paragraph({
                                            children: [new TextRun({
                                                text: amostra.rotavirusBovino || amostra.brov || amostra.BRoV || amostra.rotavirus || amostra["rotavirus-bovino"] || "",
                                                size: 20,
                                                font: "Arial"
                                            })],
                                            alignment: AlignmentType.CENTER
                                        })],
                                        margins: { top: 100, bottom: 100, left: 100, right: 100 },
                                        verticalAlign: VerticalAlign.CENTER,
                                        borders: {
                                            top: { style: "single", size: 1 },
                                            bottom: { style: "single", size: 1 },
                                            left: { style: "single", size: 1 },
                                            right: { style: "single", size: 1 }
                                        }
                                    }),
                                    new TableCell({
                                        children: [new Paragraph({
                                            children: [new TextRun({
                                                text: amostra.cryptosporidium || amostra.crypto || amostra.Crypto || amostra["cryptosporidium-parvum"] || "",
                                                size: 20,
                                                font: "Arial"
                                            })],
                                            alignment: AlignmentType.CENTER
                                        })],
                                        margins: { top: 100, bottom: 100, left: 100, right: 100 },
                                        verticalAlign: VerticalAlign.CENTER,
                                        borders: {
                                            top: { style: "single", size: 1 },
                                            bottom: { style: "single", size: 1 },
                                            left: { style: "single", size: 1 },
                                            right: { style: "single", size: 1 }
                                        }
                                    })
                                ]
                            });
                        })
                    ],
                    width: { size: 100, type: WidthType.PERCENTAGE }
                });
            } else if (tarefa.subTipo === "Multiplex RT-PCR e PCR Doença Respiratória Bovina" || (tarefa.subTipo && tarefa.subTipo.includes("Doença Respiratória"))) {
                // Tabela específica para Multiplex RT-PCR e PCR Doença Respiratória Bovina
                console.log("=== DETECTOU MULTIPLEX DOENÇA RESPIRATÓRIA BOVINA ===");
                console.log("Dados da tarefa.resultados:", JSON.stringify(tarefa.resultados, null, 2));
                console.log("Amostras:", tarefa.resultados?.amostras);
                console.log("=== FIM DEBUG RESPIRATÓRIA ===");
                
                tabelaResultados = new Table({
                    columnWidths: [1200, 800, 800, 800, 800, 800],
                    rows: [
                        // Cabeçalho da tabela de resultados
                        new TableRow({
                            children: [
                                new TableCell({
                                    children: [new Paragraph({
                                        children: [new TextRun({
                                            text: "Identificação da amostra",
                                            bold: true,
                                            size: 20,
                                            font: "Arial",
                                            color: "FFFFFF"
                                        })],
                                        alignment: AlignmentType.CENTER
                                    })],
                                    margins: { top: 100, bottom: 100, left: 100, right: 100 },
                                    verticalAlign: VerticalAlign.CENTER,
                                    shading: { fill: "#1b5e20", type: "clear" },
                                    borders: {
                                        top: { style: "single", size: 1 },
                                        bottom: { style: "single", size: 1 },
                                        left: { style: "single", size: 1 },
                                        right: { style: "single", size: 1 }
                                    }
                                }),
                                new TableCell({
                                    children: [new Paragraph({
                                        children: [new TextRun({
                                            text: "BCoV",
                                            bold: true,
                                            size: 20,
                                            font: "Arial",
                                            color: "FFFFFF"
                                        })],
                                        alignment: AlignmentType.CENTER
                                    })],
                                    margins: { top: 100, bottom: 100, left: 100, right: 100 },
                                    verticalAlign: VerticalAlign.CENTER,
                                    shading: { fill: "#1b5e20", type: "clear" },
                                    borders: {
                                        top: { style: "single", size: 1 },
                                        bottom: { style: "single", size: 1 },
                                        left: { style: "single", size: 1 },
                                        right: { style: "single", size: 1 }
                                    }
                                }),
                                new TableCell({
                                    children: [new Paragraph({
                                        children: [new TextRun({
                                            text: "BRSV",
                                            bold: true,
                                            size: 20,
                                            font: "Arial",
                                            color: "FFFFFF"
                                        })],
                                        alignment: AlignmentType.CENTER
                                    })],
                                    margins: { top: 100, bottom: 100, left: 100, right: 100 },
                                    verticalAlign: VerticalAlign.CENTER,
                                    shading: { fill: "#1b5e20", type: "clear" },
                                    borders: {
                                        top: { style: "single", size: 1 },
                                        bottom: { style: "single", size: 1 },
                                        left: { style: "single", size: 1 },
                                        right: { style: "single", size: 1 }
                                    }
                                }),
                                new TableCell({
                                    children: [new Paragraph({
                                        children: [new TextRun({
                                            text: "BoHV-1/5",
                                            bold: true,
                                            size: 20,
                                            font: "Arial",
                                            color: "FFFFFF"
                                        })],
                                        alignment: AlignmentType.CENTER
                                    })],
                                    margins: { top: 100, bottom: 100, left: 100, right: 100 },
                                    verticalAlign: VerticalAlign.CENTER,
                                    shading: { fill: "#1b5e20", type: "clear" },
                                    borders: {
                                        top: { style: "single", size: 1 },
                                        bottom: { style: "single", size: 1 },
                                        left: { style: "single", size: 1 },
                                        right: { style: "single", size: 1 }
                                    }
                                }),
                                new TableCell({
                                    children: [new Paragraph({
                                        children: [new TextRun({
                                            text: "BVDV",
                                            bold: true,
                                            size: 20,
                                            font: "Arial",
                                            color: "FFFFFF"
                                        })],
                                        alignment: AlignmentType.CENTER
                                    })],
                                    margins: { top: 100, bottom: 100, left: 100, right: 100 },
                                    verticalAlign: VerticalAlign.CENTER,
                                    shading: { fill: "#1b5e20", type: "clear" },
                                    borders: {
                                        top: { style: "single", size: 1 },
                                        bottom: { style: "single", size: 1 },
                                        left: { style: "single", size: 1 },
                                        right: { style: "single", size: 1 }
                                    }
                                }),
                                new TableCell({
                                    children: [new Paragraph({
                                        children: [new TextRun({
                                            text: "BPIV-3",
                                            bold: true,
                                            size: 20,
                                            font: "Arial",
                                            color: "FFFFFF"
                                        })],
                                        alignment: AlignmentType.CENTER
                                    })],
                                    margins: { top: 100, bottom: 100, left: 100, right: 100 },
                                    verticalAlign: VerticalAlign.CENTER,
                                    shading: { fill: "#1b5e20", type: "clear" },
                                    borders: {
                                        top: { style: "single", size: 1 },
                                        bottom: { style: "single", size: 1 },
                                        left: { style: "single", size: 1 },
                                        right: { style: "single", size: 1 }
                                    }
                                })
                            ]
                        }),
                        // Linhas de dados
                        ...(tarefa.resultados?.amostras || []).map((amostra, index) => {
                            console.log(`=== AMOSTRA RESPIRATÓRIA ${index + 1} ===`);
                            console.log("Dados completos da amostra:", JSON.stringify(amostra, null, 2));
                            console.log("TODOS OS CAMPOS DA AMOSTRA:");
                            Object.keys(amostra).forEach(key => {
                                console.log(`  ${key}: ${amostra[key]}`);
                            });
                            console.log("coronavirusBovino:", amostra.coronavirusBovino);
                            console.log("brsv:", amostra.brsv);
                            console.log("bohv:", amostra.bohv);
                            console.log("boHV1:", amostra.boHV1);
                            console.log("bvdv:", amostra.bvdv);
                            console.log("bpiv3:", amostra.bpiv3);
                            console.log("=== FIM AMOSTRA RESPIRATÓRIA ===");
                            
                            return new TableRow({
                                children: [
                                    new TableCell({
                                        children: [new Paragraph({
                                            children: [new TextRun({
                                                text: amostra.identificacao || "-",
                                                size: 20,
                                                font: "Arial"
                                            })],
                                            alignment: AlignmentType.CENTER
                                        })],
                                        margins: { top: 100, bottom: 100, left: 100, right: 100 },
                                        verticalAlign: VerticalAlign.CENTER,
                                        borders: {
                                            top: { style: "single", size: 1 },
                                            bottom: { style: "single", size: 1 },
                                            left: { style: "single", size: 1 },
                                            right: { style: "single", size: 1 }
                                        }
                                    }),
                                    new TableCell({
                                        children: [new Paragraph({
                                            children: [new TextRun({
                                                text: amostra.coronavirusBovino || amostra.bcov || amostra.BCoV || amostra.coronavirus || amostra["coronavirus-bovino"] || "",
                                                size: 20,
                                                font: "Arial"
                                            })],
                                            alignment: AlignmentType.CENTER
                                        })],
                                        margins: { top: 100, bottom: 100, left: 100, right: 100 },
                                        verticalAlign: VerticalAlign.CENTER,
                                        borders: {
                                            top: { style: "single", size: 1 },
                                            bottom: { style: "single", size: 1 },
                                            left: { style: "single", size: 1 },
                                            right: { style: "single", size: 1 }
                                        }
                                    }),
                                    new TableCell({
                                        children: [new Paragraph({
                                            children: [new TextRun({
                                                text: amostra.brsv || amostra.BRSV || amostra.virusRespiratorioSincicial || amostra["virus-respiratorio-sincicial"] || "",
                                                size: 20,
                                                font: "Arial"
                                            })],
                                            alignment: AlignmentType.CENTER
                                        })],
                                        margins: { top: 100, bottom: 100, left: 100, right: 100 },
                                        verticalAlign: VerticalAlign.CENTER,
                                        borders: {
                                            top: { style: "single", size: 1 },
                                            bottom: { style: "single", size: 1 },
                                            left: { style: "single", size: 1 },
                                            right: { style: "single", size: 1 }
                                        }
                                    }),
                                    new TableCell({
                                        children: [new Paragraph({
                                            children: [new TextRun({
                                                text: amostra.bohv || amostra.boHV1 || amostra.bohv1 || amostra.BoHV1 || amostra.herpesvirus1 || amostra["herpesvirus-bovino-1"] || "",
                                                size: 20,
                                                font: "Arial"
                                            })],
                                            alignment: AlignmentType.CENTER
                                        })],
                                        margins: { top: 100, bottom: 100, left: 100, right: 100 },
                                        verticalAlign: VerticalAlign.CENTER,
                                        borders: {
                                            top: { style: "single", size: 1 },
                                            bottom: { style: "single", size: 1 },
                                            left: { style: "single", size: 1 },
                                            right: { style: "single", size: 1 }
                                        }
                                    }),
                                    new TableCell({
                                        children: [new Paragraph({
                                            children: [new TextRun({
                                                text: amostra.bvdv || amostra.BVDV || amostra.diarreiaViralBovina || amostra["diarreia-viral-bovina"] || "",
                                                size: 20,
                                                font: "Arial"
                                            })],
                                            alignment: AlignmentType.CENTER
                                        })],
                                        margins: { top: 100, bottom: 100, left: 100, right: 100 },
                                        verticalAlign: VerticalAlign.CENTER,
                                        borders: {
                                            top: { style: "single", size: 1 },
                                            bottom: { style: "single", size: 1 },
                                            left: { style: "single", size: 1 },
                                            right: { style: "single", size: 1 }
                                        }
                                    }),
                                    new TableCell({
                                        children: [new Paragraph({
                                            children: [new TextRun({
                                                text: amostra.bpiv3 || amostra.BPIV3 || amostra.parainfluenza3 || amostra["parainfluenza-3"] || "",
                                                size: 20,
                                                font: "Arial"
                                            })],
                                            alignment: AlignmentType.CENTER
                                        })],
                                        margins: { top: 100, bottom: 100, left: 100, right: 100 },
                                        verticalAlign: VerticalAlign.CENTER,
                                        borders: {
                                            top: { style: "single", size: 1 },
                                            bottom: { style: "single", size: 1 },
                                            left: { style: "single", size: 1 },
                                            right: { style: "single", size: 1 }
                                        }
                                    })
                                ]
                            });
                        })
                    ],
                    width: { size: 100, type: WidthType.PERCENTAGE }
                });
            } else if (tarefa.subTipo === "Duplex RT-PCR Rota e Corona Bovino" || tarefa.subTipo === "Duplex Rota e Corona Bovino" || (tarefa.subTipo && (tarefa.subTipo.includes("Duplex RT-PCR Rota e Corona Bovino") || tarefa.subTipo.includes("Duplex Rota e Corona Bovino")))) {
                // Tabela específica para Duplex RT-PCR Rota e Corona Bovino / Duplex Rota e Corona Bovino
                console.log("=== DETECTOU DUPLEX RT-PCR ROTA E CORONA BOVINO ===");
                console.log("Dados da tarefa.resultados:", JSON.stringify(tarefa.resultados, null, 2));
                console.log("Amostras:", tarefa.resultados?.amostras);
                console.log("=== FIM DEBUG DUPLEX RT-PCR ===");
                
                tabelaResultados = new Table({
                    columnWidths: [2000, 2000, 2000],
                    rows: [
                        // Cabeçalho da tabela
                        new TableRow({
                            children: [
                                new TableCell({
                                    children: [new Paragraph({
                                        children: [new TextRun({
                                            text: "Identificação da amostra",
                                            bold: true,
                                            size: 20,
                                            font: "Arial",
                                            color: "FFFFFF"
                                        })],
                                        alignment: AlignmentType.CENTER
                                    })],
                                    margins: { top: 100, bottom: 100, left: 100, right: 100 },
                                    verticalAlign: VerticalAlign.CENTER,
                                    shading: { fill: "#1b5e20", type: "clear" },
                                    borders: {
                                        top: { style: "single", size: 1 },
                                        bottom: { style: "single", size: 1 },
                                        left: { style: "single", size: 1 },
                                        right: { style: "single", size: 1 }
                                    }
                                }),
                                new TableCell({
                                    children: [new Paragraph({
                                        children: [new TextRun({
                                            text: "BCoV",
                                            bold: true,
                                            size: 20,
                                            font: "Arial",
                                            color: "FFFFFF"
                                        })],
                                        alignment: AlignmentType.CENTER
                                    })],
                                    margins: { top: 100, bottom: 100, left: 100, right: 100 },
                                    verticalAlign: VerticalAlign.CENTER,
                                    shading: { fill: "#1b5e20", type: "clear" },
                                    borders: {
                                        top: { style: "single", size: 1 },
                                        bottom: { style: "single", size: 1 },
                                        left: { style: "single", size: 1 },
                                        right: { style: "single", size: 1 }
                                    }
                                }),
                                new TableCell({
                                    children: [new Paragraph({
                                        children: [new TextRun({
                                            text: "BRoV",
                                            bold: true,
                                            size: 20,
                                            font: "Arial",
                                            color: "FFFFFF"
                                        })],
                                        alignment: AlignmentType.CENTER
                                    })],
                                    margins: { top: 100, bottom: 100, left: 100, right: 100 },
                                    verticalAlign: VerticalAlign.CENTER,
                                    shading: { fill: "#1b5e20", type: "clear" },
                                    borders: {
                                        top: { style: "single", size: 1 },
                                        bottom: { style: "single", size: 1 },
                                        left: { style: "single", size: 1 },
                                        right: { style: "single", size: 1 }
                                    }
                                })
                            ]
                        }),
                        // Linhas de dados
                        ...(tarefa.resultados?.amostras || []).map((amostra, index) => {
                            console.log(`=== AMOSTRA DUPLEX RT-PCR ${index + 1} ===`);
                            console.log("Dados completos da amostra:", JSON.stringify(amostra, null, 2));
                            console.log("TODOS OS CAMPOS DA AMOSTRA:");
                            Object.keys(amostra).forEach(key => {
                                console.log(`  ${key}: ${amostra[key]}`);
                            });
                            console.log("bcov:", amostra.bcov);
                            console.log("BCoV:", amostra.BCoV);
                            console.log("coronavirusBovino:", amostra.coronavirusBovino);
                            console.log("brov:", amostra.brov);
                            console.log("BRoV:", amostra.BRoV);
                            console.log("rotavirusBovino:", amostra.rotavirusBovino);
                            console.log("=== FIM AMOSTRA DUPLEX RT-PCR ===");
                            
                            return new TableRow({
                                children: [
                                    new TableCell({
                                        children: [new Paragraph({
                                            children: [new TextRun({
                                                text: amostra.identificacao || "-",
                                                size: 20,
                                                font: "Arial"
                                            })],
                                            alignment: AlignmentType.CENTER
                                        })],
                                        margins: { top: 100, bottom: 100, left: 100, right: 100 },
                                        verticalAlign: VerticalAlign.CENTER,
                                        borders: {
                                            top: { style: "single", size: 1 },
                                            bottom: { style: "single", size: 1 },
                                            left: { style: "single", size: 1 },
                                            right: { style: "single", size: 1 }
                                        }
                                    }),
                                    new TableCell({
                                        children: [new Paragraph({
                                            children: [new TextRun({
                                                text: amostra.bcov || amostra.BCoV || amostra.coronavirusBovino || amostra.coronavirus || amostra["coronavirus-bovino"] || "",
                                                size: 20,
                                                font: "Arial"
                                            })],
                                            alignment: AlignmentType.CENTER
                                        })],
                                        margins: { top: 100, bottom: 100, left: 100, right: 100 },
                                        verticalAlign: VerticalAlign.CENTER,
                                        borders: {
                                            top: { style: "single", size: 1 },
                                            bottom: { style: "single", size: 1 },
                                            left: { style: "single", size: 1 },
                                            right: { style: "single", size: 1 }
                                        }
                                    }),
                                    new TableCell({
                                        children: [new Paragraph({
                                            children: [new TextRun({
                                                text: amostra.brov || amostra.BRoV || amostra.rotavirusBovino || amostra.rotavirus || amostra["rotavirus-bovino"] || "",
                                                size: 20,
                                                font: "Arial"
                                            })],
                                            alignment: AlignmentType.CENTER
                                        })],
                                        margins: { top: 100, bottom: 100, left: 100, right: 100 },
                                        verticalAlign: VerticalAlign.CENTER,
                                        borders: {
                                            top: { style: "single", size: 1 },
                                            bottom: { style: "single", size: 1 },
                                            left: { style: "single", size: 1 },
                                            right: { style: "single", size: 1 }
                                        }
                                    })
                                ]
                            });
                        })
                    ],
                    width: { size: 100, type: WidthType.PERCENTAGE }
                });
            } else if (tarefa.subTipo === "Duplex RT-PCR Rota e Corona Equino" || tarefa.subTipo === "Duplex Rota e Corona Equino" || (tarefa.subTipo && (tarefa.subTipo.includes("Duplex RT-PCR Rota e Corona Equino") || tarefa.subTipo.includes("Duplex Rota e Corona Equino")))) {
                // Tabela específica para Duplex RT-PCR Rota e Corona Equino / Duplex Rota e Corona Equino
                console.log("=== DETECTOU DUPLEX RT-PCR ROTA E CORONA EQUINO ===");
                console.log("Dados da tarefa.resultados:", JSON.stringify(tarefa.resultados, null, 2));
                console.log("Amostras:", tarefa.resultados?.amostras);
                console.log("=== FIM DEBUG DUPLEX RT-PCR EQUINO ===");
                
                tabelaResultados = new Table({
                    columnWidths: [2000, 2000, 2000],
                    rows: [
                        // Cabeçalho da tabela
                        new TableRow({
                            children: [
                                new TableCell({
                                    children: [new Paragraph({
                                        children: [new TextRun({
                                            text: "Identificação da amostra",
                                            bold: true,
                                            size: 20,
                                            font: "Arial",
                                            color: "FFFFFF"
                                        })],
                                        alignment: AlignmentType.CENTER
                                    })],
                                    margins: { top: 100, bottom: 100, left: 100, right: 100 },
                                    verticalAlign: VerticalAlign.CENTER,
                                    shading: { fill: "#1b5e20", type: "clear" },
                                    borders: {
                                        top: { style: "single", size: 1 },
                                        bottom: { style: "single", size: 1 },
                                        left: { style: "single", size: 1 },
                                        right: { style: "single", size: 1 }
                                    }
                                }),
                                new TableCell({
                                    children: [new Paragraph({
                                        children: [new TextRun({
                                            text: "CoV",
                                            bold: true,
                                            size: 20,
                                            font: "Arial",
                                            color: "FFFFFF"
                                        })],
                                        alignment: AlignmentType.CENTER
                                    })],
                                    margins: { top: 100, bottom: 100, left: 100, right: 100 },
                                    verticalAlign: VerticalAlign.CENTER,
                                    shading: { fill: "#1b5e20", type: "clear" },
                                    borders: {
                                        top: { style: "single", size: 1 },
                                        bottom: { style: "single", size: 1 },
                                        left: { style: "single", size: 1 },
                                        right: { style: "single", size: 1 }
                                    }
                                }),
                                new TableCell({
                                    children: [new Paragraph({
                                        children: [new TextRun({
                                            text: "RoV",
                                            bold: true,
                                            size: 20,
                                            font: "Arial",
                                            color: "FFFFFF"
                                        })],
                                        alignment: AlignmentType.CENTER
                                    })],
                                    margins: { top: 100, bottom: 100, left: 100, right: 100 },
                                    verticalAlign: VerticalAlign.CENTER,
                                    shading: { fill: "#1b5e20", type: "clear" },
                                    borders: {
                                        top: { style: "single", size: 1 },
                                        bottom: { style: "single", size: 1 },
                                        left: { style: "single", size: 1 },
                                        right: { style: "single", size: 1 }
                                    }
                                })
                            ]
                        }),
                        // Linhas de dados
                        ...(tarefa.resultados?.amostras || []).map((amostra, index) => {
                            console.log(`=== AMOSTRA DUPLEX RT-PCR EQUINO ${index + 1} ===`);
                            console.log("Dados completos da amostra:", JSON.stringify(amostra, null, 2));
                            console.log("TODOS OS CAMPOS DA AMOSTRA:");
                            Object.keys(amostra).forEach(key => {
                                console.log(`  ${key}: ${amostra[key]}`);
                            });
                            console.log("cov:", amostra.cov);
                            console.log("CoV:", amostra.CoV);
                            console.log("coronavirusEquino:", amostra.coronavirusEquino);
                            console.log("rov:", amostra.rov);
                            console.log("RoV:", amostra.RoV);
                            console.log("rotavirusEquino:", amostra.rotavirusEquino);
                            console.log("=== FIM AMOSTRA DUPLEX RT-PCR EQUINO ===");
                            
                            return new TableRow({
                                children: [
                                    new TableCell({
                                        children: [new Paragraph({
                                            children: [new TextRun({
                                                text: amostra.identificacao || "-",
                                                size: 20,
                                                font: "Arial"
                                            })],
                                            alignment: AlignmentType.CENTER
                                        })],
                                        margins: { top: 100, bottom: 100, left: 100, right: 100 },
                                        verticalAlign: VerticalAlign.CENTER,
                                        borders: {
                                            top: { style: "single", size: 1 },
                                            bottom: { style: "single", size: 1 },
                                            left: { style: "single", size: 1 },
                                            right: { style: "single", size: 1 }
                                        }
                                    }),
                                    new TableCell({
                                        children: [new Paragraph({
                                            children: [new TextRun({
                                                text: amostra.cov || amostra.CoV || amostra.coronavirusEquino || amostra.coronavirus || amostra["coronavirus-equino"] || "",
                                                size: 20,
                                                font: "Arial"
                                            })],
                                            alignment: AlignmentType.CENTER
                                        })],
                                        margins: { top: 100, bottom: 100, left: 100, right: 100 },
                                        verticalAlign: VerticalAlign.CENTER,
                                        borders: {
                                            top: { style: "single", size: 1 },
                                            bottom: { style: "single", size: 1 },
                                            left: { style: "single", size: 1 },
                                            right: { style: "single", size: 1 }
                                        }
                                    }),
                                    new TableCell({
                                        children: [new Paragraph({
                                            children: [new TextRun({
                                                text: amostra.rov || amostra.RoV || amostra.rotavirusEquino || amostra.rotavirus || amostra["rotavirus-equino"] || "",
                                                size: 20,
                                                font: "Arial"
                                            })],
                                            alignment: AlignmentType.CENTER
                                        })],
                                        margins: { top: 100, bottom: 100, left: 100, right: 100 },
                                        verticalAlign: VerticalAlign.CENTER,
                                        borders: {
                                            top: { style: "single", size: 1 },
                                            bottom: { style: "single", size: 1 },
                                            left: { style: "single", size: 1 },
                                            right: { style: "single", size: 1 }
                                        }
                                    })
                                ]
                            });
                        })
                    ],
                    width: { size: 100, type: WidthType.PERCENTAGE }
                });
            } else {
                // Para outros subtipos moleculares, usar formato padrão
                tabelaResultados = new Table({
                    columnWidths: [3000, 3000],
                    rows: [
                        new TableRow({
                            children: [
                                new TableCell({
                                    children: [new Paragraph({
                                        children: [new TextRun({
                                            text: "Identificação da amostra",
                                            bold: true,
                                            size: 24,
                                            font: "Arial",
                                            color: "FFFFFF"
                                        })],
                                        alignment: AlignmentType.CENTER
                                    })],
                                    margins: { top: 100, bottom: 100, left: 100, right: 100 },
                                    verticalAlign: VerticalAlign.CENTER,
                                    shading: { fill: "#1b5e20", type: "clear" }
                                }),
                                new TableCell({
                                    children: [new Paragraph({
                                        children: [new TextRun({
                                            text: "Resultado",
                                            bold: true,
                                            size: 24,
                                            font: "Arial",
                                            color: "FFFFFF"
                                        })],
                                        alignment: AlignmentType.CENTER
                                    })],
                                    margins: { top: 100, bottom: 100, left: 100, right: 100 },
                                    verticalAlign: VerticalAlign.CENTER,
                                    shading: { fill: "#1b5e20", type: "clear" }
                                })
                            ]
                        }),
                        ...(tarefa.resultados?.amostras || []).map(amostra =>
                            new TableRow({
                                children: [
                                    new TableCell({
                                        children: [new Paragraph({
                                            children: [new TextRun({
                                                text: amostra.identificacao || "-",
                                                size: 24,
                                                font: "Arial"
                                            })]
                                        })],
                                        margins: { top: 100, bottom: 100, left: 100, right: 100 }
                                    }),
                                    new TableCell({
                                        children: [new Paragraph({
                                            children: [new TextRun({
                                                text: amostra.resultado || "-",
                                                size: 24,
                                                font: "Arial"
                                            })]
                                        })],
                                        margins: { top: 100, bottom: 100, left: 100, right: 100 }
                                    })
                                ]
                            })
                        )
                    ],
                    width: { size: 100, type: WidthType.PERCENTAGE }
                });
            }
        } else {
            // Sua tabela SN existente
            tabelaResultados = new Table({
                columnWidths: [1500, 1500, 4000],
                rows: [
                    // Cabeçalho da tabela
                    new TableRow({
                        children: [
                            new TableCell({
                                children: [new Paragraph({ 
                                    children: [new TextRun({ 
                                        text: "Resultado", 
                                        bold: true,
                                        size: 24,
                                        font: "Arial",
                                        color: "FFFFFF",
                                    })],
                                    alignment: AlignmentType.CENTER // Centraliza horizontalmente
                                })],
                                margins: {
                                    top: 100,
                                    bottom: 100,
                                    left: 100,
                                    right: 100
                                },
                                verticalAlign: VerticalAlign.CENTER, // Centraliza verticalmente
                                shading: { 
                                    fill: "#1b5e20", 
                                    type: "clear"
                                }
                            }),
                            new TableCell({
                                children: [new Paragraph({ 
                                    children: [new TextRun({ 
                                        text: "Identificação das amostras", 
                                        bold: true,
                                        size: 24,
                                        font: "Arial",
                                        color: "FFFFFF"
                                    })],
                                    alignment: AlignmentType.CENTER // Centraliza horizontalmente
                                })],
                                margins: {
                                    top: 100,
                                    bottom: 100,
                                    left: 100,
                                    right: 100
                                },
                                verticalAlign: VerticalAlign.CENTER, // Centraliza verticalmente
                                shading: { 
                                    fill: "#1b5e20", 
                                    type: "clear"
                                }
                            })
                        ]
                    }),
                    // Linha de negativas
                    new TableRow({
                        children: [
                            new TableCell({
                                children: [new Paragraph({ 
                                    children: [new TextRun({
                                        text: "Negativas (< 1:4)",
                                        size: 24,
                                        font: "Arial",
                                        bold: true
                                    })],
                                    alignment: AlignmentType.CENTER
                                })],
                                margins: {
                                    top: 100,
                                    bottom: 100,
                                    left: 100,
                                    right: 100
                                }
                            }),
                            new TableCell({
                                children: [new Paragraph({ 
                                    children: [new TextRun({
                                        text: tarefa.resultados?.negativas || "",
                                        size: 24,
                                        font: "Arial",
                                    })],
                                })],
                                margins: {
                                    top: 100,
                                    bottom: 100,
                                    left: 100,
                                    right: 100
                                }
                            })
                        ]
                    }),
                    // Linha de positivas (cabeçalho)
                    new TableRow({
                        children: [
                            new TableCell({
                                children: [new Paragraph({ 
                                    children: [new TextRun({
                                        text: "Positivas",
                                        size: 24,
                                        font: "Arial",
                                        bold: true
                                    })],
                                    alignment: AlignmentType.CENTER
                                })],
                                margins: {
                                    top: 100,
                                    bottom: 100,
                                    left: 100,
                                    right: 100
                                },
                                columnSpan: 2 // Mesclar as duas colunas
                            })
                        ]
                    }),
                  
                    // Linhas de títulos (4 a ≥512)
                    new TableRow({
                        children: [
                            new TableCell({
                                children: [new Paragraph({ 
                                    children: [new TextRun({
                                        text: "Título 4",
                                        size: 24,
                                        font: "Arial"
                                    })]
                                })],
                                margins: {
                                    top: 100,
                                    bottom: 100,
                                    left: 100,
                                    right: 100
                                }
                            }),
                            new TableCell({
                                children: [new Paragraph({ 
                                    children: [new TextRun({
                                        text: tarefa.resultados?.titulo4 || "",
                                        size: 24,
                                        font: "Arial"
                                    })]
                                })],
                                margins: {
                                    top: 100,
                                    bottom: 100,
                                    left: 100,
                                    right: 100
                                }
                            })
                        ]
                    }),
                    new TableRow({
                        children: [
                            new TableCell({
                                children: [new Paragraph({ 
                                    children: [new TextRun({
                                        text: "Título 8",
                                        size: 24,
                                        font: "Arial"
                                    })]
                                })],
                                margins: {
                                    top: 100,
                                    bottom: 100,
                                    left: 100,
                                    right: 100
                                }
                            }),
                            new TableCell({
                                children: [new Paragraph({ 
                                    children: [new TextRun({
                                        text: tarefa.resultados?.titulo8 || "",
                                        size: 24,
                                        font: "Arial"
                                    })]
                                })],
                                margins: {
                                    top: 100,
                                    bottom: 100,
                                    left: 100,
                                    right: 100
                                }
                            })
                        ]
                    }),
                    new TableRow({
                        children: [
                            new TableCell({
                                children: [new Paragraph({ 
                                    children: [new TextRun({
                                        text: "Título 16",
                                        size: 24,
                                        font: "Arial"
                                    })]
                                })],
                                margins: {
                                    top: 100,
                                    bottom: 100,
                                    left: 100,
                                    right: 100
                                }
                            }),
                            new TableCell({
                                children: [new Paragraph({ 
                                    children: [new TextRun({
                                        text: tarefa.resultados?.titulo16 || "",
                                        size: 24,
                                        font: "Arial"
                                    })]
                                })],
                                margins: {
                                    top: 100,
                                    bottom: 100,
                                    left: 100,
                                    right: 100
                                }
                            })
                        ]
                    }),
                    new TableRow({
                        children: [
                            new TableCell({
                                children: [new Paragraph({ 
                                    children: [new TextRun({
                                        text: "Título 32",
                                        size: 24,
                                        font: "Arial"
                                    })]
                                })],
                                margins: {
                                    top: 100,
                                    bottom: 100,
                                    left: 100,
                                    right: 100
                                }
                            }),
                            new TableCell({
                                children: [new Paragraph({ 
                                    children: [new TextRun({
                                        text: tarefa.resultados?.titulo32 || "",
                                        size: 24,
                                        font: "Arial"
                                    })]
                                })],
                                margins: {
                                    top: 100,
                                    bottom: 100,
                                    left: 100,
                                    right: 100
                                }
                            })
                        ]
                    }),
                    new TableRow({
                        children: [
                            new TableCell({
                                children: [new Paragraph({ 
                                    children: [new TextRun({
                                        text: "Título 64",
                                        size: 24,
                                        font: "Arial"
                                    })]
                                })],
                                margins: {
                                    top: 100,
                                    bottom: 100,
                                    left: 100,
                                    right: 100
                                }
                            }),
                            new TableCell({
                                children: [new Paragraph({ 
                                    children: [new TextRun({
                                        text: tarefa.resultados?.titulo64 || "",
                                        size: 24,
                                        font: "Arial"
                                    })]
                                })],
                                margins: {
                                    top: 100,
                                    bottom: 100,
                                    left: 100,
                                    right: 100
                                }
                            })
                        ]
                    }),
                    new TableRow({
                        children: [
                            new TableCell({
                                children: [new Paragraph({ 
                                    children: [new TextRun({
                                        text: "Título 128",
                                        size: 24,
                                        font: "Arial"
                                    })]
                                })],
                                margins: {
                                    top: 100,
                                    bottom: 100,
                                    left: 100,
                                    right: 100
                                }
                            }),
                            new TableCell({
                                children: [new Paragraph({ 
                                    children: [new TextRun({
                                        text: tarefa.resultados?.titulo128 || "",
                                        size: 24,
                                        font: "Arial"
                                    })]
                                })],
                                margins: {
                                    top: 100,
                                    bottom: 100,
                                    left: 100,
                                    right: 100
                                }
                            })
                        ]
                    }),
                    new TableRow({
                        children: [
                            new TableCell({
                                children: [new Paragraph({ 
                                    children: [new TextRun({
                                        text: "Título 256",
                                        size: 24,
                                        font: "Arial"
                                    })]
                                })],
                                margins: {
                                    top: 100,
                                    bottom: 100,
                                    left: 100,
                                    right: 100
                                }
                            }),
                            new TableCell({
                                children: [new Paragraph({ 
                                    children: [new TextRun({
                                        text: tarefa.resultados?.titulo256 || "",
                                        size: 24,
                                        font: "Arial"
                                    })]
                                })],
                                margins: {
                                    top: 100,
                                    bottom: 100,
                                    left: 100,
                                    right: 100
                                }
                            })
                        ]
                    }),
                    // Linha de ≥512
                    new TableRow({
                        children: [
                            new TableCell({
                                children: [new Paragraph({ 
                                    children: [new TextRun({
                                        text: "≥512",
                                        size: 24,
                                        font: "Arial"
                                    })]
                                })],
                                margins: {
                                    top: 100,
                                    bottom: 100,
                                    left: 100,
                                    right: 100
                                }
                            }),
                            new TableCell({
                                children: [new Paragraph({ 
                                    children: [new TextRun({
                                        text: tarefa.resultados?.titulo512 || "",
                                        size: 24,
                                        font: "Arial"
                                    })]
                                })],
                                margins: {
                                    top: 100,
                                    bottom: 100,
                                    left: 100,
                                    right: 100
                                }
                            })
                        ]
                    }),
                    // Linha de impróprias
                    new TableRow({
                        children: [
                            new TableCell({
                                children: [new Paragraph({ 
                                    children: [new TextRun({
                                        text: "Impróprias p/ testar",
                                        size: 24,
                                        font: "Arial"
                                    })]
                                })],
                                margins: {
                                    top: 100,
                                    bottom: 100,
                                    left: 100,
                                    right: 100
                                }
                            }),
                            new TableCell({
                                children: [new Paragraph({ 
                                    children: [new TextRun({
                                        text: tarefa.resultados?.improprias || "",
                                        size: 24,
                                        font: "Arial"
                                    })]
                                })],
                                margins: {
                                    top: 100,
                                    bottom: 100,
                                    left: 100,
                                    right: 100
                                }
                            })
                        ]
                    }),
                    // Linha de tóxicas
                    new TableRow({
                        children: [
                            new TableCell({
                                children: [new Paragraph({ 
                                    children: [new TextRun({
                                        text: "Tóxicas",
                                        size: 24,
                                        font: "Arial"
                                    })]
                                })],
                                margins: {
                                    top: 100,
                                    bottom: 100,
                                    left: 100,
                                    right: 100
                                }
                            }),
                            new TableCell({
                                children: [new Paragraph({ 
                                    children: [new TextRun({
                                        text: tarefa.resultados?.toxicas || "",
                                        size: 24,
                                        font: "Arial"
                                    })]
                                })],
                                margins: {
                                    top: 100,
                                    bottom: 100,
                                    left: 100,
                                    right: 100
                                }
                            })
                        ]
                    }),
                    // Linha de quantidade insuficiente
                    new TableRow({
                        children: [
                            new TableCell({
                                children: [new Paragraph({ 
                                    children: [new TextRun({
                                        text: "Quantidade insuficiente",
                                        size: 24,
                                        font: "Arial"
                                    })]
                                })],
                                margins: {
                                    top: 100,
                                    bottom: 100,
                                    left: 100,
                                    right: 100
                                }
                            }),
                            new TableCell({
                                children: [new Paragraph({ 
                                    children: [new TextRun({
                                        text: tarefa.resultados?.insuficiente || "",
                                        size: 24,
                                        font: "Arial"
                                    })]
                                })],
                                margins: {
                                    top: 100,
                                    bottom: 100,
                                    left: 100,
                                    right: 100
                                }
                            })
                        ]
                    })
                ],
                width: { size: 100, type: WidthType.PERCENTAGE }
            });
        }

        // Create document sections array with conditional note for SN tests
        sections.push(
            new Paragraph({
                children: [
                    new TextRun({
                        text: tituloLaudo,
                        bold: true,
                        size: 32,
                        font: "Arial"
                    })
                ],
                alignment: AlignmentType.CENTER,
                spacing: { after: 400 }
            }),
            
            // Para ELISA, usar formato específico da imagem
            ...(isELISA ? [
                // Identificação e Número de amostras
                new Paragraph({
                    children: [
                        new TextRun({
                            text: `Identificação: ${tarefa.id || 'SV /25'}                                      Número de amostras: ${tarefa.quantidade || ''}`,
                            bold: true,
                            size: 24,
                            font: "Arial"
                        })
                    ],
                    spacing: { after: 100 }
                }),
                // Data de entrada e Data do laudo
                new Paragraph({
                    children: [
                        new TextRun({
                            text: `Data de entrada: ${dataEntrada}                                   Data do laudo: ${dataLaudo}`,
                            bold: true,
                            size: 24,
                            font: "Arial"
                        })
                    ],
                    spacing: { after: 200 }
                }),
                // Material
                new Paragraph({
                    children: [
                        new TextRun({
                            text: `Material: ${tarefa.materialRecebido || ''}`,
                            bold: true,
                            size: 24,
                            font: "Arial"
                        })
                    ],
                    spacing: { after: 100 }
                }),
                // Teste realizado
                new Paragraph({
                    children: [
                        new TextRun({
                            text: `Teste realizado: ${testeRealizado}`,
                            bold: true,
                            size: 24,
                            font: "Arial"
                        })
                    ],
                    spacing: { after: 400 }
                })
            ] : [
                // Para outros tipos, usar formato original
                // Identificação e datas
                new Paragraph({
                    children: [
                        new TextRun({
                            text: `Identificação: ${tarefa.id || 'SV /25'}                                   Número de amostras: ${tarefa.quantidade || ''}`,
                            bold: true,
                            size: 24,
                            font: "Arial"
                        })
                    ],
                    spacing: { after: 100 }
                }),
                new Paragraph({
                    children: [
                        new TextRun({
                            text: `Data de entrada: ${dataEntrada}                                   Data do laudo: ${dataLaudo}`,
                            bold: true,
                            size: 24,
                            font: "Arial"
                        })
                    ],
                    spacing: { after: 400 }
                })
            ]),
            ...(isPCR ? [
                new Paragraph({
                    children: [
                        new TextRun({
                            text: `Espécie: ${tarefa.especie || ''}`,
                            bold: true,
                            size: 24,
                            font: "Arial"
                        })
                    ],
                    spacing: { after: 100 }
                }),
                new Paragraph({
                    children: [
                        new TextRun({
                            text: `Vírus: ${tarefa.virus || ''}`,
                            bold: true,
                            size: 24,
                            font: "Arial"
                        })
                    ],
                    spacing: { after: 100 }
                })
            ] : []),
            ...(isRAIVA ? [
                new Paragraph({
                    children: [
                        new TextRun({
                            text: `Espécie: ${tarefa.especie || ''}`,
                            bold: true,
                            size: 24,
                            font: "Arial"
                        })
                    ],
                    spacing: { after: 100 }
                }),
                new Paragraph({
                    children: [
                        new TextRun({
                            text: `Material: ${tarefa.materialRecebido || ''}`,
                            bold: true,
                            size: 24,
                            font: "Arial"
                        })
                    ],
                    spacing: { after: 100 }
                })
            ] : []),
            
            ...(!isPCR && !isELISA ? [
                // Teste realizado (agora dinâmico)
                new Paragraph({
                    children: [
                        new TextRun({
                            text: "Teste Realizado: " + (testeRealizado || ""),
                            bold: true,
                            size: 24,
                            font: "Arial"
                        })
                    ],
                }),
                
                // Informações específicas para Multiplex Doença Respiratória Bovina
                ...(tarefa.subTipo === "Multiplex RT-PCR e PCR Doença Respiratória Bovina" || (tarefa.subTipo && tarefa.subTipo.includes("Doença Respiratória")) ? [
                    new Paragraph({
                        text: "",
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: `Material: ${tarefa.materialRecebido || ''}`,
                                bold: true,
                                size: 22,
                                font: "Arial"
                            })
                        ]
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: "Espécie: Bovino",
                                bold: true,
                                size: 22,
                                font: "Arial"
                            })
                        ]
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: "Alvos:",
                                bold: true,
                                size: 22,
                                font: "Arial"
                            })
                        ]
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: "Coronavírus bovino (BCoV);",
                                bold: true,
                                size: 22,
                                font: "Arial"
                            })
                        ]
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: "Vírus Respiratório Sincicial Bovino (BRSV);",
                                bold: true,
                                size: 22,
                                font: "Arial"
                            })
                        ]
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: "Herpesvírus Bovino (BoHV-1/5)",
                                bold: true,
                                size: 22,
                                font: "Arial"
                            })
                        ]
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: "Vírus da Diarreia Viral Bovina (BVDV)",
                                bold: true,
                                size: 22,
                                font: "Arial"
                            })
                        ]
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: "Vírus da Parainfluenza Bovina tipo 3 (BPIV-3)",
                                bold: true,
                                size: 22,
                                font: "Arial"
                            })
                        ],
                        spacing: { after: 200 }
                    })
                ] : []),
                
                // Informações específicas para Multiplex Encefalites Equina
                ...(tarefa.subTipo === "Multiplex Encefalites Equina" ? [
                    new Paragraph({
                        text: "",
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: `Material: ${tarefa.materialRecebido || ''}`,
                                bold: true,
                                size: 22,
                                font: "Arial"
                            })
                        ]
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: "Espécie: Equino",
                                bold: true,
                                size: 22,
                                font: "Arial"
                            })
                        ]
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: "Alvos:",
                                bold: true,
                                size: 22,
                                font: "Arial"
                            })
                        ]
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: "Vírus da Raiva (RaBV);",
                                bold: true,
                                size: 22,
                                font: "Arial"
                            })
                        ]
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: "Herpesvírus Equino tipo 1 (EHV-1);",
                                bold: true,
                                size: 22,
                                font: "Arial"
                            })
                        ]
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: "Flavivirus;",
                                bold: true,
                                size: 22,
                                font: "Arial"
                            })
                        ]
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: "Alphavirus;",
                                bold: true,
                                size: 22,
                                font: "Arial"
                            })
                        ]
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: "Vírus da Encefalite Equina Venezuelana (VEEV)",
                                bold: true,
                                size: 22,
                                font: "Arial"
                            })
                        ],
                        spacing: { after: 200 }
                    })
                ] : []),
                
                // Informações específicas para PCR Molecular simples (tipo MOLECULAR + subTipo PCR ou RT-PCR)
                ...(tarefa.tipo === "MOLECULAR" && (tarefa.subTipo === "PCR" || tarefa.subTipo === "RT-PCR") ? [
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: `Material: ${tarefa.materialRecebido || ''}`,
                                bold: true,
                                size: 22,
                                font: "Arial"
                            })
                        ]
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: `Espécie: ${tarefa.especie || ''}`,
                                bold: true,
                                size: 22,
                                font: "Arial"
                            })
                        ]
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: `Alvo: ${tarefa.alvo || ''}`,
                                bold: true,
                                size: 22,
                                font: "Arial"
                            })
                        ],
                        spacing: { after: 200 }
                    })
                ] : []),
                
                // Informações específicas para Duplex RT-PCR Rota e Corona Bovino
                ...(tarefa.tipo === "MOLECULAR" && (tarefa.subTipo === "Duplex RT-PCR Rota e Corona Bovino" || tarefa.subTipo === "Duplex Rota e Corona Bovino" || (tarefa.subTipo && (tarefa.subTipo.includes("Duplex RT-PCR Rota e Corona Bovino") || tarefa.subTipo.includes("Duplex Rota e Corona Bovino")))) ? [
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: "Material:",
                                bold: true,
                                size: 22,
                                font: "Arial"
                            })
                        ]
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: "Espécie: Bovino",
                                bold: true,
                                size: 22,
                                font: "Arial"
                            })
                        ]
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: "Alvos:",
                                bold: true,
                                size: 22,
                                font: "Arial"
                            })
                        ]
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: "Coronavírus Bovino (BCoV);",
                                size: 22,
                                font: "Arial"
                            })
                        ]
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: "Rotavírus Bovino (BRoV)",
                                size: 22,
                                font: "Arial"
                            })
                        ],
                        spacing: { after: 200 }
                    })
                ] : []),
                
                // Informações específicas para Duplex RT-PCR Rota e Corona Equino
                ...(tarefa.tipo === "MOLECULAR" && (tarefa.subTipo === "Duplex RT-PCR Rota e Corona Equino" || tarefa.subTipo === "Duplex Rota e Corona Equino" || (tarefa.subTipo && (tarefa.subTipo.includes("Duplex RT-PCR Rota e Corona Equino") || tarefa.subTipo.includes("Duplex Rota e Corona Equino")))) ? [
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: "Material:",
                                bold: true,
                                size: 22,
                                font: "Arial"
                            })
                        ]
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: "Espécie: Equino",
                                bold: true,
                                size: 22,
                                font: "Arial"
                            })
                        ]
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: "Alvos:",
                                bold: true,
                                size: 22,
                                font: "Arial"
                            })
                        ]
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: "Coronavírus (CoV);",
                                size: 22,
                                font: "Arial"
                            })
                        ]
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: "Rotavírus (RoV)",
                                size: 22,
                                font: "Arial"
                            })
                        ],
                        spacing: { after: 200 }
                    })
                ] : []),
                
                // Informações específicas para ICC
                ...(tarefa.tipo === "ICC" ? [
                    new Paragraph({
                        text: "",
                    }),
                    
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: "Material:                                                   Espécie:",
                                bold: true,
                                size: 22,
                                font: "Arial"
                            })
                        ],
                        spacing: { after: 200 }
                    })
                ] : []),
                
                // Adicionar checkboxes para testes SN
                ...(isSN ? [
                    new Paragraph({
                        text: "",
                        spacing: { after: 200 }
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: gerarCheckboxesSN(tarefa.tipo),
                                bold: false,
                                size: 24,
                                font: "Arial"
                            })
                        ],
                        spacing: { after: 400 }
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: "Outro.............................................................................................",
                                bold: false,
                                size: 24,
                                font: "Arial"
                            })
                        ],
                        spacing: { after: 600 }
                    })
                ] : [])
            ] : []),

            // Para Multiplex Crostas Bovina, adicionar informações específicas antes da tabela de resultados
            ...(tarefa.subTipo === "Multiplex Crostas Bovina" ? [
                // Material
                new Paragraph({
                    children: [
                        new TextRun({
                            text: `Material: ${tarefa.materialRecebido || ''}`,
                            bold: true,
                            size: 24,
                            font: "Arial"
                        })
                    ]
                }),
                // Espécie
                new Paragraph({
                    children: [
                        new TextRun({
                            text: "Espécie: Bovino",
                            bold: true,
                            size: 24,
                            font: "Arial"
                        })
                    ]
                }),
                
                // Alvos
                new Paragraph({
                    children: [
                        new TextRun({
                            text: "Alvos:",
                            bold: true,
                            size: 24,
                            font: "Arial"
                        })
                    ]
                }),
                new Paragraph({
                    children: [
                        new TextRun({
                            text: "Vaccínia (VaCV);",
                            bold: true,
                            size: 24,
                            font: "Arial"
                        })
                    ]
                }),
                new Paragraph({
                    children: [
                        new TextRun({
                            text: "Pseudocowpox (PCPV);",
                            bold: true,
                            size: 24,
                            font: "Arial"
                        })
                    ]
                }),
                new Paragraph({
                    children: [
                        new TextRun({
                            text: "Estomatite Papular Bovina (BPSV);",
                            bold: true,
                            size: 24,
                            font: "Arial"
                        })
                    ]
                }),
                new Paragraph({
                    children: [
                        new TextRun({
                            text: "Herpesvírus Bovino tipo 2 (BoHV-2)",
                            bold: true,
                            size: 24,
                            font: "Arial"
                        })
                    ],
                    spacing: { after: 300 }
                })
            ] : []),

            // Para Multiplex RT-PCR e PCR Diarreia Neonatal Bovina, adicionar informações específicas antes da tabela de resultados
            ...(tarefa.subTipo === "Multiplex RT-PCR e PCR Diarreia Neonatal Bovina" || (tarefa.subTipo && tarefa.subTipo.includes("Diarreia Neonatal")) ? [
                // Material
                new Paragraph({
                    children: [
                        new TextRun({
                            text: `Material: ${tarefa.materialRecebido || ''}`,
                            bold: true,
                            size: 24,
                            font: "Arial"
                        })
                    ]
                }),
                // Espécie
                new Paragraph({
                    children: [
                        new TextRun({
                            text: "Espécie: Bovino",
                            bold: true,
                            size: 24,
                            font: "Arial"
                        })
                    ]
                }),
                
                // Alvos
                new Paragraph({
                    children: [
                        new TextRun({
                            text: "Alvos:",
                            bold: true,
                            size: 24,
                            font: "Arial"
                        })
                    ]
                }),
                new Paragraph({
                    children: [
                        new TextRun({
                            text: "E. coli",
                            bold: true,
                            size: 24,
                            font: "Arial"
                        })
                    ]
                }),
                new Paragraph({
                    children: [
                        new TextRun({
                            text: "Salmonella",
                            bold: true,
                            size: 24,
                            font: "Arial"
                        })
                    ]
                }),
                new Paragraph({
                    children: [
                        new TextRun({
                            text: "Coronavírus Bovino (BCoV);",
                            bold: true,
                            size: 24,
                            font: "Arial"
                        })
                    ]
                }),
                new Paragraph({
                    children: [
                        new TextRun({
                            text: "Rotavírus Bovino (BRoV)",
                            bold: true,
                            size: 24,
                            font: "Arial"
                        })
                    ]
                }),
                new Paragraph({
                    children: [
                        new TextRun({
                            text: "Cryptosporidium parvum (Crypto)",
                            bold: true,
                            size: 24,
                            font: "Arial"
                        })
                    ],
                    spacing: { after: 300 }
                })
            ] : []),

            // Tabela de proprietário e veterinário
            new Table({
                columnWidths: [3000, 3000],
                rows: [
                    new TableRow({
                        children: [
                            new TableCell({
                                children: [
                                    new Paragraph({
                                        children: [new TextRun({ 
                                            text: "Proprietário:", 
                                            bold: true,
                                            size: 24,
                                            font: "Arial"
                                        })],
                                        alignment: AlignmentType.CENTER
                                    }),
                                    new Paragraph({
                                        children: [new TextRun({
                                            text: "Nome: " + (proprietario.nome || ''),
                                            size: 24,
                                            font: "Arial"
                                        })]
                                    }),
                                    new Paragraph({
                                        children: [new TextRun({
                                            text: "Município: " + (proprietario.municipio || ''),
                                            size: 24,
                                            font: "Arial"
                                        })]
                                    }),
                                    new Paragraph({
                                        children: [new TextRun({
                                            text: "Contato: " + (proprietario.contato || ''),
                                            size: 24,
                                            font: "Arial"
                                        })]
                                    })
                                ],
                                margins: {
                                    top: 100,
                                    bottom: 100,
                                    left: 100,
                                    right: 100
                                }
                            }),
                            new TableCell({
                                children: [
                                    new Paragraph({
                                        children: [new TextRun({ 
                                            text: "Médico Veterinário:", 
                                            bold: true,
                                            size: 24,
                                            font: "Arial"
                                        })],
                                        alignment: AlignmentType.CENTER
                                    }),
                                    new Paragraph({
                                        children: [new TextRun({
                                            text: "Nome: " + (veterinario.nome || ''),
                                            size: 24,
                                            font: "Arial"
                                        })]
                                    }),
                                    new Paragraph({
                                        children: [new TextRun({
                                            text: "Município: " + (veterinario.municipio || ''),
                                            size: 24,
                                            font: "Arial"
                                        })]
                                    }),
                                    new Paragraph({
                                        children: [new TextRun({
                                            text: "Contato: " + (veterinario.contato || ''),
                                            size: 24,
                                            font: "Arial"
                                        })]
                                    })
                                ],
                                margins: {
                                    top: 100,
                                    bottom: 100,
                                    left: 100,
                                    right: 100
                                }
                            })
                        ]
                    })
                ],
                width: { size: 100, type: WidthType.PERCENTAGE }
            }),

            // Título específico para subtipos MOLECULAR (se definido)
            ...(tituloSecao ? [tituloSecao] : []),
            
            // Informações específicas para subtipos MOLECULAR (se definido)
            ...(informacoes ? [informacoes] : []),

            // Espaçamento antes da tabela de resultados
            new Paragraph({
                text: "",
                spacing: { after: 100 }
            }),

            // Usar a tabela de resultados correta
            tabelaResultados,

           

            // Para Multiplex Encefalites, adicionar também a tabela de resultados específica
            ...(tarefa.subTipo === "Multiplex Encefalites Equina" ? [
                // Espaçamento entre tabelas
                new Paragraph({
                    text: "",
                    spacing: { after: 100 }
                }),
                // Título da tabela de resultados
                new Paragraph({
                    children: [new TextRun({
                        text: "Resultado",
                        bold: true,
                        size: 28,
                        font: "Arial"
                    })],
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 200 }
                }),
                tabelaResultadosEncefalites
            ] : []),

            // Espaçamento antes da tabela de rodapé
            new Paragraph({
                text: "",
                spacing: { after: 400 }
            })
        );

        // Add note only for SN tests
        if (!isELISA && !isPCR && !isRAIVA && !isICC && !isMOLECULAR) {
            sections.push(
                new Table({
                    columnWidths: [1500, 1500, 4000],
                    rows: [
                        new TableRow({
                            children: [
                                new TableCell({
                                    children: [new Paragraph({ 
                                        children: [new TextRun({ 
                                            text: "Amostras negativas são aquelas que apresentam título neutralizante < 4 (na diluição 1:4); amostras positivas são aquelas que apresentam título neutralizante ≥ 4.", 
                                            bold: true,
                                            size: 24,
                                            font: "Arial",
                                        })] 
                                    })],
                                    margins: {
                                        top: 100,
                                        bottom: 100,
                                        left: 100,
                                        right: 100
                                    }
                                })
                            ]
                        })
                    ]
                }),
                new Paragraph({
                    text: "",
                    spacing: { after: 400 }
                })
            );
        }

        // Add footer and signature
        sections.push(
            // Adicionar tabela de contato após o espaçamento e antes da assinatura
            new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: [
                    new TableRow({
                        children: [
                            new TableCell({
                                children: [
                                    new Paragraph({
                                        children: [
                                            new TextRun({
                                                text: "Endereço:",
                                                size: 16,
                                                font: "Arial",
                                                bold: true
                                            })
                                        ],
                                        alignment: AlignmentType.CENTER
                                    }),

                                    new Paragraph({
                                        children: [
                                            new TextRun({
                                                text: "Av. Roraima, 1000 - Prédio 63 A",
                                                size: 16,
                                                font: "Arial"
                                            })
                                        ],
                                        alignment: AlignmentType.CENTER
                                    }),
                                    new Paragraph({
                                        children: [
                                            new TextRun({
                                                text: "Rua Sul 60, Centro de Eventos",
                                                size: 16,
                                                font: "Arial"
                                            })
                                        ],
                                        alignment: AlignmentType.CENTER
                                    }),
                                    new Paragraph({
                                        children: [
                                            new TextRun({
                                                text: "CEP 97105-900",
                                                size: 16,
                                                font: "Arial"
                                            })
                                        ],
                                        alignment: AlignmentType.CENTER
                                    }),
                                    new Paragraph({
                                        children: [
                                            new TextRun({
                                                text: "Camobi, Santa Maria - RS",
                                                size: 16,
                                                font: "Arial"
                                            })
                                        ],
                                        alignment: AlignmentType.CENTER
                                    }),
                                    new Paragraph({
                                        children: [
                                            new TextRun({
                                                text: "www.ufsm.br/sv",
                                                size: 16,
                                                font: "Arial"
                                            })
                                        ],
                                        alignment: AlignmentType.CENTER
                                    })
                                ],
                                margins: {
                                    top: 100,
                                    bottom: 100,
                                    left: 100,
                                    right: 100
                                },
                                verticalAlign: VerticalAlign.CENTER,
                                alignment: AlignmentType.CENTER
                            }),
                            new TableCell({
                                children: [
                                    new Paragraph({
                                        children: [
                                            new TextRun({
                                                text: "Contato:",
                                                size: 17,
                                                font: "Arial",
                                                bold: true
                                            })
                                        ],
                                        alignment: AlignmentType.CENTER
                                    }),
                                    new Paragraph({
                                        children: [
                                            new TextRun({
                                                text: "(55) 3220 8034",
                                                size: 17,
                                                font: "Arial"
                                            })
                                        ],
                                        alignment: AlignmentType.CENTER
                                    }),
                                    new Paragraph({
                                        children: [
                                            new TextRun({
                                                text: "(55) 3220 8851",
                                                size: 17,
                                                font: "Arial"
                                            })
                                        ],
                                        alignment: AlignmentType.CENTER
                                    }),
                                    new Paragraph({
                                        children: [
                                            new TextRun({
                                                text: "",
                                                size: 17,
                                                font: "Arial"
                                            })
                                        ],
                                        alignment: AlignmentType.CENTER
                                    }),
                                    new Paragraph({
                                        children: [
                                            new TextRun({
                                                text: "E-mail:",
                                                size: 17,
                                                font: "Arial",
                                                bold: true
                                            })
                                        ],
                                        alignment: AlignmentType.CENTER
                                    }),
                                    new Paragraph({
                                        children: [
                                            new TextRun({
                                                text: "setordevirologia@gmail.com",
                                                size: 17,
                                                font: "Arial"
                                            })
                                        ],
                                        alignment: AlignmentType.CENTER
                                    })
                                ],
                                margins: {
                                    top: 100,
                                    bottom: 100,
                                    left: 100,
                                    right: 100
                                },
                                verticalAlign: VerticalAlign.CENTER,
                                alignment: AlignmentType.CENTER
                            })
                        ]
                    })
                ]
            }),
            
            // Assinatura
            new Paragraph({
                children: [
                    new ImageRun({
                        data: assinaturaBase64,
                        transformation: {
                            width: 75,
                            height: 100
                        }
                    })
                ],
                alignment: AlignmentType.RIGHT,
                spacing: { before: 400 }
            }),
            new Paragraph({
                children: [new TextRun({
                    text: "Eduardo Furtado Flores",
                    size: 17,
                    font: "Arial"
                })],
                alignment: AlignmentType.RIGHT
            }),
            new Paragraph({
                children: [new TextRun({
                    text: "CRMV/RS 3178",
                    size: 17,
                    font: "Arial"
                })],
                alignment: AlignmentType.RIGHT
            }),
            new Paragraph({
                children: [new TextRun({
                    text: "Responsável técnico",
                    size: 17,
                    font: "Arial"
                })],
                alignment: AlignmentType.RIGHT
            })
        );

        const doc = new Document({
            styles: {
                paragraphStyles: [{
                    id: "Normal",
                    name: "Normal",
                    run: {
                        size: 24, // Tamanho padrão (12pt)
                        font: "Arial"
                    },
                    paragraph: {
                        spacing: { line: 276 } // Espaçamento simples
                    }
                }]
            },
            sections: [{
                properties: {
                    page: {
                        margin: {
                            top: 1700,
                            right: 1700,
                            bottom: 1700,
                            left: 1700
                        }
                    }
                },
                children: sections
            }]
        });

        const blob = await Packer.toBlob(doc);
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        
        // Gerar nome do arquivo personalizado para SN
        let nomeArquivoFinal;
        if (isSN) {
            const subtipoSN = extrairSubtipoSN();
            const identificacao = tarefa.id || 'SV';
            nomeArquivoFinal = `LAUDO SN ${subtipoSN} ${identificacao.replace(/\//g, '_')}.docx`;
        } else if (isMOLECULAR) {
            const identificacao = tarefa.id || 'SV';
            if (tarefa.subTipo) {
                nomeArquivoFinal = `LAUDO MOLECULAR ${tarefa.subTipo.replace(/\s+/g, '_').toUpperCase()} ${identificacao.replace(/\//g, '_')}.docx`;
            } else {
                nomeArquivoFinal = `LAUDO ${nomeArquivo} ${identificacao.replace(/\//g, '_')}.docx`;
            }
        } else if (isELISA && (tarefa.tipo === "ELISA LEUCOSE" || tarefa.subTipo === "ELISA LEUCOSE")) {
            const identificacao = tarefa.id || 'SV';
            nomeArquivoFinal = `LAUDO ELISA LEUCOSE ${identificacao.replace(/\//g, '_')}.docx`;
        } else if (isELISA && (tarefa.tipo === "ELISA BVDV" || tarefa.subTipo === "ELISA BVDV")) {
            const identificacao = tarefa.id || 'SV';
            nomeArquivoFinal = `LAUDO ELISA BVDV ${identificacao.replace(/\//g, '_')}.docx`;
        } else {
            nomeArquivoFinal = `LAUDO ${nomeArquivo} ${tarefa.id.replace(/\//g, '_')}.docx`;
        }
        
        link.download = nomeArquivoFinal;
        console.log("Nome do arquivo gerado:", nomeArquivoFinal);
        link.click();
        URL.revokeObjectURL(url);
        
        mostrarFeedback('Laudo gerado com sucesso!', 'success');

    } catch (error) {
        console.error('Erro ao gerar laudo:', error);
        mostrarFeedback('Erro ao gerar laudo: ' + error.message, 'error');
    }
}