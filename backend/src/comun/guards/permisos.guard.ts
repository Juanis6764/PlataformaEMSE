import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { PERMISOS_KEY } from '../decorators/permisos.decorator';

@Injectable()
export class PermisosGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const permisosRequeridos = this.reflector.getAllAndOverride<string[]>(
      PERMISOS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!permisosRequeridos || permisosRequeridos.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user)
      throw new ForbiddenException('Usuario autenticado no disponible');

    // Consulta los permisos activos asignados al rol del usuario en tiempo real
    const rolPermisos = await this.prisma.rolPermiso.findMany({
      where: {
        id_rol: user.rolId,
        permiso: { estado: true },
      },
      include: {
        permiso: true,
      },
    });

    const individuales = await this.prisma.usuarioPermiso.findMany({
      where: { id_usuario: user.id_usuario, permiso: { estado: true } },
      include: { permiso: true },
    });
    const permisosUsuario = new Set(rolPermisos.map((rp) => rp.permiso.nombre));
    for (const override of individuales) {
      if (override.concedido) permisosUsuario.add(override.permiso.nombre);
      else permisosUsuario.delete(override.permiso.nombre);
    }

    // Verificar si tiene al menos uno de los permisos requeridos
    const autorizado = permisosRequeridos.some((permiso) =>
      permisosUsuario.has(permiso),
    );
    if (!autorizado) {
      throw new ForbiddenException(
        `Permiso requerido: ${permisosRequeridos.join(' o ')}`,
      );
    }
    return true;
  }
}
