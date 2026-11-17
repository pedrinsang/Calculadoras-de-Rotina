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

// Firebase centralizado

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
            return userData.role === "admin";
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
            container.innerHTML = '<p class="text-center text-muted">✅ Nenhum usuário pendente de aprovação.</p>';
            document.getElementById('pending-count').textContent = "0 pendentes";
            return;
        }

        let html = '';
        querySnapshot.forEach((doc) => {
            const user = doc.data();
            html += criarCardUsuarioPendente(user);
        });

        container.innerHTML = html;
        document.getElementById('pending-count').textContent = `${querySnapshot.size} pendentes`;
        
        adicionarEventListenersUsuariosPendentes();
        
    } catch (error) {
        console.error("❌ Erro ao carregar usuários pendentes:", error);
    }
}

/**
 * Cria card visual para usuário pendente
 */
function criarCardUsuarioPendente(user) {
    const dataCadastro = new Date(user.dataCadastro).toLocaleDateString('pt-BR');
    
    return `
        <div class="card mb-3 user-card" data-uid="${user.uid}">
            <div class="card-body">
                <div class="row align-items-center">
                    <div class="col-md-8">
                        <h5 class="card-title mb-1">
                            <i class="bi bi-person-circle me-2"></i>${user.nome}
                        </h5>
                        <p class="card-text mb-1">
                            <small class="text-muted">
                                <strong>Email:</strong> ${user.email} | 
                                <strong>Sigla:</strong> ${user.sigla} | 
                                <strong>Cadastro:</strong> ${dataCadastro}
                            </small>
                        </p>
                    </div>
                    <div class="col-md-4 text-end">
                        <button class="btn btn-success btn-sm me-2 btn-aprovar" data-uid="${user.uid}">
                            <i class="bi bi-check-circle me-1"></i>Aprovar
                        </button>
                        <button class="btn btn-danger btn-sm btn-rejeitar" data-uid="${user.uid}">
                            <i class="bi bi-x-circle me-1"></i>Rejeitar
                        </button>
                    </div>
                </div>
            </div>
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
    const uid = e.target.closest('.btn-aprovar').dataset.uid;
    
    if (!confirm('✅ Tem certeza que deseja aprovar este usuário?')) return;
    
    try {
        await updateDoc(doc(db, "usuarios", uid), {
            aprovado: true,
            ativo: true,
            dataAprovacao: new Date().toISOString()
        });
        
        alert('✅ Usuário aprovado com sucesso!');
        await Promise.all([
            carregarUsuariosPendentes(),
            carregarUsuariosAtivos()
        ]);
        
    } catch (error) {
        console.error("❌ Erro ao aprovar usuário:", error);
        alert('❌ Erro ao aprovar usuário: ' + error.message);
    }
}

/**
 * Rejeita e exclui um usuário pendente
 */
async function rejeitarUsuario(e) {
    const uid = e.target.closest('.btn-rejeitar').dataset.uid;
    
    if (!confirm('⚠️ Tem certeza que deseja rejeitar este usuário?\n\nEsta ação irá excluir a conta permanentemente.')) return;
    
    try {
        await deleteDoc(doc(db, "usuarios", uid));
        alert('✅ Usuário rejeitado e excluído!');
        await carregarUsuariosPendentes();
        
    } catch (error) {
        console.error("❌ Erro ao rejeitar usuário:", error);
        alert('❌ Erro ao rejeitar usuário: ' + error.message);
    }
}

// ============================================================================
// GESTÃO DE USUÁRIOS ATIVOS
// ============================================================================

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
            container.innerHTML = '<p class="text-center text-muted">Nenhum usuário ativo encontrado.</p>';
            document.getElementById('active-count').textContent = "0 ativos";
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

        container.innerHTML = html;
        document.getElementById('active-count').textContent = `${usuariosValidos} ativos`;
        
        adicionarEventListenersUsuariosAtivos();
        
    } catch (error) {
        console.error("❌ Erro ao carregar usuários ativos:", error);
        const container = document.getElementById('usuarios-ativos-lista');
        container.innerHTML = `
            <div class="alert alert-danger">
                <h6>❌ Erro ao carregar usuários</h6>
                <p>${error.message}</p>
                <button class="btn btn-primary btn-sm" onclick="carregarUsuariosAtivos()">
                    <i class="bi bi-arrow-clockwise"></i> Tentar Novamente
                </button>
            </div>
        `;
    }
}

/**
 * Cria card visual para usuário ativo
 */
function criarCardUsuarioAtivo(user) {
    const dataCadastro = user.dataCadastro ? 
        new Date(user.dataCadastro).toLocaleDateString('pt-BR') : 
        'Data não informada';
    
    const isAdmin = user.role === 'admin';
    const isAtivo = user.ativo !== false;
    const uid = user.uid || user.id;
    
    return `
        <div class="card mb-3 user-card ${!isAtivo ? 'user-inactive' : ''}" data-uid="${uid}">
            <div class="card-body">
                <div class="row align-items-center">
                    <div class="col-md-8">
                        <h5 class="card-title mb-1">
                            <i class="bi bi-person-${isAtivo ? 'check-fill' : 'dash-fill'} me-2"></i>
                            ${user.nome}
                            ${isAdmin ? '<span class="badge bg-primary ms-2">Admin</span>' : ''}
                            ${!isAtivo ? '<span class="badge bg-secondary ms-2">Inativo</span>' : '<span class="badge bg-success ms-2">Ativo</span>'}
                        </h5>
                        <p class="card-text mb-1">
                            <small class="text-muted">
                                <strong>Email:</strong> ${user.email} | 
                                <strong>Sigla:</strong> ${user.sigla || 'N/A'} | 
                                <strong>Cadastro:</strong> ${dataCadastro}
                            </small>
                        </p>
                    </div>
                    <div class="col-md-4 text-end">
                        ${!isAdmin ? `
                            <button class="btn btn-warning btn-sm me-2 btn-promover" data-uid="${uid}">
                                <i class="bi bi-arrow-up-circle me-1"></i>Promover
                            </button>
                        ` : ''}
                        
                        <button class="btn ${isAtivo ? 'btn-danger' : 'btn-success'} btn-sm btn-toggle-ativo" 
                                data-uid="${uid}" data-ativo="${isAtivo}">
                            <i class="bi bi-${isAtivo ? 'pause-circle' : 'play-circle'} me-1"></i>
                            ${isAtivo ? 'Desativar' : 'Ativar'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Adiciona event listeners para botões de usuários ativos
 */
function adicionarEventListenersUsuariosAtivos() {
    document.querySelectorAll('.btn-promover').forEach(btn => {
        btn.addEventListener('click', promoverUsuario);
    });
    
    document.querySelectorAll('.btn-toggle-ativo').forEach(btn => {
        btn.addEventListener('click', toggleAtivarUsuario);
    });
}

/**
 * Promove usuário para administrador
 */
async function promoverUsuario(e) {
    const uid = e.target.closest('.btn-promover').dataset.uid;
    
    if (!confirm('🚀 Tem certeza que deseja promover este usuário para administrador?')) return;
    
    try {
        await updateDoc(doc(db, "usuarios", uid), {
            role: "admin",
            promoviadoEm: new Date().toISOString()
        });
        
        alert('🎉 Usuário promovido para administrador!');
        await carregarUsuariosAtivos();
        
    } catch (error) {
        console.error("❌ Erro ao promover usuário:", error);
        alert('❌ Erro ao promover usuário: ' + error.message);
    }
}

/**
 * Alterna status ativo/inativo do usuário
 */
async function toggleAtivarUsuario(e) {
    const btn = e.target.closest('.btn-toggle-ativo');
    const uid = btn.dataset.uid;
    const isAtivo = btn.dataset.ativo === 'true';
    const novoStatus = !isAtivo;
    
    // Validações
    if (!uid || uid === 'undefined' || uid === 'null') {
        alert('❌ Erro: UID do usuário inválido');
        console.error('UID inválido:', uid);
        return;
    }
    
    const acao = novoStatus ? 'ativar' : 'desativar';
    const emoji = novoStatus ? '✅' : '⚠️';
    
    if (!confirm(`${emoji} Tem certeza que deseja ${acao} este usuário?`)) return;
    
    try {
        // Verificar se o documento existe
        const userDoc = await getDoc(doc(db, "usuarios", uid));
        
        if (!userDoc.exists()) {
            alert(`❌ Usuário não encontrado no banco de dados.\n\nRecarregando a lista...`);
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
        await updateDoc(doc(db, "usuarios", uid), updateData);
        
        alert(`${emoji} Usuário ${novoStatus ? 'ativado' : 'desativado'} com sucesso!`);
        await carregarUsuariosAtivos();
        
    } catch (error) {
        console.error(`❌ Erro ao ${acao} usuário:`, error);
        
        if (error.code === 'not-found') {
            alert(`❌ Usuário não encontrado. Recarregando lista...`);
            await carregarUsuariosAtivos();
        } else {
            alert(`❌ Erro ao ${acao} usuário: ${error.message}`);
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
    const novoCodigo = document.getElementById('codigo-secreto').value.trim();
    
    if (!novoCodigo) {
        alert('⚠️ Por favor, insira um código secreto válido.');
        return;
    }
    
    if (!confirm('🔑 Tem certeza que deseja alterar o código secreto?')) return;
    
    try {
        await updateDoc(doc(db, "configuracoes", "sistema"), {
            codigoSecreto: novoCodigo,
            atualizadoEm: new Date().toISOString()
        });
        
        alert('✅ Código secreto atualizado com sucesso!');
        
    } catch (error) {
        console.error("❌ Erro ao atualizar código:", error);
        alert('❌ Erro ao atualizar código: ' + error.message);
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
        alert("❌ Erro ao detectar usuários: " + error.message);
    }
}

/**
 * Atualiza todos os usuários desatualizados de uma vez
 */
async function atualizarTodosUsuarios() {
    if (!confirm('🔧 Tem certeza que deseja atualizar TODOS os usuários desatualizados?')) {
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
                
                promises.push(
                    updateDoc(doc(db, "usuarios", docSnapshot.id), camposParaAtualizar)
                );
                contador++;
            }
        });
        
        if (contador > 0) {
            await Promise.all(promises);
            alert(`✅ ${contador} usuários foram atualizados com sucesso!`);
            
            // Recarregar interfaces
            await Promise.all([
                detectarUsuariosDesatualizados(),
                carregarUsuariosPendentes(),
                carregarUsuariosAtivos()
            ]);
        } else {
            alert('✅ Nenhum usuário precisava ser atualizado.');
        }
        
    } catch (error) {
        console.error("❌ Erro ao atualizar usuários:", error);
        alert("❌ Erro ao atualizar usuários: " + error.message);
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
        
        await updateDoc(doc(db, "usuarios", uid), camposParaAtualizar);
        
        // Feedback visual
        userCard.classList.add('fixed');
        userCard.innerHTML = `
            <div class="alert alert-success">
                ✅ <strong>${userData.nome || userData.email}</strong> foi corrigido com sucesso!
            </div>
        `;
        
    } catch (error) {
        console.error("❌ Erro ao corrigir usuário:", error);
        alert("❌ Erro ao corrigir usuário: " + error.message);
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
        lista.innerHTML = '<div class="alert alert-success">✅ Todos os usuários estão atualizados!</div>';
        container.style.display = 'block';
        botaoAtualizar.style.display = 'none';
        return;
    }
    
    let html = `<div class="alert alert-warning">⚠️ Encontrados ${usuarios.length} usuários desatualizados:</div>`;
    
    usuarios.forEach(usuario => {
        html += `
            <div class="user-outdated-card" data-uid="${usuario.id}">
                <div class="user-info">
                    <div class="user-details">
                        <h6><strong>${usuario.data.nome || 'Sem nome'}</strong></h6>
                        <p><small>${usuario.data.email || 'Sem email'}</small></p>
                        <div class="missing-fields">
                            <strong>Campos faltando:</strong> 
                            <span class="badge bg-danger">${usuario.camposFaltando.join(', ')}</span>
                        </div>
                    </div>
                </div>
                <div class="user-actions">
                    <button class="btn btn-warning btn-sm btn-fix-user" data-uid="${usuario.id}">
                        <i class="bi bi-wrench"></i> Corrigir
                    </button>
                </div>
            </div>
        `;
    });
    
    lista.innerHTML = html;
    container.style.display = 'block';
    botaoAtualizar.style.display = 'block';
    
    // Adicionar event listeners
    document.querySelectorAll('.btn-fix-user').forEach(btn => {
        btn.addEventListener('click', corrigirUsuarioIndividual);
    });
}

// ============================================================================
// FIM DO ARQUIVO - ADMIN.JS
// ============================================================================