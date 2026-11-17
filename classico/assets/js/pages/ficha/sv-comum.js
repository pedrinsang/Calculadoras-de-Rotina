// Partes compartilhadas das 3 etapas da ficha de Requisição de Exames / Laudo (Setor de Virologia).
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";
import { getDoc, doc, getDocs, collection } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js";
import { auth, db } from "../../firebase.js";
import { listarFichas } from "../../utils/svFichasDB.js";

// ------------------------------------------------------------------
// Catálogo de exames: uma única fonte para formulário, banco, laudo e impressão.
// No banco cada exame vira um booleano em ficha.exames[id].
// Itens com `outro: true` também guardam o texto em ficha.examesOutros[id].
// ------------------------------------------------------------------
export const SECAO_ABORTO = 'Investigação de etiologia de abortos';

export const GRUPOS_EXAMES = [
    {
        id: 'sorologia', titulo: 'Pesquisa de anticorpos / sorologia', itens: [
            { id: 'sorologia_bvdv', nome: 'BVDV' },
            { id: 'sorologia_bohv1_ibr', nome: 'BoHV-1/IBR' },
            { id: 'sorologia_outro', nome: 'Outro', outro: true }
        ]
    },
    {
        id: 'elisa', titulo: 'Ensaio de Imunoabsorção Enzimática – ELISA', itens: [
            { id: 'elisa_bvdv_pi_antigeno', nome: 'BVDV – PI (antígeno)' },
            { id: 'elisa_leucose_anticorpo', nome: 'Vírus da leucose bovina (anticorpo)' }
        ]
    },
    {
        id: 'raiva', titulo: 'Raiva', itens: [
            { id: 'raiva_imunofluorescencia', nome: 'Imunofluorescência' },
            { id: 'raiva_pcr', nome: 'PCR' }
        ]
    },
    {
        id: 'isolamento', titulo: 'Isolamento Viral', itens: [
            { id: 'isolamento_bvdv', nome: 'BVDV' },
            { id: 'isolamento_bohv1_bohv5', nome: 'BoHV1/BoHV-5' },
            { id: 'isolamento_outro', nome: 'Outro', outro: true }
        ]
    },
    {
        id: 'pcr', titulo: 'Reação em Cadeia da Polimerase – PCR', itens: [
            { id: 'pcr_bohv1_bohv5', nome: 'BoHV-1/BoHV-5' },
            { id: 'pcr_bpsv', nome: 'BPSV' },
            { id: 'pcr_bohv2', nome: 'BoHV-2' },
            { id: 'pcr_bpv', nome: 'BPV' },
            { id: 'pcr_vacv', nome: 'VACV' },
            { id: 'pcr_cahv1', nome: 'CaHV-1' },
            { id: 'pcr_adenovirus_canino', nome: 'Adenovírus canino' },
            { id: 'pcr_cpv', nome: 'CPV' },
            { id: 'pcr_fhv1', nome: 'FHV-1' },
            { id: 'pcr_felv', nome: 'FeLV' },
            { id: 'pcr_herpesvirus_equino', nome: 'Herpesvírus equino' },
            { id: 'pcr_outros', nome: 'Outros', outro: true }
        ]
    },
    {
        id: 'pcr_multiplex', titulo: 'PCR Multiplex (crostas)', itens: [
            { id: 'pcr_multiplex_crostas', nome: 'PCR Multiplex (crostas) (BHV-2 + VACV + BPSV + PCPV)' }
        ]
    },
    {
        id: 'rtpcr', titulo: 'RT-PCR', itens: [
            { id: 'rtpcr_bvdv', nome: 'BVDV' },
            { id: 'rtpcr_brsv', nome: 'BRSV' },
            { id: 'rtpcr_pi3', nome: 'PI-3' },
            { id: 'rtpcr_brv', nome: 'BRV' },
            { id: 'rtpcr_bcov', nome: 'BCoV' },
            { id: 'rtpcr_btv', nome: 'BTV' },
            { id: 'rtpcr_cinomose', nome: 'Vírus da cinomose' },
            { id: 'rtpcr_parainfluenza_canina', nome: 'Parainfluenza canina' },
            { id: 'rtpcr_calicivirus_felino', nome: 'Calicivírus felino' },
            { id: 'rtpcr_ecov', nome: 'ECoV (corona equino)' },
            { id: 'rtpcr_erv', nome: 'ERV (rota equino)' },
            { id: 'rtpcr_encefalites_equinas', nome: 'Encefalites equinas (EEEV, WEEV, VEEV)' },
            { id: 'rtpcr_outros', nome: 'Outros', outro: true }
        ]
    },
    {
        id: 'paineis', titulo: 'Painéis', itens: [
            { id: 'painel_brd', nome: 'Painel doenças respiratórias – BRD (BCOV + BHV-1 + BVDV + BRSV + BPI-3)' },
            { id: 'painel_dnb', nome: 'Painel diarréia neonatal – DNB (Rotavírus + Coronavírus)' }
        ]
    },
    {
        id: 'vacina', titulo: 'Vacina papilomatose', itens: [
            { id: 'vacina_papilomatose', nome: 'Vacina papilomatose' }
        ]
    },
    // Investigação de etiologia de abortos (subseções da ficha original)
    {
        id: 'aborto_recepcao', secao: SECAO_ABORTO, titulo: 'Recepção SVA', itens: [
            { id: 'aborto_patologia_vn', nome: 'Patologia – VN', outro: true },
            { id: 'aborto_recepcao', nome: 'Recepção' }
        ]
    },
    {
        id: 'aborto_laboratorios', secao: SECAO_ABORTO, titulo: 'Laboratórios', itens: [
            { id: 'aborto_lab_sb', nome: 'SB', outro: true },
            { id: 'aborto_lab_ldp', nome: 'LDP', outro: true },
            { id: 'aborto_pesquisa', nome: 'Pesquisa' }
        ]
    },
    {
        id: 'aborto_amostra', secao: SECAO_ABORTO, titulo: 'Amostra', itens: [
            { id: 'aborto_feto', nome: 'Feto' },
            { id: 'aborto_orgaos', nome: 'Órgãos', outro: true }
        ]
    },
    {
        id: 'aborto_agentes', secao: SECAO_ABORTO, titulo: 'Agentes e testes solicitados', itens: [
            { id: 'aborto_investigacao_completa', nome: 'Investigação completa (necrópsia/histopatologia, vírus, bactérias e Neospora)' },
            { id: 'aborto_virus_pcr', nome: 'Vírus (BoHV-1, BVDV) – PCR/RT-PCR' },
            { id: 'aborto_isolamento', nome: 'Isolamento' },
            { id: 'aborto_bacterias_pcr', nome: 'Bactérias (Campylobacter, Brucella, Leptospira sp) – PCR' },
            { id: 'aborto_neospora_pcr', nome: 'Neospora spp – PCR' }
        ]
    }
];

