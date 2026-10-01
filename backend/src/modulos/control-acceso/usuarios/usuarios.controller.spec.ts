import { Test, TestingModule } from '@nestjs/testing';
import { UsuariosController } from './usuarios.controller';
import { UsuariosService } from './usuarios.service';
import { JwtAuthGuard } from '../../../comun/guards/jwt-auth.guard';
import { PermisosGuard } from '../../../comun/guards/permisos.guard';
import { PresenciaService } from '../presencia/presencia.service';

const mockUsuariosService = {
  listarUsuarios: jest.fn().mockResolvedValue({ data: [], meta: { total: 0 } }),
  obtenerUsuario: jest.fn().mockResolvedValue({ id_usuario: 1, ci: '100001' }),
  crearUsuario: jest.fn().mockResolvedValue({ id_usuario: 2 }),
  actualizarUsuario: jest.fn().mockResolvedValue({ id_usuario: 2 }),
  cambiarEstado: jest
    .fn()
    .mockResolvedValue({ id_usuario: 2, estado: 'INACTIVO' }),
  cambiarRol: jest.fn().mockResolvedValue({ id_usuario: 2 }),
  cambiarSeccion: jest.fn().mockResolvedValue({ id_usuario: 2 }),
  restablecerContrasena: jest
    .fn()
    .mockResolvedValue({ mensaje: 'Restablecida' }),
};

describe('UsuariosController', () => {
  let controller: UsuariosController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsuariosController],
      providers: [
        { provide: UsuariosService, useValue: mockUsuariosService },
        {
          provide: PresenciaService,
          useValue: { obtenerEstados: jest.fn().mockReturnValue([]) },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermisosGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<UsuariosController>(UsuariosController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('listarUsuarios debe retornar estructura meta', async () => {
    const result = await controller.listarUsuarios({} as any);
    expect(result).toHaveProperty('meta');
  });
});
