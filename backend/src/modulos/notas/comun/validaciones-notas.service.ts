import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EstadoGestion, Prisma, TipoAsignacionAcademica } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  AREA_DISCIPLINA,
  AREA_ENTRENAMIENTO_FISICO,
  AREA_EVALUACIONES,
  AreaNotas,
  PERMISOS_NOTAS,
} from './constantes-notas';

type ClienteNotas = PrismaService | Prisma.TransactionClient;

export type TipoActorNotas =
  | 'ADMINISTRADOR'
  | 'ENCARGADO_DISCIPLINA'
  | 'OPERADOR_DISCIPLINA'
  | 'ENCARGADO_EVALUACIONES'
  | 'OPERADOR_EVALUACIONES'
  | 'ENCARGADO_ENTRENAMIENTO_FISICO'
  | 'SECCION_ACADEMICA'
  | 'JEFE_ESTUDIOS'
  | 'COMANDO'
  | 'CADETE'
  | 'OTRO';

export interface PerfilNotas {
  id_usuario: number;
  tipo: TipoActorNotas;
  cursos_asignados: number[];
  permisos: Set<string>;
}

function normalizar(texto: string) {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();
}

@Injectable()
export class ValidacionesNotasService {
  constructor(private readonly prisma: PrismaService) {}

  async obtenerPerfil(
    idUsuario: number,
    cliente: ClienteNotas = this.prisma,
  ): Promise<PerfilNotas> {
    return this.obtenerPerfilPorArea(idUsuario, AREA_DISCIPLINA, cliente);
  }

  async obtenerPerfilEvaluaciones(
    idUsuario: number,
    cliente: ClienteNotas = this.prisma,
  ): Promise<PerfilNotas> {
    return this.obtenerPerfilPorArea(idUsuario, AREA_EVALUACIONES, cliente);
  }

  async obtenerPerfilEntrenamientoFisico(
    idUsuario: number,
    cliente: ClienteNotas = this.prisma,
  ): Promise<PerfilNotas> {
    const perfil = await this.obtenerPerfilPorArea(
      idUsuario,
      AREA_ENTRENAMIENTO_FISICO,
      cliente,
    );
    if (perfil.tipo !== 'JEFE_ESTUDIOS') return perfil;

    // El responsable activo de Jefatura/Sección Académica es el primer nivel
    // de revisión. La pertenencia a JEFATURA_ESTUDIOS por sí sola identifica
    // al Jefe; la asignación RESPONSABLE identifica a Sección Académica.
    const responsableSeccion = await cliente.asignacionAcademica.findFirst({
      where: {
        id_usuario: idUsuario,
        activo: true,
        tipo: TipoAsignacionAcademica.RESPONSABLE,
        OR: [
          {
            seccion: {
              nombre: { contains: 'JEFATURA', mode: 'insensitive' },
            },
          },
          {
            seccion: {
              nombre: { contains: 'ACAD', mode: 'insensitive' },
            },
          },
        ],
      },
      select: { id_asignacion: true },
    });
    return responsableSeccion
      ? { ...perfil, tipo: 'SECCION_ACADEMICA' }
      : perfil;
  }

