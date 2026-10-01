import { BadRequestException } from '@nestjs/common';
import { Prisma, TipoDisciplina } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditoriaService } from '../../auditoria/auditoria.service';
import { ValidacionesNotasService } from '../comun/validaciones-notas.service';
import { CatalogoDisciplinaService } from './catalogo-disciplina.service';

describe('CatalogoDisciplinaService - límite de deméritos', () => {
  const tx = {
    catalogoDisciplina: { create: jest.fn() },
  };
  const prisma = {
    $transaction: jest.fn(
      async (operacion: (cliente: typeof tx) => Promise<unknown>) =>
        operacion(tx),
    ),
  };
  const validaciones = {
    obtenerPerfil: jest.fn().mockResolvedValue({
      tipo: 'ENCARGADO_DISCIPLINA',
      permisos: new Set(['CONFIGURAR_DISCIPLINA']),
    }),
    exigirTipo: jest.fn(),
    exigirPermiso: jest.fn(),
  };
  const auditoria = { registrar: jest.fn() };
  const servicio = new CatalogoDisciplinaService(
    prisma as unknown as PrismaService,
    validaciones as unknown as ValidacionesNotasService,
    auditoria as unknown as AuditoriaService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation(
      async (operacion: (cliente: typeof tx) => Promise<unknown>) =>
        operacion(tx),
    );
    tx.catalogoDisciplina.create.mockImplementation(
      ({ data }: { data: Record<string, unknown> }) =>
        Promise.resolve({
          id_catalogo: 1,
          ...data,
          activo: true,
        }),
    );
  });

  it('permite al Encargado registrar un demérito con puntaje 10', async () => {
    const resultado = await servicio.crear(8, {
      tipo: TipoDisciplina.DEMERITO,
      codigo: 'DEM-10',
      nombre: 'Demérito máximo',
      puntaje_base: '10',
    });

    expect(resultado.puntaje_base).toBe('10.0000');
    expect(tx.catalogoDisciplina.create).toHaveBeenCalledWith({
      data: {
        tipo: TipoDisciplina.DEMERITO,
        codigo: 'DEM-10',
        nombre: 'Demérito máximo',
        puntaje_base: new Prisma.Decimal(10),
        id_creador: 8,
      },
    });
  });

  it('rechaza puntajes mayores a 10', async () => {
    await expect(
      servicio.crear(8, {
        tipo: TipoDisciplina.DEMERITO,
        codigo: 'DEM-11',
        nombre: 'Demérito fuera de límite',
        puntaje_base: '11',
      }),
    ).rejects.toThrow(
      new BadRequestException(
        'El puntaje fijo de un demérito debe ser un entero entre 1 y 10.',
      ),
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
