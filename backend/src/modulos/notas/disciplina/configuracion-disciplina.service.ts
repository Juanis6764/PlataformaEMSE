import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditoriaService } from '../../auditoria/auditoria.service';
import { ValidacionesNotasService } from '../comun/validaciones-notas.service';
import { PERMISOS_NOTAS } from '../comun/constantes-notas';
import {
  ActualizarConfiguracionDisciplinaDto,
  CrearConfiguracionDisciplinaDto,
  FiltrarConfiguracionesDisciplinaDto,
} from './dto/configuracion-disciplina.dto';

@Injectable()
export class ConfiguracionDisciplinaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly validaciones: ValidacionesNotasService,
    private readonly auditoria: AuditoriaService,
  ) {}

  async listar(
    idUsuario: number,
    filtros: FiltrarConfiguracionesDisciplinaDto,
  ) {
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
    const cursos =
      perfil.tipo === 'OPERADOR_DISCIPLINA'
        ? perfil.cursos_asignados
        : filtros.id_curso
          ? [filtros.id_curso]
          : undefined;
    if (filtros.id_curso && cursos && !cursos.includes(filtros.id_curso)) {
      await this.validaciones.validarAccesoCurso(
        idUsuario,
        filtros.id_curso,
        'LECTURA',
      );
    }

    return this.prisma.configuracionDisciplinaPeriodo.findMany({
      where: {
        id_periodo: filtros.id_periodo,
        id_curso: cursos ? { in: cursos } : undefined,
        activo: filtros.solo_activas === false ? undefined : true,
      },
      include: { periodo: { include: { gestion: true } }, curso: true },
      orderBy: [
        { periodo: { gestion: { ano: 'desc' } } },
        { periodo: { periodo: 'asc' } },
        { curso: { orden: 'asc' } },
      ],
    });
  }

  async crear(idUsuario: number, dto: CrearConfiguracionDisciplinaDto) {
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
      const creada = await tx.configuracionDisciplinaPeriodo.create({
        data: { ...dto, id_creador: idUsuario },
        include: { periodo: { include: { gestion: true } }, curso: true },
      });
      await this.auditoria.registrar(
        {
          id_usuario: idUsuario,
          accion: 'CREAR_CONFIGURACION',
          modulo: 'NOTAS_DISCIPLINA',
          entidad: 'ConfiguracionDisciplinaPeriodo',
          id_entidad: creada.id_configuracion,
          descripcion: 'Configuración real de semanas creada.',
          datos_despues: {
            id_periodo: creada.id_periodo,
            id_curso: creada.id_curso,
            cantidad_semanas: creada.cantidad_semanas,
            activo: creada.activo,
          },
        },
        tx,
      );
      return creada;
    });
  }

  async actualizar(
    idUsuario: number,
    idConfiguracion: number,
    dto: ActualizarConfiguracionDisciplinaDto,
  ) {
    const actual = await this.obtener(idConfiguracion);
    const perfil = await this.validaciones.validarAccesoCurso(
      idUsuario,
      actual.id_curso,
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
    await this.validaciones.validarPeriodoActivo(actual.id_periodo);
    if (!actual.activo) {
      throw new BadRequestException('La configuración está desactivada.');
    }
    const ultima = await this.prisma.semanaDisciplina.aggregate({
      where: {
        id_periodo: actual.id_periodo,
        id_curso: actual.id_curso,
      },
      _max: { numero_semana: true },
    });
    if ((ultima._max.numero_semana ?? 0) > dto.cantidad_semanas) {
      throw new BadRequestException(
        'No puede reducir el límite por debajo de la última semana creada.',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const actualizada = await tx.configuracionDisciplinaPeriodo.update({
        where: { id_configuracion: idConfiguracion },
        data: { cantidad_semanas: dto.cantidad_semanas },
      });
      await this.auditoria.registrar(
        {
          id_usuario: idUsuario,
          accion: 'ACTUALIZAR_CONFIGURACION',
          modulo: 'NOTAS_DISCIPLINA',
          entidad: 'ConfiguracionDisciplinaPeriodo',
          id_entidad: idConfiguracion,
          descripcion: 'Cantidad de semanas actualizada.',
          datos_antes: { cantidad_semanas: actual.cantidad_semanas },
          datos_despues: { cantidad_semanas: actualizada.cantidad_semanas },
        },
        tx,
      );
      return actualizada;
    });
  }

  async desactivar(idUsuario: number, idConfiguracion: number) {
    const actual = await this.obtener(idConfiguracion);
    const perfil = await this.validaciones.validarAccesoCurso(
      idUsuario,
      actual.id_curso,
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
    if (!actual.activo) return actual;

    return this.prisma.$transaction(async (tx) => {
      const actualizada = await tx.configuracionDisciplinaPeriodo.update({
        where: { id_configuracion: idConfiguracion },
        data: { activo: false },
      });
      await this.auditoria.registrar(
        {
          id_usuario: idUsuario,
          accion: 'DESACTIVAR_CONFIGURACION',
          modulo: 'NOTAS_DISCIPLINA',
          entidad: 'ConfiguracionDisciplinaPeriodo',
          id_entidad: idConfiguracion,
          descripcion: 'Configuración de semanas desactivada.',
          datos_antes: { activo: true },
          datos_despues: { activo: false },
        },
        tx,
      );
      return actualizada;
    });
  }

  private async obtener(idConfiguracion: number) {
    const configuracion =
      await this.prisma.configuracionDisciplinaPeriodo.findUnique({
        where: { id_configuracion: idConfiguracion },
      });
    if (!configuracion) {
      throw new NotFoundException('Configuración de Disciplina no encontrada.');
    }
    return configuracion;
  }
}
