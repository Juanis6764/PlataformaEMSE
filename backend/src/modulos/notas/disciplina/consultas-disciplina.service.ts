import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EstadoSemanaDisciplina, Prisma, TipoDisciplina } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { calcularAcumuladoDisciplina } from '../comun/calculo-disciplina';
import { ValidacionesNotasService } from '../comun/validaciones-notas.service';
import {
  ConsultarAcumuladoDisciplinaDto,
  ConsultarCuadroDemostrativoDisciplinaDto,
  ConsultarMisRegistrosDisciplinaDto,
} from './dto/consulta-disciplina.dto';

@Injectable()
export class ConsultasDisciplinaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly validaciones: ValidacionesNotasService,
  ) {}

  async contexto(idUsuario: number) {
    const perfil = await this.validaciones.obtenerPerfil(idUsuario);
    const todosCursos = await this.prisma.curso.findMany({
      where: { orden: { gte: 1, lte: 3 } },
      select: { id_curso: true, nombre: true, orden: true },
      orderBy: { orden: 'asc' },
    });
    let idsCursos: number[];
    if (perfil.tipo === 'OPERADOR_DISCIPLINA') {
      idsCursos = perfil.cursos_asignados;
    } else if (perfil.tipo === 'CADETE') {
      const cadete = await this.prisma.cadete.findUnique({
        where: { id_usuario: idUsuario },
        select: { id_curso: true },
      });
      idsCursos = cadete ? [cadete.id_curso] : [];
    } else {
      idsCursos = todosCursos.map((curso) => curso.id_curso);
    }
    const periodos = await this.prisma.periodoLectivo.findMany({
      include: { gestion: true },
      orderBy: [{ gestion: { ano: 'desc' } }, { periodo: 'asc' }],
    });
    const gestiones = new Map<
      number,
      {
        id_gestion: number;
        ano: number;
        estado: string;
        periodos: Array<{
          id_periodo: number;
          periodo: string;
          activo: boolean;
        }>;
      }
    >();
    for (const periodo of periodos) {
      if (!gestiones.has(periodo.id_gestion)) {
        gestiones.set(periodo.id_gestion, {
          id_gestion: periodo.gestion.id_gestion,
          ano: periodo.gestion.ano,
          estado: periodo.gestion.estado,
          periodos: [],
        });
      }
      gestiones.get(periodo.id_gestion)?.periodos.push({
        id_periodo: periodo.id_periodo,
        periodo: periodo.periodo,
        activo: periodo.activo,
      });
    }
    return {
      perfil: perfil.tipo,
      cursos: todosCursos.filter((curso) => idsCursos.includes(curso.id_curso)),
      gestiones: [...gestiones.values()],
    };
  }

  async misGestiones(idUsuario: number) {
    const cadete = await this.obtenerCadetePropio(idUsuario);
    const filas = await this.prisma.registroDisciplina.findMany({
      where: {
        id_cadete: cadete.id_cadete,
        semana: { estado: EstadoSemanaDisciplina.PUBLICADO },
      },
      select: {
        semana: {
          select: {
            periodo: {
              select: {
                id_periodo: true,
                periodo: true,
                gestion: { select: { id_gestion: true, ano: true } },
              },
            },
          },
        },
      },
      orderBy: {
        semana: { periodo: { gestion: { ano: 'desc' } } },
      },
    });
    const gestiones = new Map<
      number,
      { id_gestion: number; ano: number; periodos: Map<number, unknown> }
    >();
    for (const fila of filas) {
      const periodo = fila.semana.periodo;
      const gestion = periodo.gestion;
      if (!gestiones.has(gestion.id_gestion)) {
        gestiones.set(gestion.id_gestion, {
          ...gestion,
          periodos: new Map(),
        });
      }
      gestiones.get(gestion.id_gestion)?.periodos.set(periodo.id_periodo, {
        id_periodo: periodo.id_periodo,
        periodo: periodo.periodo,
      });
    }
    return [...gestiones.values()].map((gestion) => ({
      id_gestion: gestion.id_gestion,
      ano: gestion.ano,
      periodos: [...gestion.periodos.values()],
    }));
  }

  async misRegistros(
    idUsuario: number,
    filtros: ConsultarMisRegistrosDisciplinaDto,
  ) {
    const cadete = await this.obtenerCadetePropio(idUsuario);
    if (filtros.id_periodo) {
      const periodo = await this.prisma.periodoLectivo.findUnique({
        where: { id_periodo: filtros.id_periodo },
      });
      if (
        !periodo ||
        (filtros.id_gestion && periodo.id_gestion !== filtros.id_gestion)
      ) {
        throw new BadRequestException(
          'El periodo no corresponde a la gestión seleccionada.',
        );
      }
    }
    const registros = await this.prisma.registroDisciplina.findMany({
      where: {
        id_cadete: cadete.id_cadete,
        semana: {
          estado: EstadoSemanaDisciplina.PUBLICADO,
          id_periodo: filtros.id_periodo,
          periodo: { id_gestion: filtros.id_gestion },
        },
      },
      include: {
        catalogo: { select: { tipo: true, nombre: true } },
        semana: {
          select: {
            periodo: {
              select: {
                id_periodo: true,
                periodo: true,
                gestion: { select: { id_gestion: true, ano: true } },
              },
            },
          },
        },
      },
      orderBy: [{ fecha_hecho: 'desc' }, { id_registro: 'desc' }],
    });
    return registros.map((registro) => ({
      id_registro: registro.id_registro,
      id_gestion: registro.semana.periodo.gestion.id_gestion,
      gestion: registro.semana.periodo.gestion.ano,
      id_periodo: registro.semana.periodo.id_periodo,
      periodo: registro.semana.periodo.periodo,
      fecha: registro.fecha_hecho?.toISOString().slice(0, 10) ?? null,
      tipo: registro.catalogo.tipo,
      nombre: registro.catalogo.nombre,
    }));
  }

  async cuadroDemostrativo(
    idUsuario: number,
    filtros: ConsultarCuadroDemostrativoDisciplinaDto,
  ) {
    const perfil = await this.validaciones.obtenerPerfil(idUsuario);
    this.validaciones.exigirTipo(perfil, 'OPERADOR_DISCIPLINA');

    const cursosAsignados = [...new Set(perfil.cursos_asignados)];
    if (cursosAsignados.length !== 1) {
      throw new ForbiddenException(
        'El operador debe tener un único curso asignado para consultar el cuadro demostrativo.',
      );
    }
    const idCurso = cursosAsignados[0];
    await this.validaciones.validarAccesoCurso(idUsuario, idCurso, 'LECTURA');

    const periodo = await this.prisma.periodoLectivo.findUnique({
      where: { id_periodo: filtros.id_periodo },
      include: { gestion: true },
    });
    if (!periodo || periodo.id_gestion !== filtros.id_gestion) {
      throw new BadRequestException(
        'El periodo no corresponde a la gestión seleccionada.',
      );
    }

    const [curso, configuracion] = await Promise.all([
      this.prisma.curso.findUnique({ where: { id_curso: idCurso } }),
      this.prisma.configuracionDisciplinaPeriodo.findUnique({
        where: {
          id_periodo_id_curso: {
            id_periodo: filtros.id_periodo,
            id_curso: idCurso,
          },
        },
      }),
    ]);
    if (!curso) throw new NotFoundException('Curso no encontrado.');
    if (!configuracion) {
      throw new NotFoundException(
        'No existe configuración de disciplina para el curso y periodo seleccionados.',
      );
    }

    const [cadetes, registros] = await Promise.all([
      this.prisma.cadete.findMany({
        where: { id_curso: idCurso },
        include: {
          usuario: {
            select: { ci: true, nombres: true, apellidos: true },
          },
        },
        orderBy: [{ usuario: { apellidos: 'asc' } }, { id_cadete: 'asc' }],
      }),
      this.prisma.registroDisciplina.findMany({
        where: {
          semana: {
            id_periodo: filtros.id_periodo,
            id_curso: idCurso,
            numero_semana: {
              gte: 1,
              lte: configuracion.cantidad_semanas,
            },
          },
        },
        select: {
          id_registro: true,
          id_cadete: true,
          puntaje: true,
          catalogo: {
            select: { tipo: true, codigo: true, nombre: true },
          },
          semana: {
            select: { numero_semana: true, estado: true },
          },
        },
        orderBy: { id_registro: 'asc' },
      }),
    ]);

    type DetalleSemanal = {
      id_registro: number;
      codigo: string;
      nombre: string;
      puntaje: string;
      estado: EstadoSemanaDisciplina;
    };
    type AcumuladoCadete = {
      totalMeritos: Prisma.Decimal;
      totalDemeritos: Prisma.Decimal;
      semanas: Array<{
        totalDemeritos: Prisma.Decimal;
        detalles: DetalleSemanal[];
      }>;
    };

    const porCadete = new Map<number, AcumuladoCadete>();
    const obtenerAcumulado = (idCadete: number) => {
      let acumulado = porCadete.get(idCadete);
      if (!acumulado) {
        acumulado = {
          totalMeritos: new Prisma.Decimal(0),
          totalDemeritos: new Prisma.Decimal(0),
          semanas: Array.from(
            { length: configuracion.cantidad_semanas },
            () => ({
              totalDemeritos: new Prisma.Decimal(0),
              detalles: [],
            }),
          ),
        };
        porCadete.set(idCadete, acumulado);
      }
      return acumulado;
    };

    for (const registro of registros) {
      const acumulado = obtenerAcumulado(registro.id_cadete);
      if (registro.catalogo.tipo === TipoDisciplina.MERITO) {
        acumulado.totalMeritos = acumulado.totalMeritos.plus(registro.puntaje);
        continue;
      }

      const indiceSemana = registro.semana.numero_semana - 1;
      const semana = acumulado.semanas[indiceSemana];
      semana.totalDemeritos = semana.totalDemeritos.plus(registro.puntaje);
      semana.detalles.push({
        id_registro: registro.id_registro,
        codigo: registro.catalogo.codigo,
        nombre: registro.catalogo.nombre,
        puntaje: registro.puntaje.toFixed(4),
        estado: registro.semana.estado,
      });
      acumulado.totalDemeritos = acumulado.totalDemeritos.plus(
        registro.puntaje,
      );
    }

    return {
      id_gestion: periodo.id_gestion,
      gestion: periodo.gestion.ano,
      id_periodo: periodo.id_periodo,
      periodo: periodo.periodo,
      id_curso: curso.id_curso,
      curso: curso.nombre,
      cantidad_semanas: configuracion.cantidad_semanas,
      incluye_borrador: true,
      cadetes: cadetes.map((cadete) => {
        const acumulado = obtenerAcumulado(cadete.id_cadete);
        return {
          id_cadete: cadete.id_cadete,
          ci: cadete.usuario.ci,
          nombres: cadete.usuario.nombres,
          apellidos: cadete.usuario.apellidos,
          arma: cadete.arma,
          semanas: acumulado.semanas.map((semana, indice) => ({
            numero_semana: indice + 1,
            total_demeritos: semana.totalDemeritos.toFixed(4),
            detalles: semana.detalles,
          })),
          total_meritos: acumulado.totalMeritos.toFixed(4),
          total_demeritos: acumulado.totalDemeritos.toFixed(4),
        };
      }),
    };
  }

  async acumulado(idUsuario: number, filtros: ConsultarAcumuladoDisciplinaDto) {
    const perfil = await this.validaciones.validarAccesoCurso(
      idUsuario,
      filtros.id_curso,
      'LECTURA',
    );
    if (perfil.tipo === 'CADETE' || perfil.tipo === 'OTRO') {
      throw new ForbiddenException('No puede consultar acumulados generales.');
    }
    const periodo = await this.prisma.periodoLectivo.findUnique({
      where: { id_periodo: filtros.id_periodo },
      include: { gestion: true },
    });
    if (!periodo || periodo.id_gestion !== filtros.id_gestion) {
      throw new BadRequestException(
        'El periodo no corresponde a la gestión seleccionada.',
      );
    }
    const curso = await this.prisma.curso.findUnique({
      where: { id_curso: filtros.id_curso },
    });
    if (!curso) throw new NotFoundException('Curso no encontrado.');

    const fechaInicial = filtros.fecha_inicial
      ? new Date(`${filtros.fecha_inicial}T00:00:00.000Z`)
      : undefined;
    const fechaFinal = filtros.fecha_final
      ? new Date(`${filtros.fecha_final}T00:00:00.000Z`)
      : undefined;
    if (fechaInicial && fechaFinal && fechaInicial > fechaFinal) {
      throw new BadRequestException(
        'La fecha inicial no puede ser posterior a la fecha final.',
      );
    }
    for (const fecha of [fechaInicial, fechaFinal]) {
      if (fecha && fecha.getUTCFullYear() !== periodo.gestion.ano) {
        throw new BadRequestException(
          'Las fechas deben corresponder a la gestión seleccionada.',
        );
      }
    }

    const [cadetes, registros, configuracion, semanasPublicadas] =
      await Promise.all([
        this.prisma.cadete.findMany({
          where: { id_curso: filtros.id_curso },
          include: {
            usuario: {
              select: { ci: true, nombres: true, apellidos: true },
            },
          },
          orderBy: [{ usuario: { apellidos: 'asc' } }, { id_cadete: 'asc' }],
        }),
        this.prisma.registroDisciplina.findMany({
          where: {
            semana: {
              id_periodo: filtros.id_periodo,
              id_curso: filtros.id_curso,
              estado: EstadoSemanaDisciplina.PUBLICADO,
            },
            ...(fechaInicial || fechaFinal
              ? {
                  OR: [
                    { catalogo: { tipo: TipoDisciplina.MERITO } },
                    {
                      fecha_hecho: {
                        gte: fechaInicial,
                        lte: fechaFinal,
                      },
                    },
                  ],
                }
              : {}),
          },
          select: {
            id_cadete: true,
            puntaje: true,
            catalogo: { select: { tipo: true } },
          },
        }),
        this.prisma.configuracionDisciplinaPeriodo.findUnique({
          where: {
            id_periodo_id_curso: {
              id_periodo: filtros.id_periodo,
              id_curso: filtros.id_curso,
            },
          },
        }),
        this.prisma.semanaDisciplina.count({
          where: {
            id_periodo: filtros.id_periodo,
            id_curso: filtros.id_curso,
            estado: EstadoSemanaDisciplina.PUBLICADO,
          },
        }),
      ]);

    const porCadete = new Map<
      number,
      {
        tipo: (typeof registros)[number]['catalogo']['tipo'];
        puntaje: Prisma.Decimal;
      }[]
    >();
    for (const registro of registros) {
      const lista = porCadete.get(registro.id_cadete) ?? [];
      lista.push({ tipo: registro.catalogo.tipo, puntaje: registro.puntaje });
      porCadete.set(registro.id_cadete, lista);
    }

    return {
      gestion: periodo.gestion.ano,
      periodo: periodo.periodo,
      curso: curso.nombre,
      fecha_inicial: filtros.fecha_inicial ?? null,
      fecha_final: filtros.fecha_final ?? null,
      semanas_configuradas: configuracion?.cantidad_semanas ?? 0,
      semanas_publicadas: semanasPublicadas,
      completo:
        Boolean(configuracion?.activo) &&
        semanasPublicadas === configuracion?.cantidad_semanas,
      cadetes: cadetes.map((cadete) => ({
        id_cadete: cadete.id_cadete,
        ci: cadete.usuario.ci,
        nombres: cadete.usuario.nombres,
        apellidos: cadete.usuario.apellidos,
        arma: cadete.arma,
        grado: curso.nombre,
        ...calcularAcumuladoDisciplina(porCadete.get(cadete.id_cadete) ?? []),
      })),
    };
  }

  private async obtenerCadetePropio(idUsuario: number) {
    const perfil = await this.validaciones.obtenerPerfil(idUsuario);
    this.validaciones.exigirTipo(perfil, 'CADETE');
    const cadete = await this.prisma.cadete.findUnique({
      where: { id_usuario: idUsuario },
      select: { id_cadete: true },
    });
    if (!cadete) throw new NotFoundException('Cadete no encontrado.');
    return cadete;
  }
}
