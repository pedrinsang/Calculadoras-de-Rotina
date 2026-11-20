// ============================================================================
// PAINEL ADMINISTRATIVO - SISTEMA DE CALCULADORAS
// Desenvolvido por Pedro Ruiz Sangoi e Alexandre Werle Soares
// ============================================================================

// ============================================================================
// IMPORTS DO FIREBASE
// ============================================================================
import { 
    getAuth, 
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";
import { 
    collection, 
    doc, 
    getDocs, 
    getDoc, 
    updateDoc, 
    deleteDoc, 
    query, 
    where, 
    orderBy
} from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js";
import { app, auth, db } from "../firebase.js";
import { gravarComAuditoria } from "../utils/auditoria.js";
import { PERFIS_ACESSO, nomeDoPerfil, perfilDoUsuario, usuarioEhAdministrador } from "../utils/perfis.js";

// Firebase centralizado

// ============================================================================
// AJUDANTES DO VISUAL (Folha de confirmação, Avisos, Lista)
// ============================================================================
const ui = () => window.VirologiaUFSM;

function confirmar(op) {
    if (ui()) return ui().confirmar(op);
    return Promise.resolve(confirm(op.titulo + (op.texto ? '\n\n' + op.texto : '')));
}

function avisar(tipo, titulo, texto) {
    if (ui()) ui().aviso({ tipo, titulo, texto });
    else alert(texto ? `${titulo}\n${texto}` : titulo);
}

function esc(texto) {
    return String(texto ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function iniciais(user) {
    const nome = (user.nome || user.email || '?').trim();
    return esc((user.sigla || nome.split(/\s+/).map(p => p[0]).join('')).slice(0, 2).toUpperCase());
}

function dataBR(valor) {
    if (!valor) return 'sem data';
    const d = new Date(valor);
    return isNaN(d) ? 'sem data' : d.toLocaleDateString('pt-BR');
}

// Atualiza o selo do topo e o número na aba
function contagem(tipo, n) {
    const id = tipo === 'pendentes' ? 'pending-count' : 'active-count';
    document.getElementById(id).textContent = `${n} ${n === 1 ? tipo.slice(0, -1) : tipo}`;
    const aba = document.querySelector(`[data-contagem="${tipo}"]`);
    if (aba) aba.textContent = n;
}

function vazio(icone, titulo, texto) {
    return `<div class="vu-vazio"><span class="vu-vazio-icone"><i class="bi ${icone}"></i></span><h3>${titulo}</h3><p>${texto}</p></div>`;
}

// Ocupa o botão enquanto o Firebase responde
function ocupar(btn, sim) {
    if (!btn) return;
    btn.disabled = sim;
    btn.setAttribute('aria-busy', String(sim));
}

// ============================================================================
// INICIALIZAÇÃO DO PAINEL
// ============================================================================
document.addEventListener('DOMContentLoaded', function() {
    console.log("🔧 Painel Administrativo carregado");
    
    // Verificar autenticação e permissões
    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            window.location.href = "../index.html";
            return;
        }

        const isAdmin = await verificarPermissaoAdmin(user.uid);
        if (!isAdmin) {
            alert("❌ Acesso negado. Você não tem permissões de administrador.");
            window.location.href = "hub.html";
            return;
        }

        await inicializarPainelAdmin();
    });

    // Configurar navegação
    document.getElementById('hub-button').addEventListener('click', () => {
        window.location.href = "hub.html";
    });

    // Configurar ferramentas administrativas
    document.getElementById('atualizar-codigo').addEventListener('click', atualizarCodigoSecreto);
    
    const detectarBtn = document.getElementById('detectar-usuarios');
    const atualizarBtn = document.getElementById('atualizar-todos-usuarios');
    
    if (detectarBtn) detectarBtn.addEventListener('click', detectarUsuariosDesatualizados);
    if (atualizarBtn) atualizarBtn.addEventListener('click', atualizarTodosUsuarios);
    document.getElementById('permissoes-usuarios-lista').addEventListener('click', salvarPerfilUsuario);

    // Pílulas das abas (indicador deslizante)
    if (ui()) ui().iniciar(document);
});

