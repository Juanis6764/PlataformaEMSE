import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EstadoSemanaDisciplina } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  AREA_ENTRENAMIENTO_FISICO,
  PERMISOS_NOTAS,
} from '../comun/constantes-notas';
import { ValidacionesNotasService } from '../comun/validaciones-notas.service';
import {
  calcularOrdenMerito,
  clasificarNota,
  notaConsiderada,
  promedioNotas,
} from './calculo-evaluaciones';
import {
  ConsultarEvaluacionesDto,
  ConsultarMisEvaluacionesDto,
} from './dto/consulta-evaluaciones.dto';

@Injectable()
export class ConsultasEvaluacionesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly validaciones: ValidacionesNotasService,
  ) {}

  async contexto(idUsuario: number) {
    const perfil = await this.validaciones.obtenerPerfilEvaluaciones(idUsuario);
    this.validaciones.exigirPermiso(perfil, PERMISOS_NOTAS.VER);
    const todosCursos = await this.prisma.curso.findMany({
      where: { orden: { gte: 1, lte: 3 } },
      select: { id_curso: true, nombre: true, orden: true },
      orderBy: { orden: 'asc' },
    });
    let idsCursos: number[];
    if (perfil.tipo === 'OPERADOR_EVALUACIONES') {
      idsCursos = perfil.cursos_asignados;
    } else if (perfil.tipo === 'CADETE') {
      const cadete = await this.prisma.cadete.findUnique({
        where: { id_usuario: idUsuario },
        select: { id_curso: true },
      });
      idsCursos = cadete ? [cadete.id_curso] : [];
    } else {
      this.validaciones.exigirTipo(
        perfil,
        'ADMINISTRADOR',
        'ENCARGADO_EVALUACIONES',
        'SECCION_ACADEMICA',
        'JEFE_ESTUDIOS',
        'COMANDO',
      );
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

  async matriz(idUsuario: number, dto: ConsultarEvaluacionesDto) {
    return this.construirMatriz(idUsuario, dto);
  }

  async resultados(idUsuario: number, dto: ConsultarEvaluacionesDto) {
    const matriz = await this.construirMatriz(idUsuario, dto);
    return {
      id_gestion: matriz.id_gestion,
      gestion: matriz.gestion,
      id_periodo: matriz.id_periodo,
      periodo: matriz.periodo,
      id_curso: matriz.id_curso,
      curso: matriz.curso,
      materias_configuradas: matriz.materias_configuradas,
      materias_publicadas: matriz.materias_publicadas,
      completo: matriz.completo,
      cadetes: matriz.cadetes.map((cadete) => ({
        id_cadete: cadete.id_cadete,
        ci: cadete.ci,
        nombres: cadete.nombres,
        apellidos: cadete.apellidos,
        promedio_parcial: cadete.promedio_parcial,
        nota_final_evaluaciones: cadete.promedio_final,
        clasificacion_final: cadete.promedio_final
          ? clasificarNota(cadete.promedio_final)
          : null,
      })),
    };
  }

  async resultadosRecibidos(idUsuario: number, dto: ConsultarEvaluacionesDto) {
    const perfil = await this.validaciones.validarAccesoCursoEvaluaciones(
      idUsuario,
      dto.id_curso,
      'LECTURA',
    );
    this.validaciones.exigirTipo(
      perfil,
      'ADMINISTRADOR',
      'ENCARGADO_EVALUACIONES',
      'SECCION_ACADEMICA',
      'JEFE_ESTUDIOS',
      'COMANDO',
    );
    this.validaciones.exigirPermiso(perfil, PERMISOS_NOTAS.VER);

    const [periodo, curso] = await Promise.all([
      this.prisma.periodoLectivo.findUnique({
        where: { id_periodo: dto.id_periodo },
        include: { gestion: true },
      }),
      this.prisma.curso.findUnique({
        where: { id_curso: dto.id_curso },
        select: { id_curso: true, nombre: true },
      }),
    ]);
    if (!periodo || periodo.id_gestion !== dto.id_gestion) {
      throw new BadRequestException(
        'El periodo no corresponde a la gestión seleccionada.',
      );
    }
    if (!curso) throw new NotFoundException('Curso no encontrado.');

    const [configuracion, materiasPublicadas, disciplina, planilla] =
      await Promise.all([
        this.prisma.configuracionEvaluacionesPeriodo.findUnique({
          where: {
            id_periodo_id_curso: {
              id_periodo: dto.id_periodo,
              id_curso: dto.id_curso,
            },
          },
        }),
        this.prisma.materiaEvaluacion.count({
          where: {
            id_periodo: dto.id_periodo,
            id_curso: dto.id_curso,
            estado: EstadoSemanaDisciplina.PUBLICADO,
          },
        }),
        this.prisma.resultadoFinalDisciplina.findMany({
          where: {
            id_periodo: dto.id_periodo,
            id_curso: dto.id_curso,
          },
          include: {
            cadete: {
              include: {
                usuario: {
                  select: { ci: true, nombres: true, apellidos: true },
                },
              },
            },
          },
          orderBy: [
            { cadete: { usuario: { apellidos: 'asc' } } },
            { id_cadete: 'asc' },
          ],
        }),
        this.prisma.planillaEntrenamientoFisico.findUnique({
          where: {
            id_periodo_id_curso: {
              id_periodo: dto.id_periodo,
              id_curso: dto.id_curso,
            },
          },
          include: {
            notas: {
              include: {
                cadete: {
                  include: {
                    usuario: {
                      select: { ci: true, nombres: true, apellidos: true },
                    },
                  },
                },
              },
              orderBy: [
                { cadete: { usuario: { apellidos: 'asc' } } },
                { id_cadete: 'asc' },
              ],
            },
          },
        }),
      ]);

    const materiasConfiguradas = configuracion?.activo
      ? configuracion.cantidad_materias
      : 0;
    const evaluacionesCompleto =
      materiasConfiguradas > 0 && materiasPublicadas === materiasConfiguradas;

    const disciplinaRecibida =
      disciplina.length > 0 &&
      disciplina.every((resultado) => resultado.fecha_envio_evaluaciones);

    const envioEntrenamiento =
      planilla?.estado === EstadoSemanaDisciplina.REVISADO
        ? await this.prisma.notificacion.findFirst({
            where: {
              area: AREA_ENTRENAMIENTO_FISICO,
              tipo: 'NOTAS_FINALES_ENTRENAMIENTO_FISICO',
              id_referencia: planilla.id_planilla,
              clave_evento: {
                startsWith: [
                  AREA_ENTRENAMIENTO_FISICO,
                  'RESULTADO_FINAL',
                  planilla.id_planilla,
                  planilla.version_flujo,
                  '',
                ].join(':'),
              },
            },
            select: { fecha_creacion: true },
          })
        : null;
    const entrenamientoRecibido = Boolean(
      envioEntrenamiento &&
      planilla &&
      planilla.notas.length > 0 &&
      planilla.notas.every((nota) => nota.nota_final !== null),
    );

    return {
      id_gestion: dto.id_gestion,
      gestion: periodo.gestion.ano,
      id_periodo: dto.id_periodo,
      periodo: periodo.periodo,
      id_curso: dto.id_curso,
      curso: curso.nombre,
      evaluaciones: {
        estado: evaluacionesCompleto ? 'COMPLETO' : 'PENDIENTE',
        materias_configuradas: materiasConfiguradas,
        materias_publicadas: materiasPublicadas,
      },
      disciplina: {
        estado: disciplinaRecibida ? 'RECIBIDO' : 'PENDIENTE',
        fecha_recepcion: disciplinaRecibida
          ? disciplina[0].fecha_envio_evaluaciones
          : null,
        cantidad_cadetes: disciplinaRecibida ? disciplina.length : 0,
        notas: disciplinaRecibida
          ? disciplina.map((resultado) => ({
              id_cadete: resultado.id_cadete,
              ci: resultado.cadete.usuario.ci,
              nombres: resultado.cadete.usuario.nombres,
              apellidos: resultado.cadete.usuario.apellidos,
              nota_final: resultado.nota_final_disciplina.toFixed(4),
            }))
          : [],
      },
      entrenamiento_fisico: {
        estado: entrenamientoRecibido ? 'RECIBIDO' : 'PENDIENTE',
        id_planilla: entrenamientoRecibido ? planilla?.id_planilla : null,
        fecha_recepcion: entrenamientoRecibido
          ? envioEntrenamiento?.fecha_creacion
          : null,
        cantidad_cadetes: entrenamientoRecibido
          ? (planilla?.notas.length ?? 0)
          : 0,
        notas:
          entrenamientoRecibido && planilla
            ? planilla.notas.map((nota) => ({
                id_cadete: nota.id_cadete,
                ci: nota.cadete.usuario.ci,
                nombres: nota.cadete.usuario.nombres,
                apellidos: nota.cadete.usuario.apellidos,
                nota_final: nota.nota_final!.toFixed(4),
              }))
            : [],
      },
    };
  }

  async misNotas(idUsuario: number, filtros: ConsultarMisEvaluacionesDto) {
    const perfil = await this.validaciones.obtenerPerfilEvaluaciones(idUsuario);
    this.validaciones.exigirTipo(perfil, 'CADETE');
    this.validaciones.exigirPermiso(perfil, PERMISOS_NOTAS.VER);
    const cadete = await this.prisma.cadete.findUnique({
      where: { id_usuario: idUsuario },
    });
    if (!cadete) throw new NotFoundException('Cadete no encontrado.');
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
    const materias = await this.prisma.materiaEvaluacion.findMany({
      where: {
        id_curso: cadete.id_curso,
        id_periodo: filtros.id_periodo,
        periodo: { id_gestion: filtros.id_gestion },
        estado: EstadoSemanaDisciplina.PUBLICADO,
        notas: { some: { id_cadete: cadete.id_cadete } },
      },
      include: {
        notas: true,
      },
      orderBy: [
        { periodo: { gestion: { ano: 'desc' } } },
        { periodo: { periodo: 'asc' } },
        { numero_materia: 'asc' },
      ],
    });
    return materias.map((materia) => {
      const propia = materia.notas.find(
        (nota) => nota.id_cadete === cadete.id_cadete,
      );
      if (!propia) {
        throw new NotFoundException('Nota publicada propia no encontrada.');
      }
      const posiciones = calcularOrdenMerito(
        materia.notas.map((nota) => ({
          id_cadete: nota.id_cadete,
          nota: notaConsiderada(nota.nota_inicial, nota.nota_desquite),
        })),
      );
      const considerada = notaConsiderada(
        propia.nota_inicial,
        propia.nota_desquite,
      );
      return {
        nombre: materia.nombre,
        nota_considerada: considerada.toFixed(4),
        clasificacion: clasificarNota(considerada),
        orden_merito: posiciones.get(cadete.id_cadete) ?? null,
      };
    });
  }

  private async construirMatriz(
    idUsuario: number,
    dto: ConsultarEvaluacionesDto,
  ) {
    const perfil = await this.validaciones.validarAccesoCursoEvaluaciones(
      idUsuario,
      dto.id_curso,
      'LECTURA',
    );
    this.validaciones.exigirTipo(
      perfil,
      'ADMINISTRADOR',
      'ENCARGADO_EVALUACIONES',
      'OPERADOR_EVALUACIONES',
      'SECCION_ACADEMICA',
      'JEFE_ESTUDIOS',
      'COMANDO',
    );
    this.validaciones.exigirPermiso(perfil, PERMISOS_NOTAS.VER);
    const periodo = await this.prisma.periodoLectivo.findUnique({
      where: { id_periodo: dto.id_periodo },
      include: { gestion: true },
    });
    if (!periodo || periodo.id_gestion !== dto.id_gestion) {
      throw new BadRequestException(
        'El periodo no corresponde a la gestión seleccionada.',
      );
    }
    const curso = await this.prisma.curso.findUnique({
      where: { id_curso: dto.id_curso },
    });
    if (!curso) throw new NotFoundException('Curso no encontrado.');
    const [configuracion, materias, cadetes] = await Promise.all([
      this.prisma.configuracionEvaluacionesPeriodo.findUnique({
        where: {
          id_periodo_id_curso: {
            id_periodo: dto.id_periodo,
            id_curso: dto.id_curso,
          },
        },
      }),
      this.prisma.materiaEvaluacion.findMany({
        where: {
          id_periodo: dto.id_periodo,
          id_curso: dto.id_curso,
          estado: EstadoSemanaDisciplina.PUBLICADO,
        },
        include: { notas: true },
        orderBy: { numero_materia: 'asc' },
      }),
      this.prisma.cadete.findMany({
        where: { id_curso: dto.id_curso },
        include: {
          usuario: {
            select: { ci: true, nombres: true, apellidos: true },
          },
        },
        orderBy: [{ usuario: { apellidos: 'asc' } }, { id_cadete: 'asc' }],
      }),
    ]);
    const posicionesPorMateria = new Map<number, Map<number, number>>();
    const notasPorMateriaCadete = new Map<
      string,
      (typeof materias)[number]['notas'][number]
    >();
    for (const materia of materias) {
      posicionesPorMateria.set(
        materia.id_materia,
        calcularOrdenMerito(
          materia.notas.map((nota) => ({
            id_cadete: nota.id_cadete,
            nota: notaConsiderada(nota.nota_inicial, nota.nota_desquite),
          })),
        ),
      );
      for (const nota of materia.notas) {
        notasPorMateriaCadete.set(
          `${materia.id_materia}:${nota.id_cadete}`,
          nota,
        );
      }
    }
    const materiasConfiguradas = configuracion?.activo
      ? configuracion.cantidad_materias
      : 0;
    const completo =
      materiasConfiguradas > 0 && materias.length === materiasConfiguradas;
    return {
      id_gestion: dto.id_gestion,
      gestion: periodo.gestion.ano,
      id_periodo: dto.id_periodo,
      periodo: periodo.periodo,
      id_curso: dto.id_curso,
      curso: curso.nombre,
      materias_configuradas: materiasConfiguradas,
      materias_publicadas: materias.length,
      completo,
      columnas: materias.map((materia) => ({
        id_materia: materia.id_materia,
        numero_materia: materia.numero_materia,
        nombre: materia.nombre,
      })),
      cadetes: cadetes.map((cadete) => {
        const valores = materias.flatMap((materia) => {
          const nota = notasPorMateriaCadete.get(
            `${materia.id_materia}:${cadete.id_cadete}`,
          );
          return nota
            ? [notaConsiderada(nota.nota_inicial, nota.nota_desquite)]
            : [];
        });
        const promedioParcial = promedioNotas(valores);
        return {
          id_cadete: cadete.id_cadete,
          ci: cadete.usuario.ci,
          nombres: cadete.usuario.nombres,
          apellidos: cadete.usuario.apellidos,
          materias: materias.map((materia) => {
            const nota = notasPorMateriaCadete.get(
              `${materia.id_materia}:${cadete.id_cadete}`,
            );
            if (!nota) {
              return {
                id_materia: materia.id_materia,
                nota_inicial: null,
                nota_desquite: null,
                nota_considerada: null,
                clasificacion: null,
                orden_merito: null,
              };
            }
            const considerada = notaConsiderada(
              nota.nota_inicial,
              nota.nota_desquite,
            );
            return {
              id_materia: materia.id_materia,
              nota_inicial: nota.nota_inicial.toFixed(4),
              nota_desquite: nota.nota_desquite?.toFixed(4) ?? null,
              nota_considerada: considerada.toFixed(4),
              clasificacion: clasificarNota(considerada),
              orden_merito:
                posicionesPorMateria
                  .get(materia.id_materia)
                  ?.get(cadete.id_cadete) ?? null,
            };
          }),
          promedio_parcial: promedioParcial,
          promedio_final: completo ? promedioParcial : null,
        };
      }),
    };
  }
}