  private async obtenerPerfilPorArea(
    idUsuario: number,
    area: AreaNotas,
    cliente: ClienteNotas,
  ): Promise<PerfilNotas> {
    const usuario = await cliente.usuario.findUnique({
      where: { id_usuario: idUsuario },
      include: {
        rol: {
          include: {
            permisos: { include: { permiso: true } },
          },
        },
        permisos_individuales: { include: { permiso: true } },
        asignaciones_academicas: {
          where: { activo: true },
          include: { seccion: true },
        },
        seccion: { select: { nombre: true } },
        cadete: { select: { id_cadete: true } },
      },
    });

    if (!usuario?.habilitado) {
      throw new ForbiddenException('Usuario inexistente o inhabilitado.');
    }

    const permisos = new Set(
      usuario.rol.permisos
        .filter((item) => item.permiso.estado)
        .map((item) => item.permiso.nombre),
    );
    for (const individual of usuario.permisos_individuales) {
      if (!individual.permiso.estado) continue;
      if (individual.concedido) permisos.add(individual.permiso.nombre);
      else permisos.delete(individual.permiso.nombre);
    }

    const rol = normalizar(usuario.rol.nombre);
    const seccionUsuario = normalizar(usuario.seccion?.nombre ?? '');
    const asignacionesArea = usuario.asignaciones_academicas.filter((item) =>
      normalizar(item.seccion.nombre).includes(area),
    );
    const esEncargado = asignacionesArea.some(
      (item) => item.tipo === TipoAsignacionAcademica.RESPONSABLE,
    );
    const cursosOperador = asignacionesArea
      .filter(
        (item) =>
          item.tipo === TipoAsignacionAcademica.OPERADOR && item.id_curso,
      )
      .map((item) => item.id_curso as number);

    let tipo: TipoActorNotas = 'OTRO';
    if (rol === 'ADMINISTRADOR') tipo = 'ADMINISTRADOR';
    else if (
      seccionUsuario.includes('JEFATURA') &&
      seccionUsuario.includes('ESTUDIOS')
    ) {
      tipo = 'JEFE_ESTUDIOS';
    } else if (seccionUsuario === 'COMANDO') {
      tipo = 'COMANDO';
    } else if (esEncargado) {
      tipo =
        area === AREA_EVALUACIONES
          ? 'ENCARGADO_EVALUACIONES'
          : area === AREA_ENTRENAMIENTO_FISICO
            ? 'ENCARGADO_ENTRENAMIENTO_FISICO'
            : 'ENCARGADO_DISCIPLINA';
    } else if (cursosOperador.length) {
      tipo =
        area === AREA_EVALUACIONES
          ? 'OPERADOR_EVALUACIONES'
          : 'OPERADOR_DISCIPLINA';
    } else if (
      usuario.asignaciones_academicas.some((item) => {
        const seccion = normalizar(item.seccion.nombre);
        return item.tipo === TipoAsignacionAcademica.RESPONSABLE &&
          seccion.includes('JEFATURA') && seccion.includes('ESTUDIOS');
      })
    ) {
      tipo = 'JEFE_ESTUDIOS';
    } else if (
      seccionUsuario.includes('ACADEMICA') ||
      usuario.asignaciones_academicas.some((item) =>
        item.tipo === TipoAsignacionAcademica.RESPONSABLE &&
        normalizar(item.seccion.nombre).includes('ACADEMICA'))
    ) {
      tipo = 'SECCION_ACADEMICA';
    } else if (usuario.cadete) tipo = 'CADETE';

    return {
      id_usuario: idUsuario,
      tipo,
      cursos_asignados: [...new Set(cursosOperador)],
      permisos,
    };
  }

  async validarAccesoCurso(
    idUsuario: number,
    idCurso: number,
    modo: 'LECTURA' | 'REGISTRO',
    cliente: ClienteNotas = this.prisma,
  ) {
    const perfil = await this.obtenerPerfil(idUsuario, cliente);
    const curso = await cliente.curso.findUnique({
      where: { id_curso: idCurso },
    });
    if (!curso || curso.orden < 1 || curso.orden > 3) {
      throw new BadRequestException(
        'Disciplina solo admite los tres cursos académicos activos.',
      );
    }

    if (
      perfil.tipo === 'ADMINISTRADOR' ||
      perfil.tipo === 'ENCARGADO_DISCIPLINA'
    ) {
      return perfil;
    }
    if (
      perfil.tipo === 'OPERADOR_DISCIPLINA' &&
      perfil.cursos_asignados.includes(idCurso)
    ) {
      return perfil;
    }
    if (
      modo === 'LECTURA' &&
      (perfil.tipo === 'SECCION_ACADEMICA' ||
        perfil.tipo === 'JEFE_ESTUDIOS' ||
        perfil.tipo === 'COMANDO')
    ) {
      return perfil;
    }

    throw new ForbiddenException(
      'No tiene una asignación activa que permita acceder a este curso.',
    );
  }

