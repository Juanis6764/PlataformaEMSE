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
import { CatalogoDisciplinaService } from './catalogo-disciplina.service';
import {
  ActualizarCatalogoDisciplinaDto,
  CrearCatalogoDisciplinaDto,
  FiltrarCatalogoDisciplinaDto,
} from './dto/catalogo-disciplina.dto';

@ApiTags('Notas - Disciplina - Catálogo')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, PermisosGuard)
@Controller('notas/disciplina/catalogos')
export class CatalogoDisciplinaController {
  constructor(private readonly servicio: CatalogoDisciplinaService) {}

  @Get()
  @Permisos(PERMISOS_NOTAS.VER)
  listar(
    @UsuarioAutenticado('id_usuario') usuario: number,
    @Query() filtros: FiltrarCatalogoDisciplinaDto,
  ) {
    return this.servicio.listar(usuario, filtros);
  }

  @Post()
  @Permisos(PERMISOS_NOTAS.CONFIGURAR_DISCIPLINA)
  crear(
    @UsuarioAutenticado('id_usuario') usuario: number,
    @Body() dto: CrearCatalogoDisciplinaDto,
  ) {
    return this.servicio.crear(usuario, dto);
  }

  @Patch(':id')
  @Permisos(PERMISOS_NOTAS.CONFIGURAR_DISCIPLINA)
  actualizar(
    @UsuarioAutenticado('id_usuario') usuario: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarCatalogoDisciplinaDto,
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
