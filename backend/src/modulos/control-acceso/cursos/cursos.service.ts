import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CrearCursoDto, ActualizarCursoDto } from './dto/curso.dto';

@Injectable()
export class CursosService {
  private readonly cursosOficiales = [
    'Primer Año',
    'Segundo Año',
    'Tercer Año',
    'Egresado',
  ];

  constructor(private prisma: PrismaService) {}

  async listarCursos() {
    return this.prisma.curso.findMany({
      include: {
        _count: { select: { cadetes: true } },
      },
      orderBy: [{ orden: 'asc' }, { id_curso: 'asc' }],
    });
  }

  async obtenerCurso(id_curso: number) {
    const curso = await this.prisma.curso.findUnique({
      where: { id_curso },
      include: {
        _count: {
          select: {
            cadetes: true,
            asignaciones_academicas: true,
          },
        },
      },
    });

    if (!curso) {
      throw new NotFoundException('Curso no encontrado');
    }

    return curso;
  }

  async crearCurso(dto: CrearCursoDto) {
    const existe = await this.prisma.curso.findUnique({
      where: { nombre: dto.nombre },
    });

    if (existe) {
      throw new ConflictException(
        'Ya existe un curso registrado con ese nombre',
      );
    }

    return this.prisma.curso.create({
      data: {
        nombre: dto.nombre,
        orden: dto.orden,
      },
    });
  }

  async actualizarCurso(id_curso: number, dto: ActualizarCursoDto) {
    const curso = await this.obtenerCurso(id_curso);

    // Proteger cursos oficiales
    if (this.cursosOficiales.includes(curso.nombre) || id_curso <= 4) {
      throw new BadRequestException(
        'No está permitido modificar los cursos oficiales del sistema.',
      );
    }

    if (dto.nombre) {
      const existe = await this.prisma.curso.findFirst({
        where: {
          nombre: dto.nombre,
          id_curso: { not: id_curso },
        },
      });
      if (existe) {
        throw new ConflictException(
          'Ya existe otro curso registrado con ese nombre',
        );
      }
    }

    return this.prisma.curso.update({
      where: { id_curso },
      data: {
        nombre: dto.nombre,
        orden: dto.orden,
      },
    });
  }

  async eliminarCurso(id_curso: number) {
    const curso = await this.obtenerCurso(id_curso);

    // Proteger cursos oficiales
    if (this.cursosOficiales.includes(curso.nombre) || id_curso <= 4) {
      throw new BadRequestException(
        'No está permitido eliminar los cursos oficiales del sistema.',
      );
    }

    // Validar cadetes vinculados
    if (curso._count.cadetes > 0) {
      throw new BadRequestException(
        `No se puede eliminar el curso porque tiene ${curso._count.cadetes} cadetes asociados.`,
      );
    }

    // Validar asignaciones vinculadas
    if (curso._count.asignaciones_academicas > 0) {
      throw new BadRequestException(
        `No se puede eliminar el curso porque tiene ${curso._count.asignaciones_academicas} asignaciones académicas vinculadas.`,
      );
    }

    return this.prisma.curso.delete({
      where: { id_curso },
    });
  }
}
