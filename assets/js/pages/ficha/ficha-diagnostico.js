// JavaScript para Ficha de Requisição de Testes de Diagnóstico

class FichaDiagnostico {
    constructor() {
        this.initializeComponent();
        this.setupEventListeners();
    }

    initializeComponent() {
        // Adicionar dados de exemplo se não existirem (apenas para desenvolvimento/teste)
        this.initializeExampleData();
        
        // Preencher data atual
        const dataInput = document.getElementById('data');
        if (dataInput) {
            const hoje = new Date().toISOString().split('T')[0];
            dataInput.value = hoje;
        }

        // Preencher data de coleta atual
        const dataColetaInput = document.getElementById('data-coleta');
        if (dataColetaInput) {
            const hoje = new Date().toISOString().split('T')[0];
            dataColetaInput.value = hoje;
        }

        // Gerar número SV automático
        this.generateSVNumber();
    }

    initializeExampleData() {
        // Verificar se já existem dados salvos
        const fichasSalvas = JSON.parse(localStorage.getItem('fichasDiagnostico') || '[]');
        
        // Se não houver dados, criar alguns exemplos para demonstrar a sequência
        if (fichasSalvas.length === 0) {
            const exemplosFichas = [
                {
                    sv: "SV 198/25",
                    data: "2025-08-10",
                    timestamp: "2025-08-10T10:00:00.000Z",
                    medico: { nome: "Dr. João Silva" },
                    proprietario: { nome: "Fazenda Exemplo 1" }
                },
                {
                    sv: "SV 199/25", 
                    data: "2025-08-12",
                    timestamp: "2025-08-12T14:30:00.000Z",
                    medico: { nome: "Dra. Maria Santos" },
                    proprietario: { nome: "Fazenda Exemplo 2" }
                },
                {
                    sv: "SV 200/25",
                    data: "2025-08-14", 
                    timestamp: "2025-08-14T09:15:00.000Z",
                    medico: { nome: "Dr. Carlos Oliveira" },
                    proprietario: { nome: "Fazenda Exemplo 3" }
                }
            ];
            
            localStorage.setItem('fichasDiagnostico', JSON.stringify(exemplosFichas));
            console.log('Dados de exemplo inicializados. Último SV: SV 200/25');
        }
    }

    generateSVNumber() {
        const svInput = document.getElementById('sv');
        if (svInput && !svInput.value) {
            const anoAtual = new Date().getFullYear();
            const anoAbreviado = anoAtual.toString().slice(-2); // Últimos 2 dígitos do ano
            
            // Buscar fichas salvas para encontrar o último SV
            const fichasSalvas = JSON.parse(localStorage.getItem('fichasDiagnostico') || '[]');
            
            let proximoNumero = 1;
            
            if (fichasSalvas.length > 0) {
                // Filtrar fichas do ano atual
                const fichasAnoAtual = fichasSalvas.filter(ficha => {
                    if (!ficha.sv) return false;
                    
                    // Extrair ano do SV (formato: "SV 200/25")
                    const svMatch = ficha.sv.match(/SV\s+(\d+)\/(\d+)/);
                    if (svMatch) {
                        const anoSV = svMatch[2];
                        return anoSV === anoAbreviado;
                    }
                    return false;
                });
                
                if (fichasAnoAtual.length > 0) {
                    // Encontrar o maior número do ano atual
                    const numeros = fichasAnoAtual.map(ficha => {
                        const svMatch = ficha.sv.match(/SV\s+(\d+)\/(\d+)/);
                        return svMatch ? parseInt(svMatch[1]) : 0;
                    });
                    
                    const maiorNumero = Math.max(...numeros);
                    proximoNumero = maiorNumero + 1;
                }
            }
            
            // Formatar número com zeros à esquerda se necessário (opcional)
            const numeroFormatado = proximoNumero.toString().padStart(2, '0');
            
            svInput.value = `SV ${numeroFormatado}/${anoAbreviado}`;
        }
    }

