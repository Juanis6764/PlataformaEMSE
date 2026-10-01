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
  CrearSemanaDisciplinaDto,
  FiltrarSemanasDisciplinaDto,
  ObservarSemanaDisciplinaDto,
} from './dto/semana-disciplina.dto';
import { SemanasDisciplinaService } from './semanas-disciplina.service';

@ApiTags('Notas - Disciplina - Semanas')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, PermisosGuard)
@Controller('notas/disciplina/semanas')
export class SemanasDisciplinaController {
  constructor(private readonly servicio: SemanasDisciplinaService) {}

  @Get()
  @Permisos(PERMISOS_NOTAS.VER)
  listar(
    @UsuarioAutenticado('id_usuario') usuario: number,
    @Query() filtros: FiltrarSemanasDisciplinaDto,
  ) {
    return this.servicio.listar(usuario, filtros);
  }

  @Get('pendientes')
  @Permisos(PERMISOS_NOTAS.REVISAR, PERMISOS_NOTAS.MARCAR_REVISADAS)
  pendientes(@UsuarioAutenticado('id_usuario') usuario: number) {
    return this.servicio.pendientes(usuario);
  }

  @Post()
  @Permisos(PERMISOS_NOTAS.CONFIGURAR_DISCIPLINA)
  crear(
    @UsuarioAutenticado('id_usuario') usuario: number,
    @Body() dto: CrearSemanaDisciplinaDto,
  ) {
    return this.servicio.crear(usuario, dto);
  }

  @Get(':id')
  @Permisos(PERMISOS_NOTAS.VER)
  obtenerDetalle(
    @UsuarioAutenticado('id_usuario') usuario: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.servicio.obtenerDetalle(usuario, id);
  }

  @Post(':id/enviar')
  @Permisos(PERMISOS_NOTAS.ENVIAR)
  enviar(
    @UsuarioAutenticado('id_usuario') usuario: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.servicio.enviar(usuario, id);
  }

  @Post(':id/observar')
  @Permisos(PERMISOS_NOTAS.OBSERVAR)
  observar(
    @UsuarioAutenticado('id_usuario') usuario: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ObservarSemanaDisciplinaDto,
  ) {
    return this.servicio.observar(usuario, id, dto);
  }

  @Post(':id/aprobar')
  @Permisos(PERMISOS_NOTAS.REVISAR)
  aprobar(
    @UsuarioAutenticado('id_usuario') usuario: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.servicio.aprobar(usuario, id);
  }

  @Post(':id/marcar-revisada')
  @Permisos(PERMISOS_NOTAS.MARCAR_REVISADAS)
  marcarRevisada(
    @UsuarioAutenticado('id_usuario') usuario: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.servicio.marcarRevisada(usuario, id);
  }

  @Post(':id/publicar')
  @Permisos(PERMISOS_NOTAS.PUBLICAR)
  publicar(
    @UsuarioAutenticado('id_usuario') usuario: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.servicio.publicar(usuario, id);
  }
}
