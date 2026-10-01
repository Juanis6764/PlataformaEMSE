import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { tableA, tableB, tableC } from './notas-data.mjs';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const p = new PrismaClient({ adapter });

function norm(s) {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function toNum(s) {
  return parseFloat(String(s).replace(',', '.'));
}

let errors = [];

if (tableA.length !== 115) errors.push(`tableA length = ${tableA.length}, esperado 115`);
if (tableB.length !== 115) errors.push(`tableB length = ${tableB.length}, esperado 115`);
if (tableC.length !== 115) errors.push(`tableC length = ${tableC.length}, esperado 115`);

tableC.forEach((row, i) => {
  if (row[3] !== i + 1) errors.push(`tableC fila ${i}: antiguedad=${row[3]} esperado=${i + 1}`);
});

// Validar rangos numericos 0-100
tableA.forEach((row, i) => {
  for (let c = 1; c <= 7; c++) {
    const v = toNum(row[c]);
    if (isNaN(v) || v < 0 || v > 100) errors.push(`tableA fila ${i} (${row[0]}) col${c}: valor invalido ${row[c]}`);
  }
});
tableB.forEach((v, i) => {
  const n = toNum(v);
  if (isNaN(n) || n < 0 || n > 100) errors.push(`tableB fila ${i}: valor invalido ${v}`);
});
tableC.forEach((row, i) => {
  for (let c = 0; c < 3; c++) {
    const v = toNum(row[c]);
    if (isNaN(v) || v < 0 || v > 100) errors.push(`tableC fila ${i} col${c}: valor invalido ${row[c]}`);
  }
});

console.log('=== VALIDACION ESTRUCTURAL ===');
if (errors.length) {
  console.log('ERRORES:', JSON.stringify(errors, null, 2));
} else {
  console.log('OK: 115 filas en las 3 tablas, antiguedad secuencial 1-115, todos los valores en rango 0-100.');
}

// Matching contra DB
const cadetes = await p.cadete.findMany({
  where: { id_curso: 1 },
  include: { usuario: { select: { nombres: true, apellidos: true, ci: true } } },
});

const byKey = new Map();
for (const c of cadetes) {
  const key = norm(`${c.usuario.apellidos} ${c.usuario.nombres}`);
  if (byKey.has(key)) {
    console.log('DUPLICADO EN DB para key:', key, byKey.get(key), c.id_cadete);
  }
  byKey.set(key, c.id_cadete);
}

console.log('\n=== MATCHING NOMBRE PDF -> CADETE DB ===');
console.log(`Total cadetes en curso PRIMER_AÑO: ${cadetes.length}`);
console.log(`Total filas PDF: ${tableA.length}`);

const matched = [];
const unmatched = [];
for (const row of tableA) {
  const pdfName = row[0];
  const key = norm(pdfName);
  const id = byKey.get(key);
  if (id) {
    matched.push({ pdfName, id_cadete: id });
  } else {
    unmatched.push(pdfName);
  }
}

console.log(`Matched: ${matched.length} / ${tableA.length}`);
if (unmatched.length) {
  console.log('NO ENCONTRADOS EN DB:', JSON.stringify(unmatched, null, 2));
}

// Verificar que todos los cadetes del curso quedan cubiertos (o reportar cuales no aparecen en el PDF)
const matchedIds = new Set(matched.map(m => m.id_cadete));
const dbOnly = cadetes.filter(c => !matchedIds.has(c.id_cadete));
if (dbOnly.length) {
  console.log('\nCADETES EN DB (curso 1) QUE NO APARECEN EN EL PDF:', JSON.stringify(dbOnly.map(c => `${c.usuario.apellidos} ${c.usuario.nombres} (id=${c.id_cadete})`), null, 2));
}

await p.$disconnect();
