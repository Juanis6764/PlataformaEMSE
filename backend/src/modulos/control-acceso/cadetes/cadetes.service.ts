import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { PresenciaService } from '../presencia/presencia.service';
import { FiltrarCadetesDto } from './dto/cadetes-filtros.dto';
import {
  ActualizarCadeteDto,
  CambiarCursoDto,
} from './dto/cadetes-operaciones.dto';
import {
  CrearCadeteDto,
  EgresarCadeteDto,
} from './dto/cadetes-operaciones.dto';
import * as bcrypt from 'bcrypt';
import { Prisma } from '@prisma/client';
import { calcularSemestreAcademico } from '../../../comun/utilidades/semestre-academico';

const historialCursoConPeriodo =
  Prisma.validator<Prisma.HistorialCursoCadeteDefaultArgs>()({
    include: {
      curso: true,
      periodoLectivo: { include: { gestion: true } },
    },
  });

type HistorialCursoConPeriodo = Prisma.HistorialCursoCadeteGetPayload<
  typeof historialCursoConPeriodo
>;

@Injectable()
export class CadetesService {
  constructor(
    private prisma: PrismaService,
    private readonly presencia: PresenciaService,
  ) {}

  private presentarHistorial(historial: HistorialCursoConPeriodo[]) {
    return historial.map((registro) => ({
      ...registro,
      semestre: calcularSemestreAcademico(
        registro.curso.orden,
        registro.periodoLectivo.periodo,
      ),
    }));
  }

  async crearCadete(dto: CrearCadeteDto) {
    const curso = await this.prisma.curso.findUnique({
      where: { id_curso: dto.id_curso },
    });
    if (!curso)
      throw new BadRequestException('El curso seleccionado no existe');
    const esPrimerAno = curso.orden === 1;
    if (!esPrimerAno && !dto.arma?.trim()) {
      throw new BadRequestException(
        'El arma es obligatoria para Segundo y Tercer Año',
      );
    }
    const rolCadete = await this.prisma.rol.findUnique({
      where: { nombre: 'CADETE' },
    });
    if (!rolCadete) throw new BadRequestException('No existe el rol CADETE');
    const existe = await this.prisma.usuario.findUnique({
      where: { ci: dto.ci },
    });
    if (existe)
      throw new BadRequestException('Ya existe un usuario con ese CI');
    const temporal =
      dto.contrasena ?? process.env.CADETE_PASSWORD_TEMPORAL ?? '123456';
    const hash = await bcrypt.hash(temporal, 10);

    return this.prisma.$transaction(async (tx) => {
      const usuario = await tx.usuario.create({
        data: {
          nombres: dto.nombres.trim(),
          apellidos: dto.apellidos.trim(),
          ci: dto.ci.trim(),
          correo: dto.correo.trim(),
          contrasena: hash,
          estado: 'INACTIVO',
          primer_inicio: true,
          id_rol: rolCadete.id_rol,
        },
      });
      const cadete = await tx.cadete.create({
        data: {
          id_usuario: usuario.id_usuario,
          id_curso: dto.id_curso,
          gestion_ingreso: dto.gestion_ingreso,
          arma: esPrimerAno ? null : dto.arma!.trim(),
          estado_cadete: dto.estado_cadete,
        },
      });
      return tx.cadete.findUnique({
        where: { id_cadete: cadete.id_cadete },
        include: { usuario: true, curso: true },
      });
    });
  }

