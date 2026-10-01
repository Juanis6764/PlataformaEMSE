import 'dotenv/config';
import fs from 'node:fs';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const p = new PrismaClient({ adapter });

const ts = new Date().toISOString().replace(/[:.]/g, '-');
const outPath = `../backups/emse_pre_carga_2do_3ro_${ts}.json`;

const materiaEvaluacion = await p.materiaEvaluacion.findMany({ where: { id_curso: { in: [2, 3] } } });
const notaEvaluacion = await p.notaEvaluacion.findMany({
  where: { materia: { id_curso: { in: [2, 3] } } },
});
const cadetes = await p.cadete.findMany({
  where: { id_curso: { in: [2, 3] } },
  include: { usuario: { select: { id_usuario: true, nombres: true, apellidos: true, ci: true } } },
});

const backup = {
  fecha: new Date().toISOString(),
  descripcion: 'Snapshot pre-carga de notas Segundo y Tercer Año (MateriaEvaluacion + NotaEvaluacion + Cadete/Usuario para id_curso 2 y 3). No es un pg_dump binario (pg_dump no disponible en esta maquina); es un respaldo logico JSON de las tablas afectadas.',
  MateriaEvaluacion: materiaEvaluacion,
  NotaEvaluacion: notaEvaluacion,
  Cadete: cadetes,
};

fs.writeFileSync(new URL(outPath, import.meta.url), JSON.stringify(backup, (k, v) => (typeof v === 'bigint' ? v.toString() : v), 2));
console.log('Backup escrito en:', new URL(outPath, import.meta.url).pathname);
console.log('MateriaEvaluacion:', materiaEvaluacion.length, 'NotaEvaluacion:', notaEvaluacion.length, 'Cadete:', cadetes.length);

await p.$disconnect();
