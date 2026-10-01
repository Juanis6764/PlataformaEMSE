import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Res,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { memoryStorage } from 'multer';
import { Permisos } from '../../../comun/decorators/permisos.decorator';
import { UsuarioAutenticado } from '../../../comun/decorators/usuario-autenticado.decorator';
import { JwtAuthGuard } from '../../../comun/guards/jwt-auth.guard';
import { PermisosGuard } from '../../../comun/guards/permisos.guard';
import { PERMISOS_DOCUMENTOS } from '../comun/constantes-documentales';
import { ArchivosService } from './archivos.service';

@ApiTags('Documentación - Archivos')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, PermisosGuard)
@Controller('documentacion/documentos/:id/archivos')
export class ArchivosController {
  constructor(private readonly servicio: ArchivosService) {}

  @Post()
  @Permisos(PERMISOS_DOCUMENTOS.VER)
  @UseInterceptors(
    FileInterceptor('archivo', { storage: memoryStorage() }),
  )
  subir(
    @UsuarioAutenticado('id_usuario') usuario: number,
    @Param('id', ParseIntPipe) idDocumento: number,
    @UploadedFile() archivo: Express.Multer.File,
    @Query('id_cumplimiento') idCumplimiento?: string,
  ) {
    return this.servicio.subir(
      usuario,
      idDocumento,
      archivo,
      idCumplimiento ? Number(idCumplimiento) : undefined,
    );
  }

  @Get(':archivoId/visualizar')
  @Permisos(PERMISOS_DOCUMENTOS.VER)
  async visualizar(
    @UsuarioAutenticado('id_usuario') usuario: number,
    @Param('id', ParseIntPipe) idDocumento: number,
    @Param('archivoId', ParseIntPipe) idArchivo: number,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { buffer, tipo_mime, nombre_original } =
      await this.servicio.obtenerContenido(
        usuario,
        idDocumento,
        idArchivo,
        'IMPRIMIR_DOCUMENTO',
      );
    res.set({
      'Content-Type': tipo_mime,
      'Content-Disposition': `inline; filename="${encodeURIComponent(nombre_original)}"`,
    });
    return new StreamableFile(buffer);
  }

  @Get(':archivoId/descargar')
  @Permisos(PERMISOS_DOCUMENTOS.DESCARGAR)
  async descargar(
    @UsuarioAutenticado('id_usuario') usuario: number,
    @Param('id', ParseIntPipe) idDocumento: number,
    @Param('archivoId', ParseIntPipe) idArchivo: number,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { buffer, tipo_mime, nombre_original } =
      await this.servicio.obtenerContenido(
        usuario,
        idDocumento,
        idArchivo,
        'DESCARGAR_DOCUMENTO',
      );
    res.set({
      'Content-Type': tipo_mime,
      'Content-Disposition': `attachment; filename="${encodeURIComponent(nombre_original)}"`,
    });
    return new StreamableFile(buffer);
  }
}
