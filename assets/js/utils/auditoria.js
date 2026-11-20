import {
  collection, doc, getDoc, serverTimestamp, writeBatch, addDoc
} from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js";
import { auth, db } from "../firebase.js";
import {
  nomeDoPerfil, perfilDoUsuario, usuarioEhAdministrador, usuarioPodeAcessarSecretaria
} from "./perfis.js";

const COLECAO_AUDITORIA = 'auditoria';
const CAMPOS_TECNICOS = new Set([
  'atualizadoEm', 'criadoEm', 'dataRegistro', 'criadoPor', 'atualizadoPor',
  'dataAprovacao', 'dataAtivacao', 'dataDesativacao'
]);
const CAMPOS_SENSIVEIS = /cpf|email|contato|telefone|celular|senha|codigoSecreto|identificacao|proprietario\.nome|veterinario\.nome|token|url|storagePath|arquivo/i;

export async function obterAtorAuditoria(substituto) {
  if (substituto?.uid) {
    const perfil = perfilDoUsuario(substituto);
    return {
      uid: substituto.uid,
      nome: substituto.nome || 'Usuário',
      perfil: nomeDoPerfil(perfil)
    };
  }

  const usuario = auth.currentUser;
  if (!usuario) throw new Error('É necessário estar autenticado para registrar auditoria.');

  const snapshot = await getDoc(doc(db, 'usuarios', usuario.uid));
  const dados = snapshot.exists() ? snapshot.data() : {};
  const perfil = perfilDoUsuario(dados);
  return {
    uid: usuario.uid,
    nome: dados.nome || usuario.displayName || 'Usuário',
    perfil: nomeDoPerfil(perfil)
  };
}

export async function usuarioEhAdministradorAtual() {
  const usuario = auth.currentUser;
  if (!usuario) return false;
  const snapshot = await getDoc(doc(db, 'usuarios', usuario.uid));
  return snapshot.exists() && usuarioEhAdministrador(snapshot.data());
}

export async function exigirAdministradorAtual() {
  if (!auth.currentUser) throw new Error('É necessário estar autenticado.');
  if (!await usuarioEhAdministradorAtual()) {
    throw new Error('Somente um administrador pode realizar esta alteração.');
  }
}

export async function usuarioPodeAcessarSecretariaAtual() {
  const usuario = auth.currentUser;
  if (!usuario) return false;
  const snapshot = await getDoc(doc(db, 'usuarios', usuario.uid));
  return snapshot.exists() && usuarioPodeAcessarSecretaria(snapshot.data());
}

export async function exigirSecretariaAtual() {
  if (!auth.currentUser) throw new Error('É necessário estar autenticado.');
  if (!await usuarioPodeAcessarSecretariaAtual()) {
    throw new Error('Somente a Secretaria e administradores podem registrar o envio de laudos.');
  }
}

export function novaReferenciaAuditoria() {
  return doc(collection(db, COLECAO_AUDITORIA));
}

function achatar(valor, prefixo = '', saida = {}) {
  if (valor && typeof valor.toDate === 'function') {
    saida[prefixo] = valor.toDate().toISOString();
    return saida;
  }
  if (valor instanceof Date) {
    saida[prefixo] = valor.toISOString();
    return saida;
  }
  if (Array.isArray(valor)) {
    saida[prefixo] = valor.length ? `${valor.length} item(ns)` : 'vazio';
    return saida;
  }
  if (valor && typeof valor === 'object') {
    const entradas = Object.entries(valor);
    if (!entradas.length) saida[prefixo] = 'vazio';
    else entradas.forEach(([chave, item]) => achatar(item, prefixo ? `${prefixo}.${chave}` : chave, saida));
    return saida;
  }
  saida[prefixo] = valor == null ? 'vazio' : String(valor).slice(0, 160);
  return saida;
}

function alteracoesEntre(antes, depois) {
  const campos = new Set([
    ...Object.keys(achatar(antes || {})),
    ...Object.keys(achatar(depois || {}))
  ]);
  return [...campos]
    .filter(campo => !CAMPOS_TECNICOS.has(campo.split('.').at(-1)))
    .map(campo => {
      const oculto = CAMPOS_SENSIVEIS.test(campo);
      const antesAchados = achatar(antes || {});
      const depoisAchados = achatar(depois || {});
      const valorAntes = antesAchados[campo] ?? 'vazio';
      const valorDepois = depoisAchados[campo] ?? 'vazio';
      return {
        campo,
        antes: oculto ? '[protegido]' : valorAntes,
        depois: oculto ? '[protegido]' : valorDepois
      };
    })
    .filter(alteracao => alteracao.antes !== alteracao.depois);
}

export function criarEventoAuditoria({
  ator, acao, modulo, registroId, registroNome, antes, depois
}) {
  return {
    ator,
    acao,
    modulo,
    registroId: String(registroId || ''),
    registroNome: String(registroNome || registroId || 'Registro'),
    alteracoes: alteracoesEntre(antes, depois),
    criadoEm: serverTimestamp()
  };
}

export async function anexarEventoAuditoria(lote, detalhes, atorInformado) {
  const ator = atorInformado || await obterAtorAuditoria();
  lote.set(novaReferenciaAuditoria(), criarEventoAuditoria({ ...detalhes, ator }));
}

export async function gravarComAuditoria({
  operacao, referencia, dados, antes, modulo, registroId, registroNome, acao, ator: atorInformado
}) {
  const ator = atorInformado || await obterAtorAuditoria();
  const depois = operacao === 'criar' ? dados : operacao === 'atualizar'
    ? { ...(antes || {}), ...dados }
    : {};
  const evento = criarEventoAuditoria({
    ator,
    acao: acao || operacao,
    modulo,
    registroId: registroId || referencia.id,
    registroNome,
    antes: antes || {},
    depois
  });
  const lote = writeBatch(db);

  if (operacao === 'criar') lote.set(referencia, dados);
  else if (operacao === 'atualizar') lote.update(referencia, dados);
  else if (operacao === 'excluir') lote.delete(referencia);
  else throw new Error(`Operação de auditoria inválida: ${operacao}`);

  lote.set(novaReferenciaAuditoria(), evento);
  await lote.commit();
  return referencia;
}

export async function registrarAuditoria({ uid, operacao, entidade, entidadeId, detalhes = {} }) {
  await addDoc(collection(db, COLECAO_AUDITORIA), {
    uid: uid || null,
    operacao,
    entidade,
    entidadeId,
    detalhes,
    criadoEm: serverTimestamp()
  });
}
