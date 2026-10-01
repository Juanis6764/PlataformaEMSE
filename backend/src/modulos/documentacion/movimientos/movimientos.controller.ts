import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Permisos } from '../../../comun/decorators/permisos.decorator';
import { UsuarioAutenticado } from '../../../comun/decorators/usuario-autenticado.decorator';
import { JwtAuthGuard } from '../../../comun/guards/jwt-auth.guard';
import { PermisosGuard } from '../../../comun/guards/permisos.guard';
import { PERMISOS_DOCUMENTOS } from '../comun/constantes-documentales';
import { EnviarDocumentoDto } from './dto/enviar-documento.dto';
import { RecibirDocumentoDto } from './dto/recibir-documento.dto';
import { MovimientosService } from './movimientos.service';

@ApiTags('Documentación - Movimientos')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, PermisosGuard)
@Controller('documentacion')
export class MovimientosController {
  constructor(private readonly servicio: MovimientosService) {}

  @Get('movimientos/pendientes')
  @Permisos(PERMISOS_DOCUMENTOS.RECIBIR)
  listarPendientes(@UsuarioAutenticado('id_usuario') usuario: number) {
    return this.servicio.listarPendientesPorSeccion(usuario);
  }

  @Post('documentos/:id/enviar')
  @Permisos(PERMISOS_DOCUMENTOS.ENVIAR, PERMISOS_DOCUMENTOS.DERIVAR)
  enviar(
    @UsuarioAutenticado('id_usuario') usuario: number,
    @Param('id', ParseIntPipe) idDocumento: number,
    @Body() dto: EnviarDocumentoDto,
  ) {
    return this.servicio.enviar(usuario, idDocumento, dto);
  }

  @Post('movimientos/:id/recibir')
  @Permisos(PERMISOS_DOCUMENTOS.RECIBIR)
  recibir(
    @UsuarioAutenticado('id_usuario') usuario: number,
    @Param('id', ParseIntPipe) idMovimiento: number,
    @Body() dto: RecibirDocumentoDto,
  ) {
    return this.servicio.recibir(usuario, idMovimiento, dto);
  }
}