  async validarAccesoCursoEvaluaciones(
    idUsuario: number,
    idCurso: number,
    modo: 'LECTURA' | 'REGISTRO',
    cliente: ClienteNotas = this.prisma,
  ) {
    const perfil = await this.obtenerPerfilEvaluaciones(idUsuario, cliente);
    const curso = await cliente.curso.findUnique({
      where: { id_curso: idCurso },
    });
    if (!curso || curso.orden < 1 || curso.orden > 3) {
      throw new BadRequestException(
        'Evaluaciones solo admite los tres cursos académicos activos.',
      );
    }

    if (
      perfil.tipo === 'ADMINISTRADOR' ||
      perfil.tipo === 'ENCARGADO_EVALUACIONES'
    ) {
      return perfil;
    }
    if (
      perfil.tipo === 'OPERADOR_EVALUACIONES' &&
      perfil.cursos_asignados.includes(idCurso)
    ) {
      return perfil;
    }
    if (
      modo === 'LECTURA' &&
      (perfil.tipo === 'SECCION_ACADEMICA' ||
        perfil.tipo === 'JEFE_ESTUDIOS' ||
        perfil.tipo === 'COMANDO')
    ) {
      return perfil;
    }

    throw new ForbiddenException(
      'No tiene una asignación activa de Evaluaciones para este curso.',
    );
  }

  async validarAccesoCursoEntrenamientoFisico(
    idUsuario: number,
    idCurso: number,
    modo: 'LECTURA' | 'REGISTRO',
    cliente: ClienteNotas = this.prisma,
  ) {
    const perfil = await this.obtenerPerfilEntrenamientoFisico(
      idUsuario,
      cliente,
    );
    const curso = await cliente.curso.findUnique({
      where: { id_curso: idCurso },
    });
    if (!curso || curso.orden < 1 || curso.orden > 3) {
      throw new BadRequestException(
        'Entrenamiento Físico solo admite los tres cursos académicos.',
      );
    }

    if (perfil.tipo === 'ENCARGADO_ENTRENAMIENTO_FISICO') return perfil;
    if (
      modo === 'LECTURA' &&
      (perfil.tipo === 'ADMINISTRADOR' ||
        perfil.tipo === 'SECCION_ACADEMICA' ||
        perfil.tipo === 'JEFE_ESTUDIOS' ||
        perfil.tipo === 'COMANDO')
    ) {
      return perfil;
    }
    throw new ForbiddenException(
      'No tiene responsabilidad sobre Entrenamiento Físico.',
    );
  }

  async validarPeriodoActivo(
    idPeriodo: number,
    cliente: ClienteNotas = this.prisma,
  ) {
    const periodo = await cliente.periodoLectivo.findUnique({
      where: { id_periodo: idPeriodo },
      include: { gestion: true },
    });
    if (!periodo) throw new NotFoundException('Periodo lectivo no encontrado.');
    if (!periodo.activo || periodo.gestion.estado !== EstadoGestion.ACTIVA) {
      throw new BadRequestException(
        'El periodo y su gestión académica deben estar activos.',
      );
    }
    return periodo;
  }

  exigirTipo(perfil: PerfilNotas, ...tipos: TipoActorNotas[]) {
    if (!tipos.includes(perfil.tipo)) {
      throw new ForbiddenException(
        'El perfil académico no puede ejecutar esta acción.',
      );
    }
  }

  exigirPermiso(perfil: PerfilNotas, permiso: string) {
    if (!perfil.permisos.has(permiso)) {
      throw new ForbiddenException(`Permiso requerido: ${permiso}`);
    }
  }
}
