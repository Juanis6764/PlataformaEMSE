import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Permisos } from '../../../comun/decorators/permisos.decorator';
import { UsuarioAutenticado } from '../../../comun/decorators/usuario-autenticado.decorator';
import { JwtAuthGuard } from '../../../comun/guards/jwt-auth.guard';
import { PermisosGuard } from '../../../comun/guards/permisos.guard';
import { PERMISOS_NOTAS } from '../comun/constantes-notas';
import { ConsultasDisciplinaService } from './consultas-disciplina.service';
import {
  ConsultarAcumuladoDisciplinaDto,
  ConsultarCuadroDemostrativoDisciplinaDto,
  ConsultarMisRegistrosDisciplinaDto,
} from './dto/consulta-disciplina.dto';

@ApiTags('Notas - Disciplina - Consultas')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, PermisosGuard)
@Controller('notas/disciplina')
export class ConsultasDisciplinaController {
  constructor(private readonly servicio: ConsultasDisciplinaService) {}

  @Get('contexto')
  @Permisos(PERMISOS_NOTAS.VER)
  contexto(@UsuarioAutenticado('id_usuario') usuario: number) {
    return this.servicio.contexto(usuario);
  }

  @Get('acumulado')
  @Permisos(PERMISOS_NOTAS.VER)
  acumulado(
    @UsuarioAutenticado('id_usuario') usuario: number,
    @Query() filtros: ConsultarAcumuladoDisciplinaDto,
  ) {
    return this.servicio.acumulado(usuario, filtros);
  }

  @Get('cuadro-demostrativo')
  @Permisos(PERMISOS_NOTAS.VER)
  cuadroDemostrativo(
    @UsuarioAutenticado('id_usuario') usuario: number,
    @Query() filtros: ConsultarCuadroDemostrativoDisciplinaDto,
  ) {
    return this.servicio.cuadroDemostrativo(usuario, filtros);
  }

  @Get('mis-gestiones')
  @Permisos(PERMISOS_NOTAS.VER)
  misGestiones(@UsuarioAutenticado('id_usuario') usuario: number) {
    return this.servicio.misGestiones(usuario);
  }

  @Get('mis-registros')
  @Permisos(PERMISOS_NOTAS.VER)
  misRegistros(
    @UsuarioAutenticado('id_usuario') usuario: number,
    @Query() filtros: ConsultarMisRegistrosDisciplinaDto,
  ) {
    return this.servicio.misRegistros(usuario, filtros);
  }
}
