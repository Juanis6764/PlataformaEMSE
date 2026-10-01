/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
import {
  CanActivate,
  ExecutionContext,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  EstadoSemanaDisciplina,
  EstadoUsuario,
  NivelRevisionNota,
  TipoAsignacionAcademica,
} from '@prisma/client';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { JwtAuthGuard } from '../src/comun/guards/jwt-auth.guard';
import { PermisosGuard } from '../src/comun/guards/permisos.guard';
import { PrismaService } from '../src/prisma/prisma.service';

jest.setTimeout(30_000);

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

function sinAcentos(valor: string) {
  return valor
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();
}

describe('Evaluaciones - backend funcional (PostgreSQL aislado)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let operador: number;
  let operadorOtroCurso: number;
  let encargado: number;
  let seccionAcademica: number;
  let jefeEstudios: number;
  let comando: number;
  let idGestion: number;
  let idPeriodo: number;
  let idCurso: number;
  let otroCurso: number;
  let idMateria1: number;
  let idMateria2: number;
  let cadetes: Array<{
    id_cadete: number;
    id_usuario: number;
  }>;

  const api = (
    metodo: 'get' | 'post' | 'put' | 'patch' | 'delete',
    ruta: string,
    usuario: number,
  ) =>
    request(app.getHttpServer())
      [metodo](ruta)
      .set('x-test-user', String(usuario));

  beforeAll(async () => {
    const url = process.env.DATABASE_URL ?? '';
    if (/\/emse_db(?:\?|$)/i.test(url) || !/evaluaciones.*test/i.test(url)) {
      const baseDetectada = url ? new URL(url).pathname.slice(1) : 'sin URL';
      throw new Error(
        `Prueba cancelada: DATABASE_URL debe apuntar a una base exclusiva de Evaluaciones; se detectó ${baseDetectada}.`,
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

    await prisma.notificacion.deleteMany({ where: { area: 'EVALUACIONES' } });
    await prisma.notaEvaluacion.deleteMany();
    await prisma.materiaEvaluacion.deleteMany();
    await prisma.configuracionEvaluacionesPeriodo.deleteMany();
    await prisma.auditoriaAccion.deleteMany({
      where: { modulo: 'NOTAS_EVALUACIONES' },
    });
    expect(await prisma.configuracionEvaluacionesPeriodo.count()).toBe(0);
    expect(await prisma.materiaEvaluacion.count()).toBe(0);
    expect(await prisma.notaEvaluacion.count()).toBe(0);
    expect(
      await prisma.notificacion.count({ where: { area: 'EVALUACIONES' } }),
    ).toBe(0);

    const asignaciones = await prisma.asignacionAcademica.findMany({
      where: { activo: true },
      include: { seccion: true, curso: true },
    });
    const asignacionOperador = asignaciones.find(
      (item) =>
        item.tipo === TipoAsignacionAcademica.OPERADOR &&
        item.id_curso &&
        sinAcentos(item.seccion.nombre).includes('EVALUACIONES'),
    );
    const asignacionOtroOperador = asignaciones.find(
      (item) =>
        item.tipo === TipoAsignacionAcademica.OPERADOR &&
        item.id_curso &&
        item.id_curso !== asignacionOperador?.id_curso &&
        sinAcentos(item.seccion.nombre).includes('EVALUACIONES'),
    );
    const asignacionEncargado = asignaciones.find(
      (item) =>
        item.tipo === TipoAsignacionAcademica.RESPONSABLE &&
        sinAcentos(item.seccion.nombre).includes('EVALUACIONES'),
    );
    const asignacionSeccion = asignaciones.find((item) => {
      const seccion = sinAcentos(item.seccion.nombre);
      return (
        item.tipo === TipoAsignacionAcademica.RESPONSABLE &&
        (seccion.includes('JEFATURA') || seccion.includes('ACADEMICA'))
      );
    });
    const jefe = await prisma.usuarioPermiso.findFirst({
      where: {
        concedido: true,
        permiso: { nombre: 'MODIFICAR_NOTA_BLOQUEADA' },
      },
    });
    const usuarioComando = await prisma.usuario.findFirst({
      where: {
        estado: EstadoUsuario.ACTIVO,
        seccion: { nombre: 'COMANDO' },
      },
      orderBy: { id_usuario: 'asc' },
    });
    const periodo = await prisma.periodoLectivo.findFirst({
      where: { activo: true, gestion: { estado: 'ACTIVA' } },
      include: { gestion: true },
    });
    if (
      !asignacionOperador?.id_curso ||
      !asignacionOtroOperador?.id_curso ||
      !asignacionEncargado ||
      !asignacionSeccion ||
      !jefe ||
      !usuarioComando ||
      !periodo
    ) {
      throw new Error(
        'La copia aislada no contiene todos los actores reales de Evaluaciones.',
      );
    }
    operador = asignacionOperador.id_usuario;
    operadorOtroCurso = asignacionOtroOperador.id_usuario;
    encargado = asignacionEncargado.id_usuario;
    seccionAcademica = asignacionSeccion.id_usuario;
    jefeEstudios = jefe.id_usuario;
    comando = usuarioComando.id_usuario;
    idCurso = asignacionOperador.id_curso;
    otroCurso = asignacionOtroOperador.id_curso;
    idGestion = periodo.id_gestion;
    idPeriodo = periodo.id_periodo;
    cadetes = await prisma.cadete.findMany({
      where: { id_curso: idCurso },
      select: { id_cadete: true, id_usuario: true },
      orderBy: { id_cadete: 'asc' },
    });
    if (cadetes.length < 4) {
      throw new Error('El curso real no contiene suficientes cadetes.');
    }
  });

  it('permite configurar al Encargado y restringe al Operador a su curso', async () => {
    const configuracion = await api(
      'post',
      '/notas/evaluaciones/configuraciones',
      encargado,
    )
      .send({
        id_periodo: idPeriodo,
        id_curso: idCurso,
        cantidad_materias: 2,
      })
      .expect(201);
    expect(configuracion.body).toMatchObject({
      id_periodo: idPeriodo,
      id_curso: idCurso,
      cantidad_materias: 2,
      materias_registradas: 0,
    });
    expect(await prisma.materiaEvaluacion.count()).toBe(0);

    await api('post', '/notas/evaluaciones/configuraciones', operador)
      .send({
        id_periodo: idPeriodo,
        id_curso: idCurso,
        cantidad_materias: 3,
      })
      .expect(403);
    await api(
      'get',
      `/notas/evaluaciones/materias?id_periodo=${idPeriodo}&id_curso=${otroCurso}`,
      operador,
    ).expect(403);
    await api('post', '/notas/evaluaciones/materias', operador)
      .send({ id_periodo: idPeriodo, id_curso: otroCurso, nombre: 'TACTICA' })
      .expect(403);
    expect(operadorOtroCurso).toBeGreaterThan(0);
  });

  it('crea materias secuenciales, normaliza nombres y respeta el límite', async () => {
    const materia1 = await api('post', '/notas/evaluaciones/materias', operador)
      .send({
        id_periodo: idPeriodo,
        id_curso: idCurso,
        nombre: 'MATEMATICAS',
      })
      .expect(201);
    idMateria1 = materia1.body.id_materia;
    expect(materia1.body.numero_materia).toBe(1);

    await api('post', '/notas/evaluaciones/materias', operador)
      .send({
        id_periodo: idPeriodo,
        id_curso: idCurso,
        nombre: '  matemáticas  ',
      })
      .expect(409);

    const materia2 = await api('post', '/notas/evaluaciones/materias', operador)
      .send({
        id_periodo: idPeriodo,
        id_curso: idCurso,
        nombre: 'HISTORIA',
      })
      .expect(201);
    idMateria2 = materia2.body.id_materia;
    expect(materia2.body.numero_materia).toBe(2);

    await api('post', '/notas/evaluaciones/materias', operador)
      .send({
        id_periodo: idPeriodo,
        id_curso: idCurso,
        nombre: 'TACTICA',
      })
      .expect(400);
  });

  it('valida desquite, guarda avances y bloquea al Encargado', async () => {
    await api(
      'put',
      `/notas/evaluaciones/materias/${idMateria1}/notas`,
      operador,
    )
      .send({
        notas: [
          {
            id_cadete: cadetes[0].id_cadete,
            nota_inicial: '47',
            nota_desquite: '47',
          },
        ],
      })
      .expect(400);
    await api(
      'put',
      `/notas/evaluaciones/materias/${idMateria1}/notas`,
      operador,
    )
      .send({
        notas: [
          {
            id_cadete: cadetes[0].id_cadete,
            nota_inicial: '47',
            nota_desquite: '46',
          },
        ],
      })
      .expect(400);
    await api(
      'put',
      `/notas/evaluaciones/materias/${idMateria1}/notas`,
      operador,
    )
      .send({
        notas: [
          {
            id_cadete: cadetes[0].id_cadete,
            nota_inicial: '72',
            nota_desquite: '80',
          },
        ],
      })
      .expect(400);

    await api(
      'put',
      `/notas/evaluaciones/materias/${idMateria1}/notas`,
      operador,
    )
      .send({
        notas: [
          {
            id_cadete: cadetes[0].id_cadete,
            nota_inicial: '47',
            nota_desquite: '68',
          },
        ],
      })
      .expect(200);
    await api(
      'post',
      `/notas/evaluaciones/materias/${idMateria1}/enviar`,
      operador,
    ).expect(400);

    const notas = cadetes.map((cadete, indice) => ({
      id_cadete: cadete.id_cadete,
      nota_inicial:
        indice === 0 ? '47' : indice === 1 ? '91' : indice === 2 ? '82' : '60',
      nota_desquite: indice === 0 ? '68' : null,
    }));
    const guardado = await api(
      'put',
      `/notas/evaluaciones/materias/${idMateria1}/notas`,
      operador,
    )
      .send({ notas })
      .expect(200);
    expect(guardado.body).toMatchObject({
      notas_registradas: cadetes.length,
      notas_pendientes: 0,
      completo: true,
    });

    await api(
      'put',
      `/notas/evaluaciones/materias/${idMateria1}/notas`,
      encargado,
    )
      .send({ notas: [notas[0]] })
      .expect(403);
  });

  it('observa, corrige, reenvía y completa el flujo institucional', async () => {
    const enviada = await api(
      'post',
      `/notas/evaluaciones/materias/${idMateria1}/enviar`,
      operador,
    ).expect(201);
    expect(enviada.body).toMatchObject({
      estado: EstadoSemanaDisciplina.EN_REVISION,
      nivel_revision_actual: NivelRevisionNota.ENCARGADO_AREA,
    });

    await api(
      'post',
      `/notas/evaluaciones/materias/${idMateria1}/observar`,
      encargado,
    )
      .send({ comentario: '   ' })
      .expect(400);
    const observada = await api(
      'post',
      `/notas/evaluaciones/materias/${idMateria1}/observar`,
      encargado,
    )
      .send({ comentario: 'Verificar la fila de control.' })
      .expect(201);
    expect(observada.body.estado).toBe(EstadoSemanaDisciplina.OBSERVADO);

    await api(
      'put',
      `/notas/evaluaciones/materias/${idMateria1}/notas`,
      operador,
    )
      .send({
        notas: [
          {
            id_cadete: cadetes[3].id_cadete,
            nota_inicial: '61',
            nota_desquite: null,
          },
        ],
      })
      .expect(200);
    await api(
      'post',
      `/notas/evaluaciones/materias/${idMateria1}/enviar`,
      operador,
    ).expect(201);
    await api(
      'put',
      `/notas/evaluaciones/materias/${idMateria1}/notas`,
      operador,
    )
      .send({
        notas: [
          {
            id_cadete: cadetes[3].id_cadete,
            nota_inicial: '62',
            nota_desquite: null,
          },
        ],
      })
      .expect(409);

    await api(
      'post',
      `/notas/evaluaciones/materias/${idMateria1}/aprobar`,
      encargado,
    ).expect(201);
    await api(
      'post',
      `/notas/evaluaciones/materias/${idMateria1}/aprobar`,
      seccionAcademica,
    ).expect(201);
    await api(
      'post',
      `/notas/evaluaciones/materias/${idMateria1}/marcar-revisada`,
      jefeEstudios,
    ).expect(201);
    const publicada = await api(
      'post',
      `/notas/evaluaciones/materias/${idMateria1}/publicar`,
      encargado,
    ).expect(201);
    expect(publicada.body).toMatchObject({
      estado: EstadoSemanaDisciplina.PUBLICADO,
      nivel_revision_actual: null,
    });
  });

  it('deriva clasificación, orden y matriz parcial publicada', async () => {
    const detalle = await api(
      'get',
      `/notas/evaluaciones/materias/${idMateria1}`,
      encargado,
    ).expect(200);
    const fila47 = detalle.body.cadetes.find(
      (fila: any) => fila.id_cadete === cadetes[0].id_cadete,
    );
    const fila91 = detalle.body.cadetes.find(
      (fila: any) => fila.id_cadete === cadetes[1].id_cadete,
    );
    const fila82 = detalle.body.cadetes.find(
      (fila: any) => fila.id_cadete === cadetes[2].id_cadete,
    );
    expect(fila47).toMatchObject({
      nota_inicial: '47.0000',
      nota_desquite: '68.0000',
      nota_considerada: '68.0000',
      clasificacion: 'R',
      orden_merito: 3,
    });
    expect(fila91).toMatchObject({
      nota_considerada: '91.0000',
      clasificacion: 'MB',
      orden_merito: 1,
    });
    expect(fila82).toMatchObject({
      nota_considerada: '82.0000',
      clasificacion: 'B',
      orden_merito: 2,
    });

    const matriz = await api(
      'get',
      `/notas/evaluaciones/matriz?id_gestion=${idGestion}&id_periodo=${idPeriodo}&id_curso=${idCurso}`,
      comando,
    ).expect(200);
    expect(matriz.body).toMatchObject({
      materias_configuradas: 2,
      materias_publicadas: 1,
      completo: false,
    });
    const cadeteMatriz = matriz.body.cadetes.find(
      (fila: any) => fila.id_cadete === cadetes[0].id_cadete,
    );
    expect(cadeteMatriz).toMatchObject({
      promedio_parcial: '68.0000',
      promedio_final: null,
    });

    const propias = await api(
      'get',
      `/notas/evaluaciones/mis-notas?id_gestion=${idGestion}&id_periodo=${idPeriodo}`,
      cadetes[0].id_usuario,
    ).expect(200);
    expect(propias.body).toHaveLength(1);
    expect(propias.body[0]).toMatchObject({
      nombre: 'MATEMATICAS',
      nota_considerada: '68.0000',
      clasificacion: 'R',
      orden_merito: 3,
    });
    expect(
      Object.keys(propias.body[0] as Record<string, unknown>).sort(),
    ).toEqual(
      ['nombre', 'nota_considerada', 'clasificacion', 'orden_merito'].sort(),
    );
  });

  it('publica la segunda materia y habilita el resultado final', async () => {
    const notas = cadetes.map((cadete, indice) => ({
      id_cadete: cadete.id_cadete,
      nota_inicial:
        indice === 0 ? '80' : indice === 1 ? '81' : indice === 2 ? '90' : '60',
      nota_desquite: null,
    }));
    await api(
      'put',
      `/notas/evaluaciones/materias/${idMateria2}/notas`,
      operador,
    )
      .send({ notas })
      .expect(200);
    await api(
      'post',
      `/notas/evaluaciones/materias/${idMateria2}/enviar`,
      operador,
    ).expect(201);
    await api(
      'post',
      `/notas/evaluaciones/materias/${idMateria2}/aprobar`,
      encargado,
    ).expect(201);
    await api(
      'post',
      `/notas/evaluaciones/materias/${idMateria2}/aprobar`,
      seccionAcademica,
    ).expect(201);
    await api(
      'post',
      `/notas/evaluaciones/materias/${idMateria2}/marcar-revisada`,
      jefeEstudios,
    ).expect(201);
    await api(
      'post',
      `/notas/evaluaciones/materias/${idMateria2}/publicar`,
      encargado,
    ).expect(201);

    const resultados = await api(
      'get',
      `/notas/evaluaciones/resultados?id_gestion=${idGestion}&id_periodo=${idPeriodo}&id_curso=${idCurso}`,
      encargado,
    ).expect(200);
    expect(resultados.body).toMatchObject({
      materias_configuradas: 2,
      materias_publicadas: 2,
      completo: true,
    });
    const primero = resultados.body.cadetes.find(
      (fila: any) => fila.id_cadete === cadetes[0].id_cadete,
    );
    const segundo = resultados.body.cadetes.find(
      (fila: any) => fila.id_cadete === cadetes[1].id_cadete,
    );
    expect(primero).toMatchObject({
      promedio_parcial: '74.0000',
      nota_final_evaluaciones: '74.0000',
      clasificacion_final: 'B',
    });
    expect(segundo).toMatchObject({
      promedio_parcial: '86.0000',
      nota_final_evaluaciones: '86.0000',
      clasificacion_final: 'MB',
    });
  });

  it('permite modificación extraordinaria justificada y recalcula consultas', async () => {
    const nota = await prisma.notaEvaluacion.findUniqueOrThrow({
      where: {
        id_materia_id_cadete: {
          id_materia: idMateria1,
          id_cadete: cadetes[0].id_cadete,
        },
      },
    });
    await api(
      'patch',
      `/notas/evaluaciones/notas/${nota.id_nota}/extraordinaria`,
      jefeEstudios,
    )
      .send({ nota_desquite: '70' })
      .expect(400);
    const modificada = await api(
      'patch',
      `/notas/evaluaciones/notas/${nota.id_nota}/extraordinaria`,
      jefeEstudios,
    )
      .send({
        nota_desquite: '70',
        justificacion: 'Corrección extraordinaria respaldada por acta.',
      })
      .expect(200);
    expect(modificada.body).toMatchObject({
      nota_inicial: '47.0000',
      nota_desquite: '70.0000',
      nota_considerada: '70.0000',
      clasificacion: 'R',
    });
    expect(
      await prisma.materiaEvaluacion.findUnique({
        where: { id_materia: idMateria1 },
      }),
    ).toMatchObject({ estado: EstadoSemanaDisciplina.PUBLICADO });

    const resultados = await api(
      'get',
      `/notas/evaluaciones/resultados?id_gestion=${idGestion}&id_periodo=${idPeriodo}&id_curso=${idCurso}`,
      comando,
    ).expect(200);
    const primero = resultados.body.cadetes.find(
      (fila: any) => fila.id_cadete === cadetes[0].id_cadete,
    );
    expect(primero).toMatchObject({
      promedio_parcial: '75.0000',
      nota_final_evaluaciones: '75.0000',
    });
    const auditoria = await prisma.auditoriaAccion.findFirst({
      where: {
        modulo: 'NOTAS_EVALUACIONES',
        entidad: 'NotaEvaluacion',
        id_entidad: nota.id_nota,
        accion: 'MODIFICAR_NOTA_EVALUACION_BLOQUEADA',
      },
      orderBy: { id_auditoria: 'desc' },
    });
    expect(auditoria).toMatchObject({
      id_usuario: jefeEstudios,
      datos_antes: {
        nota_inicial: '47.0000',
        nota_desquite: '68.0000',
        nota_considerada: '68.0000',
      },
      datos_despues: {
        nota_inicial: '47.0000',
        nota_desquite: '70.0000',
        nota_considerada: '70.0000',
        justificacion: 'Corrección extraordinaria respaldada por acta.',
        estado_materia_conservado: EstadoSemanaDisciplina.PUBLICADO,
      },
    });
    expect(
      await prisma.notificacion.count({
        where: {
          area: 'EVALUACIONES',
          tipo: 'NOTA_EVALUACION_MODIFICADA_EXTRAORDINARIAMENTE',
        },
      }),
    ).toBeGreaterThan(0);
  });

  it('mantiene a Comando en consulta y registra el workflow en auditoría', async () => {
    await api('post', '/notas/evaluaciones/configuraciones', comando)
      .send({
        id_periodo: idPeriodo,
        id_curso: otroCurso,
        cantidad_materias: 2,
      })
      .expect(403);
    await api('post', '/notas/evaluaciones/materias', comando)
      .send({
        id_periodo: idPeriodo,
        id_curso: idCurso,
        nombre: 'NO PERMITIDA',
      })
      .expect(403);
    const materias = await api(
      'get',
      `/notas/evaluaciones/materias?id_periodo=${idPeriodo}&id_curso=${idCurso}`,
      comando,
    ).expect(200);
    expect(materias.body).toHaveLength(2);
    expect(
      await prisma.auditoriaAccion.count({
        where: {
          modulo: 'NOTAS_EVALUACIONES',
          entidad: 'MateriaEvaluacion',
          accion: {
            in: [
              'ENVIAR_MATERIA_EVALUACION',
              'APROBAR_MATERIA_EVALUACION',
              'MARCAR_MATERIA_EVALUACION_REVISADA',
              'PUBLICAR_MATERIA_EVALUACION',
            ],
          },
        },
      }),
    ).toBeGreaterThanOrEqual(8);
  });

  afterAll(async () => {
    if (app) await app.close();
  });
});
