import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { tableA, tableB, tableC } from './notas-data.mjs';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const p = new PrismaClient({ adapter });

const ID_PERIODO = 3; // I / gestion 2026 (activo)
const ID_CURSO = 1; // PRIMER_AÑO
const ID_CREADOR = 1853; // creador ya usado para las MateriaEvaluacion en BORRADOR

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

const cadetes = await p.cadete.findMany({
  where: { id_curso: ID_CURSO },
  include: { usuario: { select: { nombres: true, apellidos: true } } },
});
const byKey = new Map();
for (const c of cadetes) byKey.set(norm(`${c.usuario.apellidos} ${c.usuario.nombres}`), c.id_cadete);

// id_materia -> [ {pdfName, valorStr} x115 ] en el mismo orden de tableA/tableC
const materiaData = {
  3: tableA.map((r) => r[1]), // numero_materia 2 - LOFA
  4: tableA.map((r) => r[2]), // numero_materia 3 - FALTAS DISC.
  5: tableA.map((r) => r[3]), // numero_materia 4 - GUERRAS MUNDIALES
  6: tableA.map((r) => r[4]), // numero_materia 5 - HISTORIA GUERRAS NACIONALES
  7: tableA.map((r) => r[5]), // numero_materia 6 - DIH
  8: tableA.map((r) => r[6]), // numero_materia 7 - VALORES MILITARES
  9: tableA.map((r) => r[7]), // numero_materia 8 - DON DE MANDO
  10: tableB, // numero_materia 9 - SIMBOLOS MILITARES
  11: tableC.map((r) => r[0]), // numero_materia 10 - TAREAS TACTICAS
  12: tableC.map((r) => r[1]), // numero_materia 11 - TECNICA Y CONFECCION DE CALCOS
  13: tableC.map((r) => r[2]), // numero_materia 12 - TAEKWONDO Y JIU JITSU
};

const nombresPorFila = tableA.map((r) => r[0]);

const summary = [];

for (const idMateriaStr of Object.keys(materiaData)) {
  const idMateria = Number(idMateriaStr);
  const valores = materiaData[idMateria];

  try {
    const result = await p.$transaction(async (tx) => {
      const materia = await tx.materiaEvaluacion.findUnique({ where: { id_materia: idMateria } });
      if (!materia) throw new Error(`MateriaEvaluacion id=${idMateria} no existe`);
      if (materia.id_periodo !== ID_PERIODO || materia.id_curso !== ID_CURSO) {
        throw new Error(
          `Materia id=${idMateria} pertenece a periodo=${materia.id_periodo}/curso=${materia.id_curso}, esperado ${ID_PERIODO}/${ID_CURSO}`,
        );
      }
      if (materia.numero_materia === 1) {
        throw new Error('ABORTADO: intento de tocar Materia 1, prohibido.');
      }
      if (materia.estado !== 'BORRADOR') {
        throw new Error(`Materia id=${idMateria} (numero=${materia.numero_materia}) no esta en BORRADOR (estado=${materia.estado}), se omite.`);
      }

      const existentes = await tx.notaEvaluacion.count({ where: { id_materia: idMateria } });
      if (existentes > 0) {
        throw new Error(`Materia id=${idMateria} (numero=${materia.numero_materia}) ya tiene ${existentes} notas cargadas; no se sobrescribe automaticamente.`);
      }

      let cargadas = 0;
      const pendientes = [];
      for (let i = 0; i < nombresPorFila.length; i++) {
        const pdfName = nombresPorFila[i];
        const idCadete = byKey.get(norm(pdfName));
        if (!idCadete) {
          pendientes.push(pdfName);
          continue;
        }
        const valStr = valores[i];
        const val = toNum(valStr);
        if (isNaN(val) || val < 0 || val > 100) {
          pendientes.push(`${pdfName} (valor invalido: ${valStr})`);
          continue;
        }
        await tx.notaEvaluacion.create({
          data: {
            id_materia: idMateria,
            id_cadete: idCadete,
            nota_inicial: val.toFixed(4),
            nota_desquite: null,
            id_creador: ID_CREADOR,
          },
        });
        cargadas++;
      }

      // Verificar que la materia sigue en BORRADOR (nadie la cambio durante la transaccion)
      const materiaFinal = await tx.materiaEvaluacion.findUnique({ where: { id_materia: idMateria } });
      if (materiaFinal.estado !== 'BORRADOR') {
        throw new Error(`Materia id=${idMateria} cambio de estado durante la carga, abortando transaccion.`);
      }

      return { numero_materia: materia.numero_materia, nombre: materia.nombre, cargadas, pendientes, esperados: nombresPorFila.length };
    });

    summary.push({ id_materia: idMateria, ok: true, ...result });
    console.log(`Materia ${result.numero_materia} (${result.nombre}) [id_materia=${idMateria}]`);
    console.log(`  Cadetes esperados: ${result.esperados}`);
    console.log(`  Notas cargadas: ${result.cargadas}`);
    console.log(`  Pendientes/no encontrados: ${result.pendientes.length}`);
    if (result.pendientes.length) console.log(`  Detalle pendientes: ${JSON.stringify(result.pendientes)}`);
    console.log(`  Estado: BORRADOR`);
    console.log('');
  } catch (e) {
    summary.push({ id_materia: idMateria, ok: false, error: e.message });
    console.log(`Materia id_materia=${idMateria}: ERROR - ${e.message}`);
    console.log('');
  }
}

console.log('=== RESUMEN FINAL ===');
console.log(JSON.stringify(summary, null, 2));

await p.$disconnect();
