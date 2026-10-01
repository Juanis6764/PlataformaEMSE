import { AuditoriaService } from './auditoria.service';

describe('AuditoriaService transaccional', () => {
  const prisma = { auditoriaAccion: { create: jest.fn() } };
  const transaccion = { auditoriaAccion: { create: jest.fn() } };
  let servicio: AuditoriaService;

  beforeEach(() => {
    jest.clearAllMocks();
    servicio = new AuditoriaService(prisma as never);
  });

  it('utiliza el cliente transaccional recibido', async () => {
    transaccion.auditoriaAccion.create.mockResolvedValue({ id_auditoria: 1 });

    await servicio.registrar(
      {
        id_usuario: 5,
        accion: 'MODIFICACION_EXTRAORDINARIA',
        modulo: 'ACADEMICO',
        entidad: 'REGISTRO_DISCIPLINA',
        id_entidad: 1,
        descripcion: 'Justificación institucional',
        datos_antes: { puntaje: '2.0000' },
        datos_despues: { puntaje: '3.0000' },
      },
      transaccion as never,
    );

    expect(transaccion.auditoriaAccion.create).toHaveBeenCalledTimes(1);
    expect(prisma.auditoriaAccion.create).not.toHaveBeenCalled();
  });

  it('conserva códigos académicos y oculta únicamente secretos conocidos', async () => {
    prisma.auditoriaAccion.create.mockResolvedValue({ id_auditoria: 1 });

    await servicio.registrar({
      id_usuario: 1,
      accion: 'EDITAR_CATALOGO',
      modulo: 'ACADEMICO',
      entidad: 'CATALOGO_DISCIPLINA',
      id_entidad: 1,
      descripcion: 'Edición auditada',
      datos_antes: {
        codigo: 'D001',
        token: 'secreto',
      },
    });

    expect(prisma.auditoriaAccion.create).toHaveBeenCalledWith({
      data: {
        id_usuario: 1,
        accion: 'EDITAR_CATALOGO',
        modulo: 'ACADEMICO',
        entidad: 'CATALOGO_DISCIPLINA',
        id_entidad: 1,
        descripcion: 'Edición auditada',
        datos_antes: {
          codigo: 'D001',
          token: '[REDACTADO]',
        },
        datos_despues: undefined,
        ip: undefined,
        user_agent: undefined,
      },
    });
  });
});
