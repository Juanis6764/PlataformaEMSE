import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AutenticacionService } from './autenticacion.service';
import { LoginDto } from './dto/login.dto';
import { VerificarOtpDto } from './dto/verificar-otp.dto';
import { RefreshDto } from './dto/refresh.dto';
import { CambiarContrasenaDto } from './dto/cambiar-contrasena.dto';
import { JwtAuthGuard } from '../../../comun/guards/jwt-auth.guard';
import { UsuarioAutenticado } from '../../../comun/decorators/usuario-autenticado.decorator';

@ApiTags('Autenticación')
@Controller('autenticacion')
export class AutenticacionController {
  constructor(private readonly autenticacionService: AutenticacionService) {}

  @Post('iniciar-sesion')
  @ApiOperation({
    summary: 'Iniciar sesión Paso 1 (Valida credenciales y envía OTP)',
  })
  @ApiResponse({
    status: 200,
    description: 'Código OTP enviado al correo institucional',
  })
  @ApiResponse({ status: 401, description: 'Credenciales inválidas' })
  async iniciarSesion(@Body() loginDto: LoginDto, @Req() req: any) {
    const ip = req.ip || req.socket.remoteAddress;
    return this.autenticacionService.iniciarSesion(
      loginDto.ci,
      loginDto.contrasena,
      ip,
    );
  }

  @Post('verificar-codigo')
  @ApiOperation({
    summary: 'Iniciar sesión Paso 2 (Valida OTP y emite tokens)',
  })
  @ApiResponse({ status: 200, description: 'Sesión iniciada con éxito' })
  @ApiResponse({
    status: 401,
    description: 'Código OTP inválido, expirado o bloqueado',
  })
  async verificarCodigo(
    @Body() verificarOtpDto: VerificarOtpDto,
    @Req() req: any,
  ) {
    const ip = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.autenticacionService.verificarCodigo(
      verificarOtpDto.ci,
      verificarOtpDto.codigo,
      ip,
      userAgent,
    );
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Renovar Access Token usando Refresh Token (RTR)' })
  @ApiResponse({ status: 200, description: 'Tokens renovados con éxito' })
  @ApiResponse({
    status: 401,
    description: 'Token de actualización inválido o reutilizado',
  })
  async refresh(@Body() refreshDto: RefreshDto, @Req() req: any) {
    const ip = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.autenticacionService.refresh(
      refreshDto.refresh_token,
      ip,
      userAgent,
    );
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Cerrar sesión e invalidar tokens' })
  @ApiResponse({ status: 200, description: 'Sesión cerrada con éxito' })
  async logout(@UsuarioAutenticado() usuario: any, @Req() req: any) {
    const ip = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.autenticacionService.logout(
      usuario.sid,
      usuario.id_usuario,
      ip,
      userAgent,
    );
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Obtener datos del perfil del usuario autenticado' })
  @ApiResponse({ status: 200, description: 'Datos del usuario autenticado' })
  async me(@UsuarioAutenticado('id_usuario') idUsuario: number) {
    return this.autenticacionService.me(idUsuario);
  }

  @Post('cambiar-contrasena')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Cambiar contraseña (obligatorio en primer inicio / voluntario)',
  })
  @ApiResponse({ status: 200, description: 'Contraseña cambiada exitosamente' })
  @ApiResponse({
    status: 400,
    description:
      'Contraseña actual incorrecta o nueva contrasenia usada previamente',
  })
  async cambiarContrasena(
    @UsuarioAutenticado('id_usuario') idUsuario: number,
    @Body() cambiarContrasenaDto: CambiarContrasenaDto,
    @Req() req: any,
  ) {
    const ip = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.autenticacionService.cambiarContrasena(
      idUsuario,
      cambiarContrasenaDto.contrasenaActual,
      cambiarContrasenaDto.contrasenaNueva,
      ip,
      userAgent,
    );
  }
}
