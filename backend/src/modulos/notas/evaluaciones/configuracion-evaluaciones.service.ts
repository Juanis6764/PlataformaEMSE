import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditoriaService } from '../../auditoria/auditoria.service';
import { PERMISOS_NOTAS } from '../comun/constantes-notas';
import { ValidacionesNotasService } from '../comun/validaciones-notas.service';
import {
  ActualizarConfiguracionEvaluacionesDto,
  CrearConfiguracionEvaluacionesDto,
  FiltrarConfiguracionesEvaluacionesDto,
} from './dto/configuracion-evaluaciones.dto';

@Injectable()
export class ConfiguracionEvaluacionesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly validaciones: ValidacionesNotasService,
    private readonly auditoria: AuditoriaService,
  ) {}

  async listar(
    idUsuario: number,
    filtros: FiltrarConfiguracionesEvaluacionesDto,
  ) {
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
    const configuraciones =
      await this.prisma.configuracionEvaluacionesPeriodo.findMany({
        where: {
          id_periodo: filtros.id_periodo,
          id_curso: cursos ? { in: cursos } : undefined,
          activo: filtros.solo_activas === false ? undefined : true,
          periodo: { id_gestion: filtros.id_gestion },
        },
        include: { periodo: { include: { gestion: true } }, curso: true },
        orderBy: [
          { periodo: { gestion: { ano: 'desc' } } },
          { periodo: { periodo: 'asc' } },
          { curso: { orden: 'asc' } },
        ],
      });
    const conteos = await this.prisma.materiaEvaluacion.groupBy({
      by: ['id_periodo', 'id_curso'],
      where: {
        OR: configuraciones.map((item) => ({
          id_periodo: item.id_periodo,
          id_curso: item.id_curso,
        })),
      },
      _count: { _all: true },
    });
    const porSeleccion = new Map(
      conteos.map((item) => [
        `${item.id_periodo}:${item.id_curso}`,
        item._count._all,
      ]),
    );
    return configuraciones.map((item) => ({
      ...item,
      materias_registradas:
        porSeleccion.get(`${item.id_periodo}:${item.id_curso}`) ?? 0,
    }));
  }

  async crear(idUsuario: number, dto: CrearConfiguracionEvaluacionesDto) {
    const perfil = await this.validaciones.validarAccesoCursoEvaluaciones(
      idUsuario,
      dto.id_curso,
      'REGISTRO',
    );
    this.validaciones.exigirTipo(perfil, 'ENCARGADO_EVALUACIONES');
    this.validaciones.exigirPermiso(perfil, PERMISOS_NOTAS.REGISTRAR);
    await this.validaciones.validarPeriodoActivo(dto.id_periodo);

    try {
      return await this.prisma.$transaction(async (tx) => {
        const creada = await tx.configuracionEvaluacionesPeriodo.create({
          data: { ...dto, id_creador: idUsuario },
          include: { periodo: { include: { gestion: true } }, curso: true },
        });
        await this.auditoria.registrar(
          {
            id_usuario: idUsuario,
            accion: 'CREAR_CONFIGURACION_EVALUACIONES',
            modulo: 'NOTAS_EVALUACIONES',
            entidad: 'ConfiguracionEvaluacionesPeriodo',
            id_entidad: creada.id_configuracion,
            descripcion: 'Cantidad de materias de Evaluaciones configurada.',
            datos_despues: {
              id_periodo: creada.id_periodo,
              id_curso: creada.id_curso,
              cantidad_materias: creada.cantidad_materias,
              activo: creada.activo,
            },
          },
          tx,
        );
        return { ...creada, materias_registradas: 0 };
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'Ya existe una configuración para el periodo y curso.',
        );
      }
      throw error;
    }
  }

  async actualizar(
    idUsuario: number,
    idConfiguracion: number,
    dto: ActualizarConfiguracionEvaluacionesDto,
  ) {
    const actual = await this.obtener(idConfiguracion);
    const perfil = await this.validaciones.validarAccesoCursoEvaluaciones(
      idUsuario,
      actual.id_curso,
      'REGISTRO',
    );
    this.validaciones.exigirTipo(perfil, 'ENCARGADO_EVALUACIONES');
    this.validaciones.exigirPermiso(perfil, PERMISOS_NOTAS.EDITAR);
    await this.validaciones.validarPeriodoActivo(actual.id_periodo);
    if (!actual.activo) {
      throw new BadRequestException('La configuración está desactivada.');
    }
    const ultima = await this.prisma.materiaEvaluacion.aggregate({
      where: { id_periodo: actual.id_periodo, id_curso: actual.id_curso },
      _max: { numero_materia: true },
    });
    if ((ultima._max.numero_materia ?? 0) > dto.cantidad_materias) {
      throw new BadRequestException(
        'No puede reducir el límite por debajo de la última materia creada.',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const actualizada = await tx.configuracionEvaluacionesPeriodo.update({
        where: { id_configuracion: idConfiguracion },
        data: { cantidad_materias: dto.cantidad_materias },
      });
      await this.auditoria.registrar(
        {
          id_usuario: idUsuario,
          accion: 'ACTUALIZAR_CONFIGURACION_EVALUACIONES',
          modulo: 'NOTAS_EVALUACIONES',
          entidad: 'ConfiguracionEvaluacionesPeriodo',
          id_entidad: idConfiguracion,
          descripcion: 'Cantidad de materias de Evaluaciones actualizada.',
          datos_antes: { cantidad_materias: actual.cantidad_materias },
          datos_despues: {
            cantidad_materias: actualizada.cantidad_materias,
          },
        },
        tx,
      );
      return {
        ...actualizada,
        materias_registradas: ultima._max.numero_materia ?? 0,
      };
    });
  }

  private async obtener(idConfiguracion: number) {
    const configuracion =
      await this.prisma.configuracionEvaluacionesPeriodo.findUnique({
        where: { id_configuracion: idConfiguracion },
      });
    if (!configuracion) {
      throw new NotFoundException(
        'Configuración de Evaluaciones no encontrada.',
      );
    }
    return configuracion;
  }
}
