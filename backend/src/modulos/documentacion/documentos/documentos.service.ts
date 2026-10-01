import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  EstadoDocumento,
  TipoAtencionRequerida,
  TipoRelacionDocumento,
} from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditoriaService } from '../../auditoria/auditoria.service';
import { CorrelativoDocumentalService } from '../comun/correlativo-documental.service';
import {
  MODULO_DOCUMENTOS,
  PERMISOS_DOCUMENTOS,
} from '../comun/constantes-documentales';
import { ValidacionesDocumentalesService } from '../comun/validaciones-documentales.service';
import { RegistrarDocumentoDto } from './dto/registrar-documento.dto';
import { DocumentacionGateway } from '../tiempo-real/documentacion.gateway';

const ESTADOS_QUE_ADMITEN_RESPUESTA: EstadoDocumento[] = [
  EstadoDocumento.EN_TRAMITE,
  EstadoDocumento.OBSERVADO,
];

@Injectable()
export class DocumentosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly validaciones: ValidacionesDocumentalesService,
    private readonly correlativo: CorrelativoDocumentalService,
    private readonly auditoria: AuditoriaService,
    private readonly gateway: DocumentacionGateway,
  ) {}

  async registrarPrincipal(idUsuario: number, dto: RegistrarDocumentoDto) {
    const perfil = await this.validaciones.obtenerPerfil(idUsuario);
    this.validaciones.exigirTipo(perfil, 'RADIO');
    this.validaciones.exigirPermiso(perfil, PERMISOS_DOCUMENTOS.CREAR);
    if (!perfil.id_seccion) {
      throw new NotFoundException('El usuario no pertenece a ninguna sección.');
    }

    const resultado = await this.prisma.$transaction(async (tx) => {
      const anio = new Date().getFullYear();
      const codigo_interno = await this.correlativo.generarCodigoDocumento(
        tx,
        dto.tipo_documento,
        anio,
      );

      const documento = await tx.documento.create({
        data: {
          codigo_interno,
          tipo_documento: dto.tipo_documento,
          numero_origen: dto.numero_origen,
          procedencia: dto.procedencia,
          asunto: dto.asunto,
          sintesis: dto.sintesis,
          prioridad: dto.prioridad,
          clasificacion: dto.clasificacion,
          fecha_documento: dto.fecha_documento
            ? new Date(dto.fecha_documento)
            : null,
          id_usuario_registro: idUsuario,
          id_seccion_registro: perfil.id_seccion as number,
        },
      });

      const expediente = await tx.expedienteDocumento.create({
        data: {
          id_documento: documento.id_documento,
          estado_actual: EstadoDocumento.REGISTRADO,
          id_seccion_actual: perfil.id_seccion as number,
          id_usuario_responsable_actual: idUsuario,
        },
      });

      await tx.historialEstadoDocumento.create({
        data: {
          id_documento: documento.id_documento,
          estado_anterior: null,
          estado_nuevo: EstadoDocumento.REGISTRADO,
          id_usuario: idUsuario,
          id_seccion: perfil.id_seccion as number,
          motivo: 'Registro inicial en Radio.',
        },
      });

      await this.auditoria.registrar(
        {
          id_usuario: idUsuario,
          accion: 'CREAR_DOCUMENTO',
          modulo: MODULO_DOCUMENTOS,
          entidad: 'Documento',
          id_entidad: documento.id_documento,
          descripcion: `Documento ${documento.codigo_interno} registrado.`,
          datos_despues: {
            codigo_interno: documento.codigo_interno,
            tipo_documento: documento.tipo_documento,
            clasificacion: documento.clasificacion,
          },
        },
        tx,
      );

      return { ...documento, expediente };
    });
    this.gateway.emitirDocumentoActualizado(resultado.id_documento);
    return resultado;
  }

  /**
   * El área responsable crea un documento de respuesta institucional
   * cuando `tipo_atencion_requerida = RESPUESTA`. La respuesta es un
   * Documento completo (código propio, puede tener sus propios archivos)
   * pero NUNCA recibe ExpedienteDocumento propio: no tiene hoja de ruta ni
   * workflow independiente — queda ligada al original vía
   * DocumentoRelacionado (RESPUESTA). El original sigue su propio flujo
   * normalmente (el área lo envía con `movimientos.enviar()` una vez
   * creada la respuesta).
   */
  async crearRespuesta(
    idUsuario: number,
    idDocumentoOriginal: number,
    dto: RegistrarDocumentoDto,
  ) {
    const perfil = await this.validaciones.obtenerPerfil(idUsuario);
    this.validaciones.exigirPermiso(
      perfil,
      PERMISOS_DOCUMENTOS.CREAR_RESPUESTA,
    );

    const expedienteOriginal = await this.prisma.expedienteDocumento.findUnique(
      {
        where: { id_documento: idDocumentoOriginal },
      },
    );
    if (!expedienteOriginal) {
      throw new NotFoundException(
        'Expediente original no encontrado (debe ser un documento principal).',
      );
    }
    this.validaciones.exigirSeccionActual(perfil, expedienteOriginal);
    if (
      !ESTADOS_QUE_ADMITEN_RESPUESTA.includes(expedienteOriginal.estado_actual)
    ) {
      throw new ConflictException(
        'Solo se puede crear una respuesta mientras el expediente original está en trámite u observado.',
      );
    }
    if (
      expedienteOriginal.tipo_atencion_requerida !==
      TipoAtencionRequerida.RESPUESTA
    ) {
      throw new BadRequestException(
        'Este documento requiere CUMPLIMIENTO, no una respuesta institucional.',
      );
    }

    const resultado = await this.prisma.$transaction(async (tx) => {
      const anio = new Date().getFullYear();
      const codigo_interno = await this.correlativo.generarCodigoDocumento(
        tx,
        dto.tipo_documento,
        anio,
      );

      const respuesta = await tx.documento.create({
        data: {
          codigo_interno,
          tipo_documento: dto.tipo_documento,
          numero_origen: dto.numero_origen,
          procedencia: dto.procedencia,
          asunto: dto.asunto,
          sintesis: dto.sintesis,
          prioridad: dto.prioridad,
          clasificacion: dto.clasificacion,
          fecha_documento: dto.fecha_documento
            ? new Date(dto.fecha_documento)
            : null,
          id_usuario_registro: idUsuario,
          id_seccion_registro: perfil.id_seccion as number,
        },
      });

      const relacion = await tx.documentoRelacionado.create({
        data: {
          id_documento_origen: idDocumentoOriginal,
          id_documento_relacionado: respuesta.id_documento,
          tipo_relacion: TipoRelacionDocumento.RESPUESTA,
          id_usuario_registro: idUsuario,
        },
      });

      // Igual que en CumplimientosService: la respuesta institucional
      // también cumple el plazo vigente para esta sección.
      await tx.plazoDocumento.updateMany({
        where: {
          fecha_hora_cumplimiento: null,
          id_seccion_responsable: perfil.id_seccion as number,
          proveido: { hoja_ruta: { id_documento: idDocumentoOriginal } },
        },
        data: { fecha_hora_cumplimiento: new Date() },
      });

      await this.auditoria.registrar(
        {
          id_usuario: idUsuario,
          accion: 'CREAR_RESPUESTA',
          modulo: MODULO_DOCUMENTOS,
          entidad: 'Documento',
          id_entidad: respuesta.id_documento,
          descripcion: `Respuesta ${respuesta.codigo_interno} creada para el documento ${idDocumentoOriginal}.`,
          datos_despues: { codigo_interno: respuesta.codigo_interno },
        },
        tx,
      );

      return { respuesta, relacion };
    });
    this.gateway.emitirDocumentoActualizado(idDocumentoOriginal);
    return resultado;
  }

  async obtenerDetalle(idUsuario: number, idDocumento: number) {
    const perfil = await this.validaciones.obtenerPerfil(idUsuario);
    this.validaciones.exigirPermiso(perfil, PERMISOS_DOCUMENTOS.VER);
    const documento = await this.prisma.documento.findFirst({
      where: {
        AND: [
          { id_documento: idDocumento },
          this.validaciones.crearFiltroConsulta(perfil),
        ],
      },
      include: {
        usuario_registro: {
          select: { id_usuario: true, nombres: true, apellidos: true },
        },
        seccion_registro: { select: { id_seccion: true, nombre: true } },
        expediente: {
          include: {
            seccion_actual: { select: { id_seccion: true, nombre: true } },
            usuario_responsable_actual: {
              select: { id_usuario: true, nombres: true, apellidos: true },
            },
          },
        },
      },
    });
    if (!documento) throw new NotFoundException('Documento no encontrado.');
    return documento;
  }

  async listar(idUsuario: number) {
    const perfil = await this.validaciones.obtenerPerfil(idUsuario);
    this.validaciones.exigirPermiso(perfil, PERMISOS_DOCUMENTOS.VER);
    return this.prisma.documento.findMany({
      where: this.validaciones.crearFiltroConsulta(perfil),
      include: {
        expediente: {
          select: {
            estado_actual: true,
            id_seccion_actual: true,
            tipo_atencion_requerida: true,
          },
        },
      },
      orderBy: { fecha_hora_registro: 'desc' },
      take: 100,
    });
  }
}
