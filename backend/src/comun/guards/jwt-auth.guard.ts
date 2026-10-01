import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extraerTokenDeCabecera(request);

    if (!token) {
      throw new UnauthorizedException(
        'Acceso no autorizado: Token no proporcionado',
      );
    }

    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET || 'clave_secreta_emse',
      });

      // Validar que la sesión exista y esté activa
      const sesion = await this.prisma.sesion.findUnique({
        where: { id_sesion: payload.sid },
        include: { usuario: true },
      });

      if (!sesion || !sesion.activa || sesion.fecha_expiracion < new Date()) {
        throw new UnauthorizedException('Sesión inactiva o expirada');
      }

      const usuario = sesion.usuario;

      // `estado` representa conexión y se deriva de las sesiones; no es una
      // condición administrativa de acceso.
      if (!usuario.habilitado) {
        throw new UnauthorizedException(
          'Usuario bloqueado. Contacte al administrador.',
        );
      }

      // Adjuntar usuario al request
      request.user = {
        id_usuario: usuario.id_usuario,
        ci: usuario.ci,
        rolId: usuario.id_rol,
        seccionId: usuario.id_seccion,
        primer_inicio: usuario.primer_inicio,
        sid: sesion.id_sesion,
      };

      // Validar restricción de Primer Inicio
      if (usuario.primer_inicio) {
        const rutaActual = request.route.path;
        const listaBlanca = [
          '/autenticacion/me',
          '/autenticacion/cambiar-contrasena',
          '/autenticacion/logout',
          '/autenticacion/refresh',
        ];

        // Normalizar ruta (remover query params)
        const rutaNormalizada = request.path;
        const estaEnListaBlanca = listaBlanca.some((r) =>
          rutaNormalizada.includes(r),
        );

        if (!estaEnListaBlanca) {
          throw new ForbiddenException(
            'Debe cambiar su contraseña obligatoriamente antes de utilizar el sistema',
          );
        }
      }

      return true;
    } catch (error) {
      if (
        error instanceof ForbiddenException ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }
      throw new UnauthorizedException('Acceso no autorizado: Token inválido');
    }
  }

  private extraerTokenDeCabecera(request: any): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
