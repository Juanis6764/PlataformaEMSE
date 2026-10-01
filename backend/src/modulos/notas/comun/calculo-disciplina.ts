import { Prisma, TipoDisciplina } from '@prisma/client';

export interface PuntajeDisciplina {
  tipo: TipoDisciplina;
  puntaje: Prisma.Decimal;
}

export interface AcumuladoDisciplina {
  total_meritos: string;
  total_demeritos: string;
  demerito_neto: string;
  valor_por_punto: string;
  descuento: string;
  nota: string;
  alerta: boolean;
}

const CERO = new Prisma.Decimal(0);
const CIEN = new Prisma.Decimal('100.0000');
const FACTOR_DESCUENTO = new Prisma.Decimal('0.9800');
const UMBRAL_ALERTA = new Prisma.Decimal(30);

/** Cálculo institucional exacto; no convierte los puntajes a number. */
export function calcularAcumuladoDisciplina(
  registros: PuntajeDisciplina[],
): AcumuladoDisciplina {
  let totalMeritos = CERO;
  let totalDemeritos = CERO;

  for (const registro of registros) {
    if (registro.tipo === TipoDisciplina.MERITO) {
      totalMeritos = totalMeritos.add(registro.puntaje);
    } else {
      totalDemeritos = totalDemeritos.add(registro.puntaje);
    }
  }

  const diferencia = totalDemeritos.sub(totalMeritos);
  const demeritoNeto = diferencia.greaterThan(CERO) ? diferencia : CERO;
  const descuento = demeritoNeto.mul(FACTOR_DESCUENTO);
  const nota = CIEN.sub(descuento);

  return {
    total_meritos: totalMeritos.toFixed(4),
    total_demeritos: totalDemeritos.toFixed(4),
    demerito_neto: demeritoNeto.toFixed(4),
    valor_por_punto: FACTOR_DESCUENTO.toFixed(4),
    descuento: descuento.toFixed(4),
    nota: nota.toFixed(4),
    alerta: demeritoNeto.greaterThan(UMBRAL_ALERTA),
  };
}
