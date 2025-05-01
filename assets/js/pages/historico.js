// Importando as bibliotecas necessárias do Firebase
    import { initializeApp } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js";
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
        } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js";
        import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";

    const firebaseConfig = {
        apiKey: "AIzaSyAJneFO6AYsj5_w3hIKzPGDa8yR6Psng4M",
        authDomain: "hub-de-calculadoras.firebaseapp.com",
        projectId: "hub-de-calculadoras",
        storageBucket: "hub-de-calculadoras.appspot.com",
        messagingSenderId: "203883856586",
        appId: "1:203883856586:web:a00536536a32ae76c5aa33",
        measurementId: "G-7H314CT9SH"
        };

    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    const auth = getAuth();

    document.addEventListener('DOMContentLoaded', function() {
        console.log("Desenvolvido por Pedro Ruiz Sangoi e Alexandre Werle Suares, com auxílio do DeepSeek Chat.");
    });

    // Variável para armazenar todas as tarefas
    let todasTarefas = [];
    // Variável para controlar o modal aberto
    let modalAtual = null;

    // Função para filtrar tarefas com base no termo de busca
    function filtrarTarefas(termo) {
      const historicoList = document.getElementById("historico-list");
      historicoList.innerHTML = "";

      if (!termo) {
        // Se não houver termo de busca, mostrar todas as tarefas
        renderizarTarefas(todasTarefas);
        return;
      }

      const termoLower = termo.toLowerCase();
      const tarefasFiltradas = todasTarefas.filter(tarefa => {
        return (
          (tarefa.id && tarefa.id.toLowerCase().includes(termoLower)) ||
          (tarefa.tipo && tarefa.tipo.toLowerCase().includes(termoLower)) ||
          (tarefa.observacoes && tarefa.observacoes.toLowerCase().includes(termoLower))
        );
      });

      if (tarefasFiltradas.length === 0) {
        historicoList.innerHTML = "<p>Nenhuma tarefa encontrada com o termo de busca.</p>";
      } else {
        renderizarTarefas(tarefasFiltradas);
      }
    }

    // Função para renderizar as tarefas na lista
    function renderizarTarefas(tarefas) {
      const historicoList = document.getElementById("historico-list");
      historicoList.innerHTML = "";

      tarefas.forEach((tarefa) => {
        const historicoItem = document.createElement("div");
        historicoItem.className = "historico-item";
        historicoItem.innerHTML = `
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <strong>ID:</strong> ${tarefa.id || 'Sem ID'}<br>
              <strong>Tipo:</strong> ${tarefa.tipo || 'N/A'}
            </div>
            <div class="status-buttons">
              ${(tarefa.tipo === "SN IBR" || tarefa.tipo === "SN BVDV") ? 
                `<button class="btn-resultados" onclick="mostrarResultados('${tarefa.docId}')">Resultados</button>` : ''}
              <button class="btn-voltar-mural" onclick="voltarParaMural('${tarefa.docId}')">Voltar ao Mural</button>
              <button class="btn-detalhes" onclick="mostrarDetalhes('${tarefa.docId}')">Detalhes</button>
            </div>
          </div>
        `;
        historicoList.appendChild(historicoItem);
      });
    }

    // ADICIONE ESTAS NOVAS FUNÇÕES
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
        
        // Adicionar de volta ao mural
        await addDoc(collection(db, "tarefas"), {
          id: tarefa.id,
          tipo: tarefa.tipo,
          quantidade: tarefa.quantidade,
          gramatura: tarefa.gramatura || null,
          dataRecebimento: tarefa.dataRecebimento,
          observacoes: tarefa.observacoes || "",
          status: "pendente",
          criadoEm: Timestamp.now(),
          criadoPor: auth.currentUser.uid,
          siglaResponsavel: tarefa.siglaResponsavel || "N/A",
          resultados: tarefa.resultados || null
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

    function mostrarFeedback(mensagem, tipo = "success") {
      const feedback = document.createElement("div");
      feedback.className = `feedback ${tipo}`;
      feedback.textContent = mensagem;
      document.body.appendChild(feedback);
      
      setTimeout(() => {
        feedback.remove();
      }, 3000);
    }

    window.copiarResultados = function(tarefa) {
        try {
            // Create temporary element and add it to document
            const tempDiv = document.createElement('div');
            tempDiv.style.position = 'absolute';
            tempDiv.style.left = '-9999px';
            document.body.appendChild(tempDiv); // Add to document

            tempDiv.innerHTML = `
                <table style="border-collapse: collapse; width: 500px; margin: 15px 0;">
                    <thead>
                        <tr>
                            <th style="background-color: #1b5e20; color: white; padding: 8px; text-align: left; border: 1px solid #ddd;">Resultado</th>
                            <th style="background-color: #1b5e20; color: white; padding: 8px; text-align: left; border: 1px solid #ddd;">Identificação das amostras</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td style="border: 1px solid #ddd; padding: 8px;">Negativas (< 1:4)</td>
                            <td style="border: 1px solid #ddd; padding: 8px;">${tarefa.resultados.negativas || '-'}</td>
                        </tr>
                        <tr style="background-color: #f8f9fa;">
                            <td colspan="2" style="text-align: center; font-weight: bold; border: 1px solid #ddd; padding: 8px;">Positivas</td>
                        </tr>
                        <tr>
                            <td style="border: 1px solid #ddd; padding: 8px;">Título 4</td>
                            <td style="border: 1px solid #ddd; padding: 8px;">${tarefa.resultados.titulo4 || '-'}</td>
                        </tr>
                        <tr style="background-color: #f2f2f2;">
                            <td style="border: 1px solid #ddd; padding: 8px;">Título 8</td>
                            <td style="border: 1px solid #ddd; padding: 8px;">${tarefa.resultados.titulo8 || '-'}</td>
                        </tr>
                        <tr>
                            <td style="border: 1px solid #ddd; padding: 8px;">Título 16</td>
                            <td style="border: 1px solid #ddd; padding: 8px;">${tarefa.resultados.titulo16 || '-'}</td>
                        </tr>
                        <tr style="background-color: #f2f2f2;">
                            <td style="border: 1px solid #ddd; padding: 8px;">Título 32</td>
                            <td style="border: 1px solid #ddd; padding: 8px;">${tarefa.resultados.titulo32 || '-'}</td>
                        </tr>
                        <tr>
                            <td style="border: 1px solid #ddd; padding: 8px;">Título 64</td>
                            <td style="border: 1px solid #ddd; padding: 8px;">${tarefa.resultados.titulo64 || '-'}</td>
                        </tr>
                        <tr style="background-color: #f2f2f2;">
                            <td style="border: 1px solid #ddd; padding: 8px;">Título 128</td>
                            <td style="border: 1px solid #ddd; padding: 8px;">${tarefa.resultados.titulo128 || '-'}</td>
                        </tr>
                        <tr>
                            <td style="border: 1px solid #ddd; padding: 8px;">Título 256</td>
                            <td style="border: 1px solid #ddd; padding: 8px;">${tarefa.resultados.titulo256 || '-'}</td>
                        </tr>
                        <tr style="background-color: #f2f2f2;">
                            <td style="border: 1px solid #ddd; padding: 8px;">Título ≥512</td>
                            <td style="border: 1px solid #ddd; padding: 8px;">${tarefa.resultados.titulo512 || '-'}</td>
                        </tr>
                        <tr>
                            <td style="border: 1px solid #ddd; padding: 8px;">Impróprias para testar</td>
                            <td style="border: 1px solid #ddd; padding: 8px;">${tarefa.resultados.improprias || '-'}</td>
                        </tr>
                        <tr style="background-color: #f2f2f2;">
                            <td style="border: 1px solid #ddd; padding: 8px;">Tóxicas</td>
                            <td style="border: 1px solid #ddd; padding: 8px;">${tarefa.resultados.toxicas || '-'}</td>
                        </tr>
                        <tr>
                            <td style="border: 1px solid #ddd; padding: 8px;">Quantidade insuficiente</td>
                            <td style="border: 1px solid #ddd; padding: 8px;">${tarefa.resultados.insuficiente || '-'}</td>
                        </tr>
                    </tbody>
                </table>
            `;

            // Select and copy
            const range = document.createRange();
            range.selectNode(tempDiv);
            window.getSelection().removeAllRanges();
            window.getSelection().addRange(range);
            document.execCommand('copy');
            window.getSelection().removeAllRanges();

            // Remove the temporary element
            document.body.removeChild(tempDiv);

            mostrarFeedback('Tabela copiada com sucesso!', 'success');
        } catch (error) {
            console.error('Error copying table:', error);
            mostrarFeedback('Erro ao copiar tabela', 'error');
        }
    };

    // Verificador de carregamento
    function verificarDocxCarregado() {
        return new Promise((resolve, reject) => {
            if (window.docx) return resolve();
            
            // Tenta carregar dinamicamente se não estiver disponível
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/docx@9.0.0/build/index.min.js';
            script.onload = () => window.docx ? resolve() : reject("Biblioteca não carregada");
            script.onerror = () => reject("Erro ao carregar script");
            document.head.appendChild(script);
        });
    }

    async function gerarDocx(tarefa) {
    try {
        await carregarDocx();
        const { Document, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, Packer, VerticalAlign } = window.docx;

        // Define os textos variáveis conforme o tipo de teste
        const tituloLaudo = tarefa.tipo === "SN IBR" 
            ? "Sorologia BoHV-1 (IBR)" 
            : "Sorologia BVDV";
            
        const testeRealizado = tarefa.tipo === "SN IBR"
            ? "Soro-Neutralização para BoHV-1 (cepa Cooper ~ 100TCID50)"
            : "Soro-neutralização para BVDV-1 (cepa Singer ~ 100TCID50)";
        
        const nomeArquivo = tarefa.tipo === "SN IBR" 
            ? `IBR` 
            : `BVDV`;

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
                children: [
                    // Título principal (agora dinâmico)
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

                        // Tabela de resultados (formato exato do modelo)
                        new Table({
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
                        }),

                        // Espaçamento antes da tabela de rodapé
                        new Paragraph({
                            text: "",
                            spacing: { after: 400 }
                        }),

                        // Notas de rodapé
                        new Table({
                            columnWidths: [1500, 1500, 4000],
                            rows: [
                                // Cabeçalho da tabela
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
                                        }),
                                      ]
                                })
                            ]
                        }),
                            
                        // Espaçamento antes da assinatura  
                        new Paragraph({
                            text: "",
                            spacing: { after: 400 }
                        }),

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
                    ]
                }]
            });

            const blob = await Packer.toBlob(doc);
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `LAUDO_SN_${nomeArquivo}_${tarefa.id.replace(/\//g, '_')}.docx`;
            link.click();
            URL.revokeObjectURL(url);
            
            mostrarFeedback('Laudo gerado com sucesso!', 'success');
        } catch (error) {
            console.error('Erro ao gerar laudo:', error);
            mostrarFeedback('Erro ao gerar laudo: ' + error.message, 'error');
        }
    }

    // Função auxiliar para carregar a biblioteca com fallbacks
    function carregarDocx() {
        return new Promise(async (resolve, reject) => {
            // Se já estiver carregado
            if (window.docx) return resolve();
            
            // Tenta carregar via CDN principal
            try {
                await carregarScript('https://cdn.jsdelivr.net/npm/docx@9.0.0/build/index.umd.js');
                return resolve();
            } catch (e1) {
                console.warn('Falha no CDN principal, tentando fallback...');
            }
            
            // Fallback 1: Versão mais antiga e estável
            try {
                await carregarScript('https://cdn.jsdelivr.net/npm/docx@7.8.2/build/index.min.js');
                return resolve();
            } catch (e3) {
                reject(new Error('Todos os métodos de carregamento falharam'));
            }
        });
    }

    // Função genérica para carregar scripts
    function carregarScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = () => reject(new Error(`Falha ao carregar script: ${src}`));
            document.head.appendChild(script);
        });
    }

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
            
            if (tarefa.tipo !== "SN IBR" && tarefa.tipo !== "SN BVDV") {
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
            
            // Criar a tabela de resultados (igual ao mural, mas sem campos editáveis)
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

    // Função para mostrar detalhes da tarefa
    window.mostrarDetalhes = async (id) => {
      try {
        // Se já existe um modal aberto, fecha ele primeiro
        if (modalAtual) {
            document.body.removeChild(modalAtual);
            modalAtual = null;
            // Remove qualquer event listener existente do ESC
            document.removeEventListener("keydown", handleKeyDown);
        }

        const docRef = doc(db, "historico", id);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) throw new Error("Tarefa não encontrada");
        
        const tarefa = docSnap.data();
        let siglaUsuario = "N/A";

        if (tarefa.siglaResponsavel) {
            siglaUsuario = tarefa.siglaResponsavel;
        } else if (tarefa.criadoPor) {
            const usuarioRef = doc(db, "usuarios", tarefa.criadoPor);
            const usuarioSnap = await getDoc(usuarioRef);
            if (usuarioSnap.exists()) {
                siglaUsuario = usuarioSnap.data().sigla || "N/A";
            }
        }

        const dataRecebimento = tarefa.dataRecebimento?.toDate 
            ? tarefa.dataRecebimento.toDate().toLocaleDateString("pt-BR")
            : "Data não disponível";
        
        const dataConclusao = tarefa.dataConclusao?.toDate 
            ? tarefa.dataConclusao.toDate().toLocaleDateString("pt-BR")
            : "Data não disponível";

        // Cria o modal apenas se não houver nenhum aberto
        if (!modalAtual) {
            const modal = document.createElement("div");
            modal.id = "modal-detalhes";
            modal.className = "modal-detalhes";

            modal.innerHTML = `
                <div class="modal-content">
                    <h3 style="margin-bottom: 15px; margin-top: 0px; color: #1b5e20;">Detalhes da Tarefa Concluída</h3>
                    
                    <div style="margin-bottom: 15px;">
                        <strong style="display: inline-block; width: 120px;">ID:</strong>
                        <span>${tarefa.id || 'N/A'}</span>
                    </div>
                    
                    <div style="margin-bottom: 15px;">
                        <strong style="display: inline-block; width: 120px;">Tipo:</strong>
                        <span>${tarefa.tipo || 'N/A'}</span>
                    </div>

                    <div style="margin-bottom: 15px;">
                        <strong style="display: inline-block; width: 120px;">Responsável:</strong>
                        <span>${siglaUsuario}</span>
                    </div>

                    <div style="margin-bottom: 15px;">
                        <strong style="display: inline-block; width: 120px;">Quantidade:</strong>
                        <span>${tarefa.quantidade || '0'} ${tarefa.tipo === "VACINA" 
                            ? `vacinas${tarefa.gramatura ? ` (${tarefa.gramatura}g)` : ''}` 
                            : "amostras"}</span>
                    </div>

                    ${tarefa.complemento ? `
                    <div style="margin-bottom: 15px;">
                        <strong style="display: inline-block; width: 120px;">Complemento:</strong>
                        <span>${tarefa.complemento.trim()}</span>
                    </div>` : ''}

                    <div style="margin-bottom: 15px;">
                        <strong style="display: inline-block; width: 120px;">Proprietário:</strong>
                        <span>${tarefa.proprietario || 'N/A'}</span>
                    </div>
                    
                    <div style="margin-bottom: 15px;">
                        <strong style="display: inline-block; width: 120px;">Recebimento:</strong>
                        <span>${dataRecebimento}</span>
                    </div>
                    
                    <div style="margin-bottom: 15px;">
                        <strong style="display: inline-block; width: 120px;">Conclusão:</strong>
                        <span>${dataConclusao}</span>
                    </div>
                    
                    ${tarefa.observacoes ? `
                    <div style="margin-bottom: 20px;">
                        <strong style="display: block; margin-bottom: 5px;">Observações:</strong>
                        <div style="background: #f8f9fa; padding: 12px; border-radius: 6px; border-left: 4px solid #1b5e20; white-space: pre-line; text-align: left;">
                            ${tarefa.observacoes.trim()}
                        </div>
                    </div>` : ''}
                    
                    <button id="fechar-modal" 
                        style="position: absolute; top: 15px; right: 15px; padding: 5px 10px; background: #d32f2f; color: white; border: none; border-radius: 4px; cursor: pointer;">
                        X
                    </button>
                </div>
            `;

            document.body.appendChild(modal);
            modalAtual = modal;

            // Função para fechar o modal
            const fecharModal = () => {
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
                e.preventDefault();
            };

            // Adiciona o listener do ESC
            document.addEventListener("keydown", handleKeyDown);

            // Configura o botão de fechar
            modal.querySelector("#fechar-modal").onclick = fecharModal;

            // Fecha ao clicar fora do conteúdo
            modal.onclick = (e) => {
                if (e.target === modal) {
                    fecharModal();
                }
                e.stopPropagation();
            };
        }
    } catch (error) {
        console.error("Erro ao mostrar detalhes:", error);
        mostrarFeedback(`Erro: ${error.message}`, "error");
    }
};

    // Função para excluir tarefas concluídas há mais de 1 ano
    async function excluirTarefasAntigas() {
      try {
        const umAnoAtras = new Date();
        umAnoAtras.setFullYear(umAnoAtras.getFullYear() - 1);
        
        const q = query(
          collection(db, "historico"),
          where("dataConclusao", "<", umAnoAtras)
        );

        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) return;
        
        // Excluir cada documento encontrado
        const promises = [];
        querySnapshot.forEach((doc) => {
          promises.push(deleteDoc(doc.ref));
        });
        
        await Promise.all(promises);
        console.log(`${promises.length} tarefas antigas foram excluídas automaticamente`);
        
      } catch (error) {
        console.error("Erro ao excluir tarefas antigas:", error);
      }
    }
          

    // Carregar histórico
    async function carregarHistorico() {
      const historicoList = document.getElementById("historico-list");
      historicoList.innerHTML = '<p>Carregando histórico...</p>';

      try {
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
      } catch (error) {
        console.error("Erro ao carregar histórico:", error);
        historicoList.innerHTML = `<p>Erro ao carregar histórico: ${error.message}</p>`;
      }
    }

    document.addEventListener("DOMContentLoaded", () => {
      document.getElementById("voltar-button").onclick = () => {
        window.location.href = "mural.html";
      };

      // Configura o evento de busca
      document.getElementById("search-button").addEventListener("click", () => {
        const termo = document.getElementById("search-input").value;
        filtrarTarefas(termo);
      });

      // Permite buscar pressionando Enter
      document.getElementById("search-input").addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          const termo = document.getElementById("search-input").value;
          filtrarTarefas(termo);
        }
      });

      onAuthStateChanged(auth, (user) => {
        if (user) {
          excluirTarefasAntigas().then(() => {
            carregarHistorico();
          });
        } else {
          window.location.href = "index.html";
        }
      });
    });
