import { PlazosSchedulerService } from './plazos-scheduler.service';

describe('PlazosSchedulerService - plazo activo verificable', () => {
  const servicio = new PlazosSchedulerService(
    {} as any,
    {} as any,
    {} as any,
  );

  const plazo = (
    seccionResponsable: number,
    seccionActual: number,
    estadoActual = 'EN_TRAMITE',
  ) => ({
    id_seccion_responsable: seccionResponsable,
    proveido: {
      hoja_ruta: {
        expediente: {
          id_seccion_actual: seccionActual,
          estado_actual: estadoActual,
        },
      },
    },
  });

  it('solo considera activo el plazo de la sección que tiene actualmente el expediente', () => {
    expect((servicio as any).esPlazoActivo(plazo(7, 7))).toBe(true);
    expect((servicio as any).esPlazoActivo(plazo(7, 8))).toBe(false);
  });

  it('no vuelve a alertar plazos históricos de expedientes finalizados o archivados', () => {
    expect((servicio as any).esPlazoActivo(plazo(7, 7, 'FINALIZADO'))).toBe(
      false,
    );
    expect((servicio as any).esPlazoActivo(plazo(7, 7, 'ARCHIVADO'))).toBe(
      false,
    );
  });
});
