import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EstadoSemanaDisciplina, Prisma, TipoDisciplina } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditoriaService } from '../../auditoria/auditoria.service';
import { PERMISOS_NOTAS } from '../comun/constantes-notas';
import { NotificacionesNotasService } from '../comun/notificaciones-notas.service';
import { ValidacionesNotasService } from '../comun/validaciones-notas.service';
import { calcularAcumuladoDisciplina } from '../comun/calculo-disciplina';
import { MatricesAcademicasService } from '../matrices-academicas/matrices-academicas.service';
import {
  ActualizarRegistroDisciplinaDto,
  CrearRegistroDisciplinaDto,
  ModificarRegistroExtraordinarioDto,
} from './dto/registro-disciplina.dto';

type ClienteRegistro = Prisma.TransactionClient;

interface DatosRegistroNormalizados {
  id_cadete: number;
  id_catalogo: number;
  id_oficial: number | null;
  nombre_responsable_manual: string | null;
  fecha_hecho: Date | null;
  puntaje: Prisma.Decimal;
  observacion: string | null;
}

@Injectable()
export class RegistrosDisciplinaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly validaciones: ValidacionesNotasService,
    private readonly auditoria: AuditoriaService,
    private readonly notificaciones: NotificacionesNotasService,
    private readonly matrices?: MatricesAcademicasService,
  ) {}

  async crear(
    idUsuario: number,
    idSemana: number,
    dto: CrearRegistroDisciplinaDto,
  ) {
    const semana = await this.obtenerSemana(idSemana);
    await this.validarEdicionNormal(idUsuario, semana, 'CREAR');
    return this.prisma.$transaction(async (tx) => {
      const datos = await this.normalizarDatos(
        {
          id_cadete: dto.id_cadete,
          id_catalogo: dto.id_catalogo,
          id_oficial: dto.id_oficial ?? null,
          nombre_responsable_manual:
            dto.nombre_responsable_manual?.trim() || null,
          fecha_hecho: dto.fecha_hecho ?? null,
          puntaje: dto.puntaje,
          observacion: dto.observacion?.trim() || null,
        },
        semana,
        tx,
      );
      const creado = await tx.registroDisciplina.create({
        data: {
          ...datos,
          id_semana: idSemana,
          id_creador: idUsuario,
        },
        include: { catalogo: true, oficial: true },
      });
      await tx.semanaDisciplina.update({
        where: { id_semana: idSemana },
        data: { id_ultimo_responsable: idUsuario },
      });
      await this.auditoria.registrar(
        {
          id_usuario: idUsuario,
          accion: 'CREAR_REGISTRO_DISCIPLINA',
          modulo: 'NOTAS_DISCIPLINA',
          entidad: 'RegistroDisciplina',
          id_entidad: creado.id_registro,
          descripcion: 'Registro disciplinario agregado a una semana editable.',
          datos_despues: this.aJson(creado),
        },
        tx,
      );
      return this.presentar(creado);
    });
  }

  async actualizar(
    idUsuario: number,
    idRegistro: number,
    dto: ActualizarRegistroDisciplinaDto,
  ) {
    const actual = await this.obtenerRegistro(idRegistro);
    await this.validarEdicionNormal(
      idUsuario,
      actual.semana,
      'ACTUALIZAR',
      actual.id_creador,
    );
    return this.prisma.$transaction(async (tx) => {
      const datos = await this.normalizarDatos(
        this.combinar(actual, dto),
        actual.semana,
        tx,
        actual,
      );
      const actualizado = await tx.registroDisciplina.update({
        where: { id_registro: idRegistro },
        data: datos,
        include: { catalogo: true, oficial: true },
      });
      await tx.semanaDisciplina.update({
        where: { id_semana: actual.semana.id_semana },
        data: { id_ultimo_responsable: idUsuario },
      });
      await this.auditoria.registrar(
        {
          id_usuario: idUsuario,
          accion: 'ACTUALIZAR_REGISTRO_DISCIPLINA',
          modulo: 'NOTAS_DISCIPLINA',
          entidad: 'RegistroDisciplina',
          id_entidad: idRegistro,
          descripcion: 'Registro disciplinario corregido en semana editable.',
          datos_antes: this.aJson(actual),
          datos_despues: this.aJson(actualizado),
        },
        tx,
      );
      return this.presentar(actualizado);
    });
  }

  async eliminar(idUsuario: number, idRegistro: number) {
    const actual = await this.obtenerRegistro(idRegistro);
    await this.validarEdicionNormal(
      idUsuario,
      actual.semana,
      'ELIMINAR',
      actual.id_creador,
    );
    return this.prisma.$transaction(async (tx) => {
      await tx.registroDisciplina.delete({
        where: { id_registro: idRegistro },
      });
      await tx.semanaDisciplina.update({
        where: { id_semana: actual.semana.id_semana },
        data: { id_ultimo_responsable: idUsuario },
      });
      await this.auditoria.registrar(
        {
          id_usuario: idUsuario,
          accion: 'ELIMINAR_REGISTRO_DISCIPLINA',
          modulo: 'NOTAS_DISCIPLINA',
          entidad: 'RegistroDisciplina',
          id_entidad: idRegistro,
          descripcion: 'Registro eliminado mientras la semana estaba BORRADOR.',
          datos_antes: this.aJson(actual),
        },
        tx,
      );
      return { eliminado: true, id_registro: idRegistro };
    });
  }

  async modificarExtraordinariamente(
    idUsuario: number,
    idRegistro: number,
    dto: ModificarRegistroExtraordinarioDto,
  ) {
    const actual = await this.obtenerRegistro(idRegistro);
    const perfil = await this.validaciones.validarAccesoCurso(
      idUsuario,
      actual.semana.id_curso,
      'LECTURA',
    );
    this.validaciones.exigirTipo(
      perfil,
      'ADMINISTRADOR',
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
    if (!estadosBloqueados.includes(actual.semana.estado)) {
      throw new ConflictException(
        'La modificación extraordinaria solo aplica a una semana bloqueada.',
      );
    }

    const resultado = await this.prisma.$transaction(async (tx) => {
      const datos = await this.normalizarDatos(
        this.combinar(actual, dto),
        actual.semana,
        tx,
        actual,
      );
      const antes = this.aJson(actual);
      const candidato = this.aJson({ ...actual, ...datos });
      const campos = Object.keys(candidato).filter(
        (campo) =>
          JSON.stringify(antes[campo]) !== JSON.stringify(candidato[campo]),
      );
      if (campos.length === 0) {
        return this.presentar(actual);
      }

      const bloqueo = await tx.semanaDisciplina.updateMany({
        where: {
          id_semana: actual.semana.id_semana,
          estado: actual.semana.estado,
          nivel_revision_actual: actual.semana.nivel_revision_actual,
          version_flujo: actual.semana.version_flujo,
        },
        data: {
          id_ultimo_responsable: idUsuario,
          version_flujo: { increment: 1 },
        },
      });
      if (bloqueo.count !== 1) {
        throw new ConflictException(
          'La semana cambió. Actualice la información antes de reintentar.',
        );
      }
      const actualizado = await tx.registroDisciplina.update({
        where: { id_registro: idRegistro },
        data: datos,
        include: { catalogo: true, oficial: true },
      });
      const semanaActualizada = await tx.semanaDisciplina.findUniqueOrThrow({
        where: { id_semana: actual.semana.id_semana },
      });
      const finalPublicado = await tx.resultadoFinalDisciplina.findUnique({
        where: {
          id_cadete_id_periodo_id_curso: {
            id_cadete: actual.id_cadete,
            id_periodo: actual.semana.id_periodo,
            id_curso: actual.semana.id_curso,
          },
        },
      });
      if (finalPublicado) {
        const registros = await tx.registroDisciplina.findMany({
          where: {
            id_cadete: actual.id_cadete,
            semana: {
              id_periodo: actual.semana.id_periodo,
              id_curso: actual.semana.id_curso,
              estado: EstadoSemanaDisciplina.PUBLICADO,
            },
          },
          include: { catalogo: { select: { tipo: true } } },
        });
        const nota = calcularAcumuladoDisciplina(
          registros.map((registro) => ({
            tipo: registro.catalogo.tipo,
            puntaje: registro.puntaje,
          })),
        ).nota;
        await tx.resultadoFinalDisciplina.update({
          where: { id_resultado: finalPublicado.id_resultado },
          data: { nota_final_disciplina: new Prisma.Decimal(nota) },
        });
      }
      await this.auditoria.registrar(
        {
          id_usuario: idUsuario,
          accion: 'MODIFICAR_REGISTRO_BLOQUEADO',
          modulo: 'NOTAS_DISCIPLINA',
          entidad: 'RegistroDisciplina',
          id_entidad: idRegistro,
          descripcion: `Modificación extraordinaria. Justificación: ${dto.justificacion.trim()}`,
          datos_antes: {
            campos_modificados: campos,
            valores: antes,
          },
          datos_despues: {
            campos_modificados: campos,
            valores: this.aJson(actualizado),
            justificacion: dto.justificacion.trim(),
            estado_semana_conservado: semanaActualizada.estado,
          },
        },
        tx,
      );
      await this.notificaciones.crearEvento(
        {
          id_semana: semanaActualizada.id_semana,
          version_flujo: semanaActualizada.version_flujo,
          id_emisor: idUsuario,
          destinatarios: [
            semanaActualizada.id_creador,
            actual.cadete.id_usuario,
          ],
          tipo: 'MODIFICACION_EXTRAORDINARIA',
          titulo: 'Registro disciplinario modificado',
          mensaje: `Un registro de la Semana ${semanaActualizada.numero_semana} fue modificado con justificación.`,
        },
        tx,
      );
      return this.presentar(actualizado);
    });
    await this.matrices?.recalcularPorCorreccion(
      actual.semana.id_periodo,
      actual.semana.id_curso,
      idUsuario,
      dto.justificacion,
    );
    return resultado;
  }

  private async validarEdicionNormal(
    idUsuario: number,
    semana: {
      id_curso: number;
      id_periodo: number;
      estado: EstadoSemanaDisciplina;
    },
    accion: 'CREAR' | 'ACTUALIZAR' | 'ELIMINAR',
    idCreadorRegistro?: number,
  ) {
    if (idCreadorRegistro && idCreadorRegistro !== idUsuario) {
      throw new ForbiddenException(
        'Solo el Operador que creó el registro puede modificarlo.',
      );
    }
    const perfil = await this.validaciones.validarAccesoCurso(
      idUsuario,
      semana.id_curso,
      'REGISTRO',
    );
    this.validaciones.exigirTipo(perfil, 'OPERADOR_DISCIPLINA');
    this.validaciones.exigirPermiso(
      perfil,
      accion === 'CREAR' ? PERMISOS_NOTAS.REGISTRAR : PERMISOS_NOTAS.EDITAR,
    );
    const permiteObservado = accion !== 'ELIMINAR';
    const estados: EstadoSemanaDisciplina[] = [EstadoSemanaDisciplina.BORRADOR];
    if (permiteObservado) estados.push(EstadoSemanaDisciplina.OBSERVADO);
    if (!estados.includes(semana.estado)) {
      throw new ConflictException(
        permiteObservado
          ? 'Solo puede corregir registros en BORRADOR u OBSERVADO.'
          : 'Solo puede eliminar registros mientras la semana esté BORRADOR.',
      );
    }
    // Toda edición normal exige un periodo activo. Un periodo inactivo aún
    // permite completar el flujo o aplicar una modificación extraordinaria.
    await this.validaciones.validarPeriodoActivo(semana.id_periodo);
  }

  private async normalizarDatos(
    entrada: {
      id_cadete: number;
      id_catalogo: number;
      id_oficial: number | null;
      nombre_responsable_manual: string | null;
      fecha_hecho?: string | Date | null;
      puntaje?: string;
      observacion: string | null;
    },
    semana: { id_curso: number; id_periodo: number },
    cliente: ClienteRegistro,
    referenciaActual?: { id_catalogo: number; id_oficial: number | null },
  ): Promise<DatosRegistroNormalizados> {
    // Un TransactionClient usa una sola conexión; las consultas se mantienen
    // secuenciales para no solapar operaciones en el mismo cliente PostgreSQL.
    const cadete = await cliente.cadete.findUnique({
      where: { id_cadete: entrada.id_cadete },
    });
    const catalogo = await cliente.catalogoDisciplina.findUnique({
      where: { id_catalogo: entrada.id_catalogo },
    });
    const periodo = await cliente.periodoLectivo.findUnique({
      where: { id_periodo: semana.id_periodo },
      include: { gestion: true },
    });
    const oficial =
      catalogo?.tipo === TipoDisciplina.DEMERITO && entrada.id_oficial
        ? await cliente.oficialDisciplina.findUnique({
            where: { id_oficial: entrada.id_oficial },
          })
        : null;
    if (!cadete || cadete.id_curso !== semana.id_curso) {
      throw new BadRequestException(
        'El cadete no pertenece actualmente al curso de la semana.',
      );
    }
    if (
      !catalogo ||
      (!catalogo.activo &&
        referenciaActual?.id_catalogo !== catalogo.id_catalogo)
    ) {
      throw new BadRequestException('El catálogo seleccionado no está activo.');
    }
    if (
      catalogo.tipo === TipoDisciplina.DEMERITO &&
      entrada.id_oficial &&
      (!oficial ||
        (!oficial.activo &&
          referenciaActual?.id_oficial !== oficial.id_oficial))
    ) {
      throw new BadRequestException('El oficial seleccionado no está activo.');
    }
    let idOficial: number | null = null;
    let manual: string | null = null;
    let fecha: Date | null = null;
    let observacion: string | null = null;
    if (catalogo.tipo === TipoDisciplina.DEMERITO) {
      idOficial = entrada.id_oficial;
      manual = entrada.nombre_responsable_manual?.trim() || null;
      if (Boolean(idOficial) === Boolean(manual)) {
        throw new BadRequestException(
          'Un demérito requiere exactamente un oficial o un responsable manual.',
        );
      }
      if (!entrada.fecha_hecho) {
        throw new BadRequestException('Un demérito requiere fecha del hecho.');
      }
      fecha =
        entrada.fecha_hecho instanceof Date
          ? entrada.fecha_hecho
          : new Date(`${entrada.fecha_hecho}T00:00:00.000Z`);
      if (Number.isNaN(fecha.getTime())) {
        throw new BadRequestException('La fecha del hecho no es válida.');
      }
      if (!periodo || fecha.getUTCFullYear() !== periodo.gestion.ano) {
        throw new BadRequestException(
          'La fecha del hecho debe corresponder a la gestión del periodo.',
        );
      }
      observacion = entrada.observacion?.trim() || null;
    }

    let puntaje: Prisma.Decimal;
    if (catalogo.tipo === TipoDisciplina.DEMERITO) {
      if (!catalogo.puntaje_base) {
        throw new BadRequestException(
          'El demérito no tiene puntaje fijo válido.',
        );
      }
      if (
        entrada.puntaje !== undefined &&
        !new Prisma.Decimal(entrada.puntaje).equals(catalogo.puntaje_base)
      ) {
        throw new BadRequestException(
          'El puntaje de un demérito no puede modificarse.',
        );
      }
      puntaje = catalogo.puntaje_base;
    } else {
      if (entrada.puntaje === undefined) {
        throw new BadRequestException('Un mérito requiere puntaje positivo.');
      }
      puntaje = new Prisma.Decimal(entrada.puntaje);
      if (!puntaje.greaterThan(0)) {
        throw new BadRequestException(
          'El puntaje del mérito debe ser positivo.',
        );
      }
    }

    return {
      id_cadete: entrada.id_cadete,
      id_catalogo: entrada.id_catalogo,
      id_oficial: idOficial,
      nombre_responsable_manual: manual,
      fecha_hecho: fecha,
      puntaje,
      observacion,
    };
  }

  private combinar(
    actual: {
      id_cadete: number;
      id_catalogo: number;
      id_oficial: number | null;
      nombre_responsable_manual: string | null;
      fecha_hecho: Date | null;
      puntaje: Prisma.Decimal;
      observacion: string | null;
    },
    dto: ActualizarRegistroDisciplinaDto,
  ) {
    return {
      id_cadete: dto.id_cadete ?? actual.id_cadete,
      id_catalogo: dto.id_catalogo ?? actual.id_catalogo,
      id_oficial:
        dto.id_oficial !== undefined ? dto.id_oficial : actual.id_oficial,
      nombre_responsable_manual:
        dto.nombre_responsable_manual !== undefined
          ? dto.nombre_responsable_manual
          : actual.nombre_responsable_manual,
      fecha_hecho: dto.fecha_hecho ?? actual.fecha_hecho,
      puntaje: dto.puntaje ?? actual.puntaje.toFixed(4),
      observacion:
        dto.observacion !== undefined ? dto.observacion : actual.observacion,
    };
  }

  private async obtenerSemana(idSemana: number) {
    const semana = await this.prisma.semanaDisciplina.findUnique({
      where: { id_semana: idSemana },
    });
    if (!semana) throw new NotFoundException('Semana no encontrada.');
    return semana;
  }

  private async obtenerRegistro(idRegistro: number) {
    const registro = await this.prisma.registroDisciplina.findUnique({
      where: { id_registro: idRegistro },
      include: {
        semana: true,
        catalogo: true,
        oficial: true,
        cadete: { select: { id_usuario: true } },
      },
    });
    if (!registro) throw new NotFoundException('Registro no encontrado.');
    return registro;
  }

  private presentar<T extends { puntaje: Prisma.Decimal }>(registro: T) {
    return { ...registro, puntaje: registro.puntaje.toFixed(4) };
  }

  private aJson(registro: {
    id_cadete: number;
    id_catalogo: number;
    id_oficial: number | null;
    nombre_responsable_manual: string | null;
    fecha_hecho: Date | null;
    puntaje: Prisma.Decimal;
    observacion: string | null;
  }): Prisma.InputJsonObject {
    return {
      id_cadete: registro.id_cadete,
      id_catalogo: registro.id_catalogo,
      id_oficial: registro.id_oficial,
      nombre_responsable_manual: registro.nombre_responsable_manual,
      fecha_hecho: registro.fecha_hecho?.toISOString().slice(0, 10) ?? null,
      puntaje: registro.puntaje.toFixed(4),
      observacion: registro.observacion,
    };
  }
}
