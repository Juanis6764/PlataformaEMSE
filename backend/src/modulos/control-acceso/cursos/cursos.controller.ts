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
import { CursosService } from './cursos.service';
import { CrearCursoDto, ActualizarCursoDto } from './dto/curso.dto';
import { JwtAuthGuard } from '../../../comun/guards/jwt-auth.guard';
import { PermisosGuard } from '../../../comun/guards/permisos.guard';
import { Permisos } from '../../../comun/decorators/permisos.decorator';

@ApiTags('Cursos')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, PermisosGuard)
@Controller('cursos')
export class CursosController {
  constructor(private readonly cursosService: CursosService) {}

  @Get()
  @Permisos('GESTIONAR_SECCIONES')
  @ApiOperation({
    summary: 'Listar todos los cursos ordenados secuencialmente',
  })
  @ApiResponse({ status: 200, description: 'Listado de cursos' })
  listarCursos() {
    return this.cursosService.listarCursos();
  }

  @Get(':id')
  @Permisos('GESTIONAR_SECCIONES')
  @ApiOperation({ summary: 'Obtener detalle de un curso por ID' })
  @ApiResponse({ status: 200, description: 'Detalle del curso' })
  @ApiResponse({ status: 404, description: 'Curso no encontrado' })
  obtenerCurso(@Param('id', ParseIntPipe) id: number) {
    return this.cursosService.obtenerCurso(id);
  }

  @Post()
  @Permisos('GESTIONAR_SECCIONES')
  @ApiOperation({ summary: 'Crear un nuevo curso académico' })
  @ApiResponse({ status: 201, description: 'Curso creado con éxito' })
  @ApiResponse({
    status: 409,
    description: 'Conflicto: Nombre de curso duplicado',
  })
  crearCurso(@Body() dto: CrearCursoDto) {
    return this.prismaCrearCurso(dto);
  }

  // Helper local para evitar dependencias cruzadas
  private prismaCrearCurso(dto: CrearCursoDto) {
    return this.cursosService.crearCurso(dto);
  }

  @Patch(':id')
  @Permisos('GESTIONAR_SECCIONES')
  @ApiOperation({ summary: 'Actualizar atributos de un curso académico' })
  @ApiResponse({ status: 200, description: 'Curso actualizado con éxito' })
  @ApiResponse({
    status: 400,
    description: 'Intento de modificar un curso oficial',
  })
  @ApiResponse({ status: 404, description: 'Curso no encontrado' })
  actualizarCurso(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarCursoDto,
  ) {
    return this.cursosService.actualizarCurso(id, dto);
  }

  @Delete(':id')
  @Permisos('GESTIONAR_SECCIONES')
  @ApiOperation({ summary: 'Eliminar físicamente un curso' })
  @ApiResponse({ status: 200, description: 'Curso eliminado con éxito' })
  @ApiResponse({
    status: 400,
    description:
      'Curso oficial o en uso por cadetes/calificaciones/asignaciones',
  })
  eliminarCurso(@Param('id', ParseIntPipe) id: number) {
    return this.cursosService.eliminarCurso(id);
  }
}