// ============================================================================
// FUNÇÕES DE VERIFICAÇÃO E INICIALIZAÇÃO
// ============================================================================

/**
 * Verifica se o usuário tem permissões de administrador
 */
async function verificarPermissaoAdmin(uid) {
    try {
        const userDoc = await getDoc(doc(db, "usuarios", uid));
        if (userDoc.exists()) {
            const userData = userDoc.data();
            return usuarioEhAdministrador(userData);
        }
        return false;
    } catch (error) {
        console.error("❌ Erro ao verificar permissões:", error);
        return false;
    }
}

/**
 * Inicializa todas as seções do painel administrativo
 */
async function inicializarPainelAdmin() {
    console.log("🚀 Inicializando painel administrativo...");
    
    try {
        await Promise.all([
            carregarUsuariosPendentes(),
            carregarUsuariosAtivos(),
            carregarPermissoesUsuarios(),
            carregarConfiguracoes()
        ]);
        console.log("✅ Painel administrativo carregado com sucesso");
    } catch (error) {
        console.error("❌ Erro ao inicializar painel:", error);
    }
}

// ============================================================================
// GESTÃO DE USUÁRIOS PENDENTES
// ============================================================================

/**
 * Carrega usuários pendentes de aprovação
 */
async function carregarUsuariosPendentes() {
    try {
        const q = query(
            collection(db, "usuarios"),
            where("aprovado", "==", false),
            orderBy("dataCadastro", "desc")
        );

        const querySnapshot = await getDocs(q);
        const container = document.getElementById('usuarios-pendentes-lista');

        if (querySnapshot.empty) {
            container.innerHTML = vazio('bi-check2', 'Nenhum pedido esperando', 'Quando alguém se cadastrar, o pedido aparece aqui para aprovar.');
            contagem('pendentes', 0);
            return;
        }

        let html = '';
        querySnapshot.forEach((doc) => {
            const user = doc.data();
            if (!user.uid) user.uid = doc.id;
            html += criarCardUsuarioPendente(user);
        });

        container.innerHTML = `<div class="vu-lista">${html}</div>`;
        contagem('pendentes', querySnapshot.size);

        adicionarEventListenersUsuariosPendentes();

    } catch (error) {
        console.error("❌ Erro ao carregar usuários pendentes:", error);
        document.getElementById('usuarios-pendentes-lista').innerHTML =
            vazio('bi-exclamation-circle', 'Não foi possível carregar os pedidos', esc(error.message));
    }
}

/**
 * Cria card visual para usuário pendente
 */
function criarCardUsuarioPendente(user) {
    return `
        <div class="vu-item vu-item--estatico user-card" data-uid="${esc(user.uid)}">
            <span class="vu-avatar">${iniciais(user)}</span>
            <span class="vu-item-texto">
                <span class="vu-item-nome">${esc(user.nome)}</span>
                <span class="vu-item-desc">${esc(user.email)} · ${esc(user.sigla || 'sem sigla')} · cadastro em ${dataBR(user.dataCadastro)}</span>
            </span>
            <span class="vu-mini-acoes">
                <button type="button" class="vu-btn vu-btn-principal btn-aprovar" data-uid="${esc(user.uid)}"><i class="bi bi-check2"></i> Aprovar</button>
                <button type="button" class="vu-btn vu-btn-perigo vu-btn-icone btn-rejeitar" data-uid="${esc(user.uid)}" aria-label="Recusar ${esc(user.nome)}" title="Recusar"><i class="bi bi-x-lg"></i></button>
            </span>
        </div>
    `;
}

/**
 * Adiciona event listeners para botões de usuários pendentes
 */
function adicionarEventListenersUsuariosPendentes() {
    document.querySelectorAll('.btn-aprovar').forEach(btn => {
        btn.addEventListener('click', aprovarUsuario);
    });
    
    document.querySelectorAll('.btn-rejeitar').forEach(btn => {
        btn.addEventListener('click', rejeitarUsuario);
    });
}

