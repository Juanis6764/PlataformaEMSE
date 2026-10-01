import { Test, TestingModule } from '@nestjs/testing';
import { PermisosController } from './permisos.controller';
import { PermisosService } from './permisos.service';
import { JwtAuthGuard } from '../../../comun/guards/jwt-auth.guard';
import { PermisosGuard } from '../../../comun/guards/permisos.guard';

const mockPermisosService = {
  listarPermisos: jest.fn().mockResolvedValue([]),
  obtenerPermiso: jest
    .fn()
    .mockResolvedValue({ id_permiso: 1, nombre: 'GESTIONAR_ROLES' }),
  crearPermiso: jest.fn().mockResolvedValue({ id_permiso: 2 }),
  actualizarPermiso: jest.fn().mockResolvedValue({ id_permiso: 2 }),
  eliminarPermiso: jest
    .fn()
    .mockResolvedValue({ id_permiso: 2, estado: false }),
};

describe('PermisosController', () => {
  let controller: PermisosController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PermisosController],
      providers: [{ provide: PermisosService, useValue: mockPermisosService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermisosGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<PermisosController>(PermisosController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('listarPermisos debe retornar un array', async () => {
    const result = await controller.listarPermisos();
    expect(Array.isArray(result)).toBe(true);
  });
});
