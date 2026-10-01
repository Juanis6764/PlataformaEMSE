import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Permisos } from '../../../comun/decorators/permisos.decorator';
import { JwtAuthGuard } from '../../../comun/guards/jwt-auth.guard';
import { PermisosGuard } from '../../../comun/guards/permisos.guard';
import { PERMISOS_DOCUMENTOS } from '../comun/constantes-documentales';
import { SeccionesDocumentalesService } from './secciones-documentales.service';

@ApiTags('Documentación - Secciones')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, PermisosGuard)
@Controller('documentacion/secciones')
export class SeccionesDocumentalesController {
  constructor(private readonly servicio: SeccionesDocumentalesService) {}

  @Get()
  @Permisos(PERMISOS_DOCUMENTOS.VER)
  listar() {
    return this.servicio.listar();
  }
}
