import { ConflictException, Injectable } from '@nestjs/common';
import {
  EstadoSemanaDisciplina,
  NivelRevisionNota,
  MateriaEvaluacion,
  PlanillaEntrenamientoFisico,
  Prisma,
  SemanaDisciplina,
} from '@prisma/client';
import { AuditoriaService } from '../../auditoria/auditoria.service';
import { NotificacionesNotasService } from './notificaciones-notas.service';

export interface EjecutarTransicionDisciplina {
  estados_permitidos: EstadoSemanaDisciplina[];
  nivel_esperado: NivelRevisionNota | null;
  estado_nuevo: EstadoSemanaDisciplina;
  nivel_nuevo: NivelRevisionNota | null;
  id_actor: number;
  accion: string;
  descripcion: string;
  comentario?: string;
  destinatarios: number[];
  tipo_notificacion: string;
  titulo_notificacion: string;
  mensaje_notificacion: string;
  ruta_notificacion?: string;
  fecha: 'ENVIO' | 'REVISION' | 'PUBLICACION';
}

@Injectable()
export class FlujoNotasService {
  constructor(
    private readonly auditoria: AuditoriaService,
    private readonly notificaciones: NotificacionesNotasService,
  ) {}

  async ejecutar(
    cliente: Prisma.TransactionClient,
    semana: SemanaDisciplina,
    transicion: EjecutarTransicionDisciplina,
  ) {
    const ahora = new Date();
    const fechas: Prisma.SemanaDisciplinaUpdateManyMutationInput = {};
    if (transicion.fecha === 'ENVIO') fechas.fecha_envio = ahora;
    if (transicion.fecha === 'REVISION') fechas.fecha_revision = ahora;
    if (transicion.fecha === 'PUBLICACION') fechas.fecha_publicacion = ahora;

    const actualizada = await cliente.semanaDisciplina.updateMany({
      where: {
        id_semana: semana.id_semana,
        estado: { in: transicion.estados_permitidos },
        nivel_revision_actual: transicion.nivel_esperado,
        version_flujo: semana.version_flujo,
      },
      data: {
        estado: transicion.estado_nuevo,
        nivel_revision_actual: transicion.nivel_nuevo,
        id_ultimo_responsable: transicion.id_actor,
        version_flujo: { increment: 1 },
        ...fechas,
      },
    });
    if (actualizada.count !== 1) {
      throw new ConflictException(
        'La semana cambió de estado. Actualice la información antes de reintentar.',
      );
    }

    const resultado = await cliente.semanaDisciplina.findUniqueOrThrow({
      where: { id_semana: semana.id_semana },
    });
    const antes: Prisma.InputJsonObject = {
      estado: semana.estado,
      nivel_revision_actual: semana.nivel_revision_actual,
      version_flujo: semana.version_flujo,
    };
    const despues: Record<string, Prisma.InputJsonValue | null> = {
      estado: resultado.estado,
      nivel_revision_actual: resultado.nivel_revision_actual,
      version_flujo: resultado.version_flujo,
    };
    if (transicion.comentario) despues.comentario = transicion.comentario;

    await this.auditoria.registrar(
      {
        id_usuario: transicion.id_actor,
        accion: transicion.accion,
        modulo: 'NOTAS_DISCIPLINA',
        entidad: 'SemanaDisciplina',
        id_entidad: semana.id_semana,
        descripcion: transicion.descripcion,
        datos_antes: antes,
        datos_despues: despues,
      },
      cliente,
    );
    await this.notificaciones.crearEvento(
      {
        id_semana: resultado.id_semana,
        version_flujo: resultado.version_flujo,
        id_emisor: transicion.id_actor,
        destinatarios: transicion.destinatarios,
        tipo: transicion.tipo_notificacion,
        titulo: transicion.titulo_notificacion,
        mensaje: transicion.mensaje_notificacion,
      },
      cliente,
    );
    return resultado;
  }

