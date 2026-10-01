/*
 * Generador externo de carga/estres para EMSE basado en GET.
 * No instala dependencias y no modifica datos.
 *
 * Modos:
 *   node pruebas-finales/qa_load.cjs load
 *   node pruebas-finales/qa_load.cjs stress
 *
 * Variables opcionales:
 *   QA_BASE_URL=http://127.0.0.1:3001
 *   QA_BEARER_TOKEN=<token existente; nunca se imprime>
 */

const BASE_URL = process.env.QA_BASE_URL || 'http://127.0.0.1:3001';
const TOKEN = process.env.QA_BEARER_TOKEN || '';
const MODO = ['load', 'stress', 'recovery'].includes(process.argv[2])
  ? process.argv[2]
  : 'load';
const NIVELES =
  MODO === 'stress'
    ? [50, 100, 150, 200, 250, 300, 400]
    : MODO === 'recovery'
      ? [10]
      : [10, 25, 50, 100, 200, 300];
const ITERACIONES = MODO === 'stress' ? 2 : 3;
const RUTAS = TOKEN
  ? ['/autenticacion/me', '/documentacion/documentos', '/notificaciones?pagina=1&limite=5']
  : ['/'];

function percentil(valores, p) {
  if (valores.length === 0) return 0;
  const ordenados = [...valores].sort((a, b) => a - b);
  const indice = Math.ceil((p / 100) * ordenados.length) - 1;
  return ordenados[Math.max(0, Math.min(indice, ordenados.length - 1))];
}

function r2(n) {
  return Math.round(n * 100) / 100;
}

async function peticion(indice) {
  const ruta = RUTAS[indice % RUTAS.length];
  const inicio = performance.now();
  try {
    const respuesta = await fetch(`${BASE_URL}${ruta}`, {
      headers: TOKEN ? { Authorization: `Bearer ${TOKEN}` } : undefined,
      signal: AbortSignal.timeout(10_000),
    });
    await respuesta.arrayBuffer();
    return { ms: performance.now() - inicio, ok: respuesta.ok, status: respuesta.status };
  } catch (error) {
    return {
      ms: performance.now() - inicio,
      ok: false,
      status: 0,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function nivel(concurrencia) {
  const total = concurrencia * ITERACIONES;
  const inicio = performance.now();
  const resultados = [];

  for (let iteracion = 0; iteracion < ITERACIONES; iteracion += 1) {
    const lote = await Promise.all(
      Array.from({ length: concurrencia }, (_, i) =>
        peticion(iteracion * concurrencia + i),
      ),
    );
    resultados.push(...lote);
  }

  const duracionMs = performance.now() - inicio;
  const tiempos = resultados.map((r) => r.ms);
  const exitosas = resultados.filter((r) => r.ok).length;
  const fallidas = total - exitosas;
  const estados = {};
  for (const r of resultados) estados[r.status] = (estados[r.status] || 0) + 1;

  return {
    usuarios_concurrentes: concurrencia,
    iteraciones_por_usuario: ITERACIONES,
    solicitudes: total,
    exitosas,
    fallidas,
    error_porcentaje: r2((fallidas / total) * 100),
    promedio_ms: r2(tiempos.reduce((a, b) => a + b, 0) / tiempos.length),
    mediana_ms: r2(percentil(tiempos, 50)),
    p90_ms: r2(percentil(tiempos, 90)),
    p95_ms: r2(percentil(tiempos, 95)),
    maximo_ms: r2(Math.max(...tiempos)),
    throughput_rps: r2(total / (duracionMs / 1000)),
    duracion_ms: r2(duracionMs),
    estados_http: estados,
  };
}

async function main() {
  const resultados = [];
  for (const concurrencia of NIVELES) {
    const r = await nivel(concurrencia);
    resultados.push(r);
    process.stderr.write(
      `[${MODO}] ${concurrencia} concurrentes: ${r.exitosas}/${r.solicitudes} exitosas, p95=${r.p95_ms} ms, error=${r.error_porcentaje}%\n`,
    );
    if (r.error_porcentaje >= 10) {
      process.stderr.write('Detencion segura: el porcentaje de error alcanzo el umbral del 10%.\n');
      break;
    }
  }

  process.stdout.write(
    `${JSON.stringify(
      {
        fecha_utc: new Date().toISOString(),
        modo: MODO,
        base_url: BASE_URL,
        autenticado: Boolean(TOKEN),
        rutas: RUTAS,
        metodologia: `${ITERACIONES} iteraciones por usuario virtual, lotes simultaneos por nivel`,
        resultados,
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
