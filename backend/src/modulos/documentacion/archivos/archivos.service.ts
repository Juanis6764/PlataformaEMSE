import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Documento, ProveedorAlmacenamiento } from '@prisma/client';
import * as crypto from 'crypto';
import * as path from 'path';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditoriaService } from '../../auditoria/auditoria.service';
import {
  MODULO_DOCUMENTOS,
  PERMISOS_DOCUMENTOS,
} from '../comun/constantes-documentales';
import { ValidacionesDocumentalesService } from '../comun/validaciones-documentales.service';
import { SERVICIO_ALMACENAMIENTO } from './almacenamiento/almacenamiento.interface';
import type { ServicioAlmacenamiento } from './almacenamiento/almacenamiento.interface';

const TIPOS_PERMITIDOS: Record<string, string[]> = {
  'application/pdf': ['.pdf'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [
    '.docx',
  ],
};

// mimetype "canónico" por extensión — usado como respaldo cuando el
// navegador/SO no reporta el mimetype real (llega como
// application/octet-stream u otro genérico, algo común con .doc/.docx según
// cómo se generó el archivo) pero la extensión sí es una de las permitidas.
const MIMETYPE_CANONICO_POR_EXTENSION: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.doc': 'application/msword',
  '.docx':
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

const TAMANO_MAXIMO_BYTES =
  Number(process.env.ALMACENAMIENTO_DOCUMENTOS_MAX_MB ?? 25) * 1024 * 1024;

@Injectable()
export class ArchivosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly validaciones: ValidacionesDocumentalesService,
    private readonly auditoria: AuditoriaService,
    @Inject(SERVICIO_ALMACENAMIENTO)
    private readonly almacenamiento: ServicioAlmacenamiento,
  ) {}

  async subir(
    idUsuario: number,
    idDocumento: number,
    archivo: Express.Multer.File | undefined,
    idCumplimiento?: number,
  ) {
    const perfil = await this.validaciones.obtenerPerfil(idUsuario);
    this.validaciones.exigirPermiso(perfil, PERMISOS_DOCUMENTOS.VER);

    const documento = await this.prisma.documento.findUnique({
      where: { id_documento: idDocumento },
      include: { expediente: true },
    });
    if (!documento) throw new NotFoundException('Documento no encontrado.');

    // Documento principal: solo quien lo tiene actualmente puede adjuntar.
    // Documento relacionado (respuesta/anexo/corrección): no tiene
    // expediente propio, así que no hay "sección actual" que exigir — ya
    // fue creado bajo la validación de sección de su propio flujo.
    if (documento.expediente) {
      this.validaciones.exigirSeccionActual(perfil, documento.expediente);
    }

    if (idCumplimiento) {
      const cumplimiento = await this.prisma.cumplimientoDocumento.findUnique(
        { where: { id_cumplimiento: idCumplimiento } },
      );
      if (!cumplimiento || cumplimiento.id_documento !== idDocumento) {
        throw new BadRequestException(
          'El cumplimiento indicado no pertenece a este documento.',
        );
      }
    }

    const tipoMime = this.validarArchivo(archivo);
    const contenido = archivo!.buffer;
    const hash = crypto.createHash('sha256').update(contenido).digest('hex');
    const extension = path.extname(archivo!.originalname).toLowerCase();
    const ahora = new Date();
    const clave = `${ahora.getFullYear()}/${String(ahora.getMonth() + 1).padStart(2, '0')}/${crypto.randomUUID()}${extension}`;

    await this.almacenamiento.guardar(clave, contenido);

    try {
      return await this.prisma.$transaction(async (tx) => {
        const registro = await tx.archivoDocumento.create({
          data: {
            id_documento: idDocumento,
            id_cumplimiento: idCumplimiento ?? null,
            nombre_original: path.basename(archivo!.originalname),
            clave_almacenamiento: clave,
            proveedor_almacenamiento: ProveedorAlmacenamiento.LOCAL,
            tipo_mime: tipoMime,
            tamano_bytes: archivo!.size,
            hash_sha256: hash,
            id_usuario_subida: idUsuario,
          },
        });

        await this.auditoria.registrar(
          {
            id_usuario: idUsuario,
            accion: 'SUBIR_ARCHIVO',
            modulo: MODULO_DOCUMENTOS,
            entidad: 'ArchivoDocumento',
            id_entidad: registro.id_archivo,
            descripcion: `Archivo "${registro.nombre_original}" subido para el documento ${idDocumento}.`,
            datos_despues: {
              tipo_mime: registro.tipo_mime,
              tamano_bytes: registro.tamano_bytes,
              hash_sha256: registro.hash_sha256,
            },
          },
          tx,
        );

        return registro;
      });
    } catch (error) {
      // Si el registro en BD falla, no dejar el archivo huérfano en disco.
      await this.almacenamiento.eliminar(clave).catch(() => undefined);
      throw error;
    }
  }

  async obtenerContenido(
    idUsuario: number,
    idDocumento: number,
    idArchivo: number,
    accionAuditoria: 'VER_DOCUMENTO' | 'DESCARGAR_DOCUMENTO' | 'IMPRIMIR_DOCUMENTO',
  ) {
    const perfil = await this.validaciones.obtenerPerfil(idUsuario);
    this.validaciones.exigirPermiso(
      perfil,
      accionAuditoria === 'DESCARGAR_DOCUMENTO'
        ? PERMISOS_DOCUMENTOS.DESCARGAR
        : accionAuditoria === 'IMPRIMIR_DOCUMENTO'
          ? PERMISOS_DOCUMENTOS.IMPRIMIR
          : PERMISOS_DOCUMENTOS.VER,
    );

    const documento = await this.prisma.documento.findUnique({
      where: { id_documento: idDocumento },
      include: { expediente: true },
    });
    if (!documento) throw new NotFoundException('Documento no encontrado.');

    const archivo = await this.prisma.archivoDocumento.findUnique({
      where: { id_archivo: idArchivo },
    });
    if (!archivo || archivo.id_documento !== idDocumento) {
      throw new NotFoundException('Archivo no encontrado.');
    }

    const autorizado = await this.tieneAccesoPorClasificacion(
      idUsuario,
      perfil,
      documento,
    );
    if (!autorizado) {
      await this.auditoria.registrar({
        id_usuario: idUsuario,
        accion: 'INTENTO_ACCESO_DENEGADO',
        modulo: MODULO_DOCUMENTOS,
        entidad: 'ArchivoDocumento',
        id_entidad: idArchivo,
        descripcion: `Acceso denegado a archivo de documento clasificado (${documento.clasificacion}).`,
      });
      // Mensaje genérico: no se revela clasificación, ruta física ni motivo detallado.
      throw new ForbiddenException('No autorizado para acceder a este archivo.');
    }

    const contenido = await this.almacenamiento.leer(archivo.clave_almacenamiento);

    await this.auditoria.registrar({
      id_usuario: idUsuario,
      accion: accionAuditoria,
      modulo: MODULO_DOCUMENTOS,
      entidad: 'ArchivoDocumento',
      id_entidad: idArchivo,
      descripcion: `Archivo "${archivo.nombre_original}" accedido (${accionAuditoria}).`,
    });

    return {
      buffer: contenido,
      tipo_mime: archivo.tipo_mime,
      nombre_original: archivo.nombre_original,
    };
  }

  /**
   * PUBLICO es visible para cualquiera con permiso de ver documentos.
   * CONFIDENCIAL/RESERVADO/SECRETO exigen participación real en el
   * expediente (quien lo registró, el responsable actual, o quien
   * participó en algún movimiento/proveído) — ser ADMINISTRADOR del
   * sistema NO otorga acceso automático a contenido clasificado.
   */
  private async tieneAccesoPorClasificacion(
    idUsuario: number,
    perfil: Awaited<
      ReturnType<ValidacionesDocumentalesService['obtenerPerfil']>
    >,
    documento: Documento & { expediente: { id_usuario_responsable_actual: number | null } | null },
  ): Promise<boolean> {
    if (documento.clasificacion === 'PUBLICO') return true;
    if (documento.id_usuario_registro === idUsuario) return true;
    if (documento.expediente?.id_usuario_responsable_actual === idUsuario) {
      return true;
    }
    const participoEnMovimiento = await this.prisma.movimientoDocumento.findFirst({
      where: {
        id_documento: documento.id_documento,
        OR: [{ id_usuario_envia: idUsuario }, { id_usuario_recibe: idUsuario }],
      },
      select: { id_movimiento: true },
    });
    if (participoEnMovimiento) return true;

    const participoEnProveido = await this.prisma.proveido.findFirst({
      where: {
        id_usuario_emisor: idUsuario,
        hoja_ruta: { id_documento: documento.id_documento },
      },
      select: { id_proveido: true },
    });
    if (participoEnProveido) return true;

    // Una respuesta no tiene expediente propio. Hereda el alcance de lectura
    // del documento principal al que está vinculada, sin ampliar permisos a
    // usuarios que nunca participaron en ese expediente.
    const relacionRespuesta = await this.prisma.documentoRelacionado.findFirst({
      where: {
        id_documento_relacionado: documento.id_documento,
        tipo_relacion: 'RESPUESTA',
      },
      select: { id_documento_origen: true },
    });
    return relacionRespuesta
      ? this.validaciones.puedeConsultarDocumento(
          perfil,
          relacionRespuesta.id_documento_origen,
        )
      : false;
  }

  /**
   * Valida el archivo y devuelve el mimetype "canónico" a persistir. Si el
   * mimetype reportado por el cliente es uno de los permitidos, se exige
   * además que la extensión coincida (evita disfrazar un ejecutable con
   * nombre .pdf). Si el mimetype no está en la lista (p. ej.
   * application/octet-stream, común en algunos .doc/.docx según cómo se
   * generó el archivo), se usa como respaldo la extensión real del nombre
   * de archivo — si esa extensión sí es una de las permitidas, se acepta y
   * se normaliza el mimetype a guardar.
   */
  private validarArchivo(archivo: Express.Multer.File | undefined): string {
    if (!archivo || !archivo.buffer || archivo.size === 0) {
      throw new BadRequestException('El archivo está vacío o no fue proporcionado.');
    }
    if (archivo.size > TAMANO_MAXIMO_BYTES) {
      throw new BadRequestException(
        `El archivo supera el tamaño máximo permitido (${TAMANO_MAXIMO_BYTES / (1024 * 1024)} MB).`,
      );
    }
    const extension = path.extname(archivo.originalname).toLowerCase();

    const extensionesValidas = TIPOS_PERMITIDOS[archivo.mimetype];
    if (extensionesValidas) {
      if (!extensionesValidas.includes(extension)) {
        throw new BadRequestException(
          'La extensión del archivo no coincide con su contenido real.',
        );
      }
      return archivo.mimetype;
    }

    const mimetypeCanonico = MIMETYPE_CANONICO_POR_EXTENSION[extension];
    if (!mimetypeCanonico) {
      throw new BadRequestException(
        'Tipo de archivo no permitido. Formatos aceptados: PDF, JPG, JPEG, PNG, DOC, DOCX.',
      );
    }
    return mimetypeCanonico;
  }
}
