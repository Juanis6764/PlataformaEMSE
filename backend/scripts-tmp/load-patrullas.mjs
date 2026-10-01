import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { promedioPatrullas } from './promedio-patrullas-data.mjs';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const p = new PrismaClient({ adapter });

const ID_PERIODO = 3;
const ID_CURSO = 1;
const ID_MATERIA = 14; // numero_materia = 13, PROMEDIO PATRULLAS
const ID_CREADOR = 1853;

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

// Validacion estructural
let errors = [];
if (promedioPatrullas.length !== 115) errors.push(`promedioPatrullas length = ${promedioPatrullas.length}, esperado 115`);
promedioPatrullas.forEach(([name, v], i) => {
  const n = toNum(v);
  if (isNaN(n) || n < 0 || n > 100) errors.push(`fila ${i} (${name}): valor invalido ${v}`);
});
if (errors.length) {
  console.log('ERRORES DE VALIDACION:', JSON.stringify(errors, null, 2));
  await p.$disconnect();
  process.exit(1);
}
console.log('Validacion estructural OK: 115 filas, valores en rango 0-100.');

const cadetes = await p.cadete.findMany({
  where: { id_curso: ID_CURSO },
  include: { usuario: { select: { nombres: true, apellidos: true } } },
});
const byKey = new Map();
for (const c of cadetes) byKey.set(norm(`${c.usuario.apellidos} ${c.usuario.nombres}`), c.id_cadete);

try {
  const result = await p.$transaction(async (tx) => {
    const materia = await tx.materiaEvaluacion.findUnique({ where: { id_materia: ID_MATERIA } });
    if (!materia) throw new Error(`MateriaEvaluacion id=${ID_MATERIA} no existe`);
    if (materia.id_periodo !== ID_PERIODO || materia.id_curso !== ID_CURSO) {
      throw new Error(`Materia id=${ID_MATERIA} pertenece a periodo=${materia.id_periodo}/curso=${materia.id_curso}, esperado ${ID_PERIODO}/${ID_CURSO}`);
    }
    if (materia.numero_materia !== 13) {
      throw new Error(`Materia id=${ID_MATERIA} tiene numero_materia=${materia.numero_materia}, esperado 13`);
    }
    if (materia.estado !== 'BORRADOR') {
      throw new Error(`Materia id=${ID_MATERIA} no esta en BORRADOR (estado=${materia.estado})`);
    }
    const existentes = await tx.notaEvaluacion.count({ where: { id_materia: ID_MATERIA } });
    if (existentes > 0) {
      throw new Error(`Materia id=${ID_MATERIA} ya tiene ${existentes} notas cargadas; no se sobrescribe.`);
    }

    let cargadas = 0;
    const pendientes = [];
    for (const [pdfName, valStr] of promedioPatrullas) {
      const idCadete = byKey.get(norm(pdfName));
      if (!idCadete) {
        pendientes.push(pdfName);
        continue;
      }
      const val = toNum(valStr);
      await tx.notaEvaluacion.create({
        data: {
          id_materia: ID_MATERIA,
          id_cadete: idCadete,
          nota_inicial: val.toFixed(4),
          nota_desquite: null,
          id_creador: ID_CREADOR,
        },
      });
      cargadas++;
    }

    const materiaFinal = await tx.materiaEvaluacion.findUnique({ where: { id_materia: ID_MATERIA } });
    if (materiaFinal.estado !== 'BORRADOR') {
      throw new Error('La materia cambio de estado durante la carga, abortando.');
    }

    return { numero_materia: materia.numero_materia, nombre: materia.nombre, cargadas, pendientes, esperados: promedioPatrullas.length };
  });

  console.log(`\nMateria ${result.numero_materia} (${result.nombre}) [id_materia=${ID_MATERIA}]`);
  console.log(`  Cadetes esperados: ${result.esperados}`);
  console.log(`  Notas cargadas: ${result.cargadas}`);
  console.log(`  Pendientes/no encontrados: ${result.pendientes.length}`);
  if (result.pendientes.length) console.log(`  Detalle: ${JSON.stringify(result.pendientes)}`);
  console.log(`  Estado: BORRADOR`);
} catch (e) {
  console.log('ERROR:', e.message);
}

await p.$disconnect();
