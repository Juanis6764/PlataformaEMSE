import { Prisma, TipoDisciplina } from '@prisma/client';
import { calcularAcumuladoDisciplina } from './calculo-disciplina';

describe('calcularAcumuladoDisciplina', () => {
  it('calcula 18 de deméritos y 2 de méritos con cuatro decimales', () => {
    const resultado = calcularAcumuladoDisciplina([
      { tipo: TipoDisciplina.DEMERITO, puntaje: new Prisma.Decimal(6) },
      { tipo: TipoDisciplina.DEMERITO, puntaje: new Prisma.Decimal(6) },
      { tipo: TipoDisciplina.DEMERITO, puntaje: new Prisma.Decimal(6) },
      { tipo: TipoDisciplina.MERITO, puntaje: new Prisma.Decimal(2) },
    ]);

    expect(resultado).toEqual({
      total_meritos: '2.0000',
      total_demeritos: '18.0000',
      demerito_neto: '16.0000',
      valor_por_punto: '0.9800',
      descuento: '15.6800',
      nota: '84.3200',
      alerta: false,
    });
  });

  it('incluye un cadete sin registros con nota 100.0000', () => {
    expect(calcularAcumuladoDisciplina([])).toEqual({
      total_meritos: '0.0000',
      total_demeritos: '0.0000',
      demerito_neto: '0.0000',
      valor_por_punto: '0.9800',
      descuento: '0.0000',
      nota: '100.0000',
      alerta: false,
    });
  });

  it('no devuelve demérito neto negativo', () => {
    const resultado = calcularAcumuladoDisciplina([
      { tipo: TipoDisciplina.DEMERITO, puntaje: new Prisma.Decimal('1.5') },
      { tipo: TipoDisciplina.MERITO, puntaje: new Prisma.Decimal('3.25') },
    ]);
    expect(resultado.demerito_neto).toBe('0.0000');
    expect(resultado.nota).toBe('100.0000');
  });

  it('activa la alerta solo cuando el neto es mayor a 30', () => {
    const enUmbral = calcularAcumuladoDisciplina([
      { tipo: TipoDisciplina.DEMERITO, puntaje: new Prisma.Decimal(30) },
    ]);
    const sobreUmbral = calcularAcumuladoDisciplina([
      {
        tipo: TipoDisciplina.DEMERITO,
        puntaje: new Prisma.Decimal('30.0001'),
      },
    ]);
    expect(enUmbral.alerta).toBe(false);
    expect(sobreUmbral.alerta).toBe(true);
  });
});
