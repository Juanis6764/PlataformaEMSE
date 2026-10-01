import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { SeccionesService } from './secciones.service';
import { CrearSeccionDto, ActualizarSeccionDto } from './dto/seccion.dto';
import { JwtAuthGuard } from '../../../comun/guards/jwt-auth.guard';
import { PermisosGuard } from '../../../comun/guards/permisos.guard';
import { Permisos } from '../../../comun/decorators/permisos.decorator';
import { TipoSeccion } from '@prisma/client';

@ApiTags('Secciones')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, PermisosGuard)
@Controller('secciones')
export class SeccionesController {
  constructor(private readonly seccionesService: SeccionesService) {}

  @Get()
  @Permisos('GESTIONAR_SECCIONES')
  @ApiOperation({ summary: 'Listar todas las secciones activas' })
  @ApiResponse({ status: 200, description: 'Listado de secciones' })
  listarSecciones(@Query('tipo') tipo?: TipoSeccion) {
    return this.seccionesService.listarSecciones(tipo);
  }

  @Get('arbol')
  @Permisos('GESTIONAR_SECCIONES')
  @ApiOperation({
    summary: 'Obtener la estructura de árbol de secciones anidadas',
  })
  @ApiResponse({ status: 200, description: 'Estructura arborescente' })
  listarJerarquia() {
    return this.seccionesService.listarJerarquia();
  }

  @Get(':id')
  @Permisos('GESTIONAR_SECCIONES')
  @ApiOperation({ summary: 'Obtener detalle de una sección por ID' })
  @ApiResponse({ status: 200, description: 'Detalle de la sección' })
  @ApiResponse({ status: 404, description: 'Sección no encontrada' })
  obtenerSeccion(@Param('id', ParseIntPipe) id: number) {
    return this.seccionesService.obtenerSeccion(id);
  }

  @Post()
  @Permisos('GESTIONAR_SECCIONES')
  @ApiOperation({ summary: 'Crear una nueva sección jerárquica' })
  @ApiResponse({ status: 201, description: 'Sección creada exitosamente' })
  @ApiResponse({
    status: 409,
    description: 'Conflicto: Nombre de sección duplicado',
  })
  crearSeccion(@Body() dto: CrearSeccionDto) {
    return this.seccionesService.crearSeccion(dto);
  }

  @Patch(':id')
  @Permisos('GESTIONAR_SECCIONES')
  @ApiOperation({ summary: 'Actualizar atributos de una sección' })
  @ApiResponse({ status: 200, description: 'Sección actualizada con éxito' })
  @ApiResponse({ status: 404, description: 'Sección no encontrada' })
  actualizarSeccion(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarSeccionDto,
  ) {
    return this.seccionesService.actualizarSeccion(id, dto);
  }

  @Delete(':id')
  @Permisos('GESTIONAR_SECCIONES')
  @ApiOperation({ summary: 'Eliminar lógicamente (desactivar) una sección' })
  @ApiResponse({ status: 200, description: 'Sección desactivada con éxito' })
  @ApiResponse({
    status: 400,
    description:
      'La sección contiene subsecciones activas o usuarios vinculados',
  })
  eliminarSeccion(@Param('id', ParseIntPipe) id: number) {
    return this.seccionesService.eliminarSeccion(id);
  }
}
