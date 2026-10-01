import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EstadoSemanaDisciplina, NivelRevisionNota } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditoriaService } from '../../auditoria/auditoria.service';
import { FlujoNotasService } from '../comun/flujo-notas.service';
import { NotificacionesNotasService } from '../comun/notificaciones-notas.service';
import { PERMISOS_NOTAS } from '../comun/constantes-notas';
import {
  PerfilNotas,
  ValidacionesNotasService,
} from '../comun/validaciones-notas.service';
import {
  CrearSemanaDisciplinaDto,
  FiltrarSemanasDisciplinaDto,
  ObservarSemanaDisciplinaDto,
} from './dto/semana-disciplina.dto';

@Injectable()
export class SemanasDisciplinaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly validaciones: ValidacionesNotasService,
    private readonly flujo: FlujoNotasService,
    private readonly notificaciones: NotificacionesNotasService,
    private readonly auditoria: AuditoriaService,
  ) {}

  async listar(idUsuario: number, filtros: FiltrarSemanasDisciplinaDto) {
    const perfil = await this.validaciones.obtenerPerfil(idUsuario);
    this.validaciones.exigirTipo(
      perfil,
      'ADMINISTRADOR',
      'ENCARGADO_DISCIPLINA',
      'OPERADOR_DISCIPLINA',
      'SECCION_ACADEMICA',
      'JEFE_ESTUDIOS',
      'COMANDO',
    );
    if (filtros.id_curso) {
      await this.validaciones.validarAccesoCurso(
        idUsuario,
        filtros.id_curso,
        'LECTURA',
      );
    }
    const cursos =
      perfil.tipo === 'OPERADOR_DISCIPLINA'
        ? perfil.cursos_asignados
        : filtros.id_curso
          ? [filtros.id_curso]
          : undefined;

    return this.prisma.semanaDisciplina.findMany({
      where: {
        id_periodo: filtros.id_periodo,
        id_curso: cursos ? { in: cursos } : undefined,
        estado: filtros.estado,
        nivel_revision_actual: filtros.nivel_revision,
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
        _count: { select: { registros: true } },
      },
      orderBy: [
        { periodo: { gestion: { ano: 'desc' } } },
        { periodo: { periodo: 'asc' } },
        { curso: { orden: 'asc' } },
        { numero_semana: 'asc' },
      ],
    });
  }

  async pendientes(idUsuario: number) {
    const perfil = await this.validaciones.obtenerPerfil(idUsuario);
    let nivel: NivelRevisionNota;
    if (perfil.tipo === 'ENCARGADO_DISCIPLINA') {
      nivel = NivelRevisionNota.ENCARGADO_AREA;
    } else if (perfil.tipo === 'SECCION_ACADEMICA') {
      nivel = NivelRevisionNota.SECCION_ACADEMICA;
    } else if (perfil.tipo === 'JEFE_ESTUDIOS') {
      nivel = NivelRevisionNota.JEFE_ESTUDIOS;
    } else {
      throw new ForbiddenException('El perfil no es un revisor de Disciplina.');
    }
    return this.listar(idUsuario, {
      estado: EstadoSemanaDisciplina.EN_REVISION,
      nivel_revision: nivel,
    });
  }

  async obtenerDetalle(idUsuario: number, idSemana: number) {
    const semana = await this.prisma.semanaDisciplina.findUnique({
      where: { id_semana: idSemana },
      include: {
        periodo: { include: { gestion: true } },
        curso: true,
        creador: {
          select: { id_usuario: true, nombres: true, apellidos: true },
        },
        ultimo_responsable: {
          select: { id_usuario: true, nombres: true, apellidos: true },
        },
        registros: {
          include: {
            catalogo: true,
            oficial: true,
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
          orderBy: [{ id_cadete: 'asc' }, { fecha_hecho: 'asc' }],
        },
      },
    });
    if (!semana) throw new NotFoundException('Semana no encontrada.');
    const perfil = await this.validaciones.validarAccesoCurso(
      idUsuario,
      semana.id_curso,
      'LECTURA',
    );
    const registrosVisibles =
      perfil.tipo === 'COMANDO' &&
      semana.estado !== EstadoSemanaDisciplina.PUBLICADO
        ? []
        : semana.registros;
    const cadetes = await this.prisma.cadete.findMany({
      where: { id_curso: semana.id_curso },
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
    const idsConRegistro = new Set(
      registrosVisibles.map((registro) => registro.id_cadete),
    );
    return {
      ...semana,
      registros: registrosVisibles.map((registro) => ({
        ...registro,
        puntaje: registro.puntaje.toFixed(4),
        catalogo: {
          ...registro.catalogo,
          puntaje_base: registro.catalogo.puntaje_base?.toFixed(4) ?? null,
        },
      })),
      cadetes: cadetes.map((cadete) => ({
        ...cadete,
        tiene_registros: idsConRegistro.has(cadete.id_cadete),
      })),
    };
  }

  async crear(idUsuario: number, dto: CrearSemanaDisciplinaDto) {
    const perfil = await this.validaciones.validarAccesoCurso(
      idUsuario,
      dto.id_curso,
      'REGISTRO',
    );
    this.validaciones.exigirTipo(
      perfil,
      'ADMINISTRADOR',
      'ENCARGADO_DISCIPLINA',
    );
    this.validaciones.exigirPermiso(
      perfil,
      PERMISOS_NOTAS.CONFIGURAR_DISCIPLINA,
    );
    await this.validaciones.validarPeriodoActivo(dto.id_periodo);

    return this.prisma.$transaction(async (tx) => {
      const configuracion = await tx.configuracionDisciplinaPeriodo.findUnique({
        where: {
          id_periodo_id_curso: {
            id_periodo: dto.id_periodo,
            id_curso: dto.id_curso,
          },
        },
      });
      if (!configuracion?.activo) {
        throw new BadRequestException(
          'No existe una configuración activa para el periodo y curso.',
        );
      }
      if (dto.numero_semana > configuracion.cantidad_semanas) {
        throw new BadRequestException(
          'El número de semana supera la cantidad configurada.',
        );
      }
      if (dto.numero_semana > 1) {
        const anterior = await tx.semanaDisciplina.findUnique({
          where: {
            id_periodo_id_curso_numero_semana: {
              id_periodo: dto.id_periodo,
              id_curso: dto.id_curso,
              numero_semana: dto.numero_semana - 1,
            },
          },
        });
        if (!anterior) {
          throw new BadRequestException(
            `Debe crear primero la Semana ${dto.numero_semana - 1}.`,
          );
        }
      }
      const semana = await tx.semanaDisciplina.create({
        data: {
          ...dto,
          id_creador: idUsuario,
          id_ultimo_responsable: idUsuario,
        },
      });
      await this.auditoria.registrar(
        {
          id_usuario: idUsuario,
          accion: 'HABILITAR_SEMANA',
          modulo: 'NOTAS_DISCIPLINA',
          entidad: 'SemanaDisciplina',
          id_entidad: semana.id_semana,
          descripcion: 'Semana de Disciplina habilitada manualmente.',
          datos_despues: {
            id_periodo: semana.id_periodo,
            id_curso: semana.id_curso,
            numero_semana: semana.numero_semana,
            estado: semana.estado,
          },
        },
        tx,
      );
      return semana;
    });
  }

  async enviar(idUsuario: number, idSemana: number) {
    const semana = await this.obtenerSemana(idSemana);
    const perfil = await this.validaciones.validarAccesoCurso(
      idUsuario,
      semana.id_curso,
      'REGISTRO',
    );
    this.validaciones.exigirTipo(perfil, 'OPERADOR_DISCIPLINA');
    if (
      semana.estado !== EstadoSemanaDisciplina.BORRADOR &&
      semana.estado !== EstadoSemanaDisciplina.OBSERVADO
    ) {
      throw new ConflictException(
        'La semana solo puede enviarse desde BORRADOR u OBSERVADO.',
      );
    }
    if (semana.estado === EstadoSemanaDisciplina.BORRADOR) {
      await this.validaciones.validarPeriodoActivo(semana.id_periodo);
    }
    const nivel = this.nivelInicial(perfil);

    return this.prisma.$transaction(async (tx) => {
      const destinatarios = await this.notificaciones.destinatariosNivel(
        nivel,
        tx,
      );
      return this.flujo.ejecutar(tx, semana, {
        estados_permitidos: [
          EstadoSemanaDisciplina.BORRADOR,
          EstadoSemanaDisciplina.OBSERVADO,
        ],
        nivel_esperado: semana.nivel_revision_actual,
        estado_nuevo: EstadoSemanaDisciplina.EN_REVISION,
        nivel_nuevo: nivel,
        id_actor: idUsuario,
        accion:
          semana.estado === EstadoSemanaDisciplina.OBSERVADO
            ? 'REENVIAR_SEMANA'
            : 'ENVIAR_SEMANA',
        descripcion: 'Semana enviada al flujo institucional de revisión.',
        destinatarios,
        tipo_notificacion: 'SEMANA_ENVIADA',
        titulo_notificacion: 'Semana de Disciplina enviada',
        mensaje_notificacion: `La Semana ${semana.numero_semana} fue enviada para revisión.`,
        fecha: 'ENVIO',
      });
    });
  }

  async observar(
    idUsuario: number,
    idSemana: number,
    dto: ObservarSemanaDisciplinaDto,
  ) {
    const semana = await this.obtenerSemana(idSemana);
    const perfil = await this.validaciones.validarAccesoCurso(
      idUsuario,
      semana.id_curso,
      'LECTURA',
    );
    this.validarRevisorActual(perfil, semana.nivel_revision_actual);
    if (semana.estado !== EstadoSemanaDisciplina.EN_REVISION) {
      throw new ConflictException(
        'Solo una semana EN_REVISION puede observarse.',
      );
    }
    const nivelRetorno = NivelRevisionNota.ENCARGADO_AREA;

    return this.prisma.$transaction(async (tx) => {
      const operadores = await this.notificaciones.destinatariosOperadoresCurso(
        semana.id_curso,
        tx,
      );
      return this.flujo.ejecutar(tx, semana, {
        estados_permitidos: [EstadoSemanaDisciplina.EN_REVISION],
        nivel_esperado: semana.nivel_revision_actual,
        estado_nuevo: EstadoSemanaDisciplina.OBSERVADO,
        nivel_nuevo: nivelRetorno,
        id_actor: idUsuario,
        accion: 'OBSERVAR_SEMANA',
        descripcion: 'Semana observada y devuelta al Operador para corrección.',
        comentario: dto.comentario.trim(),
        destinatarios: operadores,
        tipo_notificacion: 'SEMANA_OBSERVADA',
        titulo_notificacion: 'Semana de Disciplina observada',
        mensaje_notificacion: `La Semana ${semana.numero_semana} fue observada: ${dto.comentario.trim()}`,
        fecha: 'REVISION',
      });
    });
  }

  async aprobar(idUsuario: number, idSemana: number) {
    const semana = await this.obtenerSemana(idSemana);
    const perfil = await this.validaciones.validarAccesoCurso(
      idUsuario,
      semana.id_curso,
      'LECTURA',
    );
    this.validarRevisorActual(perfil, semana.nivel_revision_actual);
    if (semana.estado !== EstadoSemanaDisciplina.EN_REVISION) {
      throw new ConflictException(
        'Solo una semana EN_REVISION puede aprobarse.',
      );
    }
    let nivelSiguiente: NivelRevisionNota;
    if (semana.nivel_revision_actual === NivelRevisionNota.ENCARGADO_AREA) {
      nivelSiguiente = NivelRevisionNota.SECCION_ACADEMICA;
    } else if (
      semana.nivel_revision_actual === NivelRevisionNota.SECCION_ACADEMICA
    ) {
      nivelSiguiente = NivelRevisionNota.JEFE_ESTUDIOS;
    } else {
      throw new BadRequestException(
        'El Jefe de Estudios debe usar la acción marcar-revisada.',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const destinatarios = await this.notificaciones.destinatariosNivel(
        nivelSiguiente,
        tx,
      );
      return this.flujo.ejecutar(tx, semana, {
        estados_permitidos: [EstadoSemanaDisciplina.EN_REVISION],
        nivel_esperado: semana.nivel_revision_actual,
        estado_nuevo: EstadoSemanaDisciplina.EN_REVISION,
        nivel_nuevo: nivelSiguiente,
        id_actor: idUsuario,
        accion: 'APROBAR_SEMANA',
        descripcion: 'Semana aprobada y avanzada al siguiente nivel.',
        destinatarios,
        tipo_notificacion: 'SEMANA_APROBADA',
        titulo_notificacion: 'Semana de Disciplina pendiente',
        mensaje_notificacion: `La Semana ${semana.numero_semana} avanzó a su nivel de revisión.`,
        fecha: 'REVISION',
      });
    });
  }

  async marcarRevisada(idUsuario: number, idSemana: number) {
    const semana = await this.obtenerSemana(idSemana);
    const perfil = await this.validaciones.validarAccesoCurso(
      idUsuario,
      semana.id_curso,
      'LECTURA',
    );
    this.validaciones.exigirTipo(perfil, 'JEFE_ESTUDIOS');
    if (
      semana.estado !== EstadoSemanaDisciplina.EN_REVISION ||
      semana.nivel_revision_actual !== NivelRevisionNota.JEFE_ESTUDIOS
    ) {
      throw new ConflictException(
        'La semana no está pendiente de revisión por Jefe de Estudios.',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const destinatarios = await this.notificaciones.destinatariosNivel(
        NivelRevisionNota.ENCARGADO_AREA,
        tx,
      );
      return this.flujo.ejecutar(tx, semana, {
        estados_permitidos: [EstadoSemanaDisciplina.EN_REVISION],
        nivel_esperado: NivelRevisionNota.JEFE_ESTUDIOS,
        estado_nuevo: EstadoSemanaDisciplina.REVISADO,
        nivel_nuevo: null,
        id_actor: idUsuario,
        accion: 'MARCAR_SEMANA_REVISADA',
        descripcion: 'Semana marcada como REVISADO por Jefe de Estudios.',
        destinatarios,
        tipo_notificacion: 'SEMANA_REVISADA',
        titulo_notificacion: 'Semana de Disciplina revisada',
        mensaje_notificacion: `La Semana ${semana.numero_semana} está lista para publicación.`,
        fecha: 'REVISION',
      });
    });
  }

  async publicar(idUsuario: number, idSemana: number) {
    const semana = await this.obtenerSemana(idSemana);
    const perfil = await this.validaciones.validarAccesoCurso(
      idUsuario,
      semana.id_curso,
      'REGISTRO',
    );
    this.validaciones.exigirTipo(perfil, 'ENCARGADO_DISCIPLINA');
    if (semana.estado !== EstadoSemanaDisciplina.REVISADO) {
      throw new ConflictException('Solo una semana REVISADO puede publicarse.');
    }

    return this.prisma.$transaction(async (tx) => {
      const destinatarios = await this.notificaciones.destinatariosPublicacion(
        semana.id_semana,
        tx,
      );
      return this.flujo.ejecutar(tx, semana, {
        estados_permitidos: [EstadoSemanaDisciplina.REVISADO],
        nivel_esperado: null,
        estado_nuevo: EstadoSemanaDisciplina.PUBLICADO,
        nivel_nuevo: null,
        id_actor: idUsuario,
        accion: 'PUBLICAR_SEMANA',
        descripcion: 'Semana de Disciplina publicada.',
        destinatarios,
        tipo_notificacion: 'SEMANA_PUBLICADA',
        titulo_notificacion: 'Disciplina publicada',
        mensaje_notificacion: `La Semana ${semana.numero_semana} fue publicada.`,
        fecha: 'PUBLICACION',
      });
    });
  }

  private async obtenerSemana(idSemana: number) {
    const semana = await this.prisma.semanaDisciplina.findUnique({
      where: { id_semana: idSemana },
    });
    if (!semana) throw new NotFoundException('Semana no encontrada.');
    return semana;
  }

  private nivelInicial(perfil: PerfilNotas) {
    if (perfil.tipo === 'OPERADOR_DISCIPLINA') {
      return NivelRevisionNota.ENCARGADO_AREA;
    }
    throw new ForbiddenException(
      'Solo el Operador de Disciplina puede enviar o reenviar la semana.',
    );
  }

  private validarRevisorActual(
    perfil: PerfilNotas,
    nivel: NivelRevisionNota | null,
  ) {
    const esperado =
      nivel === NivelRevisionNota.ENCARGADO_AREA
        ? 'ENCARGADO_DISCIPLINA'
        : nivel === NivelRevisionNota.SECCION_ACADEMICA
          ? 'SECCION_ACADEMICA'
          : nivel === NivelRevisionNota.JEFE_ESTUDIOS
            ? 'JEFE_ESTUDIOS'
            : null;
    if (!esperado || perfil.tipo !== esperado) {
      throw new ForbiddenException(
        'La semana no está asignada a su nivel de revisión.',
      );
    }
  }
}
