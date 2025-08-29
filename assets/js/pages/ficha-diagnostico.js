import { collection, getDocs } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js";
import { db } from "../firebase.js";

document.addEventListener('DOMContentLoaded', function() {
    console.log('[SISTEMA] Página carregada, inicializando sistema...');
    loadSavedData();
    updateTitleDisplay();
    setCurrentDate(); // Preencher data atual
    // Sugerir automaticamente o próximo SV disponível (permite edição manual se necessário)
    generateSVNumber();
    
    // Event listeners
    setupEventListeners();
    console.log('[SISTEMA] Sistema inicializado com sucesso!');
});

function setupEventListeners() {
    // Botão salvar
    const saveBtn = document.getElementById('salvarFicha');
    if (saveBtn) {
        // Não anexar listener que previne o submit padrão — permite que a página que implementa o formulário trate o envio (ex: setor-virologia.js)
        console.log('[SISTEMA] Botão salvar encontrado — usando envio padrão do formulário');
    }

    // Botão limpar
    const clearBtn = document.getElementById('limparFicha');
    if (clearBtn) {
        clearBtn.addEventListener('click', function(event) {
            event.preventDefault();
            clearForm();
        });
    }

    // Botão visualizar impressão
    const previewBtn = document.getElementById('visualizarImpressao');
    if (previewBtn) {
        previewBtn.addEventListener('click', function(event) {
            event.preventDefault();
            showPrintPreview();
        });
        console.log('[SISTEMA] Event listener do botão preview configurado');
    } else {
        console.log('[ERRO] Botão visualizarImpressao não encontrado');
    }

    // --- Live formatting for CPF and Phone inputs (adds listeners if fields exist) ---
    try {
        const cpfIds = ['medico-cpf', 'proprietario-cpf'];
        cpfIds.forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;
            el.addEventListener('input', (e) => {
                const cursor = el.selectionStart || el.value.length;
                const raw = el.value.replace(/\D/g, '');
                el.value = formatCPFInput(raw);
                // move caret to end (simpler and reliable across browsers)
                el.setSelectionRange(el.value.length, el.value.length);
            });
            el.addEventListener('blur', () => {
                el.value = formatCPF(el.value);
            });
        });

        const phoneIds = ['medico-telefone', 'proprietario-telefone'];
        phoneIds.forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;
            el.addEventListener('input', (e) => {
                const raw = el.value.replace(/\D/g, '');
                el.value = formatPhoneInput(raw);
                el.setSelectionRange(el.value.length, el.value.length);
            });
            el.addEventListener('blur', () => {
                el.value = formatPhone(el.value);
            });
        });
    } catch (err) {
        console.warn('[FORMAT] Erro ao anexar formatters:', err);
    }

    console.log('[SISTEMA] Event listeners configurados');
}

// Função de debug para testar a geração HTML
function debugPrintHTML() {
    console.log('[DEBUG] Testando geração de HTML...');
    try {
        const formData = collectFormData();
        console.log('[DEBUG] Form data:', formData);
        
        const html = generateFullHTML(formData);
        console.log('[DEBUG] HTML gerado com sucesso, tamanho:', html.length);
        return true;
    } catch (error) {
        console.error('[DEBUG] Erro:', error);
        return false;
    }
}

// Função para preencher data atual
function setCurrentDate() {
    const hoje = new Date();
    const dataFormatada = hoje.toLocaleDateString('pt-BR'); // DD/MM/YYYY
    
    const dataElement = document.getElementById('data');
    if (dataElement) {
        dataElement.value = dataFormatada;
        console.log('[DATA] Data atual preenchida:', dataFormatada);
    }
}

// Helper: obter maior SV do ano via Firestore
async function obterMaiorSVDoAno(yearSuffix) {
    try {
        const tarefasSnapshot = await getDocs(collection(db, 'tarefas'));
        let maiorNumero = 0;
        tarefasSnapshot.forEach(docSnap => {
            const data = docSnap.data();
            const id = data.id || data.identificacao || data.identificação || '';
            const match = (id || '').toString().match(/SV\s*(\d+)\/(\d{2})/i);
            if (match && match[2] === yearSuffix) {
                const num = parseInt(match[1], 10);
                if (!isNaN(num) && num > maiorNumero) maiorNumero = num;
            }
        });
        return maiorNumero > 0 ? maiorNumero : null;
    } catch (err) {
        if (err && err.code === 'permission-denied') {
            console.warn('[SV] Sem permissão para ler mural (permission-denied). Usando fallback localStorage.');
        } else {
            console.warn('[SV] Erro ao ler tarefas do mural:', err);
        }
        return null;
    }
}

// Função para gerar número SV (consulta o mural quando possível; fallback em localStorage)
async function generateSVNumber() {
    const currentYear = new Date().getFullYear();
    const yearSuffix = currentYear.toString().slice(-2); // Últimos 2 dígitos do ano
    const svElement = document.getElementById('sv');

    // Primeiro, tentar obter o maior SV existente no mural (Firestore)
    const maior = await obterMaiorSVDoAno(yearSuffix);
    if (maior && Number.isInteger(maior)) {
        const proximoNumero = maior + 1;
        const numeroFormatado = proximoNumero.toString().padStart(2, '0');
        if (svElement) svElement.value = `SV ${numeroFormatado}/${yearSuffix}`;
        console.log(`[SV] Próximo número via mural: SV ${numeroFormatado}/${yearSuffix}`);
        localStorage.setItem(`svNumber_${currentYear}`, proximoNumero);
        return;
    }

    // Fallback: usar localStorage (comportamento anterior)
    const svKey = `svNumber_${currentYear}`;
    let svNumber = localStorage.getItem(svKey);
    if (!svNumber) {
        svNumber = 1;
        localStorage.setItem(svKey, svNumber);
    } else {
        svNumber = parseInt(svNumber, 10);
    }
    if (svElement) svElement.value = `SV ${svNumber}/${yearSuffix}`;
    console.log(`[SV] Número atual (fallback localStorage): SV ${svNumber}/${yearSuffix}`);
}

