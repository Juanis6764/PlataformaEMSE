import { Controller, Get, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Permisos } from '../../../comun/decorators/permisos.decorator';
import { UsuarioAutenticado } from '../../../comun/decorators/usuario-autenticado.decorator';
import { JwtAuthGuard } from '../../../comun/guards/jwt-auth.guard';
import { PermisosGuard } from '../../../comun/guards/permisos.guard';
import { PERMISOS_DOCUMENTOS } from '../comun/constantes-documentales';
import { TrazabilidadService } from './trazabilidad.service';

@ApiTags('Documentación - Trazabilidad')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, PermisosGuard)
@Controller('documentacion/documentos')
export class TrazabilidadController {
  constructor(private readonly servicio: TrazabilidadService) {}

  @Get(':id/trazabilidad')
  @Permisos(PERMISOS_DOCUMENTOS.VER)
  obtener(
    @UsuarioAutenticado('id_usuario') usuario: number,
    @Param('id', ParseIntPipe) idDocumento: number,
  ) {
    return this.servicio.obtener(usuario, idDocumento);
  }
}
