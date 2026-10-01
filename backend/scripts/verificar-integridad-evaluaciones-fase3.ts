import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PrismaService } from '../src/prisma/prisma.service';

const TABLAS_DISCIPLINA = [
  'ConfiguracionDisciplinaPeriodo',
  'OficialDisciplina',
  'CatalogoDisciplina',
  'SemanaDisciplina',
  'RegistroDisciplina',
  'Notificacion',
] as const;

const RESPALDO = join(
  process.cwd(),
  'backups',
  'emse-pre-reestructuracion-2026-08-12T01-42-32-274Z.json',
);

interface TablaRespaldo {
  columns: string[];
  rows: Array<Record<string, unknown>>;
  rowCount: number;
}

interface Respaldo {
  metadata: { database: string };
  tables: Record<string, TablaRespaldo>;
}

function normalizar(valor: unknown, columna?: string): unknown {
  if (valor instanceof Date) {
    // Las columnas PostgreSQL son timestamp sin zona. El respaldo conserva el
    // valor literal de Bolivia con sufijo Z; el adaptador PG lo materializa en UTC.
    return new Date(valor.getTime() + 4 * 60 * 60 * 1000).toISOString();
  }
  if (typeof valor === 'bigint') return Number(valor);
  if (valor !== null && (columna === 'puntaje' || columna === 'puntaje_base')) {
    if (typeof valor === 'object') {
      const decimal = valor as { toFixed?: (decimales: number) => string };
      if (typeof decimal.toFixed === 'function') return decimal.toFixed(4);
    }
    if (typeof valor === 'string' || typeof valor === 'number') {
      return Number(valor).toFixed(4);
    }
  }
  if (Array.isArray(valor))
    return valor.map((elemento) => normalizar(elemento));
  if (valor && typeof valor === 'object') {
    const decimal = valor as {
      constructor?: { name?: string };
      toString(): string;
    };
    if (decimal.constructor?.name === 'Decimal') return decimal.toString();
    return Object.fromEntries(
      Object.entries(valor as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([clave, contenido]) => [clave, normalizar(contenido, clave)]),
    );
  }
  return valor;
}

function filasCanonicas(
  filas: Array<Record<string, unknown>>,
  columnas: string[],
) {
  return filas
    .map((fila) =>
      JSON.stringify(
        columnas.map((columna) => [
          columna,
          normalizar(fila[columna], columna),
        ]),
      ),
    )
    .sort();
}

function hashFilas(filas: Array<Record<string, unknown>>, columnas: string[]) {
  const canonicas = filasCanonicas(filas, columnas);
  return createHash('sha256').update(JSON.stringify(canonicas)).digest('hex');
}

async function verificar() {
  const prisma = new PrismaService();
  await prisma.$connect();
  try {
    const base = new URL(process.env.DATABASE_URL ?? '').pathname.slice(1);
    if (base !== 'emse_db')
      throw new Error(`Se esperaba emse_db y se recibió ${base}.`);

    const respaldo = JSON.parse(readFileSync(RESPALDO, 'utf8')) as Respaldo;
    if (respaldo.metadata.database !== base) {
      throw new Error('El respaldo no corresponde a la base operativa actual.');
    }

    const integridad: Record<string, unknown> = {};
    let disciplinaIntacta = true;
    for (const tabla of TABLAS_DISCIPLINA) {
      const esperado = respaldo.tables[tabla];
      const actual = await prisma.$queryRawUnsafe<
        Array<Record<string, unknown>>
      >(`SELECT * FROM "${tabla}"`);
      const hashEsperado = hashFilas(esperado.rows, esperado.columns);
      const hashActual = hashFilas(actual, esperado.columns);
      const intacta =
        esperado.rowCount === actual.length && hashEsperado === hashActual;
      const esperadasCanonicas = filasCanonicas(
        esperado.rows,
        esperado.columns,
      );
      const actualesCanonicas = filasCanonicas(actual, esperado.columns);
      integridad[tabla] = {
        esperado: esperado.rowCount,
        actual: actual.length,
        sha256_esperado: hashEsperado,
        sha256_actual: hashActual,
        intacta,
        ...(intacta
          ? {}
          : {
              primera_fila_faltante: esperadasCanonicas.find(
                (fila) => !actualesCanonicas.includes(fila),
              ),
              primera_fila_inesperada: actualesCanonicas.find(
                (fila) => !esperadasCanonicas.includes(fila),
              ),
            }),
      };
      disciplinaIntacta &&= intacta;
    }

    const [cadetes, configuraciones, materias, notas] = await Promise.all([
      prisma.cadete.count(),
      prisma.configuracionEvaluacionesPeriodo.count(),
      prisma.materiaEvaluacion.count(),
      prisma.notaEvaluacion.count(),
    ]);
    if (configuraciones + materias + notas !== 0) {
      throw new Error('Las tablas operativas de Evaluaciones no están vacías.');
    }

    console.log(
      JSON.stringify(
        {
          base,
          cadetes,
          disciplina: integridad,
          evaluaciones: {
            ConfiguracionEvaluacionesPeriodo: configuraciones,
            MateriaEvaluacion: materias,
            NotaEvaluacion: notas,
          },
        },
        null,
        2,
      ),
    );
    if (!disciplinaIntacta) {
      throw new Error('Una o más tablas de Disciplina difieren del respaldo.');
    }
  } finally {
    await prisma.$disconnect();
  }
}

void verificar();
