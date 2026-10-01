export const soloLetrasYEspacios = (valor: string) =>
  /^[\p{L} ]*$/u.test(valor);

export const soloNumeros = (valor: string) => /^\d*$/.test(valor);

export const correoValido = (valor: string) =>
  valor === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor);

export const mensajeCampoPersona = (campo: string, valor: string) => {
  if (campo === 'ci' && !soloNumeros(valor))
    return 'El CI solo puede contener números.';
  if (campo === 'nombres' && !soloLetrasYEspacios(valor))
    return 'Los nombres solo pueden contener letras, espacios y letras con tilde.';
  if (campo === 'apellidos' && !soloLetrasYEspacios(valor))
    return 'Los apellidos solo pueden contener letras, espacios y letras con tilde.';
  if (campo === 'correo' && !correoValido(valor))
    return 'El correo electrónico no tiene un formato válido.';
  return '';
};
