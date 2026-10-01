import { ModuloNotificacion } from '@prisma/client';
import { NotificacionesService } from './notificaciones.service';

describe('NotificacionesService', () => {
  const prisma = {
    notificacion: {
      upsert: jest.fn(),
      createMany: jest.fn(),
      updateMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };
  let servicio: NotificacionesService;

  beforeEach(() => {
    jest.clearAllMocks();
    servicio = new NotificacionesService(prisma as never);
  });

  it('no notifica al mismo usuario que ejecuta la acción', async () => {
    const resultado = await servicio.crearUnica({
      id_usuario_destinatario: 10,
      id_usuario_emisor: 10,
      modulo: ModuloNotificacion.ACADEMICO,
      area: 'DISCIPLINA',
      tipo: 'SEMANA_ENVIADA',
      titulo: 'Semana enviada',
      mensaje: 'Mensaje real de flujo',
      clave_evento: 'DISCIPLINA:SEMANA:1:V:1:DEST:10',
    });

    expect(resultado).toBeNull();
    expect(prisma.notificacion.upsert).not.toHaveBeenCalled();
  });

  it('usa clave única e idempotente sin actualizar el contenido existente', async () => {
    prisma.notificacion.upsert.mockResolvedValue({ id_notificacion: 1 });

    await servicio.crearUnica({
      id_usuario_destinatario: 8,
      id_usuario_emisor: 1850,
      modulo: ModuloNotificacion.ACADEMICO,
      area: 'disciplina',
      tipo: 'semana_enviada',
      titulo: ' Semana enviada ',
      mensaje: ' Pendiente de revisión ',
      id_referencia: 1,
      clave_evento: 'DISCIPLINA:SEMANA:1:V:1:DEST:8',
    });

    expect(prisma.notificacion.upsert).toHaveBeenCalledWith({
      where: { clave_evento: 'DISCIPLINA:SEMANA:1:V:1:DEST:8' },
      update: {},
      create: {
        id_usuario_destinatario: 8,
        modulo: ModuloNotificacion.ACADEMICO,
        area: 'DISCIPLINA',
        tipo: 'SEMANA_ENVIADA',
        titulo: 'Semana enviada',
        mensaje: 'Pendiente de revisión',
        id_referencia: 1,
        ruta_destino: null,
        clave_evento: 'DISCIPLINA:SEMANA:1:V:1:DEST:8',
      },
    });
  });

  it('elimina destinatarios repetidos y omite al emisor', async () => {
    prisma.notificacion.createMany.mockResolvedValue({ count: 1 });
    const base = {
      id_usuario_emisor: 1850,
      modulo: ModuloNotificacion.ACADEMICO,
      area: 'DISCIPLINA',
      tipo: 'SEMANA_ENVIADA',
      titulo: 'Semana enviada',
      mensaje: 'Pendiente',
    };

    await servicio.crearMuchasUnicas([
      {
        ...base,
        id_usuario_destinatario: 8,
        clave_evento: 'EVENTO:DEST:8',
      },
      {
        ...base,
        id_usuario_destinatario: 8,
        clave_evento: 'EVENTO:DEST:8',
      },
      {
        ...base,
        id_usuario_destinatario: 1850,
        clave_evento: 'EVENTO:DEST:1850',
      },
    ]);

    expect(prisma.notificacion.createMany).toHaveBeenCalledWith({
      data: [
        {
          id_usuario_destinatario: 8,
          modulo: ModuloNotificacion.ACADEMICO,
          area: 'DISCIPLINA',
          tipo: 'SEMANA_ENVIADA',
          titulo: 'Semana enviada',
          mensaje: 'Pendiente',
          id_referencia: null,
          ruta_destino: null,
          clave_evento: 'EVENTO:DEST:8',
        },
      ],
      skipDuplicates: true,
    });
  });
});
