import { Body, Controller, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Permisos } from '../../../comun/decorators/permisos.decorator';
import { UsuarioAutenticado } from '../../../comun/decorators/usuario-autenticado.decorator';
import { JwtAuthGuard } from '../../../comun/guards/jwt-auth.guard';
import { PermisosGuard } from '../../../comun/guards/permisos.guard';
import { PERMISOS_DOCUMENTOS } from '../comun/constantes-documentales';
import { CumplimientosService } from './cumplimientos.service';
import { RegistrarCumplimientoDto } from './dto/registrar-cumplimiento.dto';

@ApiTags('Documentación - Cumplimientos')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, PermisosGuard)
@Controller('documentacion/documentos')
export class CumplimientosController {
  constructor(private readonly servicio: CumplimientosService) {}

  @Post(':id/cumplimiento')
  @Permisos(PERMISOS_DOCUMENTOS.REGISTRAR_CUMPLIMIENTO)
  registrar(
    @UsuarioAutenticado('id_usuario') usuario: number,
    @Param('id', ParseIntPipe) idDocumento: number,
    @Body() dto: RegistrarCumplimientoDto,
  ) {
    return this.servicio.registrar(usuario, idDocumento, dto);
  }
}
