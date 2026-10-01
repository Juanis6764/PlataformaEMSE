import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Permisos } from '../../../comun/decorators/permisos.decorator';
import { UsuarioAutenticado } from '../../../comun/decorators/usuario-autenticado.decorator';
import { JwtAuthGuard } from '../../../comun/guards/jwt-auth.guard';
import { PermisosGuard } from '../../../comun/guards/permisos.guard';
import { PERMISOS_NOTAS } from '../comun/constantes-notas';
import { ConfiguracionEvaluacionesService } from './configuracion-evaluaciones.service';
import {
  ActualizarConfiguracionEvaluacionesDto,
  CrearConfiguracionEvaluacionesDto,
  FiltrarConfiguracionesEvaluacionesDto,
} from './dto/configuracion-evaluaciones.dto';

@ApiTags('Notas - Evaluaciones - Configuración')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, PermisosGuard)
@Controller('notas/evaluaciones/configuraciones')
export class ConfiguracionEvaluacionesController {
  constructor(private readonly servicio: ConfiguracionEvaluacionesService) {}

  @Get()
  @Permisos(PERMISOS_NOTAS.VER)
  listar(
    @UsuarioAutenticado('id_usuario') usuario: number,
    @Query() filtros: FiltrarConfiguracionesEvaluacionesDto,
  ) {
    return this.servicio.listar(usuario, filtros);
  }

  @Post()
  @Permisos(PERMISOS_NOTAS.REGISTRAR)
  crear(
    @UsuarioAutenticado('id_usuario') usuario: number,
    @Body() dto: CrearConfiguracionEvaluacionesDto,
  ) {
    return this.servicio.crear(usuario, dto);
  }

  @Patch(':id')
  @Permisos(PERMISOS_NOTAS.EDITAR)
  actualizar(
    @UsuarioAutenticado('id_usuario') usuario: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarConfiguracionEvaluacionesDto,
  ) {
    return this.servicio.actualizar(usuario, id, dto);
  }
}
