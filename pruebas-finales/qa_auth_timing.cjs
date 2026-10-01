/*
 * Compara tiempos de credenciales invalidas sin revelar identificadores.
 * No crea sesiones, OTP ni registros de acceso: ambas ramas fallan antes.
 */

const { Client } = require('../backend/node_modules/pg');

const BASE_URL = process.env.QA_BASE_URL || 'http://127.0.0.1:3001';
const MUESTRAS = 5;

function percentil(valores, p) {
  const ordenados = [...valores].sort((a, b) => a - b);
  return ordenados[Math.max(0, Math.ceil((p / 100) * ordenados.length) - 1)];
}

function resumen(valores, estados) {
  return {
    muestras: valores.length,
    promedio_ms: Math.round((valores.reduce((a, b) => a + b, 0) / valores.length) * 100) / 100,
    mediana_ms: Math.round(percentil(valores, 50) * 100) / 100,
    p95_ms: Math.round(percentil(valores, 95) * 100) / 100,
    minimo_ms: Math.round(Math.min(...valores) * 100) / 100,
    maximo_ms: Math.round(Math.max(...valores) * 100) / 100,
    estados_http: estados,
  };
}

async function intento(ci) {
  const inicio = performance.now();
  const respuesta = await fetch(`${BASE_URL}/autenticacion/iniciar-sesion`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ci, contrasena: `Incorrecta-QA-${Date.now()}-${Math.random()}` }),
    signal: AbortSignal.timeout(10_000),
  });
  await respuesta.arrayBuffer();
  return { status: respuesta.status, ms: performance.now() - inicio };
}

async function main() {
  const cliente = new Client({ connectionString: process.env.DATABASE_URL });
  await cliente.connect();
  let ciExistente;
  try {
    await cliente.query('BEGIN TRANSACTION READ ONLY');
    const candidato = await cliente.query(
      'SELECT ci FROM "Usuario" WHERE habilitado ORDER BY id_usuario LIMIT 1',
    );
    ciExistente = candidato.rows[0]?.ci;
    await cliente.query('ROLLBACK');
  } finally {
    await cliente.end();
  }
  if (!ciExistente) throw new Error('No existe un usuario habilitado para la comparacion.');

  const existente = [];
  const inexistente = [];
  const estadosExistente = {};
  const estadosInexistente = {};
  for (let i = 0; i < MUESTRAS; i += 1) {
    const a = await intento(ciExistente);
    existente.push(a.ms);
    estadosExistente[a.status] = (estadosExistente[a.status] || 0) + 1;

    const b = await intento(`99998${String(Date.now() + i).slice(-8)}`);
    inexistente.push(b.ms);
    estadosInexistente[b.status] = (estadosInexistente[b.status] || 0) + 1;
  }

  const real = resumen(existente, estadosExistente);
  const noExiste = resumen(inexistente, estadosInexistente);
  process.stdout.write(
    `${JSON.stringify(
      {
        fecha_utc: new Date().toISOString(),
        usuario_real_clave_incorrecta: real,
        usuario_inexistente: noExiste,
        razon_promedios: Math.round((noExiste.promedio_ms / real.promedio_ms) * 100) / 100,
        nota: 'No se imprimieron identificadores ni contrasenas.',
      },
      null,
      2,
    )}\n`,
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