// Função para obter próximo número SV (para quando salvar) — também atualiza com base em mural
async function getNextSVNumber() {
    const currentYear = new Date().getFullYear();
    const yearSuffix = currentYear.toString().slice(-2);
    const svKey = `svNumber_${currentYear}`;

    // Primeiro tentar sincronizar com mural para evitar colisões
    const maior = await obterMaiorSVDoAno(yearSuffix);
    if (maior && Number.isInteger(maior)) {
        const proximo = maior + 1;
        localStorage.setItem(svKey, proximo);
        const numeroFormatado = proximo.toString().padStart(2, '0');
        const svString = `SV ${numeroFormatado}/${yearSuffix}`;
        const svElement = document.getElementById('sv');
        if (svElement) svElement.value = svString;
        console.log(`[SV] getNextSVNumber via mural reservou: ${svString}`);
        return svString;
    }

    // Fallback: incrementar localStorage
    let svNumber = parseInt(localStorage.getItem(svKey) || '0', 10);
    svNumber = svNumber + 1;
    localStorage.setItem(svKey, svNumber);
    const numeroFormatado = svNumber.toString().padStart(2, '0');
    const svString = `SV ${numeroFormatado}/${yearSuffix}`;
    const svElementFinal = document.getElementById('sv');
    if (svElementFinal) svElementFinal.value = svString;
    console.log(`[SV] getNextSVNumber (fallback) reservou: ${svString}`);
    return svString;
}

// Função para atualizar título da página
function updateTitleDisplay() {
    const title = "FICHA DE REQUISIÇÃO DE TESTES DE DIAGNÓSTICO";
    const titleElement = document.querySelector('.page-title');
    if (titleElement) {
        titleElement.textContent = title;
    }
}

