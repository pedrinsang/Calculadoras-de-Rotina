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
