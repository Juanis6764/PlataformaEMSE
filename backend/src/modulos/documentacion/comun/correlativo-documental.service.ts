import { Injectable } from '@nestjs/common';
import { AmbitoCorrelativoDocumental, Prisma, TipoDocumento } from '@prisma/client';

const PREFIJOS_TIPO_DOCUMENTO: Record<TipoDocumento, string> = {
  RADIOGRAMA: 'RAD',
  MEMORANDUM: 'MEM',
  OFICIO: 'OFI',
  NOTA_SERVICIO: 'NOT',
  INFORME: 'INF',
  DIRECTIVA: 'DIR',
  CIRCULAR: 'CIR',
  PARTE: 'PAR',
};

const AMBITO_POR_TIPO: Record<TipoDocumento, AmbitoCorrelativoDocumental> = {
  RADIOGRAMA: AmbitoCorrelativoDocumental.DOC_RADIOGRAMA,
  MEMORANDUM: AmbitoCorrelativoDocumental.DOC_MEMORANDUM,
  OFICIO: AmbitoCorrelativoDocumental.DOC_OFICIO,
  NOTA_SERVICIO: AmbitoCorrelativoDocumental.DOC_NOTA_SERVICIO,
  INFORME: AmbitoCorrelativoDocumental.DOC_INFORME,
  DIRECTIVA: AmbitoCorrelativoDocumental.DOC_DIRECTIVA,
  CIRCULAR: AmbitoCorrelativoDocumental.DOC_CIRCULAR,
  PARTE: AmbitoCorrelativoDocumental.DOC_PARTE,
};

/**
 * Genera codigo_interno / numero de HojaRuta mediante un UPSERT atómico
 * (INSERT ... ON CONFLICT ... DO UPDATE ... RETURNING) sobre
 * CorrelativoDocumental. Postgres serializa los conflictos concurrentes
 * sobre la misma fila (ambito, anio) — nunca se repite un número, nunca se
 * usa MAX()+1.
 */
@Injectable()
export class CorrelativoDocumentalService {
  async siguienteNumero(
    cliente: Prisma.TransactionClient,
    ambito: AmbitoCorrelativoDocumental,
    anio: number,
  ): Promise<number> {
    const resultado = await cliente.$queryRaw<{ ultimo_numero: number }[]>`
      INSERT INTO "CorrelativoDocumental" ("ambito", "anio", "ultimo_numero")
      VALUES (${ambito}::"AmbitoCorrelativoDocumental", ${anio}, 1)
      ON CONFLICT ("ambito", "anio")
      DO UPDATE SET "ultimo_numero" = "CorrelativoDocumental"."ultimo_numero" + 1
      RETURNING "ultimo_numero";
    `;
    return resultado[0].ultimo_numero;
  }

  async generarCodigoDocumento(
    cliente: Prisma.TransactionClient,
    tipoDocumento: TipoDocumento,
    anio: number,
  ): Promise<string> {
    const numero = await this.siguienteNumero(
      cliente,
      AMBITO_POR_TIPO[tipoDocumento],
      anio,
    );
    return `${PREFIJOS_TIPO_DOCUMENTO[tipoDocumento]}-${anio}-${String(numero).padStart(6, '0')}`;
  }

  async generarNumeroHojaRuta(
    cliente: Prisma.TransactionClient,
    anio: number,
  ): Promise<string> {
    const numero = await this.siguienteNumero(
      cliente,
      AmbitoCorrelativoDocumental.HOJA_RUTA,
      anio,
    );
    return `HR-${anio}-${String(numero).padStart(6, '0')}`;
  }
}