// Títulos da vírus-neutralização
export const TITULOS_VN = ['<4', '4', '8', '16', '32', '64', '128', '256', '≥512'];
// Amostras que não puderam ser avaliadas (mesmas categorias do Mural)
export const CATEGORIAS_VN_NAO_AVALIAVEIS = ['Imprópria', 'Tóxica', 'Insuficiente'];

// Interpretação de cada amostra da VN: "<4" = negativa; título ≥ 4 = positiva.
export function classificarVN(titulo) {
    if (!titulo) return '';
    if (titulo === '<4') return 'Negativa';
    if (TITULOS_VN.includes(titulo)) return 'Positiva';
    return 'Não avaliável';
}

// Resumo de uma lista de linhas da VN: { positivas: [...], negativas: [...], naoAvaliaveis: [...] }
export function resumoVN(linhas) {
    const r = { positivas: [], negativas: [], naoAvaliaveis: [] };
    (linhas || []).forEach(l => {
        const c = classificarVN(l.titulo);
        const nome = l.amostra || '—';
        if (c === 'Positiva') r.positivas.push(nome);
        else if (c === 'Negativa') r.negativas.push(nome);
        else if (c) r.naoAvaliaveis.push(`${nome} (${l.titulo.toLowerCase()})`);
    });
    return r;
}

