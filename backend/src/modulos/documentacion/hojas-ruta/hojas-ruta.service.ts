import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EstadoDocumento } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditoriaService } from '../../auditoria/auditoria.service';
import { CorrelativoDocumentalService } from '../comun/correlativo-documental.service';
import {
  MODULO_DOCUMENTOS,
  NOMBRES_SECCION_DOCUMENTAL,
  PERMISOS_DOCUMENTOS,
} from '../comun/constantes-documentales';
import { ValidacionesDocumentalesService } from '../comun/validaciones-documentales.service';
import { EditarProveidoDto } from './dto/editar-proveido.dto';
import { RegistrarProveidoDto } from './dto/registrar-proveido.dto';
import { DocumentacionGateway } from '../tiempo-real/documentacion.gateway';

@Injectable()
export class HojasRutaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly validaciones: ValidacionesDocumentalesService,
    private readonly correlativo: CorrelativoDocumentalService,
    private readonly auditoria: AuditoriaService,
    private readonly gateway: DocumentacionGateway,
  ) {}

  async asignar(idUsuario: number, idDocumento: number) {
    const perfil = await this.validaciones.obtenerPerfil(idUsuario);
    this.validaciones.exigirTipo(perfil, 'SECRETARIA_GENERAL');
    this.validaciones.exigirPermiso(
      perfil,
      PERMISOS_DOCUMENTOS.ASIGNAR_HOJA_RUTA,
    );

    const expediente = await this.obtenerExpediente(idDocumento);
    this.validaciones.exigirSeccionActual(perfil, expediente);
    if (expediente.estado_actual !== EstadoDocumento.EN_TRAMITE) {
      throw new ConflictException(
        'Solo se puede asignar hoja de ruta a un expediente en trámite.',
      );
    }

    const existente = await this.prisma.hojaRuta.findUnique({
      where: { id_documento: idDocumento },
    });
    if (existente) {
      throw new ConflictException(
        `Este documento ya tiene la hoja de ruta ${existente.numero}.`,
      );
    }

    const resultado = await this.prisma.$transaction(async (tx) => {
      const anio = new Date().getFullYear();
      const numero = await this.correlativo.generarNumeroHojaRuta(tx, anio);

      const hojaRuta = await tx.hojaRuta.create({
        data: {
          numero,
          id_documento: idDocumento,
          id_usuario_asigno: idUsuario,
          id_seccion: perfil.id_seccion as number,
        },
      });

      await this.auditoria.registrar(
        {
          id_usuario: idUsuario,
          accion: 'ASIGNAR_HOJA_RUTA',
          modulo: MODULO_DOCUMENTOS,
          entidad: 'HojaRuta',
          id_entidad: hojaRuta.id_hoja_ruta,
          descripcion: `Hoja de ruta ${hojaRuta.numero} asignada al documento ${idDocumento}.`,
          datos_despues: { numero: hojaRuta.numero, id_documento: idDocumento },
        },
        tx,
      );

      return hojaRuta;
    });
    this.gateway.emitirDocumentoActualizado(idDocumento);
    return resultado;
  }

  async registrarProveido(
    idUsuario: number,
    idHojaRuta: number,
    dto: RegistrarProveidoDto,
  ) {
    const perfil = await this.validaciones.obtenerPerfil(idUsuario);
    const hojaRuta = await this.prisma.hojaRuta.findUnique({
      where: { id_hoja_ruta: idHojaRuta },
    });
    if (!hojaRuta) throw new NotFoundException('Hoja de ruta no encontrada.');

    const expediente = await this.obtenerExpediente(hojaRuta.id_documento);
    this.validaciones.exigirSeccionActual(perfil, expediente);
    if (expediente.estado_actual !== EstadoDocumento.EN_TRAMITE) {
      throw new ConflictException(
        'Solo se puede registrar un proveído sobre un expediente en trámite.',
      );
    }

    const proveidosExistentes = await this.prisma.proveido.count({
      where: { id_hoja_ruta: idHojaRuta },
    });
    const numeroMomento = proveidosExistentes + 1;

    let idSeccionDestino: number;
    if (numeroMomento === 1) {
      this.validaciones.exigirTipo(perfil, 'SECRETARIA_GENERAL');
      const comando = await this.prisma.seccion.findUnique({
        where: { nombre: NOMBRES_SECCION_DOCUMENTAL.COMANDO },
      });
      if (!comando) {
        throw new NotFoundException('Sección Comando no configurada.');
      }
      idSeccionDestino = comando.id_seccion;
    } else if (numeroMomento === 2) {
      this.validaciones.exigirTipo(perfil, 'SEGUNDO_COMANDO');
      if (!dto.id_seccion_destino || !dto.tipo_atencion_requerida) {
        throw new BadRequestException(
          'El segundo proveído requiere sección responsable y tipo de atención (CUMPLIMIENTO o RESPUESTA).',
        );
      }
      const areaDestino = await this.prisma.seccion.findFirst({
        where: { id_seccion: dto.id_seccion_destino, estado: true },
      });
      if (!areaDestino) {
        throw new NotFoundException(
          'La sección responsable no existe o no está habilitada.',
        );
      }
      // Segundo Comando deriva a un área ejecutora real, no a otra sección
      // institucional del workflow (que rompería la secuencia fija de
      // MovimientosService.enviar).
      const NOMBRES_INSTITUCIONALES: string[] = Object.values(
        NOMBRES_SECCION_DOCUMENTAL,
      );
      if (NOMBRES_INSTITUCIONALES.includes(areaDestino.nombre)) {
        throw new BadRequestException(
          'El segundo proveído debe derivar a un área ejecutora, no a una sección institucional del workflow (Radio, Secretaría General, Comando o Segundo Comando).',
        );
      }
      idSeccionDestino = dto.id_seccion_destino;
    } else {
      throw new BadRequestException(
        'Esta hoja de ruta ya tiene los dos proveídos institucionales (Secretaría General y Segundo Comando).',
      );
    }
    this.validaciones.exigirPermiso(
      perfil,
      PERMISOS_DOCUMENTOS.REGISTRAR_PROVEIDO,
    );

    const resultado = await this.prisma.$transaction(async (tx) => {
      // @@unique([id_hoja_ruta, numero_momento]) protege la concurrencia:
      // si dos solicitudes compiten por crear el mismo momento, Postgres
      // rechaza la segunda (P2002 -> 409 vía PrismaExceptionFilter).
      const proveido = await tx.proveido.create({
        data: {
          id_hoja_ruta: idHojaRuta,
          numero_momento: numeroMomento,
          contenido: dto.contenido,
          id_usuario_emisor: idUsuario,
          id_seccion_emisora: perfil.id_seccion as number,
          id_seccion_destino: idSeccionDestino,
        },
      });

      if (dto.fecha_hora_limite) {
        await tx.plazoDocumento.create({
          data: {
            id_proveido: proveido.id_proveido,
            id_seccion_responsable: idSeccionDestino,
            fecha_hora_limite: new Date(dto.fecha_hora_limite),
          },
        });
      }

      // El segundo proveído fija qué debe producir el área ejecutora.
      // El insert de arriba ya ganó la carrera de concurrencia (unique
      // constraint); esta actualización no necesita guardia propia.
      if (numeroMomento === 2) {
        await tx.expedienteDocumento.update({
          where: { id_documento: hojaRuta.id_documento },
          data: { tipo_atencion_requerida: dto.tipo_atencion_requerida },
        });
      }

      await this.auditoria.registrar(
        {
          id_usuario: idUsuario,
          accion: 'REGISTRAR_PROVEIDO',
          modulo: MODULO_DOCUMENTOS,
          entidad: 'Proveido',
          id_entidad: proveido.id_proveido,
          descripcion: `Proveído ${numeroMomento} registrado en hoja de ruta ${hojaRuta.numero}.`,
          datos_despues: {
            numero_momento: numeroMomento,
            id_seccion_destino: idSeccionDestino,
            tipo_atencion_requerida: dto.tipo_atencion_requerida ?? null,
          },
        },
        tx,
      );

      return proveido;
    });
    this.gateway.emitirDocumentoActualizado(hojaRuta.id_documento);
    return resultado;
  }

  /**
   * COMANDO puede corregir el contenido/plazo del Primer Proveído (registrado
   * por Secretaría General) mientras lo tiene en revisión — antes de que
   * Segundo Comando registre el segundo proveído, momento en el que el
   * primero queda cerrado. Es una edición in-place del mismo Proveido, no
   * un tercer proveído ni un plazo independiente nuevo (punto 18: los
   * plazos de momentos distintos sí son independientes, pero esto sigue
   * siendo el mismo momento 1).
   */
  async editarPrimerProveido(
    idUsuario: number,
    idHojaRuta: number,
    dto: EditarProveidoDto,
  ) {
    const perfil = await this.validaciones.obtenerPerfil(idUsuario);
    this.validaciones.exigirTipo(perfil, 'COMANDO');
    this.validaciones.exigirPermiso(
      perfil,
      PERMISOS_DOCUMENTOS.REGISTRAR_PROVEIDO,
    );

    const hojaRuta = await this.prisma.hojaRuta.findUnique({
      where: { id_hoja_ruta: idHojaRuta },
    });
    if (!hojaRuta) throw new NotFoundException('Hoja de ruta no encontrada.');

    const expediente = await this.obtenerExpediente(hojaRuta.id_documento);
    this.validaciones.exigirSeccionActual(perfil, expediente);
    if (expediente.estado_actual !== EstadoDocumento.EN_TRAMITE) {
      throw new ConflictException(
        'Solo se puede editar el primer proveído mientras el expediente está en trámite.',
      );
    }

    const proveidoPrimero = await this.prisma.proveido.findUnique({
      where: {
        id_hoja_ruta_numero_momento: {
          id_hoja_ruta: idHojaRuta,
          numero_momento: 1,
        },
      },
    });
    if (!proveidoPrimero) {
      throw new NotFoundException(
        'Esta hoja de ruta aún no tiene un primer proveído registrado.',
      );
    }
    const proveidoSegundo = await this.prisma.proveido.findUnique({
      where: {
        id_hoja_ruta_numero_momento: {
          id_hoja_ruta: idHojaRuta,
          numero_momento: 2,
        },
      },
    });
    if (proveidoSegundo) {
      throw new ConflictException(
        'El primer proveído ya no puede editarse: Segundo Comando ya registró el segundo proveído.',
      );
    }

    const resultado = await this.prisma.$transaction(async (tx) => {
      const actualizado = await tx.proveido.update({
        where: { id_proveido: proveidoPrimero.id_proveido },
        data: { contenido: dto.contenido },
      });

      if (dto.fecha_hora_limite) {
        await tx.plazoDocumento.upsert({
          where: { id_proveido: proveidoPrimero.id_proveido },
          update: { fecha_hora_limite: new Date(dto.fecha_hora_limite) },
          create: {
            id_proveido: proveidoPrimero.id_proveido,
            id_seccion_responsable:
              proveidoPrimero.id_seccion_destino as number,
            fecha_hora_limite: new Date(dto.fecha_hora_limite),
          },
        });
      }

      await this.auditoria.registrar(
        {
          id_usuario: idUsuario,
          accion: 'EDITAR_PROVEIDO',
          modulo: MODULO_DOCUMENTOS,
          entidad: 'Proveido',
          id_entidad: actualizado.id_proveido,
          descripcion: `Primer proveído editado en hoja de ruta ${hojaRuta.numero}.`,
          datos_despues: { contenido: actualizado.contenido },
        },
        tx,
      );

      return actualizado;
    });
    this.gateway.emitirDocumentoActualizado(hojaRuta.id_documento);
    return resultado;
  }

  private async obtenerExpediente(idDocumento: number) {
    const expediente = await this.prisma.expedienteDocumento.findUnique({
      where: { id_documento: idDocumento },
    });
    if (!expediente) {
      throw new NotFoundException(
        'Expediente no encontrado (el documento debe ser principal).',
      );
    }
    return expediente;
  }
}
