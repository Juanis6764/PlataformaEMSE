import { Test, TestingModule } from '@nestjs/testing';
import { SeccionesService } from './secciones.service';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';

const mockPrisma = {
  seccion: {
    findMany: jest.fn().mockResolvedValue([]),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  usuario: {
    count: jest.fn(),
  },
};

describe('SeccionesService', () => {
  let service: SeccionesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SeccionesService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<SeccionesService>(SeccionesService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('obtenerSeccion debe lanzar NotFoundException si no existe', async () => {
    mockPrisma.seccion.findUnique.mockResolvedValue(null);
    await expect(service.obtenerSeccion(999)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('crearSeccion debe lanzar ConflictException si el nombre existe', async () => {
    mockPrisma.seccion.findFirst.mockResolvedValue({
      id_seccion: 1,
      nombre: 'PRIMERA COMPAÑÍA',
    });
    await expect(
      service.crearSeccion({
        nombre: 'PRIMERA COMPAÑÍA',
        nivel: 2,
        tipo: 'ADMINISTRATIVA' as any,
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('eliminarSeccion no debe eliminar si tiene subsecciones activas', async () => {
    mockPrisma.seccion.findUnique.mockResolvedValue({
      id_seccion: 1,
      nombre: 'BATALLÓN',
      estado: true,
      subsecciones: [],
    });
    mockPrisma.seccion.count.mockResolvedValue(2); // subsecciones activas

    await expect(service.eliminarSeccion(1)).rejects.toThrow(
      BadRequestException,
    );
  });
});
