import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { CorreoService } from '../../correo/correo.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

@Injectable()
export class AutenticacionService {
  // Mapa en memoria para Throttling de logins e intentos fallidos
  private loginAttemptsMap = new Map<
    string,
    { count: number; blockedUntil: Date }
  >();

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private correoService: CorreoService,
  ) {}

  private getHashOTP(codigo: string): string {
    const secret =
      process.env.OTP_HASH_SECRET || 'secreto_de_hash_otp_emse_2026';
    return crypto.createHmac('sha256', secret).update(codigo).digest('hex');
  }

  private getHashSHA256(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  // Comprueba y aplica el rate limit para login/OTP
  private checkRateLimit(key: string) {
    const record = this.loginAttemptsMap.get(key);
    if (record) {
      if (record.blockedUntil > new Date()) {
        const remainingSeconds = Math.ceil(
          (record.blockedUntil.getTime() - Date.now()) / 1000,
        );
        throw new ForbiddenException(
          `Demasiados intentos. Bloqueado temporalmente. Intente de nuevo en ${remainingSeconds} segundos.`,
        );
      }
      // Si el bloqueo ya expiró, reiniciamos
      if (record.blockedUntil <= new Date() && record.count >= 5) {
        this.loginAttemptsMap.delete(key);
      }
    }
  }

  private registerFailedAttempt(key: string) {
    const record = this.loginAttemptsMap.get(key) || {
      count: 0,
      blockedUntil: new Date(0),
    };
    record.count += 1;
    if (record.count >= 5) {
      const blockDurationMinutes = 15;
      record.blockedUntil = new Date(
        Date.now() + blockDurationMinutes * 60 * 1000,
      );
      console.warn(
        `[SECURITY] Key ${key} bloqueada por fuerza bruta hasta ${record.blockedUntil}`,
      );
    }
    this.loginAttemptsMap.set(key, record);
  }

  private clearAttempts(key: string) {
    this.loginAttemptsMap.delete(key);
  }

  /**
   * El restablecimiento administrativo inicia un nuevo ciclo de acceso.
   * Elimina únicamente bloqueos de login en memoria asociados al CI.
   */
  limpiarIntentosUsuario(ci: string) {
    const sufijo = `_${ci}`;
    for (const key of this.loginAttemptsMap.keys()) {
      if (key.endsWith(sufijo)) this.loginAttemptsMap.delete(key);
    }
  }

  async iniciarSesion(ci: string, contrasena: string, ip?: string) {
    const throttleKey = `${ip || 'unknown'}_${ci}`;
    this.checkRateLimit(throttleKey);

    const usuario = await this.prisma.usuario.findUnique({
      where: { ci },
    });

    // bcrypt ficticio para evitar enumeración y temporización de CI inexistentes
    const saltFicticio = '$2b$10$abcdefghijklmnopqrstuv';
    const contrasenaFicticia = 'ficticia123';

    if (!usuario) {
      // Ejecutar bcrypt falso para igualar tiempos
      await bcrypt.compare(
        contrasena,
        bcrypt.hashSync(contrasenaFicticia, saltFicticio),
      );
      this.registerFailedAttempt(throttleKey);
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const contrasenaValida = await bcrypt.compare(
      contrasena,
      usuario.contrasena,
    );

    if (!contrasenaValida) {
      this.registerFailedAttempt(throttleKey);
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // Si la contraseña es correcta, pero el usuario está inactivo o bloqueado
    if (!usuario.habilitado) {
      this.registerFailedAttempt(throttleKey);
      // Respuesta externa genérica para mitigar filtración de estados de CI válidos
      throw new UnauthorizedException('Credenciales inválidas');
    }

    if (!usuario.correo) {
      throw new BadRequestException(
        'El usuario no tiene un correo institucional registrado.',
      );
    }

    this.clearAttempts(throttleKey);

    const codigo = crypto.randomInt(0, 1000000).toString().padStart(6, '0');
    const hashOTP = this.getHashOTP(codigo);
    const expiracion = new Date(Date.now() + 10 * 60 * 1000); // 10 minutos

    // Invalidar OTPs anteriores en transacción e insertar el nuevo
    await this.prisma.$transaction([
      this.prisma.codigoVerificacion.updateMany({
        where: { id_usuario: usuario.id_usuario, usado: false },
        data: { usado: true },
      }),
      this.prisma.codigoVerificacion.create({
        data: {
          codigo: hashOTP,
          id_usuario: usuario.id_usuario,
          fecha_expiracion: expiracion,
          tipo: 'OTP',
        },
      }),
    ]);

    // Enviar código por correo
    try {
      await this.correoService.enviarCodigoIngreso(
        usuario.correo,
        `${usuario.nombres} ${usuario.apellidos}`,
        codigo,
      );
    } catch (error) {
      await this.prisma.$transaction([
        this.prisma.codigoVerificacion.updateMany({
          where: { id_usuario: usuario.id_usuario, usado: false },
          data: { usado: true },
        }),
        this.prisma.logAcceso.create({
          data: {
            id_usuario: usuario.id_usuario,
            correo_intentado: usuario.correo,
            evento: 'SOLICITUD_OTP_INICIO_SESION',
            exito: false,
            ip,
            detalle:
              'El servidor SMTP no aceptó o no pudo entregar el correo OTP',
          },
        }),
      ]);
      throw error;
    }

    // Log de auditoría
    await this.prisma.logAcceso.create({
      data: {
        id_usuario: usuario.id_usuario,
        correo_intentado: usuario.correo || '',
        evento: 'SOLICITUD_OTP_INICIO_SESION',
        exito: true,
        ip,
      },
    });

    return {
      mensaje: 'Código de verificación enviado al correo institucional',
      requiere_verificacion: true,
      id_usuario: usuario.id_usuario,
      correo: usuario.correo,
    };
  }

  async verificarCodigo(
    ci: string,
    codigo: string,
    ip?: string,
    userAgent?: string,
  ) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { ci },
      include: {
        rol: {
          include: {
            permisos: {
              include: {
                permiso: true,
              },
            },
          },
        },
        seccion: true,
      },
    });

    if (!usuario || !usuario.habilitado) {
      throw new UnauthorizedException(
        'Credenciales inválidas o cuenta inhabilitada',
      );
    }

    const hashOTP = this.getHashOTP(codigo);

    // Buscar código no usado y no expirado
    const registroOtp = await this.prisma.codigoVerificacion.findFirst({
      where: {
        id_usuario: usuario.id_usuario,
        codigo: hashOTP,
        usado: false,
        fecha_expiracion: { gte: new Date() },
      },
      orderBy: { fecha_creacion: 'desc' },
    });

    if (!registroOtp) {
      // Incrementar intentos del último OTP generado
      const ultimoOtp = await this.prisma.codigoVerificacion.findFirst({
        where: { id_usuario: usuario.id_usuario, usado: false },
        orderBy: { fecha_creacion: 'desc' },
      });

      if (ultimoOtp) {
        const nuevosIntentos = ultimoOtp.intentos + 1;
        if (nuevosIntentos >= 3) {
          // Auto invalidar si supera 3 intentos
          await this.prisma.codigoVerificacion.update({
            where: { id_codigo: ultimoOtp.id_codigo },
            data: { intentos: nuevosIntentos, usado: true },
          });
          throw new UnauthorizedException(
            'OTP bloqueado por exceso de intentos.',
          );
        } else {
          await this.prisma.codigoVerificacion.update({
            where: { id_codigo: ultimoOtp.id_codigo },
            data: { intentos: nuevosIntentos },
          });
        }
      }
      throw new UnauthorizedException('Código OTP inválido o expirado');
    }

    // Marcar OTP como usado
    await this.prisma.codigoVerificacion.update({
      where: { id_codigo: registroOtp.id_codigo },
      data: { usado: true, fecha_uso: new Date() },
    });

    // Crear sesión en base de datos
    const expiracionSesion = new Date();
    // Leer expiración de la sesión desde el env o usar default 8 horas
    const accessExpires = process.env.JWT_ACCESS_EXPIRES_IN || '8h';
    const refreshExpires = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

    const accessDurationMs = 8 * 60 * 60 * 1000; // 8 horas por defecto
    expiracionSesion.setTime(expiracionSesion.getTime() + accessDurationMs);

    // Creamos la sesión vacía primero para tener el id_sesion
    const sesion = await this.prisma.sesion.create({
      data: {
        id_usuario: usuario.id_usuario,
        token: '', // Se actualizará a continuación
        fecha_expiracion: expiracionSesion,
        ip,
        user_agent: userAgent,
      },
    });

    // Generar Access Token con sid
    const accessPayload = {
      sub: usuario.id_usuario,
      ci: usuario.ci,
      rol: usuario.rol.nombre,
      grupo_usuario:
        usuario.rol.nombre === 'CADETE'
          ? 'CADETES'
          : usuario.rol.nombre === 'ADMINISTRATIVO_ACADEMICO'
            ? 'ADMINISTRATIVOS_ACADEMICOS'
            : 'ADMINISTRATIVOS',
      seccion: usuario.seccion?.nombre ?? null,
      sid: sesion.id_sesion,
    };

    const accessToken = await this.jwtService.signAsync(accessPayload, {
      secret: process.env.JWT_SECRET || 'clave_secreta_emse',
      expiresIn: accessExpires as any,
    });

    // Generar Refresh Token
    const refreshPayload = {
      sub: usuario.id_usuario,
      sid: sesion.id_sesion,
    };

    const refreshToken = await this.jwtService.signAsync(refreshPayload, {
      secret: process.env.JWT_SECRET || 'clave_secreta_emse',
      expiresIn: refreshExpires as any,
    });

    const refreshHash = this.getHashSHA256(refreshToken);

    // Guardar tokens y crear registro histórico
    const refreshExpiracion = new Date();
    const refreshDurationMs = 7 * 24 * 60 * 60 * 1000; // 7 días
    refreshExpiracion.setTime(refreshExpiracion.getTime() + refreshDurationMs);

    await this.prisma.$transaction([
      this.prisma.sesion.update({
        where: { id_sesion: sesion.id_sesion },
        data: {
          token: accessToken,
          refresh_token: refreshHash,
        },
      }),
      this.prisma.refreshHistorico.create({
        data: {
          id_sesion: sesion.id_sesion,
          token_hash: refreshHash,
          fecha_expiracion: refreshExpiracion,
        },
      }),
      this.prisma.logAcceso.create({
        data: {
          id_usuario: usuario.id_usuario,
          correo_intentado: usuario.correo || '',
          evento: 'LOGIN_EXITOSO',
          exito: true,
          ip,
          user_agent: userAgent,
        },
      }),
      this.prisma.usuario.update({
        where: { id_usuario: usuario.id_usuario },
        data: { estado: 'ACTIVO' },
      }),
    ]);

    return {
      accessToken,
      refreshToken,
      usuario: await this.me(usuario.id_usuario),
    };
  }

  async refresh(refreshToken: string, ip?: string, userAgent?: string) {
    try {
      const payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: process.env.JWT_SECRET || 'clave_secreta_emse',
      });

      const refreshHash = this.getHashSHA256(refreshToken);

      // Buscar el refresh histórico
      const refreshReg = await this.prisma.refreshHistorico.findUnique({
        where: { token_hash: refreshHash },
        include: { sesion: true },
      });

      if (
        !refreshReg ||
        refreshReg.revocado ||
        refreshReg.fecha_expiracion < new Date()
      ) {
        throw new UnauthorizedException('Refresh token no válido o expirado');
      }

      // RTR: Detección de reutilización
      if (refreshReg.usado) {
        // Incidente de seguridad: Reutilización de token detectada.
        // Revocar de inmediato toda la sesión y todos sus refresh tokens
        await this.prisma.$transaction([
          this.prisma.sesion.update({
            where: { id_sesion: refreshReg.id_sesion },
            data: { activa: false, motivo_cierre: 'ROBO_TOKEN_REUTILIZACION' },
          }),
          this.prisma.refreshHistorico.updateMany({
            where: { id_sesion: refreshReg.id_sesion },
            data: { revocado: true },
          }),
          this.prisma.auditoriaAccion.create({
            data: {
              id_usuario: refreshReg.sesion.id_usuario,
              accion: 'DETECCION_REUTILIZACION_REFRESH_TOKEN',
              modulo: 'SEGURIDAD',
              entidad: 'Sesion',
              id_entidad: refreshReg.id_sesion,
              descripcion: `Intento de reutilización de refresh token ya usado para la sesión ${refreshReg.id_sesion}. Se invalidó toda la sesión.`,
              ip,
              user_agent: userAgent,
            },
          }),
        ]);
        throw new UnauthorizedException('Acceso denegado: Token reutilizado');
      }

      const sesion = refreshReg.sesion;
      if (!sesion.activa) {
        throw new UnauthorizedException('La sesión no está activa');
      }

      // Obtener el usuario
      const usuario = await this.prisma.usuario.findUnique({
        where: { id_usuario: sesion.id_usuario },
        include: { rol: true, seccion: true },
      });

      if (!usuario || !usuario.habilitado) {
        throw new UnauthorizedException('Usuario bloqueado o inactivo');
      }

      // Generar nuevo par de tokens
      const accessExpires = process.env.JWT_ACCESS_EXPIRES_IN || '8h';
      const refreshExpires = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

      const expiracionSesion = new Date();
      const accessDurationMs = 8 * 60 * 60 * 1000;
      expiracionSesion.setTime(expiracionSesion.getTime() + accessDurationMs);

      const accessPayload = {
        sub: usuario.id_usuario,
        ci: usuario.ci,
        rol: usuario.rol.nombre,
        grupo_usuario:
          usuario.rol.nombre === 'CADETE'
            ? 'CADETES'
            : usuario.rol.nombre === 'ADMINISTRATIVO_ACADEMICO'
              ? 'ADMINISTRATIVOS_ACADEMICOS'
              : 'ADMINISTRATIVOS',
        seccion: usuario.seccion?.nombre ?? null,
        sid: sesion.id_sesion,
      };

      const newAccessToken = await this.jwtService.signAsync(accessPayload, {
        secret: process.env.JWT_SECRET || 'clave_secreta_emse',
        expiresIn: accessExpires as any,
      });

      const newRefreshToken = await this.jwtService.signAsync(
        { sub: usuario.id_usuario, sid: sesion.id_sesion },
        {
          secret: process.env.JWT_SECRET || 'clave_secreta_emse',
          expiresIn: refreshExpires as any,
        },
      );

      const newRefreshHash = this.getHashSHA256(newRefreshToken);

      const newRefreshExpiracion = new Date();
      const refreshDurationMs = 7 * 24 * 60 * 60 * 1000;
      newRefreshExpiracion.setTime(
        newRefreshExpiracion.getTime() + refreshDurationMs,
      );

      // Transacción: Marcar viejo como usado, crear el nuevo y actualizar sesión
      await this.prisma.$transaction([
        this.prisma.refreshHistorico.update({
          where: { id_refresh_historico: refreshReg.id_refresh_historico },
          data: { usado: true },
        }),
        this.prisma.sesion.update({
          where: { id_sesion: sesion.id_sesion },
          data: {
            token: newAccessToken,
            refresh_token: newRefreshHash,
            fecha_expiracion: expiracionSesion,
          },
        }),
        this.prisma.refreshHistorico.create({
          data: {
            id_sesion: sesion.id_sesion,
            token_hash: newRefreshHash,
            fecha_expiracion: newRefreshExpiracion,
          },
        }),
      ]);

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Token de actualización inválido');
    }
  }

  async logout(
    idSesion: number,
    idUsuario: number,
    ip?: string,
    userAgent?: string,
  ) {
    const sesion = await this.prisma.sesion.findUnique({
      where: { id_sesion: idSesion },
    });

    if (!sesion || sesion.id_usuario !== idUsuario) {
      throw new BadRequestException(
        'Sesión no válida o no pertenece al usuario',
      );
    }

    await this.prisma.$transaction([
      this.prisma.sesion.update({
        where: { id_sesion: idSesion },
        data: {
          activa: false,
          fecha_cierre: new Date(),
          motivo_cierre: 'Cierre de sesión voluntario',
        },
      }),
      this.prisma.refreshHistorico.updateMany({
        where: { id_sesion: idSesion },
        data: { revocado: true },
      }),
      this.prisma.auditoriaAccion.create({
        data: {
          id_usuario: idUsuario,
          accion: 'LOGOUT',
          modulo: 'AUTENTICACION',
          entidad: 'Sesion',
          id_entidad: idSesion,
          descripcion: `Usuario cerró sesión de forma exitosa.`,
          ip,
          user_agent: userAgent,
        },
      }),
    ]);

    const otrasSesiones = await this.prisma.sesion.count({
      where: {
        id_usuario: idUsuario,
        activa: true,
        id_sesion: { not: idSesion },
      },
    });
    if (otrasSesiones === 0) {
      await this.prisma.usuario.update({
        where: { id_usuario: idUsuario },
        data: { estado: 'INACTIVO' },
      });
    }

    return { mensaje: 'Sesión cerrada exitosamente.' };
  }

  async me(idUsuario: number) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id_usuario: idUsuario },
      include: {
        rol: {
          include: {
            permisos: {
              include: {
                permiso: true,
              },
            },
          },
        },
        seccion: true,
        cadete: {
          include: {
            curso: true,
          },
        },
        permisos_individuales: { include: { permiso: true } },
      },
    });

    if (!usuario) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    const permisosRol = usuario.rol.permisos
      .filter((rp) => rp.permiso.estado)
      .map((rp) => rp.permiso.nombre);
    const permisosSet = new Set(permisosRol);
    for (const override of usuario.permisos_individuales) {
      if (!override.permiso.estado) continue;
      if (override.concedido) permisosSet.add(override.permiso.nombre);
      else permisosSet.delete(override.permiso.nombre);
    }
    const permisos = [...permisosSet];

    // Calcular módulos dinámicamente según permisos
    const modulo_academico = permisos.some(
      (p) => p.startsWith('ACADEMICO') || p.startsWith('NOTA'),
    );
    const modulo_documental = permisos.some(
      (p) => p.startsWith('DOC') || p.startsWith('DOCUMENTAL'),
    );

    return {
      id_usuario: usuario.id_usuario,
      nombres: usuario.nombres,
      apellidos: usuario.apellidos,
      ci: usuario.ci,
      correo: usuario.correo,
      estado: usuario.estado,
      primer_inicio: usuario.primer_inicio,
      rol: usuario.rol.nombre,
      grupo_usuario:
        usuario.rol.nombre === 'CADETE'
          ? 'CADETES'
          : usuario.rol.nombre === 'ADMINISTRATIVO_ACADEMICO'
            ? 'ADMINISTRATIVOS_ACADEMICOS'
            : 'ADMINISTRATIVOS',
      seccion: usuario.seccion?.nombre ?? null,
      modulo_academico,
      modulo_documental,
      permisos,
      cadete: usuario.cadete
        ? {
            id_cadete: usuario.cadete.id_cadete,
            arma: usuario.cadete.arma,
            curso: usuario.cadete.curso.nombre,
          }
        : null,
    };
  }

  async cambiarContrasena(
    idUsuario: number,
    contrasenaActual: string,
    contrasenaNueva: string,
    ip?: string,
    userAgent?: string,
  ) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id_usuario: idUsuario },
    });

    if (!usuario) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    // Validar contraseña actual
    const contrasenaValida = await bcrypt.compare(
      contrasenaActual,
      usuario.contrasena,
    );
    if (!contrasenaValida) {
      throw new BadRequestException('La contraseña actual es incorrecta');
    }

    // Validar que la nueva no sea igual a la actual
    const esIgualAActual = await bcrypt.compare(
      contrasenaNueva,
      usuario.contrasena,
    );
    if (esIgualAActual) {
      throw new BadRequestException(
        'La nueva contraseña no puede ser igual a la actual.',
      );
    }

    // Validar historial de contraseñas (últimas 5)
    const historial = await this.prisma.historialPassword.findMany({
      where: { id_usuario: idUsuario },
      orderBy: { fecha_cambio: 'desc' },
      take: 5,
    });

    for (const registro of historial) {
      const coincideConHistorial = await bcrypt.compare(
        contrasenaNueva,
        registro.contrasena,
      );
      if (coincideConHistorial) {
        throw new BadRequestException(
          'La contraseña elegida ya ha sido utilizada recientemente (dentro de las últimas 5 contraseñas).',
        );
      }
    }

    const contrasenaCifrada = await bcrypt.hash(contrasenaNueva, 10);

    await this.prisma.$transaction([
      // Actualizar contraseña del usuario y primer_inicio a false
      this.prisma.usuario.update({
        where: { id_usuario: idUsuario },
        data: {
          contrasena: contrasenaCifrada,
          primer_inicio: false,
        },
      }),
      // Guardar el hash anterior en el historial
      this.prisma.historialPassword.create({
        data: {
          id_usuario: idUsuario,
          contrasena: contrasenaCifrada,
        },
      }),
      // Invalidar todas las sesiones activas anteriores del usuario (fuerza relogin)
      this.prisma.sesion.updateMany({
        where: { id_usuario: idUsuario, activa: true },
        data: { activa: false, motivo_cierre: 'CAMBIO_CONTRASENA_OBLIGATORIO' },
      }),
      // Revocar todos los refresh tokens asociados a este usuario
      this.prisma.refreshHistorico.updateMany({
        where: { sesion: { id_usuario: idUsuario } },
        data: { revocado: true },
      }),
      // Registrar en auditoría
      this.prisma.auditoriaAccion.create({
        data: {
          id_usuario: idUsuario,
          accion: 'CAMBIO_CONTRASENA',
          modulo: 'SEGURIDAD',
          entidad: 'Usuario',
          id_entidad: idUsuario,
          descripcion: `Usuario cambió su contraseña exitosamente de forma manual.`,
          ip,
          user_agent: userAgent,
        },
      }),
    ]);

    // OBTENER USUARIO CON ROL Y SECCION PARA GENERAR LOS NUEVOS TOKENS DE SESION
    const usuarioActualizado = await this.prisma.usuario.findUnique({
      where: { id_usuario: idUsuario },
      include: { rol: true, seccion: true },
    });

    if (!usuarioActualizado) {
      throw new UnauthorizedException(
        'Usuario no encontrado después de cambiar contraseña',
      );
    }

    // Crear la nueva sesión activa tras el cambio de contraseña
    const expiracionSesion = new Date();
    const accessExpires = process.env.JWT_ACCESS_EXPIRES_IN || '8h';
    const refreshExpires = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
    const accessDurationMs = 8 * 60 * 60 * 1000;
    expiracionSesion.setTime(expiracionSesion.getTime() + accessDurationMs);

    const nuevaSesion = await this.prisma.sesion.create({
      data: {
        id_usuario: idUsuario,
        token: '',
        fecha_expiracion: expiracionSesion,
        ip,
        user_agent: userAgent,
      },
    });

    const accessPayload = {
      sub: usuarioActualizado.id_usuario,
      ci: usuarioActualizado.ci,
      rol: usuarioActualizado.rol.nombre,
      grupo_usuario:
        usuarioActualizado.rol.nombre === 'CADETE'
          ? 'CADETES'
          : usuarioActualizado.rol.nombre === 'ADMINISTRATIVO_ACADEMICO'
            ? 'ADMINISTRATIVOS_ACADEMICOS'
            : 'ADMINISTRATIVOS',
      seccion: usuarioActualizado.seccion?.nombre ?? null,
      sid: nuevaSesion.id_sesion,
    };

    const accessToken = await this.jwtService.signAsync(accessPayload, {
      secret: process.env.JWT_SECRET || 'clave_secreta_emse',
      expiresIn: accessExpires as any,
    });

    const refreshToken = await this.jwtService.signAsync(
      { sub: usuarioActualizado.id_usuario, sid: nuevaSesion.id_sesion },
      {
        secret: process.env.JWT_SECRET || 'clave_secreta_emse',
        expiresIn: refreshExpires as any,
      },
    );

    const refreshHash = this.getHashSHA256(refreshToken);
    const refreshExpiracion = new Date();
    const refreshDurationMs = 7 * 24 * 60 * 60 * 1000;
    refreshExpiracion.setTime(refreshExpiracion.getTime() + refreshDurationMs);

    await this.prisma.$transaction([
      this.prisma.sesion.update({
        where: { id_sesion: nuevaSesion.id_sesion },
        data: {
          token: accessToken,
          refresh_token: refreshHash,
        },
      }),
      this.prisma.refreshHistorico.create({
        data: {
          id_sesion: nuevaSesion.id_sesion,
          token_hash: refreshHash,
          fecha_expiracion: refreshExpiracion,
        },
      }),
    ]);

    const infoUsuario = await this.me(idUsuario);

    return {
      mensaje:
        'Contraseña cambiada exitosamente. Sesión iniciada automáticamente.',
      accessToken,
      refreshToken,
      usuario: infoUsuario,
    };
  }
}