// Função para salvar formulário
function saveForm() {
    const formData = collectFormData();

    if (!formData.medico.nome) {
        alert('Por favor, preencha pelo menos o nome do médico veterinário');
        return;
    }

    try {
        // Generate preview of tasks that would be created based on current form selections
        const previewTasks = [];
        const quantidadePadrao = parseInt(formData.amostras?.totalAmostras) || 1;

        // Sorologia / SN
        if (formData.sorologia) {
            if (formData.sorologia.snBvdv) previewTasks.push({ tipo: 'SN', subTipo: 'BVDV' });
            if (formData.sorologia.snBohv2) previewTasks.push({ tipo: 'SN', subTipo: 'IBR' });
            if (formData.sorologia.snEhv1) previewTasks.push({ tipo: 'SN', subTipo: 'EHV-1' });
            if (formData.sorologia.snOutro && formData.sorologia.snOutro.trim()) previewTasks.push({ tipo: 'SN', subTipo: formData.sorologia.snOutro.trim() });
            if (formData.sorologia.elisaLeucose) previewTasks.push({ tipo: 'ELISA', subTipo: 'LEUCOSE' });
        }

        // Antígenos
        if (formData.antigenos) {
            if (formData.antigenos.elisaBvdvPi) previewTasks.push({ tipo: 'ELISA', subTipo: 'BVDV PI' });
        }

        // Cultivo
        if (formData.cultivo) {
            if (formData.cultivo.bvdv) previewTasks.push({ tipo: 'CULTIVO', subTipo: 'BVDV' });
            if (formData.cultivo.bhv1) previewTasks.push({ tipo: 'CULTIVO', subTipo: 'BHV-1' });
            if (formData.cultivo.bhv5) previewTasks.push({ tipo: 'CULTIVO', subTipo: 'BHV-5' });
            if (formData.cultivo.ehv) previewTasks.push({ tipo: 'CULTIVO', subTipo: 'EHV' });
            if (formData.cultivo.outro && formData.cultivo.outro.trim()) previewTasks.push({ tipo: 'CULTIVO', subTipo: formData.cultivo.outro.trim() });
        }

        // Molecular
        if (formData.molecular) {
            const mol = formData.molecular;
            if (mol.pcrBvdv) previewTasks.push({ tipo: 'MOLECULAR', subTipo: 'BVDV' });
            if (mol.pcrBhv1) previewTasks.push({ tipo: 'MOLECULAR', subTipo: 'BHV-1' });
            if (mol.pcrBhv2) previewTasks.push({ tipo: 'MOLECULAR', subTipo: 'BHV-2' });
            if (mol.pcrEctima) previewTasks.push({ tipo: 'MOLECULAR', subTipo: 'ECTIMA' });
            if (mol.pcrEhv1) previewTasks.push({ tipo: 'MOLECULAR', subTipo: 'EHV-1' });
            if (mol.pcrCinomose) previewTasks.push({ tipo: 'MOLECULAR', subTipo: 'CINOMOSE' });
            if (mol.pcrParvovirus) previewTasks.push({ tipo: 'MOLECULAR', subTipo: 'PARVOVÍRUS' });
        }

        // Imunofluorescência (Raiva)
        if (formData.imunofluorescencia) {
            const raiva = formData.imunofluorescencia;
            if (raiva.raivaBovino) previewTasks.push({ tipo: 'RAIVA', subTipo: 'BOVINO' });
            if (raiva.raivaEquino) previewTasks.push({ tipo: 'RAIVA', subTipo: 'EQUINO' });
            if (raiva.raivaCanino) previewTasks.push({ tipo: 'RAIVA', subTipo: 'CANINO' });
            if (raiva.raivaFelino) previewTasks.push({ tipo: 'RAIVA', subTipo: 'FELINO' });
            if (raiva.raivaMorcego) previewTasks.push({ tipo: 'RAIVA', subTipo: 'MORCEGO' });
        }

        // Vacina Papilomatose
        if (formData.papilomatose) {
            if (formData.papilomatose.bovino) previewTasks.push({ tipo: 'VACINA', subTipo: 'PAPILOMATOSE BOVINO' });
            if (formData.papilomatose.equino) previewTasks.push({ tipo: 'VACINA', subTipo: 'PAPILOMATOSE EQUINO' });
            if (formData.papilomatose.canino) previewTasks.push({ tipo: 'VACINA', subTipo: 'PAPILOMATOSE CANINO' });
        }

        if (!previewTasks.length) {
            alert('Nenhum teste selecionado. Marque ao menos um teste para adicionar ao mural.');
            return;
        }

        // Build and show a review modal dynamically
        const modalId = 'ficha-review-modal';
        // remove existing modal if any
        const existing = document.getElementById(modalId);
        if (existing) existing.remove();

        const modal = document.createElement('div');
        modal.id = modalId;
        modal.style.position = 'fixed';
        modal.style.left = '0';
        modal.style.top = '0';
        modal.style.right = '0';
        modal.style.bottom = '0';
        modal.style.background = 'rgba(0,0,0,0.4)';
        modal.style.zIndex = '99999';
        modal.innerHTML = `
            <div style="max-width:820px;margin:60px auto;background:#fff;padding:18px;border-radius:8px;">
                <h3 style="margin-bottom:8px;">Revisar antes de adicionar ao mural</h3>
                <p><strong>Identificação (será gerada como SV):</strong> Será reservado novo SV no momento da confirmação.</p>
                <p><strong>Quantidade de amostras:</strong> ${quantidadePadrao}</p>
                <div style="max-height:320px;overflow:auto;border:1px solid #e6e7ea;padding:8px;margin-bottom:12px;">
                    <ul style="list-style:none;padding-left:0;margin:0;">
                        ${previewTasks.map(t => `<li style="padding:6px 4px;border-bottom:1px solid #f1f1f1;"><strong>${t.tipo}</strong> ${t.subTipo ? ' - '+t.subTipo : ''}</li>`).join('')}
                    </ul>
                </div>
                <div style="display:flex;gap:8px;justify-content:flex-end;">
                    <button id="ficha-review-cancel" style="padding:8px 12px;border-radius:6px;border:1px solid #ccc;background:#fff;">Cancelar</button>
                    <button id="ficha-review-confirm" style="padding:8px 12px;border-radius:6px;border:0;background:#0b4f8a;color:#fff;">Confirmar e adicionar ao mural</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        document.getElementById('ficha-review-cancel').addEventListener('click', () => {
            modal.remove();
        });

    document.getElementById('ficha-review-confirm').addEventListener('click', async () => {
            try {
                // Reserve next SV and use it as identification
        const svNumber = await getNextSVNumber(); // increments and returns string

                // Enfileirar ficha para o mural; include the reserved SV as id
                const muralQueue = JSON.parse(localStorage.getItem('muralQueue') || '[]');
                muralQueue.push({ id: svNumber, data: new Date().toLocaleDateString('pt-BR'), dados: formData });
                localStorage.setItem('muralQueue', JSON.stringify(muralQueue));

                typeof mostrarFeedback !== 'undefined' && mostrarFeedback(`Ficha adicionada ao mural. SV: ${svNumber}`, 'success');
                console.log('[SALVAR->MURAL] Ficha enfileirada para o mural:', formData);

                // Limpar formulário
                const formEl = document.getElementById('formDiagnostico') || document.getElementById('ficha-form') || document.querySelector('form');
                if (formEl && typeof formEl.reset === 'function') {
                    formEl.reset();
                } else {
                    console.warn('[SALVAR->MURAL] formDiagnostico/ficha-form não encontrado — limpando campos manualmente');
                    // Limpeza manual: zera valores de inputs, selects e textareas
                    const inputs = document.querySelectorAll('input, textarea, select');
                    inputs.forEach(el => {
                        if (el.type === 'checkbox' || el.type === 'radio') el.checked = false;
                        else el.value = '';
                    });
                }
                setCurrentDate(); // Preencher nova data
                // Não preencher SV automaticamente após confirmação
            } catch (err) {
                console.error('[SALVAR->MURAL] Erro ao confirmar adição ao mural:', err);
                alert('Erro ao adicionar ao mural: ' + err.message);
            } finally {
                modal.remove();
            }
        });

    } catch (error) {
        console.error('[ERRO] Erro ao preparar adição ao mural:', error);
        alert('Erro ao preparar a ficha. Tente novamente.');
    }
}

// Função para coletar dados do formulário
function collectFormData() {
    return {
        // Dados básicos
        data: document.getElementById('data')?.value || '',
        sv: document.getElementById('sv')?.value || '',
        
        // Dados do médico veterinário
        medico: {
            nome: document.getElementById('medico-nome')?.value || '',
            cpf: document.getElementById('medico-cpf')?.value || '',
            email: document.getElementById('medico-email')?.value || '',
            telefone: document.getElementById('medico-telefone')?.value || ''
        },
        
        // Dados do proprietário
        proprietario: {
            nome: document.getElementById('proprietario-nome')?.value || '',
            cpf: document.getElementById('proprietario-cpf')?.value || '',
            endereco: document.getElementById('proprietario-endereco')?.value || '',
            municipio: document.getElementById('proprietario-municipio')?.value || ''
        },
        
        // Informações das amostras
        amostras: {
            identificacao: document.getElementById('identificacao')?.value || '',
            historicoClintico: document.getElementById('historico-clinico')?.value || '',
            especie: document.getElementById('especie')?.value || '',
            totalAmostras: document.getElementById('total-amostras')?.value || '',
            raca: document.getElementById('raca')?.value || '',
            dataColeta: document.getElementById('data-coleta')?.value || '',
            tipoAmostra: document.getElementById('tipo-amostra')?.value || ''
        },
        
        // Vacinação
        vacinacao: {
            bhv1: document.getElementById('vac-bhv1')?.checked || false,
            bvdv: document.getElementById('vac-bvdv')?.checked || false,
            raiva: document.getElementById('vac-raiva')?.checked || false,
            brucelose: document.getElementById('vac-brucelose')?.checked || false,
            leptospirose: document.getElementById('vac-leptospirose')?.checked || false,
            herpesEquino: document.getElementById('vac-herpes-equino')?.checked || false,
            naoSabe: document.getElementById('vac-nao-sabe')?.checked || false,
            outros: document.getElementById('vac-outros')?.value || ''
        },
        
        // Pesquisa de anticorpos - Sorologia
        sorologia: {
            // Soroneutralização
            snBvdv: document.getElementById('sn-bvdv')?.checked || false,
            snBohv2: document.getElementById('sn-bohv2')?.checked || false,
            snEhv1: document.getElementById('sn-ehv1')?.checked || false,
            snOutro: document.getElementById('sn-outro')?.value || '',
            // ELISA
            elisaLeucose: document.getElementById('elisa-leucose')?.checked || false
        },
        
        // Detecção de antígenos
        antigenos: {
            elisaBvdvPi: document.getElementById('elisa-bvdv-pi')?.checked || false,
            tipoAmostraElisa: document.querySelector('input[name="tipo-amostra-elisa"]:checked')?.value || ''
        },
        
        // Cultivo celular
        cultivo: {
            bvdv: document.getElementById('cultivo-bvdv')?.checked || false,
            bhv1: document.getElementById('cultivo-bhv1')?.checked || false,
            bhv5: document.getElementById('cultivo-bhv5')?.checked || false,
            ehv: document.getElementById('cultivo-ehv')?.checked || false,
            outro: document.getElementById('cultivo-outro')?.value || '',
            // Tipo de amostra para cultivo
            sangueTotalCultivo: document.getElementById('cultivo-sangue-total')?.checked || false,
            suabeNasalCultivo: document.getElementById('cultivo-suabe-nasal')?.checked || false,
            suabeLesaoCultivo: document.getElementById('cultivo-suabe-lesao')?.checked || false
        },
        
        // Biologia molecular
        molecular: {
            // PCR/RT-PCR
            pcrBvdv: document.getElementById('pcr-bvdv')?.checked || false,
            pcrBhv1: document.getElementById('pcr-bhv1')?.checked || false,
            pcrBhv2: document.getElementById('pcr-bhv2')?.checked || false,
            pcrEctima: document.getElementById('pcr-ectima')?.checked || false,
            pcrEhv1: document.getElementById('pcr-ehv1')?.checked || false,
            pcrCinomose: document.getElementById('pcr-cinomose')?.checked || false,
            pcrParvovirus: document.getElementById('pcr-parvovirus')?.checked || false,
            // Tipo de amostra molecular
            urina: document.getElementById('mol-urina')?.checked || false,
            liquidoVesicular: document.getElementById('mol-liquido-vesicular')?.checked || false,
            secrecao: document.getElementById('mol-secrecao')?.checked || false,
            sangueTotalMol: document.getElementById('mol-sangue-total')?.checked || false,
            suabeNasalMol: document.getElementById('mol-suabe-nasal')?.checked || false,
            suabeLesaoMol: document.getElementById('mol-suabe-lesao')?.checked || false,
            liquor: document.getElementById('mol-liquor')?.checked || false,
            outrosMol: document.getElementById('mol-outros')?.value || '',
            // Língua azul
            encefalite: document.getElementById('la-encefalite')?.checked || false,
            vaccinia: document.getElementById('la-vaccinia')?.checked || false,
            rotavirus: document.getElementById('la-rotavirus')?.checked || false,
            coronavirus: document.getElementById('la-coronavirus')?.checked || false,
            brsv: document.getElementById('la-brsv')?.checked || false
        },
        // Imunofluorescência - Raiva
        imunofluorescencia: {
            raivaBovino: document.getElementById('raiva-bovino')?.checked || false,
            raivaEquino: document.getElementById('raiva-equino')?.checked || false,
            raivaCanino: document.getElementById('raiva-canino')?.checked || false,
            raivaFelino: document.getElementById('raiva-felino')?.checked || false,
            raivaMorcego: document.getElementById('raiva-morcego')?.checked || false
        },
        // Vacina Papilomatose
        papilomatose: {
            bovino: document.getElementById('papil-bovino')?.checked || false,
            equino: document.getElementById('papil-equino')?.checked || false,
            canino: document.getElementById('papil-canino')?.checked || false
        }
    };
}

// Função para limpar formulário
function clearForm() {
    if (confirm('Tem certeza que deseja limpar todos os campos?')) {
        const formEl = document.getElementById('formDiagnostico') || document.getElementById('ficha-form') || document.querySelector('form');
        if (formEl && typeof formEl.reset === 'function') {
            formEl.reset();
        } else {
            console.warn('[LIMPAR] formDiagnostico/ficha-form não encontrado — limpando campos manualmente');
            // Limpeza manual: zera valores de inputs, selects e textareas
            const inputs = document.querySelectorAll('input, textarea, select');
            inputs.forEach(el => {
                if (el.type === 'checkbox' || el.type === 'radio') el.checked = false;
                else el.value = '';
            });
        }
        setCurrentDate(); // Restaurar data atual
        // Garantir que campo SV fique vazio e editável após limpar
        try {
            const svEl = document.getElementById('sv');
            if (svEl) {
                svEl.value = '';
                svEl.removeAttribute && svEl.removeAttribute('disabled');
                svEl.readOnly = false;
            }
        } catch (e) {
            console.warn('[SV] Não foi possível limpar o campo SV após clearForm:', e);
        }
        console.log('[LIMPAR] Formulário limpo');
    }
}

// Função para carregar dados salvos (se houver)
function loadSavedData() {
    console.log('[CARREGAR] Verificando dados salvos...');
    // Por enquanto, apenas gera novo número SV
    // Futuramente pode implementar carregamento de rascunhos
}

// Função para mostrar visualização de impressão
function showPrintPreview() {
    console.log('[PREVIEW] Função showPrintPreview chamada');
    
    try {
        const formData = collectFormData();
        console.log('[PREVIEW] Dados coletados:', formData);
        
        if (!formData.medico.nome) {
            alert('Por favor, preencha pelo menos o nome do médico veterinário para visualizar a impressão.');
            console.log('[PREVIEW] Campo médico não preenchido');
            return;
        }
        
        console.log('[PREVIEW] Abrindo janela de visualização...');
        
        // Criar janela de visualização
        const printWindow = window.open('', '_blank', 'width=800,height=1000,scrollbars=yes');
        
        if (!printWindow) {
            alert('Não foi possível abrir a janela de visualização. Verifique se pop-ups estão bloqueados.');
            console.log('[PREVIEW] Falha ao abrir janela');
            return;
        }
        
        // Garantir que a janela foi criada
        setTimeout(() => {
            try {
                console.log('[PREVIEW] Gerando conteúdo HTML...');
                const htmlContent = generateFullHTML(formData);
                console.log('[PREVIEW] HTML gerado, tamanho:', htmlContent.length, 'caracteres');
                console.log('[PREVIEW] Escrevendo na janela...');
                
                // Método mais robusto para escrever o conteúdo
                printWindow.document.open();
                printWindow.document.write(htmlContent);
                printWindow.document.close();
                
                console.log('[PREVIEW] Conteúdo escrito com sucesso');
                
                // Aguardar um pouco mais para garantir que tudo carregou
                setTimeout(() => {
                    printWindow.focus();
                    console.log('[PREVIEW] Janela focada');
                }, 200);
                
            } catch (error) {
                console.error('[PREVIEW] Erro ao gerar conteúdo:', error);
                alert('Erro ao gerar a visualização: ' + error.message);
                if (printWindow && !printWindow.closed) {
                    printWindow.close();
                }
            }
        }, 150);
        
    } catch (error) {
        console.error('[PREVIEW] Erro geral:', error);
        alert('Erro ao processar os dados: ' + error.message);
    }
}

// Função para gerar HTML completo da janela de visualização
function generateFullHTML(formData) {
    try {
        const svNumber = document.getElementById('sv')?.value || 'SV-000';
        const styles = getPrintStyles();
        const bodyContent = generatePrintHTML(formData);
        
        return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Ficha de Requisição - ${svNumber}</title>
    <style>
        ${styles}
    </style>
</head>
<body>
    ${bodyContent}
    <div class="print-actions no-print">
        <button onclick="window.print()" class="btn-print">🖨️ Imprimir</button>
        <button onclick="window.close()" class="btn-close">❌ Fechar</button>
    </div>
    <script>
        console.log('Janela de preview carregada com sucesso');
        console.log('Tamanho do body content:', ${bodyContent.length});
        
        // Garantir que a página seja carregada completamente
        window.addEventListener('load', function() {
            console.log('Conteúdo da janela totalmente carregado');
            
            // Verificar se o logo carregou
            const logoImg = document.querySelector('.logo-placeholder img');
            if (logoImg) {
                logoImg.onload = function() {
                    console.log('Logo carregado com sucesso');
                };
                logoImg.onerror = function() {
                    console.log('Erro ao carregar logo, mas continuando...');
                };
            }
        });
        
        // Debug adicional
        setTimeout(function() {
            console.log('Elementos encontrados na página:', document.querySelectorAll('*').length);
        }, 500);
    </script>
</body>
</html>`;
    } catch (error) {
        console.error('[HTML] Erro ao gerar HTML:', error);
        throw new Error('Falha ao gerar conteúdo HTML: ' + error.message);
    }
}

