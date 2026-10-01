import { Injectable } from '@nestjs/common';
import {
  ModuloNotificacion,
  NivelRevisionNota,
  Prisma,
  TipoAsignacionAcademica,
} from '@prisma/client';
import {
  CrearNotificacionInterna,
  NotificacionesService,
} from '../../notificaciones/notificaciones.service';
import {
  AREA_DISCIPLINA,
  AREA_ENTRENAMIENTO_FISICO,
  AREA_EVALUACIONES,
  PERMISOS_NOTAS,
} from './constantes-notas';

type ClienteNotificacionesNotas = Pick<
  Prisma.TransactionClient,
  | 'asignacionAcademica'
  | 'usuarioPermiso'
  | 'registroDisciplina'
  | 'notaEvaluacion'
  | 'notificacion'
>;

export interface EventoSemanaDisciplina {
  id_semana: number;
  version_flujo: number;
  id_emisor: number;
  destinatarios: number[];
  tipo: string;
  titulo: string;
  mensaje: string;
}

export interface EventoResultadoFinalDisciplina {
  id_configuracion: number;
  id_gestion: number;
  id_periodo: number;
  id_curso: number;
  id_emisor: number;
  destinatarios: number[];
  gestion: number;
  periodo: string;
  curso: string;
}

export interface EventoMateriaEvaluacion {
  id_materia: number;
  version_flujo: number;
  id_emisor: number;
  destinatarios: number[];
  tipo: string;
  titulo: string;
  mensaje: string;
}

export interface EventoPlanillaEntrenamientoFisico {
  id_planilla: number;
  version_flujo: number;
  id_emisor: number;
  destinatarios: number[];
  tipo: string;
  titulo: string;
  mensaje: string;
  ruta_destino?: string;
}

export interface EventoResultadoEntrenamientoFisico {
  id_planilla: number;
  version_flujo: number;
  id_emisor: number;
  id_destinatario: number;
  id_gestion: number;
  id_periodo: number;
  id_curso: number;
  gestion: number;
  periodo: string;
  curso: string;
}

@Injectable()
export class NotificacionesNotasService {
  constructor(private readonly notificaciones: NotificacionesService) {}

  async destinatariosNivel(
    nivel: NivelRevisionNota,
    cliente: ClienteNotificacionesNotas,
  ): Promise<number[]> {
    if (nivel === NivelRevisionNota.ENCARGADO_AREA) {
      const asignaciones = await cliente.asignacionAcademica.findMany({
        where: {
          activo: true,
          tipo: TipoAsignacionAcademica.RESPONSABLE,
          seccion: { nombre: { contains: 'DISCIPLINA', mode: 'insensitive' } },
          usuario: { habilitado: true },
        },
        select: { id_usuario: true },
      });
      return asignaciones.map((item) => item.id_usuario);
    }

    if (nivel === NivelRevisionNota.SECCION_ACADEMICA) {
      const asignaciones = await cliente.asignacionAcademica.findMany({
        where: {
          activo: true,
          tipo: TipoAsignacionAcademica.RESPONSABLE,
          OR: [
            {
              seccion: {
                nombre: { contains: 'JEFATURA', mode: 'insensitive' },
              },
            },
            { seccion: { nombre: { contains: 'ACAD', mode: 'insensitive' } } },
          ],
          usuario: { habilitado: true },
        },
        select: { id_usuario: true },
      });
      return asignaciones.map((item) => item.id_usuario);
    }

    const permisos = await cliente.usuarioPermiso.findMany({
      where: {
        concedido: true,
        permiso: {
          nombre: PERMISOS_NOTAS.MARCAR_REVISADAS,
          estado: true,
        },
        usuario: { habilitado: true },
      },
      select: { id_usuario: true },
    });
    return permisos.map((item) => item.id_usuario);
  }

  async destinatariosOperadoresCurso(
    idCurso: number,
    cliente: ClienteNotificacionesNotas,
  ) {
    const asignaciones = await cliente.asignacionAcademica.findMany({
      where: {
        activo: true,
        tipo: TipoAsignacionAcademica.OPERADOR,
        id_curso: idCurso,
        seccion: { nombre: { contains: 'DISCIPLINA', mode: 'insensitive' } },
        usuario: { habilitado: true },
      },
      select: { id_usuario: true },
    });
    return asignaciones.map((item) => item.id_usuario);
  }