// ------------------------------------------------------------------
// Resultado por amostra/pool: cada amostra mantém a sua classificação (nada de "Positivo" geral
// quando há amostras negativas). Formato: [{ nome, resultado }]
// ------------------------------------------------------------------
export function classeResultado(valor) {
    const s = String(valor || '').trim().toLowerCase();
    if (!s) return '';
    if (/n[ãa]o\s*reagente|negativ/.test(s)) return 'Negativo';
    if (/positiv|reagente/.test(s)) return 'Positivo';
    if (/inconclusiv/.test(s)) return 'Inconclusivo';
    if (/n[ãa]o\s*realizad/.test(s)) return 'Não realizado';
    return s.charAt(0).toUpperCase() + s.slice(1);
}

// Linhas da VN -> amostras (título <4 = Negativo, ≥4 = Positivo, demais = Não avaliável)
export function amostrasDaVN(linhas) {
    return (linhas || []).filter(l => l.amostra || l.titulo).map(l => {
        const c = classificarVN(l.titulo);
        return {
            nome: l.amostra || '—',
            resultado: c === 'Positiva' ? 'Positivo' : c === 'Negativa' ? 'Negativo' : c ? `Não avaliável (${String(l.titulo).toLowerCase()})` : ''
        };
    }).filter(a => a.resultado);
}

const ORDEM_RESULTADO = ['Positivo', 'Negativo', 'Inconclusivo'];

// Agrupa as amostras pelo resultado, positivos primeiro: [{ resultado, amostras: [nomes] }]
export function gruposPorResultado(amostras) {
    const grupos = new Map();
    (amostras || []).forEach(a => {
        const r = classeResultado(a.resultado) || '—';
        if (!grupos.has(r)) grupos.set(r, []);
        grupos.get(r).push(a.nome);
    });
    const pos = (r) => { const i = ORDEM_RESULTADO.indexOf(r); return i === -1 ? ORDEM_RESULTADO.length : i; };
    return [...grupos.entries()]
        .map(([resultado, nomes]) => ({ resultado, amostras: nomes }))
        .sort((a, b) => pos(a.resultado) - pos(b.resultado));
}

// Resultado único do exame só quando todas as amostras concordam; misto -> ''
export function resultadoGeral(amostras) {
    const grupos = gruposPorResultado(amostras);
    return grupos.length === 1 && OPCOES_RESULTADO.includes(grupos[0].resultado) ? grupos[0].resultado : '';
}

// Texto que versões anteriores geravam sozinhas a partir do Mural ("Pool 1: Negativo; Pool 2: Positivo"
// ou "6 positiva(s): ...; 1 negativa(s): ..."). Quando há resultado por amostra ele é substituído.
export function detalheAutomatico(texto) {
    const s = String(texto || '').trim();
    if (!s) return false;
    if (/^\d+ positiva\(s\)/i.test(s)) return true;
    return s.split(';').every(p => /^[^:]+:\s.*(positiv|negativ|reagente|inconclusiv)/i.test(p.trim()));
}

export const OPCOES_RESULTADO =['', 'Positivo', 'Negativo', 'Inconclusivo', 'Não realizado'];

export const FORMAS_PAGAMENTO = ['', 'Dinheiro', 'PIX', 'Transferência', 'Boleto', 'Cartão', 'Empenho/Nota de empenho', 'Outra'];

export const RESPONSAVEL_TECNICO = 'Eduardo Furtado Flores – Médico Veterinário – CRMV-1 3178';

export function todosExames() {
    return GRUPOS_EXAMES.flatMap(g => g.itens.map(i => ({ ...i, grupo: g })));
}

export function nomeExame(ficha, item) {
    if (item.outro) {
        const texto = (ficha?.examesOutros?.[item.id] || '').trim();
        return texto ? `${item.nome}: ${texto}` : item.nome;
    }
    return item.nome;
}

export function examesMarcados(ficha) {
    return todosExames().filter(i => ficha?.exames?.[i.id] === true);
}

// Vírus com tabela de vírus-neutralização = sorologias marcadas
export function virusVN(ficha) {
    const grupo = GRUPOS_EXAMES.find(g => g.id === 'sorologia');
    return grupo.itens
        .filter(i => ficha?.exames?.[i.id] === true)
        .map(i => ({ id: i.id, nome: nomeExame(ficha, i) }));
}

