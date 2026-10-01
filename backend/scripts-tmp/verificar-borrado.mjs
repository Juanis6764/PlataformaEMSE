import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const p = new PrismaClient({ adapter });

console.log('=== Usuarios deben ser null ===');
for (const id of [11, 336, 1847, 1848, 1849]) {
  console.log(`Usuario ${id}:`, await p.usuario.findUnique({ where: { id_usuario: id } }));
}

console.log('\n=== Cadetes deben ser null ===');
for (const id of [381, 323]) {
  console.log(`Cadete ${id}:`, await p.cadete.findUnique({ where: { id_cadete: id } }));
}

console.log('\n=== Huerfanos: filas que aun apunten a esos ids ===');
console.log('Sesion con id_usuario en [11,336,1847,1848,1849]:', await p.sesion.count({ where: { id_usuario: { in: [11, 336, 1847, 1848, 1849] } } }));
console.log('CodigoVerificacion:', await p.codigoVerificacion.count({ where: { id_usuario: { in: [11, 336, 1847, 1848, 1849] } } }));
console.log('HistorialPassword:', await p.historialPassword.count({ where: { id_usuario: { in: [11, 336, 1847, 1848, 1849] } } }));
console.log('AuditoriaAccion:', await p.auditoriaAccion.count({ where: { id_usuario: { in: [11, 336, 1847, 1848, 1849] } } }));
console.log('AsignacionAcademica:', await p.asignacionAcademica.count({ where: { id_usuario: { in: [11, 336, 1847, 1848, 1849] } } }));
console.log('LogAcceso con id_usuario NO NULL en esa lista (deberian ser 0, se esperan NULL):', await p.logAcceso.count({ where: { id_usuario: { in: [11, 336, 1847, 1848, 1849] } } }));
console.log('LogAcceso con id_usuario = NULL (rastro conservado del operador 1847):', await p.logAcceso.count({ where: { id_usuario: null } }));
console.log('NotaEvaluacion con id_cadete en [381,323]:', await p.notaEvaluacion.count({ where: { id_cadete: { in: [381, 323] } } }));

console.log('\n=== Verificacion de que NO se toco a nadie mas ===');
console.log('Total Usuario en BD:', await p.usuario.count());
console.log('Total Cadete en BD:', await p.cadete.count());
console.log('Cadetes curso3 (esperado 116, ya no 118):', await p.cadete.count({ where: { id_curso: 3 } }));
console.log('Total NotaEvaluacion en BD (esperado igual que antes: 4099):', await p.notaEvaluacion.count());
console.log('Total Documento en BD:', await p.documento.count());
console.log('Total RegistroDisciplina en BD:', await p.registroDisciplina.count());

// Spot check: los otros dos cadetes de Tercer Año que SI tenian ese numero (321 usuario Orosco Cano, 323 usuario Ricaldez Jaimes) siguen intactos
console.log('\n=== Confirmar que Jose Miguel Orosco Cano y Kevin Ricaldez Jaimes (los que casi se hubieran borrado por error) siguen intactos ===');
const orosco = await p.usuario.findUnique({ where: { id_usuario: 381 } });
const ricaldez = await p.usuario.findUnique({ where: { id_usuario: 323 } });
console.log('Usuario 381 ahora (deberia ser null porque Prueba Cadete tenia id_usuario=11, no 381 - Orosco Cano tenia id_usuario=381 y NO fue tocado en Usuario table hasta este borrado que uso id_usuario=11):', orosco);
console.log('Usuario 323 ahora:', ricaldez);
const oroscoPorNombre = await p.usuario.findFirst({ where: { apellidos: 'Orosco Cano', nombres: 'Jose Miguel' } });
const ricaldezPorNombre = await p.usuario.findFirst({ where: { apellidos: 'Ricaldez Jaimes', nombres: 'Kevin' } });
console.log('Jose Miguel Orosco Cano buscado por nombre (debe existir):', oroscoPorNombre);
console.log('Kevin Ricaldez Jaimes buscado por nombre (debe existir):', ricaldezPorNombre);
if (oroscoPorNombre) {
  const cadeteOrosco = await p.cadete.findUnique({ where: { id_usuario: oroscoPorNombre.id_usuario } });
  const notasOrosco = await p.notaEvaluacion.count({ where: { id_cadete: cadeteOrosco.id_cadete } });
  console.log(`Notas de Orosco Cano (deberian seguir siendo 9, cargadas en Tercer Año): ${notasOrosco}`);
}
if (ricaldezPorNombre) {
  const cadeteRicaldez = await p.cadete.findUnique({ where: { id_usuario: ricaldezPorNombre.id_usuario } });
  const notasRicaldez = await p.notaEvaluacion.count({ where: { id_cadete: cadeteRicaldez.id_cadete } });
  console.log(`Notas de Ricaldez Jaimes (deberian seguir siendo 9, cargadas en Tercer Año): ${notasRicaldez}`);
}

await p.$disconnect();
