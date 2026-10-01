import {
  Body,
  Controller,
  Param,
  ParseIntPipe,
  Patch,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Permisos } from '../../../comun/decorators/permisos.decorator';
import { UsuarioAutenticado } from '../../../comun/decorators/usuario-autenticado.decorator';
import { JwtAuthGuard } from '../../../comun/guards/jwt-auth.guard';
import { PermisosGuard } from '../../../comun/guards/permisos.guard';
import { PERMISOS_NOTAS } from '../comun/constantes-notas';
import {
  GuardarNotasMateriaDto,
  ModificarNotaExtraordinariaDto,
} from './dto/nota-evaluacion.dto';
import { NotasEvaluacionesService } from './notas-evaluaciones.service';

@ApiTags('Notas - Evaluaciones - Notas')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, PermisosGuard)
@Controller('notas/evaluaciones')
export class NotasEvaluacionesController {
  constructor(private readonly servicio: NotasEvaluacionesService) {}

  @Put('materias/:idMateria/notas')
  @Permisos(PERMISOS_NOTAS.REGISTRAR, PERMISOS_NOTAS.EDITAR)
  guardarAvance(
    @UsuarioAutenticado('id_usuario') usuario: number,
    @Param('idMateria', ParseIntPipe) idMateria: number,
    @Body() dto: GuardarNotasMateriaDto,
  ) {
    return this.servicio.guardarAvance(usuario, idMateria, dto);
  }

  @Patch('notas/:id/extraordinaria')
  @Permisos(PERMISOS_NOTAS.MODIFICAR_BLOQUEADA)
  modificarExtraordinariamente(
    @UsuarioAutenticado('id_usuario') usuario: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ModificarNotaExtraordinariaDto,
  ) {
    return this.servicio.modificarExtraordinariamente(usuario, id, dto);
  }
}
