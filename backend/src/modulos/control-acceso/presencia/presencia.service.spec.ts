import { PresenciaService } from './presencia.service';

describe('PresenciaService', () => {
  let servicio: PresenciaService;

  beforeEach(() => {
    servicio = new PresenciaService();
  });

  afterEach(() => servicio.onModuleDestroy());

  it('mantiene al usuario en línea mientras exista otra pestaña', () => {
    servicio.registrarConexion(7, 'pestana-1');
    servicio.registrarConexion(7, 'pestana-2');
    servicio.eliminarConexion(7, 'pestana-1');

    expect(servicio.estaEnLinea(7)).toBe(true);

    servicio.eliminarConexion(7, 'pestana-2');
    expect(servicio.estaEnLinea(7)).toBe(false);
  });

  it('elimina conexiones sin latido después del tiempo máximo', () => {
    const ahora = Date.now();
    jest.spyOn(Date, 'now').mockReturnValue(ahora);
    servicio.registrarConexion(8, 'conexion-caida');

    servicio.eliminarConexionesVencidas(
      ahora + PresenciaService.TIEMPO_MAXIMO_PRESENCIA_MS + 1,
    );

    expect(servicio.estaEnLinea(8)).toBe(false);
    jest.restoreAllMocks();
  });

  it('no considera conectado a un usuario sin conexión viva', () => {
    expect(servicio.estaEnLinea(9)).toBe(false);
  });
});
