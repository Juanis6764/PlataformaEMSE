import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const CI_ADMIN = '9477023';

async function leerSecreto(prompt: string): Promise<string> {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error('La recuperación requiere una terminal interactiva.');
  }

  process.stdout.write(prompt);
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.setEncoding('utf8');

  return new Promise((resolve, reject) => {
    let value = '';
    const cleanup = () => {
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdin.removeListener('data', onData);
      process.stdout.write('\n');
    };
    const onData = (key: string) => {
      if (key === '\r' || key === '\n') {
        cleanup();
        resolve(value);
      } else if (key === '\u0003') {
        cleanup();
        reject(new Error('Operación cancelada.'));
      } else if (key === '\u007f' || key === '\b') {
        value = value.slice(0, -1);
      } else if (/^[\x20-\x7E]$/.test(key)) {
        value += key;
      }
    };
    process.stdin.on('data', onData);
  });
}

async function main() {
  const primera = await leerSecreto('Nueva contraseña temporal (entrada oculta): ');
  const segunda = await leerSecreto('Confirme la contraseña (entrada oculta): ');

  if (primera !== segunda) throw new Error('Las contraseñas no coinciden.');
  if (primera.length < 8) throw new Error('Debe tener al menos 8 caracteres.');
  if (/^\$2[aby]\$/.test(primera)) {
    throw new Error('Ingrese una contraseña, no un hash bcrypt.');
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  try {
    const administradores = await prisma.usuario.findMany({
      where: { OR: [{ ci: CI_ADMIN }, { correo: 'juanis6764@gmail.com' }] },
      include: { rol: true },
    });
    const admin = administradores.find(
      (usuario) => usuario.ci === CI_ADMIN && usuario.rol.nombre === 'ADMIN',
    );
    if (!admin) throw new Error('No se encontró al administrador oficial con rol ADMIN.');
    if (administradores.length !== 1) {
      throw new Error('Hay usuarios duplicados por CI/correo; no se modificó ninguno.');
    }

    const hash = await bcrypt.hash(primera, 12);
    await prisma.$transaction([
      prisma.usuario.update({
        where: { id_usuario: admin.id_usuario },
        data: { contrasena: hash, primer_inicio: true, estado: 'ACTIVO' },
      }),
      prisma.sesion.updateMany({
        where: { id_usuario: admin.id_usuario, activa: true },
        data: { activa: false, estado: false, fecha_cierre: new Date(), motivo_cierre: 'RECUPERACION_CREDENCIAL' },
      }),
      prisma.codigoVerificacion.updateMany({
        where: { id_usuario: admin.id_usuario, usado: false },
        data: { usado: true },
      }),
    ]);
    console.log('Recuperación aplicada: hash bcrypt, estado ACTIVO y primer_inicio=true.');
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Error de recuperación.');
  process.exitCode = 1;
});
