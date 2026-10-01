import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { PermisosService } from './permisos.service';
import { CrearPermisoDto, ActualizarPermisoDto } from './dto/permiso.dto';
import { JwtAuthGuard } from '../../../comun/guards/jwt-auth.guard';
import { PermisosGuard } from '../../../comun/guards/permisos.guard';
import { Permisos } from '../../../comun/decorators/permisos.decorator';

@ApiTags('Permisos')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, PermisosGuard)
@Controller('permisos')
export class PermisosController {
  constructor(private readonly permisosService: PermisosService) {}

  @Get()
  @Permisos('GESTIONAR_PERMISOS')
  @ApiOperation({ summary: 'Listar todos los permisos activos' })
  @ApiResponse({ status: 200, description: 'Lista de permisos activos' })
  listarPermisos() {
    return this.permisosService.listarPermisos();
  }

  @Get(':id')
  @Permisos('GESTIONAR_PERMISOS')
  @ApiOperation({ summary: 'Obtener detalle de un permiso por ID' })
  @ApiResponse({ status: 200, description: 'Datos del permiso' })
  @ApiResponse({ status: 404, description: 'Permiso no encontrado' })
  obtenerPermiso(@Param('id', ParseIntPipe) id: number) {
    return this.permisosService.obtenerPermiso(id);
  }

  @Post()
  @Permisos('GESTIONAR_PERMISOS')
  @ApiOperation({ summary: 'Crear un nuevo permiso' })
  @ApiResponse({ status: 201, description: 'Permiso creado con éxito' })
  @ApiResponse({
    status: 409,
    description: 'Ya existe un permiso con ese nombre',
  })
  crearPermiso(@Body() dto: CrearPermisoDto) {
    return this.permisosService.crearPermiso(dto);
  }

  @Patch(':id')
  @Permisos('GESTIONAR_PERMISOS')
  @ApiOperation({ summary: 'Modificar datos de un permiso existente' })
  @ApiResponse({ status: 200, description: 'Permiso actualizado con éxito' })
  @ApiResponse({ status: 404, description: 'Permiso no encontrado' })
  actualizarPermiso(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarPermisoDto,
  ) {
    return this.permisosService.actualizarPermiso(id, dto);
  }

  @Delete(':id')
  @Permisos('GESTIONAR_PERMISOS')
  @ApiOperation({ summary: 'Eliminar de forma lógica (desactivar) un permiso' })
  @ApiResponse({ status: 200, description: 'Permiso desactivado con éxito' })
  @ApiResponse({ status: 404, description: 'Permiso no encontrado' })
  eliminarPermiso(@Param('id', ParseIntPipe) id: number) {
    return this.permisosService.eliminarPermiso(id);
  }
}
