import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UsuariosService } from './usuarios.service';
import { CrearUsuarioDto } from './dto/crear-usuario.dto';
import {
  ActualizarUsuarioDto,
  FiltrarUsuariosDto,
  CambiarEstadoDto,
  CambiarRolDto,
  CambiarSeccionDto,
  ActualizarPermisosUsuarioDto,
} from './dto/usuarios-operaciones.dto';
import { JwtAuthGuard } from '../../../comun/guards/jwt-auth.guard';
import { PermisosGuard } from '../../../comun/guards/permisos.guard';
import { Permisos } from '../../../comun/decorators/permisos.decorator';
import { PresenciaService } from '../presencia/presencia.service';

@ApiTags('Usuarios')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, PermisosGuard)
@Controller('usuarios')
export class UsuariosController {
  constructor(
    private readonly usuariosService: UsuariosService,
    private readonly presenciaService: PresenciaService,
  ) {}

  @Get()
  @Permisos('LISTAR_USUARIOS')
  @ApiOperation({
    summary: 'Listar usuarios con filtros y paginación estructurada',
  })
  @ApiResponse({ status: 200, description: 'Listado de usuarios paginado' })
  listarUsuarios(@Query() filtros: FiltrarUsuariosDto) {
    return this.usuariosService.listarUsuarios(filtros);
  }

  @Get('presencia')
  @Permisos('LISTAR_USUARIOS')
  @ApiOperation({ summary: 'Consultar presencia viva de los usuarios' })
  listarPresencia() {
    return this.presenciaService.obtenerEstados();
  }

  @Get(':id')
  @Permisos('VER_USUARIO')
  @ApiOperation({ summary: 'Obtener detalle completo de un usuario por ID' })
  @ApiResponse({ status: 200, description: 'Detalle del usuario' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  obtenerUsuario(@Param('id', ParseIntPipe) id: number) {
    return this.usuariosService.obtenerUsuario(id);
  }

  @Post()
  @Permisos('CREAR_USUARIO')
  @ApiOperation({ summary: 'Crear un nuevo usuario' })
  @ApiResponse({ status: 201, description: 'Usuario creado con éxito' })
  @ApiResponse({ status: 409, description: 'Conflicto: CI duplicado' })
  crearUsuario(@Body() dto: CrearUsuarioDto) {
    return this.usuariosService.crearUsuario(dto);
  }

  @Patch(':id')
  @Permisos('EDITAR_USUARIO')
  @ApiOperation({ summary: 'Actualizar información general de un usuario' })
  @ApiResponse({ status: 200, description: 'Usuario actualizado con éxito' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  actualizarUsuario(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarUsuarioDto,
  ) {
    return this.usuariosService.actualizarUsuario(id, dto);
  }

  @Patch(':id/estado')
  @Permisos('SUSPENDER_USUARIO', 'ACTIVAR_USUARIO')
  @ApiOperation({
    summary: 'Suspender o habilitar administrativamente un usuario',
  })
  @ApiResponse({
    status: 200,
    description: 'Estado actualizado y sesiones invalidadas si aplica',
  })
  @ApiResponse({
    status: 400,
    description: 'No se permite desactivar al único ADMIN activo',
  })
  cambiarEstado(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CambiarEstadoDto,
  ) {
    return this.usuariosService.cambiarEstado(id, dto);
  }

  @Patch(':id/rol')
  @Permisos('EDITAR_USUARIO')
  @ApiOperation({
    summary: 'Cambiar el rol de un usuario y forzar re-inicio de sesión',
  })
  @ApiResponse({
    status: 200,
    description: 'Rol actualizado e historial de tokens revocado',
  })
  @ApiResponse({
    status: 400,
    description: 'No se permite degradar al único ADMIN activo',
  })
  cambiarRol(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CambiarRolDto,
  ) {
    return this.usuariosService.cambiarRol(id, dto);
  }

  @Patch(':id/seccion')
  @Permisos('EDITAR_USUARIO')
  @ApiOperation({ summary: 'Cambiar la sección a la que pertenece un usuario' })
  @ApiResponse({ status: 200, description: 'Sección actualizada con éxito' })
  cambiarSeccion(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CambiarSeccionDto,
  ) {
    return this.usuariosService.cambiarSeccion(id, dto);
  }

  @Put(':id/permisos')
  @Permisos('EDITAR_USUARIO')
  actualizarPermisos(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarPermisosUsuarioDto,
  ) {
    return this.usuariosService.actualizarPermisosIndividuales(id, dto);
  }

  @Post(':id/restablecer-contrasena')
  @Permisos('RESETEAR_CONTRASENA')
  @ApiOperation({
    summary: 'Restablecer contraseña a EMSE2026. y cerrar sesiones',
  })
  @ApiResponse({
    status: 200,
    description: 'Contraseña restablecida con éxito',
  })
  restablecerContrasena(@Param('id', ParseIntPipe) id: number) {
    return this.usuariosService.restablecerContrasena(id);
  }
}
