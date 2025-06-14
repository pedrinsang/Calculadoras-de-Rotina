// Adicione esta função ao final do arquivo inventario-nitrogenio.js

// Função para gerar relatório DOCX
async function gerarRelatorioDocx() {
  try {
    // Verificar se a biblioteca docx está disponível
    if (typeof docx === 'undefined') {
      mostrarFeedback("Biblioteca de geração de documentos não está disponível", "error");
      return;
    }

    mostrarLoading(true);

    const { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, AlignmentType, WidthType } = docx;

    // Dados do inventário organizados por rack
    const dadosOrganizados = {};
    inventarioAtual.forEach(item => {
      if (!dadosOrganizados[item.rack]) {
        dadosOrganizados[item.rack] = {};
      }
      if (!dadosOrganizados[item.rack][item.caixa]) {
        dadosOrganizados[item.rack][item.caixa] = [];
      }
      dadosOrganizados[item.rack][item.caixa].push(item);
    });

    const sections = [];

    // Título do documento
    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "INVENTÁRIO DE BOTIJÕES DE NITROGÊNIO",
            bold: true,
            size: 32,
            font: "Arial"
          })
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 }
      })
    );

    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `Data de geração: ${new Date().toLocaleDateString("pt-BR")}`,
            size: 24,
            font: "Arial"
          })
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 600 }
      })
    );

    // Para cada rack, criar uma seção
    Object.keys(dadosOrganizados).sort().forEach(rackId => {
      const rack = dadosOrganizados[rackId];

      // Título do Rack
      sections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `RACK ${rackId}`,
              bold: true,
              size: 28,
              font: "Arial",
              color: "0d6efd"
            })
          ],
          spacing: { before: 400, after: 200 }
        })
      );

      // Para cada caixa no rack
      Object.keys(rack).sort().forEach(caixaId => {
        const caixa = rack[caixaId];

        // Título da Caixa
        sections.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `Caixa ${caixaId}`,
                bold: true,
                size: 24,
                font: "Arial",
                color: "6f42c1"
              })
            ],
            spacing: { before: 300, after: 200 }
          })
        );

        // Tabela da caixa
        const tabelaCaixa = new Table({
          columnWidths: [1500, 2000, 1000, 3000],
          rows: [
            // Cabeçalho
            new TableRow({
              children: [
                new TableCell({
                  children: [new Paragraph({
                    children: [new TextRun({
                      text: "Posição",
                      bold: true,
                      size: 20,
                      font: "Arial",
                      color: "FFFFFF"
                    })],
                    alignment: AlignmentType.CENTER
                  })],
                  shading: { fill: "198754" }
                }),
                new TableCell({
                  children: [new Paragraph({
                    children: [new TextRun({
                      text: "Identificação",
                      bold: true,
                      size: 20,
                      font: "Arial",
                      color: "FFFFFF"
                    })],
                    alignment: AlignmentType.CENTER
                  })],
                  shading: { fill: "198754" }
                }),
                new TableCell({
                  children: [new Paragraph({
                    children: [new TextRun({
                      text: "Quantidade",
                      bold: true,
                      size: 20,
                      font: "Arial",
                      color: "FFFFFF"
                    })],
                    alignment: AlignmentType.CENTER
                  })],
                  shading: { fill: "198754" }
                }),
                new TableCell({
                  children: [new Paragraph({
                    children: [new TextRun({
                      text: "Observações",
                      bold: true,
                      size: 20,
                      font: "Arial",
                      color: "FFFFFF"
                    })],
                    alignment: AlignmentType.CENTER
                  })],
                  shading: { fill: "198754" }
                })
              ]
            }),
            // Dados
            ...caixa.sort((a, b) => a.posicao.localeCompare(b.posicao)).map(item => 
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({
                      children: [new TextRun({
                        text: item.posicao,
                        size: 20,
                        font: "Arial"
                      })],
                      alignment: AlignmentType.CENTER
                    })]
                  }),
                  new TableCell({
                    children: [new Paragraph({
                      children: [new TextRun({
                        text: item.identificacao,
                        size: 20,
                        font: "Arial"
                      })]
                    })]
                  }),
                  new TableCell({
                    children: [new Paragraph({
                      children: [new TextRun({
                        text: item.quantidade.toString(),
                        size: 20,
                        font: "Arial"
                      })],
                      alignment: AlignmentType.CENTER
                    })]
                  }),
                  new TableCell({
                    children: [new Paragraph({
                      children: [new TextRun({
                        text: item.observacoes || "-",
                        size: 20,
                        font: "Arial"
                      })]
                    })]
                  })
                ]
              })
            )
          ],
          width: { size: 100, type: WidthType.PERCENTAGE }
        });

        sections.push(tabelaCaixa);
        sections.push(new Paragraph({ text: "", spacing: { after: 300 } }));
      });
    });

    // Rodapé com estatísticas
    const totalItens = inventarioAtual.length;
    const totalQuantidade = inventarioAtual.reduce((sum, item) => sum + item.quantidade, 0);
    const totalRacks = Object.keys(dadosOrganizados).length;

    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "RESUMO ESTATÍSTICO",
            bold: true,
            size: 24,
            font: "Arial"
          })
        ],
        alignment: AlignmentType.CENTER,
        spacing: { before: 600, after: 300 }
      })
    );

    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `Total de itens: ${totalItens} | Total de amostras: ${totalQuantidade} | Total de racks: ${totalRacks}`,
            size: 20,
            font: "Arial"
          })
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 }
      })
    );

    // Criar documento
    const doc = new Document({
      sections: [{
        children: sections,
        margins: {
          top: 720,
          bottom: 720,
          left: 720,
          right: 720
        }
      }]
    });

    // Gerar e baixar
    const blob = await Packer.toBlob(doc);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Inventario_Nitrogenio_${new Date().toISOString().split('T')[0]}.docx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    mostrarFeedback("Relatório gerado com sucesso!", "success");

  } catch (error) {
    console.error("Erro ao gerar relatório:", error);
    mostrarFeedback("Erro ao gerar relatório: " + error.message, "error");
  } finally {
    mostrarLoading(false);
  }
}

// Adicionar botão de relatório ao HTML (adicione no cabeçalho)
document.addEventListener('DOMContentLoaded', function() {
  const headerDiv = document.querySelector('.d-flex.justify-content-between.align-items-center.mb-4 .d-flex.gap-2');
  if (headerDiv) {
    const btnRelatorio = document.createElement('button');
    btnRelatorio.id = 'gerar-relatorio';
    btnRelatorio.className = 'btn btn-info';
    btnRelatorio.innerHTML = '<i class="bi bi-file-earmark-word me-1"></i>Relatório DOCX';
    btnRelatorio.onclick = gerarRelatorioDocx;
    headerDiv.insertBefore(btnRelatorio, headerDiv.firstChild);
  }
});