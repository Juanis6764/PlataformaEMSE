import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  EstadoSemanaDisciplina,
  MateriaEvaluacion,
  NivelRevisionNota,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditoriaService } from '../../auditoria/auditoria.service';
import { PERMISOS_NOTAS } from '../comun/constantes-notas';
import { FlujoNotasService } from '../comun/flujo-notas.service';
import { NotificacionesNotasService } from '../comun/notificaciones-notas.service';
import {
  PerfilNotas,
  ValidacionesNotasService,
} from '../comun/validaciones-notas.service';
import {
  calcularOrdenMerito,
  clasificarNota,
  notaConsiderada,
} from './calculo-evaluaciones';
import {
  CrearMateriaEvaluacionDto,
  FiltrarMateriasEvaluacionDto,
  ObservarMateriaEvaluacionDto,
} from './dto/materia-evaluacion.dto';

@Injectable()
export class MateriasEvaluacionesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly validaciones: ValidacionesNotasService,
    private readonly flujo: FlujoNotasService,
    private readonly notificaciones: NotificacionesNotasService,
    private readonly auditoria: AuditoriaService,
  ) {}

  async listar(idUsuario: number, filtros: FiltrarMateriasEvaluacionDto) {
    const perfil = await this.validaciones.obtenerPerfilEvaluaciones(idUsuario);
    this.validaciones.exigirTipo(
      perfil,
      'ADMINISTRADOR',
      'ENCARGADO_EVALUACIONES',
      'OPERADOR_EVALUACIONES',
      'SECCION_ACADEMICA',
      'JEFE_ESTUDIOS',
      'COMANDO',
    );
    this.validaciones.exigirPermiso(perfil, PERMISOS_NOTAS.VER);
    if (filtros.id_curso) {
      await this.validaciones.validarAccesoCursoEvaluaciones(
        idUsuario,
        filtros.id_curso,
        'LECTURA',
      );
    }
    const cursos =
      perfil.tipo === 'OPERADOR_EVALUACIONES'
        ? perfil.cursos_asignados
        : filtros.id_curso
          ? [filtros.id_curso]
          : undefined;
    const estado =
      perfil.tipo === 'COMANDO'
        ? EstadoSemanaDisciplina.PUBLICADO
        : filtros.estado;
    return this.prisma.materiaEvaluacion.findMany({
      where: {
        id_periodo: filtros.id_periodo,
        id_curso: cursos ? { in: cursos } : undefined,
        estado,
        nivel_revision_actual: filtros.nivel_revision,
        periodo: { id_gestion: filtros.id_gestion },
      },
      include: {
        periodo: { include: { gestion: true } },
        curso: true,
        creador: {
          select: { id_usuario: true, nombres: true, apellidos: true },
        },
        ultimo_responsable: {
          select: { id_usuario: true, nombres: true, apellidos: true },
        },
        _count: { select: { notas: true } },
      },
      orderBy: [
        { periodo: { gestion: { ano: 'desc' } } },
        { periodo: { periodo: 'asc' } },
        { curso: { orden: 'asc' } },
        { numero_materia: 'asc' },
      ],
    });
  }

  async pendientes(idUsuario: number) {
    const perfil = await this.validaciones.obtenerPerfilEvaluaciones(idUsuario);
    let nivel: NivelRevisionNota;
    if (perfil.tipo === 'ENCARGADO_EVALUACIONES') {
      nivel = NivelRevisionNota.ENCARGADO_AREA;
    } else if (perfil.tipo === 'SECCION_ACADEMICA') {
      nivel = NivelRevisionNota.SECCION_ACADEMICA;
    } else if (perfil.tipo === 'JEFE_ESTUDIOS') {
      nivel = NivelRevisionNota.JEFE_ESTUDIOS;
    } else {
      throw new ForbiddenException(
        'El perfil no es un revisor de Evaluaciones.',
      );
    }
    return this.listar(idUsuario, {
      estado: EstadoSemanaDisciplina.EN_REVISION,
      nivel_revision: nivel,
    });
  }

  async obtenerDetalle(idUsuario: number, idMateria: number) {
    const materia = await this.prisma.materiaEvaluacion.findUnique({
      where: { id_materia: idMateria },
      include: {
        periodo: { include: { gestion: true } },
        curso: true,
        creador: {
          select: { id_usuario: true, nombres: true, apellidos: true },
        },
        ultimo_responsable: {
          select: { id_usuario: true, nombres: true, apellidos: true },
        },
        notas: {
          include: {
            cadete: {
              include: {
                usuario: {
                  select: {
                    id_usuario: true,
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
    if (!materia) throw new NotFoundException('Materia no encontrada.');
    const perfil = await this.validaciones.validarAccesoCursoEvaluaciones(
      idUsuario,
      materia.id_curso,
      'LECTURA',
    );
    if (
      perfil.tipo === 'COMANDO' &&
      materia.estado !== EstadoSemanaDisciplina.PUBLICADO
    ) {
      throw new NotFoundException('Materia publicada no encontrada.');
    }

    const cadetes = await this.prisma.cadete.findMany({
      where: { id_curso: materia.id_curso },
      include: {
        usuario: {
          select: {
            id_usuario: true,
            ci: true,
            nombres: true,
            apellidos: true,
          },
        },
      },
      orderBy: [{ usuario: { apellidos: 'asc' } }, { id_cadete: 'asc' }],
    });
    const porCadete = new Map(
      materia.notas.map((nota) => [nota.id_cadete, nota]),
    );
    const posiciones =
      materia.estado === EstadoSemanaDisciplina.PUBLICADO
        ? calcularOrdenMerito(
            materia.notas.map((nota) => ({
              id_cadete: nota.id_cadete,
              nota: notaConsiderada(nota.nota_inicial, nota.nota_desquite),
            })),
          )
        : new Map<number, number>();
    const filas = cadetes.map((cadete) => {
      const nota = porCadete.get(cadete.id_cadete);
      if (!nota) {
        return {
          id_cadete: cadete.id_cadete,
          ci: cadete.usuario.ci,
          nombres: cadete.usuario.nombres,
          apellidos: cadete.usuario.apellidos,
          nota_inicial: null,
          nota_desquite: null,
          nota_considerada: null,
          clasificacion: null,
          orden_merito: null,
          estado: 'PENDIENTE',
        };
      }
      const considerada = notaConsiderada(
        nota.nota_inicial,
        nota.nota_desquite,
      );
      return {
        id_nota: nota.id_nota,
        id_cadete: cadete.id_cadete,
        ci: cadete.usuario.ci,
        nombres: cadete.usuario.nombres,
        apellidos: cadete.usuario.apellidos,
        nota_inicial: nota.nota_inicial.toFixed(4),
        nota_desquite: nota.nota_desquite?.toFixed(4) ?? null,
        nota_considerada: considerada.toFixed(4),
        clasificacion: clasificarNota(considerada),
        orden_merito: posiciones.get(cadete.id_cadete) ?? null,
        estado: 'REGISTRADA',
      };
    });
    const registradas = materia.notas.length;
    return {
      ...materia,
      notas: undefined,
      cadetes: filas,
      resumen: {
        cantidad_cadetes: cadetes.length,
        notas_registradas: registradas,
        notas_pendientes: cadetes.length - registradas,
        alumnos_con_desquite: materia.notas.filter(
          (nota) => nota.nota_desquite !== null,
        ).length,
        completo: registradas === cadetes.length && cadetes.length > 0,
      },
    };
  }

  async crear(idUsuario: number, dto: CrearMateriaEvaluacionDto) {
    const perfil = await this.validaciones.validarAccesoCursoEvaluaciones(
      idUsuario,
      dto.id_curso,
      'REGISTRO',
    );
    this.validaciones.exigirTipo(perfil, 'OPERADOR_EVALUACIONES');
    this.validaciones.exigirPermiso(perfil, PERMISOS_NOTAS.REGISTRAR);
    await this.validaciones.validarPeriodoActivo(dto.id_periodo);

    try {
      return await this.prisma.$transaction(async (tx) => {
        const configuraciones = await tx.$queryRaw<
          Array<{ id_configuracion: number; cantidad_materias: number }>
        >`SELECT "id_configuracion", "cantidad_materias"
          FROM "ConfiguracionEvaluacionesPeriodo"
          WHERE "id_periodo" = ${dto.id_periodo}
            AND "id_curso" = ${dto.id_curso}
            AND "activo" = true
          FOR UPDATE`;
        const configuracion = configuraciones[0];
        if (!configuracion) {
          throw new BadRequestException(
            'No existe una configuración activa para el periodo y curso.',
          );
        }
        const ultima = await tx.materiaEvaluacion.aggregate({
          where: { id_periodo: dto.id_periodo, id_curso: dto.id_curso },
          _max: { numero_materia: true },
        });
        const numeroMateria = (ultima._max.numero_materia ?? 0) + 1;
        if (numeroMateria > configuracion.cantidad_materias) {
          throw new BadRequestException(
            'Ya se alcanzó la cantidad de materias configurada.',
          );
        }
        const materia = await tx.materiaEvaluacion.create({
          data: {
            id_periodo: dto.id_periodo,
            id_curso: dto.id_curso,
            numero_materia: numeroMateria,
            nombre: dto.nombre.trim(),
            id_creador: idUsuario,
            id_ultimo_responsable: idUsuario,
          },
          include: { periodo: { include: { gestion: true } }, curso: true },
        });
        await this.auditoria.registrar(
          {
            id_usuario: idUsuario,
            accion: 'CREAR_MATERIA_EVALUACION',
            modulo: 'NOTAS_EVALUACIONES',
            entidad: 'MateriaEvaluacion',
            id_entidad: materia.id_materia,
            descripcion: 'Materia de Evaluaciones creada secuencialmente.',
            datos_despues: {
              id_periodo: materia.id_periodo,
              id_curso: materia.id_curso,
              numero_materia: materia.numero_materia,
              nombre: materia.nombre,
              estado: materia.estado,
            },
          },
          tx,
        );
        return materia;
      });
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : '';
      if (mensaje.includes('mismo nombre normalizado')) {
        throw new ConflictException(
          'Ya existe una materia con el mismo nombre en el curso y periodo.',
        );
      }
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('La materia ya existe.');
      }
      throw error;
    }
  }

  async enviar(idUsuario: number, idMateria: number) {
    const materia = await this.obtenerMateria(idMateria);
    const perfil = await this.validaciones.validarAccesoCursoEvaluaciones(
      idUsuario,
      materia.id_curso,
      'REGISTRO',
    );
    this.validaciones.exigirTipo(perfil, 'OPERADOR_EVALUACIONES');
    this.validaciones.exigirPermiso(perfil, PERMISOS_NOTAS.ENVIAR);
    if (
      materia.estado !== EstadoSemanaDisciplina.BORRADOR &&
      materia.estado !== EstadoSemanaDisciplina.OBSERVADO
    ) {
      throw new ConflictException(
        'La materia solo puede enviarse desde BORRADOR u OBSERVADO.',
      );
    }
    await this.validaciones.validarPeriodoActivo(materia.id_periodo);
    const [cadetes, notas] = await Promise.all([
      this.prisma.cadete.count({ where: { id_curso: materia.id_curso } }),
      this.prisma.notaEvaluacion.count({
        where: { id_materia: materia.id_materia },
      }),
    ]);
    if (cadetes === 0 || notas !== cadetes) {
      throw new BadRequestException(
        `La materia está incompleta: ${notas} notas registradas de ${cadetes} cadetes.`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const destinatarios =
        await this.notificaciones.destinatariosNivelEvaluaciones(
          NivelRevisionNota.ENCARGADO_AREA,
          tx,
        );
      return this.flujo.ejecutarEvaluacion(tx, materia, {
        estados_permitidos: [
          EstadoSemanaDisciplina.BORRADOR,
          EstadoSemanaDisciplina.OBSERVADO,
        ],
        nivel_esperado: materia.nivel_revision_actual,
        estado_nuevo: EstadoSemanaDisciplina.EN_REVISION,
        nivel_nuevo: NivelRevisionNota.ENCARGADO_AREA,
        id_actor: idUsuario,
        accion:
          materia.estado === EstadoSemanaDisciplina.OBSERVADO
            ? 'REENVIAR_MATERIA_EVALUACION'
            : 'ENVIAR_MATERIA_EVALUACION',
        descripcion: 'Materia enviada al flujo institucional de revisión.',
        destinatarios,
        tipo_notificacion: 'MATERIA_EVALUACION_ENVIADA',
        titulo_notificacion: 'Materia de Evaluaciones enviada',
        mensaje_notificacion: `${materia.nombre} fue enviada para revisión.`,
        fecha: 'ENVIO',
      });
    });
  }

  async observar(
    idUsuario: number,
    idMateria: number,
    dto: ObservarMateriaEvaluacionDto,
  ) {
    const materia = await this.obtenerMateria(idMateria);
    const perfil = await this.validaciones.validarAccesoCursoEvaluaciones(
      idUsuario,
      materia.id_curso,
      'LECTURA',
    );
    this.validaciones.exigirPermiso(perfil, PERMISOS_NOTAS.OBSERVAR);
    this.validarRevisorActual(perfil, materia.nivel_revision_actual);
    if (materia.estado !== EstadoSemanaDisciplina.EN_REVISION) {
      throw new ConflictException(
        'Solo una materia EN_REVISION puede observarse.',
      );
    }
    return this.prisma.$transaction(async (tx) => {
      const destinatarios =
        await this.notificaciones.destinatariosOperadoresCursoEvaluaciones(
          materia.id_curso,
          tx,
        );
      return this.flujo.ejecutarEvaluacion(tx, materia, {
        estados_permitidos: [EstadoSemanaDisciplina.EN_REVISION],
        nivel_esperado: materia.nivel_revision_actual,
        estado_nuevo: EstadoSemanaDisciplina.OBSERVADO,
        nivel_nuevo: NivelRevisionNota.ENCARGADO_AREA,
        id_actor: idUsuario,
        accion: 'OBSERVAR_MATERIA_EVALUACION',
        descripcion:
          'Materia observada y devuelta al Operador para corrección.',
        comentario: dto.comentario.trim(),
        destinatarios,
        tipo_notificacion: 'MATERIA_EVALUACION_OBSERVADA',
        titulo_notificacion: 'Materia de Evaluaciones observada',
        mensaje_notificacion: `${materia.nombre} fue observada: ${dto.comentario.trim()}`,
        fecha: 'REVISION',
      });
    });
  }

  async aprobar(idUsuario: number, idMateria: number) {
    const materia = await this.obtenerMateria(idMateria);
    const perfil = await this.validaciones.validarAccesoCursoEvaluaciones(
      idUsuario,
      materia.id_curso,
      'LECTURA',
    );
    this.validaciones.exigirPermiso(perfil, PERMISOS_NOTAS.REVISAR);
    this.validarRevisorActual(perfil, materia.nivel_revision_actual);
    if (materia.estado !== EstadoSemanaDisciplina.EN_REVISION) {
      throw new ConflictException(
        'Solo una materia EN_REVISION puede aprobarse.',
      );
    }
    let nivelSiguiente: NivelRevisionNota;
    if (materia.nivel_revision_actual === NivelRevisionNota.ENCARGADO_AREA) {
      nivelSiguiente = NivelRevisionNota.SECCION_ACADEMICA;
    } else if (
      materia.nivel_revision_actual === NivelRevisionNota.SECCION_ACADEMICA
    ) {
      nivelSiguiente = NivelRevisionNota.JEFE_ESTUDIOS;
    } else {
      throw new BadRequestException(
        'El Jefe de Estudios debe usar la acción marcar-revisada.',
      );
    }
    return this.prisma.$transaction(async (tx) => {
      const destinatarios =
        await this.notificaciones.destinatariosNivelEvaluaciones(
          nivelSiguiente,
          tx,
        );
      return this.flujo.ejecutarEvaluacion(tx, materia, {
        estados_permitidos: [EstadoSemanaDisciplina.EN_REVISION],
        nivel_esperado: materia.nivel_revision_actual,
        estado_nuevo: EstadoSemanaDisciplina.EN_REVISION,
        nivel_nuevo: nivelSiguiente,
        id_actor: idUsuario,
        accion: 'APROBAR_MATERIA_EVALUACION',
        descripcion: 'Materia aprobada y avanzada al siguiente nivel.',
        destinatarios,
        tipo_notificacion: 'MATERIA_EVALUACION_APROBADA',
        titulo_notificacion: 'Materia de Evaluaciones pendiente',
        mensaje_notificacion: `${materia.nombre} avanzó al siguiente nivel de revisión.`,
        fecha: 'REVISION',
      });
    });
  }

  async marcarRevisada(idUsuario: number, idMateria: number) {
    const materia = await this.obtenerMateria(idMateria);
    const perfil = await this.validaciones.validarAccesoCursoEvaluaciones(
      idUsuario,
      materia.id_curso,
      'LECTURA',
    );
    this.validaciones.exigirTipo(perfil, 'JEFE_ESTUDIOS');
    this.validaciones.exigirPermiso(perfil, PERMISOS_NOTAS.MARCAR_REVISADAS);
    if (
      materia.estado !== EstadoSemanaDisciplina.EN_REVISION ||
      materia.nivel_revision_actual !== NivelRevisionNota.JEFE_ESTUDIOS
    ) {
      throw new ConflictException(
        'La materia no está pendiente de revisión por Jefe de Estudios.',
      );
    }
    return this.prisma.$transaction(async (tx) => {
      const destinatarios =
        await this.notificaciones.destinatariosNivelEvaluaciones(
          NivelRevisionNota.ENCARGADO_AREA,
          tx,
        );
      return this.flujo.ejecutarEvaluacion(tx, materia, {
        estados_permitidos: [EstadoSemanaDisciplina.EN_REVISION],
        nivel_esperado: NivelRevisionNota.JEFE_ESTUDIOS,
        estado_nuevo: EstadoSemanaDisciplina.REVISADO,
        nivel_nuevo: null,
        id_actor: idUsuario,
        accion: 'MARCAR_MATERIA_EVALUACION_REVISADA',
        descripcion: 'Materia marcada REVISADO por Jefe de Estudios.',
        destinatarios,
        tipo_notificacion: 'MATERIA_EVALUACION_REVISADA',
        titulo_notificacion: 'Materia de Evaluaciones revisada',
        mensaje_notificacion: `${materia.nombre} está lista para publicación.`,
        fecha: 'REVISION',
      });
    });
  }

  async publicar(idUsuario: number, idMateria: number) {
    const materia = await this.obtenerMateria(idMateria);
    const perfil = await this.validaciones.validarAccesoCursoEvaluaciones(
      idUsuario,
      materia.id_curso,
      'REGISTRO',
    );
    this.validaciones.exigirTipo(perfil, 'ENCARGADO_EVALUACIONES');
    this.validaciones.exigirPermiso(perfil, PERMISOS_NOTAS.PUBLICAR);
    if (materia.estado !== EstadoSemanaDisciplina.REVISADO) {
      throw new ConflictException(
        'Solo una materia REVISADO puede publicarse.',
      );
    }
    return this.prisma.$transaction(async (tx) => {
      const destinatarios =
        await this.notificaciones.destinatariosPublicacionEvaluaciones(
          materia.id_materia,
          tx,
        );
      return this.flujo.ejecutarEvaluacion(tx, materia, {
        estados_permitidos: [EstadoSemanaDisciplina.REVISADO],
        nivel_esperado: null,
        estado_nuevo: EstadoSemanaDisciplina.PUBLICADO,
        nivel_nuevo: null,
        id_actor: idUsuario,
        accion: 'PUBLICAR_MATERIA_EVALUACION',
        descripcion: 'Materia de Evaluaciones publicada.',
        destinatarios,
        tipo_notificacion: 'MATERIA_EVALUACION_PUBLICADA',
        titulo_notificacion: 'Evaluación publicada',
        mensaje_notificacion: `${materia.nombre} fue publicada.`,
        fecha: 'PUBLICACION',
      });
    });
  }

  private async obtenerMateria(idMateria: number): Promise<MateriaEvaluacion> {
    const materia = await this.prisma.materiaEvaluacion.findUnique({
      where: { id_materia: idMateria },
    });
    if (!materia) throw new NotFoundException('Materia no encontrada.');
    return materia;
  }

  private validarRevisorActual(
    perfil: PerfilNotas,
    nivel: NivelRevisionNota | null,
  ) {
    const esperado =
      nivel === NivelRevisionNota.ENCARGADO_AREA
        ? 'ENCARGADO_EVALUACIONES'
        : nivel === NivelRevisionNota.SECCION_ACADEMICA
          ? 'SECCION_ACADEMICA'
          : nivel === NivelRevisionNota.JEFE_ESTUDIOS
            ? 'JEFE_ESTUDIOS'
            : null;
    if (!esperado || perfil.tipo !== esperado) {
      throw new ForbiddenException(
        'La materia no está asignada a su nivel de revisión.',
      );
    }
  }
}
