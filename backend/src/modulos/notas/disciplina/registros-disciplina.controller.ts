import {
  Body,
  Controller,
  Delete,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Permisos } from '../../../comun/decorators/permisos.decorator';
import { UsuarioAutenticado } from '../../../comun/decorators/usuario-autenticado.decorator';
import { JwtAuthGuard } from '../../../comun/guards/jwt-auth.guard';
import { PermisosGuard } from '../../../comun/guards/permisos.guard';
import { PERMISOS_NOTAS } from '../comun/constantes-notas';
import {
  ActualizarRegistroDisciplinaDto,
  CrearRegistroDisciplinaDto,
  ModificarRegistroExtraordinarioDto,
} from './dto/registro-disciplina.dto';
import { RegistrosDisciplinaService } from './registros-disciplina.service';

@ApiTags('Notas - Disciplina - Registros')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, PermisosGuard)
@Controller('notas/disciplina')
export class RegistrosDisciplinaController {
  constructor(private readonly servicio: RegistrosDisciplinaService) {}

  @Post('semanas/:idSemana/registros')
  @Permisos(PERMISOS_NOTAS.REGISTRAR)
  crear(
    @UsuarioAutenticado('id_usuario') usuario: number,
    @Param('idSemana', ParseIntPipe) idSemana: number,
    @Body() dto: CrearRegistroDisciplinaDto,
  ) {
    return this.servicio.crear(usuario, idSemana, dto);
  }

  @Patch('registros/:id')
  @Permisos(PERMISOS_NOTAS.EDITAR)
  actualizar(
    @UsuarioAutenticado('id_usuario') usuario: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarRegistroDisciplinaDto,
  ) {
    return this.servicio.actualizar(usuario, id, dto);
  }

  @Delete('registros/:id')
  @Permisos(PERMISOS_NOTAS.EDITAR)
  eliminar(
    @UsuarioAutenticado('id_usuario') usuario: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.servicio.eliminar(usuario, id);
  }

  @Patch('registros/:id/extraordinaria')
  @Permisos(PERMISOS_NOTAS.MODIFICAR_BLOQUEADA)
  modificarExtraordinariamente(
    @UsuarioAutenticado('id_usuario') usuario: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ModificarRegistroExtraordinarioDto,
  ) {
    return this.servicio.modificarExtraordinariamente(usuario, id, dto);
  }
}
