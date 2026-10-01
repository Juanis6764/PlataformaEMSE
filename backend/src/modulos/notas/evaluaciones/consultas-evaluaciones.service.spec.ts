/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { EstadoSemanaDisciplina, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { ValidacionesNotasService } from '../comun/validaciones-notas.service';
import { ConsultasEvaluacionesService } from './consultas-evaluaciones.service';

describe('ConsultasEvaluacionesService - resultados recibidos', () => {
  const prisma = {
    periodoLectivo: { findUnique: jest.fn() },
    curso: { findUnique: jest.fn() },
    configuracionEvaluacionesPeriodo: { findUnique: jest.fn() },
    materiaEvaluacion: { count: jest.fn() },
    resultadoFinalDisciplina: { findMany: jest.fn() },
    planillaEntrenamientoFisico: { findUnique: jest.fn() },
    notificacion: { findFirst: jest.fn() },
  };
  const perfil = {
    id_usuario: 41,
    tipo: 'ENCARGADO_EVALUACIONES' as const,
    cursos_asignados: [],
    permisos: new Set(['VER_NOTAS']),
  };
  const validaciones = {
    validarAccesoCursoEvaluaciones: jest.fn().mockResolvedValue(perfil),
    exigirTipo: jest.fn(),
    exigirPermiso: jest.fn(),
  };
  const servicio = new ConsultasEvaluacionesService(
    prisma as unknown as PrismaService,
    validaciones as unknown as ValidacionesNotasService,
  );
  const seleccion = { id_gestion: 7, id_periodo: 11, id_curso: 3 };

  beforeEach(() => {
    jest.clearAllMocks();
    validaciones.validarAccesoCursoEvaluaciones.mockResolvedValue(perfil);
    prisma.periodoLectivo.findUnique.mockResolvedValue({
      id_periodo: 11,
      id_gestion: 7,
      periodo: 'I',
      gestion: { ano: 2026 },
    });
    prisma.curso.findUnique.mockResolvedValue({
      id_curso: 3,
      nombre: 'PRIMER_ANO',
    });
  });

  it('muestra únicamente las notas finales enviadas y conserva cuatro decimales', async () => {
    const fechaDisciplina = new Date('2026-08-20T12:00:00.000Z');
    const fechaEntrenamiento = new Date('2026-08-21T12:00:00.000Z');
    prisma.configuracionEvaluacionesPeriodo.findUnique.mockResolvedValue({
      activo: true,
      cantidad_materias: 2,
    });
    prisma.materiaEvaluacion.count.mockResolvedValue(2);
    prisma.resultadoFinalDisciplina.findMany.mockResolvedValue([
      {
        id_cadete: 101,
        nota_final_disciplina: new Prisma.Decimal('94.32'),
        fecha_envio_evaluaciones: fechaDisciplina,
        cadete: {
          usuario: { ci: '123456', nombres: 'Juan', apellidos: 'Pérez' },
        },
      },
    ]);
    prisma.planillaEntrenamientoFisico.findUnique.mockResolvedValue({
      id_planilla: 22,
      estado: EstadoSemanaDisciplina.REVISADO,
      version_flujo: 4,
      notas: [
        {
          id_cadete: 101,
          nota_final: new Prisma.Decimal('86.2'),
          cadete: {
            usuario: { ci: '123456', nombres: 'Juan', apellidos: 'Pérez' },
          },
        },
      ],
    });
    prisma.notificacion.findFirst.mockResolvedValue({
      fecha_creacion: fechaEntrenamiento,
    });

    const resultado = await servicio.resultadosRecibidos(41, seleccion);

    expect(resultado.evaluaciones).toMatchObject({
      estado: 'COMPLETO',
      materias_configuradas: 2,
      materias_publicadas: 2,
    });
    expect(resultado.disciplina).toMatchObject({
      estado: 'RECIBIDO',
      fecha_recepcion: fechaDisciplina,
      cantidad_cadetes: 1,
    });
    expect(resultado.disciplina.notas[0]).toMatchObject({
      ci: '123456',
      apellidos: 'Pérez',
      nombres: 'Juan',
      nota_final: '94.3200',
    });
    expect(resultado.entrenamiento_fisico).toMatchObject({
      estado: 'RECIBIDO',
      id_planilla: 22,
      fecha_recepcion: fechaEntrenamiento,
      cantidad_cadetes: 1,
    });
    expect(resultado.entrenamiento_fisico.notas[0].nota_final).toBe('86.2000');
    expect(prisma.notificacion.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id_referencia: 22,
          clave_evento: {
            startsWith: 'ENTRENAMIENTO_FISICO:RESULTADO_FINAL:22:4:',
          },
        }),
      }),
    );
  });

  it('no expone resultados parciales ni versiones de Entrenamiento no enviadas', async () => {
    prisma.configuracionEvaluacionesPeriodo.findUnique.mockResolvedValue({
      activo: true,
      cantidad_materias: 3,
    });
    prisma.materiaEvaluacion.count.mockResolvedValue(2);
    prisma.resultadoFinalDisciplina.findMany.mockResolvedValue([
      {
        id_cadete: 101,
        nota_final_disciplina: new Prisma.Decimal('90'),
        fecha_envio_evaluaciones: new Date(),
        cadete: {
          usuario: { ci: '1', nombres: 'Uno', apellidos: 'Cadete' },
        },
      },
      {
        id_cadete: 102,
        nota_final_disciplina: new Prisma.Decimal('91'),
        fecha_envio_evaluaciones: null,
        cadete: {
          usuario: { ci: '2', nombres: 'Dos', apellidos: 'Cadete' },
        },
      },
    ]);
    prisma.planillaEntrenamientoFisico.findUnique.mockResolvedValue({
      id_planilla: 22,
      estado: EstadoSemanaDisciplina.REVISADO,
      version_flujo: 5,
      notas: [
        {
          id_cadete: 101,
          nota_final: new Prisma.Decimal('86'),
          cadete: {
            usuario: { ci: '1', nombres: 'Uno', apellidos: 'Cadete' },
          },
        },
      ],
    });
    prisma.notificacion.findFirst.mockResolvedValue(null);

    const resultado = await servicio.resultadosRecibidos(41, seleccion);

    expect(resultado.evaluaciones.estado).toBe('PENDIENTE');
    expect(resultado.disciplina).toMatchObject({
      estado: 'PENDIENTE',
      cantidad_cadetes: 0,
      notas: [],
    });
    expect(resultado.entrenamiento_fisico).toMatchObject({
      estado: 'PENDIENTE',
      id_planilla: null,
      cantidad_cadetes: 0,
      notas: [],
    });
  });
});