  async destinatariosNivelEvaluaciones(
    nivel: NivelRevisionNota,
    cliente: ClienteNotificacionesNotas,
  ): Promise<number[]> {
    if (nivel !== NivelRevisionNota.ENCARGADO_AREA) {
      return this.destinatariosNivel(nivel, cliente);
    }
    const asignaciones = await cliente.asignacionAcademica.findMany({
      where: {
        activo: true,
        tipo: TipoAsignacionAcademica.RESPONSABLE,
        seccion: { nombre: { contains: 'EVALUACIONES', mode: 'insensitive' } },
        usuario: { habilitado: true },
      },
      select: { id_usuario: true },
    });
    return asignaciones.map((item) => item.id_usuario);
  }

  async destinatariosOperadoresCursoEvaluaciones(
    idCurso: number,
    cliente: ClienteNotificacionesNotas,
  ) {
    const asignaciones = await cliente.asignacionAcademica.findMany({
      where: {
        activo: true,
        tipo: TipoAsignacionAcademica.OPERADOR,
        id_curso: idCurso,
        seccion: { nombre: { contains: 'EVALUACIONES', mode: 'insensitive' } },
        usuario: { habilitado: true },
      },
      select: { id_usuario: true },
    });
    return asignaciones.map((item) => item.id_usuario);
  }

  async destinatariosPublicacion(
    idSemana: number,
    cliente: ClienteNotificacionesNotas,
  ) {
    const registros = await cliente.registroDisciplina.findMany({
      where: { id_semana: idSemana },
      select: {
        id_creador: true,
        cadete: { select: { id_usuario: true } },
      },
    });
    return [
      ...registros.map((registro) => registro.id_creador),
      ...registros.map((registro) => registro.cadete.id_usuario),
    ];
  }

  async destinatariosEvaluaciones(cliente: ClienteNotificacionesNotas) {
    const asignaciones = await cliente.asignacionAcademica.findMany({
      where: {
        activo: true,
        tipo: TipoAsignacionAcademica.RESPONSABLE,
        seccion: { nombre: { contains: 'EVALUACIONES', mode: 'insensitive' } },
        usuario: { habilitado: true },
      },
      select: { id_usuario: true },
    });
    return asignaciones.map((item) => item.id_usuario);
  }

  async destinatariosEncargadoEntrenamientoFisico(
    cliente: ClienteNotificacionesNotas,
  ) {
    const asignaciones = await cliente.asignacionAcademica.findMany({
      where: {
        activo: true,
        tipo: TipoAsignacionAcademica.RESPONSABLE,
        seccion: { nombre: { equals: AREA_ENTRENAMIENTO_FISICO } },
        usuario: { habilitado: true },
      },
      select: { id_usuario: true },
    });
    return asignaciones.map((item) => item.id_usuario);
  }

  async destinatariosPublicacionEvaluaciones(
    idMateria: number,
    cliente: ClienteNotificacionesNotas,
  ) {
    const notas = await cliente.notaEvaluacion.findMany({
      where: { id_materia: idMateria },
      select: {
        id_creador: true,
        cadete: { select: { id_usuario: true } },
      },
    });
    return [
      ...notas.map((nota) => nota.id_creador),
      ...notas.map((nota) => nota.cadete.id_usuario),
    ];
  }

  crearEvento(
    evento: EventoSemanaDisciplina,
    cliente: ClienteNotificacionesNotas,
  ) {
    const unicos = [...new Set(evento.destinatarios)];
    const filas: CrearNotificacionInterna[] = unicos.map((idDestinatario) => ({
      id_usuario_destinatario: idDestinatario,
      id_usuario_emisor: evento.id_emisor,
      modulo: ModuloNotificacion.ACADEMICO,
      area: AREA_DISCIPLINA,
      tipo: evento.tipo,
      titulo: evento.titulo,
      mensaje: evento.mensaje,
      id_referencia: evento.id_semana,
      ruta_destino: `/notas/disciplina/semanas/${evento.id_semana}`,
      clave_evento: [
        'DISCIPLINA',
        evento.id_semana,
        evento.version_flujo,
        evento.tipo,
        idDestinatario,
      ].join(':'),
    }));
    return this.notificaciones.crearMuchasUnicas(filas, cliente);
  }