    setupEventListeners() {
        // Formulário principal
        const form = document.getElementById('ficha-form');
        if (form) {
            form.addEventListener('submit', (e) => this.handleSubmit(e));
        }

        // Checkbox de "Outros" para expandir campos de texto
        this.setupOtherCheckboxes();

        // Máscaras para CPF
        this.setupCPFMasks();

        // Validação em tempo real
        this.setupRealTimeValidation();
    }

    setupOtherCheckboxes() {
        // Checkbox "Outros" para vacinação
        const vacOutrosCheckbox = document.getElementById('vac-nao-sabe');
        const vacOutrosInput = document.getElementById('vac-outros');

        // Campos "Outro" em sorologia
        const snOutroInput = document.getElementById('sn-outro');

        // Campos "Outros" em biologia molecular
        const molOutrosInput = document.getElementById('mol-outros');
        const laOutroInput = document.getElementById('la-outro');

        // Habilitar/desabilitar campos conforme necessário
        if (vacOutrosCheckbox && vacOutrosInput) {
            vacOutrosCheckbox.addEventListener('change', function() {
                vacOutrosInput.disabled = !this.checked;
                if (!this.checked) vacOutrosInput.value = '';
            });
        }
    }

    setupCPFMasks() {
        const cpfInputs = document.querySelectorAll('#medico-cpf, #proprietario-cpf');
        
        cpfInputs.forEach(input => {
            input.addEventListener('input', function(e) {
                let value = e.target.value.replace(/\D/g, '');
                value = value.replace(/(\d{3})(\d)/, '$1.$2');
                value = value.replace(/(\d{3})(\d)/, '$1.$2');
                value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
                e.target.value = value;
            });
        });
    }

    setupRealTimeValidation() {
        const requiredFields = document.querySelectorAll('input[required]');
        
        requiredFields.forEach(field => {
            field.addEventListener('blur', function() {
                if (this.value.trim() === '') {
                    this.classList.add('is-invalid');
                } else {
                    this.classList.remove('is-invalid');
                    this.classList.add('is-valid');
                }
            });
        });
    }

    collectFormData() {
        const formData = {};
        
        // Dados básicos
        formData.data = document.getElementById('data')?.value;
        formData.sv = document.getElementById('sv')?.value;
        
        // Médico veterinário
        formData.medico = {
            nome: document.getElementById('medico-nome')?.value,
            cpf: document.getElementById('medico-cpf')?.value,
            email: document.getElementById('medico-email')?.value,
            telefone: document.getElementById('medico-telefone')?.value
        };
        
        // Proprietário
        formData.proprietario = {
            nome: document.getElementById('proprietario-nome')?.value,
            cpf: document.getElementById('proprietario-cpf')?.value,
            endereco: document.getElementById('proprietario-endereco')?.value,
            municipio: document.getElementById('proprietario-municipio')?.value
        };
        
        // Informações das amostras
        formData.amostras = {
            identificacao: document.getElementById('identificacao')?.value,
            historico: document.getElementById('historico-clinico')?.value,
            especie: document.getElementById('especie')?.value,
            raca: document.getElementById('raca')?.value,
            dataColeta: document.getElementById('data-coleta')?.value,
            tipoAmostra: document.getElementById('tipo-amostra')?.value,
            totalAmostras: document.getElementById('total-amostras')?.value,
            vacinacao: this.getCheckedValues('vacinacao'),
            vacinacaoOutros: document.getElementById('vac-outros')?.value
        };
        
        // Testes solicitados
        formData.testes = {
            sorologia: this.getCheckedValues('sorologia'),
            antigenos: this.getCheckedValues('antigenos'),
            tipoAmostraElisa: document.querySelector('input[name="tipo-amostra-elisa"]:checked')?.value,
            cultivo: this.getCheckedValues('cultivo'),
            cultivoAmostra: this.getCheckedValues('cultivo-amostra'),
            molecular: this.getCheckedValues('molecular'),
            molecularAmostra: this.getCheckedValues('molecular-amostra'),
            linguaAzul: this.getCheckedValues('lingua-azul'),
            raivaEspecie: this.getCheckedValues('raiva-especie'),
            papilomatoseEspecie: this.getCheckedValues('papilomatose-especie')
        };
        
        // Campos "outros"
        formData.outros = {
            snOutro: document.getElementById('sn-outro')?.value,
            cultivoOutro: document.getElementById('cultivo-outro')?.value,
            molOutros: document.getElementById('mol-outros')?.value,
            laOutro: document.getElementById('la-outro')?.value
        };
        
        return formData;
    }

