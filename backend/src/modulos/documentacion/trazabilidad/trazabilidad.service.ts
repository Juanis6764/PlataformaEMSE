import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { PERMISOS_DOCUMENTOS } from '../comun/constantes-documentales';
import { ValidacionesDocumentalesService } from '../comun/validaciones-documentales.service';
import { PlazosService } from '../plazos/plazos.service';

const SELECT_PERSONA = {
  id_usuario: true,
  nombres: true,
  apellidos: true,
} as const;
const SELECT_SECCION = { id_seccion: true, nombre: true } as const;

/**
 * No existe una tabla de "timeline": esta vista se construye combinando
 * Documento + ExpedienteDocumento + HojaRuta/Proveido + Movimientos +
 * HistorialEstadoDocumento + Observaciones + Cumplimientos + relacionados
 * + archivos + plazo vigente, tal como se definió en FASE 1.
 */
@Injectable()
export class TrazabilidadService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly validaciones: ValidacionesDocumentalesService,
    private readonly plazos: PlazosService,
  ) {}

  async obtener(idUsuario: number, idDocumento: number) {
    const perfil = await this.validaciones.obtenerPerfil(idUsuario);
    this.validaciones.exigirPermiso(perfil, PERMISOS_DOCUMENTOS.VER);

    if (
      !(await this.validaciones.puedeConsultarDocumento(perfil, idDocumento))
    ) {
      throw new NotFoundException('Documento no encontrado.');
    }

    const documento = await this.prisma.documento.findUnique({
      where: { id_documento: idDocumento },
      include: {
        usuario_registro: { select: SELECT_PERSONA },
        seccion_registro: { select: SELECT_SECCION },
        archivos: {
          select: {
            id_archivo: true,
            nombre_original: true,
            tipo_mime: true,
            tamano_bytes: true,
            fecha_hora_subida: true,
            id_cumplimiento: true,
          },
        },
        relaciones_como_origen: {
          include: {
            documento_relacionado: {
              include: {
                usuario_registro: { select: SELECT_PERSONA },
                seccion_registro: { select: SELECT_SECCION },
                archivos: {
                  select: {
                    id_archivo: true,
                    id_documento: true,
                    id_cumplimiento: true,
                    nombre_original: true,
                    tipo_mime: true,
                    tamano_bytes: true,
                    hash_sha256: true,
                    cifrado: true,
                    id_usuario_subida: true,
                    fecha_hora_subida: true,
                  },
                  orderBy: { fecha_hora_subida: 'asc' },
                },
              },
            },
          },
          orderBy: { fecha_hora: 'asc' },
        },
        relaciones_como_relacionado: {
          include: {
            documento_origen: {
              select: {
                id_documento: true,
                codigo_interno: true,
                tipo_documento: true,
                asunto: true,
              },
            },
          },
        },
      },
    });
    if (!documento) throw new NotFoundException('Documento no encontrado.');

    const expediente = await this.prisma.expedienteDocumento.findUnique({
      where: { id_documento: idDocumento },
      include: {
        seccion_actual: { select: SELECT_SECCION },
        usuario_responsable_actual: { select: SELECT_PERSONA },
        hoja_ruta: {
          include: {
            usuario_asigno: { select: SELECT_PERSONA },
            seccion: { select: SELECT_SECCION },
            proveidos: {
              include: {
                usuario_emisor: { select: SELECT_PERSONA },
                seccion_emisora: { select: SELECT_SECCION },
                seccion_destino: { select: SELECT_SECCION },
              },
              orderBy: { numero_momento: 'asc' },
            },
          },
        },
        movimientos: {
          include: {
            seccion_origen: { select: SELECT_SECCION },
            seccion_destino: { select: SELECT_SECCION },
            usuario_envia: { select: SELECT_PERSONA },
            usuario_recibe: { select: SELECT_PERSONA },
          },
          orderBy: { fecha_hora_envio: 'asc' },
        },
        historial: {
          orderBy: { fecha_hora: 'asc' },
          include: {
            usuario: { select: SELECT_PERSONA },
            seccion: { select: SELECT_SECCION },
          },
        },
        observaciones: {
          include: {
            usuario: { select: SELECT_PERSONA },
            seccion: { select: SELECT_SECCION },
          },
          orderBy: { fecha_hora: 'asc' },
        },
        cumplimientos: {
          include: {
            usuario: { select: SELECT_PERSONA },
            seccion: { select: SELECT_SECCION },
            archivos: { select: { id_archivo: true, nombre_original: true } },
          },
          orderBy: { fecha_hora: 'asc' },
        },
      },
    });

    const plazoVigente = await this.plazos.obtenerPlazoVigente(idDocumento);
    const plazos = await this.plazos.listarPlazosDelExpediente(idDocumento);

    return { documento, expediente, plazo_vigente: plazoVigente, plazos };
  }
}
