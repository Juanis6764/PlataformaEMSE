import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const p = new PrismaClient({ adapter });

console.log('=== SEGUNDO AÑO (curso 2, periodo 3) ===');
const m2 = await p.materiaEvaluacion.findMany({ where: { id_periodo: 3, id_curso: 2 }, orderBy: { numero_materia: 'asc' }, include: { _count: { select: { notas: true } } } });
for (const m of m2) console.log(`numero=${m.numero_materia} id=${m.id_materia} "${m.nombre}" estado=${m.estado} notas=${m._count.notas} envio=${m.fecha_envio} publicacion=${m.fecha_publicacion}`);

console.log('\n=== TERCER AÑO (curso 3, periodo 3) ===');
const m3 = await p.materiaEvaluacion.findMany({ where: { id_periodo: 3, id_curso: 3 }, orderBy: { numero_materia: 'asc' }, include: { _count: { select: { notas: true } } } });
for (const m of m3) console.log(`numero=${m.numero_materia} id=${m.id_materia} "${m.nombre}" estado=${m.estado} notas=${m._count.notas} envio=${m.fecha_envio} publicacion=${m.fecha_publicacion}`);

console.log('\n=== nota_desquite debe ser null en TODAS las notas de curso 2 y 3 ===');
const conDesquite = await p.notaEvaluacion.count({ where: { materia: { id_curso: { in: [2, 3] } }, nota_desquite: { not: null } } });
console.log('Notas con nota_desquite != null:', conDesquite);

console.log('\n=== Spot-check Segundo Año: Charca Quisbert Alex (fila 1) ===');
const c1 = await p.cadete.findFirst({ where: { usuario: { apellidos: 'Charca Quisbert', nombres: 'Alex' } } });
if (c1) {
  const notas = await p.notaEvaluacion.findMany({ where: { id_cadete: c1.id_cadete, materia: { id_curso: 2 } }, include: { materia: { select: { numero_materia: true, nombre: true } } }, orderBy: { materia: { numero_materia: 'asc' } } });
  for (const n of notas) console.log(`  m${n.materia.numero_materia} (${n.materia.nombre}): ${n.nota_inicial}`);
} else console.log('  NO ENCONTRADO');

console.log('\n=== Spot-check Tercer Año: Toco Brayan (fila 1) ===');
const c2 = await p.cadete.findFirst({ where: { usuario: { apellidos: 'Toco', nombres: 'Brayan' } } });
if (c2) {
  const notas = await p.notaEvaluacion.findMany({ where: { id_cadete: c2.id_cadete, materia: { id_curso: 3 } }, include: { materia: { select: { numero_materia: true, nombre: true } } }, orderBy: { materia: { numero_materia: 'asc' } } });
  for (const n of notas) console.log(`  m${n.materia.numero_materia} (${n.materia.nombre}): ${n.nota_inicial}`);
} else console.log('  NO ENCONTRADO');

console.log('\n=== Spot-check Tercer Año: Orosco Cano Jose Miguel (fila 116, ultima) ===');
const c3 = await p.cadete.findFirst({ where: { usuario: { apellidos: 'Orosco Cano', nombres: 'Jose Miguel' } } });
if (c3) {
  const notas = await p.notaEvaluacion.findMany({ where: { id_cadete: c3.id_cadete, materia: { id_curso: 3 } }, include: { materia: { select: { numero_materia: true, nombre: true } } }, orderBy: { materia: { numero_materia: 'asc' } } });
  for (const n of notas) console.log(`  m${n.materia.numero_materia} (${n.materia.nombre}): ${n.nota_inicial}`);
}

console.log('\n=== Primer Año (curso 1) NO debe haber cambiado ===');
const m1total = await p.materiaEvaluacion.count({ where: { id_curso: 1 } });
const n1total = await p.notaEvaluacion.count({ where: { materia: { id_curso: 1 } } });
console.log('MateriaEvaluacion curso1 total:', m1total, '(esperado 13)');
console.log('NotaEvaluacion curso1 total:', n1total, '(esperado 13*115=1495)');
const materia1 = await p.materiaEvaluacion.findUnique({ where: { id_materia: 1 } });
console.log('Materia 1 (CONSTITUCION) estado:', materia1.estado, '(esperado PUBLICADO, sin cambios)');

console.log('\n=== Disciplina: solo conteos, sin escrituras ===');
console.log('ConfiguracionDisciplinaPeriodo:', await p.configuracionDisciplinaPeriodo.count());
console.log('OficialDisciplina:', await p.oficialDisciplina.count());
console.log('CatalogoDisciplina:', await p.catalogoDisciplina.count());
console.log('SemanaDisciplina:', await p.semanaDisciplina.count());
console.log('RegistroDisciplina:', await p.registroDisciplina.count());

console.log('\n=== Total NotaEvaluacion en toda la BD ===');
console.log(await p.notaEvaluacion.count());

await p.$disconnect();
