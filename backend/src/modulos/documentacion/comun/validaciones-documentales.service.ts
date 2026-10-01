import { ForbiddenException, Injectable } from '@nestjs/common';
import { ExpedienteDocumento, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  NOMBRE_SECCION_ADMINISTRACION_DOCUMENTAL,
  NOMBRES_SECCION_DOCUMENTAL,
} from './constantes-documentales';

type ClienteDocumental = PrismaService | Prisma.TransactionClient;

export type TipoActorDocumental =
  | 'ADMINISTRADOR'
  | 'RADIO'
  | 'SECRETARIA_GENERAL'
  | 'COMANDO'
  | 'SEGUNDO_COMANDO'
  | 'ADMINISTRACION'
  | 'AREA'
  | 'OTRO';

export interface PerfilDocumental {
  id_usuario: number;
  id_seccion: number | null;
  tipo: TipoActorDocumental;
  permisos: Set<string>;
}

@Injectable()
export class ValidacionesDocumentalesService {
  constructor(private readonly prisma: PrismaService) {}

  async obtenerPerfil(
    idUsuario: number,
    cliente: ClienteDocumental = this.prisma,
  ): Promise<PerfilDocumental> {
    const usuario = await cliente.usuario.findUnique({
      where: { id_usuario: idUsuario },
      include: {
        rol: { include: { permisos: { include: { permiso: true } } } },
        permisos_individuales: { include: { permiso: true } },
        seccion: { select: { id_seccion: true, nombre: true } },
      },
    });

    if (!usuario?.habilitado) {
      throw new ForbiddenException('Usuario inexistente o inhabilitado.');
    }

    const permisos = new Set(
      usuario.rol.permisos
        .filter((item) => item.permiso.estado)
        .map((item) => item.permiso.nombre),
    );
    for (const individual of usuario.permisos_individuales) {
      if (!individual.permiso.estado) continue;
      if (individual.concedido) permisos.add(individual.permiso.nombre);
      else permisos.delete(individual.permiso.nombre);
    }

    let tipo: TipoActorDocumental = 'OTRO';
    if (
      usuario.rol.nombre === 'ADMINISTRADOR' &&
      usuario.seccion?.nombre !== NOMBRE_SECCION_ADMINISTRACION_DOCUMENTAL
    ) {
      tipo = 'ADMINISTRADOR';
    } else if (usuario.seccion) {
      switch (usuario.seccion.nombre) {
        case NOMBRES_SECCION_DOCUMENTAL.RADIO:
          tipo = 'RADIO';
          break;
        case NOMBRES_SECCION_DOCUMENTAL.SECRETARIA_GENERAL:
          tipo = 'SECRETARIA_GENERAL';
          break;
        case NOMBRES_SECCION_DOCUMENTAL.COMANDO:
          tipo = 'COMANDO';
          break;
        case NOMBRES_SECCION_DOCUMENTAL.SEGUNDO_COMANDO:
          tipo = 'SEGUNDO_COMANDO';
          break;
        case NOMBRE_SECCION_ADMINISTRACION_DOCUMENTAL:
          tipo = 'ADMINISTRACION';
          break;
        default:
          tipo = 'AREA';
      }
    }

    return {
      id_usuario: idUsuario,
      id_seccion: usuario.seccion?.id_seccion ?? null,
      tipo,
      permisos,
    };
  }

  exigirTipo(perfil: PerfilDocumental, ...tipos: TipoActorDocumental[]) {
    if (!tipos.includes(perfil.tipo)) {
      throw new ForbiddenException(
        'Su sección/rol no puede ejecutar esta acción del workflow documental.',
      );
    }
  }

  exigirPermiso(perfil: PerfilDocumental, permiso: string) {
    if (!perfil.permisos.has(permiso)) {
      throw new ForbiddenException(`Permiso requerido: ${permiso}`);
    }
  }

  /**
   * Actores con seguimiento institucional global. Las demás secciones
   * consultan por ubicación actual o participación histórica.
   */
  esActorGlobal(perfil: PerfilDocumental): boolean {
    return (
      perfil.tipo === 'ADMINISTRADOR' ||
      perfil.tipo === 'RADIO' ||
      perfil.tipo === 'COMANDO'
    );
  }