// Função para gerar estilos de impressão
function getPrintStyles() {
    return `
        @page { 
            size: A4 portrait; 
            margin: 5mm 5mm 5mm 5mm;
        }
        * { 
            box-sizing: border-box; 
            margin: 0; 
            padding: 0; 
        }
        html, body { 
            height: auto !important;
            min-height: auto !important;
            max-height: none !important;
            overflow: visible !important;
        }
        body {
            font-family: 'Arial', Helvetica, sans-serif;
            font-size: 8px;
            line-height: 1.0;
            color: #222;
            background: #fff;
            padding: 0;
            margin: 0;
        }

        .print-container {
            width: 100%;
            max-width: 200mm;
            padding: 2mm;
            margin: 0;
            height: auto !important;
            min-height: auto !important;
            max-height: none !important;
            overflow: visible !important;
        }

        /* Top header - redesigned to match reference image and place DATA/SV below title */
        .top-row {
            display:grid;
            grid-template-columns: auto 1fr;
            grid-template-rows: auto auto;
            grid-template-areas:
                "logo title"
                "logo meta";
            align-items:start;
            gap:14px;
            margin-bottom:12px;
        }

        .logo-vertical{
            grid-area: logo;
            width:122px;
            height:122px;
            display:flex;
            align-items:flex-start; /* logo sits to top-left like reference */
            justify-content:center;
            padding:4px 8px 4px 4px;
        }

        .logo-vertical img{ max-width:100%; max-height:100%; display:block; }

        .title-area{ grid-area: title; display:flex; align-items:center; justify-content:center; justify-self:center; }

        .title-pill{
            display:block;
            width:100%;
            max-width:760px; /* limits the pill width to keep layout similar */
            text-align:center; /* ensure text is centered */
        }

        .title-pill .pill{
            background:#e5e7eb; /* cinza claro */
            color:#111;
            padding:10px 22px; /* slightly reduced to help single-line */
            border-radius:26px;
            font-weight:900;
            letter-spacing:0.6px;
            font-size:16px; /* reduced to fit in one line */
            line-height:1.05;
            text-align:center;
            margin: 0 auto; /* center the pill block */
            box-shadow:0 0 0 1px rgba(0,0,0,0.03) inset;
            display:inline-block;
        }

        .meta-right{ grid-area: meta; display:flex; gap:14px; justify-content:center; align-items:flex-start; justify-self:center; }

        .meta-column{ display:flex; flex-direction:column; align-items:center; }
        .meta-label{ font-size:10px; color:#0b3b63; font-weight:700; margin-bottom:6px; }
        .meta-box{ width:140px; border:2px solid #e6e7ea; border-radius:10px; padding:8px; background:#fff; text-align:right; }
        .meta-box .meta-value{ font-size:12px; }

        /* Section header (thick blue bar) */
        .section-title {
            background:#0b4f8a; /* azul forte */
            color:white;
            padding:11px 13px; /* 10px -> 11px, 12px -> 13px */
            font-weight:800;
            font-size:13px; /* 12 -> 13 */
            border-radius:6px;
            margin-top:11px;
            margin-bottom:11px;
            text-align:center;
        }

        /* Add a thin full-width blue separator before each section content to mimic the reference */
        .section-content{ padding:9px 9px 9px 9px; position:relative; }
        .section-content::before{
            content:'';
            position:absolute;
            left:0;
            right:0;
            top:-13px;
            height:11px;
            background:#0b4f8a;
            border-radius:3px;
        }

        .subsection-title{
            display:block;
            background:#0b4f8a;
            color:#fff;
            padding:9px 11px; /* 8/10 -> 9/11 */
            font-weight:700;
            font-size:12px; /* 11 -> 12 */
            border-radius:4px;
            margin:9px 0 9px 0;
        }

        /* fields layout */
        .grid-2{ display:grid; grid-template-columns: 1fr 1fr; gap:14px; }
        .grid-3{ display:grid; grid-template-columns: 1fr 1fr 1fr; gap:11px; }
        .grid-4{ display:grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap:11px; }

        .field-box{ border:2px solid #e6e7ea; border-radius:9px; padding:11px; background:#fff; }
        .field-label{ display:block; font-weight:800; font-size:11px; color:#0b3b63; margin-bottom:9px; }
        .field-value{ font-size:12px; min-height:20px; }

        .textarea-field{ min-height:44px; }

        /* checkbox compact */
        .checkbox-row{ display:flex; flex-wrap:wrap; gap:14px; align-items:center; }
        .checkbox-item{ display:flex; gap:9px; align-items:center; font-size:11px; }
        .checkbox{ width:18px; height:18px; border:1.5px solid #6b7280; display:inline-flex; align-items:center; justify-content:center; font-size:12px; border-radius:3px; }
        .checkbox.checked{ background:#0b4f8a; color:#fff; border-color:#0b4f8a; }

        /* small helpers */
        body { font-size:13px; }
        .small { font-size:11px; }
        .muted { color:#475569; }

        /* hide preview controls when printing */
        .no-print { display:block; }
        
        /* Evitar espaços extras que podem causar páginas em branco */
        .print-container::after {
            content: '';
            display: block;
            height: 0;
            clear: both;
        }

        @media print {
            .no-print{ display:none !important; }
            /* reduzido ainda mais para caber em uma página A4 */
            body { padding:0; font-size:9px; height: auto !important; }
            html { height: auto !important; }
            .logo-vertical{ width:82px; height:82px; }
            .title-area { justify-self: center; }
            .title-pill { text-align: center; }
            .title-pill .pill { margin: 0 auto; }
            .section-title{ padding:6px 8px; font-size:10px; margin-top:6px; margin-bottom:6px; }
            .section-content::before{ top:-8px; height:7px; }
            .subsection-title{ font-size:9px; padding:5px 8px; margin:6px 0; }
            .field-box{ padding:5px; border-width:1px; border-radius:5px; }
            .grid-2{ gap:6px; }
            .grid-3{ gap:5px; }
            .grid-4{ gap:5px; }
            .textarea-field{ min-height:24px; }
            .checkbox{ width:11px; height:11px; }
            .meta-box{ width:110px; padding:5px; }
            .meta-right{ width:120px; }
            /* reduzir margens entre seções */
            .print-container .section-title { margin-top:4px; margin-bottom:4px; }
            .section-content { padding-top:4px; padding-bottom:4px; }
            /* minimizar espaços extras */
            .top-row { margin-bottom:6px; gap:8px; }
            .title-pill .pill { white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
            /* garantir uso da largura da página A4 */
            .print-container { 
                width: 100%; 
                max-width: 100%;
                height: auto !important;
                min-height: auto !important;
                page-break-after: auto;
            }
            @page { 
                size: A4 portrait; 
                margin: 2mm;
                /* Evitar páginas órfãs */
                orphans: 3;
                widows: 3;
            }
            /* Evitar quebras de página desnecessárias */
            .section-title, .subsection-title {
                page-break-after: avoid;
            }
            .section-content {
                page-break-inside: auto;
            }
        }
    `;
}

