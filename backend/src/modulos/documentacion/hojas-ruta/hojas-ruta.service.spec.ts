import { NotFoundException } from '@nestjs/common';
import { EstadoDocumento, TipoAtencionRequerida } from '@prisma/client';
import { HojasRutaService } from './hojas-ruta.service';

describe('HojasRutaService.registrarProveido', () => {
  function prepararEscenario(
    areaDestino: { id_seccion: number; nombre: string } | null,
  ) {
    const tx = {
      proveido: {
        create: jest.fn().mockResolvedValue({
          id_proveido: 31,
          id_hoja_ruta: 10,
          numero_momento: 2,
          contenido: 'Preparar respuesta institucional.',
          id_usuario_emisor: 8,
          id_seccion_emisora: 3,
          id_seccion_destino: 16,
        }),
      },
      plazoDocumento: {
        create: jest.fn().mockResolvedValue({ id_plazo: 41 }),
      },
      expedienteDocumento: {
        update: jest.fn().mockResolvedValue({ id_expediente: 21 }),
      },
    };
    const prisma = {
      hojaRuta: {
        findUnique: jest.fn().mockResolvedValue({
          id_hoja_ruta: 10,
          numero: 'HR-2026-000010',
          id_documento: 20,
        }),
      },
      expedienteDocumento: {
        findUnique: jest.fn().mockResolvedValue({
          id_expediente: 21,
          id_documento: 20,
          id_seccion_actual: 3,
          estado_actual: EstadoDocumento.EN_TRAMITE,
        }),
      },
      proveido: {
        count: jest.fn().mockResolvedValue(1),
      },
      seccion: {
        findFirst: jest.fn().mockResolvedValue(areaDestino),
      },
      $transaction: jest.fn((operacion: (cliente: typeof tx) => unknown) =>
        Promise.resolve(operacion(tx)),
      ),
    };
    const validaciones = {
      obtenerPerfil: jest.fn().mockResolvedValue({
        id_usuario: 8,
        id_seccion: 3,
        tipo: 'SEGUNDO_COMANDO',
        permisos: new Set(['DOC_REGISTRAR_PROVEIDO']),
      }),
      exigirSeccionActual: jest.fn(),
      exigirTipo: jest.fn(),
      exigirPermiso: jest.fn(),
    };
    const auditoria = { registrar: jest.fn().mockResolvedValue(undefined) };
    const gateway = { emitirDocumentoActualizado: jest.fn() };
    const servicio = new HojasRutaService(
      prisma as never,
      validaciones as never,
      {} as never,
      auditoria as never,
      gateway as never,
    );

    return { servicio, prisma, tx, auditoria, gateway };
  }

  it('rechaza un destino deshabilitado al exigir una sección con estado activo', async () => {
    const { servicio, prisma, tx } = prepararEscenario(null);

    await expect(
      servicio.registrarProveido(8, 10, {
        contenido: 'Preparar respuesta institucional.',
        id_seccion_destino: 16,
        tipo_atencion_requerida: TipoAtencionRequerida.RESPUESTA,
      }),
    ).rejects.toThrow(NotFoundException);

    expect(prisma.seccion.findFirst).toHaveBeenCalledWith({
      where: { id_seccion: 16, estado: true },
    });
    expect(tx.proveido.create).not.toHaveBeenCalled();
  });

  it('guarda la sección elegida, el plazo y el tipo de atención del segundo proveído', async () => {
    const { servicio, prisma, tx, gateway } = prepararEscenario({
      id_seccion: 16,
      nombre: 'ADMINISTRACION_SISTEMA',
    });
    const fechaLimite = '2026-09-18T18:30:00.000Z';

    await servicio.registrarProveido(8, 10, {
      contenido: 'Preparar respuesta institucional.',
      id_seccion_destino: 16,
      tipo_atencion_requerida: TipoAtencionRequerida.RESPUESTA,
      fecha_hora_limite: fechaLimite,
    });

    expect(prisma.seccion.findFirst).toHaveBeenCalledWith({
      where: { id_seccion: 16, estado: true },
    });
    expect(tx.proveido.create).toHaveBeenCalledWith({
      data: {
        id_hoja_ruta: 10,
        numero_momento: 2,
        contenido: 'Preparar respuesta institucional.',
        id_usuario_emisor: 8,
        id_seccion_emisora: 3,
        id_seccion_destino: 16,
      },
    });
    expect(tx.plazoDocumento.create).toHaveBeenCalledWith({
      data: {
        id_proveido: 31,
        id_seccion_responsable: 16,
        fecha_hora_limite: new Date(fechaLimite),
      },
    });
    expect(tx.expedienteDocumento.update).toHaveBeenCalledWith({
      where: { id_documento: 20 },
      data: { tipo_atencion_requerida: TipoAtencionRequerida.RESPUESTA },
    });
    expect(gateway.emitirDocumentoActualizado).toHaveBeenCalledWith(20);
  });
});
