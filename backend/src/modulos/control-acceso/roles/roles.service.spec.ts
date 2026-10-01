import { Test, TestingModule } from '@nestjs/testing';
import { RolesService } from './roles.service';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  ConflictException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';

const mockPrisma = {
  rol: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  rolPermiso: {
    deleteMany: jest.fn(),
    createMany: jest.fn(),
  },
  usuario: {
    count: jest.fn(),
  },
  $transaction: jest.fn((ops) => Promise.all(ops)),
};

describe('RolesService', () => {
  let service: RolesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<RolesService>(RolesService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('crearRol', () => {
    it('debe crear un nuevo rol', async () => {
      mockPrisma.rol.findUnique.mockResolvedValue(null);
      mockPrisma.rol.create.mockResolvedValue({
        id_rol: 1,
        nombre: 'INSTRUCTOR',
        descripcion: null,
        estado: true,
      });

      const result = await service.crearRol({
        nombre: 'INSTRUCTOR',
        descripcion: null,
      });
      expect(result.nombre).toBe('INSTRUCTOR');
    });

    it('debe lanzar ConflictException si el nombre ya existe', async () => {
      mockPrisma.rol.findUnique.mockResolvedValue({
        id_rol: 1,
        nombre: 'ADMINISTRADOR',
      });

      await expect(
        service.crearRol({ nombre: 'ADMIN', descripcion: null }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('eliminarRol', () => {
    it('debe lanzar BadRequestException al intentar eliminar ADMIN', async () => {
      mockPrisma.rol.findUnique.mockResolvedValue({
        id_rol: 1,
        nombre: 'ADMINISTRADOR',
        estado: true,
      });
      mockPrisma.usuario.count.mockResolvedValue(0);

      await expect(service.eliminarRol(1)).rejects.toThrow(BadRequestException);
    });
  });

  describe('obtenerRol', () => {
    it('debe lanzar NotFoundException para un ID inexistente', async () => {
      mockPrisma.rol.findUnique.mockResolvedValue(null);

      await expect(service.obtenerRol(999)).rejects.toThrow(NotFoundException);
    });
  });
});
