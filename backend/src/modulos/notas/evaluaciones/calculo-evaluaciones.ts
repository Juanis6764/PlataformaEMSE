import { Prisma } from '@prisma/client';

export type ValorNota = Prisma.Decimal | string | number;

export function notaConsiderada(
  notaInicial: ValorNota,
  notaDesquite?: ValorNota | null,
) {
  return new Prisma.Decimal(notaDesquite ?? notaInicial);
}

export function clasificarNota(valor: ValorNota): 'E' | 'MB' | 'B' | 'R' | 'M' {
  const nota = new Prisma.Decimal(valor);
  if (nota.equals(100)) return 'E';
  if (nota.greaterThanOrEqualTo(85)) return 'MB';
  if (nota.greaterThanOrEqualTo(71)) return 'B';
  if (nota.greaterThanOrEqualTo(51)) return 'R';
  return 'M';
}

export function promedioNotas(valores: ValorNota[]): string | null {
  if (valores.length === 0) return null;
  const suma = valores.reduce<Prisma.Decimal>(
    (acumulado, valor) => acumulado.plus(valor),
    new Prisma.Decimal(0),
  );
  return suma.dividedBy(valores.length).toDecimalPlaces(4).toFixed(4);
}

export function calcularOrdenMerito<
  T extends { id_cadete: number; nota: ValorNota },
>(filas: T[]) {
  const ordenadas = [...filas].sort((a, b) => {
    const comparacion = new Prisma.Decimal(b.nota).comparedTo(a.nota);
    return comparacion || a.id_cadete - b.id_cadete;
  });
  const posiciones = new Map<number, number>();
  let notaAnterior: Prisma.Decimal | null = null;
  let posicionAnterior = 0;
  ordenadas.forEach((fila, indice) => {
    const nota = new Prisma.Decimal(fila.nota);
    const posicion = notaAnterior?.equals(nota) ? posicionAnterior : indice + 1;
    posiciones.set(fila.id_cadete, posicion);
    notaAnterior = nota;
    posicionAnterior = posicion;
  });
  return posiciones;
}