/**
 * Aprova um usuário pendente
 */
async function aprovarUsuario(e) {
    const btn = e.target.closest('.btn-aprovar');
    const uid = btn.dataset.uid;
    const nome = btn.closest('.user-card')?.querySelector('.vu-item-nome')?.textContent || 'esta pessoa';

    if (!await confirmar({ titulo: `Aprovar ${nome}?`, texto: 'Ela passa a ter acesso ao app.', sim: 'Aprovar', icone: 'bi-person-check' })) return;

    ocupar(btn, true);
    try {
        const referencia = doc(db, "usuarios", uid);
        const snapshot = await getDoc(referencia);
        if (!snapshot.exists()) throw new Error('O cadastro não está mais disponível.');
        const antes = snapshot.data();
        await gravarComAuditoria({
            operacao: 'atualizar',
            referencia,
            antes,
            dados: {
            aprovado: true,
            ativo: true,
            dataAprovacao: new Date().toISOString()
            },
            modulo: 'Gestão de pessoas',
            registroId: uid,
            registroNome: antes.nome || nome,
            acao: 'aprovou cadastro'
        });

        avisar('ok', 'Cadastro aprovado', `${nome} já pode entrar.`);
        await Promise.all([
            carregarUsuariosPendentes(),
            carregarUsuariosAtivos()
        ]);

    } catch (error) {
        console.error("❌ Erro ao aprovar usuário:", error);
        avisar('erro', 'Não foi possível aprovar', error.message);
        ocupar(btn, false);
    }
}

/**
 * Rejeita e exclui um usuário pendente
 */
async function rejeitarUsuario(e) {
    const btn = e.target.closest('.btn-rejeitar');
    const uid = btn.dataset.uid;
    const nome = btn.closest('.user-card')?.querySelector('.vu-item-nome')?.textContent || 'esta pessoa';

    if (!await confirmar({ titulo: `Recusar ${nome}?`, texto: 'O cadastro é excluído para sempre.', sim: 'Recusar e excluir', perigo: true })) return;

    ocupar(btn, true);
    try {
        const referencia = doc(db, "usuarios", uid);
        const snapshot = await getDoc(referencia);
        if (!snapshot.exists()) throw new Error('O cadastro não está mais disponível.');
        const antes = snapshot.data();
        await gravarComAuditoria({
            operacao: 'excluir',
            referencia,
            antes,
            modulo: 'Gestão de pessoas',
            registroId: uid,
            registroNome: antes.nome || nome,
            acao: 'recusou e excluiu cadastro'
        });
        avisar('ok', 'Cadastro recusado e excluído');
        await carregarUsuariosPendentes();

    } catch (error) {
        console.error("❌ Erro ao rejeitar usuário:", error);
        avisar('erro', 'Não foi possível recusar', error.message);
        ocupar(btn, false);
    }
}

// ============================================================================
// GESTÃO DE USUÁRIOS ATIVOS
// ============================================================================