// ------------------------------------------------------------------
// Utilidades
// ------------------------------------------------------------------
export function esc(valor) {
    return String(valor ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function hojeISO() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function dataBR(iso) {
    if (!iso) return '';
    const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/);
    return m ? `${m[3]}/${m[2]}/${m[1]}` : String(iso);
}

export function moedaBR(valor) {
    if (valor === '' || valor === null || valor === undefined) return '';
    const n = Number(valor);
    return Number.isFinite(n) ? n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : String(valor);
}

export function separarIdentificacoes(texto) {
    return String(texto || '').split(/\n|,|;/).map(s => s.trim()).filter(Boolean);
}

export function mostrarAviso(msg, tipo = 'sucesso') {
    let el = document.getElementById('sv-toast');
    if (!el) {
        el = document.createElement('div');
        el.id = 'sv-toast';
        el.setAttribute('role', 'status');
        document.body.appendChild(el);
    }
    el.textContent = msg;
    el.className = `sv-toast sv-toast-${tipo} visivel`;
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove('visivel'), 3500);
}

// ------------------------------------------------------------------
// Login: mesmo fluxo das outras páginas (Firebase Auth + usuário em storage)
// ------------------------------------------------------------------
export function usuarioArmazenado() {
    try { return JSON.parse(localStorage.getItem('usuario') || sessionStorage.getItem('usuario') || '{}'); }
    catch { return {}; }
}

export function exigirLogin(onPronto) {
    let chamado = false;
    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            window.location.href = '../../index.html';
            return;
        }
        let stored = usuarioArmazenado();
        try {
            if (!stored?.nome) {
                const snap = await getDoc(doc(db, 'usuarios', user.uid));
                if (snap.exists()) {
                    stored = snap.data();
                    const manter = localStorage.getItem('manterConectado') === 'true';
                    (manter ? localStorage : sessionStorage).setItem('usuario', JSON.stringify(stored));
                }
            }
            if (stored && stored.ativo === false) {
                window.location.href = '../desativado.html';
                return;
            }
        } catch (err) {
            console.error('Erro ao verificar usuário:', err);
        }
        const nomeEl = document.querySelector('.sv-usuario');
        if (nomeEl && stored?.nome) nomeEl.textContent = stored.nome;
        if (!chamado) { chamado = true; onPronto?.({ uid: user.uid, nome: stored?.nome || user.email || '' }); }
    });
}

export async function sair() {
    localStorage.removeItem('usuario');
    localStorage.removeItem('manterConectado');
    sessionStorage.removeItem('usuario');
    await signOut(auth);
    window.location.href = '../../index.html?logout=true';
}

// ------------------------------------------------------------------
// Protocolo no padrão do projeto: "SV NN/AA" (o mesmo do mural e da ficha antiga).
// Próximo número = maior entre fichas SV (Firestore), tarefas do mural (Firestore) e contador local + 1.
// A unicidade é garantida na gravação (criarFicha falha se o protocolo já existir).
// ------------------------------------------------------------------
const RE_SV = /SV\s*(\d+)\s*\/\s*(\d{2})/i;

export function formatarProtocolo(numero, anoSufixo) {
    return `SV ${String(numero).padStart(2, '0')}/${anoSufixo}`;
}

async function maiorSVMural(anoSufixo) {
    const leitura = getDocs(collection(db, 'tarefas')).then(snap => {
        let maior = 0;
        snap.forEach(d => {
            const dados = d.data();
            const m = String(dados.id || dados.identificacao || '').match(RE_SV);
            if (m && m[2] === anoSufixo) maior = Math.max(maior, parseInt(m[1], 10) || 0);
        });
        return maior;
    });
    const limite = new Promise(resolve => setTimeout(() => resolve(0), 5000));
    try { return await Promise.race([leitura, limite]); }
    catch (err) { console.warn('[SV] Não foi possível ler o mural, usando só dados locais:', err); return 0; }
}

