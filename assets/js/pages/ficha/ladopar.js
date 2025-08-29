import { signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";
import { getDoc, doc } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js";
import { app, auth, db } from "../../../js/firebase.js";

// Firebase via módulo compartilhado

document.addEventListener('DOMContentLoaded', function () {
  console.log("Página LADOPAR carregada");
  
  // Render otimista similar às outras páginas; onAuthStateChanged fará a validação
  const usuario = JSON.parse(localStorage.getItem("usuario") || sessionStorage.getItem("usuario") || '{}');
  if (usuario?.nome) {
    const userNameElement = document.querySelector('.user-name');
    if (userNameElement) userNameElement.textContent = usuario.nome;
    if (usuario.role === 'admin') {
      const adminButton = document.getElementById('admin-button');
      if (adminButton) {
        adminButton.style.display = 'flex';
        adminButton.addEventListener('click', function() {
          window.location.href = '../admin.html';
        });
      }
    }
    const userActions = document.querySelector('.user-actions');
    if (userActions) userActions.style.display = 'flex';
  }

  // Preencher automaticamente DATA e HORA se estiverem vazios
  try {
    const now = new Date();
    const hojeISO = now.toISOString().split('T')[0]; // yyyy-mm-dd
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const horaNow = `${hh}:${mm}`; // HH:MM

    const dataEl = document.getElementById('data');
    if (dataEl && !dataEl.value) dataEl.value = hojeISO;

    const horaEl = document.getElementById('hora');
    if (horaEl && !horaEl.value) horaEl.value = horaNow;
  } catch (e) {
    console.warn('[LADOPAR] Não foi possível auto-preencher data/hora:', e);
  }

  // Configurar botão de logout
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
      fichaData.laboratorio = 'LADOPAR';
      
      console.log('Dados da ficha:', fichaData);
      
      // Aqui você pode implementar o salvamento no Firebase
      salvarFicha(fichaData);
    });
  }

  // Event listener para o botão de visualizar impressão
  const visualizarBtn = document.getElementById('visualizarImpressaoLadopar');
  if (visualizarBtn) {
    visualizarBtn.addEventListener('click', function() {
      imprimirFicha();
    });
  }
});

// Função para salvar a ficha
async function salvarFicha(fichaData) {
  try {
    // Mostrar loading
    const submitBtn = document.querySelector('.btn-primary');
    if (submitBtn) {
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
        const fichaForm = document.getElementById('ficha-form');
        if (fichaForm) {
          fichaForm.reset();
        }
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
        submitBtn.style.backgroundColor = '';
      }, 1000);
    }
    
  } catch (error) {
    console.error('Erro ao salvar ficha:', error);
    alert('Erro ao salvar a ficha. Tente novamente.');
    
    // Restaurar botão
    const submitBtn = document.querySelector('.btn-primary');
    if (submitBtn) {
      submitBtn.innerHTML = '<i class="bi bi-check-lg"></i> Salvar Ficha';
      submitBtn.disabled = false;
    }
  }
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

