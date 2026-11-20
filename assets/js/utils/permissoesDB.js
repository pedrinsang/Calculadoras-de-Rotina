export const AMBIENTES = Object.freeze({
  SECRETARIA: 'SECRETARIA',
  LABAC: 'LABAC',
  LADOPAR: 'LADOPAR',
  VIROLOGIA: 'VIROLOGIA'
});

export function laboratoriosDoUsuario(usuario = {}) {
  if (Array.isArray(usuario.laboratorios)) return usuario.laboratorios;
  if (usuario.laboratorio) return [usuario.laboratorio];
  if (usuario.role === 'admin') return Object.values(AMBIENTES);
  return ['VIROLOGIA'];
}

export function ambientePermitido(usuario = {}, ambiente) {
  if (!ambiente) return false;
  if (usuario.role === 'admin' || usuario.perfil === 'Administrador Geral') return true;
  if (ambiente === AMBIENTES.SECRETARIA) {
    return usuario.perfil === 'Secretaria' || usuario.role === 'admin';
  }
  return laboratoriosDoUsuario(usuario).includes(ambiente);
}

export function ambienteAtivo() {
  return localStorage.getItem('ambienteAtivo') || 'VIROLOGIA';
}

export function definirAmbienteAtivo(ambiente) {
  if (!Object.values(AMBIENTES).includes(ambiente)) throw new Error('Ambiente invalido');
  localStorage.setItem('ambienteAtivo', ambiente);
  return ambiente;
}
