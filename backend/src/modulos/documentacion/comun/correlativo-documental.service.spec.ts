import { AmbitoCorrelativoDocumental, TipoDocumento } from '@prisma/client';
import { CorrelativoDocumentalService } from './correlativo-documental.service';

describe('CorrelativoDocumentalService', () => {
  function crearClienteMock(numero: number) {
    return {
      $queryRaw: jest.fn().mockResolvedValue([{ ultimo_numero: numero }]),
    } as any;
  }

  it('siguienteNumero devuelve el ultimo_numero del UPSERT atómico', async () => {
    const servicio = new CorrelativoDocumentalService();
    const tx = crearClienteMock(5);

    const numero = await servicio.siguienteNumero(
      tx,
      AmbitoCorrelativoDocumental.HOJA_RUTA,
      2026,
    );

    expect(numero).toBe(5);
    expect(tx.$queryRaw).toHaveBeenCalledTimes(1);
  });

  it.each([
    [TipoDocumento.RADIOGRAMA, 'RAD'],
    [TipoDocumento.MEMORANDUM, 'MEM'],
    [TipoDocumento.OFICIO, 'OFI'],
    [TipoDocumento.NOTA_SERVICIO, 'NOT'],
    [TipoDocumento.INFORME, 'INF'],
    [TipoDocumento.DIRECTIVA, 'DIR'],
    [TipoDocumento.CIRCULAR, 'CIR'],
    [TipoDocumento.PARTE, 'PAR'],
  ])('genera el código interno con el prefijo correcto para %s', async (tipo, prefijo) => {
    const servicio = new CorrelativoDocumentalService();
    const tx = crearClienteMock(237);

    const codigo = await servicio.generarCodigoDocumento(tx, tipo, 2026);

    expect(codigo).toBe(`${prefijo}-2026-000237`);
  });

  it('genera el número de hoja de ruta con el prefijo HR y relleno de ceros', async () => {
    const servicio = new CorrelativoDocumentalService();
    const tx = crearClienteMock(1);

    const numero = await servicio.generarNumeroHojaRuta(tx, 2026);

    expect(numero).toBe('HR-2026-000001');
  });
});