    getCheckedValues(name) {
        const checkboxes = document.querySelectorAll(`input[name="${name}"]:checked`);
        return Array.from(checkboxes).map(cb => cb.value);
    }

    validateForm(formData) {
        const errors = [];
        
        // Validações básicas
        if (!formData.data) errors.push('Data é obrigatória');
        if (!formData.medico.nome) errors.push('Nome do médico veterinário é obrigatório');
        if (!formData.proprietario.nome) errors.push('Nome do proprietário é obrigatório');
        
        // Validar CPF (formato básico)
        if (formData.medico.cpf && !this.isValidCPF(formData.medico.cpf)) {
            errors.push('CPF do médico veterinário inválido');
        }
        if (formData.proprietario.cpf && !this.isValidCPF(formData.proprietario.cpf)) {
            errors.push('CPF do proprietário inválido');
        }
        
        // Validar se pelo menos um teste foi selecionado
        const hasTests = Object.values(formData.testes).some(test => 
            Array.isArray(test) ? test.length > 0 : test
        );
        if (!hasTests) {
            errors.push('Selecione pelo menos um teste para realizar');
        }
        
        return errors;
    }

    isValidCPF(cpf) {
        // Remover formatação
        cpf = cpf.replace(/\D/g, '');
        
        // Verificar se tem 11 dígitos
        if (cpf.length !== 11) return false;
        
        // Verificar se todos os dígitos são iguais
        if (/^(\d)\1{10}$/.test(cpf)) return false;
        
        return true; // Validação básica, pode ser expandida
    }

    async handleSubmit(e) {
        e.preventDefault();
        
        try {
            const formData = this.collectFormData();
            const errors = this.validateForm(formData);
            
            if (errors.length > 0) {
                alert('Erro na validação:\n' + errors.join('\n'));
                return;
            }
            
            // Adicionar timestamp
            formData.timestamp = new Date().toISOString();
            formData.usuario = 'Sistema'; // ou capturar de outra forma se necessário
            
            // Salvar no localStorage (pode ser substituído por API)
            const fichas = JSON.parse(localStorage.getItem('fichasDiagnostico') || '[]');
            fichas.push(formData);
            localStorage.setItem('fichasDiagnostico', JSON.stringify(fichas));
            
            alert('Ficha salva com sucesso!');
            
            // Resetar formulário
            document.getElementById('ficha-form').reset();
            this.initializeComponent();
            
        } catch (error) {
            console.error('Erro ao salvar ficha:', error);
            alert('Erro ao salvar ficha. Tente novamente.');
        }
    }

    // Método para exportar dados (futuro)
    exportToPDF() {
        // Implementar exportação para PDF
        console.log('Exportar para PDF - funcionalidade futura');
    }

    // Método para debug - visualizar SVs salvos
    debugViewSVs() {
        const fichasSalvas = JSON.parse(localStorage.getItem('fichasDiagnostico') || '[]');
        console.log('=== SVs Salvos ===');
        fichasSalvas.forEach((ficha, index) => {
            console.log(`${index + 1}. ${ficha.sv} - ${ficha.data}`);
        });
        console.log('=================');
        return fichasSalvas;
    }
}

// Inicializar quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', () => {
    const ficha = new FichaDiagnostico();
    
    // Disponibilizar globalmente para debug
    window.debugFicha = {
        viewSVs: () => ficha.debugViewSVs(),
        clearData: () => {
            localStorage.removeItem('fichasDiagnostico');
            console.log('Dados limpos. Recarregue a página para reinicializar.');
        },
        getCurrentSV: () => document.getElementById('sv')?.value
    };
    
    console.log('=== Debug Ficha Diagnóstico ===');
    console.log('Use window.debugFicha.viewSVs() para ver SVs salvos');
    console.log('Use window.debugFicha.clearData() para limpar dados');
    console.log('Use window.debugFicha.getCurrentSV() para ver SV atual');
});

export default FichaDiagnostico;
