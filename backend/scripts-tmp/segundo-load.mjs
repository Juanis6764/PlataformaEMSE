import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { parseTabla1, parseTabla2 } from './segundo-parse.mjs';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const p = new PrismaClient({ adapter });

const ID_PERIODO = 3;
const ID_CURSO = 2;
const ID_CREADOR = 1854;

function norm(s) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

const t1 = parseTabla1();
const t2 = parseTabla2();

const cadetes = await p.cadete.findMany({
  where: { id_curso: ID_CURSO },
  include: { usuario: { select: { nombres: true, apellidos: true } } },
});
const byKey = new Map();
for (const c of cadetes) byKey.set(norm(`${c.usuario.apellidos} ${c.usuario.nombres}`), c.id_cadete);

const nombres = t1.map((r) => r.name);

// id_materia -> valores por fila (mismo orden que t1/t2)
const materiaData = {
  15: t1.map((r) => r.materias[0]), // EXPRESIÓN ORAL Y ESCRITA
  16: t1.map((r) => r.materias[1]), // DOCUMENTACIÓN Y CORR. MILITAR
  17: t1.map((r) => r.materias[2]), // ARCHIVÍSTICA
  18: t1.map((r) => r.materias[3]), // ETIQUETA Y PROTOCOLO
  19: t1.map((r) => r.materias[4]), // SERVICIO EN PEQUEÑAS UNIDADES
  20: t1.map((r) => r.materias[5]), // INTELIGENCIA DE COMBATE
  21: t2.map((r) => r.materias5[0]), // ADMINISTRACIÓN DEL RIESGO
  22: t2.map((r) => r.materias5[1]), // GESTIÓN DE RIESGOS Y DESASTRES
  23: t2.map((r) => r.materias5[2]), // ADMINISTRACIÓN DE LOS PP.MM.AA.
  24: t2.map((r) => r.materias5[3]), // MONOGRAFÍAS Y RECONOCIMIENTOS MILITARES
  25: t2.map((r) => r.materias5[4]), // TAEKWONDO Y JIU JITSU
  26: t1.map((r) => r.promArmas), // PROM. ARMAS Y ESP.
};

const summary = [];

for (const idMateriaStr of Object.keys(materiaData)) {
  const idMateria = Number(idMateriaStr);
  const valores = materiaData[idMateria];
  try {
    const result = await p.$transaction(async (tx) => {
      const materia = await tx.materiaEvaluacion.findUnique({ where: { id_materia: idMateria } });
      if (!materia) throw new Error(`MateriaEvaluacion id=${idMateria} no existe`);
      if (materia.id_periodo !== ID_PERIODO || materia.id_curso !== ID_CURSO) {
        throw new Error(`Materia id=${idMateria} pertenece a periodo=${materia.id_periodo}/curso=${materia.id_curso}, esperado ${ID_PERIODO}/${ID_CURSO}`);
      }
      if (materia.estado !== 'BORRADOR') {
        throw new Error(`Materia id=${idMateria} (numero=${materia.numero_materia}) no esta en BORRADOR (estado=${materia.estado})`);
      }
      const existentes = await tx.notaEvaluacion.count({ where: { id_materia: idMateria } });
      if (existentes > 0) {
        throw new Error(`Materia id=${idMateria} (numero=${materia.numero_materia}) ya tiene ${existentes} notas; no se sobrescribe.`);
      }

      let cargadas = 0;
      const pendientes = [];
      for (let i = 0; i < nombres.length; i++) {
        const pdfName = nombres[i];
        const idCadete = byKey.get(norm(pdfName));
        if (!idCadete) {
          pendientes.push(pdfName);
          continue;
        }
        const val = valores[i];
        if (val === undefined || isNaN(val) || val < 0 || val > 100) {
          pendientes.push(`${pdfName} (valor invalido: ${val})`);
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

      const materiaFinal = await tx.materiaEvaluacion.findUnique({ where: { id_materia: idMateria } });
      if (materiaFinal.estado !== 'BORRADOR') throw new Error('La materia cambio de estado durante la carga, abortando.');

      return { numero_materia: materia.numero_materia, nombre: materia.nombre, cargadas, pendientes, esperados: nombres.length };
    });
    summary.push({ id_materia: idMateria, ok: true, ...result });
    console.log(`Materia ${result.numero_materia} (${result.nombre}) [id_materia=${idMateria}]`);
    console.log(`  Cadetes esperados: ${result.esperados}`);
    console.log(`  Notas cargadas: ${result.cargadas}`);
    console.log(`  Pendientes/no encontrados: ${result.pendientes.length}`);
    if (result.pendientes.length) console.log(`  Detalle: ${JSON.stringify(result.pendientes)}`);
    console.log(`  Estado: BORRADOR\n`);
  } catch (e) {
    summary.push({ id_materia: idMateria, ok: false, error: e.message });
    console.log(`Materia id_materia=${idMateria}: ERROR - ${e.message}\n`);
  }
}

console.log('=== RESUMEN FINAL SEGUNDO AÑO ===');
console.log(JSON.stringify(summary, null, 2));

await p.$disconnect();
