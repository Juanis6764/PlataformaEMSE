import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Permisos } from '../../../comun/decorators/permisos.decorator';
import { UsuarioAutenticado } from '../../../comun/decorators/usuario-autenticado.decorator';
import { JwtAuthGuard } from '../../../comun/guards/jwt-auth.guard';
import { PermisosGuard } from '../../../comun/guards/permisos.guard';
import { PERMISOS_NOTAS } from '../comun/constantes-notas';
import { ConsultasEvaluacionesService } from './consultas-evaluaciones.service';
import {
  ConsultarEvaluacionesDto,
  ConsultarMisEvaluacionesDto,
} from './dto/consulta-evaluaciones.dto';

@ApiTags('Notas - Evaluaciones - Consultas')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, PermisosGuard)
@Controller('notas/evaluaciones')
export class ConsultasEvaluacionesController {
  constructor(private readonly servicio: ConsultasEvaluacionesService) {}

  @Get('contexto')
  @Permisos(PERMISOS_NOTAS.VER)
  contexto(@UsuarioAutenticado('id_usuario') usuario: number) {
    return this.servicio.contexto(usuario);
  }

  @Get('matriz')
  @Permisos(PERMISOS_NOTAS.VER)
  matriz(
    @UsuarioAutenticado('id_usuario') usuario: number,
    @Query() filtros: ConsultarEvaluacionesDto,
  ) {
    return this.servicio.matriz(usuario, filtros);
  }

  @Get('resultados')
  @Permisos(PERMISOS_NOTAS.VER)
  resultados(
    @UsuarioAutenticado('id_usuario') usuario: number,
    @Query() filtros: ConsultarEvaluacionesDto,
  ) {
    return this.servicio.resultados(usuario, filtros);
  }

  @Get('resultados-recibidos')
  @Permisos(PERMISOS_NOTAS.VER)
  resultadosRecibidos(
    @UsuarioAutenticado('id_usuario') usuario: number,
    @Query() filtros: ConsultarEvaluacionesDto,
  ) {
    return this.servicio.resultadosRecibidos(usuario, filtros);
  }

  @Get('mis-notas')
  @Permisos(PERMISOS_NOTAS.VER)
  misNotas(
    @UsuarioAutenticado('id_usuario') usuario: number,
    @Query() filtros: ConsultarMisEvaluacionesDto,
  ) {
    return this.servicio.misNotas(usuario, filtros);
  }
}
