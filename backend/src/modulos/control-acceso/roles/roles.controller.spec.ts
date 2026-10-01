import { Test, TestingModule } from '@nestjs/testing';
import { RolesController } from './roles.controller';
import { RolesService } from './roles.service';
import { JwtAuthGuard } from '../../../comun/guards/jwt-auth.guard';
import { PermisosGuard } from '../../../comun/guards/permisos.guard';

const mockRolesService = {
  listarRoles: jest.fn().mockResolvedValue([]),
  obtenerRol: jest.fn().mockResolvedValue({ id_rol: 1, nombre: 'ADMIN' }),
  crearRol: jest.fn().mockResolvedValue({ id_rol: 2, nombre: 'TEST' }),
  actualizarRol: jest.fn().mockResolvedValue({ id_rol: 2, nombre: 'TEST_MOD' }),
  eliminarRol: jest.fn().mockResolvedValue({ id_rol: 2, estado: false }),
  asignarPermisos: jest.fn().mockResolvedValue({ id_rol: 2 }),
};

describe('RolesController', () => {
  let controller: RolesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RolesController],
      providers: [{ provide: RolesService, useValue: mockRolesService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermisosGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<RolesController>(RolesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('listarRoles debe retornar un array', async () => {
    const result = await controller.listarRoles();
    expect(Array.isArray(result)).toBe(true);
  });
});
