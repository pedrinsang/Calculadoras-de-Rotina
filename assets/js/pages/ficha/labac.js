import { signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";
import { getDoc, doc } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js";
import { app, auth, db } from "../../../js/firebase.js";
import { gerarFormularioCobrancaFicha } from "../../utils/formularioCobranca.js";

// Firebase via módulo compartilhado

document.addEventListener('DOMContentLoaded', function () {
  console.log("Página LABAC carregada");
  
  // Render otimista: não redireciona aqui; onAuthStateChanged vai validar
  const usuario = JSON.parse(localStorage.getItem("usuario") || sessionStorage.getItem("usuario") || '{}');
  if (usuario?.nome) {
    const nameEl = document.querySelector('.user-name');
    if (nameEl) nameEl.textContent = usuario.nome;
    if (usuario.role === 'admin') {
      const btn = document.getElementById('admin-button');
      if (btn) btn.style.display = 'flex';
    }
    const actions = document.querySelector('.user-actions');
    if (actions) actions.style.display = 'flex';
  }

  // Preencher automaticamente a data de chegada com a data atual (YYYY-MM-DD), se estiver vazia
  try {
    const hojeISO = new Date().toISOString().split('T')[0];
    const dataChegada = document.getElementById('data-chegada');
    if (dataChegada && !dataChegada.value) {
      dataChegada.value = hojeISO;
    }
  } catch (e) {
    console.warn('[LABAC] Não foi possível auto-preencher data de chegada:', e);
  }

  // Event listener para o botão admin (se existir)
  const adminButton = document.getElementById('admin-button');
  if (adminButton) {
    adminButton.addEventListener('click', function() {
      window.location.href = '../admin.html';
    });
  }

  // Configurar botão de logout (se existir)
  const logoutButton = document.getElementById('logout-button');
  if (logoutButton) {
    logoutButton.addEventListener('click', async () => {
      try {
        // Limpar dados primeiro
        localStorage.removeItem('usuario');
        localStorage.removeItem('manterConectado');
        sessionStorage.removeItem('usuario');

        // Em seguida fazer logout do Firebase
        await signOut(auth);

        // Redirecionar
        window.location.href = "../../index.html?logout=true";
      } catch (error) {
        alert("Erro ao desconectar: " + error.message);
      }
    });
  }

  // Manipulação do formulário
  const fichaForm = document.getElementById('ficha-form');
  if (fichaForm) {
    fichaForm.addEventListener('submit', function(e) {
      e.preventDefault();
      
      // Coletar dados do formulário
      const formData = new FormData(fichaForm);
      const fichaData = {};
      
      // Campos de texto simples
      for (let [key, value] of formData.entries()) {
        if (key !== 'exames') {
          fichaData[key] = value;
        }
      }
      
      // Exames selecionados (checkboxes)
      const examesSelecionados = formData.getAll('exames');
      fichaData.exames = examesSelecionados;
      
      // Adicionar timestamp
      fichaData.dataPreenchimento = new Date().toISOString();
      fichaData.laboratorio = 'LABAC';
      
      console.log('Dados da ficha:', fichaData);
      
      // Aqui você pode implementar o salvamento no Firebase
      salvarFicha(fichaData);
    });
  }

  // Lógica para mostrar/esconder campo "outros exames"
  const exameOutros = document.getElementById('exame-outros');
  const especificarOutros = document.getElementById('exames-outros-especificar');
  
  if (exameOutros && especificarOutros) {
    exameOutros.addEventListener('change', function() {
      especificarOutros.parentElement.style.display = this.checked ? 'block' : 'none';
      especificarOutros.required = this.checked;
    });
  }

  // Ligar botão de visualizar impressão
  const previewBtn = document.getElementById('visualizarImpressaoLabac');
  if (previewBtn) {
    previewBtn.addEventListener('click', function(e) {
      e.preventDefault();
      try {
        const fichaData = collectLabacFormData();
        const html = buildLabacPrintHTML(fichaData);
        const w = window.open('', '_blank', 'width=842,height=1191,scrollbars=yes');
        if (!w) { alert('Não foi possível abrir a janela de visualização. Verifique bloqueadores de pop-up.'); return; }
        w.document.open();
        w.document.write(html);
        w.document.close();
      } catch (err) {
        console.error('Erro ao gerar preview LABAC:', err);
        alert('Erro ao gerar preview. Veja console para detalhes.');
      }
    });
  }

  // Ligar botão de formulário de cobrança
  const cobrancaBtn = document.getElementById('formularioCobrancaLabac');
  if (cobrancaBtn) {
    cobrancaBtn.addEventListener('click', async function(e) {
      e.preventDefault();
      const originalHtml = cobrancaBtn.innerHTML;
      try {
        cobrancaBtn.disabled = true;
        cobrancaBtn.innerHTML = '<i class="bi bi-hourglass-split"></i> Gerando...';
        const fichaData = collectLabacFormData();
        await gerarFormularioCobrancaFicha('labac', fichaData);
      } catch (err) {
        console.error('Erro ao gerar formulário de cobrança LABAC:', err);
        alert('Erro ao gerar formulário de cobrança: ' + err.message);
      } finally {
        cobrancaBtn.disabled = false;
        cobrancaBtn.innerHTML = originalHtml;
      }
    });
  }
});

// Função para salvar a ficha
async function salvarFicha(fichaData) {
  try {
    // Mostrar loading
    const submitBtn = document.querySelector('.btn-primary');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="bi bi-hourglass-split"></i> Salvando...';
    submitBtn.disabled = true;
    
    // Simular salvamento (substitua pela lógica do Firebase)
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Sucesso
    submitBtn.innerHTML = '<i class="bi bi-check-lg"></i> Salvo!';
    submitBtn.style.backgroundColor = '#4caf50';
    
    setTimeout(() => {
      alert('Ficha salva com sucesso!');
      document.getElementById('ficha-form').reset();
      submitBtn.innerHTML = originalText;
      submitBtn.disabled = false;
      submitBtn.style.backgroundColor = '';
    }, 1000);
    
  } catch (error) {
    console.error('Erro ao salvar ficha:', error);
    alert('Erro ao salvar a ficha. Tente novamente.');
    
    // Restaurar botão
    const submitBtn = document.querySelector('.btn-primary');
    submitBtn.innerHTML = '<i class="bi bi-check-lg"></i> Salvar Ficha';
    submitBtn.disabled = false;
  }
}

// Helper: coletar dados do formulário LABAC
function collectLabacFormData() {
  const form = document.getElementById('ficha-form');
  if (!form) return {};
  const fd = new FormData(form);
  const data = {};
  for (const [k,v] of fd.entries()) {
    if (k === 'exames') {
      data.exames = fd.getAll('exames');
    } else {
      data[k] = v;
    }
  }
  return data;
}

// Helper: construir HTML de impressão 1:1 replicando a ficha LABAC original
function buildLabacPrintHTML(data) {
  const logoUFSM = '../../assets/images/logo-ufsm.png';
  const logoLABAC = '../../assets/images/logo-LABAC.png';

  // Função para marcar checkbox se necessário
  const getCheckbox = (isChecked) => isChecked ? '☑' : '☐';
  
  // Função para formatar data no padrão brasileiro (dd/mm/yyyy)
  const formatDateBR = (dateStr) => {
    if (!dateStr) return '';
    
    // Se já está no formato brasileiro, retorna como está
    if (dateStr.includes('/')) return dateStr;
    
    // Se está no formato ISO (yyyy-mm-dd), converte
    if (dateStr.includes('-')) {
      const [year, month, day] = dateStr.split('-');
      return `${day}/${month}/${year}`;
    }
    
    return dateStr;
  };
  
  // Preparar exames selecionados
  const exames = data.exames || [];

  const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>LABAC - Ficha de Encaminhamento de Amostras</title>
<style>
  html,body{margin:0;padding:0;height:100%;font-family:Arial,sans-serif;}
  .page{width:210mm;height:297mm;margin:0 auto;background:#fff;position:relative;padding:15mm;}
  table{border-collapse:collapse;width:100%;font-size:11px;}
  td{border:1px solid #000;padding:6px;vertical-align:top;}
  .header-cell{background:#f0f0f0;font-weight:bold;}
  .section-title{background:#e0e0e0;font-weight:bold;text-align:center;padding:8px;}
  .checkbox{text-align:center;width:20px;font-size:14px;}
  .data-field{color:#000;font-weight:normal;}
  @media print{ .no-print{display:none;} body{margin:0;} .page{margin:0;padding:10mm;} }
</style>
</head>
<body>
  <div class="page">
    <!-- Cabeçalho com logos -->
    <table style="border:none;margin-bottom:15px;">
      <tr>
        <td style="border:none;width:140px;padding:0;">
          <img src="${logoUFSM}" style="height:150px;width:auto;object-fit:contain;">
        </td>
        <td style="border:none;text-align:center;padding:0;">
          <div style="font-size:16px;font-weight:bold;margin-bottom:5px;">LABAC – LABORATÓRIO DE BACTERIOLOGIA</div>
          <div style="font-size:10px;">DEPARTAMENTO DE MEDICINA VETERINÁRIA PREVENTIVA - CCR / UFSM</div>
          <div style="font-size:10px;">PRÉDIO 63D, RUA FLORIANO PEIXOTO, 60, PARQUE TECNOLÓGICO – UFSM</div>
          <div style="font-size:10px;">CEP 97105-900, CAMOBI, SANTA MARIA – RS</div>
          <div style="font-size:10px;">Fone: (55) 3220-8632/8632 | labac.ufsm@gmail.com</div>
        </td>
        <td style="border:none;width:140px;padding:0;text-align:right;">
          <img src="${logoLABAC}" style="height:150px;width:auto;object-fit:contain;">
        </td>
      </tr>
    </table>

    <!-- Título da ficha -->
    <div style="text-align:center;font-size:14px;font-weight:bold;margin:15px 0;">FICHA DE ENCAMINHAMENTO DE AMOSTRAS</div>

    <!-- Tabela principal -->
    <table>
      <tr>
        <td class="header-cell" style="width:25%;">Data de chegada:</td>
        <td class="data-field" style="width:25%;">${escapeHtml(formatDateBR(data['data-chegada']) || '')}</td>
        <td class="header-cell" style="width:20%;">Protocolo:</td>
        <td class="data-field">${escapeHtml(data['protocolo'] || '')}</td>
      </tr>
      <tr>
        <td class="header-cell">Proprietário/Tutor:</td>
        <td colspan="3" class="data-field">${escapeHtml(data['proprietario-nome'] || '')}</td>
      </tr>
      <tr>
        <td class="header-cell">Telefone:</td>
        <td class="data-field">${escapeHtml(data['proprietario-telefone'] || '')}</td>
        <td class="header-cell">Município/Estado:</td>
        <td class="data-field">${escapeHtml(data['proprietario-municipio'] || '')}</td>
      </tr>
      <tr>
        <td class="header-cell">E-mail:</td>
        <td colspan="3" class="data-field">${escapeHtml(data['proprietario-email'] || '')}</td>
      </tr>
      <tr>
        <td class="header-cell">Médico Veterinário:</td>
        <td class="data-field">${escapeHtml(data['medico-nome'] || '')}</td>
        <td class="header-cell">CRMV:</td>
        <td class="data-field">${escapeHtml(data['medico-crmv'] || '')}</td>
      </tr>
      <tr>
        <td class="header-cell">Telefone:</td>
        <td class="data-field">${escapeHtml(data['medico-telefone'] || '')}</td>
        <td class="header-cell">Município/Estado:</td>
        <td class="data-field">${escapeHtml(data['medico-municipio'] || '')}</td>
      </tr>
      <tr>
        <td class="header-cell">E-mail:</td>
        <td colspan="3" class="data-field">${escapeHtml(data['medico-email'] || '')}</td>
      </tr>
      <tr>
        <td colspan="4" class="section-title">Dados para nota fiscal</td>
      </tr>
      <tr>
        <td class="header-cell">Razão social:</td>
        <td colspan="3" class="data-field">${escapeHtml(data['nf-razao'] || '')}</td>
      </tr>
      <tr>
        <td class="header-cell">CNPJ/CPF:</td>
        <td class="data-field">${escapeHtml(data['nf-cnpjcpf'] || '')}</td>
        <td class="header-cell">Se CPF, data de nascimento:</td>
        <td class="data-field">${escapeHtml(formatDateBR(data['nf-nascimento']) || '')}</td>
      </tr>
      <tr>
        <td class="header-cell">Endereço:</td>
        <td class="data-field">${escapeHtml(data['nf-endereco'] || '')}</td>
        <td class="header-cell">CEP:</td>
        <td class="data-field">${escapeHtml(data['nf-cep'] || '')}</td>
      </tr>
      <tr>
        <td class="header-cell">Município:</td>
        <td class="data-field">${escapeHtml(data['nf-municipio'] || '')}</td>
        <td class="header-cell">UF:</td>
        <td class="data-field">${escapeHtml(data['nf-uf'] || '')}</td>
      </tr>
      <tr>
        <td class="header-cell">E-mail:</td>
        <td class="data-field">${escapeHtml(data['nf-email'] || '')}</td>
        <td class="header-cell">Tel.:</td>
        <td class="data-field">${escapeHtml(data['nf-tel'] || '')}</td>
      </tr>
      <tr>
        <td class="header-cell">Inscrição estadual:</td>
        <td class="data-field">${escapeHtml(data['nf-insc-estadual'] || '')}</td>
        <td class="header-cell">Insc. Municipal:</td>
        <td class="data-field">${escapeHtml(data['nf-insc-municipal'] || '')}</td>
      </tr>
    </table>

    <!-- Identificação da amostra -->
    <div style="margin-top:15px;">
      <div style="font-weight:bold;margin-bottom:5px;">Identificação da amostra</div>
      <table>
        <tr>
          <td class="header-cell" style="width:25%;">Material:</td>
          <td colspan="3" class="data-field">${escapeHtml(data['material'] || '')}</td>
        </tr>
        <tr>
          <td class="header-cell">Identificação do animal:</td>
          <td class="data-field" style="width:35%;">${escapeHtml(data['identificacao-animal'] || '')}</td>
          <td class="header-cell" style="width:15%;">Idade:</td>
          <td class="data-field">${escapeHtml(data['idade'] || '')}</td>
        </tr>
        <tr>
          <td class="header-cell">Espécie:</td>
          <td class="data-field">${escapeHtml(data['especie'] || '')}</td>
          <td class="header-cell">Raça:</td>
          <td class="data-field">${escapeHtml(data['raca'] || '')}</td>
        </tr>
        <tr>
          <td class="header-cell">Sexo:</td>
          <td colspan="3" class="data-field">${escapeHtml(data['sexo'] || '')}</td>
        </tr>
        <tr>
          <td class="header-cell">Data da coleta:</td>
          <td colspan="3" class="data-field">${escapeHtml(formatDateBR(data['data-coleta']) || '')}</td>
        </tr>
      </table>
    </div>

    <!-- Métodos -->
    <div style="margin-top:15px;">
      <div style="font-weight:bold;margin-bottom:5px;">Método: marque o(s) exame(s) a ser(em) realizado(s)</div>
      <table>
        <tr>
          <td class="checkbox">${getCheckbox(exames.includes('Cultura em aerobiose'))}</td>
          <td style="width:45%;">Cultura em aerobiose</td>
          <td class="checkbox">${getCheckbox(exames.includes('Cultura em anaerobiose'))}</td>
          <td>Cultura em anaerobiose</td>
        </tr>
        <tr>
          <td class="checkbox">${getCheckbox(exames.includes('Antibiograma (disco-difusão)'))}</td>
          <td>Antibiograma (disco-difusão)</td>
          <td class="checkbox">${getCheckbox(exames.includes('Cultura em microaerobiose'))}</td>
          <td>Cultura em microaerobiose</td>
        </tr>
        <tr>
          <td class="checkbox">${getCheckbox(exames.includes('Bacterioscopia'))}</td>
          <td>Bacterioscopia</td>
          <td class="checkbox">${getCheckbox(exames.includes('Contagem bacteriana no leite'))}</td>
          <td>Contagem bacteriana no leite</td>
        </tr>
        <tr>
          <td class="checkbox">${getCheckbox(exames.includes('PCR (informe o agente)'))}</td>
          <td colspan="3">PCR (informe o agente): <span class="data-field">${escapeHtml(data['met-pcr-agente'] || '')}</span></td>
        </tr>
      </table>
    </div>

    <!-- Histórico -->
    <div style="margin-top:15px;">
      <div style="font-weight:bold;margin-bottom:5px;">Histórico</div>
      <table>
        <tr>
          <td style="width:60%;">O animal recebeu antibiótico há menos de 7 dias?</td>
          <td class="checkbox">${getCheckbox(data['antibiotico-7d'] === 'sim')}</td>
          <td style="width:15%;">Sim</td>
          <td class="checkbox">${getCheckbox(data['antibiotico-7d'] === 'nao')}</td>
          <td style="width:15%;">Não</td>
        </tr>
        <tr>
          <td colspan="5">Se recebeu antibiótico, qual o princípio ativo? <span class="data-field">${escapeHtml(data['principio-ativo'] || '')}</span></td>
        </tr>
        <tr>
          <td>Há mais animais na propriedade com os mesmos sinais clínicos?</td>
          <td class="checkbox">${getCheckbox(data['mais-animais'] === 'sim')}</td>
          <td>Sim</td>
          <td class="checkbox">${getCheckbox(data['mais-animais'] === 'nao')}</td>
          <td>Não</td>
        </tr>
        <tr>
          <td colspan="5" style="height:80px;vertical-align:top;">
            <div style="font-weight:bold;margin-bottom:5px;">Detalhe o histórico do caso e inclua observações importantes:</div>
            <div class="data-field" style="white-space:pre-wrap;">${escapeHtml(data['historico-detalhado'] || '')}</div>
          </td>
        </tr>
      </table>
    </div>

    <!-- Rodapé -->
    <div style="position:absolute;bottom:10mm;right:15mm;font-size:10px;">
      Página 1 de 1
    </div>
  </div>
  
  <div style="position:fixed;left:8px;top:8px;z-index:9999;" class="no-print">
    <button onclick="window.print()" style="padding:8px 12px;margin-right:8px;background:#007bff;color:white;border:none;border-radius:4px;cursor:pointer;">🖨️ Imprimir</button>
    <button onclick="window.close()" style="padding:8px 12px;background:#6c757d;color:white;border:none;border-radius:4px;cursor:pointer;">✖ Fechar</button>
  </div>
</body>
</html>`;

  return html;
}

// Pequena função de escape para evitar injeção no HTML
function escapeHtml(s){
  if(!s) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// Verificação de usuário ativo/inativo
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "../../index.html";
        return;
    }
    
    try {
        // Verificar se usuário está ativo
        const userDoc = await getDoc(doc(db, "usuarios", user.uid));
        if (userDoc.exists()) {
            const userData = userDoc.data();
            if (userData.ativo === false) {
                console.log("Usuário inativo detectado, redirecionando...");
                window.location.href = "../desativado.html";
                return;
            }
        }
    } catch (error) {
        console.error("Erro ao verificar status do usuário:", error);
    }
});