  /**
   * Listado paginado con filtros y búsqueda split
   */
  async listarCadetes(filtros: FiltrarCadetesDto) {
    const {
      pagina = 1,
      limite = 20,
      buscar,
      id_curso,
      estado_cadete,
      arma,
      gestion_ingreso,
    } = filtros;
    const skip = (pagina - 1) * limite;

    // Filtros en la tabla Cadete
    const whereCadete: any = {};
    if (id_curso) whereCadete.id_curso = id_curso;
    if (estado_cadete) whereCadete.estado_cadete = estado_cadete;
    if (arma) whereCadete.arma = { contains: arma, mode: 'insensitive' };
    if (gestion_ingreso) whereCadete.gestion_ingreso = gestion_ingreso;

    // Split search sobre el usuario relacionado
    if (buscar && buscar.trim().length > 0) {
      const terminos = buscar.trim().split(/\s+/);
      whereCadete.usuario = {
        AND: terminos.map((t) => ({
          OR: [
            { nombres: { contains: t, mode: 'insensitive' } },
            { apellidos: { contains: t, mode: 'insensitive' } },
            { ci: { contains: t, mode: 'insensitive' } },
          ],
        })),
      };
    }

    const [total, cadetes] = await this.prisma.$transaction([
      this.prisma.cadete.count({ where: whereCadete }),
      this.prisma.cadete.findMany({
        where: whereCadete,
        skip,
        take: limite,
        include: {
          usuario: {
            select: {
              id_usuario: true,
              nombres: true,
              apellidos: true,
              ci: true,
              correo: true,
              estado: true,
              habilitado: true,
            },
          },
          curso: true,
        },
        orderBy: [
          { curso: { orden: 'asc' } },
          { usuario: { apellidos: 'asc' } },
        ],
      }),
    ]);

    return {
      data: cadetes.map((cadete) => ({
        ...cadete,
        usuario: {
          ...cadete.usuario,
          estado_conexion: this.presencia.estaEnLinea(cadete.usuario.id_usuario)
            ? 'EN_LINEA'
            : 'DESCONECTADO',
        },
      })),
      meta: {
        total,
        pagina,
        limite,
        paginas_totales: Math.ceil(total / limite),
      },
    };
  }

  /**
   * Obtener detalle completo de un cadete por id_cadete
   */
  async obtenerCadetePorId(id_cadete: number) {
    const cadete = await this.prisma.cadete.findUnique({
      where: { id_cadete },
      include: {
        usuario: {
          include: {
            rol: true,
            seccion: true,
          },
        },
        curso: true,
        historial_cursos: {
          ...historialCursoConPeriodo,
          orderBy: [
            { periodoLectivo: { gestion: { ano: 'desc' } } },
            { periodoLectivo: { periodo: 'desc' } },
          ],
        },
      },
    });

    if (!cadete) throw new NotFoundException('Cadete no encontrado');
    return {
      ...cadete,
      historial_cursos: this.presentarHistorial(cadete.historial_cursos),
    };
  }

