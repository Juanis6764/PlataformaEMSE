import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CrearUsuarioDto } from './dto/crear-usuario.dto';
import {
  ActualizarUsuarioDto,
  FiltrarUsuariosDto,
  CambiarEstadoDto,
  CambiarRolDto,
  CambiarSeccionDto,
  ActualizarPermisosUsuarioDto,
} from './dto/usuarios-operaciones.dto';
import * as bcrypt from 'bcrypt';
import { PresenciaService } from '../presencia/presencia.service';
import { AutenticacionService } from '../autenticacion/autenticacion.service';

@Injectable()
export class UsuariosService {
  constructor(
    private prisma: PrismaService,
    private readonly presencia: PresenciaService,
    private readonly autenticacion: AutenticacionService,
  ) {}

  async crearUsuario(dto: CrearUsuarioDto) {
    // Validar CI único
    const existeCI = await this.prisma.usuario.findUnique({
      where: { ci: dto.ci },
    });
    if (existeCI) {
      throw new ConflictException(
        'Ya existe un usuario registrado con esa Cédula de Identidad (CI)',
      );
    }

    // Validar existencia de Rol y Sección
    const rol = await this.prisma.rol.findUnique({
      where: { id_rol: dto.id_rol },
    });
    if (!rol || !rol.estado) {
      throw new BadRequestException(
        'El rol asignado no existe o está inactivo',
      );
    }

    if (dto.id_seccion) {
      const seccion = await this.prisma.seccion.findUnique({
        where: { id_seccion: dto.id_seccion },
      });
      if (!seccion || !seccion.estado) {
        throw new BadRequestException(
          'La sección asignada no existe o está inactiva',
        );
      }
    }

    // Contraseña por defecto: 123456
    const contrasenaClara = dto.contrasena || '123456';
    const contrasenaCifrada = await bcrypt.hash(contrasenaClara, 10);

    const usuario = await this.prisma.$transaction(async (tx) => {
      const user = await tx.usuario.create({
        data: {
          nombres: dto.nombres,
          apellidos: dto.apellidos,
          ci: dto.ci,
          correo: dto.correo || null,
          contrasena: contrasenaCifrada,
          primer_inicio: true,
          id_rol: dto.id_rol,
          es_mixto: dto.es_mixto ?? false,
          id_seccion: dto.id_seccion || null,
        },
        include: {
          rol: true,
          seccion: true,
        },
      });

      // Guardar contraseña en el historial
      await tx.historialPassword.create({
        data: {
          id_usuario: user.id_usuario,
          contrasena: contrasenaCifrada,
        },
      });

      return user;
    });

    return usuario;
  }

