import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  CrearRolDto,
  ActualizarRolDto,
  AsignarPermisosDto,
} from './dto/rol.dto';

@Injectable()
export class RolesService {
  constructor(private prisma: PrismaService) {}

  async listarRoles() {
    return this.prisma.rol.findMany({
      where: { estado: true },
      include: {
        permisos: {
          include: {
            permiso: true,
          },
        },
      },
      orderBy: { id_rol: 'asc' },
    });
  }

  async obtenerRol(id_rol: number) {
    const rol = await this.prisma.rol.findUnique({
      where: { id_rol },
      include: {
        permisos: {
          include: {
            permiso: true,
          },
        },
      },
    });

    if (!rol) {
      throw new NotFoundException('Rol no encontrado');
    }

    return rol;
  }

  async crearRol(dto: CrearRolDto) {
    const existe = await this.prisma.rol.findUnique({
      where: { nombre: dto.nombre },
    });

    if (existe) {
      throw new ConflictException('Ya existe un rol con ese nombre');
    }

    return this.prisma.rol.create({
      data: {
        nombre: dto.nombre,
        descripcion: dto.descripcion,
      },
    });
  }

  async actualizarRol(id_rol: number, dto: ActualizarRolDto) {
    const rol = await this.obtenerRol(id_rol);

    if (rol.nombre === 'ADMINISTRADOR') {
      throw new BadRequestException(
        'No está permitido modificar el rol de administración del sistema (ADMINISTRADOR).',
      );
    }

    if (dto.nombre) {
      const existe = await this.prisma.rol.findFirst({
        where: {
          nombre: dto.nombre,
          id_rol: { not: id_rol },
        },
      });
      if (existe) {
        throw new ConflictException('Ya existe otro rol con ese nombre');
      }
    }

    return this.prisma.rol.update({
      where: { id_rol },
      data: {
        nombre: dto.nombre,
        descripcion: dto.descripcion,
      },
    });
  }

  async eliminarRol(id_rol: number) {
    const rol = await this.obtenerRol(id_rol);

    if (rol.nombre === 'ADMINISTRADOR') {
      throw new BadRequestException(
        'No está permitido eliminar ni desactivar el rol de administración del sistema (ADMINISTRADOR).',
      );
    }

    // Verificar si hay usuarios vinculados a este rol
    const usuariosAsociados = await this.prisma.usuario.count({
      where: { id_rol, estado: 'ACTIVO' },
    });

    if (usuariosAsociados > 0) {
      throw new BadRequestException(
        `No se puede desactivar el rol porque existen ${usuariosAsociados} usuarios activos asociados a él.`,
      );
    }

    return this.prisma.rol.update({
      where: { id_rol },
      data: { estado: false },
    });
  }

  async asignarPermisos(id_rol: number, dto: AsignarPermisosDto) {
    const rol = await this.obtenerRol(id_rol);

    // Si es ADMINISTRADOR, verificar que no se le quiten permisos críticos
    if (rol.nombre === 'ADMINISTRADOR') {
      const tieneAdminTotal = dto.permisosIds.length > 0;
      if (!tieneAdminTotal) {
        throw new BadRequestException(
          'No se permite dejar al rol ADMINISTRADOR sin permisos.',
        );
      }
    }

    // Verificar que todos los permisosIds existan
    const conteoPermisosValidos = await this.prisma.permiso.count({
      where: {
        id_permiso: { in: dto.permisosIds },
        estado: true,
      },
    });

    if (conteoPermisosValidos !== dto.permisosIds.length) {
      throw new BadRequestException(
        'Uno o más permisos proporcionados no existen o están inactivos.',
      );
    }

    // Actualizar relaciones en transacción
    await this.prisma.$transaction(async (tx) => {
      // Eliminar relaciones previas
      await tx.rolPermiso.deleteMany({
        where: { id_rol },
      });

      // Crear las nuevas relaciones evitando duplicidad
      const nuevasRelaciones = Array.from(new Set(dto.permisosIds)).map(
        (id_permiso) => ({
          id_rol,
          id_permiso,
        }),
      );

      await tx.rolPermiso.createMany({
        data: nuevasRelaciones,
      });
    });

    return { mensaje: 'Permisos asignados al rol exitosamente.' };
  }
}
