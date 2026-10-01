import { Prisma } from '@prisma/client';
import { NotificacionesService } from '../../notificaciones/notificaciones.service';
import { NotificacionesNotasService } from './notificaciones-notas.service';

describe('NotificacionesNotasService - resultados para Evaluaciones', () => {
  const internas = { crearMuchasUnicas: jest.fn() };
  const servicio = new NotificacionesNotasService(
    internas as unknown as NotificacionesService,
  );
  const cliente = {} as Prisma.TransactionClient;

  beforeEach(() => {
    jest.clearAllMocks();
    internas.crearMuchasUnicas.mockResolvedValue({ count: 1 });
  });

  it('dirige Disciplina a Resultados recibidos con la selección exacta', async () => {
    await servicio.crearEventoResultadoFinal(
      {
        id_configuracion: 31,
        id_gestion: 7,
        id_periodo: 11,
        id_curso: 3,
        id_emisor: 8,
        destinatarios: [41, 41],
        gestion: 2026,
        periodo: 'I',
        curso: 'PRIMER_ANO',
      },
      cliente,
    );

    expect(internas.crearMuchasUnicas).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          id_usuario_destinatario: 41,
          tipo: 'NOTAS_FINALES_DISCIPLINA',
          ruta_destino:
            '/modulos/notas/evaluaciones/consulta?vista=resultados-recibidos&id_gestion=7&id_periodo=11&id_curso=3',
          clave_evento: 'DISCIPLINA:RESULTADO_FINAL:11:3:41',
        }),
      ],
      cliente,
    );
  });

  it('dirige Entrenamiento Físico a la misma vista y conserva su clave versionada', async () => {
    await servicio.crearEventoResultadoEntrenamientoFisico(
      {
        id_planilla: 22,
        version_flujo: 4,
        id_emisor: 9,
        id_destinatario: 41,
        id_gestion: 7,
        id_periodo: 11,
        id_curso: 3,
        gestion: 2026,
        periodo: 'I',
        curso: 'PRIMER_ANO',
      },
      cliente,
    );

    expect(internas.crearMuchasUnicas).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          id_usuario_destinatario: 41,
          tipo: 'NOTAS_FINALES_ENTRENAMIENTO_FISICO',
          ruta_destino:
            '/modulos/notas/evaluaciones/consulta?vista=resultados-recibidos&id_gestion=7&id_periodo=11&id_curso=3',
          clave_evento: 'ENTRENAMIENTO_FISICO:RESULTADO_FINAL:22:4:41',
        }),
      ],
      cliente,
    );
  });
});
