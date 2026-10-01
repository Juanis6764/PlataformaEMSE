import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '../../../prisma/prisma.service';
import { origenesCors } from '../../../comun/configuracion/cors';
import { ValidacionesDocumentalesService } from '../comun/validaciones-documentales.service';
import { PERMISOS_DOCUMENTOS } from '../comun/constantes-documentales';

interface DatosSocket {
  idUsuario?: number;
}

interface PayloadDocumental {
  sub: number;
  sid: number;
}

/**
 * Entrega en tiempo real de eventos del workflow documental. Cada usuario
 * conectado se une a una sala personal (`usuario:{id}`); los servicios de
 * workflow llaman a `emitirAUsuario` DESPUÉS de que la transacción de
 * Prisma que persiste la notificación ya confirmó — nunca antes. Es
 * aditivo y aislado: no modifica `PresenciaGateway` ni `NotificacionesModule`
 * (que hoy no emite Socket.io para ningún módulo).
 */
@WebSocketGateway({
  namespace: '/documentacion',
  cors: { origin: origenesCors(), credentials: true },
})
export class DocumentacionGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  private servidor!: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly validaciones: ValidacionesDocumentalesService,
  ) {}

  async handleConnection(cliente: Socket) {
    try {
      const token = this.extraerToken(cliente);
      if (!token) return cliente.disconnect(true);

      const payload = await this.jwtService.verifyAsync<PayloadDocumental>(
        token,
        { secret: process.env.JWT_SECRET || 'clave_secreta_emse' },
      );
      const sesion = await this.prisma.sesion.findUnique({
        where: { id_sesion: payload.sid },
        include: { usuario: true },
      });

      if (
        !sesion ||
        !sesion.activa ||
        sesion.fecha_expiracion < new Date() ||
        !sesion.usuario.habilitado ||
        sesion.id_usuario !== payload.sub
      ) {
        return cliente.disconnect(true);
      }

      (cliente.data as DatosSocket).idUsuario = sesion.id_usuario;
      await cliente.join(`usuario:${sesion.id_usuario}`);
    } catch {
      cliente.disconnect(true);
    }
  }

  handleDisconnect() {
    // Socket.io libera automáticamente la membresía de sala al desconectar;
    // no hay estado propio en memoria que limpiar.
  }

  emitirAUsuario(idUsuario: number, evento: Record<string, unknown>) {
    // Defensivo: si el servidor de Socket.io todavía no fue inyectado
    // (arranque muy temprano, o el método se invoca fuera de un proceso
    // Nest con transporte WS real, como scripts internos), no debe romper
    // el flujo del workflow — la notificación ya quedó persistida en BD.
    this.servidor?.to(`usuario:${idUsuario}`).emit('documento:evento', evento);
  }

  /**
   * Aviso liviano para las vistas de consulta. No contiene datos del
   * expediente: cada cliente vuelve a consultar con sus permisos vigentes.
   */
  async emitirDocumentoActualizado(
    idDocumento: number,
    tipoEvento = 'documento_actualizado',
  ) {
    if (!this.servidor) return;
    const usuarios = await this.prisma.usuario.findMany({
      where: { habilitado: true },
      select: { id_usuario: true },
    });
    for (const usuario of usuarios) {
      try {
        const perfil = await this.validaciones.obtenerPerfil(usuario.id_usuario);
        if (!perfil.permisos.has(PERMISOS_DOCUMENTOS.VER)) continue;
        if (
          !(await this.validaciones.puedeConsultarDocumento(
            perfil,
            idDocumento,
          ))
        ) {
          continue;
        }
        this.servidor.to(`usuario:${usuario.id_usuario}`).emit('documento:evento', {
          id_documento: idDocumento,
          tipo_evento: tipoEvento,
        });
      } catch {
        // Un perfil inválido o deshabilitado no debe impedir avisar al resto.
      }
    }
  }

  private extraerToken(cliente: Socket): string | undefined {
    const auth = cliente.handshake.auth as Record<string, unknown>;
    const tokenAuth = auth.token;
    if (typeof tokenAuth === 'string' && tokenAuth.length > 0) return tokenAuth;

    const [tipo, token] = String(
      cliente.handshake.headers.authorization ?? '',
    ).split(' ');
    return tipo === 'Bearer' ? token : undefined;
  }
}