  async obtenerUsuario(id_usuario: number) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id_usuario },
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
      throw new NotFoundException('Usuario no encontrado');
    }

    const { contrasena: _contrasena, ...datos } = usuario;
    return {
      ...datos,
      estado_conexion: this.presencia.estaEnLinea(id_usuario)
        ? 'EN_LINEA'
        : 'DESCONECTADO',
    };
  }

  async listarUsuarios(filtros: FiltrarUsuariosDto) {
    const {
      pagina = 1,
      limite = 10,
      buscar,
      id_rol,
      id_seccion,
      estado,
      habilitado,
      incluir_cadetes,
    } = filtros;
    const skip = (pagina - 1) * limite;

    // Construcción de condiciones WHERE
    const where: any = {};

    if (!incluir_cadetes) {
      where.rol = { nombre: { not: 'CADETE' } };
    }

    if (id_rol) {
      where.id_rol = id_rol;
    }
    if (id_seccion) {
      where.id_seccion = id_seccion;
    }
    if (estado) {
      where.estado = estado;
    }
    if (habilitado !== undefined) where.habilitado = habilitado;

    // Split search para nombres, apellidos y CI sin SQL Injection
    if (buscar && buscar.trim().length > 0) {
      const terminos = buscar.trim().split(/\s+/);
      where.AND = terminos.map((termino) => ({
        OR: [
          { nombres: { contains: termino, mode: 'insensitive' } },
          { apellidos: { contains: termino, mode: 'insensitive' } },
          { ci: { contains: termino, mode: 'insensitive' } },
        ],
      }));
    }

    const [total, usuarios] = await this.prisma.$transaction([
      this.prisma.usuario.count({ where }),
      this.prisma.usuario.findMany({
        where,
        skip,
        take: limite,
        include: {
          rol: true,
          seccion: true,
          cadete: {
            include: {
              curso: true,
            },
          },
        },
        orderBy: { id_usuario: 'asc' },
      }),
    ]);

    return {
      data: usuarios.map(({ contrasena: _contrasena, ...usuario }) => ({
        ...usuario,
        estado_conexion: this.presencia.estaEnLinea(usuario.id_usuario)
          ? 'EN_LINEA'
          : 'DESCONECTADO',
      })),
      meta: {
        total,
        pagina,
        limite,
        paginas_totales: Math.ceil(total / limite),
      },
    };
  }

  async actualizarUsuario(id_usuario: number, dto: ActualizarUsuarioDto) {
    const usuario = await this.obtenerUsuario(id_usuario);
    if (dto.ci !== undefined && dto.ci !== usuario.ci) {
      const ciOcupado = await this.prisma.usuario.findUnique({
        where: { ci: dto.ci },
        select: { id_usuario: true },
      });
      if (ciOcupado) {
        throw new ConflictException(
          'Ya existe un usuario registrado con ese CI.',
        );
      }
    }
    if (dto.id_rol !== undefined) {
      const rol = await this.prisma.rol.findUnique({
        where: { id_rol: dto.id_rol },
      });
      if (!rol?.estado)
        throw new BadRequestException(
          'El rol seleccionado no existe o está inactivo.',
        );
    }
    if (dto.id_seccion !== undefined && dto.id_seccion !== null) {
      const seccion = await this.prisma.seccion.findUnique({
        where: { id_seccion: dto.id_seccion },
      });
      if (!seccion?.estado)
        throw new BadRequestException(
          'La sección seleccionada no existe o está inactiva.',
        );
    }
    if (dto.id_curso !== undefined) {
      const [cadete, curso] = await Promise.all([
        this.prisma.cadete.findUnique({ where: { id_usuario } }),
        this.prisma.curso.findUnique({ where: { id_curso: dto.id_curso } }),
      ]);
      if (!cadete)
        throw new BadRequestException('Solamente un cadete puede tener curso.');
      if (!curso)
        throw new BadRequestException('El curso seleccionado no existe.');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.usuario.update({
        where: { id_usuario },
        data: {
          ci: dto.ci,
          nombres: dto.nombres,
          apellidos: dto.apellidos,
          correo: dto.correo,
          es_mixto: dto.es_mixto,
          id_rol: dto.id_rol,
          id_seccion: dto.id_seccion,
          habilitado: dto.habilitado,
        },
      });
      if (dto.id_curso !== undefined) {
        await tx.cadete.update({
          where: { id_usuario },
          data: { id_curso: dto.id_curso },
        });
      }
      if (dto.id_rol !== undefined && dto.id_rol !== usuario.id_rol) {
        await tx.sesion.updateMany({
          where: { id_usuario, activa: true },
          data: {
            activa: false,
            motivo_cierre: 'CAMBIO_DE_ROL_ADMINISTRATIVO',
          },
        });
      }
    });
    return this.obtenerUsuario(id_usuario);
  }

  async cambiarEstado(id_usuario: number, dto: CambiarEstadoDto) {
    const usuario = await this.obtenerUsuario(id_usuario);

    if (usuario.rol.nombre === 'ADMINISTRADOR' && !dto.habilitado) {
      // Evitar que el administrador principal sea bloqueado o inactivado
      const adminsActivos = await this.prisma.usuario.count({
        where: { id_rol: usuario.id_rol, habilitado: true },
      });
      if (adminsActivos <= 1) {
        throw new BadRequestException(
          'No se puede desactivar ni bloquear al único Administrador activo del sistema.',
        );
      }
    }

    const usuarioActualizado = await this.prisma.usuario.update({
      where: { id_usuario },
      data: { habilitado: dto.habilitado },
    });

    // Si se inactiva o bloquea, invalidar sus sesiones activas de inmediato
    if (!dto.habilitado) {
      await this.prisma.$transaction([
        this.prisma.sesion.updateMany({
          where: { id_usuario, activa: true },
          data: { activa: false, motivo_cierre: 'USUARIO_SUSPENDIDO' },
        }),
        this.prisma.refreshHistorico.updateMany({
          where: { sesion: { id_usuario } },
          data: { revocado: true },
        }),
      ]);
      await this.prisma.usuario.update({
        where: { id_usuario },
        data: { estado: 'INACTIVO' },
      });
    }

    return usuarioActualizado;
  }

  async cambiarRol(id_usuario: number, dto: CambiarRolDto) {
    const usuario = await this.obtenerUsuario(id_usuario);

    if (
      usuario.rol.nombre === 'ADMINISTRADOR' &&
      dto.id_rol !== usuario.id_rol
    ) {
      const adminsActivos = await this.prisma.usuario.count({
        where: { id_rol: usuario.id_rol, habilitado: true },
      });
      if (adminsActivos <= 1) {
        throw new BadRequestException(
          'No se puede cambiar el rol del único Administrador activo del sistema.',
        );
      }
    }

    const rol = await this.prisma.rol.findUnique({
      where: { id_rol: dto.id_rol },
    });
    if (!rol || !rol.estado) {
      throw new BadRequestException(
        'El rol seleccionado no existe o está inactivo.',
      );
    }

    const usuarioActualizado = await this.prisma.usuario.update({
      where: { id_usuario },
      data: { id_rol: dto.id_rol },
    });

    // Invalidar sesiones actuales para forzar actualización de permisos en nuevo login/JWT
    await this.prisma.$transaction([
      this.prisma.sesion.updateMany({
        where: { id_usuario, activa: true },
        data: { activa: false, motivo_cierre: 'CAMBIO_DE_ROL_ADMINISTRATIVO' },
      }),
      this.prisma.refreshHistorico.updateMany({
        where: { sesion: { id_usuario } },
        data: { revocado: true },
      }),
    ]);

    return usuarioActualizado;
  }

  async cambiarSeccion(id_usuario: number, dto: CambiarSeccionDto) {
    await this.obtenerUsuario(id_usuario);

    const seccion = await this.prisma.seccion.findUnique({
      where: { id_seccion: dto.id_seccion },
    });

    if (!seccion || !seccion.estado) {
      throw new BadRequestException(
        'La sección seleccionada no existe o está inactiva.',
      );
    }

    return this.prisma.usuario.update({
      where: { id_usuario },
      data: { id_seccion: dto.id_seccion },
    });
  }

  async actualizarPermisosIndividuales(
    id_usuario: number,
    dto: ActualizarPermisosUsuarioDto,
  ) {
    await this.obtenerUsuario(id_usuario);
    const ids = dto.permisos.map((permiso) => permiso.id_permiso);
    if (new Set(ids).size !== ids.length) {
      throw new BadRequestException(
        'No se permiten permisos individuales duplicados.',
      );
    }
    const existentes = await this.prisma.permiso.count({
      where: { id_permiso: { in: ids }, estado: true },
    });
    if (existentes !== ids.length) {
      throw new BadRequestException(
        'Uno o más permisos no existen o están inactivos.',
      );
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.usuarioPermiso.deleteMany({ where: { id_usuario } });
      if (dto.permisos.length)
        await tx.usuarioPermiso.createMany({
          data: dto.permisos.map((p) => ({ id_usuario, ...p })),
        });
      await tx.sesion.updateMany({
        where: { id_usuario, activa: true },
        data: { activa: false, motivo_cierre: 'CAMBIO_PERMISOS_INDIVIDUALES' },
      });
    });
    return this.obtenerUsuario(id_usuario);
  }

  async restablecerContrasena(id_usuario: number) {
    const usuario = await this.obtenerUsuario(id_usuario);

    // Contraseña temporal institucional.
    const contrasenaTemporal = 'EMSE2026.';
    const contrasenaCifrada = await bcrypt.hash(contrasenaTemporal, 10);

    await this.prisma.$transaction([
      this.prisma.usuario.update({
        where: { id_usuario },
        data: {
          contrasena: contrasenaCifrada,
          primer_inicio: true,
        },
      }),
      this.prisma.historialPassword.create({
        data: {
          id_usuario,
          contrasena: contrasenaCifrada,
        },
      }),
      // Cerrar e invalidar sesiones de forma preventiva
      this.prisma.sesion.updateMany({
        where: { id_usuario, activa: true },
        data: {
          activa: false,
          motivo_cierre: 'RESTABLECIMIENTO_CONTRASENA_ADMINISTRATIVO',
        },
      }),
      this.prisma.refreshHistorico.updateMany({
        where: { sesion: { id_usuario } },
        data: { revocado: true },
      }),
    ]);
    this.autenticacion.limpiarIntentosUsuario(usuario.ci);

    return {
      mensaje:
        'Contraseña restablecida exitosamente a EMSE2026. El usuario deberá cambiarla en su próximo ingreso.',
    };
  }
}
