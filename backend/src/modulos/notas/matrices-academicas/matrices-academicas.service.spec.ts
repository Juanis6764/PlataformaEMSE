/* eslint-disable @typescript-eslint/no-explicit-any */
import { ConflictException } from '@nestjs/common';
import { EstadoMatrizAcademica, Prisma } from '@prisma/client';
import { MatricesAcademicasService } from './matrices-academicas.service';

describe('MatricesAcademicasService - corrección extraordinaria', () => {
  it('recalcula toda la cohorte, conserva PUBLICADO y reasigna el ranking completo', async () => {
    const detalles = [1, 2, 3, 4, 5].map((idCadete) => ({
      id_cadete: idCadete,
      promedio_general: new Prisma.Decimal(80),
      orden_merito: idCadete,
    }));
    const tx = {
      detalleMatrizAcademica: {
        updateMany: jest.fn().mockResolvedValue({ count: 5 }),
        update: jest.fn().mockResolvedValue({}),
      },
    };
    const prisma = {
      matrizAcademica: {
        findUnique: jest.fn().mockResolvedValue({
          id_matriz: 10,
          id_periodo: 3,
          id_curso: 1,
          estado: EstadoMatrizAcademica.PUBLICADO,
          detalles,
          periodo: { id_gestion: 1 },
        }),
      },
      $transaction: jest.fn(async (operacion: (cliente: typeof tx) => unknown) =>
        operacion(tx),
      ),
    };
    const auditoria = { registrar: jest.fn().mockResolvedValue({}) };
    const servicio = new MatricesAcademicasService(
      prisma as any,
      {} as any,
      auditoria as any,
      {} as any,
    );
    const fila = (idCadete: number, promedio: number, aplazos: number) => ({
      id_cadete: idCadete,
      ci: `${idCadete}`,
      nombres: `N${idCadete}`,
      apellidos: `A${idCadete}`,
      materias: [],
      promedio_academico: new Prisma.Decimal(promedio),
      ponderacion_evaluaciones: new Prisma.Decimal(promedio).times('0.8'),
      nota_entrenamiento_fisico: new Prisma.Decimal(100),
      ponderacion_entrenamiento: new Prisma.Decimal(10),
      nota_disciplina: new Prisma.Decimal(100),
      ponderacion_disciplina: new Prisma.Decimal(10),
      promedio_general: new Prisma.Decimal(promedio),
      cantidad_aplazos: aplazos,
      promedio_acumulado: new Prisma.Decimal(promedio),
      cantidad_aplazos_acumulados: 0,
      atributo: 'E',
      orden_merito: null,
    });
    jest.spyOn(servicio as any, 'calcularSemestral').mockResolvedValue({
      completo: true,
      filas: [
        fila(1, 77.452, 0),
        fila(2, 84.2497, 1),
        fila(3, 77.2221, 1),
        fila(4, 82.6777, 2),
        fila(5, 90, 0),
      ],
    });
    jest
      .spyOn(servicio as any, 'recalcularAnualPorCorreccion')
      .mockResolvedValue({ recalculada: false });

    await servicio.recalcularPorCorreccion(3, 1, 8, 'Resolución autorizada');

    expect(tx.detalleMatrizAcademica.update).toHaveBeenCalledTimes(5);
    const cambios = tx.detalleMatrizAcademica.update.mock.calls.map(
      ([llamada]) => llamada,
    );
    expect(cambios.map((cambio) => cambio.where.id_matriz_id_cadete.id_cadete)).toEqual([
      1,
      2,
      3,
      4,
      5,
    ]);
    expect(cambios.map((cambio) => cambio.data.orden_merito)).toEqual([
      2, 3, 4, 5, 1,
    ]);
    expect(auditoria.registrar).toHaveBeenCalledWith(
      expect.objectContaining({
        accion: 'RECALCULAR_MATRIZ_POR_CORRECCION_EXTRAORDINARIA',
        datos_despues: expect.objectContaining({
          estado_conservado: EstadoMatrizAcademica.PUBLICADO,
        }),
      }),
      tx,
    );
  });

  it('reporta el empate exacto sin inventar un tercer criterio', () => {
    const servicio = new MatricesAcademicasService(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );
    const base = {
      ci: '1',
      nombres: 'Nombre',
      apellidos: 'Apellido',
      materias: [],
      promedio_academico: new Prisma.Decimal(80),
      ponderacion_evaluaciones: new Prisma.Decimal(64),
      nota_entrenamiento_fisico: new Prisma.Decimal(80),
      ponderacion_entrenamiento: new Prisma.Decimal(8),
      nota_disciplina: new Prisma.Decimal(80),
      ponderacion_disciplina: new Prisma.Decimal(8),
      promedio_general: new Prisma.Decimal('80.1234'),
      cantidad_aplazos: 1,
      promedio_acumulado: new Prisma.Decimal('80.1234'),
      cantidad_aplazos_acumulados: 1,
      atributo: 'MB',
      orden_merito: null,
    };

    expect(() =>
      (servicio as any).asignarOrden([
        { ...base, id_cadete: 10 },
        { ...base, id_cadete: 11 },
      ]),
    ).toThrow(ConflictException);
    try {
      (servicio as any).asignarOrden([
        { ...base, id_cadete: 10 },
        { ...base, id_cadete: 11 },
      ]);
    } catch (error) {
      const respuesta = (error as ConflictException).getResponse() as {
        empates: Array<{
          cantidad_aplazos: number;
          promedio_general: string;
          ids_cadetes: number[];
        }>;
      };
      expect(respuesta.empates).toEqual([
        {
          cantidad_aplazos: 1,
          promedio_general: '80.1234',
          ids_cadetes: [10, 11],
        },
      ]);
    }
  });
});
