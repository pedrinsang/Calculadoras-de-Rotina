function mostrarFeedback(mensagem, tipo = "success") {
    const feedback = document.createElement("div");
    feedback.className = `feedback ${tipo}`;
    feedback.textContent = mensagem;
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
        const response = await fetch(path);
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result.split(',')[1]);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        console.error('Erro ao carregar imagem:', error);
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
            new Paragraph({
                text: "",
                spacing: { after: 200 }
            }),
        ];

        // Define os textos variáveis conforme o tipo de teste
        let tituloLaudo, testeRealizado, nomeArquivo;
        const isELISA = tarefa.tipo.includes("ELISA");

        switch(tarefa.tipo) {
            case "SN IBR":
                tituloLaudo = "Sorologia BoHV-1 (IBR)";
                testeRealizado = "Soro-Neutralização para BoHV-1 (cepa Cooper ~ 100TCID50)";
                nomeArquivo = "IBR";
                break;
            case "SN BVDV":
                tituloLaudo = "Sorologia BVDV";
                testeRealizado = "Soro-neutralização para BVDV-1 (cepa Singer ~ 100TCID50)";
                nomeArquivo = "BVDV";
                break;
            case "ELISA LEUCOSE":
                tituloLaudo = "Sorologia Vírus da Leucose Bovina";
                testeRealizado = "ELISA Anticorpo Vírus da Leucose Bovina";
                nomeArquivo = "ELISA_LEUCOSE";
                break;
            case "ELISA BVDV":
                tituloLaudo = "Sorologia Vírus da Diarreia Bovina - BVDV";
                testeRealizado = "ELISA para Antígeno contra Vírus da Diarreia Bovina - BVDV";
                nomeArquivo = "ELISA_BVDV";
                break;
            case "PCR":
                tituloLaudo = "Diagnóstico Molecular (PCR)";
                testeRealizado = "PCR: pesquisa de ácido nucléico viral (DNA) na amostras";
                nomeArquivo = "PCR";
                break;
            case "RAIVA":
                tituloLaudo = "Diagnóstico de RAIVA";
                testeRealizado = "(  ) Imunoflorescência (  ) RT-PCR";
                nomeArquivo = "RAIVA";
                break;
            case "ICC":
                tituloLaudo = "Diagnóstico de Isolamento em Cultivo Celular";
                testeRealizado = "Isolamento em Cultivo Celular";
                nomeArquivo = "ICC";
                break;
        }

        // Add a new condition for PCR type
        const isPCR = tarefa.tipo.includes("PCR");

        // Add a new condition for RAIVA type
        const isRAIVA = tarefa.tipo === "RAIVA";

        // Add a new condition for ICC type
        const isICC = tarefa.tipo === "ICC";

        // Cria a tabela de resultados baseada no tipo
        let tabelaResultados;
        
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
            // Identificação e datas
            new Paragraph({
                children: [
                    new TextRun({
                        text: `Identificação: ${tarefa.id || 'SV /25'}                                             Número de amostras: ${tarefa.quantidade || ''}`,
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
                        text: `Data de entrada: ${tarefa.dataRecebimento?.toDate?.().toLocaleDateString('pt-BR') || '/2025'}                                   Data do laudo: ${tarefa.dataConclusao?.toDate?.().toLocaleDateString('pt-BR') || '/2025'}`,
                        bold: true,
                        size: 24,
                        font: "Arial"
                    })
                ],
                spacing: { after: 400 }
            }),
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
                })
            ] : []),
            
            ...(!isPCR ? [
                // Teste realizado (agora dinâmico)
                new Paragraph({
                    children: [
                        new TextRun({
                            text: `Teste realizado: ${testeRealizado}`,
                            bold: true,
                            size: 22,
                            font: "Arial"
                        })
                    ],
                    spacing: { after: 600 }
                }),
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
                                            text: "Nome: " + (tarefa.proprietario || ''),
                                            size: 24,
                                            font: "Arial"
                                        })]
                                    }),
                                    new Paragraph({
                                        children: [new TextRun({
                                            text: "Município: " + (tarefa.municipio || ''),
                                            size: 24,
                                            font: "Arial"
                                        })]
                                    }),
                                    new Paragraph({
                                        children: [new TextRun({
                                            text: "Contato (celular/e-mail): " + (tarefa.contato || ''),
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
                                            text: "Nome: " + (tarefa.veterinario || ''),
                                            size: 24,
                                            font: "Arial"
                                        })]
                                    }),
                                    new Paragraph({
                                        children: [new TextRun({
                                            text: "Município: " + (tarefa.municipioVet || ''),
                                            size: 24,
                                            font: "Arial"
                                        })]
                                    }),
                                    new Paragraph({
                                        children: [new TextRun({
                                            text: "Contato (celular/e-mail): " + (tarefa.contatoVet || ''),
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

            // Espaçamento antes da tabela de resultados
            new Paragraph({
                text: "",
                spacing: { after: 400 }
            }),

            // Usar a tabela de resultados correta
            tabelaResultados,

            // Espaçamento antes da tabela de rodapé
            new Paragraph({
                text: "",
                spacing: { after: 400 }
            })
        );

        // Add note only for SN tests
        if (!isELISA && !isPCR && !isRAIVA && !isICC) {
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
                                                size: 20,
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
                                                size: 20,
                                                font: "Arial"
                                            })
                                        ],
                                        alignment: AlignmentType.CENTER
                                    }),
                                    new Paragraph({
                                        children: [
                                            new TextRun({
                                                text: "Rua Sul 60, Centro de Eventos",
                                                size: 20,
                                                font: "Arial"
                                            })
                                        ],
                                        alignment: AlignmentType.CENTER
                                    }),
                                    new Paragraph({
                                        children: [
                                            new TextRun({
                                                text: "CEP 97105-900",
                                                size: 20,
                                                font: "Arial"
                                            })
                                        ],
                                        alignment: AlignmentType.CENTER
                                    }),
                                    new Paragraph({
                                        children: [
                                            new TextRun({
                                                text: "Camobi, Santa Maria - RS",
                                                size: 20,
                                                font: "Arial"
                                            })
                                        ],
                                        alignment: AlignmentType.CENTER
                                    }),
                                    new Paragraph({
                                        children: [
                                            new TextRun({
                                                text: "www.ufsm.br/sv",
                                                size: 20,
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
                                                size: 20,
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
                                                size: 20,
                                                font: "Arial"
                                            })
                                        ],
                                        alignment: AlignmentType.CENTER
                                    }),
                                    new Paragraph({
                                        children: [
                                            new TextRun({
                                                text: "(55) 3220 8851",
                                                size: 20,
                                                font: "Arial"
                                            })
                                        ],
                                        alignment: AlignmentType.CENTER
                                    }),
                                    new Paragraph({
                                        children: [
                                            new TextRun({
                                                text: "",
                                                size: 20,
                                                font: "Arial"
                                            })
                                        ],
                                        alignment: AlignmentType.CENTER
                                    }),
                                    new Paragraph({
                                        children: [
                                            new TextRun({
                                                text: "E-mail:",
                                                size: 20,
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
                                                size: 20,
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
                children: [new TextRun({
                    text: "Rudi Weiblen",
                    size: 20,
                    font: "Arial"
                })],
                alignment: AlignmentType.RIGHT,
                spacing: { before: 800 }
            }),
            new Paragraph({
                children: [new TextRun({
                    text: "CRMV/RS 1574",
                    size: 20,
                    font: "Arial"
                })],
                alignment: AlignmentType.RIGHT
            }),
            new Paragraph({
                children: [new TextRun({
                    text: "Responsável técnico",
                    size: 20,
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
        link.download = `LAUDO ${nomeArquivo} ${tarefa.id.replace(/\//g, '_')}.docx`;
        link.click();
        URL.revokeObjectURL(url);
        
        mostrarFeedback('Laudo gerado com sucesso!', 'success');

    } catch (error) {
        console.error('Erro ao gerar laudo:', error);
        mostrarFeedback('Erro ao gerar laudo: ' + error.message, 'error');
    }
}