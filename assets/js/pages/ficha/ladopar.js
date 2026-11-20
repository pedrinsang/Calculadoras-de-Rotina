import { signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";
import { getDoc, doc } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js";
import { app, auth, db } from "../../../js/firebase.js";

// Firebase via módulo compartilhado

document.addEventListener('DOMContentLoaded', function () {
  atualizarExamesLadopar2026();
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

const examesPCR2026 = [
  ['PCR CONVENCIONAL (Reação única)', 'Anaplasma spp.', 'Sangue total, medula óssea, fragmentos de baço ou linfonodos.'],
  ['PCR CONVENCIONAL (Reação única)', 'Babesia spp.', 'Sangue total, medula óssea, fragmentos de baço ou linfonodos.'],
  ['PCR CONVENCIONAL (Reação única)', 'Leishmania spp.', 'Aspirado de linfonodo, medula, sangue total, pele e tecidos.'],
  ['PCR CONVENCIONAL (Reação única)', 'Neospora caninum', 'Fragmentos de tecido fetal, placenta e tecidos do sistema nervoso.'],
  ['PCR CONVENCIONAL (Reação única)', 'Rickettsia spp.', 'Sangue total, medula óssea, fragmentos de baço ou linfonodos.'],
  ['PCR CONVENCIONAL (Reação única)', 'Sarcocystis spp. (exceto S. neurona)', 'Líquor, encéfalo, pulmão, coração, diafragma ou tecido muscular.'],
  ['PCR CONVENCIONAL (Reação única)', 'Toxoplasma gondii', 'Líquido amniótico, líquor, sangue total, placenta, tecido do sistema nervoso ou água (*).'],
  ['PCR CONVENCIONAL (Reação única)', 'Trypanosoma spp.', 'Sangue total, líquor, encéfalo, coração, baço ou fígado.'],
  ['PCR CONVENCIONAL (Reação única)', 'Trypanosoma cruzi', 'Sangue total, líquor, encéfalo, coração, baço ou fígado.'],
  ['PCR CONVENCIONAL (Reação única)', 'Trypanosoma evansi (Caninos e equinos)', 'Sangue total, líquor, encéfalo, coração, baço ou fígado.'],
  ['PCR SEMI-NESTED / NESTED (Duas reações)', 'Cryptosporidium spp.', 'Fezes congeladas ou fragmento intestinal.'],
  ['PCR SEMI-NESTED / NESTED (Duas reações)', 'Giardia spp.', 'Fezes congeladas ou fragmento intestinal.'],
  ['PCR SEMI-NESTED / NESTED (Duas reações)', 'Sarcocystis neurona (MEP – equinos)', 'Líquor, encéfalo, coração, pulmão e tecidos do sistema nervoso.'],
  ['PCR SEMI-NESTED / NESTED (Duas reações)', 'Trypanosoma vivax (Bovinos)', 'Sangue total, líquor, encéfalo, coração, baço ou fígado.'],
  ['PCR MULTIPLEX', 'Babesia bovis, Babesia bigemina e Anaplasma marginale (Bovinos)', 'Sangue total e fragmentos de encéfalo.'],
  ['PCR NESTED (2 reações) + RFLP', 'Neospora caninum, Toxoplasma gondii, Sarcocystis neurona e Sarcocystis spp.', 'Líquor, encéfalo, coração, pulmão, placenta e tecidos fetais.']
];

function atualizarExamesLadopar2026() {
  const montar = (name, prefix, itens) => itens.map((item, i) => `<div class="checkbox-item"><input type="checkbox" id="${prefix}-${i}" name="${name}" value="${item}"><label for="${prefix}-${i}">${item}</label></div>`).join('');
  const copro = document.querySelector('.coproparasitologicos-section .checkbox-grid');
  if (copro) copro.innerHTML = montar('coproparasitologicos', 'copro-2026', ['OPG','Coprocultura','Baermann (parasitas pulmonares)','Pesquisa de Giardia spp. (Faust - 3 coletas consecutivas em dias alternados)','Centrífugo flutuação (Faust/Willis Mollay)','Pesquisa de Cryptosporidium spp.','Sedimentação (Trematoda e Cestoda)','Pesquisa de Giardia + Endoparasitos']);
  const direta = document.querySelector('.pesquisa-direta-section .checkbox-grid');
  if (direta) direta.innerHTML = montar('pesquisa-direta', 'direta-2026', ['Pesquisa de Hemoparasitas (Bovinos)']);
  const bio = document.querySelector('.biocarrapaticidograma-section .checkbox-grid');
  if (bio) bio.innerHTML = montar('biocarrapaticidograma', 'bio-2026', ['Aspersin','Carbeson','Carvet','Colosso','Colosso FC30','Couro Limpo','Cyperclor Plus','Cypermeit','Flytion EC50','Ibatox','Nokalt','Potenty','Texvet Max','Triatox','Butox']);
  const pcr = document.querySelector('.pcr-section');
  if (pcr) pcr.innerHTML = `<h3 class="section-title">BIOLOGIA MOLECULAR</h3>${examesPCR2026.map(([grupo, agente, material], i) => `<div class="pcr-option"><div class="pcr-type">${grupo}</div><div class="checkbox-item"><input type="checkbox" id="pcr-2026-${i}" name="pcr" value="${agente}"><label for="pcr-2026-${i}"><strong>${agente}</strong><span>${material}</span></label></div></div>`).join('')}<p class="sample-note">Observações: tubo de tampa roxa: sangue total, medula óssea e líquor; microtubo tipo Eppendorf: líquor; saco plástico/frasco estéril: tecidos/fragmentos de órgãos (enviar separadamente, identificando órgão e animal). Enviar sempre refrigerado ou congelado (se for somente PCR). *Amostra de água: consultar o volume. MEP = Mieloencefalite protozoária equina.</p>`;
}

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
  const totais = examesPCR2026.reduce((acc, [grupo]) => ({...acc, [grupo]:(acc[grupo] || 0) + 1}), {});
  const impressos = new Set();
  return examesPCR2026.map(([grupo, agente, material]) => {
    const celulaGrupo = impressos.has(grupo) ? '' : `<td class="pcr-group" rowspan="${totais[grupo]}">${grupo.replace(' / ', '<br>').replace(' (', '<br>(')}</td>`;
    impressos.add(grupo);
    return `<tr>${celulaGrupo}<td>${getCheckbox(agente, data.pcr)} <em>${agente}</em></td><td>${material}</td></tr>`;
  }).join('');
  /* legado anterior a 2026
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
  `; */
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
  @page{size:A4 portrait;margin:0}
  html,body{margin:0;padding:0;font-family:"Times New Roman",serif;font-size:14px;color:#000;background:#ddd}
  .page{width:210mm;height:297mm;margin:8px auto;background:#fff;position:relative;padding:7mm 6mm;box-sizing:border-box;page-break-after:always;overflow:hidden}
  .page:last-child{page-break-after:auto}
  table{border-collapse:separate;border-spacing:0 2px;width:100%;margin-bottom:2px}
  td{border:0;padding:2px 4px;vertical-align:middle}
  .no-border{border:none !important}
  
  /* Section headers like in the photo */
  .header-blue{background:#4472c4;color:#fff;font-weight:700;text-align:center;padding:4px 5px;font-size:14px}
  .header-cell{background:#fff;font-weight:700;padding:2px 3px;font-size:14px;white-space:nowrap}
  .data-field{height:19px;padding:1px 5px;border:1px solid #173f85;border-radius:5px;font:14px Arial,sans-serif}
  .exam-table td{padding:1px 7px;line-height:1.24;font-size:14px}
  .note{text-align:center;font-size:14px;padding:2px}
  .pcr-table{border-collapse:collapse;border-spacing:0;margin-top:10mm}
  .pcr-table td{border:1px solid #000;padding:2px 3px;line-height:1.08;font-size:14px}
  .pcr-table .header-cell{text-align:center;font:700 14px "Times New Roman",serif}
  .pcr-table .pcr-group{text-align:center;font-weight:700;width:17%}

  .checkbox{text-align:center;width:20px;font-size:16px}
  .center{text-align:center}
  .bold{font-weight:700}
  .small{font-size:14px;line-height:1.15}
  @media print{.no-print{display:none}body{background:#fff}.page{margin:0;padding:7mm 6mm}}
</style>
</head>
<body>
  <!-- PÁGINA 1 -->
  <div class="page">
    <!-- Cabeçalho com logos reais -->
    <table style="border:none;margin-bottom:2px;">
      <tr>
        <td class="no-border" style="width:25%;padding:0;vertical-align:middle">
          <img src="${logoLADOPAR}" style="height:15mm;width:auto;object-fit:contain;">
        </td>
        <td class="no-border center" style="padding:10px;vertical-align:middle">
          <div style="font-size:14px;font-weight:bold;background:#ddd;padding:3mm 2mm;white-space:nowrap">FICHA DE REQUISIÇÃO DE TESTES DE DIAGNÓSTICO</div>
        </td>
        <td class="no-border" style="width:17%;padding:0;text-align:center;vertical-align:middle">
          <img src="${logoUFSM}" style="height:16mm;width:auto;object-fit:contain;">
        </td>
      </tr>
    </table>

    <!-- Dados iniciais -->
    <table style="margin-bottom:8px;">
      <tr>
        <td class="header-cell" style="width:15%;">DATA</td>
        <td class="data-field" style="width:25%;">${escapeHtml(formatDateBR(data['data']) || '')}</td>
        <td class="header-cell" style="width:15%;">LDP</td>
        <td class="data-field" style="width:25%;">${escapeHtml(data['ldp'] || '')}</td>
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
    <table class="exam-table" style="margin-bottom:2px;">
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
    <table class="exam-table" style="margin-bottom:2px;">
      <tr>
        <td class="header-blue" colspan="6">COPROPARASITOLÓGICOS</td>
      </tr>
      <tr>
        <td style="width:33%;padding:8px;">
          ${getCheckbox('OPG', data.coproparasitologicos)} OPG<br>
          ${getCheckbox('Centrífugo flutuação (Faust/Willis Mollay)', data.coproparasitologicos)} Centrífugo flutuação (Faust/Willis Mollay)<br>
          ${getCheckbox('Sedimentação (Trematoda e Cestoda)', data.coproparasitologicos)} Sedimentação (Trematoda e Cestoda)<br>
          ${getCheckbox('Pesquisa de Giardia spp. (Faust - 3 coletas consecutivas em dias alternados)', data.coproparasitologicos)} Pesquisa de Giardia spp. (Faust - 3 coletas consecutivas em dias alternados)
        </td>
        <td style="width:33%;padding:8px;">
          ${getCheckbox('Coprocultura', data.coproparasitologicos)} Coprocultura<br>
          ${getCheckbox('Baermann (parasitas pulmonares)', data.coproparasitologicos)} Baermann<br>
          ${getCheckbox('Pesquisa de Giardia + Endoparasitos', data.coproparasitologicos)} Pesquisa de Giardia + Endoparasitos
        </td>
        <td style="width:34%;padding:8px;">
          ${getCheckbox('Pesquisa de Cryptosporidium spp.', data.coproparasitologicos)} Pesquisa de Cryptosporidium spp.
        </td>
      </tr>
      <tr>
        <td colspan="3" class="small">Amostra necessária: Fezes frescas e mantidas sob refrigeração por até 48h.</td>
      </tr>
    </table>

    <!-- Pesquisa Direta -->
    <table class="exam-table" style="margin-bottom:2px;">
      <tr>
        <td class="header-blue" colspan="3">PESQUISA DIRETA</td>
      </tr>
      <tr>
        <td style="width:100%;padding:8px;">
          ${getCheckbox('Pesquisa de Hemoparasitas (Bovinos)', data['pesquisa-direta'])} Pesquisa de Hemoparasitas (Bovinos)
        </td>
      </tr>
      <tr>
        <td class="small">Amostra necessária: Sangue total (tubo roxo) mantidas sob refrigeração por até 24h.</td>
      </tr>
    </table>

    <!-- Biocarrapaticidograma -->
    <table class="exam-table" style="margin-bottom:2px;">
      <tr>
        <td class="header-blue" colspan="6">BIOCARRAPATICIDOGRAMA</td>
      </tr>
      <tr>
        <td style="width:16.66%;padding:8px;">
          ${getCheckbox('Aspersin', data.biocarrapaticidograma)} Aspersin<br>
          ${getCheckbox('Butox', data.biocarrapaticidograma)} Butox<br>
          ${getCheckbox('Carbeson', data.biocarrapaticidograma)} Carbeson<br>
          ${getCheckbox('Carvet', data.biocarrapaticidograma)} Carvet<br>
          ${getCheckbox('Colosso', data.biocarrapaticidograma)} Colosso
        </td>
        <td style="width:16.66%;padding:8px;">
          ${getCheckbox('Colosso FC30', data.biocarrapaticidograma)} Colosso FC30<br>
          ${getCheckbox('Couro Limpo', data.biocarrapaticidograma)} Couro Limpo<br>
          ${getCheckbox('Cyperclor Plus', data.biocarrapaticidograma)} Cyperclor Plus<br>
          ${getCheckbox('Cypermeit', data.biocarrapaticidograma)} Cypermeit<br>
          
        </td>
        <td style="width:16.66%;padding:8px;">
          ${getCheckbox('Flytion EC50', data.biocarrapaticidograma)} Flytion EC50<br>
          ${getCheckbox('Ibatox', data.biocarrapaticidograma)} Ibatox<br>
        </td>
        <td style="width:16.66%;padding:8px;">
          ${getCheckbox('Nokalt', data.biocarrapaticidograma)} Nokalt<br>
          ${getCheckbox('Potenty', data.biocarrapaticidograma)} Potenty<br>
          ${getCheckbox('Texvet Max', data.biocarrapaticidograma)} Texvet Max
        </td>
        <td style="width:16.66%;padding:8px;">
          ${getCheckbox('Triatox', data.biocarrapaticidograma)} Triatox<br>
        </td>
        
      </tr>
      <tr>
        <td colspan="6" class="small">Amostra necessária: Teleóginas ingurgitadas e mantidas sob refrigeração por até 48h (mínimo 150 teleóginas).</td>
      </tr>
    </table>

   
  </div>

  <!-- PÁGINA 2 -->
  <div class="page">
    <div class="header-blue" style="margin-bottom:8mm;font-size:14px">BIOLOGIA MOLECULAR</div>

    <!-- Biologia Molecular - PCR Completo -->
    <table class="pcr-table">
      <tr>
        <td class="header-cell" style="width:22%;">MODALIDADE</td>
        <td class="header-cell" style="width:31%;">AGENTE ETIOLÓGICO</td>
        <td class="header-cell">MATERIAL RECOMENDADO</td>
      </tr>
      ${buildPCROptions(data)}
    </table>
    <p class="small"><strong>Observações:</strong> Tubo tampa roxa: sangue total, medula óssea e líquor; microtubo tipo Eppendorf: líquor; saco plástico/frasco estéril: tecidos/fragmentos de órgãos (enviar separado, identificando órgão e animal). Envio sempre refrigerado ou congelado (se for somente PCR). *Amostra de água: consultar o volume. MEP = Mieloencefalite protozoária equina.</p>

    
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
