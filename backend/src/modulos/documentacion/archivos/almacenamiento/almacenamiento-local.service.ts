import { Injectable } from '@nestjs/common';
import { promises as fs } from 'fs';
import * as path from 'path';
import { ServicioAlmacenamiento } from './almacenamiento.interface';

/**
 * Implementación de desarrollo: guarda en un directorio privado del
 * backend, fuera de `frontend/public` y nunca servido como estático. El
 * nombre físico es la propia clave lógica (UUID + extensión) generada por
 * `ArchivosService`, nunca el nombre original del archivo.
 */
@Injectable()
export class AlmacenamientoLocalService implements ServicioAlmacenamiento {
  private readonly directorioBase = path.resolve(
    process.env.ALMACENAMIENTO_DOCUMENTOS_DIR ??
      path.join(process.cwd(), 'almacenamiento-privado', 'documentos'),
  );

  async guardar(clave: string, contenido: Buffer): Promise<void> {
    const rutaAbsoluta = this.resolverRuta(clave);
    await fs.mkdir(path.dirname(rutaAbsoluta), { recursive: true });
    await fs.writeFile(rutaAbsoluta, contenido);
  }

  async leer(clave: string): Promise<Buffer> {
    return fs.readFile(this.resolverRuta(clave));
  }

  async eliminar(clave: string): Promise<void> {
    await fs.rm(this.resolverRuta(clave), { force: true });
  }

  private resolverRuta(clave: string): string {
    const rutaAbsoluta = path.resolve(this.directorioBase, clave);
    // Evita path traversal: la ruta resuelta debe quedar dentro del
    // directorio base pase lo que pase con la clave recibida.
    if (
      rutaAbsoluta !== this.directorioBase &&
      !rutaAbsoluta.startsWith(this.directorioBase + path.sep)
    ) {
      throw new Error('Clave de almacenamiento inválida.');
    }
    return rutaAbsoluta;
  }
}
