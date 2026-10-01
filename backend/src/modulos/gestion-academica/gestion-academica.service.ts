import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PeriodoAcademico } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  ActualizarGestionAcademicaDto,
  CrearGestionAcademicaDto,
} from './dto/gestion-academica.dto';
import { calcularSemestreAcademico } from '../../comun/utilidades/semestre-academico';

@Injectable()
/** Administra gestiones y periodos académicos (I/2026, II/2026...) — exclusivo del Administrador. */
export class GestionAcademicaService {
  constructor(private readonly prisma: PrismaService) {}

  /** Único punto de cálculo del semestre: año cursado (orden 1-3) + periodo activo (I/II). */
  calcularSemestre(ordenCurso: number, periodo: PeriodoAcademico) {
    return calcularSemestreAcademico(ordenCurso, periodo);
  }

  listarGestiones() {
    return this.prisma.gestionAcademica.findMany({
      include: { periodos_lectivos: { orderBy: { periodo: 'asc' } } },
      orderBy: { ano: 'desc' },
    });
  }

  /** Crea la gestión y, en la misma transacción, sus dos periodos (I y II): nunca quedan a medias. */
  async crearGestion(idUsuario: number, dto: CrearGestionAcademicaDto) {
    const existente = await this.prisma.gestionAcademica.findUnique({
      where: { ano: dto.ano },
    });
    if (existente)
      throw new BadRequestException(`La gestión ${dto.ano} ya existe.`);
    return this.prisma.$transaction(async (tx) => {
      const gestion = await tx.gestionAcademica.create({
        data: { ano: dto.ano, estado: 'PLANIFICACION' },
      });
      await tx.periodoLectivo.createMany({
        data: (['I', 'II'] as const).map((periodo) => ({
          id_gestion: gestion.id_gestion,
          periodo,
          id_creador: idUsuario,
        })),
      });
      return tx.gestionAcademica.findUnique({
        where: { id_gestion: gestion.id_gestion },
        include: { periodos_lectivos: { orderBy: { periodo: 'asc' } } },
      });
    });
  }

  async actualizarEstadoGestion(
    id: number,
    dto: ActualizarGestionAcademicaDto,
  ) {
    const gestion = await this.prisma.gestionAcademica.findUnique({
      where: { id_gestion: id },
    });
    if (!gestion) throw new NotFoundException('Gestión no encontrada.');
    return this.prisma.gestionAcademica.update({
      where: { id_gestion: id },
      data: { estado: dto.estado },
    });
  }

  /** Activa un periodo y desactiva cualquier otro: sólo uno vigente a la vez en todo el sistema. */
  async activarPeriodo(idPeriodo: number) {
    const periodo = await this.prisma.periodoLectivo.findUnique({
      where: { id_periodo: idPeriodo },
    });
    if (!periodo) throw new NotFoundException('Periodo no encontrado.');
    return this.prisma.$transaction(async (tx) => {
      await tx.periodoLectivo.updateMany({
        where: { activo: true },
        data: { activo: false },
      });
      return tx.periodoLectivo.update({
        where: { id_periodo: idPeriodo },
        data: { activo: true },
        include: { gestion: true },
      });
    });
  }

  obtenerPeriodoActivo() {
    return this.prisma.periodoLectivo.findFirst({
      where: { activo: true },
      include: { gestion: true },
    });
  }
}