  crearEventoResultadoFinal(
    evento: EventoResultadoFinalDisciplina,
    cliente: ClienteNotificacionesNotas,
  ) {
    const filas: CrearNotificacionInterna[] = [
      ...new Set(evento.destinatarios),
    ].map((idDestinatario) => ({
      id_usuario_destinatario: idDestinatario,
      id_usuario_emisor: evento.id_emisor,
      modulo: ModuloNotificacion.ACADEMICO,
      area: AREA_DISCIPLINA,
      tipo: 'NOTAS_FINALES_DISCIPLINA',
      titulo: 'Notas finales de Disciplina disponibles',
      mensaje: `Disciplina de ${evento.curso.replaceAll('_', ' ')} - ${evento.periodo}/${evento.gestion} finalizada. Las notas finales están disponibles para Evaluaciones.`,
      id_referencia: evento.id_configuracion,
      ruta_destino: `/modulos/notas/evaluaciones/consulta?vista=resultados-recibidos&id_gestion=${evento.id_gestion}&id_periodo=${evento.id_periodo}&id_curso=${evento.id_curso}`,
      clave_evento: [
        'DISCIPLINA',
        'RESULTADO_FINAL',
        evento.id_periodo,
        evento.id_curso,
        idDestinatario,
      ].join(':'),
    }));
    return this.notificaciones.crearMuchasUnicas(filas, cliente);
  }

  crearEventoEvaluaciones(
    evento: EventoMateriaEvaluacion,
    cliente: ClienteNotificacionesNotas,
  ) {
    const filas: CrearNotificacionInterna[] = [
      ...new Set(evento.destinatarios),
    ].map((idDestinatario) => ({
      id_usuario_destinatario: idDestinatario,
      id_usuario_emisor: evento.id_emisor,
      modulo: ModuloNotificacion.ACADEMICO,
      area: AREA_EVALUACIONES,
      tipo: evento.tipo,
      titulo: evento.titulo,
      mensaje: evento.mensaje,
      id_referencia: evento.id_materia,
      ruta_destino: `/modulos/notas/evaluaciones/revision?materia=${evento.id_materia}`,
      clave_evento: [
        AREA_EVALUACIONES,
        evento.id_materia,
        evento.version_flujo,
        evento.tipo,
        idDestinatario,
      ].join(':'),
    }));
    return this.notificaciones.crearMuchasUnicas(filas, cliente);
  }

  crearEventoEntrenamientoFisico(
    evento: EventoPlanillaEntrenamientoFisico,
    cliente: ClienteNotificacionesNotas,
  ) {
    const filas: CrearNotificacionInterna[] = [
      ...new Set(evento.destinatarios),
    ].map((idDestinatario) => ({
      id_usuario_destinatario: idDestinatario,
      id_usuario_emisor: evento.id_emisor,
      modulo: ModuloNotificacion.ACADEMICO,
      area: AREA_ENTRENAMIENTO_FISICO,
      tipo: evento.tipo,
      titulo: evento.titulo,
      mensaje: evento.mensaje,
      id_referencia: evento.id_planilla,
      ruta_destino:
        evento.ruta_destino ??
        `/modulos/notas/entrenamiento-fisico/revision?planilla=${evento.id_planilla}`,
      clave_evento: [
        AREA_ENTRENAMIENTO_FISICO,
        evento.id_planilla,
        evento.version_flujo,
        evento.tipo,
        idDestinatario,
      ].join(':'),
    }));
    return this.notificaciones.crearMuchasUnicas(filas, cliente);
  }

  crearEventoResultadoEntrenamientoFisico(
    evento: EventoResultadoEntrenamientoFisico,
    cliente: ClienteNotificacionesNotas,
  ) {
    return this.notificaciones.crearMuchasUnicas(
      [
        {
          id_usuario_destinatario: evento.id_destinatario,
          id_usuario_emisor: evento.id_emisor,
          modulo: ModuloNotificacion.ACADEMICO,
          area: AREA_ENTRENAMIENTO_FISICO,
          tipo: 'NOTAS_FINALES_ENTRENAMIENTO_FISICO',
          titulo: 'Notas finales de Entrenamiento Físico disponibles',
          mensaje: `Curso: ${evento.curso.replaceAll('_', ' ')}. Periodo: ${evento.periodo}/${evento.gestion}.`,
          id_referencia: evento.id_planilla,
          ruta_destino: `/modulos/notas/evaluaciones/consulta?vista=resultados-recibidos&id_gestion=${evento.id_gestion}&id_periodo=${evento.id_periodo}&id_curso=${evento.id_curso}`,
          clave_evento: [
            AREA_ENTRENAMIENTO_FISICO,
            'RESULTADO_FINAL',
            evento.id_planilla,
            evento.version_flujo,
            evento.id_destinatario,
          ].join(':'),
        },
      ],
      cliente,
    );
  }
}
