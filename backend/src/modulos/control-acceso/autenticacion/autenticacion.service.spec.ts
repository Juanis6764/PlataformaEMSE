import { Test, TestingModule } from '@nestjs/testing';
import { AutenticacionService } from './autenticacion.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { CorreoService } from '../../correo/correo.service';

const mockPrisma = {
  usuario: { findUnique: jest.fn(), update: jest.fn() },
  codigoVerificacion: {
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  sesion: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  refreshHistorico: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  logAcceso: { create: jest.fn() },
  historialPassword: { findMany: jest.fn(), create: jest.fn() },
  $transaction: jest.fn((ops) =>
    Array.isArray(ops) ? Promise.all(ops) : ops(mockPrisma),
  ),
};

const mockJwtService = {
  signAsync: jest.fn().mockResolvedValue('fake_token'),
  verifyAsync: jest.fn().mockResolvedValue({ sub: 1, sid: 1 }),
};

const mockCorreoService = {
  enviarCodigoIngreso: jest.fn().mockResolvedValue(undefined),
};

describe('AutenticacionService', () => {
  let service: AutenticacionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AutenticacionService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwtService },
        { provide: CorreoService, useValue: mockCorreoService },
      ],
    }).compile();

    service = module.get<AutenticacionService>(AutenticacionService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