// Função para gerar HTML de impressão
function generatePrintHTML(formData) {
    try {
        const svNumber = document.getElementById('sv')?.value || '';
        const dataAtual = formData.data || new Date().toLocaleDateString('pt-BR');
        const logoPath = window.location.href.includes('setor-virologia.html') ? '../../assets/images/logo-sv.png' : '../assets/images/logo-sv.png';

        return `
        <div class="print-container">

            <div class="top-row">
                <div class="logo-vertical">
                    <img src="${logoPath}" alt="Logo SV" onerror="this.style.display='none'" />
                </div>

                <div class="title-area">
                    <div class="title-pill"><div class="pill">FICHA DE REQUISIÇÃO DE TESTES DE DIAGNÓSTICO</div></div>
                </div>

                <div class="meta-right">
                    <div class="meta-column">
                        <div class="meta-label">DATA</div>
                        <div class="meta-box"><div class="meta-value">${formatDateBR(dataAtual)}</div></div>
                    </div>
                    <div class="meta-column">
                        <div class="meta-label">SV</div>
                        <div class="meta-box"><div class="meta-value">${svNumber}</div></div>
                    </div>
                </div>
            </div>

            <div class="section-title">MÉDICO VETERINÁRIO</div>
            <div class="section-content">
                <div class="grid-4">
                    <div>
                        <div class="field-label">NOME</div>
                        <div class="field-box"><div class="field-value">${formData.medico.nome}</div></div>
                    </div>
                    <div>
                        <div class="field-label">CPF</div>
                        <div class="field-box"><div class="field-value">${formatCPF(formData.medico.cpf)}</div></div>
                    </div>
                    <div>
                        <div class="field-label">E-MAIL</div>
                        <div class="field-box"><div class="field-value">${formData.medico.email}</div></div>
                    </div>
                    <div>
                        <div class="field-label">TELEFONE</div>
                        <div class="field-box"><div class="field-value">${formatPhone(formData.medico.telefone)}</div></div>
                    </div>
                </div>
            </div>

            <div class="section-title">PROPRIETÁRIO OU RESPONSÁVEL</div>
            <div class="section-content">
                <div class="grid-4">
                    <div>
                        <div class="field-label">NOME</div>
                        <div class="field-box"><div class="field-value">${formData.proprietario.nome}</div></div>
                    </div>
                    <div>
                        <div class="field-label">CPF</div>
                        <div class="field-box"><div class="field-value">${formatCPF(formData.proprietario.cpf)}</div></div>
                    </div>
                    <div>
                        <div class="field-label">ENDEREÇO</div>
                        <div class="field-box"><div class="field-value">${formData.proprietario.endereco}</div></div>
                    </div>
                    <div>
                        <div class="field-label">MUNICÍPIO</div>
                        <div class="field-box"><div class="field-value">${formData.proprietario.municipio}</div></div>
                    </div>
                </div>
            </div>

            <div class="section-title">INFORMAÇÕES DAS AMOSTRAS</div>
            <div class="section-content">
                <div class="grid-2" style="margin-bottom:6px;">
                    <div>
                        <div class="field-label">IDENTIFICAÇÃO (NÚMERO/BRINCOS)</div>
                        <div class="field-box textarea-field"><div class="field-value">${formData.amostras.identificacao}</div></div>
                    </div>
                    <div>
                        <div class="field-label">HISTÓRICO CLÍNICO</div>
                        <div class="field-box textarea-field"><div class="field-value">${formData.amostras.historicoClintico}</div></div>
                    </div>
                </div>

                <div class="grid-4">
                    <div>
                        <div class="field-label">ESPÉCIE</div>
                        <div class="field-box"><div class="field-value">${formData.amostras.especie}</div></div>
                    </div>
                    <div>
                        <div class="field-label">RAÇA</div>
                        <div class="field-box"><div class="field-value">${formData.amostras.raca}</div></div>
                    </div>
                    <div>
                        <div class="field-label">DATA COLETA</div>
                        <div class="field-box"><div class="field-value">${formatDateBR(formData.amostras.dataColeta)}</div></div>
                    </div>
                    <div>
                        <div class="field-label">TOTAL DE AMOSTRAS</div>
                        <div class="field-box"><div class="field-value">${formData.amostras.totalAmostras}</div></div>
                    </div>
                </div>

                <div style="height:6px"></div>

                <div class="subsection-title">VACINAÇÃO</div>
                <div class="checkbox-row" style="margin-bottom:6px;">
                    ${renderCheckbox('BHV-1 (IBR)', formData.vacinacao.bhv1)}
                    ${renderCheckbox('BVDV', formData.vacinacao.bvdv)}
                    ${renderCheckbox('RAIVA', formData.vacinacao.raiva)}
                    ${renderCheckbox('BRUCELOSE', formData.vacinacao.brucelose)}
                    ${renderCheckbox('LEPTOSPIROSE', formData.vacinacao.leptospirose)}
                    ${renderCheckbox('HERPESVÍRUS EQUINO', formData.vacinacao.herpesEquino)}
                    ${renderCheckbox('NÃO SABE', formData.vacinacao.naoSabe)}
                </div>
            </div>

            <div class="section-title">PESQUISA DE ANTICORPOS - SOROLOGIA</div>
            <div class="section-content">
                <div class="grid-2">
                    <div>
                        <div class="subsection-title">SORONEUTRALIZAÇÃO (SN)</div>
                        <div class="checkbox-row">
                            ${renderCheckbox('VÍRUS DA DIARREIA VIRAL BOVINA (BVDV)', formData.sorologia.snBvdv)}
                            ${renderCheckbox('HERPESVÍRUS BOVINO (BOHV2) - IBR', formData.sorologia.snBohv2)}
                            ${renderCheckbox('HERPESVÍRUS EQUINO (EHV-1)', formData.sorologia.snEhv1)}
                            ${formData.sorologia.snOutro ? `<div class="field-box"><div class="field-value">OUTRO: ${formData.sorologia.snOutro}</div></div>` : ''}
                        </div>
                    </div>
                    <div>
                        <div class="subsection-title">ELISA</div>
                        <div class="checkbox-row">
                            ${renderCheckbox('LEUCOSE BOVINA', formData.sorologia.elisaLeucose)}
                        </div>
                    </div>
                </div>
            </div>

            <div class="section-title">DETECÇÃO DE ANTÍGENOS</div>
            <div class="section-content">
                <div class="checkbox-row">
                    ${renderCheckbox('ELISA BVDV PI', formData.antigenos.elisaBvdvPi)}
                </div>
                <div style="height:6px"></div>
            </div>

            <div class="section-title">DETECÇÃO DE VÍRUS / ISOLAMENTO EM CULTIVO CELULAR</div>
            <div class="section-content">
                <div class="grid-2">
                    <div>
                        <div class="checkbox-row">
                            ${renderCheckbox('VÍRUS DA DIARREIA VIRAL BOVINA (BVDV)', formData.cultivo.bvdv)}
                            ${renderCheckbox('HERPESVÍRUS BOVINO (BHV-1)', formData.cultivo.bhv1)}
                            ${renderCheckbox('HERPESVÍRUS BOVINO (BHV-5)', formData.cultivo.bhv5)}
                            ${renderCheckbox('HERPESVÍRUS EQUINO (EHV)', formData.cultivo.ehv)}
                        </div>
                    </div>
                    <div>
                        <div class="subsection-title">TIPO DE AMOSTRA</div>
                        <div class="checkbox-row">
                            ${renderCheckbox('SANGUE TOTAL', formData.cultivo.sangueTotalCultivo)}
                            ${renderCheckbox('SUABE NASAL', formData.cultivo.suabeNasalCultivo)}
                            ${renderCheckbox('SUABE LESÃO', formData.cultivo.suabeLesaoCultivo)}
                        </div>
                    </div>
                </div>
            </div>

            <div class="section-title">DETECÇÃO DE VÍRUS / BIOLOGIA MOLECULAR</div>
            <div class="section-content">
                <div class="grid-2">
                    <div>
                        <div class="subsection-title">PCR/RT-PCR</div>
                        <div class="checkbox-row">
                            ${renderCheckbox('BVDV', formData.molecular.pcrBvdv)}
                            ${renderCheckbox('BHV-1', formData.molecular.pcrBhv1)}
                            ${renderCheckbox('BHV-2', formData.molecular.pcrBhv2)}
                            ${renderCheckbox('BHV-5', formData.molecular.pcrBhv5)}
                            ${renderCheckbox('EHV-1', formData.molecular.pcrEhv1)}
                            ${renderCheckbox('CINOMOSE', formData.molecular.pcrCinomose)}
                            ${renderCheckbox('PARVOVÍRUS', formData.molecular.pcrParvovirus)}
                        </div>

                        <div style="height:6px"></div>

                        <div class="subsection-title">LÍNGUA AZUL / OUTROS</div>
                        <div class="checkbox-row">
                            ${renderCheckbox('ENCEFALITE', formData.molecular.encefalite)}
                            ${renderCheckbox('VACCÍNIA', formData.molecular.vaccinia)}
                            ${renderCheckbox('ROTAVÍRUS', formData.molecular.rotavirus)}
                            ${renderCheckbox('CORONAVÍRUS', formData.molecular.coronavirus)}
                            ${renderCheckbox('BRSV', formData.molecular.brsv)}
                        </div>
                    </div>
                    <div>
                        <div class="subsection-title">TIPO DE AMOSTRA</div>
                        <div class="checkbox-row">
                            ${renderCheckbox('URINA', formData.molecular.urina)}
                            ${renderCheckbox('LÍQUIDO VESICULAR', formData.molecular.liquidoVesicular)}
                            ${renderCheckbox('FEZES', formData.molecular.fezes)}
                            ${renderCheckbox('SANGUE TOTAL', formData.molecular.sangueTotalMol)}
                            ${renderCheckbox('SUABE NASAL', formData.molecular.suabeNasalMol)}
                            ${renderCheckbox('SUABE LESÃO', formData.molecular.suabeLesaoMol)}
                            ${renderCheckbox('LÍQUOR', formData.molecular.liquor)}
                        </div>
                        ${formData.molecular.outrosMol ? `<div style="height:6px"></div><div class="field-box"><div class="field-value">OUTROS: ${formData.molecular.outrosMol}</div></div>` : ''}
                    </div>
                </div>
            </div>

            <div class="section-title">IMUNOFLUORESCÊNCIA - RAIVA</div>
            <div class="section-content">
                <div class="checkbox-row">
                    ${renderCheckbox('BOVINO', formData.imunofluorescencia.raivaBovino)}
                    ${renderCheckbox('EQUINO', formData.imunofluorescencia.raivaEquino)}
                    ${renderCheckbox('CANINO', formData.imunofluorescencia.raivaCanino)}
                    ${renderCheckbox('FELINO', formData.imunofluorescencia.raivaFelino)}
                    ${renderCheckbox('MORCEGO', formData.imunofluorescencia.raivaMorcego)}
                </div>
            </div>

            <div class="section-title">VACINA PAPILOMATOSE</div>
            <div class="section-content">
                <div class="checkbox-row">
                    ${renderCheckbox('BOVINO', formData.papilomatose.bovino)}
                    ${renderCheckbox('EQUINO', formData.papilomatose.equino)}
                    ${renderCheckbox('CANINO', formData.papilomatose.canino)}
                </div>
            </div>

        </div>`;

    } catch (error) {
        console.error('[HTML] Erro ao gerar HTML (fiel):', error);
        throw error;
    }
}

