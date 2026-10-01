import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  EstadoSemanaDisciplina,
  NivelRevisionNota,
  PlanillaEntrenamientoFisico,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditoriaService } from '../../auditoria/auditoria.service';
import {
  AREA_ENTRENAMIENTO_FISICO,
  PERMISOS_NOTAS,
} from '../comun/constantes-notas';
import { FlujoNotasService } from '../comun/flujo-notas.service';
import { NotificacionesNotasService } from '../comun/notificaciones-notas.service';
import {
  PerfilNotas,
  ValidacionesNotasService,
} from '../comun/validaciones-notas.service';
import {
  ConsultarResultadosEntrenamientoEvaluacionesDto,
  FiltrarPlanillasEntrenamientoDto,
  GuardarNotasEntrenamientoDto,
  ModificarNotaEntrenamientoExtraordinariaDto,
  ObservarPlanillaEntrenamientoDto,
  SeleccionarPlanillaEntrenamientoDto,
} from './dto/entrenamiento-fisico.dto';
import { MatricesAcademicasService } from '../matrices-academicas/matrices-academicas.service';

@Injectable()
export class EntrenamientoFisicoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly validaciones: ValidacionesNotasService,
    private readonly flujo: FlujoNotasService,
    private readonly notificaciones: NotificacionesNotasService,
    private readonly auditoria: AuditoriaService,
    private readonly matrices?: MatricesAcademicasService,
  ) {}

  async contexto(idUsuario: number) {
    const perfil =
      await this.validaciones.obtenerPerfilEntrenamientoFisico(idUsuario);
    this.validaciones.exigirTipo(
      perfil,
      'ADMINISTRADOR',
      'ENCARGADO_ENTRENAMIENTO_FISICO',
      'SECCION_ACADEMICA',
      'JEFE_ESTUDIOS',
      'COMANDO',
    );
    this.validaciones.exigirPermiso(perfil, PERMISOS_NOTAS.VER);
    const [gestiones, cursos] = await Promise.all([
      this.prisma.gestionAcademica.findMany({
        include: {
          periodos_lectivos: { orderBy: { periodo: 'asc' } },
        },
        orderBy: { ano: 'desc' },
      }),
      this.prisma.curso.findMany({
        where: { orden: { gte: 1, lte: 3 } },
        orderBy: { orden: 'asc' },
      }),
    ]);
    return {
      perfil: perfil.tipo,
      permisos: [...perfil.permisos],
      gestiones: gestiones.map((gestion) => ({
        id_gestion: gestion.id_gestion,
        ano: gestion.ano,
        estado: gestion.estado,
        periodos: gestion.periodos_lectivos.map((periodo) => ({
          id_periodo: periodo.id_periodo,
          periodo: periodo.periodo,
          activo: periodo.activo,
        })),
      })),
      cursos: cursos.map((curso) => ({
        id_curso: curso.id_curso,
        nombre: curso.nombre,
        orden: curso.orden,
      })),
    };
  }

  async listar(idUsuario: number, filtros: FiltrarPlanillasEntrenamientoDto) {
    const perfil =
      await this.validaciones.obtenerPerfilEntrenamientoFisico(idUsuario);
    this.validaciones.exigirTipo(
      perfil,
      'ADMINISTRADOR',
      'ENCARGADO_ENTRENAMIENTO_FISICO',
      'SECCION_ACADEMICA',
      'JEFE_ESTUDIOS',
      'COMANDO',
    );
    this.validaciones.exigirPermiso(perfil, PERMISOS_NOTAS.VER);
    if (filtros.id_curso) {
      await this.validaciones.validarAccesoCursoEntrenamientoFisico(
        idUsuario,
        filtros.id_curso,
        'LECTURA',
      );
    }
    const estado =
      perfil.tipo === 'COMANDO'
        ? EstadoSemanaDisciplina.REVISADO
        : filtros.estado;
    const planillas = await this.prisma.planillaEntrenamientoFisico.findMany({
      where: {
        id_periodo: filtros.id_periodo,
        id_curso: filtros.id_curso,
        estado,
        periodo: { id_gestion: filtros.id_gestion },
      },
      include: {
        periodo: { include: { gestion: true } },
        curso: true,
        creador: {
          select: { id_usuario: true, nombres: true, apellidos: true },
        },
        notas: { select: { nota_final: true } },
      },
      orderBy: [
        { periodo: { gestion: { ano: 'desc' } } },
        { periodo: { periodo: 'asc' } },
        { curso: { orden: 'asc' } },
      ],
    });
    return planillas.map((planilla) => ({
      id_planilla: planilla.id_planilla,
      estado: planilla.estado,
      nivel_revision_actual: planilla.nivel_revision_actual,
      version_flujo: planilla.version_flujo,
      fecha_actualizacion: planilla.fecha_actualizacion,
      gestion: planilla.periodo.gestion.ano,
      id_gestion: planilla.periodo.id_gestion,
      periodo: planilla.periodo.periodo,
      id_periodo: planilla.id_periodo,
      curso: planilla.curso.nombre,
      id_curso: planilla.id_curso,
      creador: planilla.creador,
      total_cadetes: planilla.notas.length,
      notas_registradas: planilla.notas.filter(
        (nota) => nota.nota_final !== null,
      ).length,
      pendientes: planilla.notas.filter((nota) => nota.nota_final === null)
        .length,
    }));
  }

  async pendientes(idUsuario: number) {
    const perfil =
      await this.validaciones.obtenerPerfilEntrenamientoFisico(idUsuario);
    let nivel: NivelRevisionNota;
    if (perfil.tipo === 'SECCION_ACADEMICA') {
      nivel = NivelRevisionNota.SECCION_ACADEMICA;
      this.validaciones.exigirPermiso(perfil, PERMISOS_NOTAS.REVISAR);
    } else if (perfil.tipo === 'JEFE_ESTUDIOS') {
      nivel = NivelRevisionNota.JEFE_ESTUDIOS;
      this.validaciones.exigirPermiso(perfil, PERMISOS_NOTAS.MARCAR_REVISADAS);
    } else {
      throw new ForbiddenException(
        'El perfil no es revisor de Entrenamiento Físico.',
      );
    }
    const planillas = await this.listar(idUsuario, {
      estado: EstadoSemanaDisciplina.EN_REVISION,
    });
    return planillas.filter(
      (planilla) => planilla.nivel_revision_actual === nivel,
    );
  }

  async consultar(idUsuario: number, dto: SeleccionarPlanillaEntrenamientoDto) {
    const perfil =
      await this.validaciones.validarAccesoCursoEntrenamientoFisico(
        idUsuario,
        dto.id_curso,
        'LECTURA',
      );
    this.validaciones.exigirPermiso(perfil, PERMISOS_NOTAS.VER);
    const periodo = await this.prisma.periodoLectivo.findFirst({
      where: { id_periodo: dto.id_periodo, id_gestion: dto.id_gestion },
      include: { gestion: true },
    });
    if (!periodo) {
      throw new NotFoundException(
        'El periodo no pertenece a la gestión seleccionada.',
      );
    }
    const curso = await this.prisma.curso.findUniqueOrThrow({
      where: { id_curso: dto.id_curso },
    });
    const planilla = await this.prisma.planillaEntrenamientoFisico.findUnique({
      where: {
        id_periodo_id_curso: {
          id_periodo: dto.id_periodo,
          id_curso: dto.id_curso,
        },
      },
      include: {
        notas: {
          include: {
            cadete: {
              include: {
                usuario: {
                  select: {
                    ci: true,
                    nombres: true,
                    apellidos: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!planilla) {
      if (perfil.tipo === 'COMANDO') {
        return this.respuestaConsulta(perfil, periodo, curso, null, [], false);
      }
      const cadetes = await this.prisma.cadete.findMany({
        where: { id_curso: dto.id_curso },
        include: {
          usuario: {
            select: { ci: true, nombres: true, apellidos: true },
          },
        },
      });
      return this.respuestaConsulta(
        perfil,
        periodo,
        curso,
        null,
        cadetes.map((cadete) => ({
          id_nota: null,
          id_cadete: cadete.id_cadete,
          nota_final: null,
          cadete,
        })),
        false,
      );
    }
    if (
      perfil.tipo === 'COMANDO' &&
      planilla.estado !== EstadoSemanaDisciplina.REVISADO
    ) {
      throw new NotFoundException(
        'No existe una planilla revisada disponible.',
      );
    }
    const prefijo = this.claveResultadoPrefijo(
      planilla.id_planilla,
      planilla.version_flujo,
    );
    const enviada = Boolean(
      await this.prisma.notificacion.findFirst({
        where: {
          area: AREA_ENTRENAMIENTO_FISICO,
          tipo: 'NOTAS_FINALES_ENTRENAMIENTO_FISICO',
          id_referencia: planilla.id_planilla,
          clave_evento: { startsWith: prefijo },
        },
        select: { id_notificacion: true },
      }),
    );
    return this.respuestaConsulta(
      perfil,
      periodo,
      curso,
      planilla,
      planilla.notas,
      enviada,
    );
  }

  async guardar(idUsuario: number, dto: GuardarNotasEntrenamientoDto) {
    const perfil =
      await this.validaciones.validarAccesoCursoEntrenamientoFisico(
        idUsuario,
        dto.id_curso,
        'REGISTRO',
      );
    this.validaciones.exigirTipo(perfil, 'ENCARGADO_ENTRENAMIENTO_FISICO');
    const periodo = await this.validaciones.validarPeriodoActivo(
      dto.id_periodo,
    );
    if (periodo.id_gestion !== dto.id_gestion) {
      throw new BadRequestException(
        'El periodo no pertenece a la gestión seleccionada.',
      );
    }
    const ids = dto.notas.map((nota) => nota.id_cadete);
    if (new Set(ids).size !== ids.length) {
      throw new BadRequestException(
        'La solicitud contiene cadetes duplicados.',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      const existente = await tx.planillaEntrenamientoFisico.findUnique({
        where: {
          id_periodo_id_curso: {
            id_periodo: dto.id_periodo,
            id_curso: dto.id_curso,
          },
        },
      });
      const planilla = existente
        ? existente
        : await tx.planillaEntrenamientoFisico.create({
            data: {
              id_periodo: dto.id_periodo,
              id_curso: dto.id_curso,
              id_creador: idUsuario,
              id_ultimo_responsable: idUsuario,
            },
          });
      if (
        planilla.estado !== EstadoSemanaDisciplina.BORRADOR &&
        planilla.estado !== EstadoSemanaDisciplina.OBSERVADO
      ) {
        throw new ConflictException(
          'La planilla está bloqueada después del envío.',
        );
      }

      if (!existente) {
        const cadetes = await tx.cadete.findMany({
          where: { id_curso: dto.id_curso },
          select: { id_cadete: true },
        });
        if (cadetes.length === 0) {
          throw new BadRequestException(
            'El curso no tiene cadetes registrados.',
          );
        }
        await tx.notaEntrenamientoFisico.createMany({
          data: cadetes.map((cadete) => ({
            id_planilla: planilla.id_planilla,
            id_cadete: cadete.id_cadete,
            id_creador: idUsuario,
          })),
        });
        await this.auditoria.registrar(
          {
            id_usuario: idUsuario,
            accion: 'CREAR_PLANILLA_ENTRENAMIENTO_FISICO',
            modulo: 'NOTAS_ENTRENAMIENTO_FISICO',
            entidad: 'PlanillaEntrenamientoFisico',
            id_entidad: planilla.id_planilla,
            descripcion:
              'Planilla creada con la nómina completa del curso seleccionada.',
            datos_despues: {
              id_periodo: dto.id_periodo,
              id_curso: dto.id_curso,
              total_cadetes: cadetes.length,
            },
          },
          tx,
        );
      }

      const filas = await tx.notaEntrenamientoFisico.findMany({
        where: { id_planilla: planilla.id_planilla, id_cadete: { in: ids } },
      });
      if (filas.length !== ids.length) {
        throw new BadRequestException(
          'Todos los cadetes deben pertenecer a la nómina congelada de la planilla.',
        );
      }
      const porCadete = new Map(filas.map((fila) => [fila.id_cadete, fila]));
      let cambios = 0;
      for (const item of dto.notas) {
        const actual = porCadete.get(item.id_cadete)!;
        const nueva = this.validarNota(item.nota_final);
        this.validaciones.exigirPermiso(
          perfil,
          actual.nota_final === null
            ? PERMISOS_NOTAS.REGISTRAR
            : PERMISOS_NOTAS.EDITAR,
        );
        if (actual.nota_final?.equals(nueva)) continue;
        const guardada = await tx.notaEntrenamientoFisico.update({
          where: { id_nota: actual.id_nota },
          data: { nota_final: nueva },
        });
        await this.auditoria.registrar(
          {
            id_usuario: idUsuario,
            accion:
              actual.nota_final === null
                ? 'REGISTRAR_NOTA_ENTRENAMIENTO_FISICO'
                : 'ACTUALIZAR_NOTA_ENTRENAMIENTO_FISICO_BORRADOR',
            modulo: 'NOTAS_ENTRENAMIENTO_FISICO',
            entidad: 'NotaEntrenamientoFisico',
            id_entidad: actual.id_nota,
            descripcion: 'Nota final guardada en planilla editable.',
            datos_antes: {
              nota_final: actual.nota_final?.toFixed(4) ?? null,
            },
            datos_despues: { nota_final: guardada.nota_final!.toFixed(4) },
          },
          tx,
        );
        cambios += 1;
      }
      if (cambios > 0) {
        await tx.planillaEntrenamientoFisico.update({
          where: { id_planilla: planilla.id_planilla },
          data: { id_ultimo_responsable: idUsuario },
        });
      }
    });
    return this.consultar(idUsuario, dto);
  }

  async enviar(idUsuario: number, idPlanilla: number) {
    const planilla = await this.obtenerPlanilla(idPlanilla);
    const perfil =
      await this.validaciones.validarAccesoCursoEntrenamientoFisico(
        idUsuario,
        planilla.id_curso,
        'REGISTRO',
      );
    this.validaciones.exigirTipo(perfil, 'ENCARGADO_ENTRENAMIENTO_FISICO');
    this.validaciones.exigirPermiso(perfil, PERMISOS_NOTAS.ENVIAR);
    if (
      planilla.estado !== EstadoSemanaDisciplina.BORRADOR &&
      planilla.estado !== EstadoSemanaDisciplina.OBSERVADO
    ) {
      throw new ConflictException(
        'La planilla solo puede enviarse desde BORRADOR u OBSERVADO.',
      );
    }
    await this.validaciones.validarPeriodoActivo(planilla.id_periodo);
    await this.exigirCompleta(planilla.id_planilla);
    await this.prisma.$transaction(async (tx) => {
      const destinatarios = await this.notificaciones.destinatariosNivel(
        NivelRevisionNota.SECCION_ACADEMICA,
        tx,
      );
      if (destinatarios.length === 0) {
        throw new ConflictException(
          'No existe un responsable activo de Sección Académica.',
        );
      }
      await this.flujo.ejecutarEntrenamientoFisico(tx, planilla, {
        estados_permitidos: [
          EstadoSemanaDisciplina.BORRADOR,
          EstadoSemanaDisciplina.OBSERVADO,
        ],
        nivel_esperado: null,
        estado_nuevo: EstadoSemanaDisciplina.EN_REVISION,
        nivel_nuevo: NivelRevisionNota.SECCION_ACADEMICA,
        id_actor: idUsuario,
        accion:
          planilla.estado === EstadoSemanaDisciplina.OBSERVADO
            ? 'REENVIAR_PLANILLA_ENTRENAMIENTO_FISICO'
            : 'ENVIAR_PLANILLA_ENTRENAMIENTO_FISICO',
        descripcion:
          'Planilla enviada directamente a Sección Académica para revisión.',
        destinatarios,
        tipo_notificacion: 'PLANILLA_ENTRENAMIENTO_FISICO_ENVIADA',
        titulo_notificacion: 'Planilla de Entrenamiento Físico pendiente',
        mensaje_notificacion:
          'Una planilla completa fue enviada a Sección Académica.',
        fecha: 'ENVIO',
      });
    });
    return this.consultarPorPlanilla(idUsuario, planilla.id_planilla);
  }

  async observar(
    idUsuario: number,
    idPlanilla: number,
    dto: ObservarPlanillaEntrenamientoDto,
  ) {
    const planilla = await this.obtenerPlanilla(idPlanilla);
    const perfil =
      await this.validaciones.validarAccesoCursoEntrenamientoFisico(
        idUsuario,
        planilla.id_curso,
        'LECTURA',
      );
    this.validaciones.exigirPermiso(perfil, PERMISOS_NOTAS.OBSERVAR);
    this.validarRevisorActual(perfil, planilla);
    if (planilla.estado !== EstadoSemanaDisciplina.EN_REVISION) {
      throw new ConflictException(
        'Solo una planilla EN_REVISION puede observarse.',
      );
    }
    await this.prisma.$transaction(async (tx) => {
      const destinatarios =
        await this.notificaciones.destinatariosEncargadoEntrenamientoFisico(tx);
      await this.flujo.ejecutarEntrenamientoFisico(tx, planilla, {
        estados_permitidos: [EstadoSemanaDisciplina.EN_REVISION],
        nivel_esperado: planilla.nivel_revision_actual,
        estado_nuevo: EstadoSemanaDisciplina.OBSERVADO,
        nivel_nuevo: null,
        id_actor: idUsuario,
        accion: 'OBSERVAR_PLANILLA_ENTRENAMIENTO_FISICO',
        descripcion:
          'Planilla observada y devuelta al Encargado de Entrenamiento Físico.',
        comentario: dto.comentario,
        destinatarios,
        tipo_notificacion: 'PLANILLA_ENTRENAMIENTO_FISICO_OBSERVADA',
        titulo_notificacion: 'Planilla de Entrenamiento Físico observada',
        mensaje_notificacion: `La planilla fue observada: ${dto.comentario}`,
        ruta_notificacion: '/modulos/notas/entrenamiento-fisico/registro',
        fecha: 'REVISION',
      });
    });
    return this.consultarPorPlanilla(idUsuario, planilla.id_planilla);
  }

  async aprobarSeccion(idUsuario: number, idPlanilla: number) {
    const planilla = await this.obtenerPlanilla(idPlanilla);
    const perfil =
      await this.validaciones.validarAccesoCursoEntrenamientoFisico(
        idUsuario,
        planilla.id_curso,
        'LECTURA',
      );
    this.validaciones.exigirTipo(perfil, 'SECCION_ACADEMICA');
    this.validaciones.exigirPermiso(perfil, PERMISOS_NOTAS.REVISAR);
    if (
      planilla.estado !== EstadoSemanaDisciplina.EN_REVISION ||
      planilla.nivel_revision_actual !== NivelRevisionNota.SECCION_ACADEMICA
    ) {
      throw new ConflictException(
        'La planilla no está pendiente de Sección Académica.',
      );
    }
    await this.prisma.$transaction(async (tx) => {
      const destinatarios = await this.notificaciones.destinatariosNivel(
        NivelRevisionNota.JEFE_ESTUDIOS,
        tx,
      );
      if (destinatarios.length === 0) {
        throw new ConflictException(
          'No existe un Jefe de Estudios habilitado.',
        );
      }
      await this.flujo.ejecutarEntrenamientoFisico(tx, planilla, {
        estados_permitidos: [EstadoSemanaDisciplina.EN_REVISION],
        nivel_esperado: NivelRevisionNota.SECCION_ACADEMICA,
        estado_nuevo: EstadoSemanaDisciplina.EN_REVISION,
        nivel_nuevo: NivelRevisionNota.JEFE_ESTUDIOS,
        id_actor: idUsuario,
        accion: 'APROBAR_PLANILLA_ENTRENAMIENTO_FISICO_SECCION',
        descripcion:
          'Planilla aprobada por Sección Académica y enviada a Jefe de Estudios.',
        destinatarios,
        tipo_notificacion: 'PLANILLA_ENTRENAMIENTO_FISICO_APROBADA_SECCION',
        titulo_notificacion: 'Revisión final de Entrenamiento Físico',
        mensaje_notificacion:
          'Una planilla fue aprobada por Sección Académica.',
        fecha: 'REVISION',
      });
    });
    return this.consultarPorPlanilla(idUsuario, planilla.id_planilla);
  }

  async marcarRevisada(idUsuario: number, idPlanilla: number) {
    const planilla = await this.obtenerPlanilla(idPlanilla);
    const perfil =
      await this.validaciones.validarAccesoCursoEntrenamientoFisico(
        idUsuario,
        planilla.id_curso,
        'LECTURA',
      );
    this.validaciones.exigirTipo(
      perfil,
      'JEFE_ESTUDIOS',
      'SECCION_ACADEMICA',
      'COMANDO',
    );
    this.validaciones.exigirPermiso(perfil, PERMISOS_NOTAS.MARCAR_REVISADAS);
    if (
      planilla.estado !== EstadoSemanaDisciplina.EN_REVISION ||
      planilla.nivel_revision_actual !== NivelRevisionNota.JEFE_ESTUDIOS
    ) {
      throw new ConflictException(
        'La planilla no está pendiente de revisión por Jefe de Estudios.',
      );
    }
    await this.prisma.$transaction(async (tx) => {
      const destinatarios =
        await this.notificaciones.destinatariosEncargadoEntrenamientoFisico(tx);
      await this.flujo.ejecutarEntrenamientoFisico(tx, planilla, {
        estados_permitidos: [EstadoSemanaDisciplina.EN_REVISION],
        nivel_esperado: NivelRevisionNota.JEFE_ESTUDIOS,
        estado_nuevo: EstadoSemanaDisciplina.REVISADO,
        nivel_nuevo: null,
        id_actor: idUsuario,
        accion: 'MARCAR_PLANILLA_ENTRENAMIENTO_FISICO_REVISADA',
        descripcion: 'Planilla marcada REVISADO por el Jefe de Estudios.',
        destinatarios,
        tipo_notificacion: 'PLANILLA_ENTRENAMIENTO_FISICO_REVISADA',
        titulo_notificacion: 'Planilla de Entrenamiento Físico revisada',
        mensaje_notificacion:
          'La planilla fue aprobada y puede enviarse a Evaluaciones.',
        ruta_notificacion:
          '/modulos/notas/entrenamiento-fisico/resultados-finales',
        fecha: 'REVISION',
      });
    });
    return this.consultarPorPlanilla(idUsuario, planilla.id_planilla);
  }

  async modificarExtraordinariamente(
    idUsuario: number,
    idNota: number,
    dto: ModificarNotaEntrenamientoExtraordinariaDto,
  ) {
    const actual = await this.prisma.notaEntrenamientoFisico.findUnique({
      where: { id_nota: idNota },
      include: {
        planilla: {
          include: {
            periodo: { include: { gestion: true } },
            curso: true,
          },
        },
      },
    });
    if (!actual) throw new NotFoundException('Nota no encontrada.');
    const perfil =
      await this.validaciones.validarAccesoCursoEntrenamientoFisico(
        idUsuario,
        actual.planilla.id_curso,
        'LECTURA',
      );
    this.validaciones.exigirTipo(
      perfil,
      'JEFE_ESTUDIOS',
      'SECCION_ACADEMICA',
      'COMANDO',
    );
    this.validaciones.exigirPermiso(perfil, PERMISOS_NOTAS.MODIFICAR_BLOQUEADA);
    const estadosModificables: EstadoSemanaDisciplina[] = [
      EstadoSemanaDisciplina.EN_REVISION,
      EstadoSemanaDisciplina.REVISADO,
      EstadoSemanaDisciplina.PUBLICADO,
    ];
    const modificable = estadosModificables.includes(actual.planilla.estado);
    if (!modificable) {
      throw new ConflictException(
        'La modificación extraordinaria solo aplica a una planilla bloqueada.',
      );
    }
    const nueva = this.validarNota(dto.nota_final);
    if (actual.nota_final?.equals(nueva)) {
      return { ...actual, nota_final: actual.nota_final.toFixed(4) };
    }
    const resultado = await this.prisma.$transaction(async (tx) => {
      const bloqueo = await tx.planillaEntrenamientoFisico.updateMany({
        where: {
          id_planilla: actual.planilla.id_planilla,
          estado: actual.planilla.estado,
          nivel_revision_actual: actual.planilla.nivel_revision_actual,
          version_flujo: actual.planilla.version_flujo,
        },
        data: {
          id_ultimo_responsable: idUsuario,
          version_flujo: { increment: 1 },
        },
      });
      if (bloqueo.count !== 1) {
        throw new ConflictException(
          'La planilla cambió. Actualice la información antes de reintentar.',
        );
      }
      const nota = await tx.notaEntrenamientoFisico.update({
        where: { id_nota: idNota },
        data: { nota_final: nueva },
      });
      const planilla = await tx.planillaEntrenamientoFisico.findUniqueOrThrow({
        where: { id_planilla: actual.planilla.id_planilla },
      });
      await this.auditoria.registrar(
        {
          id_usuario: idUsuario,
          accion: 'MODIFICAR_NOTA_ENTRENAMIENTO_FISICO_BLOQUEADA',
          modulo: 'NOTAS_ENTRENAMIENTO_FISICO',
          entidad: 'NotaEntrenamientoFisico',
          id_entidad: idNota,
          descripcion: `Modificación extraordinaria. Justificación: ${dto.justificacion}`,
          datos_antes: {
            nota_final: actual.nota_final?.toFixed(4) ?? null,
          },
          datos_despues: {
            nota_final: nueva.toFixed(4),
            rol: perfil.tipo,
            id_cadete: actual.id_cadete,
            gestion: actual.planilla.periodo.gestion.ano,
            id_gestion: actual.planilla.periodo.id_gestion,
            periodo: actual.planilla.periodo.periodo,
            id_periodo: actual.planilla.id_periodo,
            curso: actual.planilla.curso.nombre,
            id_curso: actual.planilla.id_curso,
            area: 'ENTRENAMIENTO_FISICO',
            concepto: 'Nota final de Entrenamiento Físico',
            justificacion: dto.justificacion.trim(),
            estado_planilla_conservado: planilla.estado,
            version_flujo: planilla.version_flujo,
          },
        },
        tx,
      );
      const destinatarios =
        await this.notificaciones.destinatariosEncargadoEntrenamientoFisico(tx);
      await this.notificaciones.crearEventoEntrenamientoFisico(
        {
          id_planilla: planilla.id_planilla,
          version_flujo: planilla.version_flujo,
          id_emisor: idUsuario,
          destinatarios,
          tipo: 'NOTA_ENTRENAMIENTO_FISICO_MODIFICADA_EXTRAORDINARIAMENTE',
          titulo: 'Nota de Entrenamiento Físico modificada',
          mensaje:
            'Un usuario autorizado realizó una modificación extraordinaria justificada.',
          ruta_destino:
            '/modulos/notas/entrenamiento-fisico/resultados-finales',
        },
        tx,
      );
      return nota;
    });
    await this.matrices?.recalcularPorCorreccion(
      actual.planilla.id_periodo,
      actual.planilla.id_curso,
      idUsuario,
      dto.justificacion.trim(),
    );
    return { ...resultado, nota_final: resultado.nota_final!.toFixed(4) };
  }

  async enviarEvaluaciones(idUsuario: number, idPlanilla: number) {
    const planilla = await this.prisma.planillaEntrenamientoFisico.findUnique({
      where: { id_planilla: idPlanilla },
      include: {
        periodo: { include: { gestion: true } },
        curso: true,
      },
    });
    if (!planilla) throw new NotFoundException('Planilla no encontrada.');
    const perfil =
      await this.validaciones.validarAccesoCursoEntrenamientoFisico(
        idUsuario,
        planilla.id_curso,
        'REGISTRO',
      );
    this.validaciones.exigirTipo(perfil, 'ENCARGADO_ENTRENAMIENTO_FISICO');
    this.validaciones.exigirPermiso(perfil, PERMISOS_NOTAS.ENVIAR);
    if (planilla.estado !== EstadoSemanaDisciplina.REVISADO) {
      throw new ConflictException(
        'Solo una planilla REVISADO puede enviarse a Evaluaciones.',
      );
    }
    const total = await this.exigirCompleta(planilla.id_planilla);
    return this.prisma.$transaction(async (tx) => {
      const destinatarios = [
        ...new Set(await this.notificaciones.destinatariosEvaluaciones(tx)),
      ];
      if (destinatarios.length !== 1) {
        throw new ConflictException(
          `Se esperaba exactamente un Encargado de Evaluaciones activo; existen ${destinatarios.length}.`,
        );
      }
      const creada =
        await this.notificaciones.crearEventoResultadoEntrenamientoFisico(
          {
            id_planilla: planilla.id_planilla,
            version_flujo: planilla.version_flujo,
            id_emisor: idUsuario,
            id_destinatario: destinatarios[0],
            id_gestion: planilla.periodo.id_gestion,
            id_periodo: planilla.id_periodo,
            id_curso: planilla.id_curso,
            gestion: planilla.periodo.gestion.ano,
            periodo: planilla.periodo.periodo,
            curso: planilla.curso.nombre,
          },
          tx,
        );
      if (creada.count === 0) {
        return {
          id_planilla: planilla.id_planilla,
          cantidad: total,
          ya_enviado: true,
        };
      }
      await this.auditoria.registrar(
        {
          id_usuario: idUsuario,
          accion: 'ENVIAR_RESULTADO_EVALUACIONES',
          modulo: 'NOTAS_ENTRENAMIENTO_FISICO',
          entidad: 'PlanillaEntrenamientoFisico',
          id_entidad: planilla.id_planilla,
          descripcion:
            'Notas finales de Entrenamiento Físico enviadas a Evaluaciones.',
          datos_despues: {
            id_periodo: planilla.id_periodo,
            id_curso: planilla.id_curso,
            cantidad_cadetes: total,
            version_flujo: planilla.version_flujo,
          },
        },
        tx,
      );
      return {
        id_planilla: planilla.id_planilla,
        cantidad: total,
        ya_enviado: false,
      };
    });
  }

  async resultadosParaEvaluaciones(
    idUsuario: number,
    filtros: ConsultarResultadosEntrenamientoEvaluacionesDto,
  ) {
    const perfil = await this.validaciones.obtenerPerfilEvaluaciones(idUsuario);
    this.validaciones.exigirTipo(perfil, 'ENCARGADO_EVALUACIONES');
    this.validaciones.exigirPermiso(perfil, PERMISOS_NOTAS.VER);
    const notificaciones = await this.prisma.notificacion.findMany({
      where: {
        id_usuario_destinatario: idUsuario,
        area: AREA_ENTRENAMIENTO_FISICO,
        tipo: 'NOTAS_FINALES_ENTRENAMIENTO_FISICO',
        id_referencia: filtros.id_planilla,
      },
      select: { id_referencia: true, clave_evento: true },
    });
    const ids = [
      ...new Set(
        notificaciones
          .map((item) => item.id_referencia)
          .filter((id): id is number => id !== null),
      ),
    ];
    if (ids.length === 0) return [];
    const planillas = await this.prisma.planillaEntrenamientoFisico.findMany({
      where: {
        id_planilla: { in: ids },
        estado: EstadoSemanaDisciplina.REVISADO,
      },
      include: { notas: true },
    });
    const claves = new Set(notificaciones.map((item) => item.clave_evento));
    return planillas
      .filter((planilla) =>
        claves.has(
          `${this.claveResultadoPrefijo(planilla.id_planilla, planilla.version_flujo)}${idUsuario}`,
        ),
      )
      .flatMap((planilla) =>
        planilla.notas
          .filter((nota) => nota.nota_final !== null)
          .map((nota) => ({
            id_cadete: nota.id_cadete,
            id_periodo: planilla.id_periodo,
            id_curso: planilla.id_curso,
            nota_final_entrenamiento_fisico: nota.nota_final!.toFixed(4),
          })),
      );
  }

  private async obtenerPlanilla(
    idPlanilla: number,
  ): Promise<PlanillaEntrenamientoFisico> {
    const planilla = await this.prisma.planillaEntrenamientoFisico.findUnique({
      where: { id_planilla: idPlanilla },
    });
    if (!planilla) throw new NotFoundException('Planilla no encontrada.');
    return planilla;
  }

  private async consultarPorPlanilla(idUsuario: number, idPlanilla: number) {
    const planilla = await this.prisma.planillaEntrenamientoFisico.findUnique({
      where: { id_planilla: idPlanilla },
      include: { periodo: true },
    });
    if (!planilla) throw new NotFoundException('Planilla no encontrada.');
    return this.consultar(idUsuario, {
      id_gestion: planilla.periodo.id_gestion,
      id_periodo: planilla.id_periodo,
      id_curso: planilla.id_curso,
    });
  }

  private async exigirCompleta(idPlanilla: number) {
    const [total, registradas] = await Promise.all([
      this.prisma.notaEntrenamientoFisico.count({
        where: { id_planilla: idPlanilla },
      }),
      this.prisma.notaEntrenamientoFisico.count({
        where: { id_planilla: idPlanilla, nota_final: { not: null } },
      }),
    ]);
    if (total === 0 || total !== registradas) {
      throw new BadRequestException(
        `No se puede enviar porque existen notas pendientes. ${registradas} de ${total} registradas.`,
      );
    }
    return total;
  }

  private validarNota(valor: string | Prisma.Decimal) {
    const nota = new Prisma.Decimal(valor);
    if (nota.lessThan(0) || nota.greaterThan(100)) {
      throw new BadRequestException(
        'La nota final debe estar entre 0.0000 y 100.0000.',
      );
    }
    return nota;
  }

  private validarRevisorActual(
    perfil: PerfilNotas,
    planilla: PlanillaEntrenamientoFisico,
  ) {
    const esperado =
      planilla.nivel_revision_actual === NivelRevisionNota.SECCION_ACADEMICA
        ? 'SECCION_ACADEMICA'
        : planilla.nivel_revision_actual === NivelRevisionNota.JEFE_ESTUDIOS
          ? 'JEFE_ESTUDIOS'
          : null;
    if (!esperado || perfil.tipo !== esperado) {
      throw new ForbiddenException(
        'La planilla no está asignada a su nivel de revisión.',
      );
    }
  }

  private claveResultadoPrefijo(idPlanilla: number, version: number) {
    return `${AREA_ENTRENAMIENTO_FISICO}:RESULTADO_FINAL:${idPlanilla}:${version}:`;
  }

  private respuestaConsulta(
    perfil: PerfilNotas,
    periodo: {
      id_periodo: number;
      id_gestion: number;
      periodo: string;
      gestion: { ano: number };
    },
    curso: { id_curso: number; nombre: string; orden: number },
    planilla: PlanillaEntrenamientoFisico | null,
    filas: Array<{
      id_nota: number | null;
      id_cadete: number;
      nota_final: Prisma.Decimal | null;
      cadete: {
        usuario: { ci: string; nombres: string; apellidos: string };
      };
    }>,
    enviada: boolean,
  ) {
    const cadetes = filas
      .map((fila) => ({
        id_nota: fila.id_nota,
        id_cadete: fila.id_cadete,
        ci: fila.cadete.usuario.ci,
        nombres: fila.cadete.usuario.nombres,
        apellidos: fila.cadete.usuario.apellidos,
        nota_final: fila.nota_final?.toFixed(4) ?? null,
      }))
      .sort((a, b) =>
        `${a.apellidos} ${a.nombres}`.localeCompare(
          `${b.apellidos} ${b.nombres}`,
          'es',
        ),
      );
    const registradas = cadetes.filter(
      (cadete) => cadete.nota_final !== null,
    ).length;
    const editable =
      perfil.tipo === 'ENCARGADO_ENTRENAMIENTO_FISICO' &&
      (!planilla ||
        planilla.estado === EstadoSemanaDisciplina.BORRADOR ||
        planilla.estado === EstadoSemanaDisciplina.OBSERVADO);
    const revisaSeccion =
      perfil.tipo === 'SECCION_ACADEMICA' &&
      planilla?.estado === EstadoSemanaDisciplina.EN_REVISION &&
      planilla.nivel_revision_actual === NivelRevisionNota.SECCION_ACADEMICA;
    const revisaJefe =
      perfil.tipo === 'JEFE_ESTUDIOS' &&
      planilla?.estado === EstadoSemanaDisciplina.EN_REVISION &&
      planilla.nivel_revision_actual === NivelRevisionNota.JEFE_ESTUDIOS;
    return {
      perfil: perfil.tipo,
      gestion: { id_gestion: periodo.id_gestion, ano: periodo.gestion.ano },
      periodo: { id_periodo: periodo.id_periodo, periodo: periodo.periodo },
      curso,
      planilla: planilla
        ? {
            id_planilla: planilla.id_planilla,
            estado: planilla.estado,
            nivel_revision_actual: planilla.nivel_revision_actual,
            version_flujo: planilla.version_flujo,
            fecha_actualizacion: planilla.fecha_actualizacion,
            enviada_evaluaciones: enviada,
          }
        : null,
      resumen: {
        total_cadetes: cadetes.length,
        notas_registradas: registradas,
        pendientes: cadetes.length - registradas,
        completo: cadetes.length > 0 && registradas === cadetes.length,
      },
      acciones: {
        guardar:
          editable &&
          (perfil.permisos.has(PERMISOS_NOTAS.REGISTRAR) ||
            perfil.permisos.has(PERMISOS_NOTAS.EDITAR)),
        enviar:
          editable &&
          perfil.permisos.has(PERMISOS_NOTAS.ENVIAR) &&
          cadetes.length > 0 &&
          registradas === cadetes.length,
        aprobar: revisaSeccion && perfil.permisos.has(PERMISOS_NOTAS.REVISAR),
        observar:
          (revisaSeccion || revisaJefe) &&
          perfil.permisos.has(PERMISOS_NOTAS.OBSERVAR),
        marcar_revisada:
          revisaJefe && perfil.permisos.has(PERMISOS_NOTAS.MARCAR_REVISADAS),
        modificar_extraordinaria:
          ['JEFE_ESTUDIOS', 'SECCION_ACADEMICA', 'COMANDO'].includes(
            perfil.tipo,
          ) &&
          Boolean(
            revisaJefe || planilla?.estado === EstadoSemanaDisciplina.REVISADO,
          ) &&
          perfil.permisos.has(PERMISOS_NOTAS.MODIFICAR_BLOQUEADA),
        enviar_evaluaciones:
          perfil.tipo === 'ENCARGADO_ENTRENAMIENTO_FISICO' &&
          planilla?.estado === EstadoSemanaDisciplina.REVISADO &&
          !enviada &&
          perfil.permisos.has(PERMISOS_NOTAS.ENVIAR),
        imprimir: planilla?.estado === EstadoSemanaDisciplina.REVISADO,
      },
      cadetes,
    };
  }
}
