import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { parseTabla1, parseTabla2, parseTabla3 } from './tercero-parse.mjs';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const p = new PrismaClient({ adapter });

function norm(s) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

const t1 = parseTabla1();
const t2 = parseTabla2();
const t3 = parseTabla3();

console.log('tabla1 filas:', t1.length, '(esperado 116)');
console.log('tabla2 valores (DOCTRINA):', t2.length, '(esperado 116)');
console.log('tabla3 filas:', t3.length, '(esperado 116)');

let errors = [];
if (t1.length !== 116) errors.push('tabla1 length != 116');
if (t2.length !== 116) errors.push('tabla2 length != 116');
if (t3.length !== 116) errors.push('tabla3 length != 116');
t3.forEach((r, i) => {
  if (r.antigNum !== i + 1) errors.push(`tabla3 fila ${i}: antiguedad=${r.antigNum} esperado=${i + 1}`);
});
t1.forEach((r, i) => {
  if (r.promArmas !== undefined && (isNaN(r.promArmas) || r.promArmas < 0 || r.promArmas > 100)) errors.push(`tabla1 fila ${i} (${r.name}) promArmas invalido: ${r.promArmas}`);
  r.materias.forEach((v, j) => {
    if (isNaN(v) || v < 0 || v > 100) errors.push(`tabla1 fila ${i} (${r.name}) materia[${j}] invalida: ${v}`);
  });
});
t2.forEach((v, i) => {
  if (isNaN(v) || v < 0 || v > 100) errors.push(`tabla2 fila ${i} invalida: ${v}`);
});
t3.forEach((r, i) => {
  if (isNaN(r.entrega) || r.entrega < 0 || r.entrega > 100) errors.push(`tabla3 fila ${i} entrega invalida: ${r.entrega}`);
  if (isNaN(r.taekwondo) || r.taekwondo < 0 || r.taekwondo > 100) errors.push(`tabla3 fila ${i} taekwondo invalida: ${r.taekwondo}`);
});

if (errors.length) {
  console.log('ERRORES ESTRUCTURALES:', JSON.stringify(errors, null, 2));
} else {
  console.log('OK: validacion estructural pasada.');
}

t1.forEach((r, i) => {
  if (r.rawCount < 6 || r.rawCount > 11) console.log(`AVISO fila ${i + 1} (${r.name}): rawCount=${r.rawCount} fuera de rango esperado 6-11`);
});

// Matching contra DB (curso 3)
const cadetes = await p.cadete.findMany({
  where: { id_curso: 3 },
  include: { usuario: { select: { nombres: true, apellidos: true, ci: true } } },
});
const byKey = new Map();
for (const c of cadetes) {
  const key = norm(`${c.usuario.apellidos} ${c.usuario.nombres}`);
  if (byKey.has(key)) console.log('DUPLICADO EN DB:', key);
  byKey.set(key, c.id_cadete);
}

console.log(`\nTotal cadetes curso TERCER_AÑO en DB: ${cadetes.length}`);
console.log(`Total filas PDF (tabla1): ${t1.length}`);

const matched = [];
const unmatched = [];
for (const row of t1) {
  const id = byKey.get(norm(row.name));
  if (id) matched.push({ name: row.name, id_cadete: id });
  else unmatched.push(row.name);
}
console.log(`Matched: ${matched.length} / ${t1.length}`);
if (unmatched.length) console.log('NO ENCONTRADOS EN DB:', JSON.stringify(unmatched, null, 2));

const matchedIds = new Set(matched.map((m) => m.id_cadete));
const dbOnly = cadetes.filter((c) => !matchedIds.has(c.id_cadete));
if (dbOnly.length) console.log('\nCADETES EN DB (curso 3) NO EN PDF:', JSON.stringify(dbOnly.map((c) => `${c.usuario.apellidos} | ${c.usuario.nombres} (id=${c.id_cadete}, ci=${c.usuario.ci})`), null, 2));

await p.$disconnect();
