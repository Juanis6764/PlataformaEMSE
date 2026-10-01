import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../comun/guards/jwt-auth.guard';
import { UsuarioAutenticado } from '../../comun/decorators/usuario-autenticado.decorator';
import { FiltrarNotificacionesDto } from './dto/notificaciones.dto';
import { NotificacionesService } from './notificaciones.service';

@ApiTags('Notificaciones')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('notificaciones')
export class NotificacionesController {
  constructor(private readonly notificaciones: NotificacionesService) {}

  @Get()
  listar(
    @UsuarioAutenticado('id_usuario') idUsuario: number,
    @Query() filtros: FiltrarNotificacionesDto,
  ) {
    return this.notificaciones.listar(idUsuario, filtros);
  }

  @Get('no-leidas/conteo')
  async contarNoLeidas(@UsuarioAutenticado('id_usuario') idUsuario: number) {
    return { total: await this.notificaciones.contarNoLeidas(idUsuario) };
  }

  @Patch(':id/leida')
  marcarLeida(
    @UsuarioAutenticado('id_usuario') idUsuario: number,
    @Param('id', ParseIntPipe) idNotificacion: number,
  ) {
    return this.notificaciones.marcarLeida(idUsuario, idNotificacion);
  }

  @Patch('leidas/todas')
  marcarTodasLeidas(@UsuarioAutenticado('id_usuario') idUsuario: number) {
    return this.notificaciones.marcarTodasLeidas(idUsuario);
  }
}
