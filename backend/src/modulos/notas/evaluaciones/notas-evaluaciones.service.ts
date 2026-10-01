import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EstadoSemanaDisciplina, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditoriaService } from '../../auditoria/auditoria.service';
import { PERMISOS_NOTAS } from '../comun/constantes-notas';
import { NotificacionesNotasService } from '../comun/notificaciones-notas.service';
import { ValidacionesNotasService } from '../comun/validaciones-notas.service';
import { clasificarNota, notaConsiderada } from './calculo-evaluaciones';
import { MatricesAcademicasService } from '../matrices-academicas/matrices-academicas.service';
import {
  GuardarNotasMateriaDto,
  ModificarNotaExtraordinariaDto,
} from './dto/nota-evaluacion.dto';

@Injectable()
export class NotasEvaluacionesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly validaciones: ValidacionesNotasService,
    private readonly auditoria: AuditoriaService,
    private readonly notificaciones: NotificacionesNotasService,
    private readonly matrices?: MatricesAcademicasService,
  ) {}

  async guardarAvance(
    idUsuario: number,
    idMateria: number,
    dto: GuardarNotasMateriaDto,
  ) {
    const materia = await this.prisma.materiaEvaluacion.findUnique({
      where: { id_materia: idMateria },
    });
    if (!materia) throw new NotFoundException('Materia no encontrada.');
    const perfil = await this.validaciones.validarAccesoCursoEvaluaciones(
      idUsuario,
      materia.id_curso,
      'REGISTRO',
    );
    this.validaciones.exigirTipo(perfil, 'OPERADOR_EVALUACIONES');
    if (
      materia.estado !== EstadoSemanaDisciplina.BORRADOR &&
      materia.estado !== EstadoSemanaDisciplina.OBSERVADO
    ) {
      throw new ConflictException(
        'La materia está bloqueada después del envío.',
      );
    }
    await this.validaciones.validarPeriodoActivo(materia.id_periodo);
    if (dto.notas.length === 0) {
      throw new BadRequestException('Debe enviar al menos una nota.');
    }
    const ids = dto.notas.map((nota) => nota.id_cadete);
    if (new Set(ids).size !== ids.length) {
      throw new BadRequestException(
        'La solicitud contiene cadetes duplicados.',
      );
    }
    const cadetes = await this.prisma.cadete.findMany({
      where: { id_cadete: { in: ids }, id_curso: materia.id_curso },
      select: { id_cadete: true },
    });
    if (cadetes.length !== ids.length) {
      throw new BadRequestException(
        'Todos los cadetes deben pertenecer al curso de la materia.',
      );
    }
    const existentes = await this.prisma.notaEvaluacion.findMany({
      where: { id_materia: idMateria, id_cadete: { in: ids } },
    });
    const porCadete = new Map(existentes.map((nota) => [nota.id_cadete, nota]));
    for (const item of dto.notas) {
      const permiso = porCadete.has(item.id_cadete)
        ? PERMISOS_NOTAS.EDITAR
        : PERMISOS_NOTAS.REGISTRAR;
      this.validaciones.exigirPermiso(perfil, permiso);
    }

    return this.prisma.$transaction(async (tx) => {
      let cambios = 0;
      for (const item of dto.notas) {
        const datos = this.validarNotas(
          item.nota_inicial,
          item.nota_desquite ?? null,
        );
        const actual = porCadete.get(item.id_cadete);
        if (
          actual?.nota_inicial.equals(datos.nota_inicial) &&
          this.decimalesIguales(actual.nota_desquite, datos.nota_desquite)
        ) {
          continue;
        }
        const guardada = actual
          ? await tx.notaEvaluacion.update({
              where: { id_nota: actual.id_nota },
              data: datos,
            })
          : await tx.notaEvaluacion.create({
              data: {
                id_materia: idMateria,
                id_cadete: item.id_cadete,
                ...datos,
                id_creador: idUsuario,
              },
            });
        await this.auditoria.registrar(
          {
            id_usuario: idUsuario,
            accion: actual
              ? 'ACTUALIZAR_NOTA_EVALUACION_BORRADOR'
              : 'REGISTRAR_NOTA_EVALUACION_BORRADOR',
            modulo: 'NOTAS_EVALUACIONES',
            entidad: 'NotaEvaluacion',
            id_entidad: guardada.id_nota,
            descripcion: 'Avance de Evaluaciones guardado en materia editable.',
            datos_antes: actual ? this.aJson(actual) : undefined,
            datos_despues: this.aJson(guardada),
          },
          tx,
        );
        cambios += 1;
      }
      if (cambios > 0) {
        await tx.materiaEvaluacion.update({
          where: { id_materia: idMateria },
          data: { id_ultimo_responsable: idUsuario },
        });
      }
      const registradas = await tx.notaEvaluacion.count({
        where: { id_materia: idMateria },
      });
      const totalCadetes = await tx.cadete.count({
        where: { id_curso: materia.id_curso },
      });
      return {
        id_materia: idMateria,
        cambios,
        notas_registradas: registradas,
        notas_pendientes: totalCadetes - registradas,
        completo: registradas === totalCadetes && totalCadetes > 0,
      };
    });
  }

  async modificarExtraordinariamente(
    idUsuario: number,
    idNota: number,
    dto: ModificarNotaExtraordinariaDto,
  ) {
    const actual = await this.prisma.notaEvaluacion.findUnique({
      where: { id_nota: idNota },
      include: {
        materia: {
          include: {
            periodo: { include: { gestion: true } },
            curso: true,
          },
        },
        cadete: { select: { id_usuario: true } },
      },
    });
    if (!actual) throw new NotFoundException('Nota no encontrada.');
    const perfil = await this.validaciones.validarAccesoCursoEvaluaciones(
      idUsuario,
      actual.materia.id_curso,
      'LECTURA',
    );
    this.validaciones.exigirTipo(
      perfil,
      'JEFE_ESTUDIOS',
      'SECCION_ACADEMICA',
      'COMANDO',
    );
    this.validaciones.exigirPermiso(perfil, PERMISOS_NOTAS.MODIFICAR_BLOQUEADA);
    const estadosBloqueados: EstadoSemanaDisciplina[] = [
      EstadoSemanaDisciplina.EN_REVISION,
      EstadoSemanaDisciplina.REVISADO,
      EstadoSemanaDisciplina.PUBLICADO,
    ];
    if (!estadosBloqueados.includes(actual.materia.estado)) {
      throw new ConflictException(
        'La modificación extraordinaria solo aplica a una materia bloqueada.',
      );
    }
    if (dto.nota_inicial === undefined && dto.nota_desquite === undefined) {
      throw new BadRequestException(
        'Debe proporcionar un nuevo valor de nota.',
      );
    }
    const datos = this.validarNotas(
      dto.nota_inicial ?? actual.nota_inicial.toFixed(4),
      dto.nota_desquite !== undefined
        ? dto.nota_desquite
        : (actual.nota_desquite?.toFixed(4) ?? null),
    );
    if (
      actual.nota_inicial.equals(datos.nota_inicial) &&
      this.decimalesIguales(actual.nota_desquite, datos.nota_desquite)
    ) {
      return this.presentar(actual);
    }

    const resultado = await this.prisma.$transaction(async (tx) => {
      const bloqueo = await tx.materiaEvaluacion.updateMany({
        where: {
          id_materia: actual.materia.id_materia,
          estado: actual.materia.estado,
          nivel_revision_actual: actual.materia.nivel_revision_actual,
          version_flujo: actual.materia.version_flujo,
        },
        data: {
          id_ultimo_responsable: idUsuario,
          version_flujo: { increment: 1 },
        },
      });
      if (bloqueo.count !== 1) {
        throw new ConflictException(
          'La materia cambió. Actualice la información antes de reintentar.',
        );
      }
      const actualizada = await tx.notaEvaluacion.update({
        where: { id_nota: idNota },
        data: datos,
      });
      const materiaActualizada = await tx.materiaEvaluacion.findUniqueOrThrow({
        where: { id_materia: actual.materia.id_materia },
      });
      const antes = this.aJson(actual);
      const despues = this.aJson(actualizada);
      await this.auditoria.registrar(
        {
          id_usuario: idUsuario,
          accion: 'MODIFICAR_NOTA_EVALUACION_BLOQUEADA',
          modulo: 'NOTAS_EVALUACIONES',
          entidad: 'NotaEvaluacion',
          id_entidad: idNota,
          descripcion: `Modificación extraordinaria. Justificación: ${dto.justificacion.trim()}`,
          datos_antes: antes,
          datos_despues: {
            ...despues,
            rol: perfil.tipo,
            id_cadete: actual.id_cadete,
            gestion: actual.materia.periodo.gestion.ano,
            id_gestion: actual.materia.periodo.id_gestion,
            periodo: actual.materia.periodo.periodo,
            id_periodo: actual.materia.id_periodo,
            curso: actual.materia.curso.nombre,
            id_curso: actual.materia.id_curso,
            area: 'EVALUACIONES',
            materia: actual.materia.nombre,
            concepto: 'Nota final considerada de la materia',
            justificacion: dto.justificacion.trim(),
            estado_materia_conservado: materiaActualizada.estado,
          },
        },
        tx,
      );
      const operadores =
        await this.notificaciones.destinatariosOperadoresCursoEvaluaciones(
          actual.materia.id_curso,
          tx,
        );
      await this.notificaciones.crearEventoEvaluaciones(
        {
          id_materia: materiaActualizada.id_materia,
          version_flujo: materiaActualizada.version_flujo,
          id_emisor: idUsuario,
          destinatarios: [
            ...operadores,
            materiaActualizada.id_creador,
            actual.cadete.id_usuario,
          ],
          tipo: 'NOTA_EVALUACION_MODIFICADA_EXTRAORDINARIAMENTE',
          titulo: 'Nota de Evaluaciones modificada',
          mensaje: `${actual.materia.nombre} tuvo una modificación extraordinaria justificada.`,
        },
        tx,
      );
      return this.presentar(actualizada);
    });
    await this.matrices?.recalcularPorCorreccion(
      actual.materia.id_periodo,
      actual.materia.id_curso,
      idUsuario,
      dto.justificacion,
    );
    return resultado;
  }

  private validarNotas(
    inicialEntrada: string | Prisma.Decimal,
    desquiteEntrada: string | Prisma.Decimal | null,
  ) {
    const notaInicial = new Prisma.Decimal(inicialEntrada);
    const notaDesquite =
      desquiteEntrada === null ? null : new Prisma.Decimal(desquiteEntrada);
    if (notaInicial.lessThan(0) || notaInicial.greaterThan(100)) {
      throw new BadRequestException(
        'La nota inicial debe estar entre 0 y 100.',
      );
    }
    if (notaDesquite) {
      if (notaInicial.greaterThan(50)) {
        throw new BadRequestException(
          'El desquite solo se permite cuando la nota inicial es menor o igual a 50.',
        );
      }
      if (
        notaDesquite.lessThan(0) ||
        notaDesquite.greaterThan(100) ||
        !notaDesquite.greaterThan(notaInicial)
      ) {
        throw new BadRequestException(
          'El desquite debe ser mayor que la nota inicial y menor o igual a 100.',
        );
      }
    }
    return { nota_inicial: notaInicial, nota_desquite: notaDesquite };
  }

  private decimalesIguales(
    izquierda: Prisma.Decimal | null,
    derecha: Prisma.Decimal | null,
  ) {
    if (izquierda === null || derecha === null) return izquierda === derecha;
    return izquierda.equals(derecha);
  }

  private aJson(nota: {
    nota_inicial: Prisma.Decimal;
    nota_desquite: Prisma.Decimal | null;
  }): Prisma.InputJsonObject {
    const considerada = notaConsiderada(nota.nota_inicial, nota.nota_desquite);
    return {
      nota_inicial: nota.nota_inicial.toFixed(4),
      nota_desquite: nota.nota_desquite?.toFixed(4) ?? null,
      nota_considerada: considerada.toFixed(4),
      clasificacion: clasificarNota(considerada),
    };
  }

  private presentar<
    T extends {
      nota_inicial: Prisma.Decimal;
      nota_desquite: Prisma.Decimal | null;
    },
  >(nota: T) {
    const considerada = notaConsiderada(nota.nota_inicial, nota.nota_desquite);
    return {
      ...nota,
      nota_inicial: nota.nota_inicial.toFixed(4),
      nota_desquite: nota.nota_desquite?.toFixed(4) ?? null,
      nota_considerada: considerada.toFixed(4),
      clasificacion: clasificarNota(considerada),
    };
  }
}
