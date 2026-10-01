import { Test, TestingModule } from '@nestjs/testing';
import { AutenticacionController } from './autenticacion.controller';
import { AutenticacionService } from './autenticacion.service';
import { JwtAuthGuard } from '../../../comun/guards/jwt-auth.guard';

const mockAutenticacionService = {
  iniciarSesion: jest.fn().mockResolvedValue({ mensaje: 'OTP enviado' }),
  verificarCodigo: jest
    .fn()
    .mockResolvedValue({ accessToken: 'tok', refreshToken: 'ref' }),
  refresh: jest
    .fn()
    .mockResolvedValue({ accessToken: 'tok2', refreshToken: 'ref2' }),
  logout: jest.fn().mockResolvedValue({ mensaje: 'Sesión cerrada' }),
  me: jest.fn().mockResolvedValue({ id_usuario: 1, ci: '100001' }),
  cambiarContrasena: jest
    .fn()
    .mockResolvedValue({ mensaje: 'Contraseña cambiada' }),
};

describe('AutenticacionController', () => {
  let controller: AutenticacionController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AutenticacionController],
      providers: [
        { provide: AutenticacionService, useValue: mockAutenticacionService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AutenticacionController>(AutenticacionController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
