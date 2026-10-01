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
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Permisos } from '../../../comun/decorators/permisos.decorator';
import { UsuarioAutenticado } from '../../../comun/decorators/usuario-autenticado.decorator';
import { JwtAuthGuard } from '../../../comun/guards/jwt-auth.guard';
import { PermisosGuard } from '../../../comun/guards/permisos.guard';
import { PERMISOS_NOTAS } from '../comun/constantes-notas';
import {
  ModificarResultadoFinalDisciplinaDto,
  SeleccionarResultadoFinalDisciplinaDto,
} from './dto/consulta-disciplina.dto';
import { ResultadosFinalesDisciplinaService } from './resultados-finales-disciplina.service';

@ApiTags('Notas - Disciplina - Resultados finales')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, PermisosGuard)
@Controller('notas/disciplina/resultados-finales')
export class ResultadosFinalesDisciplinaController {
  constructor(private readonly servicio: ResultadosFinalesDisciplinaService) {}

  @Get()
  @Permisos(PERMISOS_NOTAS.VER)
  consultar(
    @UsuarioAutenticado('id_usuario') usuario: number,
    @Query() dto: SeleccionarResultadoFinalDisciplinaDto,
  ) {
    return this.servicio.consultar(usuario, dto);
  }

  @Post('publicar')
  @Permisos(PERMISOS_NOTAS.PUBLICAR)
  publicar(
    @UsuarioAutenticado('id_usuario') usuario: number,
    @Body() dto: SeleccionarResultadoFinalDisciplinaDto,
  ) {
    return this.servicio.publicar(usuario, dto);
  }

  @Post('enviar-evaluaciones')
  @Permisos(PERMISOS_NOTAS.PUBLICAR)
  enviarEvaluaciones(
    @UsuarioAutenticado('id_usuario') usuario: number,
    @Body() dto: SeleccionarResultadoFinalDisciplinaDto,
  ) {
    return this.servicio.enviarEvaluaciones(usuario, dto);
  }

  @Patch(':id/extraordinaria')
  @Permisos(PERMISOS_NOTAS.MODIFICAR_BLOQUEADA)
  modificarExtraordinariamente(
    @UsuarioAutenticado('id_usuario') usuario: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ModificarResultadoFinalDisciplinaDto,
  ) {
    return this.servicio.modificarExtraordinariamente(usuario, id, dto);
  }
}
