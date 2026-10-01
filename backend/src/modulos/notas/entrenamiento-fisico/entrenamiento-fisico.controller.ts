import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
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
  ConsultarResultadosEntrenamientoEvaluacionesDto,
  FiltrarPlanillasEntrenamientoDto,
  GuardarNotasEntrenamientoDto,
  ModificarNotaEntrenamientoExtraordinariaDto,
  ObservarPlanillaEntrenamientoDto,
  SeleccionarPlanillaEntrenamientoDto,
} from './dto/entrenamiento-fisico.dto';
import { EntrenamientoFisicoService } from './entrenamiento-fisico.service';

@ApiTags('Notas - Entrenamiento Físico')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, PermisosGuard)
@Controller('notas/entrenamiento-fisico')
export class EntrenamientoFisicoController {
  constructor(private readonly servicio: EntrenamientoFisicoService) {}

  @Get('contexto')
  @Permisos(PERMISOS_NOTAS.VER)
  contexto(@UsuarioAutenticado('id_usuario') usuario: number) {
    return this.servicio.contexto(usuario);
  }

  @Get('planillas')
  @Permisos(PERMISOS_NOTAS.VER)
  listar(
    @UsuarioAutenticado('id_usuario') usuario: number,
    @Query() filtros: FiltrarPlanillasEntrenamientoDto,
  ) {
    return this.servicio.listar(usuario, filtros);
  }

  @Get('planillas/pendientes')
  @Permisos(PERMISOS_NOTAS.REVISAR, PERMISOS_NOTAS.MARCAR_REVISADAS)
  pendientes(@UsuarioAutenticado('id_usuario') usuario: number) {
    return this.servicio.pendientes(usuario);
  }

  @Get('planilla')
  @Permisos(PERMISOS_NOTAS.VER)
  consultar(
    @UsuarioAutenticado('id_usuario') usuario: number,
    @Query() dto: SeleccionarPlanillaEntrenamientoDto,
  ) {
    return this.servicio.consultar(usuario, dto);
  }

  @Put('planillas/notas')
  @Permisos(PERMISOS_NOTAS.REGISTRAR, PERMISOS_NOTAS.EDITAR)
  guardar(
    @UsuarioAutenticado('id_usuario') usuario: number,
    @Body() dto: GuardarNotasEntrenamientoDto,
  ) {
    return this.servicio.guardar(usuario, dto);
  }

  @Post('planillas/:id/enviar')
  @Permisos(PERMISOS_NOTAS.ENVIAR)
  enviar(
    @UsuarioAutenticado('id_usuario') usuario: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.servicio.enviar(usuario, id);
  }

  @Post('planillas/:id/observar')
  @Permisos(PERMISOS_NOTAS.OBSERVAR)
  observar(
    @UsuarioAutenticado('id_usuario') usuario: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ObservarPlanillaEntrenamientoDto,
  ) {
    return this.servicio.observar(usuario, id, dto);
  }

  @Post('planillas/:id/aprobar')
  @Permisos(PERMISOS_NOTAS.REVISAR)
  aprobar(
    @UsuarioAutenticado('id_usuario') usuario: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.servicio.aprobarSeccion(usuario, id);
  }

  @Post('planillas/:id/marcar-revisada')
  @Permisos(PERMISOS_NOTAS.MARCAR_REVISADAS)
  marcarRevisada(
    @UsuarioAutenticado('id_usuario') usuario: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.servicio.marcarRevisada(usuario, id);
  }

  @Patch('notas/:id/extraordinaria')
  @Permisos(PERMISOS_NOTAS.MODIFICAR_BLOQUEADA)
  modificarExtraordinariamente(
    @UsuarioAutenticado('id_usuario') usuario: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ModificarNotaEntrenamientoExtraordinariaDto,
  ) {
    return this.servicio.modificarExtraordinariamente(usuario, id, dto);
  }

  @Post('planillas/:id/enviar-evaluaciones')
  @Permisos(PERMISOS_NOTAS.ENVIAR)
  enviarEvaluaciones(
    @UsuarioAutenticado('id_usuario') usuario: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.servicio.enviarEvaluaciones(usuario, id);
  }

  @Get('resultados-evaluaciones')
  @Permisos(PERMISOS_NOTAS.VER)
  resultadosParaEvaluaciones(
    @UsuarioAutenticado('id_usuario') usuario: number,
    @Query() filtros: ConsultarResultadosEntrenamientoEvaluacionesDto,
  ) {
    return this.servicio.resultadosParaEvaluaciones(usuario, filtros);
  }
}