export async function proximoProtocolo() {
    const ano = new Date().getFullYear();
    const sufixo = String(ano).slice(-2);
    let maior = 0;
    try {
        (await listarFichas()).forEach(f => {
            const m = String(f.protocolo || '').match(RE_SV);
            if (m && m[2] === sufixo) maior = Math.max(maior, parseInt(m[1], 10) || 0);
        });
    } catch (err) { console.warn('[SV] Erro ao ler fichas SV:', err); }
    maior = Math.max(maior, await maiorSVMural(sufixo));
    // contador usado pelo mural guarda o "próximo" número
    const contador = parseInt(localStorage.getItem(`svNumber_${ano}`) || '0', 10);
    if (contador > 1) maior = Math.max(maior, contador - 1);
    return formatarProtocolo(maior + 1, sufixo);
}

export function registrarProtocoloUsado(protocolo) {
    const m = String(protocolo).match(RE_SV);
    if (!m) return;
    const ano = new Date().getFullYear();
    if (m[2] !== String(ano).slice(-2)) return;
    const chave = `svNumber_${ano}`;
    const proximo = parseInt(m[1], 10) + 1;
    if (proximo > parseInt(localStorage.getItem(chave) || '0', 10)) localStorage.setItem(chave, proximo);
}

// ------------------------------------------------------------------
// Componentes de formulário reaproveitados nas etapas 1 e 2
// ------------------------------------------------------------------

// Exames solicitados (checkboxes) — etapa 1
export function renderExamesForm(container, ficha = {}) {
    const exames = ficha.exames || {};
    const outros = ficha.examesOutros || {};
    let secaoAtual = null;
    container.innerHTML = GRUPOS_EXAMES.map(g => {
        const cabecalhoSecao = g.secao && g.secao !== secaoAtual ? `<h3 class="sv-secao-exames">${esc(g.secao)}</h3>` : '';
        secaoAtual = g.secao || null;
        return `${cabecalhoSecao}
        <fieldset class="sv-grupo-exames" data-grupo="${g.id}">
            <legend>${esc(g.titulo)}</legend>
            <div class="sv-exames-grid">
                ${g.itens.map(i => `
                    <div class="sv-exame ${exames[i.id] ? 'marcado' : ''} ${i.outro && !g.secao ? 'sv-exame-com-outro' : ''} ${i.nome.length > 28 ? 'sv-exame-longo' : ''}">
                        <label for="ex-${i.id}">
                            <input type="checkbox" id="ex-${i.id}" data-exame="${i.id}" ${exames[i.id] ? 'checked' : ''}>
                            <span class="sv-exame-nome">${esc(i.nome)}</span>
                        </label>
                        ${i.outro ? `<input type="text" class="sv-exame-outro" data-outro="${i.id}" placeholder="${g.secao ? 'Detalhar' : 'Especificar'}" value="${esc(outros[i.id] || '')}" aria-label="${esc(g.titulo)} - ${esc(i.nome)}: detalhar">` : ''}
                    </div>`).join('')}
            </div>
            ${g.id === 'vacina' ? `
                <div class="sv-campo sv-extra" data-mostrar-se="vacina_papilomatose">
                    <label for="vacina-tratamentos">Nº de tratamentos</label>
                    <input type="number" id="vacina-tratamentos" min="0" step="1" value="${esc(ficha.vacinaTratamentos ?? '')}">
                </div>` : ''}
        </fieldset>`;
    }).join('');

    const atualizar = () => {
        container.querySelectorAll('.sv-exame').forEach(l => {
            l.classList.toggle('marcado', l.querySelector('input[type=checkbox]').checked);
        });
        container.querySelectorAll('[data-mostrar-se]').forEach(el => {
            const cb = container.querySelector(`[data-exame="${el.dataset.mostrarSe}"]`);
            el.hidden = !cb?.checked;
        });
        container.dispatchEvent(new CustomEvent('exames-alterados', { bubbles: true }));
    };
    container.addEventListener('change', atualizar);
    // Digitar em "Outro" marca o exame automaticamente
    container.querySelectorAll('.sv-exame-outro').forEach(inp => {
        inp.addEventListener('input', () => {
            const cb = container.querySelector(`[data-exame="${inp.dataset.outro}"]`);
            if (inp.value.trim() && !cb.checked) { cb.checked = true; }
            atualizar();
        });
    });
    atualizar();
}

