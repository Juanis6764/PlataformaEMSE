import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Permisos } from '../../../comun/decorators/permisos.decorator';
import { UsuarioAutenticado } from '../../../comun/decorators/usuario-autenticado.decorator';
import { JwtAuthGuard } from '../../../comun/guards/jwt-auth.guard';
import { PermisosGuard } from '../../../comun/guards/permisos.guard';
import { PERMISOS_DOCUMENTOS } from '../comun/constantes-documentales';
import { DocumentosService } from './documentos.service';
import { RegistrarDocumentoDto } from './dto/registrar-documento.dto';

@ApiTags('Documentación - Documentos')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, PermisosGuard)
@Controller('documentacion/documentos')
export class DocumentosController {
  constructor(private readonly servicio: DocumentosService) {}

  @Post()
  @Permisos(PERMISOS_DOCUMENTOS.CREAR)
  registrar(
    @UsuarioAutenticado('id_usuario') usuario: number,
    @Body() dto: RegistrarDocumentoDto,
  ) {
    return this.servicio.registrarPrincipal(usuario, dto);
  }

  @Get()
  @Permisos(PERMISOS_DOCUMENTOS.VER)
  listar(@UsuarioAutenticado('id_usuario') usuario: number) {
    return this.servicio.listar(usuario);
  }

  @Get(':id')
  @Permisos(PERMISOS_DOCUMENTOS.VER)
  obtenerDetalle(
    @UsuarioAutenticado('id_usuario') usuario: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.servicio.obtenerDetalle(usuario, id);
  }

  @Post(':id/respuesta')
  @Permisos(PERMISOS_DOCUMENTOS.CREAR_RESPUESTA)
  crearRespuesta(
    @UsuarioAutenticado('id_usuario') usuario: number,
    @Param('id', ParseIntPipe) idDocumentoOriginal: number,
    @Body() dto: RegistrarDocumentoDto,
  ) {
    return this.servicio.crearRespuesta(usuario, idDocumentoOriginal, dto);
  }
}
