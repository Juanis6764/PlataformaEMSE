import {
  Body,
  Controller,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Permisos } from '../../../comun/decorators/permisos.decorator';
import { UsuarioAutenticado } from '../../../comun/decorators/usuario-autenticado.decorator';
import { JwtAuthGuard } from '../../../comun/guards/jwt-auth.guard';
import { PermisosGuard } from '../../../comun/guards/permisos.guard';
import { PERMISOS_DOCUMENTOS } from '../comun/constantes-documentales';
import { EditarProveidoDto } from './dto/editar-proveido.dto';
import { RegistrarProveidoDto } from './dto/registrar-proveido.dto';
import { HojasRutaService } from './hojas-ruta.service';

@ApiTags('Documentación - Hojas de Ruta')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, PermisosGuard)
@Controller('documentacion')
export class HojasRutaController {
  constructor(private readonly servicio: HojasRutaService) {}

  @Post('documentos/:id/hoja-ruta')
  @Permisos(PERMISOS_DOCUMENTOS.ASIGNAR_HOJA_RUTA)
  asignar(
    @UsuarioAutenticado('id_usuario') usuario: number,
    @Param('id', ParseIntPipe) idDocumento: number,
  ) {
    return this.servicio.asignar(usuario, idDocumento);
  }

  @Post('hojas-ruta/:id/proveidos')
  @Permisos(PERMISOS_DOCUMENTOS.REGISTRAR_PROVEIDO)
  registrarProveido(
    @UsuarioAutenticado('id_usuario') usuario: number,
    @Param('id', ParseIntPipe) idHojaRuta: number,
    @Body() dto: RegistrarProveidoDto,
  ) {
    return this.servicio.registrarProveido(usuario, idHojaRuta, dto);
  }

  @Patch('hojas-ruta/:id/proveidos/primero')
  @Permisos(PERMISOS_DOCUMENTOS.REGISTRAR_PROVEIDO)
  editarPrimerProveido(
    @UsuarioAutenticado('id_usuario') usuario: number,
    @Param('id', ParseIntPipe) idHojaRuta: number,
    @Body() dto: EditarProveidoDto,
  ) {
    return this.servicio.editarPrimerProveido(usuario, idHojaRuta, dto);
  }
}
