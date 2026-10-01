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
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CadetesService } from './cadetes.service';
import { FiltrarCadetesDto } from './dto/cadetes-filtros.dto';
import {
  ActualizarCadeteDto,
  CambiarCursoDto,
  CrearCadeteDto,
  EgresarCadeteDto,
  PromoverCadetesDto,
} from './dto/cadetes-operaciones.dto';
import { JwtAuthGuard } from '../../../comun/guards/jwt-auth.guard';
import { PermisosGuard } from '../../../comun/guards/permisos.guard';
import { Permisos } from '../../../comun/decorators/permisos.decorator';

@ApiTags('Cadetes')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, PermisosGuard)
@Controller('cadetes')
export class CadetesController {
  constructor(private readonly cadetesService: CadetesService) {}

  @Get()
  @Permisos('LISTAR_CADETES')
  @ApiOperation({
    summary: 'Listar cadetes con filtros, búsqueda y paginación',
  })
  @ApiResponse({ status: 200, description: 'Listado paginado de cadetes' })
  listarCadetes(@Query() filtros: FiltrarCadetesDto) {
    return this.cadetesService.listarCadetes(filtros);
  }

  @Post()
  @Permisos('CREAR_CADETE')
  @ApiOperation({ summary: 'Crear atómicamente Usuario y Cadete' })
  crearCadete(@Body() dto: CrearCadeteDto) {
    return this.cadetesService.crearCadete(dto);
  }

  @Get('ci/:ci')
  @Permisos('VER_CADETE')
  @ApiOperation({ summary: 'Obtener cadete por CI del usuario' })
  @ApiParam({ name: 'ci', description: 'Cédula de identidad del cadete' })
  @ApiResponse({ status: 200, description: 'Datos completos del cadete' })
  @ApiResponse({ status: 404, description: 'Usuario o cadete no encontrado' })
  obtenerPorCI(@Param('ci') ci: string) {
    return this.cadetesService.obtenerCadetePorCI(ci);
  }

  @Get(':id')
  @Permisos('VER_CADETE')
  @ApiOperation({ summary: 'Obtener detalle completo de un cadete por ID' })
  @ApiParam({ name: 'id', description: 'ID del cadete' })
  @ApiResponse({
    status: 200,
    description: 'Datos completos del cadete con historial de cursos',
  })
  @ApiResponse({ status: 404, description: 'Cadete no encontrado' })
  obtenerPorId(@Param('id', ParseIntPipe) id: number) {
    return this.cadetesService.obtenerCadetePorId(id);
  }

  @Patch(':id')
  @Permisos('EDITAR_CADETE')
  @ApiOperation({
    summary:
      'Actualizar datos generales del cadete (grado, arma, estado, egreso)',
  })
  @ApiResponse({ status: 200, description: 'Cadete actualizado con éxito' })
  @ApiResponse({ status: 404, description: 'Cadete no encontrado' })
  actualizarCadete(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarCadeteDto,
  ) {
    return this.cadetesService.actualizarCadete(id, dto);
  }

  @Post(':id/cambiar-curso')
  @Permisos('EDITAR_CADETE')
  @ApiOperation({
    summary: 'Cambiar el curso actual validando un periodo lectivo existente',
  })
  @ApiResponse({
    status: 200,
    description: 'Curso actual actualizado sin fabricar historial académico',
  })
  @ApiResponse({
    status: 400,
    description: 'Curso no válido o cadete ya en ese curso',
  })
  cambiarCurso(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CambiarCursoDto,
  ) {
    return this.cadetesService.cambiarCurso(id, dto);
  }

  @Post('promociones/:idCursoOrigen')
  @Permisos('EDITAR_CADETE')
  @ApiOperation({
    summary: 'Actualizar el curso actual de una cohorte en un periodo real',
  })
  promoverCadetes(
    @Param('idCursoOrigen', ParseIntPipe) idCursoOrigen: number,
    @Body() dto: PromoverCadetesDto,
  ) {
    return this.cadetesService.promoverCadetes(
      idCursoOrigen,
      dto.id_periodo,
      dto.ids_cadete,
    );
  }

  @Post(':id/egresar')
  @Permisos('EDITAR_CADETE')
  @ApiOperation({
    summary: 'Marcar como egresado conservando usuario e historial',
  })
  egresarCadete(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: EgresarCadeteDto,
  ) {
    return this.cadetesService.egresarCadete(id, dto);
  }

  @Get(':id/historial-cursos')
  @Permisos('VER_CADETE')
  @ApiOperation({ summary: 'Obtener el historial de promociones de un cadete' })
  @ApiResponse({ status: 200, description: 'Historial de cursos del cadete' })
  @ApiResponse({ status: 404, description: 'Cadete no encontrado' })
  obtenerHistorial(@Param('id', ParseIntPipe) id: number) {
    return this.cadetesService.obtenerHistorialCursos(id);
  }
}
