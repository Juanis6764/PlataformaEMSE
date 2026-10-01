import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EstadoSemanaDisciplina, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditoriaService } from '../../auditoria/auditoria.service';
import { NotificacionesNotasService } from '../comun/notificaciones-notas.service';
import { PERMISOS_NOTAS } from '../comun/constantes-notas';
import {
  PerfilNotas,
  ValidacionesNotasService,
} from '../comun/validaciones-notas.service';
import { SeleccionarResultadoFinalDisciplinaDto } from './dto/consulta-disciplina.dto';
import { ConsultasDisciplinaService } from './consultas-disciplina.service';
import { ModificarResultadoFinalDisciplinaDto } from './dto/consulta-disciplina.dto';
import { MatricesAcademicasService } from '../matrices-academicas/matrices-academicas.service';

@Injectable()
export class ResultadosFinalesDisciplinaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly validaciones: ValidacionesNotasService,
    private readonly consultas: ConsultasDisciplinaService,
    private readonly auditoria: AuditoriaService,
    private readonly notificaciones: NotificacionesNotasService,
    private readonly matrices?: MatricesAcademicasService,
  ) {}

  async modificarExtraordinariamente(
    idUsuario: number,
    idResultado: number,
    dto: ModificarResultadoFinalDisciplinaDto,
  ) {
    const actual = await this.prisma.resultadoFinalDisciplina.findUnique({
      where: { id_resultado: idResultado },
      include: {
        cadete: { include: { usuario: true } },
        periodo: { include: { gestion: true } },
        curso: true,
      },
    });
    if (!actual) {
      throw new NotFoundException('Resultado final de Disciplina no encontrado.');
    }
    const perfil = await this.validaciones.validarAccesoCurso(
      idUsuario,
      actual.id_curso,
      'LECTURA',
    );
    this.validaciones.exigirTipo(
      perfil,
      'JEFE_ESTUDIOS',
      'SECCION_ACADEMICA',
      'COMANDO',
    );
    this.validaciones.exigirPermiso(perfil, PERMISOS_NOTAS.MODIFICAR_BLOQUEADA);
    const nueva = new Prisma.Decimal(dto.nota_final).toDecimalPlaces(4);
    if (actual.nota_final_disciplina.equals(nueva)) {
      return {
        id_resultado: actual.id_resultado,
        nota_final_disciplina: actual.nota_final_disciplina.toFixed(4),
      };
    }
    const resultado = await this.prisma.$transaction(async (tx) => {
      const actualizado = await tx.resultadoFinalDisciplina.update({
        where: { id_resultado: idResultado },
        data: { nota_final_disciplina: nueva },
      });
      await this.auditoria.registrar(
        {
          id_usuario: idUsuario,
          accion: 'MODIFICAR_RESULTADO_FINAL_DISCIPLINA_BLOQUEADO',
          modulo: 'NOTAS_DISCIPLINA',
          entidad: 'ResultadoFinalDisciplina',
          id_entidad: idResultado,
          descripcion: `Corrección extraordinaria de la nota final de Disciplina. Justificación: ${dto.justificacion.trim()}`,
          datos_antes: {
            nota_final_disciplina: actual.nota_final_disciplina.toFixed(4),
          },
          datos_despues: {
            nota_final_disciplina: nueva.toFixed(4),
            rol: perfil.tipo,
            id_cadete: actual.id_cadete,
            gestion: actual.periodo.gestion.ano,
            id_gestion: actual.periodo.id_gestion,
            periodo: actual.periodo.periodo,
            id_periodo: actual.id_periodo,
            curso: actual.curso.nombre,
            id_curso: actual.id_curso,
            area: 'DISCIPLINA',
            concepto: 'Nota final oficial de Disciplina',
            justificacion: dto.justificacion.trim(),
          },
        },
        tx,
      );
      return actualizado;
    });
    await this.matrices?.recalcularPorCorreccion(
      actual.id_periodo,
      actual.id_curso,
      idUsuario,
      dto.justificacion.trim(),
    );
    return {
      id_resultado: resultado.id_resultado,
      nota_final_disciplina: resultado.nota_final_disciplina.toFixed(4),
    };
  }

  async consultar(
    idUsuario: number,
    dto: SeleccionarResultadoFinalDisciplinaDto,
  ) {
    const base = await this.obtenerBase(idUsuario, dto);
    const acumulado = base.completo
      ? await this.consultas.acumulado(idUsuario, dto)
      : null;
    const acumuladoPorCadete = new Map(
      (acumulado?.cadetes ?? []).map((cadete) => [cadete.id_cadete, cadete]),
    );
    const publicados = await this.prisma.resultadoFinalDisciplina.findMany({
      where: { id_periodo: dto.id_periodo, id_curso: dto.id_curso },
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
    });
    let filas: Array<{
      id_cadete: number;
      ci: string;
      nombres: string;
      apellidos: string;
      curso: string;
      total_demeritos: string;
      total_meritos: string;
      demerito_neto: string;
      nota_final_disciplina: string;
    }> = [];
    if (publicados.length > 0) {
      filas = publicados.map((resultado) => {
        const totales = acumuladoPorCadete.get(resultado.id_cadete);
        return {
          id_cadete: resultado.id_cadete,
          ci: resultado.cadete.usuario.ci,
          nombres: resultado.cadete.usuario.nombres,
          apellidos: resultado.cadete.usuario.apellidos,
          curso: base.configuracion.curso.nombre,
          total_demeritos: totales?.total_demeritos ?? '0.0000',
          total_meritos: totales?.total_meritos ?? '0.0000',
          demerito_neto: totales?.demerito_neto ?? '0.0000',
          nota_final_disciplina: resultado.nota_final_disciplina.toFixed(4),
        };
      });
    } else if (base.completo) {
      filas = acumulado!.cadetes.map((cadete) => ({
        id_cadete: cadete.id_cadete,
        ci: cadete.ci,
        nombres: cadete.nombres,
        apellidos: cadete.apellidos,
        curso: cadete.grado,
        total_demeritos: cadete.total_demeritos,
        total_meritos: cadete.total_meritos,
        demerito_neto: cadete.demerito_neto,
        nota_final_disciplina: cadete.nota,
      }));
    }

    const publicado = publicados.length > 0;
    const enviadoEvaluaciones =
      publicado &&
      publicados.every((resultado) => resultado.fecha_envio_evaluaciones);
    return {
      id_configuracion: base.configuracion.id_configuracion,
      id_gestion: dto.id_gestion,
      gestion: base.configuracion.periodo.gestion.ano,
      id_periodo: dto.id_periodo,
      periodo: base.configuracion.periodo.periodo,
      id_curso: dto.id_curso,
      curso: base.configuracion.curso.nombre,
      semanas_configuradas: base.configuracion.cantidad_semanas,
      semanas_existentes: base.semanasExistentes,
      semanas_publicadas: base.semanasPublicadas,
      completo: base.completo,
      publicado,
      enviado_evaluaciones: enviadoEvaluaciones,
      fecha_publicacion: publicados[0]?.fecha_publicacion ?? null,
      fecha_envio_evaluaciones: publicados[0]?.fecha_envio_evaluaciones ?? null,
      puede_publicar:
        base.completo &&
        !publicado &&
        base.perfil.tipo === 'ENCARGADO_DISCIPLINA',
      puede_enviar_evaluaciones:
        base.completo &&
        !enviadoEvaluaciones &&
        base.perfil.tipo === 'ENCARGADO_DISCIPLINA',
      filas,
    };
  }

  async publicar(
    idUsuario: number,
    dto: SeleccionarResultadoFinalDisciplinaDto,
  ) {
    const base = await this.obtenerBase(idUsuario, dto);
    this.exigirEncargado(base.perfil);
    this.validaciones.exigirPermiso(base.perfil, PERMISOS_NOTAS.PUBLICAR);
    if (!base.completo) {
      throw new ConflictException(
        'Las notas finales solo pueden publicarse cuando todas las semanas configuradas existen y están PUBLICADO.',
      );
    }

    const existentes = await this.prisma.resultadoFinalDisciplina.count({
      where: { id_periodo: dto.id_periodo, id_curso: dto.id_curso },
    });
    if (existentes > 0) return this.consultar(idUsuario, dto);

    const acumulado = await this.consultas.acumulado(idUsuario, dto);
    await this.prisma.$transaction(async (tx) => {
      await tx.resultadoFinalDisciplina.createMany({
        data: acumulado.cadetes.map((cadete) => ({
          id_cadete: cadete.id_cadete,
          id_periodo: dto.id_periodo,
          id_curso: dto.id_curso,
          nota_final_disciplina: new Prisma.Decimal(cadete.nota),
          id_publicador: idUsuario,
        })),
      });
      await this.auditoria.registrar(
        {
          id_usuario: idUsuario,
          accion: 'PUBLICAR_RESULTADO_FINAL_DISCIPLINA',
          modulo: 'NOTAS_DISCIPLINA',
          entidad: 'ConfiguracionDisciplinaPeriodo',
          id_entidad: base.configuracion.id_configuracion,
          descripcion:
            'Notas finales de Disciplina publicadas como snapshot aprobado.',
          datos_despues: {
            area: 'DISCIPLINA',
            id_periodo: dto.id_periodo,
            id_curso: dto.id_curso,
            cantidad_cadetes: acumulado.cadetes.length,
            semanas_publicadas: base.semanasPublicadas,
          },
        },
        tx,
      );
    });
    return this.consultar(idUsuario, dto);
  }

  async enviarEvaluaciones(
    idUsuario: number,
    dto: SeleccionarResultadoFinalDisciplinaDto,
  ) {
    const base = await this.obtenerBase(idUsuario, dto);
    this.exigirEncargado(base.perfil);
    this.validaciones.exigirPermiso(base.perfil, PERMISOS_NOTAS.PUBLICAR);
    if (!base.completo) {
      throw new ConflictException('El periodo de Disciplina no está completo.');
    }
    let resultados = await this.prisma.resultadoFinalDisciplina.findMany({
      where: { id_periodo: dto.id_periodo, id_curso: dto.id_curso },
    });
    if (resultados.length === 0) {
      const acumulado = await this.consultas.acumulado(idUsuario, dto);
      await this.validarCohorteParaEnvio(dto, acumulado.cadetes.map((c) => c.id_cadete));
      await this.prisma.$transaction(async (tx) => {
        await tx.resultadoFinalDisciplina.createMany({
          data: acumulado.cadetes.map((cadete) => ({
            id_cadete: cadete.id_cadete,
            id_periodo: dto.id_periodo,
            id_curso: dto.id_curso,
            nota_final_disciplina: new Prisma.Decimal(cadete.nota),
            id_publicador: idUsuario,
          })),
        });
        await this.auditoria.registrar(
          {
            id_usuario: idUsuario,
            accion: 'PUBLICAR_RESULTADO_FINAL_DISCIPLINA',
            modulo: 'NOTAS_DISCIPLINA',
            entidad: 'ConfiguracionDisciplinaPeriodo',
            id_entidad: base.configuracion.id_configuracion,
            descripcion:
              'Snapshot final de Disciplina creado al iniciar su envío oficial a Evaluaciones.',
            datos_despues: {
              id_periodo: dto.id_periodo,
              id_curso: dto.id_curso,
              cantidad_cadetes: acumulado.cadetes.length,
              semanas_publicadas: base.semanasPublicadas,
            },
          },
          tx,
        );
      });
      resultados = await this.prisma.resultadoFinalDisciplina.findMany({
        where: { id_periodo: dto.id_periodo, id_curso: dto.id_curso },
      });
    }
    await this.validarCohorteParaEnvio(
      dto,
      resultados.map((resultado) => resultado.id_cadete),
    );
    if (resultados.every((resultado) => resultado.fecha_envio_evaluaciones)) {
      return this.consultar(idUsuario, dto);
    }
    if (resultados.some((resultado) => resultado.fecha_envio_evaluaciones)) {
      throw new ConflictException(
        'El envío previo quedó incompleto. Requiere revisión administrativa.',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      const fechaEnvio = new Date();
      await tx.resultadoFinalDisciplina.updateMany({
        where: {
          id_periodo: dto.id_periodo,
          id_curso: dto.id_curso,
          fecha_envio_evaluaciones: null,
        },
        data: {
          id_emisor_evaluaciones: idUsuario,
          fecha_envio_evaluaciones: fechaEnvio,
        },
      });
      await this.auditoria.registrar(
        {
          id_usuario: idUsuario,
          accion: 'ENVIAR_RESULTADO_FINAL_A_EVALUACIONES',
          modulo: 'NOTAS_DISCIPLINA',
          entidad: 'ConfiguracionDisciplinaPeriodo',
          id_entidad: base.configuracion.id_configuracion,
          descripcion:
            'Snapshot final de Disciplina enviado al Encargado de Evaluaciones.',
          datos_despues: {
            area: 'DISCIPLINA',
            id_periodo: dto.id_periodo,
            id_curso: dto.id_curso,
            cantidad_cadetes: resultados.length,
            fecha_envio: fechaEnvio.toISOString(),
          },
        },
        tx,
      );
      const destinatarios =
        await this.notificaciones.destinatariosEvaluaciones(tx);
      await this.notificaciones.crearEventoResultadoFinal(
        {
          id_configuracion: base.configuracion.id_configuracion,
          id_gestion: base.configuracion.periodo.id_gestion,
          id_periodo: dto.id_periodo,
          id_curso: dto.id_curso,
          id_emisor: idUsuario,
          destinatarios,
          gestion: base.configuracion.periodo.gestion.ano,
          periodo: base.configuracion.periodo.periodo,
          curso: base.configuracion.curso.nombre,
        },
        tx,
      );
    });
    return this.consultar(idUsuario, dto);
  }

  private async validarCohorteParaEnvio(
    dto: SeleccionarResultadoFinalDisciplinaDto,
    idsDisciplina: number[],
  ) {
    const [cadetes, configuracion, materias, planilla] = await Promise.all([
      this.prisma.cadete.findMany({
        where: { id_curso: dto.id_curso },
        select: { id_cadete: true },
      }),
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
        include: { notas: { select: { id_cadete: true } } },
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
            where: { nota_final: { not: null } },
            select: { id_cadete: true },
          },
        },
      }),
    ]);
    const esperados = cadetes.map((cadete) => cadete.id_cadete);
    const idsEvaluaciones = esperados.filter((idCadete) =>
      Boolean(configuracion?.activo) &&
      materias.length === configuracion?.cantidad_materias &&
      materias.every((materia) =>
        materia.notas.some((nota) => nota.id_cadete === idCadete),
      ),
    );
    const idsEf = planilla?.notas.map((nota) => nota.id_cadete) ?? [];
    const diferencias = {
      disciplina_faltantes: esperados.filter((id) => !idsDisciplina.includes(id)),
      disciplina_sobrantes: idsDisciplina.filter((id) => !esperados.includes(id)),
      evaluaciones_faltantes: esperados.filter((id) => !idsEvaluaciones.includes(id)),
      evaluaciones_sobrantes: idsEvaluaciones.filter((id) => !esperados.includes(id)),
      entrenamiento_faltantes: esperados.filter((id) => !idsEf.includes(id)),
      entrenamiento_sobrantes: idsEf.filter((id) => !esperados.includes(id)),
    };
    if (Object.values(diferencias).some((ids) => ids.length > 0)) {
      throw new ConflictException({
        message:
          'Las cohortes de Evaluaciones, Disciplina y Entrenamiento Físico no coinciden. No se enviaron notas finales.',
        estudiantes_esperados: esperados.length,
        diferencias,
      });
    }
  }

  private async obtenerBase(
    idUsuario: number,
    dto: SeleccionarResultadoFinalDisciplinaDto,
  ) {
    const perfil = await this.validaciones.validarAccesoCurso(
      idUsuario,
      dto.id_curso,
      'LECTURA',
    );
    this.validaciones.exigirTipo(
      perfil,
      'ADMINISTRADOR',
      'ENCARGADO_DISCIPLINA',
      'SECCION_ACADEMICA',
      'JEFE_ESTUDIOS',
      'COMANDO',
    );
    const configuracion =
      await this.prisma.configuracionDisciplinaPeriodo.findUnique({
        where: {
          id_periodo_id_curso: {
            id_periodo: dto.id_periodo,
            id_curso: dto.id_curso,
          },
        },
        include: {
          periodo: { include: { gestion: true } },
          curso: true,
        },
      });
    if (
      !configuracion?.activo ||
      configuracion.periodo.id_gestion !== dto.id_gestion
    ) {
      throw new NotFoundException(
        'No existe una configuración activa para la selección.',
      );
    }
    const semanas = await this.prisma.semanaDisciplina.findMany({
      where: { id_periodo: dto.id_periodo, id_curso: dto.id_curso },
      select: { numero_semana: true, estado: true },
    });
    const requeridas = new Set(
      Array.from(
        { length: configuracion.cantidad_semanas },
        (_, indice) => indice + 1,
      ),
    );
    const semanasValidas = semanas.filter((semana) =>
      requeridas.has(semana.numero_semana),
    );
    const semanasExistentes = semanasValidas.length;
    const semanasPublicadas = semanasValidas.filter(
      (semana) => semana.estado === EstadoSemanaDisciplina.PUBLICADO,
    ).length;
    return {
      perfil,
      configuracion,
      semanasExistentes,
      semanasPublicadas,
      completo:
        semanasExistentes === configuracion.cantidad_semanas &&
        semanasPublicadas === configuracion.cantidad_semanas,
    };
  }

  private exigirEncargado(perfil: PerfilNotas) {
    if (perfil.tipo !== 'ENCARGADO_DISCIPLINA') {
      throw new ForbiddenException(
        'Solo el Encargado de Disciplina puede publicar o enviar notas finales.',
      );
    }
  }
}
