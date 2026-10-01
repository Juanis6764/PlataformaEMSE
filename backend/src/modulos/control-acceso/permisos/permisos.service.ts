import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CrearPermisoDto, ActualizarPermisoDto } from './dto/permiso.dto';

@Injectable()
export class PermisosService {
  constructor(private prisma: PrismaService) {}

  async listarPermisos() {
    return this.prisma.permiso.findMany({
      where: { estado: true },
      orderBy: { nombre: 'asc' },
    });
  }

  async obtenerPermiso(id_permiso: number) {
    const permiso = await this.prisma.permiso.findUnique({
      where: { id_permiso },
    });

    if (!permiso) {
      throw new NotFoundException('Permiso no encontrado');
    }

    return permiso;
  }

  async crearPermiso(dto: CrearPermisoDto) {
    const existe = await this.prisma.permiso.findUnique({
      where: { nombre: dto.nombre },
    });

    if (existe) {
      throw new ConflictException('Ya existe un permiso con ese nombre');
    }

    return this.prisma.permiso.create({
      data: {
        nombre: dto.nombre,
        modulo: dto.modulo,
        accion: dto.accion,
        descripcion: dto.descripcion,
      },
    });
  }

  async actualizarPermiso(id_permiso: number, dto: ActualizarPermisoDto) {
    await this.obtenerPermiso(id_permiso);

    if (dto.nombre) {
      const existe = await this.prisma.permiso.findFirst({
        where: {
          nombre: dto.nombre,
          id_permiso: { not: id_permiso },
        },
      });
      if (existe) {
        throw new ConflictException('Ya existe otro permiso con ese nombre');
      }
    }

    return this.prisma.permiso.update({
      where: { id_permiso },
      data: {
        nombre: dto.nombre,
        modulo: dto.modulo,
        accion: dto.accion,
        descripcion: dto.descripcion,
      },
    });
  }

  async eliminarPermiso(id_permiso: number) {
    await this.obtenerPermiso(id_permiso);

    return this.prisma.permiso.update({
      where: { id_permiso },
      data: { estado: false },
    });
  }
}