// helper to render checkbox HTML inside template
function renderCheckbox(label, checked){
    return `<div class="checkbox-item"><div class="checkbox ${checked ? 'checked' : ''}">${checked ? '✓' : ''}</div><span style="white-space:nowrap;">${label}</span></div>`;
}

// helper to format dates to dd/mm/yyyy for printing
function formatDateBR(value){
    if(!value) return '';
    // already in dd/mm/yyyy
    if(/^[0-3]?\d\/[0-1]?\d\/\d{4}$/.test(value)) return value;
    try{
        // Handle serialized /Date(1234567890)/
        if(/^\/Date\(/.test(value)){
            const ms = parseInt(value.replace(/\D/g, ''), 10);
            if(!isNaN(ms)){
                const d = new Date(ms);
                const day = String(d.getDate()).padStart(2, '0');
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const year = d.getFullYear();
                return `${day}/${month}/${year}`;
            }
        }
        // Try Date parsing (ISO, etc.)
        const d = new Date(value);
        if(!isNaN(d)){
            const day = String(d.getDate()).padStart(2, '0');
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const year = d.getFullYear();
            return `${day}/${month}/${year}`;
        }
        // Try YYYY-MM-DD pattern
        const m = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
        if(m) return `${m[3]}/${m[2]}/${m[1]}`;
        return String(value);
    } catch (e){
        return String(value);
    }
}

// helper to format CPF as xxx.xxx.xxx-xx
function formatCPF(value){
    if(!value) return '';
    const s = String(value).replace(/\D/g,'');
    if(s.length !== 11) return value;
    return s.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/,'$1.$2.$3-$4');
}

