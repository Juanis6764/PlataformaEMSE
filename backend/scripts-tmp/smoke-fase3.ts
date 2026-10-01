/* eslint-disable */
// Smoke test manual de FASE 3: recorre el flujo completo del workflow
// documental vía HTTP real contra el servidor de desarrollo (npm run
// start:dev, puerto 3001), usando permisos y guards reales (no overrides
// de prueba). Crea usuarios/sesiones temporales, ejecuta el flujo, y
// limpia todo al final. Se ejecuta con ts-node y se borra después.
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as jwt from 'jsonwebtoken';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });
const BASE = 'http://localhost:3001';
const JWT_SECRET = process.env.JWT_SECRET || 'clave_secreta_emse';

const CIS_PRUEBA = [
  'SMOKE-DOC-RADIO',
  'SMOKE-DOC-SECRETARIA',
  'SMOKE-DOC-COMANDO',
  'SMOKE-DOC-2COMANDO',
  'SMOKE-DOC-LOGISTICA',
];

type Actor = 'radio' | 'secretaria' | 'comando' | 'segundoComando' | 'logistica';

const tokens: Record<Actor, string> = {} as any;
const secciones: Record<string, number> = {};

let fallas = 0;
function assert(cond: boolean, mensaje: string) {
  if (!cond) {
    fallas++;
    console.error(`  ❌ ${mensaje}`);
  } else {
    console.log(`  ✅ ${mensaje}`);
  }
}

