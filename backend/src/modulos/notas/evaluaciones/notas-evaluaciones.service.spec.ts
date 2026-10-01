/* eslint-disable @typescript-eslint/no-explicit-any */
import { EstadoSemanaDisciplina, Prisma } from '@prisma/client';
import { NotasEvaluacionesService } from './notas-evaluaciones.service';

describe('NotasEvaluacionesService - corrección extraordinaria', () => {
  it('cambia 70 a 85, audita el valor efectivo y recalcula la matriz', async () => {
    const actual = {
      id_nota: 5,
      id_cadete: 9,
      nota_inicial: new Prisma.Decimal(70),
      nota_desquite: null,
      materia: {
        id_materia: 2,
        id_periodo: 3,
        id_curso: 1,
        nombre: 'Matemática',
        estado: EstadoSemanaDisciplina.PUBLICADO,
        nivel_revision_actual: null,
        version_flujo: 4,
        periodo: { id_gestion: 1, periodo: 'I', gestion: { ano: 2026 } },
        curso: { nombre: 'PRIMER_AÑO' },
      },
      cadete: { id_usuario: 19 },
    };
    const actualizada = {
      ...actual,
      nota_inicial: new Prisma.Decimal(85),
      nota_desquite: null,
    };
    const tx = {
      materiaEvaluacion: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUniqueOrThrow: jest.fn().mockResolvedValue({
          ...actual.materia,
          id_creador: 10,
          version_flujo: 5,
        }),
      },
      notaEvaluacion: { update: jest.fn().mockResolvedValue(actualizada) },
    };
    const prisma = {
      notaEvaluacion: { findUnique: jest.fn().mockResolvedValue(actual) },
      $transaction: jest.fn(async (operacion: (cliente: typeof tx) => unknown) =>
        operacion(tx),
      ),
    };
    const perfil = {
      tipo: 'JEFE_ESTUDIOS',
      permisos: new Set(['MODIFICAR_NOTA_BLOQUEADA']),
    };
    const validaciones = {
      validarAccesoCursoEvaluaciones: jest.fn().mockResolvedValue(perfil),
      exigirTipo: jest.fn(),
      exigirPermiso: jest.fn(),
    };
    const auditoria = { registrar: jest.fn().mockResolvedValue({}) };
    const notificaciones = {
      destinatariosOperadoresCursoEvaluaciones: jest.fn().mockResolvedValue([]),
      crearEventoEvaluaciones: jest.fn().mockResolvedValue({}),
    };
    const matrices = { recalcularPorCorreccion: jest.fn().mockResolvedValue({}) };
    const servicio = new NotasEvaluacionesService(
      prisma as any,
      validaciones as any,
      auditoria as any,
      notificaciones as any,
      matrices as any,
    );

    const resultado = await servicio.modificarExtraordinariamente(8, 5, {
      nota_inicial: '85.0000',
      nota_desquite: null,
      justificacion: 'Resolución académica autorizada',
    });

    expect(resultado.nota_considerada).toBe('85.0000');
    expect(auditoria.registrar).toHaveBeenCalledWith(
      expect.objectContaining({
        datos_antes: expect.objectContaining({ nota_considerada: '70.0000' }),
        datos_despues: expect.objectContaining({
          nota_considerada: '85.0000',
          id_cadete: 9,
          area: 'EVALUACIONES',
          rol: 'JEFE_ESTUDIOS',
        }),
      }),
      tx,
    );
    expect(matrices.recalcularPorCorreccion).toHaveBeenCalledWith(
      3,
      1,
      8,
      'Resolución académica autorizada',
    );
  });
});
