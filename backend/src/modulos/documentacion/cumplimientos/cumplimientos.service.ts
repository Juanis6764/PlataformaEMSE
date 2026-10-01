import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EstadoDocumento, TipoAtencionRequerida } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditoriaService } from '../../auditoria/auditoria.service';
import {
  MODULO_DOCUMENTOS,
  PERMISOS_DOCUMENTOS,
} from '../comun/constantes-documentales';
import { ValidacionesDocumentalesService } from '../comun/validaciones-documentales.service';
import { RegistrarCumplimientoDto } from './dto/registrar-cumplimiento.dto';
import { DocumentacionGateway } from '../tiempo-real/documentacion.gateway';

const ESTADOS_QUE_ADMITEN_CUMPLIMIENTO: EstadoDocumento[] = [
  EstadoDocumento.EN_TRAMITE,
  EstadoDocumento.OBSERVADO,
];

@Injectable()
export class CumplimientosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly validaciones: ValidacionesDocumentalesService,
    private readonly auditoria: AuditoriaService,
    private readonly gateway: DocumentacionGateway,
  ) {}

  async registrar(
    idUsuario: number,
    idDocumento: number,
    dto: RegistrarCumplimientoDto,
  ) {
    const perfil = await this.validaciones.obtenerPerfil(idUsuario);
    const expediente = await this.prisma.expedienteDocumento.findUnique({
      where: { id_documento: idDocumento },
    });
    if (!expediente) {
      throw new NotFoundException(
        'Expediente no encontrado (el documento debe ser principal).',
      );
    }
    this.validaciones.exigirSeccionActual(perfil, expediente);
    this.validaciones.exigirPermiso(
      perfil,
      PERMISOS_DOCUMENTOS.REGISTRAR_CUMPLIMIENTO,
    );

    if (!ESTADOS_QUE_ADMITEN_CUMPLIMIENTO.includes(expediente.estado_actual)) {
      throw new ConflictException(
        'Solo se puede registrar cumplimiento sobre un expediente en trámite u observado.',
      );
    }
    if (expediente.tipo_atencion_requerida !== TipoAtencionRequerida.CUMPLIMIENTO) {
      throw new BadRequestException(
        'Este documento requiere una RESPUESTA, no un cumplimiento.',
      );
    }

    const resultado = await this.prisma.$transaction(async (tx) => {
      const cumplimiento = await tx.cumplimientoDocumento.create({
        data: {
          id_documento: idDocumento,
          descripcion: dto.descripcion,
          id_usuario: idUsuario,
          id_seccion: perfil.id_seccion as number,
        },
      });

      // Marca cumplido el plazo vigente para esta sección (si existe y
      // aún no estaba marcado). No sobrescribe la primera fecha de
      // cumplimiento si ya se había registrado.
      await tx.plazoDocumento.updateMany({
        where: {
          fecha_hora_cumplimiento: null,
          id_seccion_responsable: perfil.id_seccion as number,
          proveido: { hoja_ruta: { id_documento: idDocumento } },
        },
        data: { fecha_hora_cumplimiento: new Date() },
      });

      await this.auditoria.registrar(
        {
          id_usuario: idUsuario,
          accion: 'REGISTRAR_CUMPLIMIENTO',
          modulo: MODULO_DOCUMENTOS,
          entidad: 'CumplimientoDocumento',
          id_entidad: cumplimiento.id_cumplimiento,
          descripcion: `Cumplimiento registrado para el documento ${idDocumento}.`,
        },
        tx,
      );

      return cumplimiento;
    });
    this.gateway.emitirDocumentoActualizado(idDocumento);
    return resultado;
  }
}
