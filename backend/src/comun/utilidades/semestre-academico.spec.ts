import { calcularSemestreAcademico } from './semestre-academico';

describe('calcularSemestreAcademico', () => {
  it.each([
    [1, 'I', 1],
    [1, 'II', 2],
    [2, 'I', 3],
    [2, 'II', 4],
    [3, 'I', 5],
    [3, 'II', 6],
  ] as const)(
    'calcula curso %i periodo %s como semestre %i',
    (ordenCurso, periodo, esperado) => {
      expect(calcularSemestreAcademico(ordenCurso, periodo)).toBe(esperado);
    },
  );

  it.each([0, 4, 1.5])('rechaza el orden de curso inválido %s', (orden) => {
    expect(() => calcularSemestreAcademico(orden, 'I')).toThrow(RangeError);
  });
});
