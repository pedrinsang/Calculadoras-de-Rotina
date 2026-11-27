function normalizarTexto(texto) {
    return String(texto || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '');
}

export function normalizarAlvoPCR(texto) {
    const normalizado = normalizarTexto(texto).replace(/^(?:RTPCR|PCR)/, '');
    if (normalizado === 'BVDV1') return 'BVDV';
    if (normalizado === 'BHV1') return 'BOHV1';
    return normalizado;
}

const ALVOS_CONHECIDOS = {
    BVDV: { chave: 'bvdv', nome: 'BVDV' },
    BVDV1: { chave: 'bvdv', nome: 'BVDV' },
    BOHV1: { chave: 'bohv1', nome: 'BoHV-1' },
    BHV1: { chave: 'bohv1', nome: 'BoHV-1' }
};

export function separarAlvosPCR(texto) {
    const partes = String(texto || '')
        .split(/\s*(?:[,;+/]|\be\b|\band\b)\s*/i)
        .map(parte => parte.trim())
        .filter(Boolean);
    if (partes.length < 2) return null;

    const alvos = partes.map(parte => ALVOS_CONHECIDOS[normalizarAlvoPCR(parte)]);
    if (alvos.some(alvo => !alvo) || new Set(alvos.map(alvo => alvo.chave)).size !== alvos.length) {
        return null;
    }
    return alvos;
}