  async ejecutarEvaluacion(
    cliente: Prisma.TransactionClient,
    materia: MateriaEvaluacion,
    transicion: EjecutarTransicionDisciplina,
  ) {
    const ahora = new Date();
    const fechas: Prisma.MateriaEvaluacionUpdateManyMutationInput = {};
    if (transicion.fecha === 'ENVIO') fechas.fecha_envio = ahora;
    if (transicion.fecha === 'REVISION') fechas.fecha_revision = ahora;
    if (transicion.fecha === 'PUBLICACION') fechas.fecha_publicacion = ahora;

    const actualizada = await cliente.materiaEvaluacion.updateMany({
      where: {
        id_materia: materia.id_materia,
        estado: { in: transicion.estados_permitidos },
        nivel_revision_actual: transicion.nivel_esperado,
        version_flujo: materia.version_flujo,
      },
      data: {
        estado: transicion.estado_nuevo,
        nivel_revision_actual: transicion.nivel_nuevo,
        id_ultimo_responsable: transicion.id_actor,
        version_flujo: { increment: 1 },
        ...fechas,
      },
    });
    if (actualizada.count !== 1) {
      throw new ConflictException(
        'La materia cambió de estado. Actualice la información antes de reintentar.',
      );
    }

    const resultado = await cliente.materiaEvaluacion.findUniqueOrThrow({
      where: { id_materia: materia.id_materia },
    });
    const antes: Prisma.InputJsonObject = {
      estado: materia.estado,
      nivel_revision_actual: materia.nivel_revision_actual,
      version_flujo: materia.version_flujo,
    };
    const despues: Record<string, Prisma.InputJsonValue | null> = {
      estado: resultado.estado,
      nivel_revision_actual: resultado.nivel_revision_actual,
      version_flujo: resultado.version_flujo,
    };
    if (transicion.comentario) despues.comentario = transicion.comentario;

    await this.auditoria.registrar(
      {
        id_usuario: transicion.id_actor,
        accion: transicion.accion,
        modulo: 'NOTAS_EVALUACIONES',
        entidad: 'MateriaEvaluacion',
        id_entidad: materia.id_materia,
        descripcion: transicion.descripcion,
        datos_antes: antes,
        datos_despues: despues,
      },
      cliente,
    );
    await this.notificaciones.crearEventoEvaluaciones(
      {
        id_materia: resultado.id_materia,
        version_flujo: resultado.version_flujo,
        id_emisor: transicion.id_actor,
        destinatarios: transicion.destinatarios,
        tipo: transicion.tipo_notificacion,
        titulo: transicion.titulo_notificacion,
        mensaje: transicion.mensaje_notificacion,
      },
      cliente,
    );
    return resultado;
  }

  async ejecutarEntrenamientoFisico(
    cliente: Prisma.TransactionClient,
    planilla: PlanillaEntrenamientoFisico,
    transicion: EjecutarTransicionDisciplina,
  ) {
    const ahora = new Date();
    const fechas: Prisma.PlanillaEntrenamientoFisicoUpdateManyMutationInput =
      {};
    if (transicion.fecha === 'ENVIO') fechas.fecha_envio = ahora;
    if (transicion.fecha === 'REVISION') fechas.fecha_revision = ahora;

    const actualizada = await cliente.planillaEntrenamientoFisico.updateMany({
      where: {
        id_planilla: planilla.id_planilla,
        estado: { in: transicion.estados_permitidos },
        nivel_revision_actual: transicion.nivel_esperado,
        version_flujo: planilla.version_flujo,
      },
      data: {
        estado: transicion.estado_nuevo,
        nivel_revision_actual: transicion.nivel_nuevo,
        id_ultimo_responsable: transicion.id_actor,
        version_flujo: { increment: 1 },
        ...fechas,
      },
    });
    if (actualizada.count !== 1) {
      throw new ConflictException(
        'La planilla cambió de estado. Actualice la información antes de reintentar.',
      );
    }

    const resultado =
      await cliente.planillaEntrenamientoFisico.findUniqueOrThrow({
        where: { id_planilla: planilla.id_planilla },
      });
    const antes: Prisma.InputJsonObject = {
      estado: planilla.estado,
      nivel_revision_actual: planilla.nivel_revision_actual,
      version_flujo: planilla.version_flujo,
    };
    const despues: Record<string, Prisma.InputJsonValue | null> = {
      estado: resultado.estado,
      nivel_revision_actual: resultado.nivel_revision_actual,
      version_flujo: resultado.version_flujo,
    };
    if (transicion.comentario) despues.comentario = transicion.comentario;

    await this.auditoria.registrar(
      {
        id_usuario: transicion.id_actor,
        accion: transicion.accion,
        modulo: 'NOTAS_ENTRENAMIENTO_FISICO',
        entidad: 'PlanillaEntrenamientoFisico',
        id_entidad: planilla.id_planilla,
        descripcion: transicion.descripcion,
        datos_antes: antes,
        datos_despues: despues,
      },
      cliente,
    );
    await this.notificaciones.crearEventoEntrenamientoFisico(
      {
        id_planilla: resultado.id_planilla,
        version_flujo: resultado.version_flujo,
        id_emisor: transicion.id_actor,
        destinatarios: transicion.destinatarios,
        tipo: transicion.tipo_notificacion,
        titulo: transicion.titulo_notificacion,
        mensaje: transicion.mensaje_notificacion,
        ruta_destino: transicion.ruta_notificacion,
      },
      cliente,
    );
    return resultado;
  }
}
