/*
 * Sonda externa de QA para EMSE.
 * - Solo ejecuta SELECT dentro de una transaccion READ ONLY.
 * - Solo invoca endpoints HTTP GET, salvo los dos intentos negativos de login.
 * - Nunca imprime tokens, secretos, correos, CI ni nombres personales.
 *
 * Ejecutar desde la raiz:
 *   node --env-file=backend/.env pruebas-finales/qa_readonly.cjs
 */

const { Client } = require('../backend/node_modules/pg');

const BASE_URL = process.env.QA_BASE_URL || 'http://127.0.0.1:3001';

function redondear(ms) {
  return Math.round(ms * 100) / 100;
}

async function solicitar(path, options = {}) {
  const inicio = performance.now();
  try {
    const respuesta = await fetch(`${BASE_URL}${path}`, {
      signal: AbortSignal.timeout(10_000),
      ...options,
    });
    const texto = await respuesta.text();
    let cuerpo;
    try {
      cuerpo = JSON.parse(texto);
    } catch {
      cuerpo = texto.slice(0, 300);
    }
    return {
      path,
      status: respuesta.status,
      ms: redondear(performance.now() - inicio),
      cuerpo,
    };
  } catch (error) {
    return {
      path,
      status: 0,
      ms: redondear(performance.now() - inicio),
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function resumenHttp(resultado) {
  const mensaje =
    resultado.cuerpo && typeof resultado.cuerpo === 'object'
      ? resultado.cuerpo.message || resultado.cuerpo.mensaje
      : resultado.cuerpo;
  return {
    path: resultado.path,
    status: resultado.status,
    ms: resultado.ms,
    mensaje: typeof mensaje === 'string' ? mensaje.slice(0, 180) : undefined,
    tipo_respuesta: Array.isArray(resultado.cuerpo)
      ? 'array'
      : resultado.cuerpo === null
        ? 'null'
        : typeof resultado.cuerpo,
    error: resultado.error,
  };
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL no esta disponible.');
  }

  const cliente = new Client({ connectionString: process.env.DATABASE_URL });
  await cliente.connect();

  let evidenciaDb;
  let sesiones = [];
  let ciExistente;
  try {
    await cliente.query('BEGIN TRANSACTION READ ONLY');

    const conexion = await cliente.query(`
      SELECT current_database() AS base,
             current_user AS usuario,
             current_setting('server_version') AS version,
             pg_is_in_recovery() AS en_recuperacion
    `);

    const restricciones = await cliente.query(`
      SELECT
        count(*) FILTER (WHERE contype = 'p')::int AS primarias,
        count(*) FILTER (WHERE contype = 'f')::int AS foraneas,
        count(*) FILTER (WHERE contype = 'u')::int AS unicas,
        count(*) FILTER (WHERE contype = 'c')::int AS checks,
        count(*) FILTER (WHERE NOT convalidated)::int AS no_validadas
      FROM pg_constraint
      WHERE connamespace = 'public'::regnamespace
    `);

    const indices = await cliente.query(`
      SELECT
        count(*) FILTER (WHERE i.indisunique)::int AS indices_unicos,
        count(*) FILTER (WHERE i.indisprimary)::int AS indices_primarios,
        count(*) FILTER (WHERE i.indisvalid = false)::int AS indices_invalidos
      FROM pg_index i
      JOIN pg_class c ON c.oid = i.indexrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
    `);

    const conteos = await cliente.query(`
      SELECT
        (SELECT count(*)::int FROM "Usuario") AS usuarios,
        (SELECT count(*)::int FROM "Usuario" WHERE habilitado) AS usuarios_habilitados,
        (SELECT count(*)::int FROM "Cadete") AS cadetes,
        (SELECT count(*)::int FROM "Rol") AS roles,
        (SELECT count(*)::int FROM "Permiso") AS permisos,
        (SELECT count(*)::int FROM "Seccion") AS secciones,
        (SELECT count(*)::int FROM "Documento") AS documentos,
        (SELECT count(*)::int FROM "ExpedienteDocumento") AS expedientes,
        (SELECT count(*)::int FROM "HistorialEstadoDocumento") AS historiales_documentales,
        (SELECT count(*)::int FROM "Notificacion") AS notificaciones,
        (SELECT count(*)::int FROM "GestionAcademica") AS gestiones,
        (SELECT count(*)::int FROM "PeriodoLectivo") AS periodos,
        (SELECT count(*)::int FROM "SemanaDisciplina") AS semanas_disciplina,
        (SELECT count(*)::int FROM "RegistroDisciplina") AS registros_disciplina,
        (SELECT count(*)::int FROM "MateriaEvaluacion") AS materias_evaluacion,
        (SELECT count(*)::int FROM "NotaEvaluacion") AS notas_evaluacion
    `);

    const integridad = await cliente.query(`
      SELECT
        (SELECT count(*)::int FROM "Usuario" u LEFT JOIN "Rol" r ON r.id_rol = u.id_rol WHERE r.id_rol IS NULL) AS usuario_sin_rol,
        (SELECT count(*)::int FROM "Cadete" c LEFT JOIN "Usuario" u ON u.id_usuario = c.id_usuario WHERE u.id_usuario IS NULL) AS cadete_sin_usuario,
        (SELECT count(*)::int FROM "Cadete" c LEFT JOIN "Curso" cu ON cu.id_curso = c.id_curso WHERE c.id_curso IS NOT NULL AND cu.id_curso IS NULL) AS cadete_sin_curso,
        (SELECT count(*)::int FROM "ExpedienteDocumento" e LEFT JOIN "Documento" d ON d.id_documento = e.id_documento WHERE d.id_documento IS NULL) AS expediente_sin_documento,
        (SELECT count(*)::int FROM "MovimientoDocumento" m LEFT JOIN "ExpedienteDocumento" e ON e.id_documento = m.id_documento WHERE e.id_documento IS NULL) AS movimiento_sin_expediente,
        (SELECT count(*)::int FROM "HistorialEstadoDocumento" h LEFT JOIN "ExpedienteDocumento" e ON e.id_documento = h.id_documento WHERE e.id_documento IS NULL) AS historial_sin_expediente,
        (SELECT count(*)::int FROM "NotaEvaluacion" n LEFT JOIN "MateriaEvaluacion" m ON m.id_materia = n.id_materia WHERE m.id_materia IS NULL) AS nota_sin_materia,
        (SELECT count(*)::int FROM "RegistroDisciplina" rd LEFT JOIN "SemanaDisciplina" s ON s.id_semana = rd.id_semana WHERE s.id_semana IS NULL) AS registro_sin_semana
    `);

    const duplicados = await cliente.query(`
      SELECT
        (SELECT count(*)::int FROM (SELECT ci FROM "Usuario" GROUP BY ci HAVING count(*) > 1) x) AS ci_usuario,
        (SELECT count(*)::int FROM (SELECT nombre FROM "Rol" GROUP BY nombre HAVING count(*) > 1) x) AS nombre_rol,
        (SELECT count(*)::int FROM (SELECT nombre FROM "Permiso" GROUP BY nombre HAVING count(*) > 1) x) AS nombre_permiso,
        (SELECT count(*)::int FROM (SELECT codigo_interno FROM "Documento" GROUP BY codigo_interno HAVING count(*) > 1) x) AS codigo_documento,
        (SELECT count(*)::int FROM (SELECT numero FROM "HojaRuta" GROUP BY numero HAVING count(*) > 1) x) AS numero_hoja_ruta,
        (SELECT count(*)::int FROM (SELECT id_materia, id_cadete FROM "NotaEvaluacion" GROUP BY id_materia, id_cadete HAVING count(*) > 1) x) AS nota_materia_cadete
    `);

    const porRol = await cliente.query(`
      SELECT r.nombre AS rol, count(*)::int AS cantidad
      FROM "Usuario" u
      JOIN "Rol" r ON r.id_rol = u.id_rol
      GROUP BY r.nombre
      ORDER BY r.nombre
    `);

    const estadosDocumentales = await cliente.query(`
      SELECT estado_actual::text AS estado, count(*)::int AS cantidad
      FROM "ExpedienteDocumento"
      GROUP BY estado_actual
      ORDER BY estado_actual::text
    `);

    const transicionesDocumentales = await cliente.query(`
      SELECT
        COALESCE(estado_anterior::text, 'INICIAL') AS estado_anterior,
        estado_nuevo::text AS estado_nuevo,
        count(*)::int AS cantidad
      FROM "HistorialEstadoDocumento"
      GROUP BY estado_anterior, estado_nuevo
      ORDER BY estado_anterior::text NULLS FIRST, estado_nuevo::text
    `);

    const candidatos = await cliente.query(`
      SELECT DISTINCT ON (r.nombre, COALESCE(se.nombre, 'SIN_SECCION'))
        s.id_sesion,
        s.token,
        u.id_usuario,
        u.ci,
        r.nombre AS rol,
        se.nombre AS seccion
      FROM "Sesion" s
      JOIN "Usuario" u ON u.id_usuario = s.id_usuario
      JOIN "Rol" r ON r.id_rol = u.id_rol
      LEFT JOIN "Seccion" se ON se.id_seccion = u.id_seccion
      WHERE s.activa
        AND s.fecha_expiracion > now()
        AND s.token <> ''
        AND u.habilitado
        AND NOT u.primer_inicio
      ORDER BY r.nombre, COALESCE(se.nombre, 'SIN_SECCION'), s.fecha_inicio DESC
      LIMIT 12
    `);
    sesiones = candidatos.rows;

    const usuarioParaNegativo = await cliente.query(`
      SELECT ci FROM "Usuario" WHERE habilitado ORDER BY id_usuario LIMIT 1
    `);
    ciExistente = usuarioParaNegativo.rows[0]?.ci;

    evidenciaDb = {
      conexion: conexion.rows[0],
      restricciones: restricciones.rows[0],
      indices: indices.rows[0],
      conteos: conteos.rows[0],
      integridad_huerfanos: integridad.rows[0],
      duplicados_bajo_restricciones: duplicados.rows[0],
      usuarios_por_rol: porRol.rows,
      estados_documentales: estadosDocumentales.rows,
      transiciones_documentales: transicionesDocumentales.rows,
      sesiones_aptas_para_prueba: sesiones.map((s) => ({
        id_sesion: s.id_sesion,
        id_usuario: s.id_usuario,
        rol: s.rol,
        seccion: s.seccion,
      })),
    };

    await cliente.query('ROLLBACK');
  } catch (error) {
    try {
      await cliente.query('ROLLBACK');
    } catch {}
    throw error;
  } finally {
    await cliente.end();
  }

  const pruebasPublicas = [];
  pruebasPublicas.push(await solicitar('/'));
  pruebasPublicas.push(await solicitar('/api/documentacion'));
  pruebasPublicas.push(await solicitar('/autenticacion/me'));
  pruebasPublicas.push(
    await solicitar('/autenticacion/me', {
      headers: { Authorization: 'Bearer token-invalido-qa' },
    }),
  );
  pruebasPublicas.push(await solicitar('/usuarios'));
  pruebasPublicas.push(await solicitar('/documentacion/documentos'));
  pruebasPublicas.push(await solicitar('/cadetes'));
  pruebasPublicas.push(await solicitar('/notas/evaluaciones/mis-notas'));

  const pruebasLoginNegativas = [];
  pruebasLoginNegativas.push(
    await solicitar('/autenticacion/iniciar-sesion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ci: `99999${String(Date.now()).slice(-8)}`,
        contrasena: 'Credencial-incorrecta-QA-2026',
      }),
    }),
  );
  if (ciExistente) {
    pruebasLoginNegativas.push(
      await solicitar('/autenticacion/iniciar-sesion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ci: ciExistente,
          contrasena: `Incorrecta-QA-${Date.now()}-${Math.random()}`,
        }),
      }),
    );
  }

  const rutasLectura = [
    '/autenticacion/me',
    '/usuarios?pagina=1&limite=5',
    '/cadetes?pagina=1&limite=5',
    '/documentacion/documentos',
    '/documentacion/movimientos/pendientes',
    '/notificaciones?pagina=1&limite=5',
    '/notas/disciplina/contexto',
    '/notas/evaluaciones/contexto',
    '/notas/evaluaciones/mis-notas',
    '/gestion-academica/periodo-activo',
  ];
  const pruebasAutenticadas = [];
  for (const sesion of sesiones) {
    const resultados = [];
    for (const ruta of rutasLectura) {
      const resultado = await solicitar(ruta, {
        headers: { Authorization: `Bearer ${sesion.token}` },
      });
      resultados.push(resumenHttp(resultado));
    }
    pruebasAutenticadas.push({
      actor: {
        id_sesion: sesion.id_sesion,
        id_usuario: sesion.id_usuario,
        rol: sesion.rol,
        seccion: sesion.seccion,
      },
      resultados,
    });
  }

  const salida = {
    fecha_utc: new Date().toISOString(),
    base_url: BASE_URL,
    base_datos: evidenciaDb,
    http_publico_y_sin_token: pruebasPublicas.map(resumenHttp),
    login_negativo: pruebasLoginNegativas.map(resumenHttp),
    http_con_sesiones_existentes: pruebasAutenticadas,
    observaciones: [
      'No se imprimieron tokens, CI, correos, nombres ni secretos.',
      'Las consultas SQL se ejecutaron dentro de BEGIN TRANSACTION READ ONLY y finalizaron con ROLLBACK.',
      'No se probo login exitoso: requiere credencial real y segundo factor OTP.',
    ],
  };

  process.stdout.write(`${JSON.stringify(salida, null, 2)}\n`);
}

main().catch((error) => {
  console.error(
    JSON.stringify(
      {
        fecha_utc: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error),
      },
      null,
      2,
    ),
  );
  process.exitCode = 1;
});
