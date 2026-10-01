import { Injectable, NotFoundException } from '@nestjs/common';
import { ModuloNotificacion, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { FiltrarNotificacionesDto } from './dto/notificaciones.dto';

export interface CrearNotificacionInterna {
  id_usuario_destinatario: number;
  id_usuario_emisor?: number;
  modulo: ModuloNotificacion;
  area?: string | null;
  tipo: string;
  titulo: string;
  mensaje: string;
  id_referencia?: number | null;
  ruta_destino?: string | null;
  clave_evento: string;
}

type ClienteNotificacion = Pick<Prisma.TransactionClient, 'notificacion'>;

@Injectable()
export class NotificacionesService {
  constructor(private readonly prisma: PrismaService) {}

  async crearUnica(
    dto: CrearNotificacionInterna,
    cliente: ClienteNotificacion = this.prisma,
  ) {
    if (dto.id_usuario_emisor === dto.id_usuario_destinatario) return null;

    return cliente.notificacion.upsert({
      where: { clave_evento: dto.clave_evento.trim() },
      update: {},
      create: this.prepararDatos(dto),
    });
  }

  async crearMuchasUnicas(
    notificaciones: CrearNotificacionInterna[],
    cliente: ClienteNotificacion = this.prisma,
  ) {
    const unicas = new Map<string, Prisma.NotificacionCreateManyInput>();
    for (const notificacion of notificaciones) {
      if (
        notificacion.id_usuario_emisor === notificacion.id_usuario_destinatario
      ) {
        continue;
      }
      const datos = this.prepararDatos(notificacion);
      unicas.set(datos.clave_evento, datos);
    }

    if (unicas.size === 0) return { count: 0 };
    return cliente.notificacion.createMany({
      data: [...unicas.values()],
      skipDuplicates: true,
    });
  }

  async listar(idUsuario: number, filtros: FiltrarNotificacionesDto) {
    const pagina = filtros.pagina ?? 1;
    const limite = filtros.limite ?? 20;
    const where: Prisma.NotificacionWhereInput = {
      id_usuario_destinatario: idUsuario,
      leida: filtros.leida,
      modulo: filtros.modulo,
      area: filtros.area?.trim().toUpperCase(),
      tipo: filtros.tipo?.trim().toUpperCase(),
    };

    const [total, data] = await this.prisma.$transaction([
      this.prisma.notificacion.count({ where }),
      this.prisma.notificacion.findMany({
        where,
        skip: (pagina - 1) * limite,
        take: limite,
        orderBy: [{ fecha_creacion: 'desc' }, { id_notificacion: 'desc' }],
      }),
    ]);

    return {
      data,
      meta: {
        total,
        pagina,
        limite,
        paginas_totales: Math.ceil(total / limite),
      },
    };
  }

  contarNoLeidas(idUsuario: number) {
    return this.prisma.notificacion.count({
      where: { id_usuario_destinatario: idUsuario, leida: false },
    });
  }

  async marcarLeida(idUsuario: number, idNotificacion: number) {
    const actualizada = await this.prisma.notificacion.updateMany({
      where: {
        id_notificacion: idNotificacion,
        id_usuario_destinatario: idUsuario,
        leida: false,
      },
      data: { leida: true, fecha_lectura: new Date() },
    });

    if (actualizada.count === 0) {
      const propia = await this.prisma.notificacion.findFirst({
        where: {
          id_notificacion: idNotificacion,
          id_usuario_destinatario: idUsuario,
        },
      });
      if (!propia) throw new NotFoundException('Notificación no encontrada.');
      return propia;
    }

    return this.prisma.notificacion.findUnique({
      where: { id_notificacion: idNotificacion },
    });
  }

  async marcarTodasLeidas(idUsuario: number) {
    return this.prisma.notificacion.updateMany({
      where: { id_usuario_destinatario: idUsuario, leida: false },
      data: { leida: true, fecha_lectura: new Date() },
    });
  }

  private prepararDatos(
    dto: CrearNotificacionInterna,
  ): Prisma.NotificacionCreateManyInput {
    return {
      id_usuario_destinatario: dto.id_usuario_destinatario,
      modulo: dto.modulo,
      area: dto.area?.trim().toUpperCase() || null,
      tipo: dto.tipo.trim().toUpperCase(),
      titulo: dto.titulo.trim(),
      mensaje: dto.mensaje.trim(),
      id_referencia: dto.id_referencia ?? null,
      ruta_destino: dto.ruta_destino?.trim() || null,
      clave_evento: dto.clave_evento.trim(),
    };
  }
}
