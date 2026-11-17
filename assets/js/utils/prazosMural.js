// Prazos das tarefas do Mural — compartilhado entre o Mural e a ficha SV
// (a requisição SV cria as tarefas no Mural com o mesmo cálculo de prazo).

// Função para calcular dias úteis (segunda a sexta)
export function adicionarDiasUteis(dataInicial, diasUteis) {
    let data = new Date(dataInicial);
    let diasAdicionados = 0;

    while (diasAdicionados < diasUteis) {
        data.setDate(data.getDate() + 1);
        // 1 = Segunda, 2 = Terça, ..., 5 = Sexta (0 = Domingo, 6 = Sábado)
        if (data.getDay() >= 1 && data.getDay() <= 5) {
            diasAdicionados++;
        }
    }

    return data;
}

// Função para calcular dias corridos (incluindo fins de semana)
export function adicionarDiasCorridos(dataInicial, dias) {
    let data = new Date(dataInicial);
    data.setDate(data.getDate() + dias);
    return data;
}

// Parse seguro de input date (yyyy-mm-dd) como data LOCAL (evita interpretar como UTC e voltar um dia no Brasil)
export function parseDateInputLocal(dateStr) {
    if (!dateStr) return null;
    const parts = dateStr.split('-').map(Number);
    if (parts.length !== 3) return null;
    const [year, month, day] = parts;
    if (!year || !month || !day) return null;
    // new Date(year, monthIndex, day) cria no fuso local 00:00 evitando o shift de -3h que derruba a data para o dia anterior
    return new Date(year, month - 1, day);
}

// Função para obter o prazo em dias baseado no tipo de teste
export function obterPrazoDiasTeste(tipo, subTipo = null) {
    switch (tipo) {
        case "SN":
        case "SN IBR":
        case "SN BVDV-1":
        case "SN BVDV-2":
        case "SN HoBi":
        case "SN EHV-1":
            return { dias: 15, tipo: 'corridos' }; // SN - 15 dias corridos

        case "VACINA":
            return { dias: 10, tipo: 'uteis' }; // VACINA - 10 dias úteis

        case "ICC":
            return { dias: 20, tipo: 'corridos' }; // ICC - 20 dias corridos

        case "MOLECULAR":
        case "PCR":
            return { dias: 5, tipo: 'uteis' }; // MOLECULAR - 5 dias úteis

        case "ELISA":
        case "ELISA LEUCOSE":
        case "ELISA BVDV":
            return { dias: 5, tipo: 'uteis' }; // ELISA - 5 dias úteis

        case "RAIVA":
            return { dias: 3, tipo: 'uteis' }; // RAIVA - 3 dias úteis

        default:
            return { dias: 15, tipo: 'corridos' }; // Padrão - 15 dias corridos
    }
}

// Data final do prazo (cálculo inclusivo: 15 dias a partir do dia 17 -> 17 + 14)
export function calcularDataPrazo(dataRecebimento, tipo, subTipo = null) {
    const prazoInfo = obterPrazoDiasTeste(tipo, subTipo);
    const delta = Math.max(prazoInfo.dias - 1, 0);
    const dataPrazo = prazoInfo.tipo === 'corridos'
        ? adicionarDiasCorridos(dataRecebimento, delta)
        : adicionarDiasUteis(dataRecebimento, delta);
    return { dataPrazo, prazoInfo };
}
