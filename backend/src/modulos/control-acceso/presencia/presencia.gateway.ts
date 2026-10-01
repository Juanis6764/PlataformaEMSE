import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '../../../prisma/prisma.service';
import { origenesCors } from '../../../comun/configuracion/cors';
import { CambioPresencia, PresenciaService } from './presencia.service';

interface DatosSocket {
  idUsuario?: number;
  puedeConsultarPresencia?: boolean;
}

interface PayloadPresencia {
  sub: number;
  sid: number;
}

@WebSocketGateway({
  namespace: '/presencia',
  cors: { origin: origenesCors(), credentials: true },
})
export class PresenciaGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private static readonly SALA_ADMIN = 'administradores-presencia';

  @WebSocketServer()
  private servidor!: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly presencia: PresenciaService,
  ) {}

  afterInit() {
    this.presencia.eventos.on('cambio', (cambio: CambioPresencia) => {
      this.servidor
        .to(PresenciaGateway.SALA_ADMIN)
        .emit('presencia:estado', cambio);
    });
  }

  async handleConnection(cliente: Socket) {
    try {
      const token = this.extraerToken(cliente);
      if (!token) return cliente.disconnect(true);

      const payload = await this.jwtService.verifyAsync<PayloadPresencia>(
        token,
        {
          secret: process.env.JWT_SECRET || 'clave_secreta_emse',
        },
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

      const datos = cliente.data as DatosSocket;
      datos.idUsuario = sesion.id_usuario;
      datos.puedeConsultarPresencia = await this.puedeListarUsuarios(
        sesion.id_usuario,
        sesion.usuario.id_rol,
      );
      if (datos.puedeConsultarPresencia) {
        await cliente.join(PresenciaGateway.SALA_ADMIN);
      }
      this.presencia.registrarConexion(sesion.id_usuario, cliente.id);
    } catch {
      cliente.disconnect(true);
    }
  }

  handleDisconnect(cliente: Socket) {
    const idUsuario = (cliente.data as DatosSocket).idUsuario;
    if (idUsuario) this.presencia.eliminarConexion(idUsuario, cliente.id);
  }

  @SubscribeMessage('presencia:latido')
  registrarLatido(cliente: Socket) {
    const idUsuario = (cliente.data as DatosSocket).idUsuario;
    if (idUsuario) {
      this.presencia.registrarLatido(idUsuario, cliente.id);
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

  private async puedeListarUsuarios(idUsuario: number, idRol: number) {
    const [permisosRol, permisosIndividuales] = await Promise.all([
      this.prisma.rolPermiso.findMany({
        where: { id_rol: idRol, permiso: { estado: true } },
        include: { permiso: true },
      }),
      this.prisma.usuarioPermiso.findMany({
        where: { id_usuario: idUsuario, permiso: { estado: true } },
        include: { permiso: true },
      }),
    ]);
    const permisos = new Set(permisosRol.map(({ permiso }) => permiso.nombre));
    for (const override of permisosIndividuales) {
      if (override.concedido) permisos.add(override.permiso.nombre);
      else permisos.delete(override.permiso.nombre);
    }
    return permisos.has('LISTAR_USUARIOS');
  }
}
