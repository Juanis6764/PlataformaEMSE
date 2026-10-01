import type { PeriodoAcademico } from '@prisma/client';

/**
 * Calcula el semestre visible desde el curso y el periodo lectivo.
 * El semestre es información derivada y nunca debe persistirse como columna.
 */
export function calcularSemestreAcademico(
  ordenCurso: number,
  periodo: PeriodoAcademico,
): number {
  if (!Number.isInteger(ordenCurso) || ordenCurso < 1 || ordenCurso > 3) {
    throw new RangeError('El orden del curso debe estar entre 1 y 3.');
  }

  return (ordenCurso - 1) * 2 + (periodo === 'I' ? 1 : 2);
}