export function coletarExamesForm(container) {
    const exames = {};
    const examesOutros = {};
    todosExames().forEach(i => {
        exames[i.id] = !!container.querySelector(`[data-exame="${i.id}"]`)?.checked; // booleano por exame
        if (i.outro) examesOutros[i.id] = (container.querySelector(`[data-outro="${i.id}"]`)?.value || '').trim();
    });
    const vt = container.querySelector('#vacina-tratamentos')?.value;
    return {
        exames,
        examesOutros,
        vacinaTratamentos: exames.vacina_papilomatose && vt !== '' ? Number(vt) : null
    };
}

// Vírus-neutralização: uma tabela por vírus, uma linha por amostra, título escolhido por linha.
export function renderVNForm(container, ficha, identificacoesTexto = '') {
    const virus = virusVN(ficha);
    const vn = ficha.vn || {};
    if (!virus.length) {
        container.innerHTML = '<p class="sv-dica">Marque um exame de <strong>Sorologia</strong> para registrar os títulos de vírus-neutralização.</p>';
        return;
    }
    const idsPadrao = separarIdentificacoes(identificacoesTexto);
    container.innerHTML = virus.map(v => {
        let linhas = Array.isArray(vn[v.id]) && vn[v.id].length ? vn[v.id] : idsPadrao.map(a => ({ amostra: a, titulo: '' }));
        if (!linhas.length) linhas = [{ amostra: '', titulo: '' }];
        return `
        <div class="sv-vn-bloco" data-vn="${v.id}">
            <h4>${esc(v.nome)}</h4>
            <div class="sv-vn-linhas">${linhas.map(l => linhaVN(l)).join('')}</div>
            <button type="button" class="sv-btn-link" data-vn-add="${v.id}"><i class="bi bi-plus-circle"></i> Adicionar amostra</button>
        </div>`;
    }).join('');

    container.onclick = (e) => {
        const add = e.target.closest('[data-vn-add]');
        if (add) {
            const bloco = container.querySelector(`[data-vn="${add.dataset.vnAdd}"] .sv-vn-linhas`);
            bloco.insertAdjacentHTML('beforeend', linhaVN({ amostra: '', titulo: '' }));
            bloco.lastElementChild.querySelector('input')?.focus();
        }
        const rem = e.target.closest('[data-vn-rem]');
        if (rem) rem.closest('.sv-vn-linha').remove();
    };
    // Mostra ao lado de cada amostra se ela é positiva ou negativa
    container.onchange = (e) => {
        const sel = e.target.closest('.sv-vn-titulo');
        if (sel) atualizarClasseVN(sel.closest('.sv-vn-linha'));
    };
}

function seloVN(titulo) {
    const c = classificarVN(titulo);
    const classe = c === 'Positiva' ? 'sv-vn-pos' : c === 'Negativa' ? 'sv-vn-neg' : c ? 'sv-vn-na' : '';
    return `<span class="sv-vn-classe ${classe}">${esc(c)}</span>`;
}

function atualizarClasseVN(linha) {
    const atual = linha?.querySelector('.sv-vn-classe');
    if (atual) atual.outerHTML = seloVN(linha.querySelector('.sv-vn-titulo').value);
}

function linhaVN(l) {
    const extra = l.titulo && !TITULOS_VN.includes(l.titulo) && !CATEGORIAS_VN_NAO_AVALIAVEIS.includes(l.titulo) ? [l.titulo] : [];
    return `
    <div class="sv-vn-linha">
        <input type="text" class="sv-vn-amostra" placeholder="Amostra / identificação" value="${esc(l.amostra)}" aria-label="Amostra">
        <select class="sv-vn-titulo" aria-label="Título">
            <option value="">Título…</option>
            <optgroup label="Título">
            ${TITULOS_VN.map(t => `<option value="${esc(t)}" ${l.titulo === t ? 'selected' : ''}>${esc(t)}</option>`).join('')}
            </optgroup>
            <optgroup label="Não avaliável">
            ${[...CATEGORIAS_VN_NAO_AVALIAVEIS, ...extra].map(t => `<option value="${esc(t)}" ${l.titulo === t ? 'selected' : ''}>${esc(t)}</option>`).join('')}
            </optgroup>
        </select>
        ${seloVN(l.titulo)}
        <button type="button" class="sv-btn-icone" data-vn-rem title="Remover amostra" aria-label="Remover amostra"><i class="bi bi-x-lg"></i></button>
    </div>`;
}

