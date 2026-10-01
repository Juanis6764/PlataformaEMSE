import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AsignacionesAcademicasService } from './asignaciones-academicas.service';
import {
  CrearAsignacionDto,
  FiltrarAsignacionesDto,
} from './dto/asignacion.dto';
import { JwtAuthGuard } from '../../comun/guards/jwt-auth.guard';
import { PermisosGuard } from '../../comun/guards/permisos.guard';
import { Permisos } from '../../comun/decorators/permisos.decorator';

@ApiTags('Asignaciones Académicas')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, PermisosGuard)
@Controller('asignaciones-academicas')
export class AsignacionesAcademicasController {
  constructor(
    private readonly asignacionesService: AsignacionesAcademicasService,
  ) {}

  @Get()
  @Permisos('VER_ASIGNACIONES')
  @ApiOperation({ summary: 'Listar asignaciones académicas con filtros' })
  @ApiResponse({ status: 200, description: 'Listado de asignaciones' })
  listarAsignaciones(@Query() filtros: FiltrarAsignacionesDto) {
    return this.asignacionesService.listarAsignaciones(filtros);
  }

  @Get('usuario/:id')
  @Permisos('VER_ASIGNACIONES')
  @ApiOperation({
    summary: 'Listar asignaciones activas de un usuario específico',
  })
  @ApiParam({ name: 'id', description: 'ID del usuario' })
  @ApiResponse({ status: 200, description: 'Asignaciones del usuario' })
  listarPorUsuario(@Param('id', ParseIntPipe) id: number) {
    return this.asignacionesService.listarAsignacionesPorUsuario(id);
  }

  @Get(':id')
  @Permisos('VER_ASIGNACIONES')
  @ApiOperation({
    summary: 'Obtener detalle de una asignación académica por ID',
  })
  @ApiParam({ name: 'id', description: 'ID de la asignación' })
  @ApiResponse({ status: 200, description: 'Detalle de la asignación' })
  @ApiResponse({ status: 404, description: 'Asignación no encontrada' })
  obtenerAsignacion(@Param('id', ParseIntPipe) id: number) {
    return this.asignacionesService.obtenerAsignacion(id);
  }

  @Post()
  @Permisos('ASIGNAR_ACADEMICO')
  @ApiOperation({
    summary:
      'Crear una asignación académica (JEFE=sin curso, OPERADOR=con curso requerido)',
  })
  @ApiResponse({ status: 201, description: 'Asignación creada exitosamente' })
  @ApiResponse({
    status: 400,
    description: 'Validación fallida (reglas JEFE/OPERADOR, duplicado)',
  })
  crearAsignacion(@Body() dto: CrearAsignacionDto) {
    return this.asignacionesService.crearAsignacion(dto);
  }

  @Delete(':id')
  @Permisos('EDITAR_ASIGNACION')
  @ApiOperation({ summary: 'Revocar (desactivar) una asignación académica' })
  @ApiParam({ name: 'id', description: 'ID de la asignación a revocar' })
  @ApiResponse({ status: 200, description: 'Asignación revocada' })
  @ApiResponse({ status: 400, description: 'La asignación ya está inactiva' })
  revocarAsignacion(@Param('id', ParseIntPipe) id: number) {
    return this.asignacionesService.revocarAsignacion(id);
  }
}