  /**
   * Obtener detalle completo de un cadete por CI del usuario
   */
  async obtenerCadetePorCI(ci: string) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { ci },
      include: {
        cadete: {
          include: {
            curso: true,
            historial_cursos: {
              ...historialCursoConPeriodo,
              orderBy: [
                { periodoLectivo: { gestion: { ano: 'desc' } } },
                { periodoLectivo: { periodo: 'desc' } },
              ],
            },
          },
        },
        rol: true,
        seccion: true,
      },
    });

    if (!usuario)
      throw new NotFoundException(`No se encontró usuario con CI: ${ci}`);
    if (!usuario.cadete)
      throw new NotFoundException(
        `El usuario con CI ${ci} no está registrado como cadete`,
      );

    return {
      ...usuario,
      cadete: {
        ...usuario.cadete,
        historial_cursos: this.presentarHistorial(
          usuario.cadete.historial_cursos,
        ),
      },
    };
  }

  /**
   * Actualizar datos del cadete (grado, arma, estado, gestion_egreso)
   */
  async actualizarCadete(id_cadete: number, dto: ActualizarCadeteDto) {
    await this.obtenerCadetePorId(id_cadete);

    return this.prisma.cadete.update({
      where: { id_cadete },
      data: {
        arma: dto.arma,
        estado_cadete: dto.estado_cadete,
        gestion_egreso: dto.gestion_egreso,
      },
      include: {
        usuario: { select: { nombres: true, apellidos: true, ci: true } },
        curso: true,
      },
    });
  }

  /** Cambia el curso actual dentro de un periodo lectivo real, sin fabricar historial. */
  async cambiarCurso(id_cadete: number, dto: CambiarCursoDto) {
    const cadete = await this.obtenerCadetePorId(id_cadete);

    const [curso, periodoLectivo] = await Promise.all([
      this.prisma.curso.findUnique({ where: { id_curso: dto.id_curso } }),
      this.prisma.periodoLectivo.findUnique({
        where: { id_periodo: dto.id_periodo },
        include: { gestion: true },
      }),
    ]);
    if (!curso)
      throw new BadRequestException('El curso seleccionado no existe');
    if (!periodoLectivo) {
      throw new BadRequestException(
        'El periodo lectivo seleccionado no existe',
      );
    }

    if (cadete.id_curso === dto.id_curso) {
      throw new BadRequestException('El cadete ya está asignado a este curso');
    }

    return this.prisma.cadete.update({
      where: { id_cadete },
      data: {
        id_curso: dto.id_curso,
        estado_cadete: dto.estado_cadete ?? cadete.estado_cadete,
      },
      include: {
        usuario: { select: { nombres: true, apellidos: true, ci: true } },
        curso: true,
      },
    });
  }

  /**
   * Obtener historial de cursos de un cadete
   */
  async obtenerHistorialCursos(id_cadete: number) {
    await this.obtenerCadetePorId(id_cadete);

    const historial = await this.prisma.historialCursoCadete.findMany({
      where: { id_cadete },
      ...historialCursoConPeriodo,
      orderBy: [
        { periodoLectivo: { gestion: { ano: 'desc' } } },
        { periodoLectivo: { periodo: 'desc' } },
      ],
    });
    return this.presentarHistorial(historial);
  }

  async egresarCadete(id_cadete: number, dto: EgresarCadeteDto) {
    const cadete = await this.obtenerCadetePorId(id_cadete);
    if (cadete.estado_cadete === 'EGRESADO') {
      throw new BadRequestException('El cadete ya está marcado como egresado');
    }
    return this.prisma.$transaction(async (tx) => {
      const egresado = await tx.curso.findUnique({
        where: { nombre: 'EGRESADO' },
      });
      if (!egresado)
        throw new BadRequestException('No existe el curso EGRESADO');
      return tx.cadete.update({
        where: { id_cadete },
        data: {
          id_curso: egresado.id_curso,
          estado_cadete: 'EGRESADO',
          gestion_egreso: dto.gestion_egreso,
        },
        include: { usuario: true, curso: true },
      });
    });
  }

  async promoverCadetes(
    idCursoOrigen: number,
    idPeriodo: number,
    idsCadete?: number[],
  ) {
    const [origen, periodoLectivo] = await Promise.all([
      this.prisma.curso.findUnique({ where: { id_curso: idCursoOrigen } }),
      this.prisma.periodoLectivo.findUnique({
        where: { id_periodo: idPeriodo },
        include: { gestion: true },
      }),
    ]);
    if (!origen || origen.orden >= 4)
      throw new BadRequestException('El curso origen no admite promoción.');
    if (!periodoLectivo) {
      throw new BadRequestException(
        'El periodo lectivo seleccionado no existe.',
      );
    }
    const destino = await this.prisma.curso.findUnique({
      where: { orden: origen.orden + 1 },
    });
    if (!destino)
      throw new BadRequestException('No existe el curso siguiente.');
    const cadetes = await this.prisma.cadete.findMany({
      where: {
        id_curso: idCursoOrigen,
        estado_cadete: 'REGULAR',
        id_cadete: idsCadete?.length ? { in: idsCadete } : undefined,
      },
      select: { id_cadete: true },
    });
    if (!cadetes.length)
      throw new BadRequestException('No hay cadetes regulares para promover.');

    await this.prisma.$transaction(async (tx) => {
      for (const cadete of cadetes) {
        const egresa = destino.orden === 4;
        await tx.cadete.update({
          where: { id_cadete: cadete.id_cadete },
          data: {
            id_curso: destino.id_curso,
            estado_cadete: egresa ? 'EGRESADO' : 'REGULAR',
            gestion_egreso: egresa ? periodoLectivo.gestion.ano : null,
          },
        });
      }
    });
    return {
      promovidos: cadetes.length,
      curso_origen: origen.nombre,
      curso_destino: destino.nombre,
      id_periodo: periodoLectivo.id_periodo,
      gestion: periodoLectivo.gestion.ano,
      periodo: periodoLectivo.periodo,
    };
  }
}
