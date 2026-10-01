import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ModificarResultadoFinalDisciplinaDto } from './consulta-disciplina.dto';

describe('ModificarResultadoFinalDisciplinaDto', () => {
  it.each(['101', '-5', 'texto', 'NaN', '80.00001'])(
    'rechaza una nota inválida: %s',
    async (nota) => {
      const dto = plainToInstance(ModificarResultadoFinalDisciplinaDto, {
        nota_final: nota,
        justificacion: 'Resolución autorizada',
      });
      expect(await validate(dto)).not.toHaveLength(0);
    },
  );

  it('rechaza una justificación vacía o compuesta solo por espacios', async () => {
    const dto = plainToInstance(ModificarResultadoFinalDisciplinaDto, {
      nota_final: '85.0000',
      justificacion: '   ',
    });
    expect(await validate(dto)).not.toHaveLength(0);
  });

  it('acepta una nota válida con cuatro decimales y motivo', async () => {
    const dto = plainToInstance(ModificarResultadoFinalDisciplinaDto, {
      nota_final: '85.0000',
      justificacion: 'Resolución autorizada',
    });
    expect(await validate(dto)).toHaveLength(0);
  });
});
