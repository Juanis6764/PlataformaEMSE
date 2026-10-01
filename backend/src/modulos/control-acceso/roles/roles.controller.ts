import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { RolesService } from './roles.service';
import {
  CrearRolDto,
  ActualizarRolDto,
  AsignarPermisosDto,
} from './dto/rol.dto';
import { JwtAuthGuard } from '../../../comun/guards/jwt-auth.guard';
import { PermisosGuard } from '../../../comun/guards/permisos.guard';
import { Permisos } from '../../../comun/decorators/permisos.decorator';

@ApiTags('Roles')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, PermisosGuard)
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @Permisos('GESTIONAR_ROLES')
  @ApiOperation({ summary: 'Listar todos los roles activos' })
  @ApiResponse({ status: 200, description: 'Lista de roles activos' })
  listarRoles() {
    return this.rolesService.listarRoles();
  }

  @Get(':id')
  @Permisos('GESTIONAR_ROLES')
  @ApiOperation({ summary: 'Obtener detalle de un rol por ID' })
  @ApiResponse({ status: 200, description: 'Datos del rol y sus permisos' })
  @ApiResponse({ status: 404, description: 'Rol no encontrado' })
  obtenerRol(@Param('id', ParseIntPipe) id: number) {
    return this.rolesService.obtenerRol(id);
  }

  @Post()
  @Permisos('GESTIONAR_ROLES')
  @ApiOperation({ summary: 'Crear un nuevo rol' })
  @ApiResponse({ status: 201, description: 'Rol creado con éxito' })
  @ApiResponse({ status: 409, description: 'Ya existe un rol con ese nombre' })
  crearRol(@Body() dto: CrearRolDto) {
    return this.rolesService.crearRol(dto);
  }

  @Patch(':id')
  @Permisos('GESTIONAR_ROLES')
  @ApiOperation({ summary: 'Modificar datos de un rol existente' })
  @ApiResponse({ status: 200, description: 'Rol actualizado con éxito' })
  @ApiResponse({
    status: 400,
    description: 'No está permitido modificar el rol ADMINISTRADOR',
  })
  actualizarRol(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarRolDto,
  ) {
    return this.rolesService.actualizarRol(id, dto);
  }

  @Delete(':id')
  @Permisos('GESTIONAR_ROLES')
  @ApiOperation({ summary: 'Eliminar de forma lógica (desactivar) un rol' })
  @ApiResponse({ status: 200, description: 'Rol desactivado con éxito' })
  @ApiResponse({
    status: 400,
    description:
      'No está permitido eliminar ADMINISTRADOR o el rol está asignado a usuarios activos',
  })
  eliminarRol(@Param('id', ParseIntPipe) id: number) {
    return this.rolesService.eliminarRol(id);
  }

  @Put(':id/permisos')
  @Permisos('GESTIONAR_ROLES')
  asignarPermisos(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AsignarPermisosDto,
  ) {
    return this.rolesService.asignarPermisos(id, dto);
  }
}
