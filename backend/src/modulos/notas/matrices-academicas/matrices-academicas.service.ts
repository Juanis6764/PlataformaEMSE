import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  EstadoMatrizAcademica,
  EstadoSemanaDisciplina,
  ModuloNotificacion,
  NivelRevisionNota,
  Prisma,
  TipoMatrizAcademica,
} from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditoriaService } from '../../auditoria/auditoria.service';
import { NotificacionesService } from '../../notificaciones/notificaciones.service';
import { PERMISOS_NOTAS } from '../comun/constantes-notas';
import { ValidacionesNotasService } from '../comun/validaciones-notas.service';
import { clasificarNota, notaConsiderada } from '../evaluaciones/calculo-evaluaciones';
import {
  BuscarCorreccionExtraordinariaDto,
  BuscarHistorialAcademicoDto,
  ObservarMatrizAcademicaDto,
  RegistrarAntecedenteAcademicoDto,
  SeleccionarMatrizAcademicaDto,
} from './dto/matriz-academica.dto';

type FilaCalculada = {
  id_cadete: number;
  ci: string;
  nombres: string;
  apellidos: string;
  materias: Array<{ id_materia: number; nombre: string; nota: string | null }>;
  promedio_academico: Prisma.Decimal | null;
  ponderacion_evaluaciones: Prisma.Decimal | null;
  nota_entrenamiento_fisico: Prisma.Decimal | null;
  ponderacion_entrenamiento: Prisma.Decimal | null;
  nota_disciplina: Prisma.Decimal | null;
  ponderacion_disciplina: Prisma.Decimal | null;
  promedio_general: Prisma.Decimal | null;
  cantidad_aplazos: number | null;
  promedio_acumulado: Prisma.Decimal | null;
  cantidad_aplazos_acumulados: number | null;
  atributo: string | null;
  orden_merito: number | null;
};

