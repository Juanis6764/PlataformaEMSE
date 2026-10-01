import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const p = new PrismaClient({ adapter });

async function checkUsuario(id, label) {
  console.log(`\n########## USUARIO id_usuario=${id} (${label}) ##########`);
  const u = await p.usuario.findUnique({ where: { id_usuario: id } });
  if (!u) { console.log('NO EXISTE'); return; }
  console.log(u);

  const counts = {
    cadete: await p.cadete.count({ where: { id_usuario: id } }),
    historial_passwords: await p.historialPassword.count({ where: { id_usuario: id } }),
    sesiones: await p.sesion.count({ where: { id_usuario: id } }),
    refresh_historico: await p.refreshHistorico.count({ where: { sesion: { id_usuario: id } } }).catch(() => 'n/a'),
    codigos_verificacion: await p.codigoVerificacion.count({ where: { id_usuario: id } }),
    logs_acceso: await p.logAcceso.count({ where: { id_usuario: id } }),
    auditorias: await p.auditoriaAccion.count({ where: { id_usuario: id } }),
    periodos_lectivos_creados: await p.periodoLectivo.count({ where: { id_creador: id } }),
    config_disciplina_creadas: await p.configuracionDisciplinaPeriodo.count({ where: { id_creador: id } }),
    oficiales_disciplina_creados: await p.oficialDisciplina.count({ where: { id_creador: id } }),
    catalogos_disciplina_creados: await p.catalogoDisciplina.count({ where: { id_creador: id } }),
    semanas_disciplina_creadas: await p.semanaDisciplina.count({ where: { id_creador: id } }),
    semanas_disciplina_responsable: await p.semanaDisciplina.count({ where: { id_ultimo_responsable: id } }),
    registros_disciplina_creados: await p.registroDisciplina.count({ where: { id_creador: id } }),
    resultados_disciplina_publicados: await p.resultadoFinalDisciplina.count({ where: { id_publicador: id } }),
    resultados_disciplina_enviados: await p.resultadoFinalDisciplina.count({ where: { id_emisor_evaluaciones: id } }),
    config_evaluaciones_creadas: await p.configuracionEvaluacionesPeriodo.count({ where: { id_creador: id } }),
    materias_evaluacion_creadas: await p.materiaEvaluacion.count({ where: { id_creador: id } }),
    materias_evaluacion_responsable: await p.materiaEvaluacion.count({ where: { id_ultimo_responsable: id } }),
    notas_evaluacion_creadas: await p.notaEvaluacion.count({ where: { id_creador: id } }),
    notificaciones_recibidas: await p.notificacion.count({ where: { id_usuario_destinatario: id } }),
    asignaciones_academicas: await p.asignacionAcademica.count({ where: { id_usuario: id } }),
    asignaciones_administrativas: await p.asignacionAdministrativa.count({ where: { id_usuario: id } }),
    permisos_individuales: await p.usuarioPermiso.count({ where: { id_usuario: id } }),
    documentos_registrados: await p.documento.count({ where: { id_usuario_registro: id } }).catch(() => 'campo no existe'),
  };
  console.log('CONTEOS DE DEPENDENCIAS:', JSON.stringify(counts, null, 2));
}

async function checkCadete(id, label) {
  console.log(`\n########## CADETE id_cadete=${id} (${label}) ##########`);
  const c = await p.cadete.findUnique({ where: { id_cadete: id }, include: { usuario: { select: { id_usuario: true, nombres: true, apellidos: true, ci: true } } } });
  if (!c) { console.log('NO EXISTE'); return; }
  console.log(c);
  const counts = {
    historial_cursos: await p.historialCursoCadete.count({ where: { id_cadete: id } }),
    registros_disciplina: await p.registroDisciplina.count({ where: { id_cadete: id } }),
    resultados_disciplina: await p.resultadoFinalDisciplina.count({ where: { id_cadete: id } }),
    notas_evaluacion: await p.notaEvaluacion.count({ where: { id_cadete: id } }),
  };
  console.log('CONTEOS DE DEPENDENCIAS:', JSON.stringify(counts, null, 2));
}

await checkUsuario(11, 'segun el nombre: "Prueba Cadete", vinculado a Cadete.id_cadete=381');
await checkUsuario(336, 'segun el nombre: "Laura Zambrana Andrea", vinculado a Cadete.id_cadete=323');
await checkUsuario(381, 'lo que el usuario escribio como id=381 -- verificar si coincide con "Prueba Cadete"');
await checkUsuario(323, 'lo que el usuario escribio como id=323 -- verificar si coincide con "Laura Zambrana Andrea"');
await checkUsuario(1847, 'Operador EFM Primer Año');
await checkUsuario(1848, 'Operador EFM Segundo Año');
await checkUsuario(1849, 'Operador EFM Tercer Año');

await checkCadete(381, 'esperado: Prueba Cadete');
await checkCadete(323, 'esperado: Laura Zambrana Andrea');

await p.$disconnect();
