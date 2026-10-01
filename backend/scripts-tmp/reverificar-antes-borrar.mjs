import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const p = new PrismaClient({ adapter });

const targets = [
  { id_usuario: 11, esperado_nombres: 'Cadete', esperado_apellidos: 'Prueba', id_cadete: 381 },
  { id_usuario: 336, esperado_nombres: 'Andrea', esperado_apellidos: 'Laura Zambrana', id_cadete: 323 },
  { id_usuario: 1847, esperado_nombres: 'Operador', esperado_apellidos: 'Entrenamiento Físico Primer Año' },
  { id_usuario: 1848, esperado_nombres: 'Operador', esperado_apellidos: 'Entrenamiento Físico Segundo Año' },
  { id_usuario: 1849, esperado_nombres: 'Operador', esperado_apellidos: 'Entrenamiento Físico Tercer Año' },
];

let allOk = true;
for (const t of targets) {
  const u = await p.usuario.findUnique({ where: { id_usuario: t.id_usuario }, include: { rol: true } });
  const okNombre = u && u.nombres === t.esperado_nombres && u.apellidos === t.esperado_apellidos;
  console.log(`Usuario ${t.id_usuario}: nombres="${u?.nombres}" apellidos="${u?.apellidos}" rol=${u?.rol?.nombre} estado=${u?.estado} -> ${okNombre ? 'OK' : 'MISMATCH!!'}`);
  if (!okNombre) allOk = false;
  if (t.id_cadete) {
    const c = await p.cadete.findUnique({ where: { id_cadete: t.id_cadete } });
    const okCadete = c && c.id_usuario === t.id_usuario;
    console.log(`  Cadete ${t.id_cadete}: id_usuario=${c?.id_usuario} (esperado ${t.id_usuario}) -> ${okCadete ? 'OK' : 'MISMATCH!!'}`);
    if (!okCadete) allOk = false;
  }
}
console.log('\n' + (allOk ? 'TODOS LOS REGISTROS VERIFICADOS CORRECTAMENTE' : 'HAY DISCREPANCIAS - ABORTAR'));
await p.$disconnect();
process.exit(allOk ? 0 : 1);
