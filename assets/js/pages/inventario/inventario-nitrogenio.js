import { 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy,
  where,
  Timestamp 
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { db, auth } from "../main.js";

// Dados iniciais baseados no PDF fornecido
const dadosIniciais = [
  // Rack 1
  { rack: "1", caixa: "A", posicao: "A1", identificacao: "Vírus BVDV Tipo 1", quantidade: 12, observacoes: "Alíquotas de trabalho" },
  { rack: "1", caixa: "A", posicao: "A2", identificacao: "Vírus BVDV Tipo 2", quantidade: 8, observacoes: "Alíquotas de trabalho" },
  { rack: "1", caixa: "A", posicao: "A3", identificacao: "Vírus IBR", quantidade: 15, observacoes: "Cepa Campo" },
  { rack: "1", caixa: "A", posicao: "A4", identificacao: "Vírus PI3", quantidade: 10, observacoes: "Cepa padrão" },
  { rack: "1", caixa: "A", posicao: "A5", identificacao: "Vírus BRSV", quantidade: 6, observacoes: "Passagem baixa" },
  { rack: "1", caixa: "A", posicao: "A6", identificacao: "Vírus Raiva", quantidade: 9, observacoes: "CVS-11" },
  
  { rack: "1", caixa: "B", posicao: "B1", identificacao: "Soro Referência BVDV", quantidade: 20, observacoes: "Controle positivo" },
  { rack: "1", caixa: "B", posicao: "B2", identificacao: "Soro Negativo BVDV", quantidade: 25, observacoes: "Controle negativo" },
  { rack: "1", caixa: "B", posicao: "B3", identificacao: "Soro Referência IBR", quantidade: 18, observacoes: "Título conhecido" },
  { rack: "1", caixa: "B", posicao: "B4", identificacao: "Pool Soros Campo", quantidade: 30, observacoes: "Amostras 1-50" },
  { rack: "1", caixa: "B", posicao: "B5", identificacao: "Soros Teste BVDV", quantidade: 22, observacoes: "Lote SV-2024" },
  
  // Rack 2  
  { rack: "2", caixa: "A", posicao: "A1", identificacao: "Células MDBK P15", quantidade: 30, observacoes: "Cultivo primário" },
  { rack: "2", caixa: "A", posicao: "A2", identificacao: "Células MDBK P20", quantidade: 25, observacoes: "Cultivo secundário" },
  { rack: "2", caixa: "A", posicao: "A3", identificacao: "Células BHK-21", quantidade: 22, observacoes: "Para vírus Raiva" },
  { rack: "2", caixa: "A", posicao: "A4", identificacao: "Células RK-13", quantidade: 18, observacoes: "Backup" },
  { rack: "2", caixa: "A", posicao: "A5", identificacao: "Células Vero", quantidade: 14, observacoes: "Controle" },
  
  { rack: "2", caixa: "B", posicao: "B1", identificacao: "Meio Cultivo Completo", quantidade: 40, observacoes: "DMEM + 10% SFB" },
  { rack: "2", caixa: "B", posicao: "B2", identificacao: "Meio Manutenção", quantidade: 35, observacoes: "DMEM + 2% SFB" },
  { rack: "2", caixa: "B", posicao: "B3", identificacao: "PBS Estéril", quantidade: 28, observacoes: "pH 7.4" },
  { rack: "2", caixa: "B", posicao: "B4", identificacao: "Tripsina 0.25%", quantidade: 16, observacoes: "EDTA" },
  
  // Rack 3
  { rack: "3", caixa: "A", posicao: "A1", identificacao: "Antígenos ELISA BVDV", quantidade: 24, observacoes: "Kit comercial" },
  { rack: "3", caixa: "A", posicao: "A2", identificacao: "Antígenos ELISA IBR", quantidade: 20, observacoes: "Kit comercial" },
  { rack: "3", caixa: "A", posicao: "A3", identificacao: "Conjugados ELISA", quantidade: 18, observacoes: "Anti-bovino" },
  { rack: "3", caixa: "A", posicao: "A4", identificacao: "Substratos TMB", quantidade: 12, observacoes: "Cromógeno" },
  
  { rack: "3", caixa: "B", posicao: "B1", identificacao: "Amostras Campo Bovino", quantidade: 45, observacoes: "Fazenda A" },
  { rack: "3", caixa: "B", posicao: "B2", identificacao: "Amostras Campo Suíno", quantidade: 32, observacoes: "Granja B" },
  { rack: "3", caixa: "B", posicao: "B3", identificacao: "Amostras Necropsia", quantidade: 27, observacoes: "Casos suspeitos" },
  { rack: "3", caixa: "B", posicao: "B4", identificacao: "DNA/RNA Extraído", quantidade: 38, observacoes: "PCR pronto" },
];

let inventarioAtual = [];
let itemEditando = null;
let filtroAtual = {
  busca: '',
  rack: '',
  caixa: ''
};

// Elementos DOM
const elements = {};

// Inicialização
document.addEventListener('DOMContentLoaded', function() {
  console.log("Inventário de Nitrogênio - Sistema Integrado Firebase");
  
  // Verificar autenticação
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      await inicializarSistema();
    } else {
      window.location.href = "../index.html";
    }
  });
});

