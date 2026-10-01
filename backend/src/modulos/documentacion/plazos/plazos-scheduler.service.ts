import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../prisma/prisma.service';
import { NotificacionesDocumentalesService } from '../comun/notificaciones-documentales.service';
import { DocumentacionGateway } from '../tiempo-real/documentacion.gateway';

/**
 * No genera una notificación por minuto ni guarda un contador: solo
 * evalúa periódicamente si un plazo cruzó uno de tres umbrales (24h antes,
 * 1h antes, vencido) y emite el evento correspondiente. La idempotencia
 * NO depende de que este job recuerde qué ya avisó — la garantiza la
 * clave_evento determinística de Notificacion (createMany con
 * skipDuplicates sobre su @@unique): reevaluar el mismo umbral en
 * corridas sucesivas simplemente no vuelve a insertar nada.
 */
@Injectable()
export class PlazosSchedulerService {
  private readonly logger = new Logger(PlazosSchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificacionesDoc: NotificacionesDocumentalesService,
    private readonly gateway: DocumentacionGateway,
  ) {}

  @Cron(CronExpression.EVERY_10_MINUTES)
  async revisarPlazos() {
    const ahora = new Date();
    const en24h = new Date(ahora.getTime() + 24 * 3600 * 1000);
    const en1h = new Date(ahora.getTime() + 3600 * 1000);

    const pendientesEncontrados = await this.prisma.plazoDocumento.findMany({
      where: { fecha_hora_cumplimiento: null, fecha_hora_limite: { gte: ahora } },
      include: {
        proveido: {
          include: {
            hoja_ruta: {
              select: {
                id_documento: true,
                expediente: {
                  select: { id_seccion_actual: true, estado_actual: true },
                },
              },
            },
          },
        },
      },
    });
    const pendientes = pendientesEncontrados.filter((plazo) =>
      this.esPlazoActivo(plazo),
    );

    let avisos24h = 0;
    let avisos1h = 0;
    let notificacionesNuevas = 0;
    for (const plazo of pendientes) {
      const idDocumento = plazo.proveido.hoja_ruta.id_documento;
      if (plazo.fecha_hora_limite <= en1h) {
        notificacionesNuevas += await this.emitir(idDocumento, plazo.id_plazo, plazo.id_seccion_responsable, '1H', 'Falta 1 hora para el vencimiento del plazo documental.');
        avisos1h++;
      } else if (plazo.fecha_hora_limite <= en24h) {
        notificacionesNuevas += await this.emitir(idDocumento, plazo.id_plazo, plazo.id_seccion_responsable, '24H', 'Faltan 24 horas para el vencimiento del plazo documental.');
        avisos24h++;
      }
    }

    const vencidosEncontrados = await this.prisma.plazoDocumento.findMany({
      where: { fecha_hora_cumplimiento: null, fecha_hora_limite: { lt: ahora } },
      include: {
        proveido: {
          include: {
            hoja_ruta: {
              select: {
                id_documento: true,
                expediente: {
                  select: { id_seccion_actual: true, estado_actual: true },
                },
              },
            },
          },
        },
      },
    });
    const vencidos = vencidosEncontrados.filter((plazo) =>
      this.esPlazoActivo(plazo),
    );
    for (const plazo of vencidos) {
      const idDocumento = plazo.proveido.hoja_ruta.id_documento;
      notificacionesNuevas += await this.emitir(idDocumento, plazo.id_plazo, plazo.id_seccion_responsable, 'VENCIDO', 'El plazo documental venció sin cumplimiento registrado.');
    }

    if (avisos24h || avisos1h || vencidos.length) {
      const documentosVencidos = new Set(
        vencidos.map((plazo) => plazo.proveido.hoja_ruta.id_documento),
      ).size;
      this.logger.log(
        `Plazos activos revisados: ${avisos24h} próximo(s) a 24h, ${avisos1h} próximo(s) a 1h, ${vencidos.length} plazo(s) vencido(s) en ${documentosVencidos} documento(s); ${notificacionesNuevas} notificación(es) nueva(s).`,
      );
    }
  }

  private esPlazoActivo(plazo: {
    id_seccion_responsable: number;
    proveido: {
      hoja_ruta: {
        expediente: { id_seccion_actual: number; estado_actual: string };
      };
    };
  }) {
    const expediente = plazo.proveido.hoja_ruta.expediente;
    return (
      expediente.id_seccion_actual === plazo.id_seccion_responsable &&
      !['FINALIZADO', 'ARCHIVADO'].includes(expediente.estado_actual)
    );
  }

  private async emitir(
    idDocumento: number,
    idPlazo: number,
    idSeccionResponsable: number,
    sufijo: '24H' | '1H' | 'VENCIDO',
    mensaje: string,
  ) {
    const destinatarios = await this.notificacionesDoc.destinatariosPorSeccion(
      idSeccionResponsable,
      this.prisma,
    );
    const creadas = await this.notificacionesDoc.crearEvento(
      {
        id_documento: idDocumento,
        destinatarios,
        tipo: `PLAZO_${sufijo}`,
        titulo: 'Plazo documental',
        mensaje,
        clave_sufijo: `PLAZO:${idPlazo}:${sufijo}`,
      },
      this.prisma,
    );
    for (const idDestinatario of destinatarios) {
      this.gateway.emitirAUsuario(idDestinatario, {
        tipo: `PLAZO_${sufijo}`,
        id_documento: idDocumento,
        id_plazo: idPlazo,
      });
    }
    this.gateway.emitirDocumentoActualizado(idDocumento);
    return creadas.count;
  }
}
