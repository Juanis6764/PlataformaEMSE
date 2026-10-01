import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log("--- Búsqueda de Gestión Académica ---");
  const materia = await prisma.materiaEvaluacion.findFirst({
    where: {
      notas: { some: {} }
    },
    include: {
      periodo: {
        include: {
          gestion: true
        }
      },
      curso: true
    }
  });

  if (materia) {
    console.log(`id_gestion: ${materia.periodo.id_gestion} (Gestión ${materia.periodo.gestion.ano})`);
    console.log(`id_periodo: ${materia.id_periodo} (Periodo ${materia.periodo.periodo})`);
    console.log(`id_curso: ${materia.id_curso} (Curso ${materia.curso.nombre})`);
  } else {
    console.log("No se encontraron materias con notas.");
  }

  console.log("\n--- Búsqueda de Gestión Documental ---");
  // Try using the actual relation names, if 'trazabilidad' fails we can just query the raw table
  const doc = await prisma.$queryRaw`SELECT d.id_documento, d.asunto, (SELECT COUNT(*) FROM "MovimientoDocumento" md WHERE md.id_documento = d.id_documento) as movimientos FROM "Documento" d WHERE EXISTS (SELECT 1 FROM "MovimientoDocumento" md WHERE md.id_documento = d.id_documento) LIMIT 1`;
  
  if (Array.isArray(doc) && doc.length > 0) {
    console.log(`id_documento: ${doc[0].id_documento}`);
    console.log(`asunto: ${doc[0].asunto}`);
    console.log(`movimientos aproximados: ${Number(doc[0].movimientos)}`);
  } else {
    console.log("No se encontraron documentos con movimientos.");
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
