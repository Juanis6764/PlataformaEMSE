import { Injectable } from '@nestjs/common';
import { ModuloNotificacion, Prisma } from '@prisma/client';
import {
  CrearNotificacionInterna,
  NotificacionesService,
} from '../../notificaciones/notificaciones.service';

type ClienteNotificacionesDocumentales = Pick<
  Prisma.TransactionClient,
  'notificacion' | 'usuario'
>;

export interface EventoDocumental {
  id_documento: number;
  /** Ausente para eventos generados por el sistema (p.ej. el scheduler de plazos), sin un usuario actor. */
  id_emisor?: number;
  destinatarios: number[];
  tipo: string;
  titulo: string;
  mensaje: string;
  /** Hace único al evento dentro del documento (p.ej. `MOV:{id}:ENVIADO`, `OBS:{id}`). */
  clave_sufijo: string;
}

@Injectable()
export class NotificacionesDocumentalesService {
  constructor(private readonly notificaciones: NotificacionesService) {}

  async destinatariosPorSeccion(
    idSeccion: number,
    cliente: ClienteNotificacionesDocumentales,
  ): Promise<number[]> {
    const usuarios = await cliente.usuario.findMany({
      where: { id_seccion: idSeccion, habilitado: true },
      select: { id_usuario: true },
    });
    return usuarios.map((usuario) => usuario.id_usuario);
  }

  crearEvento(
    evento: EventoDocumental,
    cliente: ClienteNotificacionesDocumentales,
  ) {
    const unicos = [...new Set(evento.destinatarios)];
    if (unicos.length === 0) return Promise.resolve({ count: 0 });

    const filas: CrearNotificacionInterna[] = unicos.map(
      (idDestinatario) => ({
        id_usuario_destinatario: idDestinatario,
        id_usuario_emisor: evento.id_emisor,
        modulo: ModuloNotificacion.DOCUMENTAL,
        tipo: evento.tipo,
        titulo: evento.titulo,
        mensaje: evento.mensaje,
        id_referencia: evento.id_documento,
        ruta_destino: `/documentacion/expedientes/${evento.id_documento}`,
        clave_evento: [
          'DOC',
          evento.id_documento,
          evento.clave_sufijo,
          idDestinatario,
        ].join(':'),
      }),
    );
    return this.notificaciones.crearMuchasUnicas(filas, cliente);
  }
}
