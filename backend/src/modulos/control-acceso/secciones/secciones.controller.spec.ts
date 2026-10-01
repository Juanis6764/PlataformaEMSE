import { Test, TestingModule } from '@nestjs/testing';
import { SeccionesController } from './secciones.controller';
import { SeccionesService } from './secciones.service';
import { JwtAuthGuard } from '../../../comun/guards/jwt-auth.guard';
import { PermisosGuard } from '../../../comun/guards/permisos.guard';

const mockSeccionesService = {
  listarSecciones: jest.fn().mockResolvedValue([]),
  listarJerarquia: jest.fn().mockResolvedValue([]),
  obtenerSeccion: jest
    .fn()
    .mockResolvedValue({ id_seccion: 1, nombre: 'BATALLÓN' }),
  crearSeccion: jest.fn().mockResolvedValue({ id_seccion: 2 }),
  actualizarSeccion: jest.fn().mockResolvedValue({ id_seccion: 2 }),
  eliminarSeccion: jest
    .fn()
    .mockResolvedValue({ id_seccion: 2, estado: false }),
};

describe('SeccionesController', () => {
  let controller: SeccionesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SeccionesController],
      providers: [
        { provide: SeccionesService, useValue: mockSeccionesService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermisosGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<SeccionesController>(SeccionesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('listarSecciones debe retornar un array', async () => {
    const result = await controller.listarSecciones();
    expect(Array.isArray(result)).toBe(true);
  });
});