async function llamar(
  metodo: 'GET' | 'POST',
  ruta: string,
  actor: Actor,
  body?: unknown,
) {
  const respuesta = await fetch(`${BASE}${ruta}`, {
    method: metodo,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokens[actor]}`,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const texto = await respuesta.text();
  let datos: any = undefined;
  try {
    datos = texto ? JSON.parse(texto) : undefined;
  } catch {
    datos = texto;
  }
  return { status: respuesta.status, datos };
}

async function crearActor(ci: string, nombreSeccion: string): Promise<Actor> {
  const rol = await prisma.rol.findUniqueOrThrow({
    where: { nombre: 'ADMINISTRATIVO' },
  });
  const seccion = await prisma.seccion.findUniqueOrThrow({
    where: { nombre: nombreSeccion },
  });
  secciones[nombreSeccion] = seccion.id_seccion;

  const usuario = await prisma.usuario.create({
    data: {
      nombres: 'SMOKE-FASE3',
      apellidos: nombreSeccion,
      ci,
      contrasena: '$2b$10$smoketestplaceholderhashvalue1234567890abcdefghij', // no se usa: la sesión se crea directo
      estado: 'ACTIVO',
      habilitado: true,
      primer_inicio: false,
      id_rol: rol.id_rol,
      id_seccion: seccion.id_seccion,
    },
  });

  const sesion = await prisma.sesion.create({
    data: {
      id_usuario: usuario.id_usuario,
      token: '',
      fecha_expiracion: new Date(Date.now() + 60 * 60 * 1000),
      ip: '127.0.0.1',
      user_agent: 'smoke-fase3',
    },
  });

  const token = jwt.sign(
    {
      sub: usuario.id_usuario,
      ci: usuario.ci,
      rol: 'ADMINISTRATIVO',
      grupo_usuario: 'ADMINISTRATIVOS',
      seccion: nombreSeccion,
      sid: sesion.id_sesion,
    },
    JWT_SECRET,
    { expiresIn: '1h' },
  );

  const clave = {
    RADIO: 'radio',
    SECRETARIA_GENERAL: 'secretaria',
    COMANDO: 'comando',
    SEGUNDO_COMANDO: 'segundoComando',
    LOGISTICA: 'logistica',
  }[nombreSeccion] as Actor;
  tokens[clave] = token;
  return clave;
}

async function limpiar() {
  const usuarios = await prisma.usuario.findMany({
    where: { ci: { in: CIS_PRUEBA } },
    select: { id_usuario: true },
  });
  const ids = usuarios.map((u) => u.id_usuario);
  if (ids.length === 0) return;

  const documentos = await prisma.documento.findMany({
    where: { id_usuario_registro: { in: ids } },
    select: { id_documento: true },
  });
  const idsDoc = documentos.map((d) => d.id_documento);
  if (idsDoc.length > 0) {
    await prisma.notificacion.deleteMany({ where: { id_referencia: { in: idsDoc } } });
    await prisma.auditoriaAccion.deleteMany({ where: { id_entidad: { in: idsDoc } } });
    await prisma.archivoDocumento.deleteMany({ where: { id_documento: { in: idsDoc } } });
    await prisma.documentoRelacionado.deleteMany({
      where: { OR: [{ id_documento_origen: { in: idsDoc } }, { id_documento_relacionado: { in: idsDoc } }] },
    });
    await prisma.observacionDocumento.deleteMany({ where: { id_documento: { in: idsDoc } } });
    const hojasRuta = await prisma.hojaRuta.findMany({ where: { id_documento: { in: idsDoc } }, select: { id_hoja_ruta: true } });
    const idsHR = hojasRuta.map((h) => h.id_hoja_ruta);
    if (idsHR.length > 0) {
      const proveidos = await prisma.proveido.findMany({ where: { id_hoja_ruta: { in: idsHR } }, select: { id_proveido: true } });
      const idsProv = proveidos.map((p) => p.id_proveido);
      if (idsProv.length > 0) {
        await prisma.auditoriaAccion.deleteMany({ where: { id_entidad: { in: idsProv } } });
        await prisma.plazoDocumento.deleteMany({ where: { id_proveido: { in: idsProv } } });
        await prisma.proveido.deleteMany({ where: { id_hoja_ruta: { in: idsHR } } });
      }
      await prisma.auditoriaAccion.deleteMany({ where: { id_entidad: { in: idsHR } } });
      await prisma.hojaRuta.deleteMany({ where: { id_documento: { in: idsDoc } } });
    }
    await prisma.cumplimientoDocumento.deleteMany({ where: { id_documento: { in: idsDoc } } });
    await prisma.historialEstadoDocumento.deleteMany({ where: { id_documento: { in: idsDoc } } });
    await prisma.movimientoDocumento.deleteMany({ where: { id_documento: { in: idsDoc } } });
    await prisma.expedienteDocumento.deleteMany({ where: { id_documento: { in: idsDoc } } });
    await prisma.documento.deleteMany({ where: { id_documento: { in: idsDoc } } });
  }
  await prisma.auditoriaAccion.deleteMany({ where: { id_usuario: { in: ids } } });
  await prisma.notificacion.deleteMany({ where: { id_usuario_destinatario: { in: ids } } });
  await prisma.sesion.deleteMany({ where: { id_usuario: { in: ids } } });
  await prisma.usuario.deleteMany({ where: { id_usuario: { in: ids } } });
}

async function main() {
  console.log('🧹 Limpieza previa de datos de ejecuciones anteriores...');
  await limpiar();

  console.log('👤 Creando actores de prueba (usuarios + sesiones reales + JWT real)...');
  await crearActor('SMOKE-DOC-RADIO', 'RADIO');
  await crearActor('SMOKE-DOC-SECRETARIA', 'SECRETARIA_GENERAL');
  await crearActor('SMOKE-DOC-COMANDO', 'COMANDO');
  await crearActor('SMOKE-DOC-2COMANDO', 'SEGUNDO_COMANDO');
  await crearActor('SMOKE-DOC-LOGISTICA', 'LOGISTICA');

  console.log('\n1) Radio registra el documento');
  let r = await llamar('POST', '/documentacion/documentos', 'radio', {
    tipo_documento: 'OFICIO',
    asunto: 'SMOKE FASE 3 - flujo completo vía HTTP real',
    prioridad: 'URGENTE',
    clasificacion: 'PUBLICO',
  });
  assert(r.status === 201, `registrar documento -> 201 (obtenido ${r.status})`);
  const idDocumento = r.datos.id_documento;
  assert(r.datos.expediente?.estado_actual === 'REGISTRADO', 'estado inicial REGISTRADO');

  console.log('\n2) Radio envía a Secretaría General');
  r = await llamar('POST', `/documentacion/documentos/${idDocumento}/enviar`, 'radio', {
    id_seccion_destino: secciones.SECRETARIA_GENERAL,
  });
  assert(r.status === 201, `enviar a Secretaría -> 201 (obtenido ${r.status})`);
  let idMovimiento = r.datos.movimiento.id_movimiento;

  console.log('\n3) Secretaría ve el pendiente en su bandeja y lo recibe');
  r = await llamar('GET', '/documentacion/movimientos/pendientes', 'secretaria');
  assert(r.status === 200, `GET pendientes -> 200 (obtenido ${r.status})`);
  assert(
    Array.isArray(r.datos) && r.datos.some((m: any) => m.id_movimiento === idMovimiento),
    'el movimiento enviado aparece en pendientes de Secretaría',
  );
  r = await llamar('POST', `/documentacion/movimientos/${idMovimiento}/recibir`, 'secretaria', {});
  assert(r.status === 201, `Secretaría recibe -> 201 (obtenido ${r.status})`);
  assert(r.datos.expediente?.estado_actual === 'EN_TRAMITE', 'estado pasa a EN_TRAMITE');

  console.log('\n4) Secretaría asigna hoja de ruta y registra el primer proveído');
  r = await llamar('POST', `/documentacion/documentos/${idDocumento}/hoja-ruta`, 'secretaria');
  assert(r.status === 201, `asignar hoja de ruta -> 201 (obtenido ${r.status})`);
  const idHojaRuta = r.datos.id_hoja_ruta;
  r = await llamar('POST', `/documentacion/hojas-ruta/${idHojaRuta}/proveidos`, 'secretaria', {
    contenido: 'Se remite a Comando.',
  });
  assert(r.status === 201, `primer proveído -> 201 (obtenido ${r.status})`);

  console.log('\n5) Secretaría -> Comando -> Segundo Comando (envío/recepción encadenados)');
  r = await llamar('POST', `/documentacion/documentos/${idDocumento}/enviar`, 'secretaria', {
    id_seccion_destino: secciones.COMANDO,
  });
  assert(r.status === 201, `Secretaría envía a Comando -> 201 (obtenido ${r.status})`);
  r = await llamar('POST', `/documentacion/movimientos/${r.datos.movimiento.id_movimiento}/recibir`, 'comando', {});
  assert(r.status === 201, `Comando recibe -> 201 (obtenido ${r.status})`);

  r = await llamar('POST', `/documentacion/documentos/${idDocumento}/enviar`, 'comando', {
    id_seccion_destino: secciones.SEGUNDO_COMANDO,
  });
  assert(r.status === 201, `Comando envía a Segundo Comando -> 201 (obtenido ${r.status})`);
  r = await llamar('POST', `/documentacion/movimientos/${r.datos.movimiento.id_movimiento}/recibir`, 'segundoComando', {});
  assert(r.status === 201, `Segundo Comando recibe -> 201 (obtenido ${r.status})`);

  console.log('\n6) Segundo Comando registra el segundo proveído y deriva a Logística');
  r = await llamar('POST', `/documentacion/hojas-ruta/${idHojaRuta}/proveidos`, 'segundoComando', {
    contenido: 'Deriva a Logística para cumplimiento.',
    id_seccion_destino: secciones.LOGISTICA,
    tipo_atencion_requerida: 'CUMPLIMIENTO',
  });
  assert(r.status === 201, `segundo proveído (con derivación) -> 201 (obtenido ${r.status})`);

  r = await llamar('POST', `/documentacion/documentos/${idDocumento}/enviar`, 'segundoComando', {
    id_seccion_destino: secciones.LOGISTICA,
    tipo_movimiento: 'DERIVACION',
  });
  assert(r.status === 201, `Segundo Comando deriva a Logística -> 201 (obtenido ${r.status})`);
  r = await llamar('POST', `/documentacion/movimientos/${r.datos.movimiento.id_movimiento}/recibir`, 'logistica', {});
  assert(r.status === 201, `Logística recibe -> 201 (obtenido ${r.status})`);
  assert(r.datos.expediente?.id_seccion_actual === secciones.LOGISTICA, 'expediente ahora está en Logística');

  console.log('\n7) Logística cumple, y el expediente vuelve para aprobación en cadena');
  r = await llamar('POST', `/documentacion/documentos/${idDocumento}/cumplimiento`, 'logistica', {
    descripcion: 'Se cumplió lo solicitado (smoke test).',
  });
  assert(r.status === 201, `registrar cumplimiento -> 201 (obtenido ${r.status})`);

  r = await llamar('POST', `/documentacion/documentos/${idDocumento}/enviar`, 'logistica', {
    id_seccion_destino: secciones.SEGUNDO_COMANDO,
  });
  assert(r.status === 201, `Logística envía a Segundo Comando -> 201 (obtenido ${r.status})`);
  r = await llamar('POST', `/documentacion/movimientos/${r.datos.movimiento.id_movimiento}/recibir`, 'segundoComando', {});
  assert(r.status === 201, `Segundo Comando recibe -> 201 (obtenido ${r.status})`);

  r = await llamar('POST', `/documentacion/documentos/${idDocumento}/aprobar`, 'segundoComando');
  assert(r.status === 201 && r.datos.estado_actual === 'APROBADO', `Segundo Comando aprueba (obtenido ${r.status}/${r.datos?.estado_actual})`);

  r = await llamar('POST', `/documentacion/documentos/${idDocumento}/enviar`, 'segundoComando', {
    id_seccion_destino: secciones.COMANDO,
  });
  assert(r.status === 201, `Segundo Comando envía a Comando -> 201 (obtenido ${r.status})`);
  r = await llamar('POST', `/documentacion/movimientos/${r.datos.movimiento.id_movimiento}/recibir`, 'comando', {});
  assert(r.status === 201, `Comando recibe -> 201 (obtenido ${r.status})`);

  r = await llamar('POST', `/documentacion/documentos/${idDocumento}/aprobar`, 'comando');
  assert(r.status === 201 && r.datos.estado_actual === 'APROBADO', `Comando aprueba (obtenido ${r.status}/${r.datos?.estado_actual})`);

  r = await llamar('POST', `/documentacion/documentos/${idDocumento}/enviar`, 'comando', {
    id_seccion_destino: secciones.RADIO,
  });
  assert(r.status === 201, `Comando envía a Radio -> 201 (obtenido ${r.status})`);
  r = await llamar('POST', `/documentacion/movimientos/${r.datos.movimiento.id_movimiento}/recibir`, 'radio', {});
  assert(r.status === 201, `Radio recibe -> 201 (obtenido ${r.status})`);

  console.log('\n8) Radio finaliza y archiva');
  r = await llamar('POST', `/documentacion/documentos/${idDocumento}/finalizar`, 'radio');
  assert(r.status === 201 && r.datos.estado_actual === 'FINALIZADO', `finalizar -> FINALIZADO (obtenido ${r.status}/${r.datos?.estado_actual})`);
  r = await llamar('POST', `/documentacion/documentos/${idDocumento}/archivar`, 'radio');
  assert(r.status === 201 && r.datos.estado_actual === 'ARCHIVADO', `archivar -> ARCHIVADO (obtenido ${r.status}/${r.datos?.estado_actual})`);

  console.log('\n9) La trazabilidad final refleja todo el recorrido');
  r = await llamar('GET', `/documentacion/documentos/${idDocumento}/trazabilidad`, 'radio');
  assert(r.status === 200, `GET trazabilidad -> 200 (obtenido ${r.status})`);
  assert(r.datos.expediente?.estado_actual === 'ARCHIVADO', 'trazabilidad confirma ARCHIVADO');
  assert(r.datos.expediente?.hoja_ruta?.proveidos?.length === 2, 'trazabilidad tiene 2 proveídos');
  assert(!!r.datos.expediente?.hoja_ruta?.fecha_hora_cierre, 'hoja de ruta cerrada');

  console.log('\n10) Reporte general (usado por la página de Reportes del frontend)');
  r = await llamar('GET', '/documentacion/reportes/general?finalizados=true', 'radio');
  assert(r.status === 200, `GET reportes/general -> 200 (obtenido ${r.status})`);
  assert(
    Array.isArray(r.datos) && r.datos.some((d: any) => d.id_documento === idDocumento),
    'el documento archivado aparece en el reporte de finalizados',
  );

  console.log('\n🧹 Limpiando datos de la prueba...');
  await limpiar();

  console.log(`\n${fallas === 0 ? '✅ TODO OK' : `❌ ${fallas} verificación(es) fallaron`}`);
  process.exit(fallas === 0 ? 0 : 1);
}

main()
  .catch(async (e) => {
    console.error('💥 Error inesperado:', e);
    try {
      await limpiar();
    } catch {}
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
