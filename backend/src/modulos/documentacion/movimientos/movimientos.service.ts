import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  EstadoDocumento,
  EstadoMovimiento,
  ExpedienteDocumento,
  Prisma,
  TipoMovimientoDocumento,
} from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  NOMBRES_SECCION_DOCUMENTAL,
  PERMISOS_DOCUMENTOS,
} from '../comun/constantes-documentales';
import { FlujoDocumentalService } from '../comun/flujo-documental.service';
import { NotificacionesDocumentalesService } from '../comun/notificaciones-documentales.service';
import {
  PerfilDocumental,
  ValidacionesDocumentalesService,
} from '../comun/validaciones-documentales.service';
import { DocumentacionGateway } from '../tiempo-real/documentacion.gateway';
import { EnviarDocumentoDto } from './dto/enviar-documento.dto';
import { RecibirDocumentoDto } from './dto/recibir-documento.dto';

export interface DatosMovimiento {
  id_seccion_destino: number;
  tipo_movimiento: TipoMovimientoDocumento;
  observacion?: string;
  id_usuario_envia: number;
  id_seccion_actor: number;
  /** Estados desde los que se permite partir (por defecto, solo EN_TRAMITE). */
  estados_permitidos?: EstadoDocumento[];
  accion_auditoria?: string;
}

interface DestinoInstitucional {
  id_seccion_destino: number;
  tipo_movimiento: TipoMovimientoDocumento;
}

/**
 * Estados desde los que un expediente puede iniciar un envío/derivación
 * normal: REGISTRADO (primer envío desde Radio, nunca pasó por EN_TRAMITE),
 * EN_TRAMITE (caso general en cualquier tramo) y APROBADO (envío posterior
 * a una aprobación: Segundo Comando -> Comando, Comando -> Radio).
 */
const ESTADOS_ORIGEN_ENVIO: EstadoDocumento[] = [
  EstadoDocumento.REGISTRADO,
  EstadoDocumento.EN_TRAMITE,
  EstadoDocumento.APROBADO,
];

