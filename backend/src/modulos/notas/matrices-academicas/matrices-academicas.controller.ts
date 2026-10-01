import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
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
import {
  BuscarCorreccionExtraordinariaDto,
  BuscarHistorialAcademicoDto,
  ObservarMatrizAcademicaDto,
  RegistrarAntecedenteAcademicoDto,
  SeleccionarMatrizAcademicaDto,
} from './dto/matriz-academica.dto';
import { MatricesAcademicasService } from './matrices-academicas.service';

@ApiTags('Notas - Matriz académica final')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, PermisosGuard)
@Controller('notas/matrices-academicas')
export class MatricesAcademicasController {
  constructor(private readonly servicio: MatricesAcademicasService) {}

  @Get()
  @Permisos(PERMISOS_NOTAS.VER)
  consultar(
    @UsuarioAutenticado('id_usuario') usuario: number,
    @Query() dto: SeleccionarMatrizAcademicaDto,
  ) {
    return this.servicio.consultar(usuario, dto);
  }

  @Post('generar')
  @Permisos(PERMISOS_NOTAS.PUBLICAR)
  generar(
    @UsuarioAutenticado('id_usuario') usuario: number,
    @Body() dto: SeleccionarMatrizAcademicaDto,
  ) {
    return this.servicio.generar(usuario, dto);
  }

  @Post(':id/enviar')
  @Permisos(PERMISOS_NOTAS.ENVIAR)
  enviar(
    @UsuarioAutenticado('id_usuario') usuario: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.servicio.enviar(usuario, id);
  }

  @Post(':id/aprobar')
  @Permisos(PERMISOS_NOTAS.REVISAR)
  aprobar(
    @UsuarioAutenticado('id_usuario') usuario: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.servicio.aprobar(usuario, id);
  }

  @Post(':id/observar')
  @Permisos(PERMISOS_NOTAS.OBSERVAR)
  observar(
    @UsuarioAutenticado('id_usuario') usuario: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ObservarMatrizAcademicaDto,
  ) {
    return this.servicio.observar(usuario, id, dto);
  }

  @Post(':id/publicar')
  @Permisos(PERMISOS_NOTAS.PUBLICAR)
  publicar(
    @UsuarioAutenticado('id_usuario') usuario: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.servicio.publicar(usuario, id);
  }

  @Post('antecedentes')
  @Permisos(PERMISOS_NOTAS.EDITAR)
  registrarAntecedente(
    @UsuarioAutenticado('id_usuario') usuario: number,
    @Body() dto: RegistrarAntecedenteAcademicoDto,
  ) {
    return this.servicio.registrarAntecedente(usuario, dto);
  }

  @Get('mis-matrices')
  @Permisos(PERMISOS_NOTAS.VER)
  misMatrices(@UsuarioAutenticado('id_usuario') usuario: number) {
    return this.servicio.misMatrices(usuario);
  }

  @Get('buscar')
  @Permisos(PERMISOS_NOTAS.VER)
  buscar(
    @UsuarioAutenticado('id_usuario') usuario: number,
    @Query() filtros: BuscarHistorialAcademicoDto,
  ) {
    return this.servicio.buscar(usuario, filtros);
  }

  @Get('correcciones/buscar')
  @Permisos(PERMISOS_NOTAS.MODIFICAR_BLOQUEADA)
  buscarCorrecciones(
    @UsuarioAutenticado('id_usuario') usuario: number,
    @Query() filtros: BuscarCorreccionExtraordinariaDto,
  ) {
    return this.servicio.buscarCorrecciones(usuario, filtros);
  }
}
