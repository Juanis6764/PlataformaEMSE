import { ConflictException } from '@nestjs/common';
import { EstadoSemanaDisciplina, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditoriaService } from '../../auditoria/auditoria.service';
import { FlujoNotasService } from '../comun/flujo-notas.service';
import { NotificacionesNotasService } from '../comun/notificaciones-notas.service';
import { ValidacionesNotasService } from '../comun/validaciones-notas.service';
import { EntrenamientoFisicoService } from './entrenamiento-fisico.service';

describe('EntrenamientoFisicoService - envío a Evaluaciones', () => {
  const tx = {};
  const prisma = {
    planillaEntrenamientoFisico: { findUnique: jest.fn() },
    notaEntrenamientoFisico: { count: jest.fn() },
    $transaction: jest.fn(
      async (operacion: (cliente: typeof tx) => Promise<unknown>) =>
        operacion(tx),
    ),
  };
  const perfil = {
    id_usuario: 9,
    tipo: 'ENCARGADO_ENTRENAMIENTO_FISICO' as const,
    cursos_asignados: [],
    permisos: new Set(['ENVIAR_NOTAS']),
  };
  const validaciones = {
    obtenerPerfilEntrenamientoFisico: jest.fn(),
    validarAccesoCursoEntrenamientoFisico: jest.fn().mockResolvedValue(perfil),
    exigirTipo: jest.fn(),
    exigirPermiso: jest.fn(),
  };
  const flujo = {};
  const notificaciones = {
    destinatariosEvaluaciones: jest.fn().mockResolvedValue([41]),
    crearEventoResultadoEntrenamientoFisico: jest
      .fn()
      .mockResolvedValue({ count: 1 }),
  };
  const auditoria = { registrar: jest.fn() };
  const servicio = new EntrenamientoFisicoService(
    prisma as unknown as PrismaService,
    validaciones as unknown as ValidacionesNotasService,
    flujo as unknown as FlujoNotasService,
    notificaciones as unknown as NotificacionesNotasService,
    auditoria as unknown as AuditoriaService,
  );
  const planilla = {
    id_planilla: 22,
    id_periodo: 11,
    id_curso: 3,
    estado: EstadoSemanaDisciplina.REVISADO,
    version_flujo: 4,
    periodo: {
      id_gestion: 7,
      periodo: 'I',
      gestion: { ano: 2026 },
    },
    curso: { nombre: 'PRIMER_ANO' },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.planillaEntrenamientoFisico.findUnique.mockResolvedValue(planilla);
    prisma.notaEntrenamientoFisico.count
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(2);
    prisma.$transaction.mockImplementation(
      async (operacion: (cliente: typeof tx) => Promise<unknown>) =>
        operacion(tx),
    );
    validaciones.validarAccesoCursoEntrenamientoFisico.mockResolvedValue(
      perfil,
    );
    notificaciones.destinatariosEvaluaciones.mockResolvedValue([41]);
    notificaciones.crearEventoResultadoEntrenamientoFisico.mockResolvedValue({
      count: 1,
    });
  });

  it('envía una planilla REVISADO completa, registra auditoría y notifica', async () => {
    const resultado = await servicio.enviarEvaluaciones(9, 22);

    expect(resultado).toEqual({
      id_planilla: 22,
      cantidad: 2,
      ya_enviado: false,
    });
    expect(
      notificaciones.crearEventoResultadoEntrenamientoFisico,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        id_planilla: 22,
        version_flujo: 4,
        id_gestion: 7,
        id_periodo: 11,
        id_curso: 3,
        id_destinatario: 41,
      }),
      tx,
    );
    expect(auditoria.registrar).toHaveBeenCalledWith(
      expect.objectContaining({
        accion: 'ENVIAR_RESULTADO_EVALUACIONES',
        id_entidad: 22,
      }),
      tx,
    );
  });

  it('es idempotente cuando ya existe la notificación versionada', async () => {
    notificaciones.crearEventoResultadoEntrenamientoFisico.mockResolvedValue({
      count: 0,
    });

    const resultado = await servicio.enviarEvaluaciones(9, 22);

    expect(resultado.ya_enviado).toBe(true);
    expect(auditoria.registrar).not.toHaveBeenCalled();
  });

  it('rechaza una planilla que todavía no esté REVISADO', async () => {
    prisma.planillaEntrenamientoFisico.findUnique.mockResolvedValue({
      ...planilla,
      estado: EstadoSemanaDisciplina.EN_REVISION,
    });

    await expect(servicio.enviarEvaluaciones(9, 22)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('lista para Sección Académica las pendientes de los tres cursos sin filtrar por curso', async () => {
    validaciones.obtenerPerfilEntrenamientoFisico.mockResolvedValue({
      ...perfil,
      tipo: 'SECCION_ACADEMICA',
      permisos: new Set(['REVISAR_NOTAS']),
    });
    const planillas = [1, 2, 3].map((idCurso) => ({
      id_planilla: idCurso,
      id_curso: idCurso,
      nivel_revision_actual: 'SECCION_ACADEMICA',
    }));
    const listar = jest.spyOn(servicio, 'listar').mockResolvedValue(planillas as never);

    await expect(servicio.pendientes(10)).resolves.toEqual(planillas);
    expect(listar).toHaveBeenCalledWith(10, {
      estado: EstadoSemanaDisciplina.EN_REVISION,
    });
  });
});

describe('EntrenamientoFisicoService - corrección extraordinaria', () => {
  it('permite a Comando cambiar 80 a 90, audita y recalcula la matriz', async () => {
    const actual = {
      id_nota: 12,
      id_cadete: 7,
      nota_final: new Prisma.Decimal(80),
      planilla: {
        id_planilla: 4,
        id_periodo: 3,
        id_curso: 1,
        estado: EstadoSemanaDisciplina.REVISADO,
        nivel_revision_actual: null,
        version_flujo: 2,
        periodo: { id_gestion: 1, periodo: 'I', gestion: { ano: 2026 } },
        curso: { nombre: 'PRIMER_AÑO' },
      },
    };
    const txCorreccion = {
      planillaEntrenamientoFisico: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUniqueOrThrow: jest.fn().mockResolvedValue({
          ...actual.planilla,
          id_creador: 9,
          version_flujo: 3,
        }),
      },
      notaEntrenamientoFisico: {
        update: jest.fn().mockResolvedValue({
          ...actual,
          nota_final: new Prisma.Decimal(90),
        }),
      },
    };
    const prismaCorreccion = {
      notaEntrenamientoFisico: {
        findUnique: jest.fn().mockResolvedValue(actual),
      },
      $transaction: jest.fn(
        async (operacion: (cliente: typeof txCorreccion) => unknown) =>
          operacion(txCorreccion),
      ),
    };
    const perfilComando = {
      tipo: 'COMANDO',
      permisos: new Set(['MODIFICAR_NOTA_BLOQUEADA']),
    };
    const validacionesCorreccion = {
      validarAccesoCursoEntrenamientoFisico: jest
        .fn()
        .mockResolvedValue(perfilComando),
      exigirTipo: jest.fn(),
      exigirPermiso: jest.fn(),
    };
    const notificacionesCorreccion = {
      destinatariosEncargadoEntrenamientoFisico: jest.fn().mockResolvedValue([]),
      crearEventoEntrenamientoFisico: jest.fn().mockResolvedValue({}),
    };
    const auditoriaCorreccion = { registrar: jest.fn().mockResolvedValue({}) };
    const matrices = { recalcularPorCorreccion: jest.fn().mockResolvedValue({}) };
    const servicioCorreccion = new EntrenamientoFisicoService(
      prismaCorreccion as unknown as PrismaService,
      validacionesCorreccion as unknown as ValidacionesNotasService,
      {} as FlujoNotasService,
      notificacionesCorreccion as unknown as NotificacionesNotasService,
      auditoriaCorreccion as unknown as AuditoriaService,
      matrices as never,
    );

    const resultado = await servicioCorreccion.modificarExtraordinariamente(
      8,
      12,
      {
        nota_final: '90.0000',
        justificacion: 'Resolución autorizada por Comando',
      },
    );

    expect(resultado.nota_final).toBe('90.0000');
    expect(auditoriaCorreccion.registrar).toHaveBeenCalledWith(
      expect.objectContaining({
        datos_antes: { nota_final: '80.0000' },
        datos_despues: expect.objectContaining({
          nota_final: '90.0000',
          rol: 'COMANDO',
          area: 'ENTRENAMIENTO_FISICO',
          id_cadete: 7,
        }),
      }),
      txCorreccion,
    );
    expect(matrices.recalcularPorCorreccion).toHaveBeenCalledWith(
      3,
      1,
      8,
      'Resolución autorizada por Comando',
    );
  });
});
