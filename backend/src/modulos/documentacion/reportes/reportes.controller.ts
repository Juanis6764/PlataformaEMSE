import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Permisos } from '../../../comun/decorators/permisos.decorator';
import { UsuarioAutenticado } from '../../../comun/decorators/usuario-autenticado.decorator';
import { JwtAuthGuard } from '../../../comun/guards/jwt-auth.guard';
import { PermisosGuard } from '../../../comun/guards/permisos.guard';
import { PERMISOS_DOCUMENTOS } from '../comun/constantes-documentales';
import { FiltrarReporteDto } from './dto/filtrar-reporte.dto';
import { FiltrarSeguimientoDto } from './dto/filtrar-seguimiento.dto';
import { ReportesService } from './reportes.service';

@ApiTags('Documentación - Reportes')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, PermisosGuard)
@Controller('documentacion/reportes')
export class ReportesController {
  constructor(private readonly servicio: ReportesService) {}

  @Get('seguimiento-institucional')
  @Permisos(PERMISOS_DOCUMENTOS.VER)
  seguimientoInstitucional(
    @UsuarioAutenticado('id_usuario') usuario: number,
    @Query() filtros: FiltrarReporteDto,
  ) {
    return this.servicio.seguimientoInstitucional(usuario, filtros);
  }

  @Get('seguimiento')
  @Permisos(PERMISOS_DOCUMENTOS.VER)
  seguimiento(
    @UsuarioAutenticado('id_usuario') usuario: number,
    @Query() filtros: FiltrarSeguimientoDto,
  ) {
    return this.servicio.seguimiento(usuario, filtros);
  }

  @Get('control-plazos')
  @Permisos(PERMISOS_DOCUMENTOS.VER)
  controlPlazos(
    @UsuarioAutenticado('id_usuario') usuario: number,
    @Query() filtros: FiltrarReporteDto,
  ) {
    return this.servicio.controlPlazos(usuario, filtros);
  }
}
