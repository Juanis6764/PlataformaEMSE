import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CrearAsignacionDto,
  FiltrarAsignacionesDto,
} from './dto/asignacion.dto';

@Injectable()
export class AsignacionesAcademicasService {
  constructor(private prisma: PrismaService) {}

  async listarAsignaciones(filtros: FiltrarAsignacionesDto) {
    const asignaciones = await this.prisma.asignacionAcademica.findMany({
      where: {
        id_usuario: filtros.id_usuario,
        id_seccion: filtros.id_seccion,
        id_curso: filtros.id_curso,
        activo: filtros.solo_activas === false ? undefined : true,
      },
      include: {
        usuario: {
          select: {
            id_usuario: true,
            nombres: true,
            apellidos: true,
            ci: true,
            habilitado: true,
            sesiones: {
              where: { activa: true, fecha_expiracion: { gt: new Date() } },
              select: { id_sesion: true },
            },
          },
        },
        seccion: true,
        curso: true,
      },
      orderBy: { fecha_asignacion: 'desc' },
    });
    return asignaciones.map((asignacion) => ({
      ...asignacion,
      usuario: {
        ...asignacion.usuario,
        estado_conexion: asignacion.usuario.sesiones.length
          ? 'EN_LINEA'
          : 'DESCONECTADO',
        sesiones: undefined,
      },
    }));
  }

  async obtenerAsignacion(id_asignacion: number) {
    const asignacion = await this.prisma.asignacionAcademica.findUnique({
      where: { id_asignacion },
      include: { usuario: true, seccion: true, curso: true },
    });
    if (!asignacion)
      throw new NotFoundException('Asignación académica no encontrada');
    return asignacion;
  }

  async crearAsignacion(dto: CrearAsignacionDto) {
    const [usuario, seccion, curso] = await Promise.all([
      this.prisma.usuario.findUnique({ where: { id_usuario: dto.id_usuario } }),
      this.prisma.seccion.findUnique({ where: { id_seccion: dto.id_seccion } }),
      dto.id_curso
        ? this.prisma.curso.findUnique({ where: { id_curso: dto.id_curso } })
        : null,
    ]);
    if (!usuario?.habilitado)
      throw new BadRequestException('Usuario inexistente o suspendido.');
    if (!seccion?.estado || seccion.tipo !== 'ACADEMICA')
      throw new BadRequestException('Subsección académica inválida.');
    if (dto.id_curso && !curso)
      throw new BadRequestException('Curso inexistente.');
    if (dto.tipo === 'OPERADOR' && !dto.id_curso)
      throw new BadRequestException('Un operador requiere curso.');
    if (dto.tipo === 'RESPONSABLE' && dto.id_curso)
      throw new BadRequestException('Un responsable no recibe curso.');

    const ocupada = await this.prisma.asignacionAcademica.findFirst({
      where: {
        id_seccion: dto.id_seccion,
        id_curso: dto.id_curso ?? null,
        tipo: dto.tipo,
        activo: true,
      },
    });
    if (ocupada)
      throw new BadRequestException(
        'La responsabilidad de esta subsección y curso ya está asignada.',
      );

    return this.prisma.asignacionAcademica.create({
      data: { ...dto, id_curso: dto.id_curso ?? null },
      include: { usuario: true, seccion: true, curso: true },
    });
  }

  async revocarAsignacion(id_asignacion: number) {
    const actual = await this.obtenerAsignacion(id_asignacion);
    if (!actual.activo)
      throw new BadRequestException('La asignación ya está inactiva.');
    return this.prisma.asignacionAcademica.update({
      where: { id_asignacion },
      data: { activo: false, fecha_fin: new Date() },
    });
  }

  listarAsignacionesPorUsuario(id_usuario: number) {
    return this.prisma.asignacionAcademica.findMany({
      where: { id_usuario, activo: true },
      include: { seccion: true, curso: true },
    });
  }
}
