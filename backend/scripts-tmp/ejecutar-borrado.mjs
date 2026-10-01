import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const p = new PrismaClient({ adapter });

const resultados = [];

async function borrarCadeteYUsuario(id_usuario, esperado_nombres, esperado_apellidos, id_cadete) {
  const tag = `${esperado_apellidos} ${esperado_nombres} (Usuario ${id_usuario} / Cadete ${id_cadete})`;
  try {
    const out = await p.$transaction(async (tx) => {
      const u = await tx.usuario.findUnique({ where: { id_usuario } });
      if (!u || u.nombres !== esperado_nombres || u.apellidos !== esperado_apellidos) {
        throw new Error(`Verificacion en transaccion fallo para Usuario ${id_usuario}: encontrado ${JSON.stringify(u)}`);
      }
      const c = await tx.cadete.findUnique({ where: { id_cadete } });
      if (!c || c.id_usuario !== id_usuario) {
        throw new Error(`Verificacion en transaccion fallo para Cadete ${id_cadete}: encontrado ${JSON.stringify(c)}`);
      }

      const borrado = { tabla_cadete: 0, tabla_usuario: 0, notaEvaluacion: 0, historialCursoCadete: 0, registroDisciplina: 0, resultadoFinalDisciplina: 0, sesion: 0, refreshHistorico: 0, codigoVerificacion: 0, historialPassword: 0 };

      // Dependencias de Cadete (deben estar en 0 segun la investigacion previa; se verifica y borra si aplica, SOLO de este cadete)
      borrado.notaEvaluacion = (await tx.notaEvaluacion.deleteMany({ where: { id_cadete } })).count;
      borrado.historialCursoCadete = (await tx.historialCursoCadete.deleteMany({ where: { id_cadete } })).count;
      borrado.registroDisciplina = (await tx.registroDisciplina.deleteMany({ where: { id_cadete } })).count;
      borrado.resultadoFinalDisciplina = (await tx.resultadoFinalDisciplina.deleteMany({ where: { id_cadete } })).count;

      await tx.cadete.delete({ where: { id_cadete } });
      borrado.tabla_cadete = 1;

      // Dependencias de Usuario (Restrict): Sesion (cascada a RefreshHistorico), CodigoVerificacion
      const sesiones = await tx.sesion.findMany({ where: { id_usuario }, select: { id_sesion: true } });
      for (const s of sesiones) {
        borrado.refreshHistorico += (await tx.refreshHistorico.deleteMany({ where: { id_sesion: s.id_sesion } })).count;
      }
      borrado.sesion = (await tx.sesion.deleteMany({ where: { id_usuario } })).count;
      borrado.codigoVerificacion = (await tx.codigoVerificacion.deleteMany({ where: { id_usuario } })).count;
      // HistorialPassword tiene onDelete: Cascade -> se borra automaticamente al borrar Usuario
      borrado.historialPassword = (await tx.historialPassword.count({ where: { id_usuario } }));

      await tx.usuario.delete({ where: { id_usuario } });
      borrado.tabla_usuario = 1;

      return borrado;
    });
    resultados.push({ tag, ok: true, ...out });
    console.log(`OK: ${tag}`);
    console.log(JSON.stringify(out, null, 2));
  } catch (e) {
    resultados.push({ tag, ok: false, error: e.message });
    console.log(`ERROR: ${tag} -> ${e.message}`);
  }
}

async function borrarOperador(id_usuario, esperado_apellidos) {
  const tag = `Operador ${esperado_apellidos} (Usuario ${id_usuario})`;
  try {
    const out = await p.$transaction(async (tx) => {
      const u = await tx.usuario.findUnique({ where: { id_usuario } });
      if (!u || u.nombres !== 'Operador' || u.apellidos !== esperado_apellidos) {
        throw new Error(`Verificacion en transaccion fallo para Usuario ${id_usuario}: encontrado ${JSON.stringify(u)}`);
      }
      const rol = await tx.rol.findUnique({ where: { id_rol: u.id_rol } });
      if (!rol || rol.nombre !== 'OPERADOR') {
        throw new Error(`Usuario ${id_usuario} no tiene rol OPERADOR (rol actual: ${rol?.nombre}), abortando por seguridad.`);
      }
      const cadeteVinculado = await tx.cadete.count({ where: { id_usuario } });
      if (cadeteVinculado > 0) {
        throw new Error(`Usuario ${id_usuario} tiene un Cadete vinculado (no deberia, es una cuenta OPERADOR), abortando por seguridad.`);
      }

      const borrado = { tabla_usuario: 0, sesion: 0, refreshHistorico: 0, codigoVerificacion: 0, historialPassword: 0, auditoriaAccion: 0, asignacionAcademica: 0, logAcceso_desvinculados: 0 };

      const sesiones = await tx.sesion.findMany({ where: { id_usuario }, select: { id_sesion: true } });
      for (const s of sesiones) {
        borrado.refreshHistorico += (await tx.refreshHistorico.deleteMany({ where: { id_sesion: s.id_sesion } })).count;
      }
      borrado.sesion = (await tx.sesion.deleteMany({ where: { id_usuario } })).count;
      borrado.codigoVerificacion = (await tx.codigoVerificacion.deleteMany({ where: { id_usuario } })).count;
      borrado.auditoriaAccion = (await tx.auditoriaAccion.deleteMany({ where: { id_usuario } })).count;
      borrado.asignacionAcademica = (await tx.asignacionAcademica.deleteMany({ where: { id_usuario } })).count;
      borrado.historialPassword = (await tx.historialPassword.count({ where: { id_usuario } })); // se borra en cascada
      borrado.logAcceso_desvinculados = (await tx.logAcceso.count({ where: { id_usuario } })); // quedan, id_usuario -> NULL (ON DELETE SET NULL)

      await tx.usuario.delete({ where: { id_usuario } });
      borrado.tabla_usuario = 1;

      return borrado;
    });
    resultados.push({ tag, ok: true, ...out });
    console.log(`OK: ${tag}`);
    console.log(JSON.stringify(out, null, 2));
  } catch (e) {
    resultados.push({ tag, ok: false, error: e.message });
    console.log(`ERROR: ${tag} -> ${e.message}`);
  }
}

await borrarCadeteYUsuario(11, 'Cadete', 'Prueba', 381);
await borrarCadeteYUsuario(336, 'Andrea', 'Laura Zambrana', 323);
await borrarOperador(1847, 'Entrenamiento Físico Primer Año');
await borrarOperador(1848, 'Entrenamiento Físico Segundo Año');
await borrarOperador(1849, 'Entrenamiento Físico Tercer Año');

console.log('\n=== RESUMEN ===');
console.log(JSON.stringify(resultados, null, 2));

await p.$disconnect();
