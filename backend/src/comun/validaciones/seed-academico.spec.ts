import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('seed académico', () => {
  const seed = readFileSync(
    resolve(process.cwd(), 'prisma', 'seed', 'seed.ts'),
    'utf8',
  );

  it('no crea ni reconstruye HistorialCursoCadete', () => {
    expect(seed).not.toMatch(
      /historialCursoCadete\.(create|createMany|upsert)\s*\(/,
    );
  });

  it('garantiza I y II únicamente para la gestión actual del seed', () => {
    expect(seed).toContain('prisma.periodoLectivo.upsert');
    expect(seed).toContain("for (const periodo of ['I', 'II'] as const)");
    expect(seed).toContain('where: { ano: GESTION_ACTUAL.ano }');
  });
});
