import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const p = new PrismaClient({ adapter });

const materias = await p.materiaEvaluacion.findMany({
  where: { id_periodo: 3, id_curso: 1 },
  orderBy: { numero_materia: 'asc' },
  include: { _count: { select: { notas: true } } },
});
console.log('MATERIAS:', JSON.stringify(materias, null, 2));

const cadetes = await p.cadete.findMany({
  where: { id_curso: 1 },
  include: { usuario: { select: { nombres: true, apellidos: true, ci: true, estado: true } } },
  orderBy: { id_cadete: 'asc' },
});
console.log('TOTAL CADETES CURSO 1:', cadetes.length);
console.log('CADETES:', JSON.stringify(cadetes.map(c => ({
  id_cadete: c.id_cadete,
  nombres: c.usuario.nombres,
  apellidos: c.usuario.apellidos,
  ci: c.usuario.ci,
  estado_cadete: c.estado_cadete,
})), null, 2));

await p.$disconnect();
