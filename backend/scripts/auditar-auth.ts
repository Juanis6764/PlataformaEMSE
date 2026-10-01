import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  try {
    const usuarios = await prisma.usuario.findMany({
      where: {
        OR: [
          { ci: { in: ['9477023', '100001'] } },
          { correo: 'juanis6764@gmail.com' },
        ],
      },
      include: { rol: true },
    });
    const cadetes = await prisma.cadete.count();
    const resultado = usuarios.map((usuario) => ({
      id_usuario: usuario.id_usuario,
      ci: usuario.ci,
      correo: usuario.correo,
      rol: usuario.rol.nombre,
      estado: usuario.estado,
      primer_inicio: usuario.primer_inicio,
      hash_bcrypt_valido: /^\$2[aby]\$\d{2}\$.{53}$/.test(usuario.contrasena),
      costo_bcrypt: /^\$2[aby]\$(\d{2})\$/.exec(usuario.contrasena)?.[1] ?? null,
    }));
    console.log(JSON.stringify({ cadetes, usuarios: resultado }, null, 2));
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Error de auditoría.');
  process.exitCode = 1;
});
