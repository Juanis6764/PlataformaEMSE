import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../comun/guards/jwt-auth.guard';
import { PermisosGuard } from '../../comun/guards/permisos.guard';
import { Permisos } from '../../comun/decorators/permisos.decorator';
import { UsuarioAutenticado } from '../../comun/decorators/usuario-autenticado.decorator';
import { GestionAcademicaService } from './gestion-academica.service';
import {
  ActualizarGestionAcademicaDto,
  CrearGestionAcademicaDto,
} from './dto/gestion-academica.dto';

@ApiTags('Gestión Académica')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, PermisosGuard)
@Controller('gestion-academica')
/** Gestiones y periodos académicos (I/2026, II/2026...) administrados por el Administrador. */
export class GestionAcademicaController {
  constructor(private readonly servicio: GestionAcademicaService) {}

  @Get('gestiones')
  @Permisos('GESTIONAR_GESTION_ACADEMICA')
  listarGestiones() {
    return this.servicio.listarGestiones();
  }

  @Post('gestiones')
  @Permisos('GESTIONAR_GESTION_ACADEMICA')
  crearGestion(
    @UsuarioAutenticado('id_usuario') usuario: number,
    @Body() dto: CrearGestionAcademicaDto,
  ) {
    return this.servicio.crearGestion(usuario, dto);
  }

  @Patch('gestiones/:id')
  @Permisos('GESTIONAR_GESTION_ACADEMICA')
  actualizarGestion(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarGestionAcademicaDto,
  ) {
    return this.servicio.actualizarEstadoGestion(id, dto);
  }

  @Patch('periodos/:id/activar')
  @Permisos('GESTIONAR_GESTION_ACADEMICA')
  activarPeriodo(@Param('id', ParseIntPipe) id: number) {
    return this.servicio.activarPeriodo(id);
  }

  @Get('periodo-activo')
  @Permisos('GESTIONAR_GESTION_ACADEMICA')
  periodoActivo() {
    return this.servicio.obtenerPeriodoActivo();
  }
}
