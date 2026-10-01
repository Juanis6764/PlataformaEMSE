const { Client } = require('pg');

const client = new Client({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'postgres',
  database: 'emse_db',
});

async function main() {
  await client.connect();

  // PI-03: Buscar documento con movimientos/trazabilidad
  console.log("=== PI-03: GESTIÓN DOCUMENTAL ===");
  const docRes = await client.query(`
    SELECT 
      d.id_documento, 
      d.asunto, 
      d.tipo_documento,
      d.codigo_interno,
      ed.estado_actual,
      COUNT(md.id_movimiento)::int AS total_movimientos
    FROM "Documento" d
    JOIN "ExpedienteDocumento" ed ON ed.id_documento = d.id_documento
    JOIN "MovimientoDocumento" md ON md.id_documento = d.id_documento
    GROUP BY d.id_documento, d.asunto, d.tipo_documento, d.codigo_interno, ed.estado_actual
    ORDER BY total_movimientos DESC
    LIMIT 5
  `);

  if (docRes.rows.length > 0) {
    console.log("Documentos con movimientos/trazabilidad:");
    docRes.rows.forEach((r, i) => {
      console.log(`  [${i+1}] id_documento=${r.id_documento}, tipo=${r.tipo_documento}, codigo=${r.codigo_interno}, estado=${r.estado_actual}, asunto="${r.asunto}", movimientos=${r.total_movimientos}`);
    });
  } else {
    console.log("No se encontraron documentos con movimientos.");
    // Verificar documentos existentes
    const docFallback = await client.query(`SELECT id_documento, asunto, tipo_documento, codigo_interno FROM "Documento" ORDER BY id_documento LIMIT 5`);
    if (docFallback.rows.length > 0) {
      console.log("Documentos existentes (sin movimientos):");
      docFallback.rows.forEach((r, i) => {
        console.log(`  [${i+1}] id_documento=${r.id_documento}, tipo=${r.tipo_documento}, codigo=${r.codigo_interno}, asunto="${r.asunto}"`);
      });
    } else {
      console.log("No existen documentos en la base de datos.");
    }

    // También revisar historial de estado como alternativa
    const histRes = await client.query(`
      SELECT d.id_documento, d.asunto, d.codigo_interno, COUNT(h.id_historial)::int AS total_historial
      FROM "Documento" d
      JOIN "HistorialEstadoDocumento" h ON h.id_documento = d.id_documento
      GROUP BY d.id_documento, d.asunto, d.codigo_interno
      ORDER BY total_historial DESC
      LIMIT 5
    `);
    if (histRes.rows.length > 0) {
      console.log("\nDocumentos con historial de estados:");
      histRes.rows.forEach((r, i) => {
        console.log(`  [${i+1}] id_documento=${r.id_documento}, codigo=${r.codigo_interno}, asunto="${r.asunto}", historial=${r.total_historial}`);
      });
    }
  }

  await client.end();
}

main().catch(e => { console.error(e); client.end(); });
