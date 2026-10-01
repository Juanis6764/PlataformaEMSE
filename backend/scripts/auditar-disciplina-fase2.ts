import { PrismaService } from '../src/prisma/prisma.service';
import { TipoAsignacionAcademica } from '@prisma/client';

async function auditar() {
  const prisma = new PrismaService();
  await prisma.$connect();
  try {
    const [
      configuraciones,
      oficiales,
      catalogos,
      semanas,
      registros,
      notificaciones,
      historialAcademico,
      usuarios,
      cadetes,
      distribucionCadetes,
      cursos,
      periodos,
      permisosOperativosResponsable,
      encargadosConConfiguracion,
      registrosDetalle,
      semanasDetalle,
      responsablesEvaluaciones,
      comandoConLectura,
    ] = await Promise.all([
      prisma.configuracionDisciplinaPeriodo.count(),
      prisma.oficialDisciplina.count(),
      prisma.catalogoDisciplina.count(),
      prisma.semanaDisciplina.count(),
      prisma.registroDisciplina.count(),
      prisma.notificacion.count(),
      prisma.historialCursoCadete.count(),
      prisma.usuario.count(),
      prisma.cadete.count(),
      prisma.cadete.groupBy({ by: ['id_curso'], _count: { _all: true } }),
      prisma.curso.findMany({
        select: { id_curso: true, nombre: true },
        orderBy: { orden: 'asc' },
      }),
      prisma.periodoLectivo.findMany({
        include: { gestion: { select: { ano: true } } },
        orderBy: [{ gestion: { ano: 'asc' } }, { periodo: 'asc' }],
      }),
      prisma.rolPermiso.count({
        where: {
          rol: { nombre: 'RESPONSABLE' },
          permiso: {
            nombre: {
              in: ['REGISTRAR_NOTAS', 'EDITAR_NOTAS', 'ENVIAR_NOTAS'],
            },
          },
        },
      }),
      prisma.usuarioPermiso.count({
        where: {
          concedido: true,
          permiso: { nombre: 'CONFIGURAR_DISCIPLINA' },
          usuario: {
            asignaciones_academicas: {
              some: {
                activo: true,
                tipo: TipoAsignacionAcademica.RESPONSABLE,
                seccion: {
                  nombre: { contains: 'DISCIPLINA', mode: 'insensitive' },
                },
              },
            },
          },
        },
      }),
      prisma.registroDisciplina.findMany({
        select: {
          id_oficial: true,
          nombre_responsable_manual: true,
          fecha_hecho: true,
          catalogo: { select: { tipo: true } },
        },
      }),
      prisma.semanaDisciplina.findMany({
        select: {
          id_periodo: true,
          id_curso: true,
          numero_semana: true,
          estado: true,
        },
        orderBy: [
          { id_periodo: 'asc' },
          { id_curso: 'asc' },
          { numero_semana: 'asc' },
        ],
      }),
      prisma.asignacionAcademica.count({
        where: {
          activo: true,
          tipo: TipoAsignacionAcademica.RESPONSABLE,
          seccion: {
            nombre: { contains: 'EVALUACIONES', mode: 'insensitive' },
          },
        },
      }),
      prisma.usuarioPermiso.count({
        where: {
          concedido: true,
          permiso: { nombre: 'VER_NOTAS' },
          usuario: {
            seccion: {
              nombre: { contains: 'COMANDO', mode: 'insensitive' },
            },
          },
        },
      }),
    ]);
    const [tablaResultadoFinal] = await prisma.$queryRaw<
      Array<{ existe: boolean }>
    >`SELECT to_regclass('public."ResultadoFinalDisciplina"') IS NOT NULL AS existe`;
    const resultadosFinales = tablaResultadoFinal?.existe
      ? Number(
          (
            await prisma.$queryRaw<Array<{ total: bigint }>>`
              SELECT COUNT(*) AS total FROM "ResultadoFinalDisciplina"
            `
          )[0]?.total ?? 0,
        )
      : null;

    console.log(
      JSON.stringify(
        {
          base: new URL(process.env.DATABASE_URL ?? '').pathname.slice(1),
          disciplina: {
            ConfiguracionDisciplinaPeriodo: configuraciones,
            OficialDisciplina: oficiales,
            CatalogoDisciplina: catalogos,
            SemanaDisciplina: semanas,
            RegistroDisciplina: registros,
            ResultadoFinalDisciplina: resultadosFinales,
            Notificacion: notificaciones,
          },
          HistorialCursoCadete: historialAcademico,
          PermisosDisciplina: {
            ResponsableConPermisosOperativos: permisosOperativosResponsable,
            EncargadosConConfiguracion: encargadosConConfiguracion,
            ComandoConLectura: comandoConLectura,
          },
          DetalleRegistrosDisciplina: {
            Meritos: registrosDetalle.filter(
              (registro) => registro.catalogo.tipo === 'MERITO',
            ).length,
            Demeritos: registrosDetalle.filter(
              (registro) => registro.catalogo.tipo === 'DEMERITO',
            ).length,
            SinResponsable: registrosDetalle.filter(
              (registro) =>
                !registro.id_oficial && !registro.nombre_responsable_manual,
            ).length,
            SinFecha: registrosDetalle.filter(
              (registro) => !registro.fecha_hecho,
            ).length,
          },
          SemanasDisciplina: semanasDetalle,
          ResponsablesEvaluaciones: responsablesEvaluaciones,
          Usuario: usuarios,
          Cadete: cadetes,
          DistribucionCadetes: distribucionCadetes.map((fila) => ({
            curso:
              cursos.find((curso) => curso.id_curso === fila.id_curso)
                ?.nombre ?? fila.id_curso,
            cantidad: fila._count._all,
          })),
          PeriodoLectivo: periodos.map((periodo) => ({
            id_periodo: periodo.id_periodo,
            gestion: periodo.gestion.ano,
            periodo: periodo.periodo,
            activo: periodo.activo,
          })),
        },
        null,
        2,
      ),
    );
  } finally {
    await prisma.$disconnect();
  }
}

void auditar();
