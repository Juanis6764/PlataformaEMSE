import { BadRequestException } from '@nestjs/common';
import { CadetesService } from './cadetes.service';

describe('CadetesService y el historial académico real', () => {
  const prisma = {
    curso: { findUnique: jest.fn() },
    periodoLectivo: { findUnique: jest.fn() },
    cadete: { update: jest.fn() },
    historialCursoCadete: {
      findMany: jest.fn(),
      create: jest.fn(),
      createMany: jest.fn(),
    },
  };
  const presencia = { estaEnLinea: jest.fn() };
  let service: CadetesService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CadetesService(prisma as never, presencia as never);
  });

  it('valida un periodo real al cambiar curso y no fabrica historial', async () => {
    jest.spyOn(service, 'obtenerCadetePorId').mockResolvedValue({
      id_cadete: 10,
      id_curso: 1,
      estado_cadete: 'REGULAR',
    } as never);
    prisma.curso.findUnique.mockResolvedValue({
      id_curso: 2,
      nombre: 'SEGUNDO_AÑO',
      orden: 2,
    });
    prisma.periodoLectivo.findUnique.mockResolvedValue({
      id_periodo: 3,
      periodo: 'I',
      gestion: { id_gestion: 1, ano: 2026, estado: 'ACTIVA' },
    });
    prisma.cadete.update.mockResolvedValue({ id_cadete: 10, id_curso: 2 });

    await service.cambiarCurso(10, { id_curso: 2, id_periodo: 3 });

    expect(prisma.periodoLectivo.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id_periodo: 3 } }),
    );
    expect(prisma.cadete.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ id_curso: 2 }),
      }),
    );
    expect(prisma.historialCursoCadete.create).not.toHaveBeenCalled();
    expect(prisma.historialCursoCadete.createMany).not.toHaveBeenCalled();
  });

  it('rechaza un cambio de curso sin PeriodoLectivo existente', async () => {
    jest.spyOn(service, 'obtenerCadetePorId').mockResolvedValue({
      id_cadete: 10,
      id_curso: 1,
      estado_cadete: 'REGULAR',
    } as never);
    prisma.curso.findUnique.mockResolvedValue({ id_curso: 2, orden: 2 });
    prisma.periodoLectivo.findUnique.mockResolvedValue(null);

    await expect(
      service.cambiarCurso(10, { id_curso: 2, id_periodo: 999 }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.cadete.update).not.toHaveBeenCalled();
  });

  it('muestra el semestre calculado desde curso y periodo', async () => {
    jest
      .spyOn(service, 'obtenerCadetePorId')
      .mockResolvedValue({ id_cadete: 10 } as never);
    prisma.historialCursoCadete.findMany.mockResolvedValue([
      {
        id_historial: 1,
        id_cadete: 10,
        id_curso: 2,
        id_periodo: 4,
        estado_cadete: 'REGULAR',
        fecha_registro: new Date('2026-08-06T00:00:00Z'),
        curso: { id_curso: 2, nombre: 'SEGUNDO_AÑO', orden: 2 },
        periodoLectivo: {
          id_periodo: 4,
          id_gestion: 1,
          periodo: 'II',
          activo: false,
          id_creador: 1,
          fecha_creacion: new Date('2026-01-01T00:00:00Z'),
          fecha_actualizacion: new Date('2026-01-01T00:00:00Z'),
          gestion: { id_gestion: 1, ano: 2026, estado: 'ACTIVA' },
        },
      },
    ]);

    const resultado = await service.obtenerHistorialCursos(10);

    expect(resultado).toEqual([
      expect.objectContaining({
        id_historial: 1,
        semestre: 4,
        periodoLectivo: expect.objectContaining({
          periodo: 'II',
          gestion: expect.objectContaining({ ano: 2026 }),
        }),
      }),
    ]);
  });
});