  /**
   * Filtro exclusivo de LECTURA. Conserva el acceso de una sección o
   * usuario que participó en el expediente, aun cuando la ubicación actual
   * ya sea otra. No debe reutilizarse para mutaciones: las acciones del
   * workflow continúan protegidas por `exigirSeccionActual`.
   *
   * Un movimiento dirigido a la sección también cuenta como participación,
   * aunque siga PENDIENTE: es el contrato que permite abrir desde Bandeja
   * antes de ejecutar "Recibir".
   */
  crearFiltroConsulta(perfil: PerfilDocumental): Prisma.DocumentoWhereInput {
    if (this.esActorGlobal(perfil)) return {};

    const participacionExpediente: Prisma.ExpedienteDocumentoWhereInput[] = [
      { id_usuario_responsable_actual: perfil.id_usuario },
      {
        movimientos: {
          some: {
            OR: [
              { id_usuario_envia: perfil.id_usuario },
              { id_usuario_recibe: perfil.id_usuario },
            ],
          },
        },
      },
      { historial: { some: { id_usuario: perfil.id_usuario } } },
      { cumplimientos: { some: { id_usuario: perfil.id_usuario } } },
      { observaciones: { some: { id_usuario: perfil.id_usuario } } },
      {
        hoja_ruta: {
          is: {
            OR: [
              { id_usuario_asigno: perfil.id_usuario },
              {
                proveidos: {
                  some: {
                    OR: [
                      { id_usuario_emisor: perfil.id_usuario },
                      {
                        plazo: {
                          is: { id_usuario_responsable: perfil.id_usuario },
                        },
                      },
                    ],
                  },
                },
              },
            ],
          },
        },
      },
    ];

    const participacionDocumento: Prisma.DocumentoWhereInput[] = [
      { id_usuario_registro: perfil.id_usuario },
    ];

    if (perfil.id_seccion !== null) {
      participacionDocumento.push({ id_seccion_registro: perfil.id_seccion });
      participacionExpediente.push(
        { id_seccion_actual: perfil.id_seccion },
        {
          movimientos: {
            some: {
              OR: [
                { id_seccion_origen: perfil.id_seccion },
                { id_seccion_destino: perfil.id_seccion },
              ],
            },
          },
        },
        { historial: { some: { id_seccion: perfil.id_seccion } } },
        { cumplimientos: { some: { id_seccion: perfil.id_seccion } } },
        { observaciones: { some: { id_seccion: perfil.id_seccion } } },
        {
          hoja_ruta: {
            is: {
              OR: [
                { id_seccion: perfil.id_seccion },
                {
                  proveidos: {
                    some: {
                      OR: [
                        { id_seccion_emisora: perfil.id_seccion },
                        { id_seccion_destino: perfil.id_seccion },
                        {
                          plazo: {
                            is: {
                              id_seccion_responsable: perfil.id_seccion,
                            },
                          },
                        },
                      ],
                    },
                  },
                },
              ],
            },
          },
        },
      );
    }

    participacionDocumento.push({
      expediente: { is: { OR: participacionExpediente } },
    });
    return { OR: participacionDocumento };
  }

  async puedeConsultarDocumento(
    perfil: PerfilDocumental,
    idDocumento: number,
    cliente: ClienteDocumental = this.prisma,
  ): Promise<boolean> {
    const documento = await cliente.documento.findFirst({
      where: {
        AND: [{ id_documento: idDocumento }, this.crearFiltroConsulta(perfil)],
      },
      select: { id_documento: true },
    });
    return documento !== null;
  }

  /**
   * Un expediente solo puede ser intervenido (escribir) por alguien de la
   * sección que lo tiene actualmente. A diferencia de la lectura (VER), no
   * hay bypass para ADMINISTRADOR: no debe saltarse la posición real del
   * workflow solo por ser administrador.
   */
  exigirSeccionActual(
    perfil: PerfilDocumental,
    expediente: Pick<ExpedienteDocumento, 'id_seccion_actual'>,
  ) {
    if (perfil.id_seccion !== expediente.id_seccion_actual) {
      throw new ForbiddenException(
        'El expediente no se encuentra actualmente en su sección.',
      );
    }
  }
}
