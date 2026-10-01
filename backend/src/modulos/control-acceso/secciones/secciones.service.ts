import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CrearSeccionDto, ActualizarSeccionDto } from './dto/seccion.dto';
import { TipoSeccion } from '@prisma/client';

@Injectable()
export class SeccionesService {
  constructor(private prisma: PrismaService) {}

  async listarSecciones(tipo?: TipoSeccion) {
    return this.prisma.seccion.findMany({
      where: {
        estado: true,
        ...(tipo ? { tipo } : {}),
      },
      orderBy: { nivel: 'asc' },
      include: {
        seccion_padre: { select: { nombre: true } },
      },
    });
  }

  async obtenerSeccion(id_seccion: number) {
    const seccion = await this.prisma.seccion.findUnique({
      where: { id_seccion },
      include: {
        seccion_padre: true,
        subsecciones: { where: { estado: true } },
      },
    });

    if (!seccion) {
      throw new NotFoundException('Sección no encontrada');
    }

    return seccion;
  }

  async crearSeccion(dto: CrearSeccionDto) {
    const existe = await this.prisma.seccion.findFirst({
      where: { nombre: dto.nombre, estado: true },
    });

    if (existe) {
      throw new ConflictException(
        'Ya existe una sección activa con ese nombre.',
      );
    }

    if (dto.id_seccion_padre) {
      const padre = await this.prisma.seccion.findUnique({
        where: { id_seccion: dto.id_seccion_padre },
      });
      if (!padre || !padre.estado) {
        throw new BadRequestException(
          'La sección padre asignada no existe o está inactiva.',
        );
      }
    }

    return this.prisma.seccion.create({
      data: {
        nombre: dto.nombre,
        nivel: dto.nivel,
        descripcion: dto.descripcion,
        tipo: dto.tipo,
        id_seccion_padre: dto.id_seccion_padre || null,
      },
    });
  }

  async actualizarSeccion(id_seccion: number, dto: ActualizarSeccionDto) {
    const seccion = await this.obtenerSeccion(id_seccion);

    if (dto.nombre) {
      const existe = await this.prisma.seccion.findFirst({
        where: {
          nombre: dto.nombre,
          estado: true,
          id_seccion: { not: id_seccion },
        },
      });
      if (existe) {
        throw new ConflictException(
          'Ya existe otra sección activa con ese nombre.',
        );
      }
    }

    if (dto.id_seccion_padre) {
      if (dto.id_seccion_padre === id_seccion) {
        throw new BadRequestException(
          'Una sección no puede ser padre de sí misma.',
        );
      }

      // Detección de ciclos recursiva
      let padreIdActual: number | null | undefined = dto.id_seccion_padre;
      while (padreIdActual) {
        const p = await this.prisma.seccion.findUnique({
          where: { id_seccion: padreIdActual },
          select: { id_seccion: true, id_seccion_padre: true },
        });

        if (!p) break;

        if (p.id_seccion_padre === id_seccion) {
          throw new BadRequestException(
            'Ciclo jerárquico detectado: el padre seleccionado depende de esta sección.',
          );
        }

        padreIdActual = p.id_seccion_padre;
      }
    }

    return this.prisma.seccion.update({
      where: { id_seccion },
      data: {
        nombre: dto.nombre,
        nivel: dto.nivel,
        descripcion: dto.descripcion,
        tipo: dto.tipo,
        id_seccion_padre: dto.id_seccion_padre,
      },
    });
  }

  async eliminarSeccion(id_seccion: number) {
    await this.obtenerSeccion(id_seccion);

    // Validar si tiene subsecciones activas vinculadas
    const subseccionesActivas = await this.prisma.seccion.count({
      where: { id_seccion_padre: id_seccion, estado: true },
    });

    if (subseccionesActivas > 0) {
      throw new BadRequestException(
        `No se puede desactivar la sección porque tiene ${subseccionesActivas} subsecciones activas vinculadas.`,
      );
    }

    // Validar si tiene usuarios activos vinculados
    const usuariosActivos = await this.prisma.usuario.count({
      where: { id_seccion, estado: 'ACTIVO' },
    });

    if (usuariosActivos > 0) {
      throw new BadRequestException(
        `No se puede desactivar la sección porque tiene ${usuariosActivos} usuarios activos vinculados.`,
      );
    }

    return this.prisma.seccion.update({
      where: { id_seccion },
      data: { estado: false },
    });
  }

  async listarJerarquia() {
    // Devuelve los nodos raíces (sin padre)
    const raices = await this.prisma.seccion.findMany({
      where: { estado: true, id_seccion_padre: null },
      orderBy: { nivel: 'asc' },
    });

    const construirArbol = async (secciones: any[]): Promise<any[]> => {
      return Promise.all(
        secciones.map(async (sec) => {
          const hijos = await this.prisma.seccion.findMany({
            where: { estado: true, id_seccion_padre: sec.id_seccion },
            orderBy: { nombre: 'asc' },
          });

          return {
            ...sec,
            subsecciones: hijos.length > 0 ? await construirArbol(hijos) : [],
          };
        }),
      );
    };

    return construirArbol(raices);
  }
}