async function carregarPermissoesUsuarios() {
    const container = document.getElementById('permissoes-usuarios-lista');
    try {
        const snapshot = await getDocs(collection(db, 'usuarios'));
        const usuarios = snapshot.docs
            .map(item => ({ uid: item.id, ...item.data() }))
            .filter(usuario => usuario.aprovado === true)
            .sort((a, b) => String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR'));

        if (!usuarios.length) {
            container.innerHTML = vazio('bi-people', 'Nenhuma pessoa aprovada', 'As pessoas aprovadas aparecerão aqui para receber um perfil.');
            return;
        }

        container.innerHTML = usuarios.map(usuario => {
            const perfil = perfilDoUsuario(usuario);
            return `
                <div class="vu-item vu-item--estatico vu-perfil-acesso" data-uid="${esc(usuario.uid)}">
                    <span class="vu-avatar">${iniciais(usuario)}</span>
                    <span class="vu-item-texto">
                        <span class="vu-item-nome">${esc(usuario.nome || 'Sem nome')}</span>
                        <span class="vu-item-desc">${esc(usuario.email || 'Sem email')} · atual: ${esc(nomeDoPerfil(perfil))}</span>
                    </span>
                    <label class="vu-perfil-acesso-campo">
                        <span class="visually-hidden">Perfil de ${esc(usuario.nome || usuario.email)}</span>
                        <select class="form-select" data-perfil-uid="${esc(usuario.uid)}" aria-label="Perfil de ${esc(usuario.nome || usuario.email)}">
                            <option value="">Selecione um perfil</option>
                            ${Object.entries(PERFIS_ACESSO).map(([valor, rotulo]) =>
                                `<option value="${valor}"${perfil === valor ? ' selected' : ''}>${esc(rotulo)}</option>`
                            ).join('')}
                        </select>
                    </label>
                    <button type="button" class="vu-btn vu-btn-principal" data-salvar-perfil="${esc(usuario.uid)}"><i class="bi bi-check2"></i> Salvar</button>
                </div>`;
        }).join('');
    } catch (error) {
        console.error('Erro ao carregar perfis de acesso:', error);
        container.innerHTML = vazio('bi-exclamation-circle', 'Não foi possível carregar os perfis', esc(error.message));
    }
}

async function salvarPerfilUsuario(evento) {
    const botao = evento.target.closest('[data-salvar-perfil]');
    if (!botao) return;

    const uid = botao.dataset.salvarPerfil;
    const campo = document.querySelector(`[data-perfil-uid="${CSS.escape(uid)}"]`);
    const novoPerfil = campo?.value;
    if (!Object.hasOwn(PERFIS_ACESSO, novoPerfil)) {
        avisar('erro', 'Selecione um perfil válido');
        return;
    }

    ocupar(botao, true);
    try {
        const referencia = doc(db, 'usuarios', uid);
        const snapshot = await getDoc(referencia);
        if (!snapshot.exists()) throw new Error('A pessoa não está mais cadastrada.');

        const antes = snapshot.data();
        const novoRole = ['admin', 'programador'].includes(novoPerfil) ? 'admin' : 'user';
        if (antes.role === novoRole && perfilDoUsuario(antes) === novoPerfil) {
            avisar('info', 'Esse perfil já está atribuído');
            return;
        }

        if (usuarioEhAdministrador(antes) && novoRole !== 'admin') {
            const administradores = await getDocs(query(collection(db, 'usuarios'), where('role', '==', 'admin')));
            if (administradores.size <= 1) throw new Error('Não é possível remover o último administrador.');
        }

        await gravarComAuditoria({
            operacao: 'atualizar',
            referencia,
            antes,
            dados: {
                role: novoRole,
                perfilAcesso: novoPerfil,
                atualizadoEm: new Date().toISOString()
            },
            modulo: 'Gestão de pessoas',
            registroId: uid,
            registroNome: antes.nome || antes.email || uid,
            acao: 'alterou perfil de acesso'
        });

        avisar('ok', `Perfil de ${antes.nome || 'usuário'} atualizado para ${nomeDoPerfil(novoPerfil)}`);
        await Promise.all([carregarPermissoesUsuarios(), carregarUsuariosAtivos()]);
        if (uid === auth.currentUser?.uid) {
            for (const armazenamento of [localStorage, sessionStorage]) {
                try {
                    const salvo = JSON.parse(armazenamento.getItem('usuario') || '{}');
                    if (salvo.uid === uid) armazenamento.setItem('usuario', JSON.stringify({ ...salvo, role: novoRole, perfilAcesso: novoPerfil }));
                } catch (error) {
                    console.warn('Não foi possível atualizar o perfil em cache local:', error);
                }
            }
            location.reload();
        }
    } catch (error) {
        console.error('Erro ao alterar perfil de acesso:', error);
        avisar('erro', 'Não foi possível salvar o perfil', error.message);
    } finally {
        ocupar(botao, false);
    }
}

/**
 * Carrega usuários ativos do sistema
 */
async function carregarUsuariosAtivos() {
    try {
        const q = query(
            collection(db, "usuarios"),
            where("aprovado", "==", true),
            orderBy("dataCadastro", "desc")
        );
        
        const querySnapshot = await getDocs(q);
        const container = document.getElementById('usuarios-ativos-lista');
        
        if (querySnapshot.empty) {
            container.innerHTML = vazio('bi-people', 'Ninguém na equipe ainda', 'Quem for aprovado aparece aqui.');
            contagem('ativos', 0);
            return;
        }

        let html = '';
        let usuariosValidos = 0;
        
        querySnapshot.forEach((docSnapshot) => {
            const user = docSnapshot.data();
            const uid = docSnapshot.id;
            
            // Verificar integridade dos dados
            if (user && user.email && user.nome && uid) {
                if (!user.uid) user.uid = uid; // Garantir UID
                html += criarCardUsuarioAtivo(user);
                usuariosValidos++;
            } else {
                console.warn('⚠️ Usuário com dados incompletos:', { id: uid, data: user });
            }
        });

        container.innerHTML = `<div class="vu-lista">${html}</div>`;
        contagem('ativos', usuariosValidos);
        
        adicionarEventListenersUsuariosAtivos();
        
    } catch (error) {
        console.error("❌ Erro ao carregar usuários ativos:", error);
        const container = document.getElementById('usuarios-ativos-lista');
        container.innerHTML = `
            <div class="vu-vazio">
                <span class="vu-vazio-icone"><i class="bi bi-exclamation-circle"></i></span>
                <h3>Não foi possível carregar a equipe</h3>
                <p>${esc(error.message)}</p>
                <button type="button" class="vu-btn" id="tentar-ativos"><i class="bi bi-arrow-clockwise"></i> Tentar de novo</button>
            </div>
        `;
        document.getElementById('tentar-ativos')?.addEventListener('click', carregarUsuariosAtivos);
    }
}

/**
 * Cria card visual para usuário ativo
 */
function criarCardUsuarioAtivo(user) {
    const isAdmin = usuarioEhAdministrador(user);
    const perfil = perfilDoUsuario(user);
    const isAtivo = user.ativo !== false;
    const uid = esc(user.uid || user.id);

    return `
        <div class="vu-item vu-item--estatico user-card ${!isAtivo ? 'user-inactive' : ''}" data-uid="${uid}">
            <span class="vu-avatar">${iniciais(user)}</span>
            <span class="vu-item-texto">
                <span class="vu-item-nome">${esc(user.nome)}</span>
                <span class="vu-item-desc">${esc(user.email)} · ${esc(user.sigla || 'sem sigla')} · desde ${dataBR(user.dataCadastro)}</span>
                <span class="vu-admin-selos">
                    <span class="vu-selo ${isAdmin ? 'vu-selo-andamento' : ''}"><i class="bi bi-person-badge"></i>${esc(nomeDoPerfil(perfil))}</span>
                    ${isAtivo ? '<span class="vu-selo vu-selo-feito"><i class="bi bi-check2"></i>Ativo</span>' : '<span class="vu-selo"><i class="bi bi-pause"></i>Desativado</span>'}
                </span>
            </span>
            <span class="vu-mini-acoes">
                <button type="button" class="vu-btn ${isAtivo ? 'vu-btn-perigo' : 'vu-btn-principal'} btn-toggle-ativo" data-uid="${uid}" data-ativo="${isAtivo}">
                    <i class="bi bi-${isAtivo ? 'pause-circle' : 'play-circle'}"></i> ${isAtivo ? 'Desativar' : 'Reativar'}
                </button>
            </span>
        </div>
    `;
}

/**
 * Adiciona event listeners para botões de usuários ativos
 */
function adicionarEventListenersUsuariosAtivos() {
    document.querySelectorAll('.btn-toggle-ativo').forEach(btn => {
        btn.addEventListener('click', toggleAtivarUsuario);
    });
}

/**
 * Alterna status ativo/inativo do usuário
 */
async function toggleAtivarUsuario(e) {
    const btn = e.target.closest('.btn-toggle-ativo');
    const uid = btn.dataset.uid;
    const isAtivo = btn.dataset.ativo === 'true';
    const novoStatus = !isAtivo;
    const nome = btn.closest('.user-card')?.querySelector('.vu-item-nome')?.textContent || 'esta pessoa';

    // Validações
    if (!uid || uid === 'undefined' || uid === 'null') {
        avisar('erro', 'Cadastro sem identificação', 'Recarregue a página e tente de novo.');
        console.error('UID inválido:', uid);
        return;
    }

    const acao = novoStatus ? 'ativar' : 'desativar';
    const ok = await confirmar(novoStatus
        ? { titulo: `Reativar ${nome}?`, texto: 'Ela volta a ter acesso ao app.', sim: 'Reativar', icone: 'bi-play-circle' }
        : { titulo: `Desativar ${nome}?`, texto: 'Ela perde o acesso até ser reativada. Nada é apagado.', sim: 'Desativar', perigo: true, icone: 'bi-pause-circle' });
    if (!ok) return;

    ocupar(btn, true);
    try {
        // Verificar se o documento existe
        const userDoc = await getDoc(doc(db, "usuarios", uid));

        if (!userDoc.exists()) {
            avisar('atencao', 'Cadastro não encontrado', 'A lista foi recarregada.');
            await carregarUsuariosAtivos();
            return;
        }

        // Preparar dados para atualização
        const updateData = {
            ativo: novoStatus,
            atualizadoEm: new Date().toISOString()
        };

        if (novoStatus) {
            updateData.dataAtivacao = new Date().toISOString();
        } else {
            updateData.dataDesativacao = new Date().toISOString();
        }

        // Atualizar no Firestore
        await gravarComAuditoria({
            operacao: 'atualizar',
            referencia: doc(db, "usuarios", uid),
            antes: userDoc.data(),
            dados: updateData,
            modulo: 'Gestão de pessoas',
            registroId: uid,
            registroNome: userDoc.data().nome || nome,
            acao: novoStatus ? 'reativou usuário' : 'desativou usuário'
        });

        avisar('ok', novoStatus ? `${nome} foi reativado` : `${nome} foi desativado`);
        await carregarUsuariosAtivos();

    } catch (error) {
        console.error(`❌ Erro ao ${acao} usuário:`, error);

        if (error.code === 'not-found') {
            avisar('atencao', 'Cadastro não encontrado', 'A lista foi recarregada.');
            await carregarUsuariosAtivos();
        } else {
            avisar('erro', `Não foi possível ${acao}`, error.message);
            ocupar(btn, false);
        }
    }
}

// ============================================================================
// CONFIGURAÇÕES DO SISTEMA
// ============================================================================

/**
 * Carrega configurações do sistema
 */
async function carregarConfiguracoes() {
    try {
        const configDoc = await getDoc(doc(db, "configuracoes", "sistema"));
        if (configDoc.exists()) {
            const config = configDoc.data();
            document.getElementById('codigo-secreto').value = config.codigoSecreto || '';
        }
    } catch (error) {
        console.error("❌ Erro ao carregar configurações:", error);
    }
}

/**
 * Atualiza código secreto do sistema
 */
async function atualizarCodigoSecreto() {
    const campo = document.getElementById('codigo-secreto');
    const novoCodigo = campo.value.trim();
    const btn = document.getElementById('atualizar-codigo');

    if (!novoCodigo) {
        const bloco = campo.closest('.vu-campo');
        bloco?.classList.add('tem-erro');
        campo.addEventListener('input', () => bloco?.classList.remove('tem-erro'), { once: true });
        avisar('erro', 'Digite um código secreto');
        return;
    }

    if (!await confirmar({ titulo: 'Trocar o código secreto?', texto: 'O código antigo deixa de valer para novos cadastros.', sim: 'Trocar código', icone: 'bi-key' })) return;

    ocupar(btn, true);
    try {
        await updateDoc(doc(db, "configuracoes", "sistema"), {
            codigoSecreto: novoCodigo,
            atualizadoEm: new Date().toISOString()
        });

        avisar('ok', 'Código secreto atualizado');

    } catch (error) {
        console.error("❌ Erro ao atualizar código:", error);
        avisar('erro', 'Não foi possível salvar o código', error.message);
    } finally {
        ocupar(btn, false);
    }
}

// ============================================================================
// FERRAMENTAS DE MIGRAÇÃO E MANUTENÇÃO
// ============================================================================

/**
 * Detecta usuários com dados desatualizados ou incompletos
 */
async function detectarUsuariosDesatualizados() {
    try {
        console.log("🔍 Iniciando detecção de usuários...");
        
        const usuariosRef = collection(db, "usuarios");
        const snapshot = await getDocs(usuariosRef);
        
        console.log(`📊 Encontrados ${snapshot.size} usuários no total`);
        
        const usuariosDesatualizados = [];
        const camposObrigatorios = ['aprovado', 'ativo', 'dataCadastro', 'role'];
        
        snapshot.forEach((docSnapshot) => {
            const data = docSnapshot.data();
            const camposFaltando = [];
            
            camposObrigatorios.forEach(campo => {
                if (data[campo] === undefined || data[campo] === null) {
                    camposFaltando.push(campo);
                }
            });
            
            if (camposFaltando.length > 0) {
                usuariosDesatualizados.push({
                    id: docSnapshot.id,
                    data: data,
                    camposFaltando: camposFaltando
                });
            }
        });
        
        console.log(`⚠️ Usuários desatualizados: ${usuariosDesatualizados.length}`);
        exibirUsuariosDesatualizados(usuariosDesatualizados);
        
    } catch (error) {
        console.error("❌ Erro ao detectar usuários:", error);
        avisar('erro', 'Não foi possível procurar', error.message);
    }
}

/**
 * Atualiza todos os usuários desatualizados de uma vez
 */
async function atualizarTodosUsuarios() {
    if (!await confirmar({ titulo: 'Corrigir todos os cadastros incompletos?', texto: 'Os campos que faltam recebem os valores padrão.', sim: 'Corrigir todos', icone: 'bi-wrench-adjustable' })) {
        return;
    }
    
    try {
        const usuariosRef = collection(db, "usuarios");
        const snapshot = await getDocs(usuariosRef);
        
        let contador = 0;
        const promises = [];
        
        snapshot.forEach((docSnapshot) => {
            const data = docSnapshot.data();
            const camposParaAtualizar = {};
            
            // Verificar e corrigir campos faltando
            if (data.aprovado === undefined || data.aprovado === null) {
                camposParaAtualizar.aprovado = true;
            }
            
            if (data.ativo === undefined || data.ativo === null) {
                camposParaAtualizar.ativo = true;
            }
            
            if (!data.dataCadastro) {
                camposParaAtualizar.dataCadastro = new Date().toISOString();
            }
            
            if (!data.role) {
                camposParaAtualizar.role = docSnapshot.id === auth.currentUser.uid ? 'admin' : 'user';
            }
            
            // Se tem campos para atualizar
            if (Object.keys(camposParaAtualizar).length > 0) {
                camposParaAtualizar.atualizadoEm = new Date().toISOString();
                camposParaAtualizar.migradoEm = new Date().toISOString();
                
                promises.push(gravarComAuditoria({
                    operacao: 'atualizar',
                    referencia: doc(db, "usuarios", docSnapshot.id),
                    antes: data,
                    dados: camposParaAtualizar,
                    modulo: 'Gestão de pessoas',
                    registroId: docSnapshot.id,
                    registroNome: data.nome || data.email || docSnapshot.id,
                    acao: 'corrigiu cadastro e perfil'
                }));
                contador++;
            }
        });
        
        if (contador > 0) {
            await Promise.all(promises);
            avisar('ok', `${contador} ${contador === 1 ? 'cadastro corrigido' : 'cadastros corrigidos'}`);
            
            // Recarregar interfaces
            await Promise.all([
                detectarUsuariosDesatualizados(),
                carregarUsuariosPendentes(),
                carregarUsuariosAtivos()
            ]);
        } else {
            avisar('info', 'Nada para corrigir', 'Todos os cadastros já estão completos.');
        }
        
    } catch (error) {
        console.error("❌ Erro ao atualizar usuários:", error);
        avisar('erro', 'Não foi possível corrigir', error.message);
    }
}

/**
 * Corrige um usuário individual
 */
async function corrigirUsuarioIndividual(e) {
    const uid = e.target.closest('.btn-fix-user').dataset.uid;
    const userCard = e.target.closest('.user-outdated-card');
    
    try {
        const userDoc = await getDoc(doc(db, "usuarios", uid));
        const userData = userDoc.data();
        
        const camposParaAtualizar = {};
        
        if (userData.aprovado === undefined || userData.aprovado === null) {
            camposParaAtualizar.aprovado = true;
        }
        
        if (userData.ativo === undefined || userData.ativo === null) {
            camposParaAtualizar.ativo = true;
        }
        
        if (!userData.dataCadastro) {
            camposParaAtualizar.dataCadastro = new Date().toISOString();
        }
        
        if (!userData.role) {
            camposParaAtualizar.role = uid === auth.currentUser.uid ? 'admin' : 'user';
        }
        
        camposParaAtualizar.atualizadoEm = new Date().toISOString();
        camposParaAtualizar.migradoEm = new Date().toISOString();
        
        await gravarComAuditoria({
            operacao: 'atualizar',
            referencia: doc(db, "usuarios", uid),
            antes: userData,
            dados: camposParaAtualizar,
            modulo: 'Gestão de pessoas',
            registroId: uid,
            registroNome: userData.nome || userData.email || uid,
            acao: 'corrigiu cadastro e perfil'
        });
        
        // Feedback visual
        userCard.classList.add('fixed');
        userCard.querySelector('.vu-mini-acoes').innerHTML = '<span class="vu-selo vu-selo-feito"><i class="bi bi-check2"></i>Corrigido</span>';
        
    } catch (error) {
        console.error("❌ Erro ao corrigir usuário:", error);
        avisar('erro', 'Não foi possível corrigir', error.message);
    }
}

/**
 * Exibe lista de usuários desatualizados na interface
 */
function exibirUsuariosDesatualizados(usuarios) {
    const container = document.getElementById('usuarios-desatualizados');
    const lista = document.getElementById('lista-usuarios-desatualizados');
    const botaoAtualizar = document.getElementById('atualizar-todos-usuarios');

    if (usuarios.length === 0) {
        lista.innerHTML = vazio('bi-check2', 'Tudo completo', 'Nenhum cadastro com campos faltando.');
        container.style.display = '';
        botaoAtualizar.style.display = 'none';
        return;
    }

    let html = `<p class="vu-dica"><b>${usuarios.length}</b> ${usuarios.length === 1 ? 'cadastro precisa' : 'cadastros precisam'} de ajuste.</p><div class="vu-lista">`;

    usuarios.forEach(usuario => {
        html += `
            <div class="vu-item vu-item--estatico user-outdated-card" data-uid="${esc(usuario.id)}">
                <span class="vu-avatar">${iniciais(usuario.data)}</span>
                <span class="vu-item-texto">
                    <span class="vu-item-nome">${esc(usuario.data.nome || 'Sem nome')}</span>
                    <span class="vu-item-desc">${esc(usuario.data.email || 'Sem email')} · falta: ${esc(usuario.camposFaltando.join(', '))}</span>
                </span>
                <span class="vu-mini-acoes">
                    <button type="button" class="vu-btn btn-fix-user" data-uid="${esc(usuario.id)}"><i class="bi bi-wrench"></i> Corrigir</button>
                </span>
            </div>
        `;
    });

    lista.innerHTML = html + '</div>';
    container.style.display = '';
    botaoAtualizar.style.display = '';

    // Adicionar event listeners
    document.querySelectorAll('.btn-fix-user').forEach(btn => {
        btn.addEventListener('click', corrigirUsuarioIndividual);
    });
}

// ============================================================================
// FIM DO ARQUIVO - ADMIN.JS
// ============================================================================