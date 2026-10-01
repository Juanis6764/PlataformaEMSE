import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const p = new PrismaClient({ adapter });

const gestiones = await p.gestionAcademica.findMany();
console.log('GESTIONES:', JSON.stringify(gestiones, null, 2));

const periodos = await p.periodoLectivo.findMany({ include: { gestion: true } });
console.log('PERIODOS:', JSON.stringify(periodos, null, 2));

const cursos = await p.curso.findMany();
console.log('CURSOS:', JSON.stringify(cursos, null, 2));

await p.$disconnect();