// helper to format Brazilian phone numbers: (xx)xxxxx-xxxx or (xx)xxxx-xxxx
function formatPhone(value){
    if(!value) return '';
    const s = String(value).replace(/\D/g,'');
    if(s.length === 11){
        return `(${s.slice(0,2)})${s.slice(2,7)}-${s.slice(7)}`;
    }
    if(s.length === 10){
        return `(${s.slice(0,2)})${s.slice(2,6)}-${s.slice(6)}`;
    }
    return value;
}
    
// helper to format CPF progressively while typing (raw digits in -> formatted)
function formatCPFInput(digits){
    if(!digits) return '';
    const s = digits.slice(0,11);
    if(s.length <= 3) return s;
    if(s.length <= 6) return `${s.slice(0,3)}.${s.slice(3)}`;
    if(s.length <= 9) return `${s.slice(0,3)}.${s.slice(3,6)}.${s.slice(6)}`;
    return `${s.slice(0,3)}.${s.slice(3,6)}.${s.slice(6,9)}-${s.slice(9)}`;
}

// helper to format phone progressively while typing
function formatPhoneInput(digits){
    if(!digits) return '';
    const s = digits.slice(0,11);
    if(s.length <= 2) return `(${s}`;
    if(s.length <= 6) return `(${s.slice(0,2)})${s.slice(2)}`; // (xx)xxxx
    if(s.length <= 10) return `(${s.slice(0,2)})${s.slice(2,6)}-${s.slice(6)}`; // (xx)xxxx-xxxx
    return `(${s.slice(0,2)})${s.slice(2,7)}-${s.slice(7)}`; // (xx)xxxxx-xxxx
}
