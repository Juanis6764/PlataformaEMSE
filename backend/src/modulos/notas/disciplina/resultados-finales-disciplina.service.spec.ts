/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { ConflictException } from '@nestjs/common';
import { EstadoSemanaDisciplina, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditoriaService } from '../../auditoria/auditoria.service';
import { NotificacionesNotasService } from '../comun/notificaciones-notas.service';
import { ValidacionesNotasService } from '../comun/validaciones-notas.service';
import { ConsultasDisciplinaService } from './consultas-disciplina.service';
import { ResultadosFinalesDisciplinaService } from './resultados-finales-disciplina.service';

describe('ResultadosFinalesDisciplinaService - envío a Evaluaciones', () => {
  const tx = {
    resultadoFinalDisciplina: { updateMany: jest.fn() },
  };
  const prisma = {
    cadete: { findMany: jest.fn() },
    configuracionEvaluacionesPeriodo: { findUnique: jest.fn() },
    materiaEvaluacion: { findMany: jest.fn() },
    planillaEntrenamientoFisico: { findUnique: jest.fn() },
    configuracionDisciplinaPeriodo: { findUnique: jest.fn() },
    semanaDisciplina: { findMany: jest.fn() },
    resultadoFinalDisciplina: { findMany: jest.fn() },
    $transaction: jest.fn(
      async (operacion: (cliente: typeof tx) => Promise<unknown>) =>
        operacion(tx),
    ),
  };
  const perfil = {
    id_usuario: 8,
    tipo: 'ENCARGADO_DISCIPLINA' as const,
    cursos_asignados: [],
    permisos: new Set(['PUBLICAR_NOTAS']),
  };
  const validaciones = {
    validarAccesoCurso: jest.fn().mockResolvedValue(perfil),
    exigirTipo: jest.fn(),
    exigirPermiso: jest.fn(),
  };
  const consultas = { acumulado: jest.fn() };
  const auditoria = { registrar: jest.fn() };
  const notificaciones = {
    destinatariosEvaluaciones: jest.fn().mockResolvedValue([41]),
    crearEventoResultadoFinal: jest.fn().mockResolvedValue({ count: 1 }),
  };
  const servicio = new ResultadosFinalesDisciplinaService(
    prisma as unknown as PrismaService,
    validaciones as unknown as ValidacionesNotasService,
    consultas as unknown as ConsultasDisciplinaService,
    auditoria as unknown as AuditoriaService,
    notificaciones as unknown as NotificacionesNotasService,
  );
  const seleccion = { id_gestion: 7, id_periodo: 11, id_curso: 3 };
  const configuracion = {
    id_configuracion: 31,
    activo: true,
    cantidad_semanas: 2,
    periodo: {
      id_gestion: 7,
      periodo: 'I',
      gestion: { ano: 2026 },
    },
    curso: { nombre: 'PRIMER_ANO' },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    validaciones.validarAccesoCurso.mockResolvedValue(perfil);
    prisma.configuracionDisciplinaPeriodo.findUnique.mockResolvedValue(
      configuracion,
    );
    prisma.$transaction.mockImplementation(
      async (operacion: (cliente: typeof tx) => Promise<unknown>) =>
        operacion(tx),
    );
    notificaciones.destinatariosEvaluaciones.mockResolvedValue([41]);
    prisma.cadete.findMany.mockResolvedValue([{ id_cadete: 101 }]);
    prisma.configuracionEvaluacionesPeriodo.findUnique.mockResolvedValue({
      activo: true,
      cantidad_materias: 1,
    });
    prisma.materiaEvaluacion.findMany.mockResolvedValue([
      { notas: [{ id_cadete: 101 }] },
    ]);
    prisma.planillaEntrenamientoFisico.findUnique.mockResolvedValue({
      notas: [{ id_cadete: 101 }],
    });
    consultas.acumulado.mockResolvedValue({
      cadetes: [
        {
          id_cadete: 101,
          total_demeritos: '8.0000',
          total_meritos: '2.0000',
          demerito_neto: '6.0000',
          nota: '94.1200',
        },
      ],
    });
  });

  it('impide enviar cuando faltan semanas publicadas', async () => {
    prisma.semanaDisciplina.findMany.mockResolvedValue([
      { numero_semana: 1, estado: EstadoSemanaDisciplina.PUBLICADO },
    ]);

    await expect(
      servicio.enviarEvaluaciones(8, seleccion),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.resultadoFinalDisciplina.findMany).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('envía el resultado completo, audita y notifica de forma reutilizable', async () => {
    const fechaEnvio = new Date('2026-08-22T12:00:00.000Z');
    prisma.configuracionDisciplinaPeriodo.findUnique.mockResolvedValue({
      ...configuracion,
      cantidad_semanas: 1,
    });
    prisma.semanaDisciplina.findMany.mockResolvedValue([
      { numero_semana: 1, estado: EstadoSemanaDisciplina.PUBLICADO },
    ]);
    prisma.resultadoFinalDisciplina.findMany.mockImplementation(
      (argumentos: { include?: unknown }) =>
        argumentos.include
          ? [
              {
                id_cadete: 101,
                nota_final_disciplina: new Prisma.Decimal('94.32'),
                fecha_publicacion: new Date(),
                fecha_envio_evaluaciones: fechaEnvio,
                cadete: {
                  usuario: {
                    ci: '123456',
                    nombres: 'Juan',
                    apellidos: 'Pérez',
                  },
                },
              },
            ]
          : [{ id_cadete: 101, fecha_envio_evaluaciones: null }],
    );

    const resultado = await servicio.enviarEvaluaciones(8, seleccion);

    expect(tx.resultadoFinalDisciplina.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ fecha_envio_evaluaciones: null }),
        data: expect.objectContaining({ id_emisor_evaluaciones: 8 }),
      }),
    );
    expect(auditoria.registrar).toHaveBeenCalledWith(
      expect.objectContaining({
        accion: 'ENVIAR_RESULTADO_FINAL_A_EVALUACIONES',
      }),
      tx,
    );
    expect(notificaciones.crearEventoResultadoFinal).toHaveBeenCalledWith(
      expect.objectContaining({
        id_gestion: 7,
        id_periodo: 11,
        id_curso: 3,
        destinatarios: [41],
      }),
      tx,
    );
    expect(resultado).toMatchObject({
      completo: true,
      publicado: true,
      enviado_evaluaciones: true,
      puede_enviar_evaluaciones: false,
    });
    expect(resultado.filas[0].nota_final_disciplina).toBe('94.3200');
  });
});
