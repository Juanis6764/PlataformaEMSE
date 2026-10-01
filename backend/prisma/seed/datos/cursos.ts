/**
 * CURSOS ACADÉMICOS
 * Representa los tres años de formación de los cadetes.
 * El campo `orden` define la secuencia de promoción.
 */
export const CURSOS = [
  { nombre: 'Primer Año',   orden: 1 },
  { nombre: 'Segundo Año',  orden: 2 },
  { nombre: 'Tercer Año',   orden: 3 },
];

/**
 * GESTIÓN ACADÉMICA ACTIVA
 * Se crea la gestión correspondiente al año en curso.
 */
export const GESTION_ACTUAL = {
  ano: new Date().getFullYear(),
};
