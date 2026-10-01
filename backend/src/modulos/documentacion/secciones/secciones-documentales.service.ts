import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

/**
 * Lectura de secciones para uso del frontend documental (bandeja, detalle,
 * reportes, selector de área responsable del segundo proveído). No
 * duplica SeccionesService (Control de Acceso, que además crea/edita/
 * elimina secciones bajo GESTIONAR_SECCIONES): esto es un espejo de solo
 * lectura, gateado por DOC_VER_DOCUMENTOS, para no depender de un permiso
 * de Control de Acceso ajeno al módulo documental.
 */
@Injectable()
export class SeccionesDocumentalesService {
  constructor(private readonly prisma: PrismaService) {}

  listar() {
    return this.prisma.seccion.findMany({
      where: { estado: true },
      orderBy: { nivel: 'asc' },
    });
  }
}
