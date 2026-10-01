import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EstadoDocumento, TipoMovimientoDocumento } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditoriaService } from '../../auditoria/auditoria.service';
import {
  MODULO_DOCUMENTOS,
  PERMISOS_DOCUMENTOS,
} from '../comun/constantes-documentales';
import { FlujoDocumentalService } from '../comun/flujo-documental.service';
import { ValidacionesDocumentalesService } from '../comun/validaciones-documentales.service';
import { MovimientosService } from '../movimientos/movimientos.service';
import { DocumentacionGateway } from '../tiempo-real/documentacion.gateway';
import { ObservarDocumentoDto } from './dto/observar-documento.dto';
import { SubsanarDocumentoDto } from './dto/subsanar-documento.dto';

@Injectable()
export class RevisionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly validaciones: ValidacionesDocumentalesService,
    private readonly flujo: FlujoDocumentalService,
    private readonly movimientos: MovimientosService,
    private readonly auditoria: AuditoriaService,
    private readonly gateway: DocumentacionGateway,
  ) {}

  async aprobar(idUsuario: number, idDocumento: number) {
    const perfil = await this.validaciones.obtenerPerfil(idUsuario);
    this.validaciones.exigirTipo(perfil, 'SEGUNDO_COMANDO');
    this.validaciones.exigirPermiso(perfil, PERMISOS_DOCUMENTOS.APROBAR);

    const expediente = await this.obtenerExpediente(idDocumento);
    this.validaciones.exigirSeccionActual(perfil, expediente);
    if (expediente.estado_actual !== EstadoDocumento.EN_TRAMITE) {
      throw new ConflictException(
        'Solo se puede aprobar un expediente en trámite (en revisión).',
      );
    }

    const resultado = await this.prisma.$transaction((tx) =>
      this.flujo.cambiarEstado(tx, expediente, {
        estados_permitidos: [EstadoDocumento.EN_TRAMITE],
        id_seccion_actual_esperada: expediente.id_seccion_actual,
        estado_nuevo: EstadoDocumento.APROBADO,
        id_actor: idUsuario,
        id_seccion_actor: perfil.id_seccion as number,
        accion: 'APROBAR_DOCUMENTO',
        descripcion: 'Documento aprobado en revisión.',
      }),
    );
    this.gateway.emitirDocumentoActualizado(idDocumento);
    return resultado;
  }

  async observar(
    idUsuario: number,
    idDocumento: number,
    dto: ObservarDocumentoDto,
  ) {
    const perfil = await this.validaciones.obtenerPerfil(idUsuario);
    this.validaciones.exigirTipo(perfil, 'SEGUNDO_COMANDO');
    this.validaciones.exigirPermiso(perfil, PERMISOS_DOCUMENTOS.OBSERVAR);

    const expediente = await this.obtenerExpediente(idDocumento);
    this.validaciones.exigirSeccionActual(perfil, expediente);
    if (expediente.estado_actual !== EstadoDocumento.EN_TRAMITE) {
      throw new ConflictException(
        'Solo se puede observar un expediente en trámite (en revisión).',
      );
    }

    // Se devuelve a quien lo envió a la sección actual (el remitente
    // inmediato anterior) — funciona igual si observa Segundo Comando
    // (devuelve al área) o Comando (devuelve a Segundo Comando).
    const ultimoMovimiento = await this.prisma.movimientoDocumento.findFirst({
      where: { id_documento: idDocumento, id_usuario_recibe: { not: null } },
      orderBy: { fecha_hora_recepcion: 'desc' },
    });
    if (!ultimoMovimiento) {
      throw new ConflictException(
        'No hay un movimiento de recepción previo que permita determinar a quién devolver el documento.',
      );
    }

    const resultado = await this.prisma.$transaction(async (tx) => {
      const observacion = await tx.observacionDocumento.create({
        data: {
          id_documento: idDocumento,
          id_usuario: idUsuario,
          id_seccion: perfil.id_seccion as number,
          descripcion: dto.comentario,
        },
      });

      const resultado = await this.movimientos.crearMovimientoYTransicionar(
        tx,
        expediente,
        {
          id_seccion_destino: ultimoMovimiento.id_seccion_origen,
          tipo_movimiento: TipoMovimientoDocumento.DEVOLUCION,
          observacion: dto.comentario,
          id_usuario_envia: idUsuario,
          id_seccion_actor: perfil.id_seccion as number,
          estados_permitidos: [EstadoDocumento.EN_TRAMITE],
          accion_auditoria: 'OBSERVAR_DOCUMENTO',
        },
      );

      await this.auditoria.registrar(
        {
          id_usuario: idUsuario,
          accion: 'OBSERVAR_DOCUMENTO',
          modulo: MODULO_DOCUMENTOS,
          entidad: 'ObservacionDocumento',
          id_entidad: observacion.id_observacion,
          descripcion: `Documento ${idDocumento} observado y devuelto.`,
          datos_despues: { descripcion: dto.comentario },
        },
        tx,
      );

      return { observacion, ...resultado };
    });

    this.emitirMovimientoCreado(resultado);
    this.gateway.emitirDocumentoActualizado(idDocumento);
    return resultado;
  }

  private emitirMovimientoCreado(resultado: {
    destinatarios: number[];
    movimiento: { id_movimiento: number; id_documento: number };
  }) {
    for (const idDestinatario of resultado.destinatarios) {
      this.gateway.emitirAUsuario(idDestinatario, {
        tipo: 'DOCUMENTO_ENVIADO',
        id_documento: resultado.movimiento.id_documento,
        id_movimiento: resultado.movimiento.id_movimiento,
      });
    }
  }

  async subsanar(
    idUsuario: number,
    idDocumento: number,
    dto: SubsanarDocumentoDto,
  ) {
    const perfil = await this.validaciones.obtenerPerfil(idUsuario);
    this.validaciones.exigirPermiso(perfil, PERMISOS_DOCUMENTOS.ENVIAR);

    const expediente = await this.obtenerExpediente(idDocumento);
    this.validaciones.exigirSeccionActual(perfil, expediente);
    if (expediente.estado_actual !== EstadoDocumento.OBSERVADO) {
      throw new ConflictException(
        'Solo se puede reenviar un expediente que está OBSERVADO.',
      );
    }

    const observacionPendiente = await this.prisma.observacionDocumento.findFirst({
      where: { id_documento: idDocumento, subsanada: false },
      orderBy: { fecha_hora: 'desc' },
    });
    if (!observacionPendiente) {
      throw new ConflictException(
        'No hay una observación pendiente de subsanar para este documento.',
      );
    }

    const resultado = await this.prisma.$transaction(async (tx) => {
      await tx.observacionDocumento.update({
        where: { id_observacion: observacionPendiente.id_observacion },
        data: { subsanada: true, fecha_hora_subsanacion: new Date() },
      });

      return this.movimientos.crearMovimientoYTransicionar(tx, expediente, {
        id_seccion_destino: observacionPendiente.id_seccion,
        tipo_movimiento: TipoMovimientoDocumento.REENVIO,
        observacion: dto.comentario,
        id_usuario_envia: idUsuario,
        id_seccion_actor: perfil.id_seccion as number,
        estados_permitidos: [EstadoDocumento.OBSERVADO],
        accion_auditoria: 'REENVIAR_DOCUMENTO',
      });
    });

    this.emitirMovimientoCreado(resultado);
    this.gateway.emitirDocumentoActualizado(idDocumento);
    return resultado;
  }

  async finalizar(idUsuario: number, idDocumento: number) {
    const perfil = await this.validaciones.obtenerPerfil(idUsuario);
    this.validaciones.exigirTipo(perfil, 'RADIO');
    this.validaciones.exigirPermiso(perfil, PERMISOS_DOCUMENTOS.FINALIZAR);

    const expediente = await this.obtenerExpediente(idDocumento);
    this.validaciones.exigirSeccionActual(perfil, expediente);
    if (expediente.estado_actual !== EstadoDocumento.EN_TRAMITE) {
      throw new ConflictException(
        'Solo se puede finalizar un expediente en trámite recibido en Radio.',
      );
    }

    const resultado = await this.prisma.$transaction(async (tx) => {
      const resultado = await this.flujo.cambiarEstado(tx, expediente, {
        estados_permitidos: [EstadoDocumento.EN_TRAMITE],
        id_seccion_actual_esperada: expediente.id_seccion_actual,
        estado_nuevo: EstadoDocumento.FINALIZADO,
        id_actor: idUsuario,
        id_seccion_actor: perfil.id_seccion as number,
        accion: 'FINALIZAR_DOCUMENTO',
        descripcion: 'Documento finalizado por Radio.',
      });

      await tx.hojaRuta.updateMany({
        where: { id_documento: idDocumento, fecha_hora_cierre: null },
        data: { fecha_hora_cierre: new Date() },
      });

      return resultado;
    });
    this.gateway.emitirDocumentoActualizado(idDocumento);
    return resultado;
  }

  async archivar(idUsuario: number, idDocumento: number) {
    const perfil = await this.validaciones.obtenerPerfil(idUsuario);
    this.validaciones.exigirTipo(perfil, 'RADIO');
    this.validaciones.exigirPermiso(perfil, PERMISOS_DOCUMENTOS.ARCHIVAR);

    const expediente = await this.obtenerExpediente(idDocumento);
    this.validaciones.exigirSeccionActual(perfil, expediente);
    if (expediente.estado_actual !== EstadoDocumento.FINALIZADO) {
      throw new ConflictException(
        'Solo se puede archivar un expediente ya finalizado.',
      );
    }

    const resultado = await this.prisma.$transaction((tx) =>
      this.flujo.cambiarEstado(tx, expediente, {
        estados_permitidos: [EstadoDocumento.FINALIZADO],
        id_seccion_actual_esperada: expediente.id_seccion_actual,
        estado_nuevo: EstadoDocumento.ARCHIVADO,
        id_actor: idUsuario,
        id_seccion_actor: perfil.id_seccion as number,
        accion: 'ARCHIVAR_DOCUMENTO',
        descripcion: 'Documento archivado institucionalmente.',
      }),
    );
    this.gateway.emitirDocumentoActualizado(idDocumento);
    return resultado;
  }

  private async obtenerExpediente(idDocumento: number) {
    const expediente = await this.prisma.expedienteDocumento.findUnique({
      where: { id_documento: idDocumento },
    });
    if (!expediente) {
      throw new NotFoundException(
        'Expediente no encontrado (el documento debe ser principal).',
      );
    }
    return expediente;
  }
}