@Injectable()
export class MovimientosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly validaciones: ValidacionesDocumentalesService,
    private readonly flujo: FlujoDocumentalService,
    private readonly notificacionesDoc: NotificacionesDocumentalesService,
    private readonly gateway: DocumentacionGateway,
  ) {}

  async enviar(
    idUsuario: number,
    idDocumento: number,
    dto: EnviarDocumentoDto,
  ) {
    const perfil = await this.validaciones.obtenerPerfil(idUsuario);
    const expediente = await this.obtenerExpediente(idDocumento);
    this.validaciones.exigirSeccionActual(perfil, expediente);

    // REGISTRADO: primer envío (Radio, recién capturado, nunca fue EN_TRAMITE).
    // EN_TRAMITE: caso general, en cualquier tramo posterior.
    // APROBADO: envío posterior a una aprobación (Segundo Comando -> Comando,
    // Comando -> Radio para cierre).
    if (!ESTADOS_ORIGEN_ENVIO.includes(expediente.estado_actual)) {
      throw new ConflictException(
        'Solo se puede enviar un expediente registrado, en trámite o aprobado.',
      );
    }

    // El destino y el tipo de movimiento NO se toman del body: se calculan
    // según la secuencia institucional fija (ver constantes de arriba), a
    // partir de quién actúa y en qué punto del workflow está el expediente.
    // Así una llamada manual con un id_seccion_destino arbitrario no puede
    // alterar la secuencia aunque "adivine" un id válido de otra etapa.
    const destinoEsperado = await this.resolverDestinoInstitucional(
      perfil,
      expediente,
    );
    this.validaciones.exigirPermiso(
      perfil,
      destinoEsperado.tipo_movimiento === TipoMovimientoDocumento.DERIVACION
        ? PERMISOS_DOCUMENTOS.DERIVAR
        : PERMISOS_DOCUMENTOS.ENVIAR,
    );
    if (dto.id_seccion_destino !== destinoEsperado.id_seccion_destino) {
      throw new ForbiddenException(
        'La sección destino no corresponde a la siguiente etapa del workflow documental.',
      );
    }

    const resultado = await this.prisma.$transaction((tx) =>
      this.crearMovimientoYTransicionar(tx, expediente, {
        estados_permitidos: ESTADOS_ORIGEN_ENVIO,
        id_seccion_destino: destinoEsperado.id_seccion_destino,
        tipo_movimiento: destinoEsperado.tipo_movimiento,
        observacion: dto.observacion,
        id_usuario_envia: idUsuario,
        id_seccion_actor: perfil.id_seccion as number,
        accion_auditoria:
          destinoEsperado.tipo_movimiento === TipoMovimientoDocumento.DERIVACION
            ? 'DERIVAR_DOCUMENTO'
            : 'ENVIAR_DOCUMENTO',
      }),
    );

    // Persistido primero (dentro de la transacción ya confirmada); recién
    // ahora se emite en tiempo real a quienes ya tienen su notificación
    // guardada en BD.
    this.emitirTiempoReal(resultado.destinatarios, {
      tipo: 'DOCUMENTO_ENVIADO',
      id_documento: idDocumento,
      id_movimiento: resultado.movimiento.id_movimiento,
    });
    this.gateway.emitirDocumentoActualizado(idDocumento);

    return { expediente: resultado.expediente, movimiento: resultado.movimiento };
  }

  /**
   * Resuelve el único destino institucional válido para el siguiente salto,
   * según la secuencia fija:
   *   RADIO -> SECRETARIA_GENERAL -> COMANDO -> SEGUNDO_COMANDO -> ÁREA
   *   -> SEGUNDO_COMANDO -> COMANDO -> SECRETARIA_GENERAL -> RADIO
   * El tramo de ida/vuelta de SECRETARIA_GENERAL/COMANDO se distingue por si
   * ya existe el segundo proveído (marca que el expediente ya completó el
   * tramo de ida y está regresando). El de SEGUNDO_COMANDO se distingue por
   * el estado (EN_TRAMITE = deriva al área fijada en su propio proveído;
   * APROBADO = ya revisó lo que devolvió el área y continúa hacia Comando).
   * Cualquier sección no institucional (AREA) solo puede devolver a
   * SEGUNDO_COMANDO.
   */
  private async resolverDestinoInstitucional(
    perfil: PerfilDocumental,
    expediente: ExpedienteDocumento,
  ): Promise<DestinoInstitucional> {
    const idSeccionPorNombre = async (nombre: string) => {
      const seccion = await this.prisma.seccion.findUnique({
        where: { nombre },
      });
      if (!seccion) {
        throw new NotFoundException(`Sección ${nombre} no configurada.`);
      }
      return seccion.id_seccion;
    };

    if (perfil.tipo === 'RADIO') {
      return {
        id_seccion_destino: await idSeccionPorNombre(
          NOMBRES_SECCION_DOCUMENTAL.SECRETARIA_GENERAL,
        ),
        tipo_movimiento: TipoMovimientoDocumento.ENVIO,
      };
    }

    const hojaRuta = await this.prisma.hojaRuta.findUnique({
      where: { id_documento: expediente.id_documento },
      include: { proveidos: true },
    });
    const proveidoSegundo = hojaRuta?.proveidos.find(
      (p) => p.numero_momento === 2,
    );

    if (perfil.tipo === 'SECRETARIA_GENERAL') {
      return {
        id_seccion_destino: await idSeccionPorNombre(
          proveidoSegundo
            ? NOMBRES_SECCION_DOCUMENTAL.RADIO
            : NOMBRES_SECCION_DOCUMENTAL.COMANDO,
        ),
        tipo_movimiento: TipoMovimientoDocumento.ENVIO,
      };
    }

    if (perfil.tipo === 'COMANDO') {
      return {
        id_seccion_destino: await idSeccionPorNombre(
          proveidoSegundo
            ? NOMBRES_SECCION_DOCUMENTAL.SECRETARIA_GENERAL
            : NOMBRES_SECCION_DOCUMENTAL.SEGUNDO_COMANDO,
        ),
        tipo_movimiento: TipoMovimientoDocumento.ENVIO,
      };
    }

    if (perfil.tipo === 'SEGUNDO_COMANDO') {
      if (expediente.estado_actual === EstadoDocumento.APROBADO) {
        return {
          id_seccion_destino: await idSeccionPorNombre(
            NOMBRES_SECCION_DOCUMENTAL.COMANDO,
          ),
          tipo_movimiento: TipoMovimientoDocumento.ENVIO,
        };
      }
      if (!proveidoSegundo) {
        throw new ConflictException(
          'No se puede enviar: aún no se registró el segundo proveído con la sección responsable.',
        );
      }
      return {
        id_seccion_destino: proveidoSegundo.id_seccion_destino as number,
        tipo_movimiento: TipoMovimientoDocumento.DERIVACION,
      };
    }

    // AREA (cualquier sección ejecutora no institucional): solo puede
    // devolver el expediente a Segundo Comando.
    return {
      id_seccion_destino: await idSeccionPorNombre(
        NOMBRES_SECCION_DOCUMENTAL.SEGUNDO_COMANDO,
      ),
      tipo_movimiento: TipoMovimientoDocumento.ENVIO,
    };
  }

  async recibir(
    idUsuario: number,
    idMovimiento: number,
    dto: RecibirDocumentoDto,
  ) {
    const perfil = await this.validaciones.obtenerPerfil(idUsuario);
    const movimiento = await this.prisma.movimientoDocumento.findUnique({
      where: { id_movimiento: idMovimiento },
    });
    if (!movimiento) throw new NotFoundException('Movimiento no encontrado.');
    if (movimiento.estado_movimiento !== EstadoMovimiento.PENDIENTE) {
      throw new ConflictException(
        'El movimiento ya fue recibido o anulado.',
      );
    }
    if (perfil.id_seccion !== movimiento.id_seccion_destino) {
      throw new ForbiddenException(
        'El movimiento no está dirigido a su sección.',
      );
    }
    this.validaciones.exigirPermiso(perfil, PERMISOS_DOCUMENTOS.RECIBIR);
    const expediente = await this.obtenerExpediente(movimiento.id_documento);

    // Recibir una DEVOLUCION dexa al expediente en OBSERVADO (hay una
    // observación pendiente de subsanar); cualquier otro tipo de
    // movimiento recibido deja el expediente EN_TRAMITE genérico.
    const estadoResultante =
      movimiento.tipo_movimiento === TipoMovimientoDocumento.DEVOLUCION
        ? EstadoDocumento.OBSERVADO
        : EstadoDocumento.EN_TRAMITE;

    const resultado = await this.prisma.$transaction(async (tx) => {
      const actualizado = await tx.movimientoDocumento.updateMany({
        where: {
          id_movimiento: idMovimiento,
          estado_movimiento: EstadoMovimiento.PENDIENTE,
          id_seccion_destino: perfil.id_seccion as number,
        },
        data: {
          estado_movimiento: EstadoMovimiento.RECIBIDO,
          id_usuario_recibe: idUsuario,
          fecha_hora_recepcion: new Date(),
        },
      });
      if (actualizado.count !== 1) {
        throw new ConflictException(
          'El movimiento ya fue recibido por otro usuario.',
        );
      }

      const expedienteActualizado = await this.flujo.cambiarEstado(
        tx,
        expediente,
        {
          estados_permitidos: [EstadoDocumento.EN_TRANSITO],
          id_seccion_actual_esperada: expediente.id_seccion_actual,
          estado_nuevo: estadoResultante,
          id_seccion_actual_nueva: movimiento.id_seccion_destino,
          id_usuario_responsable_nuevo: idUsuario,
          id_actor: idUsuario,
          id_seccion_actor: perfil.id_seccion as number,
          accion: 'RECIBIR_DOCUMENTO',
          descripcion: 'Documento recibido.',
          motivo: dto.observacion,
        },
      );

      await this.notificacionesDoc.crearEvento(
        {
          id_documento: movimiento.id_documento,
          id_emisor: idUsuario,
          destinatarios: [movimiento.id_usuario_envia],
          tipo: 'DOCUMENTO_RECIBIDO',
          titulo: 'Documento recibido',
          mensaje: 'El documento enviado fue recibido en destino.',
          clave_sufijo: `MOV:${idMovimiento}:RECIBIDO`,
        },
        tx,
      );

      return {
        expediente: expedienteActualizado,
        movimiento: { ...movimiento, estado_movimiento: EstadoMovimiento.RECIBIDO },
      };
    });

    this.emitirTiempoReal([movimiento.id_usuario_envia], {
      tipo: 'DOCUMENTO_RECIBIDO',
      id_documento: movimiento.id_documento,
      id_movimiento: idMovimiento,
    });
    this.gateway.emitirDocumentoActualizado(movimiento.id_documento);

    return resultado;
  }

  /**
   * Primitiva reutilizable: crea el MovimientoDocumento y transiciona el
   * expediente a EN_TRANSITO, dentro de la transacción del llamador.
   * `enviar()` la usa para el envío genérico; los servicios de etapas
   * posteriores (hojas-ruta al derivar con proveído, revision al
   * devolver/reenviar con observación) la reutilizan para combinar el
   * movimiento con sus propias escrituras en una sola transacción atómica,
   * en vez de duplicar esta lógica.
   */
  async crearMovimientoYTransicionar(
    tx: Prisma.TransactionClient,
    expediente: ExpedienteDocumento,
    datos: DatosMovimiento,
  ) {
    const expedienteActualizado = await this.flujo.cambiarEstado(
      tx,
      expediente,
      {
        estados_permitidos: datos.estados_permitidos ?? [
          EstadoDocumento.EN_TRAMITE,
        ],
        id_seccion_actual_esperada: expediente.id_seccion_actual,
        estado_nuevo: EstadoDocumento.EN_TRANSITO,
        id_actor: datos.id_usuario_envia,
        id_seccion_actor: datos.id_seccion_actor,
        accion: datos.accion_auditoria ?? 'ENVIAR_DOCUMENTO',
        descripcion: `Documento enviado (${datos.tipo_movimiento}) a otra sección.`,
        motivo: datos.observacion,
      },
    );

    const movimiento = await tx.movimientoDocumento.create({
      data: {
        id_documento: expediente.id_documento,
        id_seccion_origen: expediente.id_seccion_actual,
        id_seccion_destino: datos.id_seccion_destino,
        id_usuario_envia: datos.id_usuario_envia,
        tipo_movimiento: datos.tipo_movimiento,
        estado_movimiento: EstadoMovimiento.PENDIENTE,
        observacion: datos.observacion,
      },
    });

    const destinatarios = await this.notificacionesDoc.destinatariosPorSeccion(
      datos.id_seccion_destino,
      tx,
    );
    await this.notificacionesDoc.crearEvento(
      {
        id_documento: expediente.id_documento,
        id_emisor: datos.id_usuario_envia,
        destinatarios,
        tipo: 'DOCUMENTO_ENVIADO',
        titulo: 'Documento pendiente de recepción',
        mensaje:
          'Un documento fue enviado a su sección y está pendiente de recepción.',
        clave_sufijo: `MOV:${movimiento.id_movimiento}:ENVIADO`,
      },
      tx,
    );

    return { expediente: expedienteActualizado, movimiento, destinatarios };
  }

  private emitirTiempoReal(destinatarios: number[], evento: Record<string, unknown>) {
    for (const idDestinatario of destinatarios) {
      this.gateway.emitirAUsuario(idDestinatario, evento);
    }
  }

  /**
   * Movimientos dirigidos a la sección del usuario que aún no fueron
   * recibidos — es la "bandeja de entrada" del workflow: sin esto no hay
   * forma de saber qué está en camino hacia la propia sección.
   */
  async listarPendientesPorSeccion(idUsuario: number) {
    const perfil = await this.validaciones.obtenerPerfil(idUsuario);
    this.validaciones.exigirPermiso(perfil, PERMISOS_DOCUMENTOS.RECIBIR);
    if (!perfil.id_seccion) return [];

    return this.prisma.movimientoDocumento.findMany({
      where: {
        id_seccion_destino: perfil.id_seccion,
        estado_movimiento: EstadoMovimiento.PENDIENTE,
      },
      include: {
        seccion_origen: { select: { id_seccion: true, nombre: true } },
        usuario_envia: {
          select: { id_usuario: true, nombres: true, apellidos: true },
        },
        expediente: {
          include: {
            documento: {
              select: {
                id_documento: true,
                codigo_interno: true,
                tipo_documento: true,
                asunto: true,
                prioridad: true,
                clasificacion: true,
              },
            },
          },
        },
      },
      orderBy: { fecha_hora_envio: 'asc' },
    });
  }

  async obtenerExpediente(idDocumento: number) {
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
