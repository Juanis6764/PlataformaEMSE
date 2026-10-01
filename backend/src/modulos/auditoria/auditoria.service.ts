import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { FiltrarAuditoriaDto } from './dto/auditoria.dto';

export interface RegistrarAuditoriaDto {
  id_usuario: number;
  accion: string;
  modulo: string;
  entidad: string;
  id_entidad: number;
  descripcion: string;
  datos_antes?: Prisma.InputJsonObject;
  datos_despues?: Prisma.InputJsonObject;
  ip?: string;
  user_agent?: string;
}

type ClienteAuditoria = Pick<Prisma.TransactionClient, 'auditoriaAccion'>;

@Injectable()
export class AuditoriaService {
  constructor(private prisma: PrismaService) {}

  /**
   * Registra una acción en AuditoriaAccion.
   * Filtra campos sensibles automáticamente (contrasena, token, hash).
   */
  async registrar(
    dto: RegistrarAuditoriaDto,
    cliente: ClienteAuditoria = this.prisma,
  ) {
    const camposSensibles = [
      'contrasena',
      'password',
      'token',
      'token_hash',
      'refresh_token',
      'codigo_verificacion',
      'codigo_otp',
    ];

    const limpiarObjeto = (obj?: Prisma.InputJsonObject) => {
      if (!obj) return undefined;
      const limpio: Record<string, Prisma.InputJsonValue | null> = {};
      for (const [k, v] of Object.entries(obj)) {
        if (v === undefined) continue;
        limpio[k] = camposSensibles.includes(k.toLowerCase())
          ? '[REDACTADO]'
          : v;
      }
      return limpio as Prisma.InputJsonObject;
    };

    return cliente.auditoriaAccion.create({
      data: {
        id_usuario: dto.id_usuario,
        accion: dto.accion,
        modulo: dto.modulo,
        entidad: dto.entidad,
        id_entidad: dto.id_entidad,
        descripcion: dto.descripcion,
        datos_antes: limpiarObjeto(dto.datos_antes) ?? undefined,
        datos_despues: limpiarObjeto(dto.datos_despues) ?? undefined,
        ip: dto.ip,
        user_agent: dto.user_agent,
      },
    });
  }

  /**
   * Listar registros de auditoría con paginación y filtros
   */
  async listarAuditoria(filtros: FiltrarAuditoriaDto) {
    const {
      pagina = 1,
      limite = 20,
      id_usuario,
      modulo,
      accion,
      entidad,
    } = filtros;
    const skip = (pagina - 1) * limite;

    const where: Prisma.AuditoriaAccionWhereInput = {};
    if (id_usuario) where.id_usuario = id_usuario;
    if (modulo) where.modulo = { contains: modulo, mode: 'insensitive' };
    if (accion) where.accion = { contains: accion, mode: 'insensitive' };
    if (entidad) where.entidad = { contains: entidad, mode: 'insensitive' };

    const [total, registros] = await this.prisma.$transaction([
      this.prisma.auditoriaAccion.count({ where }),
      this.prisma.auditoriaAccion.findMany({
        where,
        skip,
        take: limite,
        include: {
          usuario: {
            select: {
              id_usuario: true,
              nombres: true,
              apellidos: true,
              ci: true,
            },
          },
        },
        orderBy: { fecha: 'desc' },
      }),
    ]);

    return {
      data: registros,
      meta: {
        total,
        pagina,
        limite,
        paginas_totales: Math.ceil(total / limite),
      },
    };
  }

  /**
   * Obtener logs de acceso (LogAcceso) con paginación
   */
  async listarLogsAcceso(pagina: number = 1, limite: number = 20) {
    const skip = (pagina - 1) * limite;

    const [total, logs] = await this.prisma.$transaction([
      this.prisma.logAcceso.count(),
      this.prisma.logAcceso.findMany({
        skip,
        take: limite,
        include: {
          usuario: {
            select: {
              id_usuario: true,
              nombres: true,
              apellidos: true,
              ci: true,
            },
          },
        },
        orderBy: { fecha: 'desc' },
      }),
    ]);

    return {
      data: logs,
      meta: {
        total,
        pagina,
        limite,
        paginas_totales: Math.ceil(total / limite),
      },
    };
  }
}
