import { ConflictException, Injectable } from '@nestjs/common';
import {
  EstadoDocumento,
  ExpedienteDocumento,
  Prisma,
  TipoAtencionRequerida,
} from '@prisma/client';
import { AuditoriaService } from '../../auditoria/auditoria.service';
import { MODULO_DOCUMENTOS } from './constantes-documentales';

export interface CambioEstadoDocumental {
  estados_permitidos: EstadoDocumento[];
  id_seccion_actual_esperada: number;
  estado_nuevo: EstadoDocumento;
  /** Omitir para dejar la sección actual sin cambios (p.ej. al enviar, antes de que el destino confirme recepción). */
  id_seccion_actual_nueva?: number;
  id_usuario_responsable_nuevo?: number | null;
  tipo_atencion_requerida?: TipoAtencionRequerida | null;
  id_actor: number;
  id_seccion_actor: number;
  accion: string;
  descripcion: string;
  motivo?: string;
}

/**
 * Ejecutor genérico de una transición de `ExpedienteDocumento`. La guardia
 * de concurrencia real vive en el `updateMany` condicionado (estado +
 * sección esperados) dentro de esta misma transacción — cualquier
 * validación previa en el service que llama a este método es solo
 * fail-fast de UX, no la garantía de concurrencia.
 */
@Injectable()
export class FlujoDocumentalService {
  constructor(private readonly auditoria: AuditoriaService) {}

  async cambiarEstado(
    cliente: Prisma.TransactionClient,
    expediente: ExpedienteDocumento,
    cambio: CambioEstadoDocumental,
  ): Promise<ExpedienteDocumento> {
    const data: Prisma.ExpedienteDocumentoUncheckedUpdateManyInput = {
      estado_actual: cambio.estado_nuevo,
    };
    if (cambio.id_seccion_actual_nueva !== undefined) {
      data.id_seccion_actual = cambio.id_seccion_actual_nueva;
    }
    if (cambio.id_usuario_responsable_nuevo !== undefined) {
      data.id_usuario_responsable_actual = cambio.id_usuario_responsable_nuevo;
    }
    if (cambio.tipo_atencion_requerida !== undefined) {
      data.tipo_atencion_requerida = cambio.tipo_atencion_requerida;
    }

    const actualizado = await cliente.expedienteDocumento.updateMany({
      where: {
        id_documento: expediente.id_documento,
        estado_actual: { in: cambio.estados_permitidos },
        id_seccion_actual: cambio.id_seccion_actual_esperada,
      },
      data,
    });
    if (actualizado.count !== 1) {
      throw new ConflictException(
        'El expediente cambió de estado o de sección. Actualice la información antes de reintentar.',
      );
    }

    const resultado = await cliente.expedienteDocumento.findUniqueOrThrow({
      where: { id_documento: expediente.id_documento },
    });

    await cliente.historialEstadoDocumento.create({
      data: {
        id_documento: expediente.id_documento,
        estado_anterior: expediente.estado_actual,
        estado_nuevo: resultado.estado_actual,
        id_usuario: cambio.id_actor,
        id_seccion: cambio.id_seccion_actor,
        motivo: cambio.motivo,
      },
    });

    await this.auditoria.registrar(
      {
        id_usuario: cambio.id_actor,
        accion: cambio.accion,
        modulo: MODULO_DOCUMENTOS,
        entidad: 'ExpedienteDocumento',
        id_entidad: expediente.id_documento,
        descripcion: cambio.descripcion,
        datos_antes: {
          estado_actual: expediente.estado_actual,
          id_seccion_actual: expediente.id_seccion_actual,
        },
        datos_despues: {
          estado_actual: resultado.estado_actual,
          id_seccion_actual: resultado.id_seccion_actual,
        },
      },
      cliente,
    );

    return resultado;
  }
}
