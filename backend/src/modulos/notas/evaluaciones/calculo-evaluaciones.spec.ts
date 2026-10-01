import {
  calcularOrdenMerito,
  clasificarNota,
  notaConsiderada,
  promedioNotas,
} from './calculo-evaluaciones';

describe('cálculos de Evaluaciones', () => {
  it.each([
    ['100', 'E'],
    ['99', 'MB'],
    ['91', 'MB'],
    ['85', 'MB'],
    ['84', 'B'],
    ['82', 'B'],
    ['71', 'B'],
    ['70', 'R'],
    ['51', 'R'],
    ['50', 'M'],
    ['0', 'M'],
  ])('clasifica %s como %s', (nota, clasificacion) => {
    expect(clasificarNota(nota)).toBe(clasificacion);
  });

  it('conserva la inicial y considera el desquite cuando existe', () => {
    expect(notaConsiderada('45', '68').toFixed(4)).toBe('68.0000');
    expect(notaConsiderada('82', null).toFixed(4)).toBe('82.0000');
  });

  it('mantiene cuatro decimales en el promedio', () => {
    expect(promedioNotas(['82', '91', '86.3125'])).toBe('86.4375');
  });

  it('usa ranking competitivo y conserva empates', () => {
    const posiciones = calcularOrdenMerito([
      { id_cadete: 1, nota: '95' },
      { id_cadete: 2, nota: '88' },
      { id_cadete: 3, nota: '95' },
      { id_cadete: 4, nota: '80' },
    ]);
    expect([...posiciones.entries()]).toEqual([
      [1, 1],
      [3, 1],
      [2, 3],
      [4, 4],
    ]);
  });
});
