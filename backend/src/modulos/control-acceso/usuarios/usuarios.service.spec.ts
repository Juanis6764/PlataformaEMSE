import { Test, TestingModule } from '@nestjs/testing';
import { UsuariosService } from './usuarios.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { ConflictException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PresenciaService } from '../presencia/presencia.service';
import { AutenticacionService } from '../autenticacion/autenticacion.service';

const mockPrisma = {
  usuario: {
    findUnique: jest.fn(),
    findMany: jest.fn().mockResolvedValue([]),
    count: jest.fn().mockResolvedValue(0),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  rol: { findUnique: jest.fn() },
  seccion: { findUnique: jest.fn() },
  usuarioPermiso: { deleteMany: jest.fn(), createMany: jest.fn() },
  historialPassword: { create: jest.fn() },
  sesion: { updateMany: jest.fn() },
  refreshHistorico: { updateMany: jest.fn() },
  $transaction: jest.fn((ops) =>
    Array.isArray(ops) ? Promise.all(ops) : ops(mockPrisma),
  ),
};
const mockAutenticacion = {
  limpiarIntentosUsuario: jest.fn(),
};

describe('UsuariosService', () => {
  let service: UsuariosService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsuariosService,
        { provide: PrismaService, useValue: mockPrisma },
        {
          provide: PresenciaService,
          useValue: { estaEnLinea: jest.fn().mockReturnValue(false) },
        },
        {
          provide: AutenticacionService,
          useValue: mockAutenticacion,
        },
      ],
    }).compile();

    service = module.get<UsuariosService>(UsuariosService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('crearUsuario', () => {
    it('debe lanzar ConflictException si el CI ya existe', async () => {
      mockPrisma.usuario.findUnique.mockResolvedValue({
        id_usuario: 1,
        ci: '100001',
      });
      await expect(
        service.crearUsuario({
          nombres: 'Test',
          apellidos: 'Usuario',
          ci: '100001',
          id_rol: 1,
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('obtenerUsuario', () => {
    it('debe lanzar NotFoundException si el usuario no existe', async () => {
      mockPrisma.usuario.findUnique.mockResolvedValue(null);
      await expect(service.obtenerUsuario(999)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('restablecerContrasena', () => {
    it('guarda EMSE2026. hasheada, reactiva primer inicio e invalida sesiones', async () => {
      mockPrisma.usuario.findUnique.mockResolvedValue({
        id_usuario: 7,
        ci: '100007',
        contrasena: 'hash-anterior',
        sesiones: [],
      });
      mockPrisma.usuario.update.mockResolvedValue({});
      mockPrisma.historialPassword.create.mockResolvedValue({});
      mockPrisma.sesion.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.refreshHistorico.updateMany.mockResolvedValue({ count: 1 });

      await service.restablecerContrasena(7);

      const data = mockPrisma.usuario.update.mock.calls[0][0].data;
      expect(data.primer_inicio).toBe(true);
      await expect(bcrypt.compare('EMSE2026.', data.contrasena)).resolves.toBe(
        true,
      );
      await expect(bcrypt.compare('EMSE2026', data.contrasena)).resolves.toBe(
        false,
      );
      expect(mockPrisma.sesion.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id_usuario: 7, activa: true },
        }),
      );
      expect(mockPrisma.refreshHistorico.updateMany).toHaveBeenCalled();
      expect(mockAutenticacion.limpiarIntentosUsuario).toHaveBeenCalledWith(
        '100007',
      );
    });
  });
});
