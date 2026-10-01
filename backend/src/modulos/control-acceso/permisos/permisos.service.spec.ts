import { Test, TestingModule } from '@nestjs/testing';
import { PermisosService } from './permisos.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { ConflictException, NotFoundException } from '@nestjs/common';

const mockPrisma = {
  permiso: {
    findMany: jest.fn().mockResolvedValue([]),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
};

describe('PermisosService', () => {
  let service: PermisosService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermisosService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<PermisosService>(PermisosService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('listarPermisos debe retornar un array', async () => {
    const result = await service.listarPermisos();
    expect(Array.isArray(result)).toBe(true);
  });

  it('obtenerPermiso debe lanzar NotFoundException si no existe', async () => {
    mockPrisma.permiso.findUnique.mockResolvedValue(null);
    await expect(service.obtenerPermiso(999)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('crearPermiso debe lanzar ConflictException si el nombre existe', async () => {
    mockPrisma.permiso.findUnique.mockResolvedValue({
      id_permiso: 1,
      nombre: 'GESTIONAR_ROLES',
    });
    await expect(
      service.crearPermiso({
        nombre: 'GESTIONAR_ROLES',
        modulo: 'roles',
        accion: 'LEER',
      }),
    ).rejects.toThrow(ConflictException);
  });
});
