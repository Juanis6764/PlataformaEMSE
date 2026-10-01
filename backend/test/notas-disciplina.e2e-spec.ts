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
  TipoDisciplina,
} from '@prisma/client';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { JwtAuthGuard } from '../src/comun/guards/jwt-auth.guard';
import { PermisosGuard } from '../src/comun/guards/permisos.guard';
import { PrismaService } from '../src/prisma/prisma.service';

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

describe('Disciplina - flujo completo Semana 1 (PostgreSQL aislado)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let operador: number;
  let encargado: number;
  let comando: number;
  let administrador: number;
  let seccionAcademica: number;
  let jefeEstudios: number;
  let cadeteUsuario: number;
  let otroCadeteUsuario: number;
  let cadeteOtroCurso: number;
  let idCadete: number;
  let idCurso: number;
  let otroCurso: number;
  let idGestion: number;
  let gestion: number;
  let idPeriodo: number;
  let idSemana: number;
  let idMeritoRegistro: number;
  let idOficial: number;
  let idDemerito: number;
  let idMerito: number;

  const api = (
    metodo: 'get' | 'post' | 'patch' | 'delete',
    ruta: string,
    usuario: number,
  ) =>
    request(app.getHttpServer())
      [metodo](ruta)
      .set('x-test-user', String(usuario));

  beforeAll(async () => {
    const url = process.env.DATABASE_URL ?? '';
    if (/\/emse_db(?:\?|$)/i.test(url) || !/disciplina.*test/i.test(url)) {
      const baseDetectada = url ? new URL(url).pathname.slice(1) : 'sin URL';
      throw new Error(
        `Prueba cancelada: DATABASE_URL debe apuntar a una base exclusiva de Disciplina; se detectó ${baseDetectada}.`,
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

    // Esta limpieza ocurre exclusivamente en la copia cuyo nombre fue
    // validado arriba. Nunca se ejecuta sobre emse_db.
    await prisma.notificacion.deleteMany({ where: { area: 'DISCIPLINA' } });
    await prisma.resultadoFinalDisciplina.deleteMany();
    await prisma.registroDisciplina.deleteMany();
    await prisma.semanaDisciplina.deleteMany();
    await prisma.configuracionDisciplinaPeriodo.deleteMany();
    await prisma.catalogoDisciplina.deleteMany();
    await prisma.oficialDisciplina.deleteMany();
    await prisma.auditoriaAccion.deleteMany({
      where: { modulo: 'NOTAS_DISCIPLINA' },
    });

    expect(await prisma.configuracionDisciplinaPeriodo.count()).toBe(0);
    expect(await prisma.oficialDisciplina.count()).toBe(0);
    expect(await prisma.catalogoDisciplina.count()).toBe(0);
    expect(await prisma.semanaDisciplina.count()).toBe(0);
    expect(await prisma.registroDisciplina.count()).toBe(0);
    expect(await prisma.resultadoFinalDisciplina.count()).toBe(0);
    expect(
      await prisma.notificacion.count({ where: { area: 'DISCIPLINA' } }),
    ).toBe(0);
    expect(await prisma.historialCursoCadete.count()).toBe(0);

    const asignaciones = await prisma.asignacionAcademica.findMany({
      where: { activo: true },
      include: { seccion: true },
    });
    const asignacionOperador = asignaciones.find(
      (item) =>
        item.tipo === TipoAsignacionAcademica.OPERADOR &&
        item.id_curso &&
        sinAcentos(item.seccion.nombre).includes('DISCIPLINA'),
    );
    const asignacionEncargado = asignaciones.find(
      (item) =>
        item.tipo === TipoAsignacionAcademica.RESPONSABLE &&
        sinAcentos(item.seccion.nombre).includes('DISCIPLINA'),
    );
    const asignacionSeccion = asignaciones.find((item) => {
      const seccion = sinAcentos(item.seccion.nombre);
      return (
        item.tipo === TipoAsignacionAcademica.RESPONSABLE &&
        !seccion.includes('DISCIPLINA') &&
        (seccion.includes('JEFATURA') || seccion.includes('ACADEMICA'))
      );
    });
    const jefe = await prisma.usuarioPermiso.findFirst({
      where: {
        concedido: true,
        permiso: { nombre: 'MARCAR_NOTAS_REVISADAS' },
      },
    });
    const usuarioComando = await prisma.usuario.findFirst({
      where: {
        estado: EstadoUsuario.ACTIVO,
        seccion: { nombre: { contains: 'COMANDO', mode: 'insensitive' } },
      },
      orderBy: { id_usuario: 'asc' },
    });
    const usuarioAdministrador = await prisma.usuario.findFirst({
      where: {
        estado: EstadoUsuario.ACTIVO,
        rol: { nombre: 'ADMINISTRADOR' },
      },
      orderBy: { id_usuario: 'asc' },
    });
    const periodo = await prisma.periodoLectivo.findFirst({
      where: { activo: true, gestion: { estado: 'ACTIVA' } },
      include: { gestion: true },
    });
    if (
      !asignacionOperador?.id_curso ||
      !asignacionEncargado ||
      !asignacionSeccion ||
      !jefe ||
      !usuarioComando ||
      !usuarioAdministrador ||
      !periodo
    ) {
      throw new Error(
        'La copia de pruebas no contiene los actores reales requeridos.',
      );
    }
    const cadetes = await prisma.cadete.findMany({
      where: { id_curso: asignacionOperador.id_curso },
      take: 2,
      orderBy: { id_cadete: 'asc' },
    });
    const cursoAlterno = await prisma.curso.findFirst({
      where: {
        id_curso: { not: asignacionOperador.id_curso },
        orden: { lte: 3 },
      },
    });
    if (cadetes.length < 2 || !cursoAlterno) {
      throw new Error(
        'La copia de pruebas no contiene cadetes/cursos suficientes.',
      );
    }
    const cadeteAlterno = await prisma.cadete.findFirst({
      where: { id_curso: cursoAlterno.id_curso },
      orderBy: { id_cadete: 'asc' },
    });
    if (!cadeteAlterno) {
      throw new Error('El curso alterno no contiene cadetes.');
    }

    operador = asignacionOperador.id_usuario;
    encargado = asignacionEncargado.id_usuario;
    seccionAcademica = asignacionSeccion.id_usuario;
    jefeEstudios = jefe.id_usuario;
    comando = usuarioComando.id_usuario;
    administrador = usuarioAdministrador.id_usuario;
    idCurso = asignacionOperador.id_curso;
    otroCurso = cursoAlterno.id_curso;
    cadeteOtroCurso = cadeteAlterno.id_cadete;
    idCadete = cadetes[0].id_cadete;
    cadeteUsuario = cadetes[0].id_usuario;
    otroCadeteUsuario = cadetes[1].id_usuario;
    idPeriodo = periodo.id_periodo;
    idGestion = periodo.id_gestion;
    gestion = periodo.gestion.ano;
  });

  it('configura datos reales de prueba solo dentro de la base aislada', async () => {
    await api('post', '/notas/disciplina/configuraciones', encargado)
      .send({ id_periodo: idPeriodo, id_curso: idCurso, cantidad_semanas: 22 })
      .expect(201);

    const oficial = await api('post', '/notas/disciplina/oficiales', encargado)
      .send({
        codigo: 'OF-TEST-01',
        nombre_completo: 'Responsable de prueba aislada',
      })
      .expect(201);
    expect(oficial.body.activo).toBe(true);

    const demerito = await api('post', '/notas/disciplina/catalogos', encargado)
      .send({
        tipo: TipoDisciplina.DEMERITO,
        codigo: 'DEM-TEST-06',
        nombre: 'Demérito de prueba aislada',
        puntaje_base: '6',
      })
      .expect(201);
    expect(demerito.body.puntaje_base).toBe('6.0000');

    const merito = await api('post', '/notas/disciplina/catalogos', encargado)
      .send({
        tipo: TipoDisciplina.MERITO,
        codigo: 'MER-TEST',
        nombre: 'Mérito de prueba aislada',
      })
      .expect(201);
    expect(merito.body.puntaje_base).toBeNull();

    idOficial = oficial.body.id_oficial;
    idDemerito = demerito.body.id_catalogo;
    idMerito = merito.body.id_catalogo;
  });

  it('limita al Operador a su curso y le impide habilitar semanas', async () => {
    const contextoOperador = await api(
      'get',
      '/notas/disciplina/contexto',
      operador,
    ).expect(200);
    expect(contextoOperador.body.perfil).toBe('OPERADOR_DISCIPLINA');
    expect(contextoOperador.body.cursos).toHaveLength(1);
    expect(contextoOperador.body.cursos[0].id_curso).toBe(idCurso);

    await api('post', '/notas/disciplina/semanas', operador)
      .send({ id_periodo: idPeriodo, id_curso: otroCurso, numero_semana: 1 })
      .expect(403);
    await api('post', '/notas/disciplina/semanas', operador)
      .send({ id_periodo: idPeriodo, id_curso: idCurso, numero_semana: 3 })
      .expect(403);
  });

  it('el Encargado habilita Semana 1 y el Operador persiste mÃ©ritos y demÃ©ritos', async () => {
    const semana = await api('post', '/notas/disciplina/semanas', encargado)
      .send({ id_periodo: idPeriodo, id_curso: idCurso, numero_semana: 1 })
      .expect(201);
    idSemana = semana.body.id_semana;
    expect(semana.body.estado).toBe(EstadoSemanaDisciplina.BORRADOR);

    for (const usuario of [operador, comando, seccionAcademica, jefeEstudios]) {
      const visibles = await api(
        'get',
        `/notas/disciplina/semanas?id_periodo=${idPeriodo}&id_curso=${idCurso}`,
        usuario,
      ).expect(200);
      expect(
        visibles.body.some(
          (item: { id_semana: number }) => item.id_semana === idSemana,
        ),
      ).toBe(true);
    }

    await api(
      'post',
      `/notas/disciplina/semanas/${idSemana}/registros`,
      operador,
    )
      .send({
        id_cadete: idCadete,
        id_catalogo: idDemerito,
        id_oficial: idOficial,
        nombre_responsable_manual: 'No permitido junto al oficial',
        fecha_hecho: `${gestion}-03-01`,
      })
      .expect(400);

    for (const dia of ['01', '02', '03']) {
      const respuesta = await api(
        'post',
        `/notas/disciplina/semanas/${idSemana}/registros`,
        operador,
      )
        .send({
          id_cadete: idCadete,
          id_catalogo: idDemerito,
          id_oficial: idOficial,
          fecha_hecho: `${gestion}-03-${dia}`,
        })
        .expect(201);
      expect(respuesta.body.puntaje).toBe('6.0000');
    }
    const merito = await api(
      'post',
      `/notas/disciplina/semanas/${idSemana}/registros`,
      operador,
    )
      .send({
        id_cadete: idCadete,
        id_catalogo: idMerito,
        puntaje: '2',
      })
      .expect(201);
    idMeritoRegistro = merito.body.id_registro;
    expect(merito.body).toMatchObject({
      id_oficial: null,
      nombre_responsable_manual: null,
      fecha_hecho: null,
      observacion: null,
      puntaje: '2.0000',
    });

    expect(
      await prisma.registroDisciplina.count({
        where: { id_semana: idSemana },
      }),
    ).toBe(4);
    const recarga = await api(
      'get',
      `/notas/disciplina/semanas/${idSemana}`,
      operador,
    ).expect(200);
    expect(recarga.body.registros).toHaveLength(4);
    expect(
      recarga.body.registros.some(
        (item: any) =>
          item.catalogo.tipo === TipoDisciplina.DEMERITO &&
          item.puntaje === '6.0000',
      ),
    ).toBe(true);
    expect(
      recarga.body.registros.some(
        (item: any) =>
          item.catalogo.tipo === TipoDisciplina.MERITO &&
          item.puntaje === '2.0000',
      ),
    ).toBe(true);
    expect(
      recarga.body.cadetes.find((item: any) => item.id_cadete === idCadete),
    ).toMatchObject({ tiene_registros: true });
  });

  it('observa, corrige, reenvía y bloquea edición después del envío', async () => {
    const enviada = await api(
      'post',
      `/notas/disciplina/semanas/${idSemana}/enviar`,
      operador,
    ).expect(201);
    expect(enviada.body.nivel_revision_actual).toBe(
      NivelRevisionNota.ENCARGADO_AREA,
    );

    await api(
      'patch',
      `/notas/disciplina/registros/${idMeritoRegistro}`,
      operador,
    )
      .send({ observacion: 'No debe editarse enviada' })
      .expect(409);
    await api(
      'post',
      `/notas/disciplina/semanas/${idSemana}/observar`,
      encargado,
    )
      .send({})
      .expect(400);
    const observada = await api(
      'post',
      `/notas/disciplina/semanas/${idSemana}/observar`,
      encargado,
    )
      .send({ comentario: 'Corregir la referencia del mérito.' })
      .expect(201);
    expect(observada.body.estado).toBe(EstadoSemanaDisciplina.OBSERVADO);

    await api(
      'patch',
      `/notas/disciplina/registros/${idMeritoRegistro}`,
      operador,
    )
      .send({ observacion: 'Referencia corregida.' })
      .expect(200);
    const reenviada = await api(
      'post',
      `/notas/disciplina/semanas/${idSemana}/enviar`,
      operador,
    ).expect(201);
    expect(reenviada.body.nivel_revision_actual).toBe(
      NivelRevisionNota.ENCARGADO_AREA,
    );
  });

  it('completa Encargado → Sección → Jefe → publicación exclusiva', async () => {
    await api(
      'post',
      `/notas/disciplina/semanas/${idSemana}/aprobar`,
      operador,
    ).expect(403);
    const seccion = await api(
      'post',
      `/notas/disciplina/semanas/${idSemana}/aprobar`,
      encargado,
    ).expect(201);
    expect(seccion.body.nivel_revision_actual).toBe(
      NivelRevisionNota.SECCION_ACADEMICA,
    );
    const jefe = await api(
      'post',
      `/notas/disciplina/semanas/${idSemana}/aprobar`,
      seccionAcademica,
    ).expect(201);
    expect(jefe.body.nivel_revision_actual).toBe(
      NivelRevisionNota.JEFE_ESTUDIOS,
    );
    const revisada = await api(
      'post',
      `/notas/disciplina/semanas/${idSemana}/marcar-revisada`,
      jefeEstudios,
    ).expect(201);
    expect(revisada.body.estado).toBe(EstadoSemanaDisciplina.REVISADO);

    await api(
      'post',
      `/notas/disciplina/semanas/${idSemana}/publicar`,
      seccionAcademica,
    ).expect(403);
    const publicada = await api(
      'post',
      `/notas/disciplina/semanas/${idSemana}/publicar`,
      encargado,
    ).expect(201);
    expect(publicada.body.estado).toBe(EstadoSemanaDisciplina.PUBLICADO);

    const notificacionesAntes = await prisma.notificacion.count({
      where: { id_referencia: idSemana },
    });
    await api(
      'post',
      `/notas/disciplina/semanas/${idSemana}/publicar`,
      encargado,
    ).expect(409);
    expect(
      await prisma.notificacion.count({ where: { id_referencia: idSemana } }),
    ).toBe(notificacionesAntes);
  });

  it('calcula 18/2 solo con PUBLICADO e incluye cadetes sin registros', async () => {
    const respuesta = await api(
      'get',
      `/notas/disciplina/acumulado?id_gestion=${idGestion}&id_periodo=${idPeriodo}&id_curso=${idCurso}`,
      encargado,
    ).expect(200);
    const conRegistros = respuesta.body.cadetes.find(
      (item: any) => item.id_cadete === idCadete,
    );
    expect(respuesta.body).toMatchObject({
      semanas_configuradas: 22,
      semanas_publicadas: 1,
      completo: false,
    });
    expect(conRegistros).toMatchObject({
      total_demeritos: '18.0000',
      total_meritos: '2.0000',
      demerito_neto: '16.0000',
      descuento: '15.6800',
      nota: '84.3200',
      alerta: false,
    });
    expect(
      respuesta.body.cadetes.some(
        (item: any) => item.id_cadete !== idCadete && item.nota === '100.0000',
      ),
    ).toBe(true);
  });

  it('mantiene bloqueado el resultado final con 21 de 22 semanas', async () => {
    await prisma.semanaDisciplina.createMany({
      data: Array.from({ length: 20 }, (_, indice) => ({
        id_periodo: idPeriodo,
        id_curso: idCurso,
        numero_semana: indice + 2,
        estado: EstadoSemanaDisciplina.PUBLICADO,
        id_creador: encargado,
        id_ultimo_responsable: operador,
        fecha_publicacion: new Date(),
      })),
    });
    const seleccion = `id_gestion=${idGestion}&id_periodo=${idPeriodo}&id_curso=${idCurso}`;
    const incompleto = await api(
      'get',
      `/notas/disciplina/resultados-finales?${seleccion}`,
      encargado,
    ).expect(200);
    expect(incompleto.body).toMatchObject({
      semanas_configuradas: 22,
      semanas_existentes: 21,
      semanas_publicadas: 21,
      completo: false,
      publicado: false,
      puede_publicar: false,
      puede_enviar_evaluaciones: false,
      filas: [],
    });
    await api(
      'post',
      '/notas/disciplina/resultados-finales/publicar',
      encargado,
    )
      .send({
        id_gestion: idGestion,
        id_periodo: idPeriodo,
        id_curso: idCurso,
      })
      .expect(409);
  });

  it('publica 22 de 22, persiste el snapshot y lo envía una sola vez a Evaluaciones', async () => {
    await prisma.semanaDisciplina.create({
      data: {
        id_periodo: idPeriodo,
        id_curso: idCurso,
        numero_semana: 22,
        estado: EstadoSemanaDisciplina.PUBLICADO,
        id_creador: encargado,
        id_ultimo_responsable: operador,
        fecha_publicacion: new Date(),
      },
    });
    const dto = {
      id_gestion: idGestion,
      id_periodo: idPeriodo,
      id_curso: idCurso,
    };
    const disponible = await api(
      'get',
      `/notas/disciplina/resultados-finales?id_gestion=${idGestion}&id_periodo=${idPeriodo}&id_curso=${idCurso}`,
      encargado,
    ).expect(200);
    expect(disponible.body).toMatchObject({
      semanas_configuradas: 22,
      semanas_existentes: 22,
      semanas_publicadas: 22,
      completo: true,
      publicado: false,
      puede_publicar: true,
      puede_enviar_evaluaciones: false,
    });
    expect(disponible.body.filas.length).toBeGreaterThan(0);

    const publicada = await api(
      'post',
      '/notas/disciplina/resultados-finales/publicar',
      encargado,
    )
      .send(dto)
      .expect(201);
    expect(publicada.body).toMatchObject({
      completo: true,
      publicado: true,
      enviado_evaluaciones: false,
      puede_publicar: false,
      puede_enviar_evaluaciones: true,
    });
    const filasPublicadas = publicada.body.filas as Array<{
      id_cadete: number;
      nota_final_disciplina: string;
    }>;
    expect(await prisma.resultadoFinalDisciplina.count()).toBe(
      filasPublicadas.length,
    );
    const filaCadete = filasPublicadas.find(
      (fila) => fila.id_cadete === idCadete,
    );
    expect(filaCadete.nota_final_disciplina).toBe('84.3200');

    for (const autoridad of [comando, jefeEstudios, seccionAcademica]) {
      const consultaAutoridad = await api(
        'get',
        `/notas/disciplina/resultados-finales?id_gestion=${idGestion}&id_periodo=${idPeriodo}&id_curso=${idCurso}`,
        autoridad,
      ).expect(200);
      expect(consultaAutoridad.body).toMatchObject({
        publicado: true,
        puede_publicar: false,
        puede_enviar_evaluaciones: false,
      });
      expect(consultaAutoridad.body.filas).toHaveLength(filasPublicadas.length);
    }

    const enviada = await api(
      'post',
      '/notas/disciplina/resultados-finales/enviar-evaluaciones',
      encargado,
    )
      .send(dto)
      .expect(201);
    expect(enviada.body).toMatchObject({
      publicado: true,
      enviado_evaluaciones: true,
      puede_enviar_evaluaciones: false,
    });
    const notificaciones = await prisma.notificacion.count({
      where: { tipo: 'NOTAS_FINALES_DISCIPLINA' },
    });
    expect(notificaciones).toBeGreaterThan(0);
    await api(
      'post',
      '/notas/disciplina/resultados-finales/enviar-evaluaciones',
      encargado,
    )
      .send(dto)
      .expect(201);
    expect(
      await prisma.notificacion.count({
        where: { tipo: 'NOTAS_FINALES_DISCIPLINA' },
      }),
    ).toBe(notificaciones);
  });

  it('da a COMANDO lectura de los tres cursos y ninguna mutación', async () => {
    const contexto = await api(
      'get',
      '/notas/disciplina/contexto',
      comando,
    ).expect(200);
    expect(contexto.body.perfil).toBe('COMANDO');
    expect(contexto.body.cursos).toHaveLength(3);

    const semanas = await api(
      'get',
      `/notas/disciplina/semanas?id_periodo=${idPeriodo}`,
      comando,
    ).expect(200);
    expect(semanas.body.some((item: any) => item.id_semana === idSemana)).toBe(
      true,
    );
    const detalle = await api(
      'get',
      `/notas/disciplina/semanas/${idSemana}`,
      comando,
    ).expect(200);
    expect(detalle.body.registros).toHaveLength(4);
    await api(
      'get',
      `/notas/disciplina/acumulado?id_gestion=${idGestion}&id_periodo=${idPeriodo}&id_curso=${idCurso}`,
      comando,
    ).expect(200);

    await api('post', '/notas/disciplina/semanas', comando)
      .send({ id_periodo: idPeriodo, id_curso: idCurso, numero_semana: 2 })
      .expect(403);
    await api('post', '/notas/disciplina/configuraciones', comando)
      .send({
        id_periodo: idPeriodo,
        id_curso: otroCurso,
        cantidad_semanas: 2,
      })
      .expect(403);
    await api(
      'post',
      `/notas/disciplina/semanas/${idSemana}/registros`,
      comando,
    )
      .send({
        id_cadete: idCadete,
        id_catalogo: idMerito,
        nombre_responsable_manual: 'No permitido',
        fecha_hecho: `${gestion}-03-09`,
        puntaje: '1',
      })
      .expect(403);
  });

  it('permite al Administrador consultar pero no participar en revisión', async () => {
    const contexto = await api(
      'get',
      '/notas/disciplina/contexto',
      administrador,
    ).expect(200);
    expect(contexto.body.perfil).toBe('ADMINISTRADOR');
    expect(contexto.body.cursos).toHaveLength(3);
    await api(
      'get',
      `/notas/disciplina/acumulado?id_gestion=${idGestion}&id_periodo=${idPeriodo}&id_curso=${idCurso}`,
      administrador,
    ).expect(200);
    await api(
      'get',
      '/notas/disciplina/semanas/pendientes',
      administrador,
    ).expect(403);
    await api(
      'post',
      `/notas/disciplina/semanas/${idSemana}/observar`,
      administrador,
    )
      .send({ comentario: 'No permitido al Administrador.' })
      .expect(403);
    await api(
      'post',
      `/notas/disciplina/semanas/${idSemana}/aprobar`,
      administrador,
    ).expect(403);
    await api(
      'post',
      `/notas/disciplina/semanas/${idSemana}/marcar-revisada`,
      administrador,
    ).expect(403);
    await api(
      'post',
      `/notas/disciplina/semanas/${idSemana}/publicar`,
      administrador,
    ).expect(403);
  });

  it('limita la consulta del cadete a sus propios registros publicados', async () => {
    const propios = await api(
      'get',
      `/notas/disciplina/mis-registros?id_gestion=${idGestion}&id_periodo=${idPeriodo}`,
      cadeteUsuario,
    ).expect(200);
    expect(propios.body).toHaveLength(4);
    expect(propios.body[0]).not.toHaveProperty('puntaje');
    expect(propios.body[0]).not.toHaveProperty('estado');
    expect(propios.body[0]).not.toHaveProperty('observacion');
    expect(propios.body[0]).not.toHaveProperty('id_oficial');
    expect(propios.body[0]).not.toHaveProperty('nombre_responsable_manual');

    const ajenos = await api(
      'get',
      `/notas/disciplina/mis-registros?id_gestion=${idGestion}&id_periodo=${idPeriodo}`,
      otroCadeteUsuario,
    ).expect(200);
    expect(ajenos.body).toEqual([]);
  });

  it('exige justificación y hace idempotente la modificación extraordinaria', async () => {
    await api(
      'patch',
      `/notas/disciplina/registros/${idMeritoRegistro}/extraordinaria`,
      jefeEstudios,
    )
      .send({ puntaje: '3' })
      .expect(400);

    const modificada = await api(
      'patch',
      `/notas/disciplina/registros/${idMeritoRegistro}/extraordinaria`,
      jefeEstudios,
    )
      .send({
        puntaje: '3',
        justificacion: 'Corrección documentada en prueba.',
      })
      .expect(200);
    expect(modificada.body.puntaje).toBe('3.0000');
    expect(
      await prisma.semanaDisciplina.findUnique({
        where: { id_semana: idSemana },
      }),
    ).toMatchObject({ estado: EstadoSemanaDisciplina.PUBLICADO });

    const auditorias = await prisma.auditoriaAccion.count({
      where: {
        entidad: 'RegistroDisciplina',
        id_entidad: idMeritoRegistro,
        accion: 'MODIFICAR_REGISTRO_BLOQUEADO',
      },
    });
    const notificaciones = await prisma.notificacion.count({
      where: { id_referencia: idSemana, tipo: 'MODIFICACION_EXTRAORDINARIA' },
    });
    await api(
      'patch',
      `/notas/disciplina/registros/${idMeritoRegistro}/extraordinaria`,
      jefeEstudios,
    )
      .send({
        puntaje: '3',
        justificacion: 'Corrección documentada en prueba.',
      })
      .expect(200);
    expect(
      await prisma.auditoriaAccion.count({
        where: {
          entidad: 'RegistroDisciplina',
          id_entidad: idMeritoRegistro,
          accion: 'MODIFICAR_REGISTRO_BLOQUEADO',
        },
      }),
    ).toBe(auditorias);
    expect(
      await prisma.notificacion.count({
        where: { id_referencia: idSemana, tipo: 'MODIFICACION_EXTRAORDINARIA' },
      }),
    ).toBe(notificaciones);
  });

  it('impide al Encargado registrar o enviar hechos como operación normal', async () => {
    await api('post', '/notas/disciplina/configuraciones', encargado)
      .send({ id_periodo: idPeriodo, id_curso: otroCurso, cantidad_semanas: 2 })
      .expect(201);
    const semana = await api('post', '/notas/disciplina/semanas', encargado)
      .send({ id_periodo: idPeriodo, id_curso: otroCurso, numero_semana: 1 })
      .expect(201);
    await api(
      'post',
      `/notas/disciplina/semanas/${semana.body.id_semana}/registros`,
      encargado,
    )
      .send({
        id_cadete: cadeteOtroCurso,
        id_catalogo: idDemerito,
        id_oficial: idOficial,
        fecha_hecho: `${gestion}-03-10`,
      })
      .expect(403);
    await api(
      'post',
      `/notas/disciplina/semanas/${semana.body.id_semana}/enviar`,
      encargado,
    ).expect(403);
    expect(
      await prisma.registroDisciplina.count({
        where: { id_semana: semana.body.id_semana },
      }),
    ).toBe(0);
  });

  it('conserva inmutable el snapshot final ante una corrección extraordinaria posterior', async () => {
    await prisma.periodoLectivo.update({
      where: { id_periodo: idPeriodo },
      data: { activo: false },
    });
    await api(
      'patch',
      `/notas/disciplina/registros/${idMeritoRegistro}/extraordinaria`,
      jefeEstudios,
    )
      .send({
        puntaje: '4',
        justificacion: 'Corrección extraordinaria posterior al cierre final.',
      })
      .expect(200);
    const final = await api(
      'get',
      `/notas/disciplina/resultados-finales?id_gestion=${idGestion}&id_periodo=${idPeriodo}&id_curso=${idCurso}`,
      encargado,
    ).expect(200);
    expect(
      final.body.filas.find((fila: any) => fila.id_cadete === idCadete)
        .nota_final_disciplina,
    ).toBe('84.3200');
  });

  it('no modifica HistorialCursoCadete', async () => {
    expect(await prisma.historialCursoCadete.count()).toBe(0);
  });

  afterAll(async () => {
    if (app) await app.close();
  });
});
