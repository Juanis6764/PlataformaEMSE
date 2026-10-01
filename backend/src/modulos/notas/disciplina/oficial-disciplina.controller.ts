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
  ActualizarOficialDisciplinaDto,
  CrearOficialDisciplinaDto,
  FiltrarOficialesDisciplinaDto,
} from './dto/oficial-disciplina.dto';
import { OficialDisciplinaService } from './oficial-disciplina.service';

@ApiTags('Notas - Disciplina - Oficiales')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, PermisosGuard)
@Controller('notas/disciplina/oficiales')
export class OficialDisciplinaController {
  constructor(private readonly servicio: OficialDisciplinaService) {}

  @Get()
  @Permisos(PERMISOS_NOTAS.VER)
  listar(
    @UsuarioAutenticado('id_usuario') usuario: number,
    @Query() filtros: FiltrarOficialesDisciplinaDto,
  ) {
    return this.servicio.listar(usuario, filtros);
  }

  @Post()
  @Permisos(PERMISOS_NOTAS.CONFIGURAR_DISCIPLINA)
  crear(
    @UsuarioAutenticado('id_usuario') usuario: number,
    @Body() dto: CrearOficialDisciplinaDto,
  ) {
    return this.servicio.crear(usuario, dto);
  }

  @Patch(':id')
  @Permisos(PERMISOS_NOTAS.CONFIGURAR_DISCIPLINA)
  actualizar(
    @UsuarioAutenticado('id_usuario') usuario: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarOficialDisciplinaDto,
  ) {
    return this.servicio.actualizar(usuario, id, dto);
  }

  @Patch(':id/desactivar')
  @Permisos(PERMISOS_NOTAS.CONFIGURAR_DISCIPLINA)
  desactivar(
    @UsuarioAutenticado('id_usuario') usuario: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.servicio.desactivar(usuario, id);
  }

  @Patch(':id/reactivar')
  @Permisos(PERMISOS_NOTAS.CONFIGURAR_DISCIPLINA)
  reactivar(
    @UsuarioAutenticado('id_usuario') usuario: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.servicio.reactivar(usuario, id);
  }
}
