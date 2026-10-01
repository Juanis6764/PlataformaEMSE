import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuditoriaService } from './auditoria.service';
import { FiltrarAuditoriaDto } from './dto/auditoria.dto';
import { JwtAuthGuard } from '../../comun/guards/jwt-auth.guard';
import { PermisosGuard } from '../../comun/guards/permisos.guard';
import { Permisos } from '../../comun/decorators/permisos.decorator';

@ApiTags('Auditoría')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, PermisosGuard)
@Controller('auditoria')
export class AuditoriaController {
  constructor(private readonly auditoriaService: AuditoriaService) {}

  @Get()
  @Permisos('VER_AUDITORIA')
  @ApiOperation({
    summary: 'Listar registros de auditoría de acciones administrativas',
  })
  @ApiResponse({ status: 200, description: 'Listado paginado de auditorías' })
  listarAuditoria(@Query() filtros: FiltrarAuditoriaDto) {
    return this.auditoriaService.listarAuditoria(filtros);
  }

  @Get('logs-acceso')
  @Permisos('VER_AUDITORIA')
  @ApiOperation({
    summary: 'Listar logs de acceso (intentos de inicio de sesión, OTPs, etc.)',
  })
  @ApiResponse({
    status: 200,
    description: 'Listado paginado de logs de acceso',
  })
  listarLogsAcceso(
    @Query('pagina') pagina?: number,
    @Query('limite') limite?: number,
  ) {
    return this.auditoriaService.listarLogsAcceso(
      pagina ? Number(pagina) : 1,
      limite ? Number(limite) : 20,
    );
  }
}
