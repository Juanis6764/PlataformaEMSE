/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
import {
  CanActivate,
  ExecutionContext,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TipoAsignacionAcademica } from '@prisma/client';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { JwtAuthGuard } from '../src/comun/guards/jwt-auth.guard';
import { PermisosGuard } from '../src/comun/guards/permisos.guard';
import { PrismaService } from '../src/prisma/prisma.service';

jest.setTimeout(60_000);

class JwtPruebaGuard implements CanActivate {
  canActivate(contexto: ExecutionContext) {
    const solicitud = contexto.switchToHttp().getRequest();
    const idUsuario = Number(solicitud.headers['x-test-user']);
    if (!Number.isInteger(idUsuario) || idUsuario < 1) return false;
    solicitud.user = {
      id_usuario: idUsuario,
      rolId: 0,
      seccionId: null,
      primer_inicio: false,
      sid: 0,
    };
    return true;
  }
}

class PermisosPruebaGuard implements CanActivate {
  canActivate() {
    return true;
  }
}

describe('Entrenamiento Físico (PostgreSQL aislado)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let encargado: number;
  let seccion: number;
  let jefe: number;
  let comando: number;
  let encargadoEvaluaciones: number;
  let cadeteUsuario: number;
  let idGestion: number;
  let idPeriodo: number;
  let idCurso: number;
  let cadetes: number[];
  let idPlanilla: number;
  let primeraNota: number;

  const api = (
    metodo: 'get' | 'post' | 'put' | 'patch',
    ruta: string,
    usuario: number,
  ) =>
    request(app.getHttpServer())
      [metodo](ruta)
      .set('x-test-user', String(usuario));

  beforeAll(async () => {
    const url = process.env.DATABASE_URL ?? '';
    if (/\/emse_db(?:\?|$)/i.test(url) || !/entrenamiento.*test/i.test(url)) {
      const base = url ? new URL(url).pathname.slice(1) : 'sin URL';
      throw new Error(
        `Prueba cancelada: se requiere una base aislada de Entrenamiento; se detectó ${base}.`,
      );
    }
    const modulo: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideGuard(JwtAuthGuard)
      .useClass(JwtPruebaGuard)
      .overrideGuard(PermisosGuard)
      .useClass(PermisosPruebaGuard)
      .compile();
    app = modulo.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    await app.init();
    prisma = app.get(PrismaService);

    await prisma.notificacion.deleteMany({
      where: { area: 'ENTRENAMIENTO_FISICO' },
    });
    await prisma.auditoriaAccion.deleteMany({
      where: { modulo: 'NOTAS_ENTRENAMIENTO_FISICO' },
    });
    await prisma.notaEntrenamientoFisico.deleteMany();
    await prisma.planillaEntrenamientoFisico.deleteMany();

    const asignaciones = await prisma.asignacionAcademica.findMany({
      where: { activo: true },
      include: { seccion: true },
    });
    const responsableEntrenamiento = asignaciones.find(
      (item) =>
        item.tipo === TipoAsignacionAcademica.RESPONSABLE &&
        item.seccion.nombre.toUpperCase() === 'ENTRENAMIENTO_FISICO',
    );
    const responsableSeccion = asignaciones.find(
      (item) =>
        item.tipo === TipoAsignacionAcademica.RESPONSABLE &&
        item.seccion.nombre.toUpperCase() === 'JEFATURA_ESTUDIOS',
    );
    const responsableEvaluaciones = asignaciones.find(
      (item) =>
        item.tipo === TipoAsignacionAcademica.RESPONSABLE &&
        item.seccion.nombre.toUpperCase() === 'EVALUACIONES',
    );
    const jefeReal = await prisma.usuarioPermiso.findFirst({
      where: {
        concedido: true,
        permiso: { nombre: 'MODIFICAR_NOTA_BLOQUEADA' },
      },
    });
    const comandoReal = await prisma.usuario.findFirst({
      where: { habilitado: true, seccion: { nombre: 'COMANDO' } },
      orderBy: { id_usuario: 'asc' },
    });
    const periodo = await prisma.periodoLectivo.findFirst({
      where: { activo: true, gestion: { estado: 'ACTIVA' } },
      include: { gestion: true },
    });
    const curso = await prisma.curso.findFirst({
      where: { orden: 1 },
    });
    if (
      !responsableEntrenamiento ||
      !responsableSeccion ||
      !responsableEvaluaciones ||
      !jefeReal ||
      !comandoReal ||
      !periodo ||
      !curso
    ) {
      throw new Error(
        'La copia no contiene todos los actores institucionales.',
      );
    }
    encargado = responsableEntrenamiento.id_usuario;
    seccion = responsableSeccion.id_usuario;
    encargadoEvaluaciones = responsableEvaluaciones.id_usuario;
    jefe = jefeReal.id_usuario;
    comando = comandoReal.id_usuario;
    idGestion = periodo.id_gestion;
    idPeriodo = periodo.id_periodo;
    idCurso = curso.id_curso;
    const filasCadetes = await prisma.cadete.findMany({
      where: { id_curso: idCurso },
      select: { id_cadete: true, id_usuario: true },
      orderBy: { id_cadete: 'asc' },
    });
    cadetes = filasCadetes.map((item) => item.id_cadete);
    cadeteUsuario = filasCadetes[0]?.id_usuario;
    if (cadetes.length < 4 || !cadeteUsuario) {
      throw new Error('El curso no contiene suficientes cadetes reales.');
    }
  });

  it('conserva solo las dos tablas y concede permisos existentes al Encargado', async () => {
    expect(await prisma.planillaEntrenamientoFisico.count()).toBe(0);
    expect(await prisma.notaEntrenamientoFisico.count()).toBe(0);
    const permisos = await prisma.usuarioPermiso.findMany({
      where: {
        id_usuario: encargado,
        concedido: true,
        permiso: {
          nombre: { in: ['REGISTRAR_NOTAS', 'EDITAR_NOTAS', 'ENVIAR_NOTAS'] },
        },
      },
      include: { permiso: true },
    });
    expect(permisos.map((item) => item.permiso.nombre).sort()).toEqual([
      'EDITAR_NOTAS',
      'ENVIAR_NOTAS',
      'REGISTRAR_NOTAS',
    ]);
  });

  it('guarda parcialmente, persiste y presenta cuatro decimales', async () => {
    const guardada = await api(
      'put',
      '/notas/entrenamiento-fisico/planillas/notas',
      encargado,
    )
      .send({
        id_gestion: idGestion,
        id_periodo: idPeriodo,
        id_curso: idCurso,
        notas: [
          { id_cadete: cadetes[0], nota_final: '86.2' },
          { id_cadete: cadetes[1], nota_final: '100' },
          { id_cadete: cadetes[2], nota_final: '0' },
        ],
      })
      .expect(200);
    idPlanilla = guardada.body.planilla.id_planilla;
    primeraNota = guardada.body.cadetes.find(
      (item: { id_cadete: number }) => item.id_cadete === cadetes[0],
    ).id_nota;
    expect(guardada.body.resumen).toMatchObject({
      total_cadetes: cadetes.length,
      notas_registradas: 3,
      pendientes: cadetes.length - 3,
      completo: false,
    });
    expect(
      guardada.body.cadetes
        .filter((item: { id_cadete: number }) =>
          cadetes.slice(0, 3).includes(item.id_cadete),
        )
        .map((item: { nota_final: string }) => item.nota_final)
        .sort(),
    ).toEqual(['0.0000', '100.0000', '86.2000'].sort());
    expect(await prisma.notaEntrenamientoFisico.count()).toBe(cadetes.length);

    const recarga = await api(
      'get',
      `/notas/entrenamiento-fisico/planilla?id_gestion=${idGestion}&id_periodo=${idPeriodo}&id_curso=${idCurso}`,
      encargado,
    ).expect(200);
    expect(recarga.body.resumen.notas_registradas).toBe(3);

    await api(
      'post',
      `/notas/entrenamiento-fisico/planillas/${idPlanilla}/enviar`,
      encargado,
    ).expect(400);
  });

  it('completa, observa, corrige y recorre Sección Académica hasta Jefe', async () => {
    await api('put', '/notas/entrenamiento-fisico/planillas/notas', encargado)
      .send({
        id_gestion: idGestion,
        id_periodo: idPeriodo,
        id_curso: idCurso,
        notas: cadetes.slice(3).map((idCadete) => ({
          id_cadete: idCadete,
          nota_final: '91',
        })),
      })
      .expect(200);

    const enviada = await api(
      'post',
      `/notas/entrenamiento-fisico/planillas/${idPlanilla}/enviar`,
      encargado,
    ).expect(201);
    expect(enviada.body.planilla).toMatchObject({
      estado: 'EN_REVISION',
      nivel_revision_actual: 'SECCION_ACADEMICA',
    });

    await api(
      'post',
      `/notas/entrenamiento-fisico/planillas/${idPlanilla}/aprobar`,
      encargado,
    ).expect(403);
    const pendientesSeccion = await api(
      'get',
      '/notas/entrenamiento-fisico/planillas/pendientes',
      seccion,
    ).expect(200);
    expect(
      pendientesSeccion.body.some(
        (item: { id_planilla: number }) => item.id_planilla === idPlanilla,
      ),
    ).toBe(true);

    const observada = await api(
      'post',
      `/notas/entrenamiento-fisico/planillas/${idPlanilla}/observar`,
      seccion,
    )
      .send({ comentario: 'Corregir la primera calificación.' })
      .expect(201);
    expect(observada.body.planilla.estado).toBe('OBSERVADO');
    expect(observada.body.acciones.guardar).toBe(false);

    await api('put', '/notas/entrenamiento-fisico/planillas/notas', encargado)
      .send({
        id_gestion: idGestion,
        id_periodo: idPeriodo,
        id_curso: idCurso,
        notas: [{ id_cadete: cadetes[0], nota_final: '87.25' }],
      })
      .expect(200);
    await api(
      'post',
      `/notas/entrenamiento-fisico/planillas/${idPlanilla}/enviar`,
      encargado,
    ).expect(201);
    const aprobada = await api(
      'post',
      `/notas/entrenamiento-fisico/planillas/${idPlanilla}/aprobar`,
      seccion,
    ).expect(201);
    expect(aprobada.body.planilla).toMatchObject({
      estado: 'EN_REVISION',
      nivel_revision_actual: 'JEFE_ESTUDIOS',
    });
  });

  it('permite modificación extraordinaria auditada y revisión final', async () => {
    await api(
      'patch',
      `/notas/entrenamiento-fisico/notas/${primeraNota}/extraordinaria`,
      jefe,
    )
      .send({ nota_final: '74.55', justificacion: 'Corrección documentada.' })
      .expect(200)
      .expect(({ body }) => expect(body.nota_final).toBe('74.5500'));
    const auditoria = await prisma.auditoriaAccion.findFirst({
      where: {
        accion: 'MODIFICAR_NOTA_ENTRENAMIENTO_FISICO_BLOQUEADA',
        id_entidad: primeraNota,
      },
    });
    expect(auditoria?.datos_antes).toMatchObject({ nota_final: '87.2500' });
    expect(auditoria?.datos_despues).toMatchObject({
      nota_final: '74.5500',
      justificacion: 'Corrección documentada.',
    });

    const revisada = await api(
      'post',
      `/notas/entrenamiento-fisico/planillas/${idPlanilla}/marcar-revisada`,
      jefe,
    ).expect(201);
    expect(revisada.body.planilla).toMatchObject({
      estado: 'REVISADO',
      nivel_revision_actual: null,
    });
    expect(revisada.body.acciones.imprimir).toBe(true);
  });

  it('expone a COMANDO solo consulta y niega por completo al Cadete', async () => {
    const consulta = await api(
      'get',
      `/notas/entrenamiento-fisico/planilla?id_gestion=${idGestion}&id_periodo=${idPeriodo}&id_curso=${idCurso}`,
      comando,
    ).expect(200);
    expect(consulta.body.planilla.estado).toBe('REVISADO');
    expect(consulta.body.cadetes[0].nota_final).toMatch(/^\d{1,3}\.\d{4}$/);
    const acciones = consulta.body.acciones as Record<string, boolean>;
    expect(Object.values(acciones)).toEqual([
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      true,
    ]);

    await api('put', '/notas/entrenamiento-fisico/planillas/notas', comando)
      .send({
        id_gestion: idGestion,
        id_periodo: idPeriodo,
        id_curso: idCurso,
        notas: [{ id_cadete: cadetes[0], nota_final: '10' }],
      })
      .expect(403);
    await api(
      'get',
      `/notas/entrenamiento-fisico/planilla?id_gestion=${idGestion}&id_periodo=${idPeriodo}&id_curso=${idCurso}`,
      cadeteUsuario,
    ).expect(403);
  });

  it('envía una sola vez a Evaluaciones y entrega únicamente cuatro campos', async () => {
    const primero = await api(
      'post',
      `/notas/entrenamiento-fisico/planillas/${idPlanilla}/enviar-evaluaciones`,
      encargado,
    ).expect(201);
    expect(primero.body).toMatchObject({
      id_planilla: idPlanilla,
      cantidad: cadetes.length,
      ya_enviado: false,
    });
    const segundo = await api(
      'post',
      `/notas/entrenamiento-fisico/planillas/${idPlanilla}/enviar-evaluaciones`,
      encargado,
    ).expect(201);
    expect(segundo.body.ya_enviado).toBe(true);

    expect(
      await prisma.notificacion.count({
        where: {
          area: 'ENTRENAMIENTO_FISICO',
          tipo: 'NOTAS_FINALES_ENTRENAMIENTO_FISICO',
          id_referencia: idPlanilla,
        },
      }),
    ).toBe(1);
    expect(
      await prisma.auditoriaAccion.count({
        where: {
          accion: 'ENVIAR_RESULTADO_EVALUACIONES',
          id_entidad: idPlanilla,
        },
      }),
    ).toBe(1);

    const resultados = await api(
      'get',
      `/notas/entrenamiento-fisico/resultados-evaluaciones?id_planilla=${idPlanilla}`,
      encargadoEvaluaciones,
    ).expect(200);
    const filas = resultados.body as Array<{
      id_cadete: number;
      id_periodo: number;
      id_curso: number;
      nota_final_entrenamiento_fisico: string;
    }>;
    expect(filas).toHaveLength(cadetes.length);
    expect(Object.keys(filas[0]).sort()).toEqual(
      [
        'id_cadete',
        'id_periodo',
        'id_curso',
        'nota_final_entrenamiento_fisico',
      ].sort(),
    );
    expect(filas[0].nota_final_entrenamiento_fisico).toMatch(
      /^\d{1,3}\.\d{4}$/,
    );
    await api(
      'get',
      `/notas/entrenamiento-fisico/resultados-evaluaciones?id_planilla=${idPlanilla}`,
      comando,
    ).expect(403);
  });

  afterAll(async () => {
    await app?.close();
  });
});