@Injectable()
export class MatricesAcademicasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly validaciones: ValidacionesNotasService,
    private readonly auditoria: AuditoriaService,
    private readonly notificaciones: NotificacionesService,
  ) {}

  async consultar(idUsuario: number, dto: SeleccionarMatrizAcademicaDto) {
    const perfil = await this.validaciones.validarAccesoCursoEvaluaciones(
      idUsuario,
      dto.id_curso,
      'LECTURA',
    );
    this.validaciones.exigirPermiso(perfil, PERMISOS_NOTAS.VER);
    this.validaciones.exigirTipo(
      perfil,
      'ADMINISTRADOR',
      'ENCARGADO_EVALUACIONES',
      'SECCION_ACADEMICA',
      'JEFE_ESTUDIOS',
      'COMANDO',
    );
    const base = await this.validarSeleccion(dto);
    const matriz = await this.prisma.matrizAcademica.findUnique({
      where: {
        id_periodo_id_curso_tipo: {
          id_periodo: dto.id_periodo,
          id_curso: dto.id_curso,
          tipo: dto.tipo ?? TipoMatrizAcademica.SEMESTRAL,
        },
      },
      include: this.incluirMatriz(),
    });

    if (matriz) return this.presentarMatriz(matriz, perfil.tipo);
    const calculo =
      (dto.tipo ?? TipoMatrizAcademica.SEMESTRAL) ===
      TipoMatrizAcademica.ANUAL
        ? await this.calcularAnual(dto)
        : await this.calcularSemestral(dto);
    return {
      id_matriz: null,
      tipo: dto.tipo ?? TipoMatrizAcademica.SEMESTRAL,
      estado: null,
      nivel_revision_actual: null,
      version_flujo: 0,
      gestion: base.periodo.gestion.ano,
      periodo: base.periodo.periodo,
      curso: base.curso.nombre,
      disponibilidad: calculo.disponibilidad,
      completo: calculo.completo,
      acciones: {
        generar:
          perfil.tipo === 'ENCARGADO_EVALUACIONES' && calculo.completo,
        enviar: false,
        aprobar: false,
        observar: false,
        publicar: false,
      },
      filas: calculo.filas.map((fila) => this.presentarFila(fila)),
    };
  }

  async generar(idUsuario: number, dto: SeleccionarMatrizAcademicaDto) {
    const perfil = await this.validaciones.validarAccesoCursoEvaluaciones(
      idUsuario,
      dto.id_curso,
      'REGISTRO',
    );
    this.validaciones.exigirTipo(perfil, 'ENCARGADO_EVALUACIONES');
    this.validaciones.exigirPermiso(perfil, PERMISOS_NOTAS.PUBLICAR);
    await this.validarSeleccion(dto);
    const tipo = dto.tipo ?? TipoMatrizAcademica.SEMESTRAL;
    const existente = await this.prisma.matrizAcademica.findUnique({
      where: {
        id_periodo_id_curso_tipo: {
          id_periodo: dto.id_periodo,
          id_curso: dto.id_curso,
          tipo,
        },
      },
    });
    if (existente) return this.consultar(idUsuario, dto);

    const calculo =
      tipo === TipoMatrizAcademica.ANUAL
        ? await this.calcularAnual(dto)
        : await this.calcularSemestral(dto);
    if (!calculo.completo) {
      throw new ConflictException(
        'La matriz puede consultarse parcialmente, pero solo se genera cuando las fuentes requeridas están completas.',
      );
    }
    this.exigirSinEmpates(calculo.filas);

    await this.prisma.$transaction(async (tx) => {
      const matriz = await tx.matrizAcademica.create({
        data: {
          id_periodo: dto.id_periodo,
          id_curso: dto.id_curso,
          tipo,
          id_creador: idUsuario,
          detalles: {
            create: calculo.filas.map((fila) => this.aDatosDetalle(fila)),
          },
        },
      });
      await this.auditoria.registrar(
        {
          id_usuario: idUsuario,
          accion: 'GENERAR_MATRIZ_ACADEMICA',
          modulo: 'MATRIZ_ACADEMICA',
          entidad: 'MatrizAcademica',
          id_entidad: matriz.id_matriz,
          descripcion: `Matriz ${tipo.toLowerCase()} generada desde las fuentes oficiales.`,
          datos_despues: {
            id_periodo: dto.id_periodo,
            id_curso: dto.id_curso,
            tipo,
            cantidad_cadetes: calculo.filas.length,
          },
        },
        tx,
      );
    });
    return this.consultar(idUsuario, dto);
  }

  async enviar(idUsuario: number, idMatriz: number) {
    return this.transicionar(idUsuario, idMatriz, 'ENVIAR');
  }

  async aprobar(idUsuario: number, idMatriz: number) {
    return this.transicionar(idUsuario, idMatriz, 'APROBAR');
  }

  async observar(
    idUsuario: number,
    idMatriz: number,
    dto: ObservarMatrizAcademicaDto,
  ) {
    return this.transicionar(idUsuario, idMatriz, 'OBSERVAR', dto.observacion);
  }

  async publicar(idUsuario: number, idMatriz: number) {
    return this.transicionar(idUsuario, idMatriz, 'PUBLICAR');
  }

  async registrarAntecedente(
    idUsuario: number,
    dto: RegistrarAntecedenteAcademicoDto,
  ) {
    const perfil = await this.validaciones.obtenerPerfilEvaluaciones(idUsuario);
    this.validaciones.exigirTipo(perfil, 'ENCARGADO_EVALUACIONES');
    this.validaciones.exigirPermiso(perfil, PERMISOS_NOTAS.EDITAR);
    if (dto.gestion >= 2026) {
      throw new BadRequestException(
        'Desde 2026 los antecedentes se obtienen de matrices anuales publicadas.',
      );
    }
    const cadete = await this.prisma.cadete.findUnique({
      where: { id_cadete: dto.id_cadete },
    });
    if (!cadete) throw new NotFoundException('Cadete no encontrado.');
    const oficial = await this.prisma.detalleMatrizAcademica.findFirst({
      where: {
        id_cadete: dto.id_cadete,
        matriz: {
          tipo: TipoMatrizAcademica.ANUAL,
          estado: EstadoMatrizAcademica.PUBLICADO,
          periodo: { gestion: { ano: dto.gestion } },
        },
      },
    });
    if (oficial) {
      throw new ConflictException(
        'Ya existe una matriz anual oficial para esa gestión; no se permite duplicarla como antecedente manual.',
      );
    }
    const promedio = new Prisma.Decimal(dto.promedio_general).toDecimalPlaces(4);
    const anterior = await this.prisma.antecedenteAcademicoCadete.findUnique({
      where: {
        id_cadete_gestion: {
          id_cadete: dto.id_cadete,
          gestion: dto.gestion,
        },
      },
    });
    const resultado = await this.prisma.$transaction(async (tx) => {
      const guardado = await tx.antecedenteAcademicoCadete.upsert({
        where: {
          id_cadete_gestion: {
            id_cadete: dto.id_cadete,
            gestion: dto.gestion,
          },
        },
        update: {
          promedio_general: promedio,
          cantidad_aplazos: dto.cantidad_aplazos,
          id_registrador: idUsuario,
        },
        create: {
          id_cadete: dto.id_cadete,
          gestion: dto.gestion,
          promedio_general: promedio,
          cantidad_aplazos: dto.cantidad_aplazos,
          id_registrador: idUsuario,
        },
      });
      await this.auditoria.registrar(
        {
          id_usuario: idUsuario,
          accion: anterior
            ? 'ACTUALIZAR_ANTECEDENTE_ACADEMICO'
            : 'REGISTRAR_ANTECEDENTE_ACADEMICO',
          modulo: 'MATRIZ_ACADEMICA',
          entidad: 'AntecedenteAcademicoCadete',
          id_entidad: guardado.id_antecedente,
          descripcion: `Antecedente histórico ${dto.gestion} registrado con trazabilidad.`,
          datos_antes: anterior
            ? {
                promedio_general: anterior.promedio_general.toFixed(4),
                cantidad_aplazos: anterior.cantidad_aplazos,
              }
            : undefined,
          datos_despues: {
            promedio_general: promedio.toFixed(4),
            cantidad_aplazos: dto.cantidad_aplazos,
          },
        },
        tx,
      );
      return guardado;
    });
    return {
      ...resultado,
      promedio_general: resultado.promedio_general.toFixed(4),
    };
  }

  async misMatrices(idUsuario: number) {
    const perfil = await this.validaciones.obtenerPerfilEvaluaciones(idUsuario);
    this.validaciones.exigirTipo(perfil, 'CADETE');
    this.validaciones.exigirPermiso(perfil, PERMISOS_NOTAS.VER);
    const cadete = await this.prisma.cadete.findUnique({
      where: { id_usuario: idUsuario },
    });
    if (!cadete) throw new NotFoundException('Cadete no encontrado.');
    const detalles = await this.prisma.detalleMatrizAcademica.findMany({
      where: {
        id_cadete: cadete.id_cadete,
        matriz: { estado: EstadoMatrizAcademica.PUBLICADO },
      },
      include: {
        matriz: { include: { periodo: { include: { gestion: true } }, curso: true } },
      },
      orderBy: { matriz: { fecha_publicacion: 'desc' } },
    });
    return Promise.all(
      detalles.map(async (detalle) => {
        const materias =
          detalle.matriz.tipo === TipoMatrizAcademica.SEMESTRAL
            ? await this.materiasCadete(
                detalle.matriz.id_periodo,
                detalle.matriz.id_curso,
                detalle.id_cadete,
              )
            : [];
        return {
          id_matriz: detalle.id_matriz,
          tipo: detalle.matriz.tipo,
          gestion: detalle.matriz.periodo.gestion.ano,
          periodo: detalle.matriz.periodo.periodo,
          curso: detalle.matriz.curso.nombre,
          materias,
          ...this.presentarDetallePersistido(detalle),
        };
      }),
    );
  }

  async buscar(idUsuario: number, filtros: BuscarHistorialAcademicoDto) {
    const perfil = await this.validaciones.obtenerPerfilEvaluaciones(idUsuario);
    this.validaciones.exigirTipo(
      perfil,
      'ADMINISTRADOR',
      'ENCARGADO_EVALUACIONES',
      'SECCION_ACADEMICA',
      'JEFE_ESTUDIOS',
      'COMANDO',
    );
    this.validaciones.exigirPermiso(perfil, PERMISOS_NOTAS.VER);
    const q = filtros.q?.trim();
    const detalles = await this.prisma.detalleMatrizAcademica.findMany({
      where: {
        matriz: {
          estado: EstadoMatrizAcademica.PUBLICADO,
          id_curso: filtros.id_curso,
          periodo: { gestion: { ano: filtros.gestion } },
        },
        cadete: q
          ? {
              usuario: {
                OR: [
                  { ci: { contains: q, mode: 'insensitive' } },
                  { nombres: { contains: q, mode: 'insensitive' } },
                  { apellidos: { contains: q, mode: 'insensitive' } },
                ],
              },
            }
          : undefined,
      },
      include: {
        cadete: { include: { usuario: true } },
        matriz: { include: { periodo: { include: { gestion: true } }, curso: true } },
      },
      orderBy: [
        { matriz: { periodo: { gestion: { ano: 'desc' } } } },
        { cadete: { usuario: { apellidos: 'asc' } } },
      ],
      take: 300,
    });
    return detalles.map((detalle) => ({
      id_cadete: detalle.id_cadete,
      ci: detalle.cadete.usuario.ci,
      nombres: detalle.cadete.usuario.nombres,
      apellidos: detalle.cadete.usuario.apellidos,
      id_matriz: detalle.id_matriz,
      gestion: detalle.matriz.periodo.gestion.ano,
      periodo: detalle.matriz.periodo.periodo,
      curso: detalle.matriz.curso.nombre,
      tipo: detalle.matriz.tipo,
      ...this.presentarDetallePersistido(detalle),
    }));
  }

  async buscarCorrecciones(
    idUsuario: number,
    filtros: BuscarCorreccionExtraordinariaDto,
  ) {
    const perfil = await this.validaciones.validarAccesoCursoEvaluaciones(
      idUsuario,
      filtros.id_curso,
      'LECTURA',
    );
    this.validaciones.exigirTipo(
      perfil,
      'JEFE_ESTUDIOS',
      'SECCION_ACADEMICA',
      'COMANDO',
    );
    this.validaciones.exigirPermiso(perfil, PERMISOS_NOTAS.MODIFICAR_BLOQUEADA);
    const base = await this.validarSeleccion({
      id_gestion: filtros.id_gestion,
      id_periodo: filtros.id_periodo,
      id_curso: filtros.id_curso,
      tipo: TipoMatrizAcademica.SEMESTRAL,
    });
    const q = filtros.q?.trim();
    const filtroUsuario: Prisma.UsuarioWhereInput | undefined = q
      ? {
          OR: [
            { ci: { contains: q, mode: 'insensitive' } },
            { nombres: { contains: q, mode: 'insensitive' } },
            { apellidos: { contains: q, mode: 'insensitive' } },
          ],
        }
      : undefined;
    const cadetes = await this.prisma.cadete.findMany({
      where: {
        usuario: filtroUsuario,
        OR: [
          {
            notas_evaluacion: {
              some: {
                materia: {
                  id_periodo: filtros.id_periodo,
                  id_curso: filtros.id_curso,
                },
              },
            },
          },
          {
            notas_entrenamiento: {
              some: {
                planilla: {
                  id_periodo: filtros.id_periodo,
                  id_curso: filtros.id_curso,
                },
              },
            },
          },
          {
            resultados_disciplina: {
              some: {
                id_periodo: filtros.id_periodo,
                id_curso: filtros.id_curso,
              },
            },
          },
          {
            detalles_matriz: {
              some: {
                matriz: {
                  id_curso: filtros.id_curso,
                  periodo: { id_gestion: filtros.id_gestion },
                },
              },
            },
          },
        ],
      },
      include: { usuario: true },
      orderBy: [
        { usuario: { apellidos: 'asc' } },
        { usuario: { nombres: 'asc' } },
      ],
      take: 100,
    });
    const idsCadetes = cadetes.map((cadete) => cadete.id_cadete);
    if (idsCadetes.length === 0) {
      return {
        gestion: base.periodo.gestion.ano,
        periodo: base.periodo.periodo,
        curso: base.curso.nombre,
        estudiantes: [],
      };
    }
    const [evaluaciones, entrenamiento, disciplina, matrices] =
      await Promise.all([
        this.prisma.notaEvaluacion.findMany({
          where: {
            id_cadete: { in: idsCadetes },
            materia: {
              id_periodo: filtros.id_periodo,
              id_curso: filtros.id_curso,
            },
          },
          include: { materia: true },
          orderBy: { materia: { numero_materia: 'asc' } },
        }),
        this.prisma.notaEntrenamientoFisico.findMany({
          where: {
            id_cadete: { in: idsCadetes },
            planilla: {
              id_periodo: filtros.id_periodo,
              id_curso: filtros.id_curso,
            },
          },
          include: { planilla: true },
        }),
        this.prisma.resultadoFinalDisciplina.findMany({
          where: {
            id_cadete: { in: idsCadetes },
            id_periodo: filtros.id_periodo,
            id_curso: filtros.id_curso,
          },
        }),
        this.prisma.detalleMatrizAcademica.findMany({
          where: {
            id_cadete: { in: idsCadetes },
            matriz: {
              id_curso: filtros.id_curso,
              periodo: { id_gestion: filtros.id_gestion },
              OR: [
                {
                  tipo: TipoMatrizAcademica.SEMESTRAL,
                  id_periodo: filtros.id_periodo,
                },
                { tipo: TipoMatrizAcademica.ANUAL },
              ],
            },
          },
          include: { matriz: { include: { periodo: true } } },
        }),
      ]);
    const referencias = [
      ...evaluaciones.map((nota) => ({
        entidad: 'NotaEvaluacion',
        id: nota.id_nota,
      })),
      ...entrenamiento.map((nota) => ({
        entidad: 'NotaEntrenamientoFisico',
        id: nota.id_nota,
      })),
      ...disciplina.map((nota) => ({
        entidad: 'ResultadoFinalDisciplina',
        id: nota.id_resultado,
      })),
    ];
    const auditorias = referencias.length
      ? await this.prisma.auditoriaAccion.findMany({
          where: {
            OR: referencias.map((referencia) => ({
              entidad: referencia.entidad,
              id_entidad: referencia.id,
              accion: { contains: 'MODIFICAR' },
            })),
          },
          include: {
            usuario: {
              select: { id_usuario: true, nombres: true, apellidos: true },
            },
          },
          orderBy: { fecha: 'desc' },
        })
      : [];
    const auditoriasPorEntidad = new Map<string, typeof auditorias>();
    for (const auditoria of auditorias) {
      const clave = `${auditoria.entidad}:${auditoria.id_entidad}`;
      auditoriasPorEntidad.set(clave, [
        ...(auditoriasPorEntidad.get(clave) ?? []),
        auditoria,
      ]);
    }
    const presentarAuditoria = (entidad: string, id: number) =>
      (auditoriasPorEntidad.get(`${entidad}:${id}`) ?? []).map((auditoria) => {
        const antes = (auditoria.datos_antes ?? {}) as Prisma.JsonObject;
        const despues = (auditoria.datos_despues ?? {}) as Prisma.JsonObject;
        const valorAnterior =
          antes.nota_considerada ??
          antes.nota_final ??
          antes.nota_final_disciplina ??
          null;
        const valorNuevo =
          despues.nota_considerada ??
          despues.nota_final ??
          despues.nota_final_disciplina ??
          null;
        return {
          id_auditoria: auditoria.id_auditoria,
          fecha: auditoria.fecha,
          usuario: `${auditoria.usuario.apellidos} ${auditoria.usuario.nombres}`,
          rol: despues.rol ?? null,
          valor_anterior: valorAnterior,
          valor_nuevo: valorNuevo,
          justificacion: despues.justificacion ?? null,
        };
      });
    const estadosCorregibles: EstadoSemanaDisciplina[] = [
      EstadoSemanaDisciplina.EN_REVISION,
      EstadoSemanaDisciplina.REVISADO,
      EstadoSemanaDisciplina.PUBLICADO,
    ];
    return {
      gestion: base.periodo.gestion.ano,
      periodo: base.periodo.periodo,
      curso: base.curso.nombre,
      estudiantes: cadetes.map((cadete) => ({
        id_cadete: cadete.id_cadete,
        ci: cadete.usuario.ci,
        nombres: cadete.usuario.nombres,
        apellidos: cadete.usuario.apellidos,
        evaluaciones: evaluaciones
          .filter((nota) => nota.id_cadete === cadete.id_cadete)
          .map((nota) => {
            const auditoria = presentarAuditoria('NotaEvaluacion', nota.id_nota);
            return {
              id_nota: nota.id_nota,
              id_materia: nota.id_materia,
              materia: nota.materia.nombre,
              estado: nota.materia.estado,
              nota_inicial: nota.nota_inicial.toFixed(4),
              nota_desquite: nota.nota_desquite?.toFixed(4) ?? null,
              nota_actual: notaConsiderada(
                nota.nota_inicial,
                nota.nota_desquite,
              ).toFixed(4),
              corregible: estadosCorregibles.includes(nota.materia.estado),
              corregida: auditoria.length > 0,
              auditoria,
            };
          }),
        entrenamiento_fisico: entrenamiento
          .filter((nota) => nota.id_cadete === cadete.id_cadete)
          .map((nota) => {
            const auditoria = presentarAuditoria(
              'NotaEntrenamientoFisico',
              nota.id_nota,
            );
            return {
              id_nota: nota.id_nota,
              estado: nota.planilla.estado,
              nota_actual: nota.nota_final?.toFixed(4) ?? null,
              corregible:
                nota.nota_final !== null &&
                estadosCorregibles.includes(nota.planilla.estado),
              corregida: auditoria.length > 0,
              auditoria,
            };
          }),
        disciplina: disciplina
          .filter((nota) => nota.id_cadete === cadete.id_cadete)
          .map((nota) => {
            const auditoria = presentarAuditoria(
              'ResultadoFinalDisciplina',
              nota.id_resultado,
            );
            return {
              id_resultado: nota.id_resultado,
              nota_actual: nota.nota_final_disciplina.toFixed(4),
              corregible: true,
              corregida: auditoria.length > 0,
              auditoria,
            };
          }),
        matrices: matrices
          .filter((detalle) => detalle.id_cadete === cadete.id_cadete)
          .map((detalle) => ({
            id_matriz: detalle.id_matriz,
            tipo: detalle.matriz.tipo,
            estado: detalle.matriz.estado,
            periodo: detalle.matriz.periodo.periodo,
            promedio_academico:
              detalle.promedio_academico?.toFixed(4) ?? null,
            ponderacion_evaluaciones:
              detalle.ponderacion_evaluaciones?.toFixed(4) ?? null,
            ponderacion_entrenamiento:
              detalle.ponderacion_entrenamiento?.toFixed(4) ?? null,
            ponderacion_disciplina:
              detalle.ponderacion_disciplina?.toFixed(4) ?? null,
            promedio_general: detalle.promedio_general.toFixed(4),
            cantidad_aplazos: detalle.cantidad_aplazos,
            atributo: detalle.atributo,
            orden_merito: detalle.orden_merito,
          })),
      })),
    };
  }

  async recalcularPorCorreccion(
    idPeriodo: number,
    idCurso: number,
    idUsuario: number,
    justificacion: string,
  ) {
    const matriz = await this.prisma.matrizAcademica.findUnique({
      where: {
        id_periodo_id_curso_tipo: {
          id_periodo: idPeriodo,
          id_curso: idCurso,
          tipo: TipoMatrizAcademica.SEMESTRAL,
        },
      },
      include: { detalles: true, periodo: true },
    });
    if (!matriz) return { recalculada: false };
    const calculo = await this.calcularSemestral(
      {
        id_gestion: matriz.periodo.id_gestion,
        id_periodo: idPeriodo,
        id_curso: idCurso,
        tipo: TipoMatrizAcademica.SEMESTRAL,
      },
      matriz.detalles.map((detalle) => detalle.id_cadete),
    );
    if (!calculo.completo || calculo.filas.length !== matriz.detalles.length) {
      throw new ConflictException(
        'La fuente fue corregida, pero la matriz requiere revisión porque ya no están completas todas sus fuentes.',
      );
    }
    this.asignarOrden(calculo.filas);
    await this.prisma.$transaction(async (tx) => {
      await tx.detalleMatrizAcademica.updateMany({
        where: { id_matriz: matriz.id_matriz },
        data: { orden_merito: { increment: 10000 } },
      });
      for (const fila of calculo.filas) {
        await tx.detalleMatrizAcademica.update({
          where: {
            id_matriz_id_cadete: {
              id_matriz: matriz.id_matriz,
              id_cadete: fila.id_cadete,
            },
          },
          data: this.aDatosDetalle(fila),
        });
      }
      await this.auditoria.registrar(
        {
          id_usuario: idUsuario,
          accion: 'RECALCULAR_MATRIZ_POR_CORRECCION_EXTRAORDINARIA',
          modulo: 'MATRIZ_ACADEMICA',
          entidad: 'MatrizAcademica',
          id_entidad: matriz.id_matriz,
          descripcion: `Matriz recalculada desde la fuente oficial. Justificación: ${justificacion.trim()}`,
          datos_antes: {
            estado: matriz.estado,
            promedios: matriz.detalles.map((detalle) => ({
              id_cadete: detalle.id_cadete,
              promedio_general: detalle.promedio_general.toFixed(4),
              orden_merito: detalle.orden_merito,
            })),
          } as Prisma.InputJsonObject,
          datos_despues: {
            estado_conservado: matriz.estado,
            promedios: calculo.filas.map((fila) => ({
              id_cadete: fila.id_cadete,
              promedio_general: fila.promedio_general!.toFixed(4),
              orden_merito: fila.orden_merito,
            })),
          } as Prisma.InputJsonObject,
        },
        tx,
      );
    });
    const anual = await this.recalcularAnualPorCorreccion(
      matriz.periodo.id_gestion,
      idCurso,
      idUsuario,
      justificacion,
    );
    return {
      recalculada: true,
      id_matriz: matriz.id_matriz,
      matriz_anual_recalculada: anual.recalculada,
      id_matriz_anual: anual.id_matriz ?? null,
    };
  }

  private async recalcularAnualPorCorreccion(
    idGestion: number,
    idCurso: number,
    idUsuario: number,
    justificacion: string,
  ) {
    const matriz = await this.prisma.matrizAcademica.findFirst({
      where: {
        id_curso: idCurso,
        tipo: TipoMatrizAcademica.ANUAL,
        periodo: { id_gestion: idGestion },
      },
      include: { detalles: true, periodo: true },
    });
    if (!matriz) return { recalculada: false };
    const calculo = await this.calcularAnual({
      id_gestion: idGestion,
      id_periodo: matriz.id_periodo,
      id_curso: idCurso,
      tipo: TipoMatrizAcademica.ANUAL,
    });
    if (!calculo.completo || calculo.filas.length !== matriz.detalles.length) {
      throw new ConflictException(
        'La matriz semestral fue corregida, pero la matriz anual requiere revisión porque sus fuentes ya no están completas.',
      );
    }
    this.asignarOrden(calculo.filas);
    await this.prisma.$transaction(async (tx) => {
      await tx.detalleMatrizAcademica.updateMany({
        where: { id_matriz: matriz.id_matriz },
        data: { orden_merito: { increment: 10000 } },
      });
      for (const fila of calculo.filas) {
        await tx.detalleMatrizAcademica.update({
          where: {
            id_matriz_id_cadete: {
              id_matriz: matriz.id_matriz,
              id_cadete: fila.id_cadete,
            },
          },
          data: this.aDatosDetalle(fila),
        });
      }
      await this.auditoria.registrar(
        {
          id_usuario: idUsuario,
          accion: 'RECALCULAR_MATRIZ_ANUAL_POR_CORRECCION_EXTRAORDINARIA',
          modulo: 'MATRIZ_ACADEMICA',
          entidad: 'MatrizAcademica',
          id_entidad: matriz.id_matriz,
          descripcion: `Matriz anual recalculada desde sus matrices semestrales oficiales. Justificación: ${justificacion.trim()}`,
          datos_antes: {
            estado: matriz.estado,
            promedios: matriz.detalles.map((detalle) => ({
              id_cadete: detalle.id_cadete,
              promedio_general: detalle.promedio_general.toFixed(4),
              orden_merito: detalle.orden_merito,
            })),
          } as Prisma.InputJsonObject,
          datos_despues: {
            estado_conservado: matriz.estado,
            promedios: calculo.filas.map((fila) => ({
              id_cadete: fila.id_cadete,
              promedio_general: fila.promedio_general!.toFixed(4),
              orden_merito: fila.orden_merito,
            })),
          } as Prisma.InputJsonObject,
        },
        tx,
      );
    });
    return { recalculada: true, id_matriz: matriz.id_matriz };
  }

  private async calcularSemestral(
    dto: SeleccionarMatrizAcademicaDto,
    idsCohorte?: number[],
  ) {
    const [configuracion, materias, disciplina, planilla, cadetes] =
      await Promise.all([
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
        this.prisma.resultadoFinalDisciplina.findMany({
          where: { id_periodo: dto.id_periodo, id_curso: dto.id_curso },
        }),
        this.prisma.planillaEntrenamientoFisico.findUnique({
          where: {
            id_periodo_id_curso: {
              id_periodo: dto.id_periodo,
              id_curso: dto.id_curso,
            },
          },
          include: { notas: true },
        }),
        this.prisma.cadete.findMany({
          where: idsCohorte
            ? { id_cadete: { in: idsCohorte } }
            : { id_curso: dto.id_curso },
          include: { usuario: true },
          orderBy: [{ usuario: { apellidos: 'asc' } }, { id_cadete: 'asc' }],
        }),
      ]);
    const envioEf = planilla
      ? await this.prisma.notificacion.findFirst({
          where: {
            area: 'ENTRENAMIENTO_FISICO',
            tipo: 'NOTAS_FINALES_ENTRENAMIENTO_FISICO',
            id_referencia: planilla.id_planilla,
            clave_evento: {
              startsWith: `ENTRENAMIENTO_FISICO:RESULTADO_FINAL:${planilla.id_planilla}:`,
            },
          },
        })
      : null;
    const evaluacionesCompleto = Boolean(
      configuracion?.activo &&
        configuracion.cantidad_materias > 0 &&
        materias.length === configuracion.cantidad_materias,
    );
    const disciplinaCompleto =
      disciplina.length === cadetes.length &&
      disciplina.length > 0 &&
      disciplina.every((fila) => fila.fecha_envio_evaluaciones);
    const entrenamientoCompleto = Boolean(
      planilla &&
        planilla.estado === EstadoSemanaDisciplina.REVISADO &&
        envioEf?.id_referencia === planilla.id_planilla &&
        planilla.notas.length === cadetes.length &&
        planilla.notas.every((nota) => nota.nota_final !== null),
    );
    const notasMateria = new Map(
      materias.flatMap((materia) =>
        materia.notas.map((nota) => [`${materia.id_materia}:${nota.id_cadete}`, nota] as const),
      ),
    );
    const disciplinaPorCadete = new Map(
      disciplina.map((fila) => [fila.id_cadete, fila] as const),
    );
    const entrenamientoPorCadete = new Map(
      (planilla?.notas ?? []).map((fila) => [fila.id_cadete, fila] as const),
    );
    const antecedentes = await this.obtenerAntecedentes(
      cadetes.map((cadete) => cadete.id_cadete),
      dto.id_gestion,
    );
    const filas: FilaCalculada[] = cadetes.map((cadete) => {
      const valores = materias.flatMap((materia) => {
        const nota = notasMateria.get(`${materia.id_materia}:${cadete.id_cadete}`);
        return nota ? [notaConsiderada(nota.nota_inicial, nota.nota_desquite)] : [];
      });
      const tieneTodas = evaluacionesCompleto && valores.length === materias.length;
      const promedioAcademico = tieneTodas
        ? valores
            .reduce((suma, valor) => suma.plus(valor), new Prisma.Decimal(0))
            .dividedBy(valores.length)
            .toDecimalPlaces(4)
        : null;
      const ponderacionEvaluaciones = promedioAcademico
        ?.times('0.80')
        .toDecimalPlaces(4) ?? null;
      const notaEf = entrenamientoCompleto
        ? entrenamientoPorCadete.get(cadete.id_cadete)?.nota_final ?? null
        : null;
      const ponderacionEf = notaEf?.times('0.10').toDecimalPlaces(4) ?? null;
      const notaDisciplina = disciplinaCompleto
        ? disciplinaPorCadete.get(cadete.id_cadete)?.nota_final_disciplina ?? null
        : null;
      const ponderacionDisciplina =
        notaDisciplina?.times('0.10').toDecimalPlaces(4) ?? null;
      const promedioGeneral =
        ponderacionEvaluaciones && ponderacionEf && ponderacionDisciplina
          ? ponderacionEvaluaciones
              .plus(ponderacionEf)
              .plus(ponderacionDisciplina)
              .toDecimalPlaces(4)
          : null;
      const aplazos = tieneTodas
        ? valores.filter((valor) => valor.lessThanOrEqualTo(50)).length
        : null;
      const previos = antecedentes.get(cadete.id_cadete) ?? [];
      const promedioAcumulado = promedioGeneral
        ? [...previos.map((item) => item.promedio), promedioGeneral]
            .reduce((suma, valor) => suma.plus(valor), new Prisma.Decimal(0))
            .dividedBy(previos.length + 1)
            .toDecimalPlaces(4)
        : null;
      const aplazosAcumulados =
        aplazos === null
          ? null
          : previos.reduce((suma, item) => suma + item.aplazos, aplazos);
      return {
        id_cadete: cadete.id_cadete,
        ci: cadete.usuario.ci,
        nombres: cadete.usuario.nombres,
        apellidos: cadete.usuario.apellidos,
        materias: materias.map((materia) => {
          const nota = notasMateria.get(`${materia.id_materia}:${cadete.id_cadete}`);
          return {
            id_materia: materia.id_materia,
            nombre: materia.nombre,
            nota: nota
              ? notaConsiderada(nota.nota_inicial, nota.nota_desquite).toFixed(4)
              : null,
          };
        }),
        promedio_academico: promedioAcademico,
        ponderacion_evaluaciones: ponderacionEvaluaciones,
        nota_entrenamiento_fisico: notaEf,
        ponderacion_entrenamiento: ponderacionEf,
        nota_disciplina: notaDisciplina,
        ponderacion_disciplina: ponderacionDisciplina,
        promedio_general: promedioGeneral,
        cantidad_aplazos: aplazos,
        promedio_acumulado: promedioAcumulado,
        cantidad_aplazos_acumulados: aplazosAcumulados,
        atributo: promedioAcumulado ? clasificarNota(promedioAcumulado) : null,
        orden_merito: null,
      };
    });
    const completo =
      evaluacionesCompleto && disciplinaCompleto && entrenamientoCompleto;
    if (completo) this.asignarOrden(filas);
    return {
      disponibilidad: {
        evaluaciones: evaluacionesCompleto ? 'COMPLETO' : 'PENDIENTE',
        disciplina: disciplinaCompleto ? 'COMPLETO' : 'PENDIENTE',
        entrenamiento_fisico: entrenamientoCompleto ? 'COMPLETO' : 'PENDIENTE',
      },
      completo,
      filas,
    };
  }

  private async calcularAnual(dto: SeleccionarMatrizAcademicaDto) {
    const base = await this.validarSeleccion(dto);
    if (base.periodo.periodo !== 'II') {
      throw new BadRequestException(
        'La matriz anual se genera únicamente desde el cierre del periodo II.',
      );
    }
    const semestrales = await this.prisma.matrizAcademica.findMany({
      where: {
        id_curso: dto.id_curso,
        tipo: TipoMatrizAcademica.SEMESTRAL,
        estado: EstadoMatrizAcademica.PUBLICADO,
        periodo: { id_gestion: dto.id_gestion },
      },
      include: { detalles: true, periodo: true },
    });
    const matrizI = semestrales.find((matriz) => matriz.periodo.periodo === 'I');
    const matrizII = semestrales.find((matriz) => matriz.periodo.periodo === 'II');
    const completo = Boolean(matrizI && matrizII);
    if (!completo) {
      return {
        disponibilidad: {
          semestre_i: matrizI ? 'PUBLICADO' : 'PENDIENTE',
          semestre_ii: matrizII ? 'PUBLICADO' : 'PENDIENTE',
        },
        completo: false,
        filas: [] as FilaCalculada[],
      };
    }
    const detallesII = new Map(matrizII!.detalles.map((d) => [d.id_cadete, d]));
    const cadetes = await this.prisma.cadete.findMany({
      where: { id_cadete: { in: matrizI!.detalles.map((d) => d.id_cadete) } },
      include: { usuario: true },
    });
    const antecedentes = await this.obtenerAntecedentes(
      cadetes.map((cadete) => cadete.id_cadete),
      dto.id_gestion,
    );
    const filas: FilaCalculada[] = matrizI!.detalles.flatMap((detalleI) => {
      const detalleII = detallesII.get(detalleI.id_cadete);
      const cadete = cadetes.find((item) => item.id_cadete === detalleI.id_cadete);
      if (!detalleII || !cadete) return [];
      const promedioGestion = detalleI.promedio_general
        .plus(detalleII.promedio_general)
        .dividedBy(2)
        .toDecimalPlaces(4);
      const aplazosGestion = detalleI.cantidad_aplazos + detalleII.cantidad_aplazos;
      const previos = antecedentes.get(cadete.id_cadete) ?? [];
      const promedioAcumulado = [...previos.map((item) => item.promedio), promedioGestion]
        .reduce((suma, valor) => suma.plus(valor), new Prisma.Decimal(0))
        .dividedBy(previos.length + 1)
        .toDecimalPlaces(4);
      return [{
        id_cadete: cadete.id_cadete,
        ci: cadete.usuario.ci,
        nombres: cadete.usuario.nombres,
        apellidos: cadete.usuario.apellidos,
        materias: [],
        promedio_academico: null,
        ponderacion_evaluaciones: null,
        nota_entrenamiento_fisico: null,
        ponderacion_entrenamiento: null,
        nota_disciplina: null,
        ponderacion_disciplina: null,
        promedio_general: promedioGestion,
        cantidad_aplazos: aplazosGestion,
        promedio_acumulado: promedioAcumulado,
        cantidad_aplazos_acumulados: previos.reduce(
          (suma, item) => suma + item.aplazos,
          aplazosGestion,
        ),
        atributo: clasificarNota(promedioAcumulado),
        orden_merito: null,
      }];
    });
    this.asignarOrden(filas);
    return {
      disponibilidad: { semestre_i: 'PUBLICADO', semestre_ii: 'PUBLICADO' },
      completo: filas.length > 0 && filas.length === matrizI!.detalles.length,
      filas,
    };
  }

  private async obtenerAntecedentes(idsCadetes: number[], idGestionActual: number) {
    const gestion = await this.prisma.gestionAcademica.findUnique({
      where: { id_gestion: idGestionActual },
    });
    if (!gestion) throw new NotFoundException('Gestión no encontrada.');
    const [oficiales, manuales] = await Promise.all([
      this.prisma.detalleMatrizAcademica.findMany({
        where: {
          id_cadete: { in: idsCadetes },
          matriz: {
            tipo: TipoMatrizAcademica.ANUAL,
            estado: EstadoMatrizAcademica.PUBLICADO,
            periodo: { gestion: { ano: { lt: gestion.ano } } },
          },
        },
        include: { matriz: { include: { periodo: { include: { gestion: true } } } } },
      }),
      this.prisma.antecedenteAcademicoCadete.findMany({
        where: { id_cadete: { in: idsCadetes }, gestion: { lt: gestion.ano } },
      }),
    ]);
    const mapa = new Map<
      number,
      Array<{ gestion: number; promedio: Prisma.Decimal; aplazos: number }>
    >();
    for (const detalle of oficiales) {
      const lista = mapa.get(detalle.id_cadete) ?? [];
      lista.push({
        gestion: detalle.matriz.periodo.gestion.ano,
        promedio: detalle.promedio_general,
        aplazos: detalle.cantidad_aplazos,
      });
      mapa.set(detalle.id_cadete, lista);
    }
    for (const manual of manuales) {
      const lista = mapa.get(manual.id_cadete) ?? [];
      if (!lista.some((item) => item.gestion === manual.gestion)) {
        lista.push({
          gestion: manual.gestion,
          promedio: manual.promedio_general,
          aplazos: manual.cantidad_aplazos,
        });
      }
      mapa.set(manual.id_cadete, lista);
    }
    return mapa;
  }

  private asignarOrden(filas: FilaCalculada[]) {
    this.exigirSinEmpates(filas);
    const ordenadas = [...filas].sort((a, b) => {
      const porAplazos = a.cantidad_aplazos! - b.cantidad_aplazos!;
      return (
        porAplazos ||
        b.promedio_general!.comparedTo(a.promedio_general!)
      );
    });
    ordenadas.forEach((fila, indice) => (fila.orden_merito = indice + 1));
  }

  private exigirSinEmpates(filas: FilaCalculada[]) {
    const grupos = new Map<string, number[]>();
    for (const fila of filas) {
      const clave = `${fila.cantidad_aplazos!}:${fila.promedio_general!.toFixed(4)}`;
      grupos.set(clave, [...(grupos.get(clave) ?? []), fila.id_cadete]);
    }
    const empates = [...grupos.entries()]
      .filter(([, ids]) => ids.length > 1)
      .map(([clave, ids]) => {
        const [aplazos, promedio] = clave.split(':');
        return {
          cantidad_aplazos: Number(aplazos),
          promedio_general: promedio,
          ids_cadetes: ids,
        };
      });
    if (empates.length) {
      throw new ConflictException({
        message:
          'Existen estudiantes con igual cantidad de aplazos y el mismo promedio general a cuatro decimales. No se inventó un criterio de desempate; la institución debe definirlo.',
        empates,
      });
    }
  }

  private async transicionar(
    idUsuario: number,
    idMatriz: number,
    accion: 'ENVIAR' | 'APROBAR' | 'OBSERVAR' | 'PUBLICAR',
    observacion?: string,
  ) {
    const matriz = await this.prisma.matrizAcademica.findUnique({
      where: { id_matriz: idMatriz },
      include: { periodo: { include: { gestion: true } }, curso: true, detalles: true },
    });
    if (!matriz) throw new NotFoundException('Matriz académica no encontrada.');
    if (
      accion === 'PUBLICAR' &&
      matriz.tipo === TipoMatrizAcademica.ANUAL
    ) {
      throw new ConflictException(
        'La publicación anual y la promoción permanecen bloqueadas hasta que la institución defina expresamente sus criterios de promoción. El estado REGULAR no se utilizará como criterio académico.',
      );
    }
    const perfil = await this.validaciones.validarAccesoCursoEvaluaciones(
      idUsuario,
      matriz.id_curso,
      accion === 'ENVIAR' || accion === 'PUBLICAR' ? 'REGISTRO' : 'LECTURA',
    );
    let estadoNuevo: EstadoMatrizAcademica;
    let nivelNuevo: NivelRevisionNota | null;
    if (accion === 'ENVIAR') {
      this.validaciones.exigirTipo(perfil, 'ENCARGADO_EVALUACIONES');
      this.validaciones.exigirPermiso(perfil, PERMISOS_NOTAS.ENVIAR);
      if (
        matriz.estado !== EstadoMatrizAcademica.BORRADOR &&
        matriz.estado !== EstadoMatrizAcademica.OBSERVADO
      ) {
        throw new ConflictException('La matriz no está disponible para envío.');
      }
      estadoNuevo = EstadoMatrizAcademica.EN_REVISION;
      nivelNuevo = NivelRevisionNota.SECCION_ACADEMICA;
    } else if (accion === 'APROBAR') {
      this.validaciones.exigirPermiso(perfil, PERMISOS_NOTAS.REVISAR);
      if (matriz.estado !== EstadoMatrizAcademica.EN_REVISION) {
        throw new ConflictException('La matriz no está en revisión.');
      }
      if (
        matriz.nivel_revision_actual === NivelRevisionNota.SECCION_ACADEMICA &&
        perfil.tipo === 'SECCION_ACADEMICA'
      ) {
        estadoNuevo = EstadoMatrizAcademica.EN_REVISION;
        nivelNuevo = NivelRevisionNota.JEFE_ESTUDIOS;
      } else if (
        matriz.nivel_revision_actual === NivelRevisionNota.JEFE_ESTUDIOS &&
        perfil.tipo === 'JEFE_ESTUDIOS'
      ) {
        estadoNuevo = EstadoMatrizAcademica.APROBADO;
        nivelNuevo = null;
      } else {
        throw new ForbiddenException('La matriz no corresponde a su nivel de revisión.');
      }
    } else if (accion === 'OBSERVAR') {
      this.validaciones.exigirPermiso(perfil, PERMISOS_NOTAS.OBSERVAR);
      if (
        matriz.estado !== EstadoMatrizAcademica.EN_REVISION ||
        !(
          (matriz.nivel_revision_actual === NivelRevisionNota.SECCION_ACADEMICA &&
            perfil.tipo === 'SECCION_ACADEMICA') ||
          (matriz.nivel_revision_actual === NivelRevisionNota.JEFE_ESTUDIOS &&
            perfil.tipo === 'JEFE_ESTUDIOS')
        )
      ) {
        throw new ForbiddenException('La matriz no corresponde a su nivel de revisión.');
      }
      estadoNuevo = EstadoMatrizAcademica.OBSERVADO;
      nivelNuevo = NivelRevisionNota.ENCARGADO_AREA;
    } else {
      this.validaciones.exigirTipo(perfil, 'ENCARGADO_EVALUACIONES');
      this.validaciones.exigirPermiso(perfil, PERMISOS_NOTAS.PUBLICAR);
      if (matriz.estado !== EstadoMatrizAcademica.APROBADO) {
        throw new ConflictException('Solo una matriz aprobada por Jefatura puede publicarse.');
      }
      estadoNuevo = EstadoMatrizAcademica.PUBLICADO;
      nivelNuevo = null;
    }

    await this.prisma.$transaction(async (tx) => {
      const ahora = new Date();
      const actualizada = await tx.matrizAcademica.updateMany({
        where: {
          id_matriz: idMatriz,
          estado: matriz.estado,
          nivel_revision_actual: matriz.nivel_revision_actual,
          version_flujo: matriz.version_flujo,
        },
        data: {
          estado: estadoNuevo,
          nivel_revision_actual: nivelNuevo,
          version_flujo: { increment: 1 },
          fecha_envio: accion === 'ENVIAR' ? ahora : undefined,
          fecha_revision: accion === 'APROBAR' || accion === 'OBSERVAR' ? ahora : undefined,
          fecha_aprobacion:
            accion === 'APROBAR' && estadoNuevo === EstadoMatrizAcademica.APROBADO
              ? ahora
              : undefined,
          fecha_publicacion: accion === 'PUBLICAR' ? ahora : undefined,
        },
      });
      if (actualizada.count !== 1) {
        throw new ConflictException('La matriz cambió de estado; actualice la pantalla.');
      }
      await this.auditoria.registrar(
        {
          id_usuario: idUsuario,
          accion: `${accion}_MATRIZ_ACADEMICA`,
          modulo: 'MATRIZ_ACADEMICA',
          entidad: 'MatrizAcademica',
          id_entidad: idMatriz,
          descripcion: observacion
            ? `${accion}. Observación: ${observacion}`
            : `${accion} de matriz académica.`,
          datos_antes: {
            estado: matriz.estado,
            nivel_revision_actual: matriz.nivel_revision_actual,
            version_flujo: matriz.version_flujo,
          },
          datos_despues: {
            estado: estadoNuevo,
            nivel_revision_actual: nivelNuevo,
            version_flujo: matriz.version_flujo + 1,
            observacion: observacion ?? null,
          },
        },
        tx,
      );
      if (accion === 'PUBLICAR') {
        const notificaciones = matriz.detalles.map((detalle) => ({
          id_usuario_destinatario: 0,
          id_cadete: detalle.id_cadete,
        }));
        const cadetes = await tx.cadete.findMany({
          where: { id_cadete: { in: notificaciones.map((item) => item.id_cadete) } },
          select: { id_cadete: true, id_usuario: true },
        });
        await this.notificaciones.crearMuchasUnicas(
          cadetes.map((cadete) => ({
            id_usuario_destinatario: cadete.id_usuario,
            id_usuario_emisor: idUsuario,
            modulo: ModuloNotificacion.ACADEMICO,
            area: 'EVALUACIONES',
            tipo: 'MATRIZ_ACADEMICA_PUBLICADA',
            titulo: 'Matriz académica publicada',
            mensaje: `Ya puede consultar su matriz ${matriz.tipo.toLowerCase()} ${matriz.periodo.periodo}/${matriz.periodo.gestion.ano}.`,
            id_referencia: matriz.id_matriz,
            ruta_destino: '/mis-notas/evaluaciones',
            clave_evento: `MATRIZ_ACADEMICA:${matriz.id_matriz}:${matriz.version_flujo + 1}:${cadete.id_usuario}`,
          })),
          tx,
        );
      }
    });
    return this.consultar(idUsuario, {
      id_gestion: matriz.periodo.id_gestion,
      id_periodo: matriz.id_periodo,
      id_curso: matriz.id_curso,
      tipo: matriz.tipo,
    });
  }

  private async validarSeleccion(dto: SeleccionarMatrizAcademicaDto) {
    const [periodo, curso] = await Promise.all([
      this.prisma.periodoLectivo.findUnique({
        where: { id_periodo: dto.id_periodo },
        include: { gestion: true },
      }),
      this.prisma.curso.findUnique({ where: { id_curso: dto.id_curso } }),
    ]);
    if (!periodo || periodo.id_gestion !== dto.id_gestion) {
      throw new BadRequestException('El periodo no corresponde a la gestión.');
    }
    if (!curso || curso.orden < 1 || curso.orden > 3) {
      throw new BadRequestException('Curso académico inválido.');
    }
    return { periodo, curso };
  }

  private incluirMatriz() {
    return {
      periodo: { include: { gestion: true } },
      curso: true,
      detalles: {
        include: { cadete: { include: { usuario: true } } },
        orderBy: { orden_merito: 'asc' as const },
      },
    };
  }

  private async presentarMatriz(matriz: any, perfil: string) {
    const materiasPorCadete =
      matriz.tipo === TipoMatrizAcademica.SEMESTRAL
        ? await this.materiasDeMatriz(
            matriz.id_periodo,
            matriz.id_curso,
            matriz.detalles.map((detalle: any) => detalle.id_cadete),
          )
        : new Map<number, Array<{ id_materia: number; nombre: string; nota: string }>>();
    return {
      id_matriz: matriz.id_matriz,
      tipo: matriz.tipo,
      estado: matriz.estado,
      nivel_revision_actual: matriz.nivel_revision_actual,
      version_flujo: matriz.version_flujo,
      gestion: matriz.periodo.gestion.ano,
      periodo: matriz.periodo.periodo,
      curso: matriz.curso.nombre,
      disponibilidad: { snapshot_oficial: 'COMPLETO' },
      completo: true,
      fecha_publicacion: matriz.fecha_publicacion,
      acciones: {
        generar: false,
        enviar:
          perfil === 'ENCARGADO_EVALUACIONES' &&
          [EstadoMatrizAcademica.BORRADOR, EstadoMatrizAcademica.OBSERVADO].includes(matriz.estado),
        aprobar:
          matriz.estado === EstadoMatrizAcademica.EN_REVISION &&
          ((perfil === 'SECCION_ACADEMICA' && matriz.nivel_revision_actual === NivelRevisionNota.SECCION_ACADEMICA) ||
            (perfil === 'JEFE_ESTUDIOS' && matriz.nivel_revision_actual === NivelRevisionNota.JEFE_ESTUDIOS)),
        observar:
          matriz.estado === EstadoMatrizAcademica.EN_REVISION &&
          ((perfil === 'SECCION_ACADEMICA' && matriz.nivel_revision_actual === NivelRevisionNota.SECCION_ACADEMICA) ||
            (perfil === 'JEFE_ESTUDIOS' && matriz.nivel_revision_actual === NivelRevisionNota.JEFE_ESTUDIOS)),
        publicar:
          perfil === 'ENCARGADO_EVALUACIONES' &&
          matriz.estado === EstadoMatrizAcademica.APROBADO,
      },
      filas: matriz.detalles.map((detalle: any) => ({
        id_cadete: detalle.id_cadete,
        ci: detalle.cadete.usuario.ci,
        nombres: detalle.cadete.usuario.nombres,
        apellidos: detalle.cadete.usuario.apellidos,
        materias: materiasPorCadete.get(detalle.id_cadete) ?? [],
        ...this.presentarDetallePersistido(detalle),
      })),
    };
  }

  private presentarDetallePersistido(detalle: any) {
    return {
      promedio_academico: detalle.promedio_academico?.toFixed(4) ?? null,
      ponderacion_evaluaciones: detalle.ponderacion_evaluaciones?.toFixed(4) ?? null,
      nota_entrenamiento_fisico: detalle.nota_entrenamiento_fisico?.toFixed(4) ?? null,
      ponderacion_entrenamiento: detalle.ponderacion_entrenamiento?.toFixed(4) ?? null,
      nota_disciplina: detalle.nota_disciplina?.toFixed(4) ?? null,
      ponderacion_disciplina: detalle.ponderacion_disciplina?.toFixed(4) ?? null,
      promedio_general: detalle.promedio_general.toFixed(4),
      cantidad_aplazos: detalle.cantidad_aplazos,
      promedio_acumulado: detalle.promedio_acumulado.toFixed(4),
      cantidad_aplazos_acumulados: detalle.cantidad_aplazos_acumulados,
      atributo: detalle.atributo,
      orden_merito: detalle.orden_merito,
    };
  }

  private presentarFila(fila: FilaCalculada) {
    const decimal = (valor: Prisma.Decimal | null) => valor?.toFixed(4) ?? null;
    return {
      ...fila,
      promedio_academico: decimal(fila.promedio_academico),
      ponderacion_evaluaciones: decimal(fila.ponderacion_evaluaciones),
      nota_entrenamiento_fisico: decimal(fila.nota_entrenamiento_fisico),
      ponderacion_entrenamiento: decimal(fila.ponderacion_entrenamiento),
      nota_disciplina: decimal(fila.nota_disciplina),
      ponderacion_disciplina: decimal(fila.ponderacion_disciplina),
      promedio_general: decimal(fila.promedio_general),
      promedio_acumulado: decimal(fila.promedio_acumulado),
    };
  }

  private aDatosDetalle(fila: FilaCalculada): Prisma.DetalleMatrizAcademicaUncheckedCreateWithoutMatrizInput {
    return {
      id_cadete: fila.id_cadete,
      promedio_academico: fila.promedio_academico,
      ponderacion_evaluaciones: fila.ponderacion_evaluaciones,
      nota_entrenamiento_fisico: fila.nota_entrenamiento_fisico,
      ponderacion_entrenamiento: fila.ponderacion_entrenamiento,
      nota_disciplina: fila.nota_disciplina,
      ponderacion_disciplina: fila.ponderacion_disciplina,
      promedio_general: fila.promedio_general!,
      cantidad_aplazos: fila.cantidad_aplazos!,
      promedio_acumulado: fila.promedio_acumulado!,
      cantidad_aplazos_acumulados: fila.cantidad_aplazos_acumulados!,
      atributo: fila.atributo!,
      orden_merito: fila.orden_merito!,
    };
  }

  private async materiasCadete(idPeriodo: number, idCurso: number, idCadete: number) {
    const materias = await this.prisma.materiaEvaluacion.findMany({
      where: {
        id_periodo: idPeriodo,
        id_curso: idCurso,
        estado: EstadoSemanaDisciplina.PUBLICADO,
        notas: { some: { id_cadete: idCadete } },
      },
      include: { notas: { where: { id_cadete: idCadete } } },
      orderBy: { numero_materia: 'asc' },
    });
    return materias.map((materia) => ({
      nombre: materia.nombre,
      nota: notaConsiderada(
        materia.notas[0].nota_inicial,
        materia.notas[0].nota_desquite,
      ).toFixed(4),
    }));
  }

  private async materiasDeMatriz(
    idPeriodo: number,
    idCurso: number,
    idsCadetes: number[],
  ) {
    const materias = await this.prisma.materiaEvaluacion.findMany({
      where: {
        id_periodo: idPeriodo,
        id_curso: idCurso,
        estado: EstadoSemanaDisciplina.PUBLICADO,
      },
      include: { notas: { where: { id_cadete: { in: idsCadetes } } } },
      orderBy: { numero_materia: 'asc' },
    });
    const resultado = new Map<
      number,
      Array<{ id_materia: number; nombre: string; nota: string }>
    >();
    for (const materia of materias) {
      for (const nota of materia.notas) {
        const lista = resultado.get(nota.id_cadete) ?? [];
        lista.push({
          id_materia: materia.id_materia,
          nombre: materia.nombre,
          nota: notaConsiderada(nota.nota_inicial, nota.nota_desquite).toFixed(4),
        });
        resultado.set(nota.id_cadete, lista);
      }
    }
    return resultado;
  }
}
