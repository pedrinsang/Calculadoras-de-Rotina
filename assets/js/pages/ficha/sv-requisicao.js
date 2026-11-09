// Etapa 1 — a recepção preenche a requisição (nova ficha) ou corrige uma ficha existente (?id=PROTOCOLO).
import {
    exigirLogin, proximoProtocolo, registrarProtocoloUsado, hojeISO, mostrarAviso,
    renderExamesForm, coletarExamesForm, renderVNForm, coletarVNForm,
    renderCobrancaForm, coletarCobrancaForm
} from "./sv-comum.js";
import { obterFicha, criarFicha, atualizarFicha, migrarFichasLocais, STATUS } from "../../utils/svFichasDB.js";

const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
const protocoloEdicao = params.get('id');

let fichaAtual = {};
let usuario = null;

function formatarCPF(v) {
    const d = v.replace(/\D/g, '').slice(0, 11);
    return d.replace(/^(\d{3})(\d)/, '$1.$2').replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d{1,2})$/, '.$1-$2');
}

function formatarCelular(v) {
    const d = v.replace(/\D/g, '').slice(0, 11);
    if (d.length <= 2) return d;
    if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
    if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

function preencher(f) {
    $('protocolo').value = f.protocolo || '';
    $('data-entrada').value = f.identificacao?.dataEntrada || hojeISO();
    $('recebido-por').value = f.identificacao?.recebidoPor || ''; // nunca preenche com o usuário logado
    $('prop-nome').value = f.proprietario?.nome || '';
    $('prop-endereco').value = f.proprietario?.endereco || '';
    $('prop-cidade').value = f.proprietario?.cidade || '';
    $('prop-cpf').value = f.proprietario?.cpf || '';
    $('prop-contato').value = f.proprietario?.contato || '';
    $('vet-nome').value = f.veterinario?.nome || '';
    $('vet-crmv').value = f.veterinario?.crmv || '';
    $('vet-email').value = f.veterinario?.email || '';
    $('vet-celular').value = f.veterinario?.celular || '';
    $('am-especie').value = f.amostras?.especie || '';
    $('am-tipo').value = f.amostras?.tipo || '';
    $('am-data-coleta').value = f.amostras?.dataColeta || '';
    $('am-raca').value = f.amostras?.raca || '';
    $('am-idade').value = f.amostras?.idade || '';
    $('am-identificacao').value = f.amostras?.identificacao || '';
    $('am-historico').value = f.amostras?.historico || '';
    $('am-observacoes').value = f.amostras?.observacoes || '';

    renderExamesForm($('exames'), f);
    renderVNForm($('vn'), f, $('am-identificacao').value);
    renderCobrancaForm($('cobranca'), f.cobranca || {});
}

function coletar() {
    return {
        identificacao: {
            dataEntrada: $('data-entrada').value,
            recebidoPor: $('recebido-por').value.trim()
        },
        proprietario: {
            nome: $('prop-nome').value.trim(),
            endereco: $('prop-endereco').value.trim(),
            cidade: $('prop-cidade').value.trim(),
            cpf: $('prop-cpf').value.trim(),
            contato: $('prop-contato').value.trim()
        },
        veterinario: {
            nome: $('vet-nome').value.trim(),
            crmv: $('vet-crmv').value.trim(),
            email: $('vet-email').value.trim(),
            celular: $('vet-celular').value.trim()
        },
        amostras: {
            especie: $('am-especie').value.trim(),
            tipo: $('am-tipo').value.trim(),
            dataColeta: $('am-data-coleta').value,
            raca: $('am-raca').value.trim(),
            idade: $('am-idade').value.trim(),
            identificacao: $('am-identificacao').value.trim(),
            historico: $('am-historico').value.trim(),
            observacoes: $('am-observacoes').value.trim()
        },
        ...coletarExamesForm($('exames')),
        vn: coletarVNForm($('vn')),
        cobranca: coletarCobrancaForm($('cobranca'))
    };
}

function validar(dados) {
    const faltando = [];
    if (!dados.identificacao.dataEntrada) faltando.push(['data-entrada', 'Data de entrada']);
    if (!dados.identificacao.recebidoPor) faltando.push(['recebido-por', 'Recebido por']);
    if (!dados.proprietario.nome) faltando.push(['prop-nome', 'Nome do proprietário']);
    if (faltando.length) {
        $(faltando[0][0]).focus();
        mostrarAviso('Preencha: ' + faltando.map(f => f[1]).join(', '), 'erro');
        return false;
    }
    if (!Object.values(dados.exames).some(Boolean)) {
        return confirm('Nenhum exame foi marcado. Salvar mesmo assim?');
    }
    return true;
}

async function salvar(e) {
    e.preventDefault();
    const dados = coletar();
    if (!validar(dados)) return;
    const btn = $('btn-salvar');
    btn.disabled = true;
    btn.innerHTML = '<i class="bi bi-hourglass-split"></i> Salvando…';
    try {
        let protocolo;
        if (protocoloEdicao) {
            protocolo = protocoloEdicao;
            await atualizarFicha(protocolo, dados);
        } else {
            protocolo = $('protocolo').value || await proximoProtocolo();
            const novo = {
                ...dados,
                protocolo,
                status: STATUS.AGUARDANDO,
                identificacao: { protocolo, ...dados.identificacao },
                criadoPor: usuario ? { uid: usuario.uid, nome: usuario.nome } : null,
                laudo: null
            };
            // Se outra pessoa usou o mesmo protocolo neste meio-tempo, gera o próximo e tenta de novo
            for (let tentativa = 1; ; tentativa++) {
                try {
                    await criarFicha(novo);
                    break;
                } catch (err) {
                    if (err?.name !== 'ConstraintError' || tentativa >= 5) throw err;
                    protocolo = await proximoProtocolo();
                    novo.protocolo = protocolo;
                    novo.identificacao.protocolo = protocolo;
                }
            }
            if (protocolo !== $('protocolo').value) {
                alert(`Atenção: o protocolo ${$('protocolo').value} foi usado por outra pessoa enquanto você preenchia. Esta ficha foi salva como ${protocolo}.`);
            }
            registrarProtocoloUsado(protocolo);
        }
        location.href = `sv-fichas.html?salvo=${encodeURIComponent(protocolo)}`;
    } catch (err) {
        console.error('Erro ao salvar ficha:', err);
        mostrarAviso('Erro ao salvar: ' + (err?.message || err), 'erro');
        btn.disabled = false;
        btn.innerHTML = '<i class="bi bi-save"></i> Salvar requisição';
    }
}

async function iniciar(u) {
    usuario = u;
    if (protocoloEdicao) {
        fichaAtual = await obterFicha(protocoloEdicao);
        if (!fichaAtual) {
            alert(`Ficha ${protocoloEdicao} não encontrada.`);
            location.href = 'sv-fichas.html';
            return;
        }
        document.title = `Requisição ${protocoloEdicao} - Setor de Virologia`;
        $('subtitulo').textContent = `Etapa 1 · Editando a requisição ${protocoloEdicao}`;
        $('btn-salvar').innerHTML = '<i class="bi bi-save"></i> Salvar alterações';
        preencher(fichaAtual);
    } else {
        preencher({});
        await migrarFichasLocais(proximoProtocolo);
        $('protocolo').value = await proximoProtocolo();
    }
}

// Formatação de CPF / celular
$('prop-cpf').addEventListener('input', e => { e.target.value = formatarCPF(e.target.value); });
$('vet-celular').addEventListener('input', e => { e.target.value = formatarCelular(e.target.value); });

// Ao mudar sorologias, refaz as tabelas de VN mantendo o que já foi digitado
document.addEventListener('exames-alterados', () => {
    if (!$('vn').childElementCount && !$('exames').childElementCount) return;
    const parcial = { ...coletarExamesForm($('exames')), vn: coletarVNForm($('vn')) };
    renderVNForm($('vn'), parcial, $('am-identificacao').value);
});

$('form-requisicao').addEventListener('submit', salvar);

exigirLogin(iniciar);
