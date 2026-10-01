import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const p = new PrismaClient({ adapter });

console.log('=== ESTADO DE MATERIAS 1-12 (periodo 3, curso 1) ===');
const materias = await p.materiaEvaluacion.findMany({
  where: { id_periodo: 3, id_curso: 1 },
  orderBy: { numero_materia: 'asc' },
  include: { _count: { select: { notas: true } } },
});
for (const m of materias) {
  console.log(`numero_materia=${m.numero_materia} id=${m.id_materia} nombre="${m.nombre}" estado=${m.estado} notas=${m._count.notas} fecha_envio=${m.fecha_envio} fecha_publicacion=${m.fecha_publicacion}`);
}

console.log('\n=== nota_desquite debe ser null en todas las notas de materias 2-12 ===');
const conDesquite = await p.notaEvaluacion.count({
  where: { id_materia: { in: [3,4,5,6,7,8,9,10,11,12,13] }, nota_desquite: { not: null } },
});
console.log('Notas con nota_desquite != null:', conDesquite);

console.log('\n=== Spot-check: Chiri Aizamani Aybin Lisandro (deberia ser id_cadete conocido) en cada materia ===');
const cadete = await p.cadete.findFirst({
  where: { usuario: { apellidos: 'Chiri Aizamani', nombres: 'Aybin Lisandro' } },
});
if (cadete) {
  const notas = await p.notaEvaluacion.findMany({
    where: { id_cadete: cadete.id_cadete, id_materia: { in: [3,4,5,6,7,8,9,10,11,12,13] } },
    include: { materia: { select: { numero_materia: true, nombre: true } } },
    orderBy: { materia: { numero_materia: 'asc' } },
  });
  for (const n of notas) {
    console.log(`  materia ${n.materia.numero_materia} (${n.materia.nombre}): nota_inicial=${n.nota_inicial} nota_desquite=${n.nota_desquite}`);
  }
} else {
  console.log('  Cadete no encontrado (revisar)');
}

console.log('\n=== Camacho García Iván Alejandro (ultima fila, notas bajas) ===');
const cadete2 = await p.cadete.findFirst({
  where: { usuario: { apellidos: 'Camacho García', nombres: 'Iván Alejandro' } },
});
if (cadete2) {
  const notas2 = await p.notaEvaluacion.findMany({
    where: { id_cadete: cadete2.id_cadete, id_materia: { in: [3,4,5,6,7,8,9,10,11,12,13] } },
    include: { materia: { select: { numero_materia: true, nombre: true } } },
    orderBy: { materia: { numero_materia: 'asc' } },
  });
  for (const n of notas2) {
    console.log(`  materia ${n.materia.numero_materia} (${n.materia.nombre}): nota_inicial=${n.nota_inicial} nota_desquite=${n.nota_desquite}`);
  }
}

console.log('\n=== Total NotaEvaluacion en toda la BD (para contexto) ===');
console.log(await p.notaEvaluacion.count());

console.log('\n=== Verificar tablas de disciplina no tocadas (solo conteo, no deberian variar por esta operacion) ===');
console.log('ConfiguracionDisciplinaPeriodo:', await p.configuracionDisciplinaPeriodo.count());
console.log('OficialDisciplina:', await p.oficialDisciplina.count());
console.log('CatalogoDisciplina:', await p.catalogoDisciplina.count());
console.log('SemanaDisciplina:', await p.semanaDisciplina.count());
console.log('RegistroDisciplina:', await p.registroDisciplina.count());

await p.$disconnect();
