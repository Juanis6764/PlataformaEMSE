export const SERVICIO_ALMACENAMIENTO = Symbol('SERVICIO_ALMACENAMIENTO');

/**
 * Abstracción de almacenamiento de archivos documentales. La BD solo
 * guarda la clave lógica (`ArchivoDocumento.clave_almacenamiento`) y el
 * proveedor (`ProveedorAlmacenamiento.LOCAL` | `S3`); ningún servicio de
 * negocio conoce rutas físicas ni credenciales. Cambiar de LOCAL a S3 más
 * adelante implica escribir un `AlmacenamientoS3Service` que implemente
 * este mismo contrato — sin tocar `ArchivosService` ni el resto del
 * módulo documental.
 */
export interface ServicioAlmacenamiento {
  guardar(clave: string, contenido: Buffer): Promise<void>;
  leer(clave: string): Promise<Buffer>;
  eliminar(clave: string): Promise<void>;
}
