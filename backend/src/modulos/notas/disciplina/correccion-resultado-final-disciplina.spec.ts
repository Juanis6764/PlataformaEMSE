/* eslint-disable @typescript-eslint/no-explicit-any */
import { Prisma } from '@prisma/client';
import { ResultadosFinalesDisciplinaService } from './resultados-finales-disciplina.service';

describe('Resultado final de Disciplina - corrección extraordinaria', () => {
  it('actualiza la fuente oficial, audita contexto y solicita recálculo', async () => {
    const actual = {
      id_resultado: 21,
      id_cadete: 7,
      id_periodo: 3,
      id_curso: 1,
      nota_final_disciplina: new Prisma.Decimal(80),
      cadete: { usuario: { nombres: 'Ana', apellidos: 'Pérez' } },
      periodo: {
        id_gestion: 1,
        periodo: 'I',
        gestion: { ano: 2026 },
      },
      curso: { nombre: 'PRIMER_AÑO' },
    };
    const tx = {
      resultadoFinalDisciplina: {
        update: jest.fn().mockResolvedValue({
          ...actual,
          nota_final_disciplina: new Prisma.Decimal(90),
        }),
      },
    };
    const prisma = {
      resultadoFinalDisciplina: { findUnique: jest.fn().mockResolvedValue(actual) },
      $transaction: jest.fn(async (operacion: (cliente: typeof tx) => unknown) =>
        operacion(tx),
      ),
    };
    const perfil = {
      tipo: 'COMANDO',
      permisos: new Set(['MODIFICAR_NOTA_BLOQUEADA']),
    };
    const validaciones = {
      validarAccesoCurso: jest.fn().mockResolvedValue(perfil),
      exigirTipo: jest.fn(),
      exigirPermiso: jest.fn(),
    };
    const auditoria = { registrar: jest.fn().mockResolvedValue({}) };
    const matrices = { recalcularPorCorreccion: jest.fn().mockResolvedValue({}) };
    const servicio = new ResultadosFinalesDisciplinaService(
      prisma as any,
      validaciones as any,
      {} as any,
      auditoria as any,
      {} as any,
      matrices as any,
    );

    const resultado = await servicio.modificarExtraordinariamente(8, 21, {
      nota_final: '90.0000',
      justificacion: 'Resolución de Comando verificada',
    });

    expect(resultado.nota_final_disciplina).toBe('90.0000');
    expect(auditoria.registrar).toHaveBeenCalledWith(
      expect.objectContaining({
        entidad: 'ResultadoFinalDisciplina',
        datos_antes: { nota_final_disciplina: '80.0000' },
        datos_despues: expect.objectContaining({
          nota_final_disciplina: '90.0000',
          rol: 'COMANDO',
          id_cadete: 7,
          gestion: 2026,
          periodo: 'I',
          area: 'DISCIPLINA',
          justificacion: 'Resolución de Comando verificada',
        }),
      }),
      tx,
    );
    expect(matrices.recalcularPorCorreccion).toHaveBeenCalledWith(
      3,
      1,
      8,
      'Resolución de Comando verificada',
    );
  });
});