export function coletarVNForm(container) {
    const vn = {};
    container.querySelectorAll('[data-vn]').forEach(bloco => {
        vn[bloco.dataset.vn] = Array.from(bloco.querySelectorAll('.sv-vn-linha'))
            .map(l => ({ amostra: l.querySelector('.sv-vn-amostra').value.trim(), titulo: l.querySelector('.sv-vn-titulo').value }))
            .filter(l => l.amostra || l.titulo);
    });
    return vn;
}

// Cobrança e Pagamento — etapa 1 (e editável na etapa 2)
export function renderCobrancaForm(container, cobranca = {}) {
    const simNao = (nome, valor) => `
        <div class="sv-simnao" role="radiogroup">
            <label><input type="radio" name="${nome}" value="sim" ${valor === true ? 'checked' : ''}> Sim</label>
            <label><input type="radio" name="${nome}" value="nao" ${valor === false ? 'checked' : ''}> Não</label>
        </div>`;
    container.innerHTML = `
        <div class="sv-linha">
            <div class="sv-campo">
                <span class="sv-rotulo">Cobrança realizada?</span>
                ${simNao('cobranca-realizada', cobranca.realizada)}
            </div>
            <div class="sv-campo" id="campo-data-cobranca">
                <label for="data-cobranca">Data da cobrança</label>
                <input type="date" id="data-cobranca" value="${esc(cobranca.dataCobranca || '')}">
            </div>
        </div>
        <div class="sv-linha">
            <div class="sv-campo">
                <span class="sv-rotulo">Pagamento realizado?</span>
                ${simNao('pagamento-realizado', cobranca.pagamentoRealizado)}
            </div>
            <div class="sv-campo" id="campo-data-pagamento">
                <label for="data-pagamento">Data do pagamento</label>
                <input type="date" id="data-pagamento" value="${esc(cobranca.dataPagamento || '')}">
            </div>
        </div>
        <div class="sv-linha">
            <div class="sv-campo">
                <label for="valor-cobrado">Valor cobrado (R$) <small>(opcional)</small></label>
                <input type="number" id="valor-cobrado" min="0" step="0.01" inputmode="decimal" value="${esc(cobranca.valor ?? '')}">
            </div>
            <div class="sv-campo">
                <label for="forma-pagamento">Forma de pagamento <small>(opcional)</small></label>
                <select id="forma-pagamento">
                    ${FORMAS_PAGAMENTO.map(f => `<option value="${esc(f)}" ${cobranca.formaPagamento === f ? 'selected' : ''}>${f ? esc(f) : 'Selecione…'}</option>`).join('')}
                </select>
            </div>
        </div>
        <div class="sv-campo">
            <label for="obs-cobranca">Observações sobre a cobrança <small>(opcional)</small></label>
            <textarea id="obs-cobranca" rows="2">${esc(cobranca.observacoes || '')}</textarea>
        </div>`;

    const atualizar = () => {
        const cob = container.querySelector('input[name="cobranca-realizada"]:checked')?.value === 'sim';
        const pag = container.querySelector('input[name="pagamento-realizado"]:checked')?.value === 'sim';
        container.querySelector('#campo-data-cobranca').hidden = !cob;
        container.querySelector('#campo-data-pagamento').hidden = !pag;
    };
    container.addEventListener('change', atualizar);
    atualizar();
}

export function coletarCobrancaForm(container) {
    const simNao = nome => {
        const v = container.querySelector(`input[name="${nome}"]:checked`)?.value;
        return v === 'sim' ? true : v === 'nao' ? false : null;
    };
    const realizada = simNao('cobranca-realizada');
    const pagamentoRealizado = simNao('pagamento-realizado');
    const valor = container.querySelector('#valor-cobrado').value;
    return {
        realizada,
        dataCobranca: realizada ? container.querySelector('#data-cobranca').value : '',
        pagamentoRealizado,
        dataPagamento: pagamentoRealizado ? container.querySelector('#data-pagamento').value : '',
        valor: valor === '' ? null : Number(valor),
        formaPagamento: container.querySelector('#forma-pagamento').value,
        observacoes: container.querySelector('#obs-cobranca').value.trim()
    };
}
