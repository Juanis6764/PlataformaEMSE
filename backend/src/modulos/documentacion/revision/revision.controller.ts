import { Body, Controller, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Permisos } from '../../../comun/decorators/permisos.decorator';
import { UsuarioAutenticado } from '../../../comun/decorators/usuario-autenticado.decorator';
import { JwtAuthGuard } from '../../../comun/guards/jwt-auth.guard';
import { PermisosGuard } from '../../../comun/guards/permisos.guard';
import { PERMISOS_DOCUMENTOS } from '../comun/constantes-documentales';
import { ObservarDocumentoDto } from './dto/observar-documento.dto';
import { SubsanarDocumentoDto } from './dto/subsanar-documento.dto';
import { RevisionService } from './revision.service';

@ApiTags('Documentación - Revisión y cierre')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, PermisosGuard)
@Controller('documentacion/documentos')
export class RevisionController {
  constructor(private readonly servicio: RevisionService) {}

  @Post(':id/aprobar')
  @Permisos(PERMISOS_DOCUMENTOS.APROBAR)
  aprobar(
    @UsuarioAutenticado('id_usuario') usuario: number,
    @Param('id', ParseIntPipe) idDocumento: number,
  ) {
    return this.servicio.aprobar(usuario, idDocumento);
  }

  @Post(':id/observar')
  @Permisos(PERMISOS_DOCUMENTOS.OBSERVAR)
  observar(
    @UsuarioAutenticado('id_usuario') usuario: number,
    @Param('id', ParseIntPipe) idDocumento: number,
    @Body() dto: ObservarDocumentoDto,
  ) {
    return this.servicio.observar(usuario, idDocumento, dto);
  }

  @Post(':id/subsanar')
  @Permisos(PERMISOS_DOCUMENTOS.ENVIAR)
  subsanar(
    @UsuarioAutenticado('id_usuario') usuario: number,
    @Param('id', ParseIntPipe) idDocumento: number,
    @Body() dto: SubsanarDocumentoDto,
  ) {
    return this.servicio.subsanar(usuario, idDocumento, dto);
  }

  @Post(':id/finalizar')
  @Permisos(PERMISOS_DOCUMENTOS.FINALIZAR)
  finalizar(
    @UsuarioAutenticado('id_usuario') usuario: number,
    @Param('id', ParseIntPipe) idDocumento: number,
  ) {
    return this.servicio.finalizar(usuario, idDocumento);
  }

  @Post(':id/archivar')
  @Permisos(PERMISOS_DOCUMENTOS.ARCHIVAR)
  archivar(
    @UsuarioAutenticado('id_usuario') usuario: number,
    @Param('id', ParseIntPipe) idDocumento: number,
  ) {
    return this.servicio.archivar(usuario, idDocumento);
  }
}