// Helper para escapar HTML
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text ? text.replace(/[&<>"']/g, m => map[m]) : '';
}

// Função para coletar dados do formulário LADOPAR
function collectLadoparFormData() {
  const getValue = (id) => {
    const element = document.getElementById(id);
    return element ? element.value : '';
  };
  
  const getChecked = (id) => {
    const element = document.getElementById(id);
    return element ? element.checked : false;
  };
  
  const getRadioValue = (name) => {
    const radio = document.querySelector(`input[name="${name}"]:checked`);
    return radio ? radio.value : '';
  };
  
  const getCheckboxValues = (name) => {
    const checkboxes = document.querySelectorAll(`input[name="${name}"]:checked`);
    return Array.from(checkboxes).map(cb => cb.value);
  };

  return {
    // Cabeçalho
    'data': getValue('data'),
    'hora': getValue('hora'),
    'ldp': getValue('ldp'),
    
    // Médico Veterinário
    'medico-nome': getValue('medico-nome'),
    'medico-crmv': getValue('medico-crmv'),
    'medico-email': getValue('medico-email'),
    'medico-telefone': getValue('medico-telefone'),
    'medico-cpf': getValue('medico-cpf'),
    
    // Proprietário ou Responsável
    'proprietario-nome': getValue('proprietario-nome'),
    'proprietario-telefone': getValue('proprietario-telefone'),
    'proprietario-email': getValue('proprietario-email'),
    'proprietario-municipio': getValue('proprietario-municipio'),
    'proprietario-cpf': getValue('proprietario-cpf'),
    
    // Informações das Amostras
    'amostra-especie': getValue('amostra-especie'),
    'amostra-nome': getValue('amostra-nome'),
    'amostra-idade': getValue('amostra-idade'),
    'amostra-sexo': getValue('amostra-sexo'),
    'amostra-raca': getValue('amostra-raca'),
    'amostra-tipo': getValue('amostra-tipo'),
    'amostra-total': getValue('amostra-total'),
    'data-coleta': getValue('data-coleta'),
    'historico-clinico': getValue('historico-clinico'),
    
    // Detecção de Anticorpos - Sorologia
    'sorologia': getCheckboxValues('sorologia'),
    
    // Coproparasitológicos
    'coproparasitologicos': getCheckboxValues('coproparasitologicos'),
    
    // Pesquisa Direta
    'pesquisa-direta': getCheckboxValues('pesquisa-direta'),
    
    // Biocarrapaticidograma
    'biocarrapaticidograma': getCheckboxValues('biocarrapaticidograma'),
    
    // PCR - Biologia Molecular
    'pcr': getCheckboxValues('pcr')
  };
}

// Helper para construir opções de PCR
function buildPCROptions(data) {
  return `
    <tr>
      <td>${getCheckbox('Babesia bovis (bovinos)', data.pcr)} Babesia bovis (bovinos)</td>
      <td>Sangue total (tubo roxo), líquor, encéfalo, tecidos fetais, baço e fígado.</td>
    </tr>
    <tr>
      <td>${getCheckbox('Babesia bigemina (bovinos)', data.pcr)} Babesia bigemina (bovinos)</td>
      <td>Sangue total (tubo roxo), líquor, encéfalo, tecidos fetais, baço e fígado.</td>
    </tr>
    <tr>
      <td>${getCheckbox('Cryptosporidium spp.', data.pcr)} Cryptosporidium spp.</td>
      <td>Fezes, suabe retal, fragmento intestinal ou água.</td>
    </tr>
    <tr>
      <td>${getCheckbox('Giardia duodenalis', data.pcr)} Giardia duodenalis</td>
      <td>Fezes, suabe retal, fragmento intestinal ou água.</td>
    </tr>
    <tr>
      <td>${getCheckbox('Leishmania spp.', data.pcr)} Leishmania spp.</td>
      <td>Sangue total (tubo roxo), aspirado de linfonodo, medula óssea, baço, pele (com lesão), linfonodo e fígado.</td>
    </tr>
    <tr>
      <td>${getCheckbox('Neospora spp.', data.pcr)} Neospora spp.</td>
      <td>Sangue total (tubo roxo), placenta, líquidos fetais, encéfalo, coração e fígado.</td>
    </tr>
    <tr>
      <td>${getCheckbox('Rickettsia spp.', data.pcr)} Rickettsia spp.</td>
      <td>Sangue total (tubo roxo).</td>
    </tr>
    <tr>
      <td>${getCheckbox('Sarcocystis spp.', data.pcr)} Sarcocystis spp.</td>
      <td>Sangue total (tubo roxo), músculo esquelético, líquor, encéfalo e coração.</td>
    </tr>
    <tr>
      <td>${getCheckbox('Toxoplasma gondii', data.pcr)} Toxoplasma gondii</td>
      <td>Sangue total (tubo roxo), placenta, líquidos fetais, encéfalo, coração e fígado ou água.</td>
    </tr>
    <tr>
      <td>${getCheckbox('Trypanosoma spp.', data.pcr)} Trypanosoma spp.</td>
      <td>Sangue total (tubo roxo), encéfalo, coração, fígado e baço.</td>
    </tr>
    <tr>
      <td>${getCheckbox('Trypanosoma evansi', data.pcr)} Trypanosoma evansi</td>
      <td>Sangue total (tubo roxo), encéfalo, coração, fígado e baço.</td>
    </tr>
    <tr>
      <td>${getCheckbox('Trypanosoma cruzi', data.pcr)} Trypanosoma cruzi</td>
      <td>Sangue total (tubo roxo), encéfalo, coração, fígado e baço.</td>
    </tr>
    <tr>
      <td colspan="2">${getCheckbox('Nested-PCR e restrição enzimática para detecção simultânea de Neospora caninum/Toxoplasma gondii e Sarcocystis spp.', data.pcr)} Nested-PCR e restrição enzimática para detecção simultânea de Neospora caninum/Toxoplasma gondii e Sarcocystis spp.</td>
    </tr>
  `;
}

// Helper function for checkboxes
function getCheckbox(value, array) {
  return array && array.includes && array.includes(value) ? '☑' : '☐';
}

// Helper: construir HTML de impressão para ficha LADOPAR (2 páginas)
function buildLadoparPrintHTML(data) {
  const logoLADOPAR = '../../assets/images/logo-LADOPAR.png';
  const logoUFSM = '../../assets/images/logo-ufsm.png';
  
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

  const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>LADOPAR - Ficha de Requisição de Testes de Diagnóstico</title>
<style>
  html,body{margin:0;padding:0;height:100%;font-family:Arial,sans-serif;font-size:14px;color:#000}
  .page{width:210mm;height:297mm;margin:0 auto;background:#fff;position:relative;padding:10mm;box-sizing:border-box;page-break-after:always}
  .page:last-child{page-break-after:auto}
  table{border-collapse:collapse;width:100%;margin-bottom:8px}
  td{border:1px solid #000;padding:6px;vertical-align:middle}
  .no-border{border:none !important}
  
  /* Section headers like in the photo */
  .header-blue{background:#5B9BD5;color:white;font-weight:700;text-align:center;padding:8px 6px;font-size:14px}
  .header-cell{background:#ffffff;font-weight:700;padding:6px;border-top:0;font-size:12px}
  .data-field{color:#000;font-weight:400;min-height:24px;font-size:12px}

  .checkbox{text-align:center;width:20px;font-size:16px}
  .center{text-align:center}
  .bold{font-weight:700}
  .small{font-size:11px}
  @media print{ .no-print{display:none} body{margin:0} .page{margin:0;padding:8mm} }
</style>
</head>
<body>
  <!-- PÁGINA 1 -->
  <div class="page">
    <!-- Cabeçalho com logos reais -->
    <table style="border:none;margin-bottom:10px;">
      <tr>
        <td class="no-border" style="width:160px;padding:0;vertical-align:middle">
          <img src="${logoLADOPAR}" style="height:150px;width:auto;object-fit:contain;">
        </td>
        <td class="no-border center" style="padding:10px;vertical-align:middle">
          <div style="font-size:16px;font-weight:bold;margin-bottom:6px;">LADOPAR - LABORATÓRIO DE DOENÇAS PARASITÁRIAS</div>
          <div style="font-size:12px;margin-bottom:4px;">DEPARTAMENTO DE MEDICINA VETERINÁRIA PREVENTIVA - CCR / UFSM</div>
          <div style="font-size:14px;font-weight:bold;background:#e6e6e6;padding:6px;border-radius:4px;">FICHA DE REQUISIÇÃO DE TESTES DE DIAGNÓSTICO</div>
        </td>
        <td class="no-border" style="width:160px;padding:0;text-align:right;vertical-align:middle">
          <img src="${logoUFSM}" style="height:150px;width:auto;object-fit:contain;">
        </td>
      </tr>
    </table>

    <!-- Dados iniciais -->
    <table style="margin-bottom:8px;">
      <tr>
        <td class="header-cell" style="width:15%;">DATA</td>
        <td class="data-field" style="width:25%;">${escapeHtml(formatDateBR(data['data']) || '')}</td>
        <td class="header-cell" style="width:15%;">HORA</td>
        <td class="data-field" style="width:20%;">${escapeHtml(data['hora'] || '')}</td>
        <td class="header-cell" style="width:15%;">LDP</td>
        <td class="data-field" style="width:10%;">${escapeHtml(data['ldp'] || '')}</td>
      </tr>
    </table>

    <!-- Médico Veterinário -->
    <table style="margin-bottom:8px;">
      <tr>
        <td class="header-blue" colspan="4">MÉDICO VETERINÁRIO</td>
      </tr>
      <tr>
        <td class="header-cell" style="width:15%;">NOME</td>
        <td class="data-field" style="width:45%;">${escapeHtml(data['medico-nome'] || '')}</td>
        <td class="header-cell" style="width:15%;">CRMV</td>
        <td class="data-field" style="width:25%;">${escapeHtml(data['medico-crmv'] || '')}</td>
      </tr>
      <tr>
        <td class="header-cell">E-MAIL</td>
        <td class="data-field">${escapeHtml(data['medico-email'] || '')}</td>
        <td class="header-cell">TELEFONE</td>
        <td class="data-field">${escapeHtml(data['medico-telefone'] || '')}</td>
      </tr>
      <tr>
        <td class="header-cell">CPF</td>
        <td class="data-field" colspan="3">${escapeHtml(data['medico-cpf'] || '')}</td>
      </tr>
    </table>

    <!-- Proprietário ou Responsável -->
    <table style="margin-bottom:8px;">
      <tr>
        <td class="header-blue" colspan="4">PROPRIETÁRIO OU RESPONSÁVEL</td>
      </tr>
      <tr>
        <td class="header-cell" style="width:15%;">NOME</td>
        <td class="data-field" style="width:55%;">${escapeHtml(data['proprietario-nome'] || '')}</td>
        <td class="header-cell" style="width:15%;">TELEFONE</td>
        <td class="data-field">${escapeHtml(data['proprietario-telefone'] || '')}</td>
      </tr>
      <tr>
        <td class="header-cell">E-MAIL</td>
        <td class="data-field">${escapeHtml(data['proprietario-email'] || '')}</td>
        <td class="header-cell">MUNICÍPIO</td>
        <td class="data-field">${escapeHtml(data['proprietario-municipio'] || '')}</td>
      </tr>
      <tr>
        <td class="header-cell">CPF</td>
        <td class="data-field" colspan="3">${escapeHtml(data['proprietario-cpf'] || '')}</td>
      </tr>
    </table>

    <!-- Informações das Amostras -->
    <table style="margin-bottom:8px;">
      <tr>
        <td class="header-blue" colspan="8">INFORMAÇÕES DAS AMOSTRAS</td>
      </tr>
      <tr>
        <td class="header-cell" style="width:12%;">ESPÉCIE</td>
        <td class="data-field" style="width:13%;">${escapeHtml(data['amostra-especie'] || '')}</td>
        <td class="header-cell" style="width:12%;">NOME</td>
        <td class="data-field" style="width:13%;">${escapeHtml(data['amostra-nome'] || '')}</td>
        <td class="header-cell" style="width:10%;">IDADE</td>
        <td class="data-field" style="width:12%;">${escapeHtml(data['amostra-idade'] || '')}</td>
        <td class="header-cell" style="width:10%;">SEXO</td>
        <td class="data-field" style="width:18%;">${escapeHtml(data['amostra-sexo'] || '')}</td>
      </tr>
      <tr>
        <td class="header-cell">RAÇA</td>
        <td class="data-field" colspan="3">${escapeHtml(data['amostra-raca'] || '')}</td>
        <td class="header-cell">TIPO DE AMOSTRA</td>
        <td class="data-field" colspan="3">${escapeHtml(data['amostra-tipo'] || '')}</td>
      </tr>
      <tr>
        <td class="header-cell">DATA DA COLETA</td>
        <td class="data-field" colspan="3">${escapeHtml(formatDateBR(data['data-coleta']) || '')}</td>
        <td class="header-cell">TOTAL DE AMOSTRAS</td>
        <td class="data-field" colspan="3">${escapeHtml(data['amostra-total'] || '')}</td>
      </tr>
      <tr>
        <td class="header-cell">HISTÓRICO CLÍNICO</td>
        <td class="data-field" colspan="7" style="height:35px;vertical-align:top;">${escapeHtml(data['historico-clinico'] || '')}</td>
      </tr>
    </table>

    <!-- Detecção de Anticorpos - Sorologia -->
    <table style="margin-bottom:6px;">
      <tr>
        <td class="header-blue" colspan="4">DETECÇÃO DE ANTICORPOS – SOROLOGIA</td>
      </tr>
      <tr>
        <td style="width:25%;padding:8px;">
          ${getCheckbox('Leishmania spp.', data.sorologia)} Leishmania spp.<br>
          ${getCheckbox('Neospora spp.', data.sorologia)} Neospora spp.<br>
          ${getCheckbox('Toxoplasma gondii', data.sorologia)} Toxoplasma gondii
        </td>
        <td style="width:25%;padding:8px;">
          ${getCheckbox('Sarcocystis spp.', data.sorologia)} Sarcocystis spp.<br>
          ${getCheckbox('Trypanosoma spp.', data.sorologia)} Trypanosoma spp.
        </td>
        <td style="width:25%;padding:8px;">
          ${getCheckbox('RIFI simples', data.sorologia)} RIFI simples<br>
          ${getCheckbox('RIFI titulação', data.sorologia)} RIFI titulação
        </td>
        <td style="width:25%;"></td>
      </tr>
      <tr>
        <td colspan="4" class="small">Amostra necessária: Soro (tubo vermelho)</td>
      </tr>
    </table>

    <!-- Coproparasitológicos -->
    <table style="margin-bottom:6px;">
      <tr>
        <td class="header-blue" colspan="6">COPROPARASITOLÓGICOS</td>
      </tr>
      <tr>
        <td style="width:33%;padding:8px;">
          ${getCheckbox('OPG', data.coproparasitologicos)} OPG<br>
          ${getCheckbox('Centrífugo flutuação (Faust / Willis Mollay)', data.coproparasitologicos)} Centrífugo flutuação<br>
          ${getCheckbox('Sedimentação (Tremátoda e Cestoda)', data.coproparasitologicos)} Sedimentação
        </td>
        <td style="width:33%;padding:8px;">
          ${getCheckbox('Coprocultura', data.coproparasitologicos)} Coprocultura<br>
          ${getCheckbox('Baermann (parasitas pulmonares)', data.coproparasitologicos)} Baermann<br>
          ${getCheckbox('Pesquisa de Giardia sp. (3 coletas consecutivas em dias alternados)', data.coproparasitologicos)} Pesquisa de Giardia sp.
        </td>
        <td style="width:34%;padding:8px;">
          ${getCheckbox('Silvestres e aves', data.coproparasitologicos)} Silvestres e aves<br>
          ${getCheckbox('Pesquisa de Cryptosporidium spp.', data.coproparasitologicos)} Pesquisa de Cryptosporidium spp.
        </td>
      </tr>
      <tr>
        <td colspan="3" class="small">Amostra necessária: Fezes frescas e mantidas sob refrigeração por até 48h.</td>
      </tr>
    </table>

    <!-- Pesquisa Direta -->
    <table style="margin-bottom:6px;">
      <tr>
        <td class="header-blue" colspan="3">PESQUISA DIRETA</td>
      </tr>
      <tr>
        <td style="width:100%;padding:8px;">
          ${getCheckbox('Pesquisa de Hemoparasitas', data['pesquisa-direta'])} Pesquisa de Hemoparasitas
        </td>
      </tr>
      <tr>
        <td class="small">Amostra necessária: Sangue total (tubo roxo) mantidas sob refrigeração por até 24h.</td>
      </tr>
    </table>

    <!-- Biocarrapaticidograma -->
    <table style="margin-bottom:6px;">
      <tr>
        <td class="header-blue" colspan="6">BIOCARRAPATICIDOGRAMA</td>
      </tr>
      <tr>
        <td style="width:16.66%;padding:8px;">
          ${getCheckbox('Amitraz', data.biocarrapaticidograma)} Aspersin<br>
          ${getCheckbox('Carbazol', data.biocarrapaticidograma)} Carbeson<br>
          ${getCheckbox('Carvet', data.biocarrapaticidograma)} Carvet<br>
          ${getCheckbox('Colosso', data.biocarrapaticidograma)} Colosso
        </td>
        <td style="width:16.66%;padding:8px;">
          ${getCheckbox('Colosso FC30', data.biocarrapaticidograma)} Colosso FC30<br>
          ${getCheckbox('Couro Limpo', data.biocarrapaticidograma)} Couro Limpo<br>
          ${getCheckbox('Cyperclor Plus', data.biocarrapaticidograma)} Cyperclor Plus<br>
          ${getCheckbox('Cypermil', data.biocarrapaticidograma)} Cypermil<br>
          
        </td>
        <td style="width:16.66%;padding:8px;">
          ${getCheckbox('Ectobat 80', data.biocarrapaticidograma)} Ectobat 80<br>
          ${getCheckbox('Ectofós', data.biocarrapaticidograma)} Ectofós<br>
          ${getCheckbox('Flytton EC50', data.biocarrapaticidograma)} Flytton EC50<br>
          ${getCheckbox('Ibatox', data.biocarrapaticidograma)} Ibatox<br>
        </td>
        <td style="width:16.66%;padding:8px;">
          ${getCheckbox('Nokalt', data.biocarrapaticidograma)} Nokalt<br>
          ${getCheckbox('Potenty', data.biocarrapaticidograma)} Potenty<br>
          ${getCheckbox('Supokill 50', data.biocarrapaticidograma)} Supokill 50<br>
          ${getCheckbox('TexVet Max', data.biocarrapaticidograma)} TexVet Max
        </td>
        <td style="width:16.66%;padding:8px;">
          ${getCheckbox('Triatox', data.biocarrapaticidograma)} Triatox<br>
          ${getCheckbox('Zion', data.biocarrapaticidograma)} Zion
        </td>
        
      </tr>
      <tr>
        <td colspan="6" class="small">Amostra necessária: Teleóginas ingurgitadas e mantidas sob refrigeração por até 48h (mínimo 150 teleóginas).</td>
      </tr>
    </table>

   
  </div>

  <!-- PÁGINA 2 -->
  <div class="page">
    <!-- Cabeçalho página 2 -->
    <table style="border:none;margin-bottom:10px;">
      <tr>
        <td class="no-border" style="width:160px;padding:0;">
          <img src="${logoLADOPAR}" style="height:150px;width:auto;object-fit:contain;">
        </td>
        <td class="no-border center" style="padding:8px;">
          <div style="font-size:14px;font-weight:bold;">FICHA DE REQUISIÇÃO DE TESTES DE DIAGNÓSTICO</div>
        </td>
        <td class="no-border" style="width:160px;padding:0;text-align:right;">
          <img src="${logoUFSM}" style="height:150px;width:auto;object-fit:contain;">
        </td>
      </tr>
    </table>

    <!-- Biologia Molecular - PCR Completo -->
    <table style="margin-bottom:8px;">
      <tr>
        <td class="header-blue" colspan="2">BIOLOGIA MOLECULAR - PCR</td>
      </tr>
      <tr>
        <td class="header-cell" style="width:30%;">Agente etiológico:</td>
        <td class="header-cell">Material recomendado: Sangue total (tubo roxo)</td>
      </tr>
      ${buildPCROptions(data)}
    </table>

    <!-- Assinatura -->
    <div style="margin-top:40px;">
      <div style="text-align:center;">
        <div style="border-top:1px solid #000;width:350px;margin:0 auto;padding-top:8px;font-size:13px;">
          Assinatura do Médico Veterinário Responsável
        </div>
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

// Função para imprimir ficha LADOPAR
function imprimirFicha() {
  try {
    const data = collectLadoparFormData();
    const printHTML = buildLadoparPrintHTML(data);
    
    // Abrir nova janela com dimensões específicas para forçar janela em vez de guia
    const printWindow = window.open('', '_blank', 'width=1000,height=800,scrollbars=yes,resizable=yes,toolbar=no,menubar=no,location=no,status=no');
    if (!printWindow) { 
      alert('Não foi possível abrir a janela de visualização. Verifique bloqueadores de pop-up.'); 
      return; 
    }
    printWindow.document.open();
    printWindow.document.write(printHTML);
    printWindow.document.close();
  } catch (err) {
    console.error('Erro ao gerar preview LADOPAR:', err);
    alert('Erro ao gerar preview. Veja console para detalhes.');
  }
}
