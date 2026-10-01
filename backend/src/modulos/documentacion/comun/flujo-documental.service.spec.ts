import { ConflictException } from '@nestjs/common';
import { EstadoDocumento } from '@prisma/client';
import { FlujoDocumentalService } from './flujo-documental.service';

describe('FlujoDocumentalService', () => {
  const expediente = {
    id_documento: 1,
    estado_actual: EstadoDocumento.EN_TRAMITE,
    id_seccion_actual: 10,
    id_usuario_responsable_actual: 5,
    tipo_atencion_requerida: null,
    fecha_hora_actualizacion: new Date(),
  } as any;

  const cambioBase = {
    estados_permitidos: [EstadoDocumento.EN_TRAMITE],
    id_seccion_actual_esperada: 10,
    estado_nuevo: EstadoDocumento.EN_TRANSITO,
    id_actor: 5,
    id_seccion_actor: 10,
    accion: 'ENVIAR_DOCUMENTO',
    descripcion: 'Documento enviado.',
  };

  function crearAuditoriaMock() {
    return { registrar: jest.fn().mockResolvedValue(undefined) };
  }

  it('lanza ConflictException si el updateMany guardado no afecta ninguna fila (carrera/doble clic)', async () => {
    const auditoria = crearAuditoriaMock();
    const servicio = new FlujoDocumentalService(auditoria as any);
    const tx = {
      expedienteDocumento: {
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        findUniqueOrThrow: jest.fn(),
      },
      historialEstadoDocumento: { create: jest.fn() },
    } as any;

    await expect(
      servicio.cambiarEstado(tx, expediente, cambioBase),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(tx.historialEstadoDocumento.create).not.toHaveBeenCalled();
    expect(auditoria.registrar).not.toHaveBeenCalled();
  });

  it('cuando el updateMany guardado afecta exactamente 1 fila, crea historial y audita', async () => {
    const auditoria = crearAuditoriaMock();
    const servicio = new FlujoDocumentalService(auditoria as any);
    const resultado = {
      ...expediente,
      estado_actual: EstadoDocumento.EN_TRANSITO,
    };
    const tx = {
      expedienteDocumento: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUniqueOrThrow: jest.fn().mockResolvedValue(resultado),
      },
      historialEstadoDocumento: { create: jest.fn().mockResolvedValue({}) },
    } as any;

    const salida = await servicio.cambiarEstado(tx, expediente, cambioBase);

    expect(salida).toBe(resultado);
    expect(tx.expedienteDocumento.updateMany).toHaveBeenCalledWith({
      where: {
        id_documento: expediente.id_documento,
        estado_actual: { in: cambioBase.estados_permitidos },
        id_seccion_actual: cambioBase.id_seccion_actual_esperada,
      },
      data: { estado_actual: cambioBase.estado_nuevo },
    });
    expect(tx.historialEstadoDocumento.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        id_documento: expediente.id_documento,
        estado_anterior: expediente.estado_actual,
        estado_nuevo: resultado.estado_actual,
      }),
    });
    expect(auditoria.registrar).toHaveBeenCalledWith(
      expect.objectContaining({ accion: cambioBase.accion }),
      tx,
    );
  });

  it('incluye id_seccion_actual e id_usuario_responsable_actual en el update solo cuando se especifican', async () => {
    const auditoria = crearAuditoriaMock();
    const servicio = new FlujoDocumentalService(auditoria as any);
    const tx = {
      expedienteDocumento: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUniqueOrThrow: jest.fn().mockResolvedValue(expediente),
      },
      historialEstadoDocumento: { create: jest.fn().mockResolvedValue({}) },
    } as any;

    await servicio.cambiarEstado(tx, expediente, {
      ...cambioBase,
      id_seccion_actual_nueva: 20,
      id_usuario_responsable_nuevo: 7,
    });

    expect(tx.expedienteDocumento.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          estado_actual: cambioBase.estado_nuevo,
          id_seccion_actual: 20,
          id_usuario_responsable_actual: 7,
        },
      }),
    );
  });
});