// Função para inicializar o sistema completo
async function inicializarSistema() {
  try {
    mostrarLoading(true);
    
    inicializarElementos();
    await inicializarInventario();
    inicializarEventListeners();
    
  } catch (error) {
    console.error("Erro ao inicializar sistema:", error);
    mostrarFeedback("Erro ao inicializar sistema", "error");
  } finally {
    mostrarLoading(false);
  }
}

// Função para inicializar elementos DOM
function inicializarElementos() {
  elements.tbodyInventario = document.getElementById('tbody-inventario');
  elements.modalItem = document.getElementById('modal-item');
  elements.modalExcluir = document.getElementById('modal-excluir');
  elements.formItem = document.getElementById('form-item');
  elements.feedbackContainer = document.getElementById('feedback-container');
  elements.loadingDiv = document.getElementById('loading');
  elements.filtroBusca = document.getElementById('filtro-busca');
  elements.filtroRack = document.getElementById('filtro-rack');
  elements.filtroCaixa = document.getElementById('filtro-caixa');
  elements.totalItens = document.getElementById('total-itens');
}

// Função para inicializar inventário no Firebase
async function inicializarInventario() {
  try {
    // Verificar se já existem dados
    const snapshot = await getDocs(collection(db, "inventario-nitrogenio"));
    
    if (snapshot.empty) {
      console.log("Inserindo dados iniciais...");
      for (const item of dadosIniciais) {
        await addDoc(collection(db, "inventario-nitrogenio"), {
          ...item,
          criadoEm: Timestamp.now(),
          criadoPor: auth.currentUser.uid
        });
      }
    }
    
    await carregarInventario();
    
  } catch (error) {
    console.error("Erro ao inicializar inventário:", error);
    mostrarFeedback("Erro ao carregar inventário", "error");
  }
}

