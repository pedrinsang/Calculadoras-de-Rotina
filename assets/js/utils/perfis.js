export const PERFIS_ACESSO = {
  programador: 'Programador',
  admin: 'Administrador',
  responsavel_tecnico: 'Responsável técnico',
  secretaria: 'Secretaria',
  pesquisador: 'Pesquisador',
  residente: 'Residente',
  tecnico: 'Técnico',
  estagiario: 'Estagiário'
};

export const LABORATORIOS = Object.freeze({
  LABAC: 'LABAC',
  LADOPAR: 'LADOPAR',
  VIROLOGIA: 'VIROLOGIA'
});

export function perfilDoUsuario(usuario = {}) {
  if (usuario.perfilAcesso === 'programador') return 'programador';
  if (usuario.role === 'admin') return 'admin';
  return Object.hasOwn(PERFIS_ACESSO, usuario.perfilAcesso) ? usuario.perfilAcesso : '';
}

export function usuarioEhAdministrador(usuario = {}) {
  return usuario.role === 'admin' || usuario.perfilAcesso === 'programador';
}

export function usuarioPodeAcessarSecretaria(usuario = {}) {
  return usuarioEhAdministrador(usuario) || usuario.perfilAcesso === 'secretaria';
}

export function nomeDoPerfil(perfil) {
  return PERFIS_ACESSO[perfil] || 'Perfil não definido';
}

export function laboratoriosDoUsuario(usuario = {}) {
  if (Array.isArray(usuario.laboratorios)) return usuario.laboratorios;
  if (usuario.laboratorio) return [usuario.laboratorio];
  if (usuario.perfil === 'Administrador Geral' || usuario.role === 'admin') {
    return Object.values(LABORATORIOS);
  }
  return ['VIROLOGIA'];
}

export function usuarioPodeAcessarLaboratorio(usuario = {}, laboratorio) {
  return usuarioEhAdministrador(usuario)
    || laboratoriosDoUsuario(usuario).includes(laboratorio);
}