// Função para carregar dados do Firebase
async function carregarInventario() {
  try {
    const q = query(
      collection(db, "inventario-nitrogenio"),
      orderBy("rack"),
      orderBy("caixa"),
      orderBy("posicao")
    );
    
    const snapshot = await getDocs(q);
    inventarioAtual = [];
    
    snapshot.forEach((doc) => {
      inventarioAtual.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    atualizarFiltros();
    renderizarTabela();
    
  } catch (error) {
    console.error("Erro ao carregar inventário:", error);
    mostrarFeedback("Erro ao carregar dados", "error");
  }
}

// Função para configurar event listeners
function inicializarEventListeners() {
  // Botões principais
  document.getElementById('adicionar-item')?.addEventListener('click', () => abrirModalItem());
  document.getElementById('salvar-item')?.addEventListener('click', salvarItem);
  document.getElementById('confirmar-exclusao')?.addEventListener('click', excluirItem);
  document.getElementById('limpar-filtros')?.addEventListener('click', limparFiltros);
  document.getElementById('gerar-relatorio')?.addEventListener('click', gerarRelatorioDocx);

  // Filtros
  elements.filtroBusca?.addEventListener('input', debounce(() => {
    filtroAtual.busca = elements.filtroBusca.value;
    renderizarTabela();
  }, 300));

  elements.filtroRack?.addEventListener('change', () => {
    filtroAtual.rack = elements.filtroRack.value;
    renderizarTabela();
  });

  elements.filtroCaixa?.addEventListener('change', () => {
    filtroAtual.caixa = elements.filtroCaixa.value;
    renderizarTabela();
  });

  // Reset do modal
  elements.modalItem?.addEventListener('hidden.bs.modal', resetarFormulario);
}

// Função para atualizar filtros
function atualizarFiltros() {
  if (!elements.filtroRack || !elements.filtroCaixa) return;

  const racks = [...new Set(inventarioAtual.map(item => item.rack))].sort();
  elements.filtroRack.innerHTML = '<option value="">Todos os Racks</option>';
  racks.forEach(rack => {
    elements.filtroRack.innerHTML += `<option value="${rack}">Rack ${rack}</option>`;
  });

  const caixas = [...new Set(inventarioAtual.map(item => item.caixa))].sort();
  elements.filtroCaixa.innerHTML = '<option value="">Todas as Caixas</option>';
  caixas.forEach(caixa => {
    elements.filtroCaixa.innerHTML += `<option value="${caixa}">Caixa ${caixa}</option>`;
  });
}

// Função para filtrar dados
function filtrarDados() {
  return inventarioAtual.filter(item => {
    const matchBusca = !filtroAtual.busca || 
      item.identificacao.toLowerCase().includes(filtroAtual.busca.toLowerCase()) ||
      item.observacoes.toLowerCase().includes(filtroAtual.busca.toLowerCase()) ||
      item.rack.toLowerCase().includes(filtroAtual.busca.toLowerCase()) ||
      item.caixa.toLowerCase().includes(filtroAtual.busca.toLowerCase()) ||
      item.posicao.toLowerCase().includes(filtroAtual.busca.toLowerCase());

    const matchRack = !filtroAtual.rack || item.rack === filtroAtual.rack;
    const matchCaixa = !filtroAtual.caixa || item.caixa === filtroAtual.caixa;

    return matchBusca && matchRack && matchCaixa;
  });
}

// Função para renderizar tabela
function renderizarTabela() {
  if (!elements.tbodyInventario) return;

  const dadosFiltrados = filtrarDados();

  if (dadosFiltrados.length === 0) {
    elements.tbodyInventario.innerHTML = `
      <tr>
        <td colspan="7" class="empty-state">
          <i class="bi bi-inbox"></i>
          <h5>Nenhum item encontrado</h5>
          <p>Nenhum item corresponde aos filtros aplicados.</p>
          <button class="btn btn-primary mt-2" onclick="limparFiltros()">
            <i class="bi bi-funnel me-1"></i>Limpar Filtros
          </button>
        </td>
      </tr>
    `;
    atualizarContadorItens(0);
    return;
  }

  elements.tbodyInventario.innerHTML = dadosFiltrados.map(item => `
    <tr data-id="${item.id}">
      <td><span class="rack-badge">${item.rack}</span></td>
      <td><span class="caixa-badge">${item.caixa}</span></td>
      <td><span class="posicao-badge">${item.posicao}</span></td>
      <td class="fw-medium" title="${item.identificacao}">${item.identificacao}</td>
      <td><span class="quantidade-badge">${item.quantidade}</span></td>
      <td class="text-muted d-none d-lg-table-cell" title="${item.observacoes || 'Sem observações'}">${truncateText(item.observacoes || '-', 30)}</td>
      <td>
        <div class="btn-group" role="group">
          <button class="btn btn-sm btn-warning btn-action" onclick="editarItem('${item.id}')" title="Editar">
            <i class="bi bi-pencil"></i>
          </button>
          <button class="btn btn-sm btn-danger btn-action" onclick="confirmarExclusao('${item.id}')" title="Excluir">
            <i class="bi bi-trash"></i>
          </button>
        </div>
      </td>
    </tr>
  `).join('');

  atualizarContadorItens(dadosFiltrados.length);
}

// Função para atualizar contador
function atualizarContadorItens(count = null) {
  if (!elements.totalItens) return;
  
  const total = count !== null ? count : filtrarDados().length;
  elements.totalItens.textContent = `${total} ${total === 1 ? 'item' : 'itens'}`;
}

// Função para abrir modal
function abrirModalItem(item = null) {
  itemEditando = item;
  
  const modalTitle = document.getElementById('modal-title');
  
  if (item) {
    modalTitle.innerHTML = '<i class="bi bi-pencil me-2"></i>Editar Item';
    preencherFormulario(item);
  } else {
    modalTitle.innerHTML = '<i class="bi bi-plus-circle me-2"></i>Novo Item';
    resetarFormulario();
  }
  
  const modal = new bootstrap.Modal(elements.modalItem);
  modal.show();
}

// Função para preencher formulário
function preencherFormulario(item) {
  document.getElementById('rack').value = item.rack;
  document.getElementById('caixa').value = item.caixa;
  document.getElementById('posicao').value = item.posicao;
  document.getElementById('identificacao').value = item.identificacao;
  document.getElementById('quantidade').value = item.quantidade;
  document.getElementById('observacoes').value = item.observacoes || '';
}

// Função para salvar item
async function salvarItem() {
  try {
    const dados = {
      rack: document.getElementById('rack').value.trim().toUpperCase(),
      caixa: document.getElementById('caixa').value.trim().toUpperCase(),
      posicao: document.getElementById('posicao').value.trim().toUpperCase(),
      identificacao: document.getElementById('identificacao').value.trim(),
      quantidade: parseInt(document.getElementById('quantidade').value),
      observacoes: document.getElementById('observacoes').value.trim()
    };

    if (!validarDados(dados)) return;
    if (verificarDuplicata(dados)) {
      mostrarFeedback("Já existe um item nesta posição", "warning");
      return;
    }

    mostrarLoading(true);

    if (itemEditando) {
      await updateDoc(doc(db, "inventario-nitrogenio", itemEditando.id), {
        ...dados,
        atualizadoEm: Timestamp.now(),
        atualizadoPor: auth.currentUser.uid
      });
      mostrarFeedback("Item atualizado com sucesso!", "success");
    } else {
      await addDoc(collection(db, "inventario-nitrogenio"), {
        ...dados,
        criadoEm: Timestamp.now(),
        criadoPor: auth.currentUser.uid
      });
      mostrarFeedback("Item adicionado com sucesso!", "success");
    }

    bootstrap.Modal.getInstance(elements.modalItem).hide();
    await carregarInventario();

  } catch (error) {
    console.error("Erro ao salvar item:", error);
    mostrarFeedback("Erro ao salvar item", "error");
  } finally {
    mostrarLoading(false);
  }
}

// Função para validar dados
function validarDados(dados) {
  if (!dados.rack || !dados.caixa || !dados.posicao || !dados.identificacao) {
    mostrarFeedback("Preencha todos os campos obrigatórios", "warning");
    return false;
  }

  if (dados.quantidade < 0 || dados.quantidade > 9999) {
    mostrarFeedback("Quantidade deve estar entre 0 e 9999", "warning");
    return false;
  }

  return true;
}

// Função para verificar duplicata
function verificarDuplicata(dados) {
  return inventarioAtual.some(item => 
    item.rack === dados.rack && 
    item.caixa === dados.caixa && 
    item.posicao === dados.posicao &&
    (!itemEditando || item.id !== itemEditando.id)
  );
}

// Função para editar item
window.editarItem = function(id) {
  const item = inventarioAtual.find(item => item.id === id);
  if (item) abrirModalItem(item);
};

// Função para confirmar exclusão
window.confirmarExclusao = function(id) {
  const item = inventarioAtual.find(item => item.id === id);
  if (item) {
    itemEditando = item;
    const modal = new bootstrap.Modal(elements.modalExcluir);
    modal.show();
  }
};

// Função para excluir item
async function excluirItem() {
  if (!itemEditando) return;

  try {
    mostrarLoading(true);
    
    await deleteDoc(doc(db, "inventario-nitrogenio", itemEditando.id));
    
    bootstrap.Modal.getInstance(elements.modalExcluir).hide();
    await carregarInventario();
    
    mostrarFeedback("Item excluído com sucesso!", "success");
    
  } catch (error) {
    console.error("Erro ao excluir item:", error);
    mostrarFeedback("Erro ao excluir item", "error");
  } finally {
    mostrarLoading(false);
    itemEditando = null;
  }
}

// Função para limpar filtros
function limparFiltros() {
  filtroAtual = { busca: '', rack: '', caixa: '' };
  
  if (elements.filtroBusca) elements.filtroBusca.value = '';
  if (elements.filtroRack) elements.filtroRack.value = '';
  if (elements.filtroCaixa) elements.filtroCaixa.value = '';
  
  renderizarTabela();
  mostrarFeedback("Filtros limpos", "info");
}

// Função para resetar formulário
function resetarFormulario() {
  elements.formItem?.reset();
  itemEditando = null;
}

// Função para gerar relatório DOCX
async function gerarRelatorioDocx() {
  try {
    mostrarLoading(true);

    // Criar conteúdo HTML estruturado
    const dadosOrganizados = organizarDadosParaRelatorio();
    const htmlContent = gerarHTMLRelatorio(dadosOrganizados);
    
    // Baixar como HTML (pode ser convertido para DOCX posteriormente)
    baixarRelatorio(htmlContent);
    
    mostrarFeedback("Relatório gerado com sucesso!", "success");
    
  } catch (error) {
    console.error("Erro ao gerar relatório:", error);
    mostrarFeedback("Erro ao gerar relatório", "error");
  } finally {
    mostrarLoading(false);
  }
}

// Função para organizar dados para relatório
function organizarDadosParaRelatorio() {
  const dados = {};
  
  inventarioAtual.forEach(item => {
    if (!dados[item.rack]) dados[item.rack] = {};
    if (!dados[item.rack][item.caixa]) dados[item.rack][item.caixa] = [];
    dados[item.rack][item.caixa].push(item);
  });
  
  // Ordenar
  Object.keys(dados).forEach(rack => {
    Object.keys(dados[rack]).forEach(caixa => {
      dados[rack][caixa].sort((a, b) => a.posicao.localeCompare(b.posicao));
    });
  });
  
  return dados;
}

// Função para gerar HTML do relatório
function gerarHTMLRelatorio(dados) {
  const totalItens = inventarioAtual.length;
  const totalQuantidade = inventarioAtual.reduce((sum, item) => sum + item.quantidade, 0);
  const totalRacks = Object.keys(dados).length;

  let html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Inventário de Botijões de Nitrogênio</title>
      <style>
        body { 
          font-family: 'Arial', sans-serif; 
          margin: 40px; 
          line-height: 1.6;
          color: #333;
        }
        .header {
          text-align: center;
          margin-bottom: 40px;
          border-bottom: 3px solid #17a2b8;
          padding-bottom: 20px;
        }
        .header h1 { 
          color: #17a2b8; 
          font-size: 2.5em;
          margin-bottom: 10px;
          text-transform: uppercase;
          letter-spacing: 2px;
        }
        .header .subtitle {
          font-size: 1.2em;
          color: #666;
          margin-bottom: 10px;
        }
        .header .date {
          font-size: 1em;
          color: #888;
        }
        .rack-section { 
          margin: 30px 0; 
          page-break-inside: avoid;
        }
        .rack-title { 
          background: linear-gradient(135deg, #17a2b8, #138496);
          color: white; 
          padding: 15px;
          margin: 20px 0 10px 0;
          border-radius: 8px;
          font-size: 1.4em;
          font-weight: bold;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .caixa-title { 
          background: linear-gradient(135deg, #6f42c1, #5a2d91);
          color: white; 
          padding: 10px 15px;
          margin: 15px 0 10px 0;
          border-radius: 6px;
          font-size: 1.2em;
          font-weight: bold;
        }
        table { 
          width: 100%; 
          border-collapse: collapse; 
          margin: 15px 0;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          border-radius: 8px;
          overflow: hidden;
        }
        th { 
          background: linear-gradient(135deg, #28a745, #1e7e34);
          color: white; 
          padding: 12px;
          text-align: center;
          font-weight: bold;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          font-size: 0.9em;
        }
        td { 
          border: 1px solid #ddd; 
          padding: 10px; 
          text-align: left;
          background: #fff;
        }
        tr:nth-child(even) td { 
          background-color: #f8f9fa; 
        }
        tr:hover td {
          background-color: #e3f2fd;
        }
        .posicao { 
          text-align: center; 
          font-weight: bold;
          background: #e9ecef !important;
        }
        .quantidade { 
          text-align: center; 
          font-weight: bold;
          color: #fd7e14;
        }
        .stats { 
          background: linear-gradient(135deg, #f8f9fa, #e9ecef);
          padding: 25px; 
          border-radius: 10px; 
          margin: 40px 0;
          border-left: 5px solid #17a2b8;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        .stats h3 {
          color: #17a2b8;
          margin-bottom: 20px;
          font-size: 1.5em;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
        }
        .stat-item {
          background: white;
          padding: 15px;
          border-radius: 8px;
          text-align: center;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .stat-number {
          font-size: 2em;
          font-weight: bold;
          color: #17a2b8;
        }
        .stat-label {
          color: #666;
          text-transform: uppercase;
          font-size: 0.9em;
          letter-spacing: 0.5px;
        }
        @page {
          margin: 2cm;
          size: A4;
        }
        @media print {
          body { margin: 0; }
          .header { page-break-after: avoid; }
          .rack-section { page-break-inside: avoid; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Inventário de Botijões de Nitrogênio</h1>
        <div class="subtitle">Setor de Virologia - UFSM</div>
        <div class="date">Relatório gerado em: ${new Date().toLocaleDateString('pt-BR', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })}</div>
      </div>
  `;

  // Adicionar dados organizados por rack
  Object.keys(dados).sort().forEach(rack => {
    html += `<div class="rack-section">`;
    html += `<div class="rack-title">🧊 Rack ${rack}</div>`;
    
    Object.keys(dados[rack]).sort().forEach(caixa => {
      html += `<div class="caixa-title">📦 Caixa ${caixa}</div>`;
      html += `
        <table>
          <thead>
            <tr>
              <th style="width: 15%;">Posição</th>
              <th style="width: 45%;">Identificação</th>
              <th style="width: 15%;">Quantidade</th>
              <th style="width: 25%;">Observações</th>
            </tr>
          </thead>
          <tbody>
      `;
      
      dados[rack][caixa].forEach(item => {
        html += `
          <tr>
            <td class="posicao">${item.posicao}</td>
            <td><strong>${item.identificacao}</strong></td>
            <td class="quantidade">${item.quantidade}</td>
            <td>${item.observacoes || '-'}</td>
          </tr>
        `;
      });
      
      html += `</tbody></table>`;
    });
    
    html += `</div>`;
  });

  // Adicionar estatísticas
  html += `
    <div class="stats">
      <h3>📊 Resumo Estatístico</h3>
      <div class="stats-grid">
        <div class="stat-item">
          <div class="stat-number">${totalItens}</div>
          <div class="stat-label">Total de Itens</div>
        </div>
        <div class="stat-item">
          <div class="stat-number">${totalQuantidade}</div>
          <div class="stat-label">Total de Amostras</div>
        </div>
        <div class="stat-item">
          <div class="stat-number">${totalRacks}</div>
          <div class="stat-label">Total de Racks</div>
        </div>
        <div class="stat-item">
          <div class="stat-number">${Object.values(dados).reduce((sum, rack) => sum + Object.keys(rack).length, 0)}</div>
          <div class="stat-label">Total de Caixas</div>
        </div>
      </div>
    </div>
    </body>
    </html>
  `;

  return html;
}

// Função para baixar relatório
function baixarRelatorio(conteudo) {
  const blob = new Blob([conteudo], { type: 'text/html;charset=utf-8' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Inventario_Nitrogenio_${new Date().toISOString().split('T')[0]}.html`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

// Função para mostrar/ocultar loading
function mostrarLoading(show) {
  if (elements.loadingDiv) {
    elements.loadingDiv.classList.toggle('d-none', !show);
  }
}

// Função para mostrar feedback
function mostrarFeedback(mensagem, tipo = "info") {
  if (!elements.feedbackContainer) return;
  
  const alertTypes = {
    success: "alert-success",
    error: "alert-danger", 
    warning: "alert-warning",
    info: "alert-info"
  };
  
  const iconTypes = {
    success: "check-circle",
    error: "exclamation-triangle",
    warning: "exclamation-triangle", 
    info: "info-circle"
  };
  
  const alertClass = alertTypes[tipo] || alertTypes.info;
  const iconClass = iconTypes[tipo] || iconTypes.info;
  
  const feedbackHtml = `
    <div class="alert ${alertClass} alert-dismissible fade show feedback-message" role="alert">
      <i class="bi bi-${iconClass} me-2"></i>
      ${mensagem}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    </div>
  `;
  
  elements.feedbackContainer.innerHTML = feedbackHtml;
  
  setTimeout(() => {
    const alert = elements.feedbackContainer.querySelector('.alert');
    if (alert) alert.remove();
  }, 5000);
}

// Funções utilitárias
function truncateText(text, maxLength) {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Tornar funções globais
window.editarItem = window.editarItem;
window.confirmarExclusao = window.confirmarExclusao;
window.limparFiltros = limparFiltros;