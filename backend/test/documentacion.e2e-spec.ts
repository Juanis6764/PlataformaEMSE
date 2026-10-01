/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
import {
  CanActivate,
  ExecutionContext,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { promises as fs } from 'fs';
import * as path from 'path';
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

const CIS_PRUEBA = [
  'E2E-DOC-RADIO',
  'E2E-DOC-SECRETARIA',
  'E2E-DOC-SECRETARIA-2',
  'E2E-DOC-COMANDO',
  'E2E-DOC-2COMANDO',
  'E2E-DOC-LOGISTICA',
  'E2E-DOC-INTELIGENCIA',
  'E2E-DOC-INTRUSO',
  'E2E-DOC-ADMIN',
  'E2E-DOC-CADETE',
];

describe('Gestión Documental - flujo completo vía HTTP (PostgreSQL aislado)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const usuarios: Record<string, number> = {};
  const secciones: Record<string, number> = {};
  let idDocumento: number;
  let idHojaRuta: number;
  let idMovimiento: number;

  const api = (
    metodo: 'get' | 'post' | 'patch',
    ruta: string,
    ci: keyof typeof usuarios,
  ) =>
    request(app.getHttpServer())
      [metodo](ruta)
      .set('x-test-user', String(usuarios[ci]));

  /**
   * Lleva un documento nuevo desde su registro en Radio hasta que
   * el área indicada lo recibe derivado, con el `tipo_atencion_requerida`
   * solicitado. Reutilizado por los casos RESPUESTA y OBSERVACIÓN, que no
   * necesitan repetir los mismos 7 pasos vía HTTP.
   */
  async function avanzarHastaArea(
    asunto: string,
    tipoAtencion: 'CUMPLIMIENTO' | 'RESPUESTA',
    area: {
      nombre: 'LOGISTICA' | 'INTELIGENCIA' | 'ADMINISTRACION_SISTEMA';
      actor: 'logistica' | 'inteligencia' | 'administrador';
    } = { nombre: 'LOGISTICA', actor: 'logistica' },
  ) {
    const registro = await api('post', '/documentacion/documentos', 'radio')
      .send({
        tipo_documento: 'MEMORANDUM',
        asunto,
        prioridad: 'RUTINARIO',
        clasificacion: 'PUBLICO',
      })
      .expect(201);
    const idDoc = registro.body.id_documento;

    let envio = await api(
      'post',
      `/documentacion/documentos/${idDoc}/enviar`,
      'radio',
    )
      .send({ id_seccion_destino: secciones.SECRETARIA_GENERAL })
      .expect(201);
    await api(
      'post',
      `/documentacion/movimientos/${envio.body.movimiento.id_movimiento}/recibir`,
      'secretaria',
    )
      .send({})
      .expect(201);

    const hr = await api(
      'post',
      `/documentacion/documentos/${idDoc}/hoja-ruta`,
      'secretaria',
    ).expect(201);
    await api(
      'post',
      `/documentacion/hojas-ruta/${hr.body.id_hoja_ruta}/proveidos`,
      'secretaria',
    )
      .send({ contenido: 'A Comando.' })
      .expect(201);

    envio = await api(
      'post',
      `/documentacion/documentos/${idDoc}/enviar`,
      'secretaria',
    )
      .send({ id_seccion_destino: secciones.COMANDO })
      .expect(201);
    await api(
      'post',
      `/documentacion/movimientos/${envio.body.movimiento.id_movimiento}/recibir`,
      'comando',
    )
      .send({})
      .expect(201);

    envio = await api(
      'post',
      `/documentacion/documentos/${idDoc}/enviar`,
      'comando',
    )
      .send({ id_seccion_destino: secciones.SEGUNDO_COMANDO })
      .expect(201);
    await api(
      'post',
      `/documentacion/movimientos/${envio.body.movimiento.id_movimiento}/recibir`,
      'segundoComando',
    )
      .send({})
      .expect(201);

    await api(
      'post',
      `/documentacion/hojas-ruta/${hr.body.id_hoja_ruta}/proveidos`,
      'segundoComando',
    )
      .send({
        contenido: `A ${area.nombre}.`,
        id_seccion_destino: secciones[area.nombre],
        tipo_atencion_requerida: tipoAtencion,
      })
      .expect(201);

    envio = await api(
      'post',
      `/documentacion/documentos/${idDoc}/enviar`,
      'segundoComando',
    )
      .send({
        id_seccion_destino: secciones[area.nombre],
        tipo_movimiento: 'DERIVACION',
      })
      .expect(201);
    const pendientes = await api(
      'get',
      '/documentacion/movimientos/pendientes',
      area.actor,
    ).expect(200);
    expect(pendientes.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id_movimiento: envio.body.movimiento.id_movimiento,
          id_seccion_destino: secciones[area.nombre],
          estado_movimiento: 'PENDIENTE',
        }),
      ]),
    );
    await api(
      'post',
      `/documentacion/movimientos/${envio.body.movimiento.id_movimiento}/recibir`,
      area.actor,
    )
      .send({})
      .expect(201);

    return { idDocumento: idDoc, idHojaRuta: hr.body.id_hoja_ruta as number };
  }

  beforeAll(async () => {
    const url = process.env.DATABASE_URL ?? '';
    if (/\/emse_db(?:\?|$)/i.test(url) || !/documental.*test/i.test(url)) {
      const baseDetectada = url ? new URL(url).pathname.slice(1) : 'sin URL';
      throw new Error(
        `Prueba cancelada: DATABASE_URL debe apuntar a una base exclusiva del módulo documental de prueba; se detectó ${baseDetectada}.`,
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

    // Limpieza exclusiva de los datos de esta prueba, en la BD aislada
    // validada arriba. Nunca toca emse_db.
    await prisma.usuario.deleteMany({ where: { ci: { in: CIS_PRUEBA } } });

    const rol = await prisma.rol.findUniqueOrThrow({
      where: { nombre: 'ADMINISTRATIVO' },
    });
    const rolAdmin = await prisma.rol.findUniqueOrThrow({
      where: { nombre: 'ADMINISTRADOR' },
    });
    const rolCadete = await prisma.rol.findUniqueOrThrow({
      where: { nombre: 'CADETE' },
    });
    for (const nombre of [
      'RADIO',
      'SECRETARIA_GENERAL',
      'COMANDO',
      'SEGUNDO_COMANDO',
      'LOGISTICA',
      'INTELIGENCIA',
      'ADMINISTRACION_SISTEMA',
    ]) {
      const seccion = await prisma.seccion.findUniqueOrThrow({
        where: { nombre },
      });
      secciones[nombre] = seccion.id_seccion;
    }

    const hash = await bcrypt.hash('e2e-test', 10);
    const crear = async (
      ci: string,
      seccionNombre: string | null,
      idRol: number = rol.id_rol,
    ) => {
      const u = await prisma.usuario.create({
        data: {
          nombres: 'E2E',
          apellidos: seccionNombre ?? 'INTRUSO',
          ci,
          contrasena: hash,
          estado: 'ACTIVO',
          habilitado: true,
          primer_inicio: false,
          id_rol: idRol,
          id_seccion: seccionNombre ? secciones[seccionNombre] : null,
        },
      });
      return u.id_usuario;
    };
    usuarios.radio = await crear('E2E-DOC-RADIO', 'RADIO');
    usuarios.secretaria = await crear(
      'E2E-DOC-SECRETARIA',
      'SECRETARIA_GENERAL',
    );
    usuarios.secretariaColega = await crear(
      'E2E-DOC-SECRETARIA-2',
      'SECRETARIA_GENERAL',
    );
    usuarios.comando = await crear('E2E-DOC-COMANDO', 'COMANDO');
    usuarios.segundoComando = await crear(
      'E2E-DOC-2COMANDO',
      'SEGUNDO_COMANDO',
    );
    usuarios.logistica = await crear('E2E-DOC-LOGISTICA', 'LOGISTICA');
    usuarios.inteligencia = await crear('E2E-DOC-INTELIGENCIA', 'INTELIGENCIA');
    usuarios.intruso = await crear('E2E-DOC-INTRUSO', null);
    // El administrador del sistema también representa a la sección
    // operativa Administración dentro del módulo documental. Sus permisos
    // individuales limitan estrictamente las acciones de esa sección.
    usuarios.administrador = await crear(
      'E2E-DOC-ADMIN',
      'ADMINISTRACION_SISTEMA',
      rolAdmin.id_rol,
    );
    const permisosAdministracion = [
      ['DOC_VER_DOCUMENTOS', true],
      ['DOC_RECIBIR_DOCUMENTO', true],
      ['DOC_REGISTRAR_CUMPLIMIENTO', true],
      ['DOC_CREAR_RESPUESTA', true],
      ['DOC_ENVIAR_DOCUMENTO', true],
      ['DOC_DESCARGAR_DOCUMENTO', true],
      ['DOC_CREAR_DOCUMENTO', false],
      ['DOC_ASIGNAR_HOJA_RUTA', false],
      ['DOC_REGISTRAR_PROVEIDO', false],
      ['DOC_DERIVAR_DOCUMENTO', false],
      ['DOC_OBSERVAR_DOCUMENTO', false],
      ['DOC_APROBAR_DOCUMENTO', false],
      ['DOC_FINALIZAR_DOCUMENTO', false],
      ['DOC_ARCHIVAR_DOCUMENTO', false],
    ] as const;
    for (const [nombre, concedido] of permisosAdministracion) {
      const permiso = await prisma.permiso.findUniqueOrThrow({
        where: { nombre },
      });
      await prisma.usuarioPermiso.upsert({
        where: {
          id_usuario_id_permiso: {
            id_usuario: usuarios.administrador,
            id_permiso: permiso.id_permiso,
          },
        },
        update: { concedido },
        create: {
          id_usuario: usuarios.administrador,
          id_permiso: permiso.id_permiso,
          concedido,
        },
      });
    }
    usuarios.cadete = await crear('E2E-DOC-CADETE', null, rolCadete.id_rol);
  });

  afterAll(async () => {
    const ids = Object.values(usuarios);
    const documentos = await prisma.documento.findMany({
      where: { id_usuario_registro: { in: ids } },
      select: { id_documento: true },
    });
    const idsDoc = documentos.map((d) => d.id_documento);
    if (idsDoc.length > 0) {
      await prisma.notificacion.deleteMany({
        where: { id_referencia: { in: idsDoc } },
      });
      await prisma.auditoriaAccion.deleteMany({
        where: { id_entidad: { in: idsDoc } },
      });
      const archivos = await prisma.archivoDocumento.findMany({
        where: { id_documento: { in: idsDoc } },
        select: { id_archivo: true, clave_almacenamiento: true },
      });
      if (archivos.length > 0) {
        await prisma.auditoriaAccion.deleteMany({
          where: { id_entidad: { in: archivos.map((a) => a.id_archivo) } },
        });
        for (const archivo of archivos) {
          await fs.rm(
            path.join(
              process.cwd(),
              'almacenamiento-privado',
              'documentos',
              archivo.clave_almacenamiento,
            ),
            { force: true },
          );
        }
      }
      await prisma.archivoDocumento.deleteMany({
        where: { id_documento: { in: idsDoc } },
      });
      await prisma.documentoRelacionado.deleteMany({
        where: {
          OR: [
            { id_documento_origen: { in: idsDoc } },
            { id_documento_relacionado: { in: idsDoc } },
          ],
        },
      });
      await prisma.observacionDocumento.deleteMany({
        where: { id_documento: { in: idsDoc } },
      });
      const hojasRuta = await prisma.hojaRuta.findMany({
        where: { id_documento: { in: idsDoc } },
        select: { id_hoja_ruta: true },
      });
      const idsHR = hojasRuta.map((h) => h.id_hoja_ruta);
      if (idsHR.length > 0) {
        const proveidos = await prisma.proveido.findMany({
          where: { id_hoja_ruta: { in: idsHR } },
          select: { id_proveido: true },
        });
        const idsProv = proveidos.map((p) => p.id_proveido);
        if (idsProv.length > 0) {
          await prisma.auditoriaAccion.deleteMany({
            where: { id_entidad: { in: idsProv } },
          });
          await prisma.plazoDocumento.deleteMany({
            where: { id_proveido: { in: idsProv } },
          });
          await prisma.proveido.deleteMany({
            where: { id_hoja_ruta: { in: idsHR } },
          });
        }
        await prisma.auditoriaAccion.deleteMany({
          where: { id_entidad: { in: idsHR } },
        });
        await prisma.hojaRuta.deleteMany({
          where: { id_documento: { in: idsDoc } },
        });
      }
      await prisma.cumplimientoDocumento.deleteMany({
        where: { id_documento: { in: idsDoc } },
      });
      await prisma.historialEstadoDocumento.deleteMany({
        where: { id_documento: { in: idsDoc } },
      });
      await prisma.movimientoDocumento.deleteMany({
        where: { id_documento: { in: idsDoc } },
      });
      await prisma.expedienteDocumento.deleteMany({
        where: { id_documento: { in: idsDoc } },
      });
      await prisma.documento.deleteMany({
        where: { id_documento: { in: idsDoc } },
      });
    }
    await prisma.auditoriaAccion.deleteMany({
      where: { id_usuario: { in: ids } },
    });
    await prisma.notificacion.deleteMany({
      where: { id_usuario_destinatario: { in: ids } },
    });
    await prisma.usuario.deleteMany({ where: { id_usuario: { in: ids } } });
    await app.close();
  });

  it('Radio registra el documento principal (201)', async () => {
    const respuesta = await api('post', '/documentacion/documentos', 'radio')
      .send({
        tipo_documento: 'OFICIO',
        asunto: 'E2E - flujo completo vía HTTP',
        prioridad: 'URGENTE',
        clasificacion: 'PUBLICO',
      })
      .expect(201);
    idDocumento = respuesta.body.id_documento;
    expect(respuesta.body.expediente.estado_actual).toBe('REGISTRADO');
    expect(respuesta.body.codigo_interno).toMatch(/^OFI-\d{4}-\d{6}$/);
  });

  it('un actor sin sección (intruso) no puede enviar el documento (403)', async () => {
    await api(
      'post',
      `/documentacion/documentos/${idDocumento}/enviar`,
      'intruso',
    )
      .send({ id_seccion_destino: secciones.SECRETARIA_GENERAL })
      .expect(403);
  });

  it('rechaza un DTO sin el campo obligatorio id_seccion_destino (400)', async () => {
    await api(
      'post',
      `/documentacion/documentos/${idDocumento}/enviar`,
      'radio',
    )
      .send({})
      .expect(400);
  });

  it('Radio envía a Secretaría General (201); el movimiento aparece en la bandeja de pendientes de Secretaría', async () => {
    const envio = await api(
      'post',
      `/documentacion/documentos/${idDocumento}/enviar`,
      'radio',
    )
      .send({ id_seccion_destino: secciones.SECRETARIA_GENERAL })
      .expect(201);
    idMovimiento = envio.body.movimiento.id_movimiento;
    expect(envio.body.expediente.estado_actual).toBe('EN_TRANSITO');

    const pendientesSecretaria = await api(
      'get',
      '/documentacion/movimientos/pendientes',
      'secretaria',
    ).expect(200);
    const movimientoPendiente = pendientesSecretaria.body.find(
      (m: any) => m.id_movimiento === idMovimiento,
    );
    expect(movimientoPendiente).toBeDefined();
    expect(movimientoPendiente.id_documento).toBe(idDocumento);
    expect(movimientoPendiente.expediente.documento.id_documento).toBe(
      idDocumento,
    );
    expect(movimientoPendiente.expediente.documento.codigo_interno).toMatch(
      /^[A-Z]+-\d{4}-\d{6}$/,
    );

    const pendientesComando = await api(
      'get',
      '/documentacion/movimientos/pendientes',
      'comando',
    ).expect(200);
    expect(
      pendientesComando.body.some((m: any) => m.id_movimiento === idMovimiento),
    ).toBe(false);

    // El movimiento dirigido a Secretaría ya acredita participación para
    // lectura, aunque todavía no se haya ejecutado "Recibir".
    await api(
      'get',
      `/documentacion/documentos/${idDocumento}`,
      'secretaria',
    ).expect(200);
    await api(
      'get',
      `/documentacion/documentos/${idDocumento}/trazabilidad`,
      'secretaria',
    ).expect(200);

    const recepcion = await api(
      'post',
      `/documentacion/movimientos/${idMovimiento}/recibir`,
      'secretaria',
    )
      .send({})
      .expect(201);
    expect(recepcion.body.expediente.estado_actual).toBe('EN_TRAMITE');

    const pendientesTrasRecibir = await api(
      'get',
      '/documentacion/movimientos/pendientes',
      'secretaria',
    ).expect(200);
    expect(
      pendientesTrasRecibir.body.some(
        (m: any) => m.id_movimiento === idMovimiento,
      ),
    ).toBe(false);
  });

  it('recibir el mismo movimiento una segunda vez se rechaza (409)', async () => {
    await api(
      'post',
      `/documentacion/movimientos/${idMovimiento}/recibir`,
      'comando',
    )
      .send({})
      .expect(409);
  });

  it('Secretaría asigna hoja de ruta y registra el primer proveído (201)', async () => {
    const hr = await api(
      'post',
      `/documentacion/documentos/${idDocumento}/hoja-ruta`,
      'secretaria',
    ).expect(201);
    idHojaRuta = hr.body.id_hoja_ruta;
    expect(hr.body.numero).toMatch(/^HR-\d{4}-\d{6}$/);

    await api(
      'post',
      `/documentacion/hojas-ruta/${idHojaRuta}/proveidos`,
      'secretaria',
    )
      .send({ contenido: 'Se remite a Comando.' })
      .expect(201);
  });

  it('Radio no puede registrar un proveído (403)', async () => {
    await api(
      'post',
      `/documentacion/hojas-ruta/${idHojaRuta}/proveidos`,
      'radio',
    )
      .send({ contenido: 'no debería poder' })
      .expect(403);
  });

  it('Secretaría -> Comando -> Segundo Comando (envío/recepción encadenados)', async () => {
    let envio = await api(
      'post',
      `/documentacion/documentos/${idDocumento}/enviar`,
      'secretaria',
    )
      .send({ id_seccion_destino: secciones.COMANDO })
      .expect(201);
    await api(
      'post',
      `/documentacion/movimientos/${envio.body.movimiento.id_movimiento}/recibir`,
      'comando',
    )
      .send({})
      .expect(201);

    envio = await api(
      'post',
      `/documentacion/documentos/${idDocumento}/enviar`,
      'comando',
    )
      .send({ id_seccion_destino: secciones.SEGUNDO_COMANDO })
      .expect(201);
    await api(
      'post',
      `/documentacion/movimientos/${envio.body.movimiento.id_movimiento}/recibir`,
      'segundoComando',
    )
      .send({})
      .expect(201);
  });

  it('Segundo Comando registra el segundo proveído y deriva a Logística (201)', async () => {
    await api(
      'post',
      `/documentacion/hojas-ruta/${idHojaRuta}/proveidos`,
      'segundoComando',
    )
      .send({
        contenido: 'Deriva a Logística para cumplimiento.',
        id_seccion_destino: secciones.LOGISTICA,
        tipo_atencion_requerida: 'CUMPLIMIENTO',
        fecha_hora_limite: new Date(Date.now() + 86_400_000).toISOString(),
      })
      .expect(201);

    const envio = await api(
      'post',
      `/documentacion/documentos/${idDocumento}/enviar`,
      'segundoComando',
    )
      .send({
        id_seccion_destino: secciones.LOGISTICA,
        tipo_movimiento: 'DERIVACION',
      })
      .expect(201);
    const recepcion = await api(
      'post',
      `/documentacion/movimientos/${envio.body.movimiento.id_movimiento}/recibir`,
      'logistica',
    )
      .send({})
      .expect(201);
    expect(recepcion.body.expediente.id_seccion_actual).toBe(
      secciones.LOGISTICA,
    );
  });

  it('Logística registra cumplimiento y lo envía de vuelta; Segundo Comando aprueba; Comando y Secretaría solo reenvían; Radio finaliza y archiva', async () => {
    await api(
      'post',
      `/documentacion/documentos/${idDocumento}/cumplimiento`,
      'logistica',
    )
      .send({ descripcion: 'Se cumplió lo solicitado.' })
      .expect(201);

    let envio = await api(
      'post',
      `/documentacion/documentos/${idDocumento}/enviar`,
      'logistica',
    )
      .send({ id_seccion_destino: secciones.SEGUNDO_COMANDO })
      .expect(201);
    await api(
      'post',
      `/documentacion/movimientos/${envio.body.movimiento.id_movimiento}/recibir`,
      'segundoComando',
    )
      .send({})
      .expect(201);

    const aprobacion = await api(
      'post',
      `/documentacion/documentos/${idDocumento}/aprobar`,
      'segundoComando',
    ).expect(201);
    expect(aprobacion.body.estado_actual).toBe('APROBADO');

    // Comando ya no aprueba/observa (solo Segundo Comando lo hace): en el
    // tramo de retorno Comando únicamente recibe y reenvía hacia Secretaría.
    await api(
      'post',
      `/documentacion/documentos/${idDocumento}/aprobar`,
      'comando',
    ).expect(403);

    envio = await api(
      'post',
      `/documentacion/documentos/${idDocumento}/enviar`,
      'segundoComando',
    )
      .send({ id_seccion_destino: secciones.COMANDO })
      .expect(201);
    await api(
      'post',
      `/documentacion/movimientos/${envio.body.movimiento.id_movimiento}/recibir`,
      'comando',
    )
      .send({})
      .expect(201);

    envio = await api(
      'post',
      `/documentacion/documentos/${idDocumento}/enviar`,
      'comando',
    )
      .send({ id_seccion_destino: secciones.SECRETARIA_GENERAL })
      .expect(201);
    await api(
      'post',
      `/documentacion/movimientos/${envio.body.movimiento.id_movimiento}/recibir`,
      'secretaria',
    )
      .send({})
      .expect(201);

    envio = await api(
      'post',
      `/documentacion/documentos/${idDocumento}/enviar`,
      'secretaria',
    )
      .send({ id_seccion_destino: secciones.RADIO })
      .expect(201);
    await api(
      'post',
      `/documentacion/movimientos/${envio.body.movimiento.id_movimiento}/recibir`,
      'radio',
    )
      .send({})
      .expect(201);

    const finalizado = await api(
      'post',
      `/documentacion/documentos/${idDocumento}/finalizar`,
      'radio',
    ).expect(201);
    expect(finalizado.body.estado_actual).toBe('FINALIZADO');

    const archivado = await api(
      'post',
      `/documentacion/documentos/${idDocumento}/archivar`,
      'radio',
    ).expect(201);
    expect(archivado.body.estado_actual).toBe('ARCHIVADO');
  });

  it('la trazabilidad final refleja todo el recorrido', async () => {
    const vista = await api(
      'get',
      `/documentacion/documentos/${idDocumento}/trazabilidad`,
      'radio',
    ).expect(200);
    expect(vista.body.expediente.estado_actual).toBe('ARCHIVADO');
    expect(vista.body.expediente.movimientos.length).toBeGreaterThanOrEqual(5);
    expect(vista.body.expediente.hoja_ruta.proveidos).toHaveLength(2);
    expect(vista.body.expediente.hoja_ruta.fecha_hora_cierre).not.toBeNull();

    for (const actor of [
      'secretaria',
      'segundoComando',
      'logistica',
      'radio',
      'comando',
    ] as const) {
      await api(
        'get',
        `/documentacion/documentos/${idDocumento}`,
        actor,
      ).expect(200);
      const trazabilidad = await api(
        'get',
        `/documentacion/documentos/${idDocumento}/trazabilidad`,
        actor,
      ).expect(200);
      expect(trazabilidad.body.expediente.estado_actual).toBe('ARCHIVADO');
      expect(trazabilidad.body.expediente.hoja_ruta.proveidos).toHaveLength(2);
    }

    // La lectura histórica no habilita nuevamente acciones: ninguna
    // sección anterior puede enviar un expediente archivado que ya no está
    // bajo su responsabilidad actual.
    for (const actor of [
      'secretaria',
      'segundoComando',
      'logistica',
      'comando',
    ] as const) {
      await api(
        'post',
        `/documentacion/documentos/${idDocumento}/enviar`,
        actor,
      )
        .send({ id_seccion_destino: secciones.RADIO })
        .expect(403);
    }
  });

  it('conserva lectura historica en el recorrido completo por Inteligencia hasta ARCHIVADO', async () => {
    const { idDocumento: idDoc } = await avanzarHastaArea(
      'E2E - historico completo por Inteligencia',
      'CUMPLIMIENTO',
      { nombre: 'INTELIGENCIA', actor: 'inteligencia' },
    );

    await api(
      'post',
      `/documentacion/documentos/${idDoc}/cumplimiento`,
      'inteligencia',
    )
      .send({ descripcion: 'Inteligencia cumplio lo solicitado.' })
      .expect(201);

    let envio = await api(
      'post',
      `/documentacion/documentos/${idDoc}/enviar`,
      'inteligencia',
    )
      .send({ id_seccion_destino: secciones.SEGUNDO_COMANDO })
      .expect(201);
    await api(
      'post',
      `/documentacion/movimientos/${envio.body.movimiento.id_movimiento}/recibir`,
      'segundoComando',
    )
      .send({})
      .expect(201);

    await api(
      'post',
      `/documentacion/documentos/${idDoc}/aprobar`,
      'segundoComando',
    ).expect(201);
    envio = await api(
      'post',
      `/documentacion/documentos/${idDoc}/enviar`,
      'segundoComando',
    )
      .send({ id_seccion_destino: secciones.COMANDO })
      .expect(201);
    await api(
      'post',
      `/documentacion/movimientos/${envio.body.movimiento.id_movimiento}/recibir`,
      'comando',
    )
      .send({})
      .expect(201);

    envio = await api(
      'post',
      `/documentacion/documentos/${idDoc}/enviar`,
      'comando',
    )
      .send({ id_seccion_destino: secciones.SECRETARIA_GENERAL })
      .expect(201);
    await api(
      'post',
      `/documentacion/movimientos/${envio.body.movimiento.id_movimiento}/recibir`,
      'secretaria',
    )
      .send({})
      .expect(201);

    envio = await api(
      'post',
      `/documentacion/documentos/${idDoc}/enviar`,
      'secretaria',
    )
      .send({ id_seccion_destino: secciones.RADIO })
      .expect(201);
    await api(
      'post',
      `/documentacion/movimientos/${envio.body.movimiento.id_movimiento}/recibir`,
      'radio',
    )
      .send({})
      .expect(201);

    await api(
      'post',
      `/documentacion/documentos/${idDoc}/finalizar`,
      'radio',
    ).expect(201);
    await api(
      'post',
      `/documentacion/documentos/${idDoc}/archivar`,
      'radio',
    ).expect(201);

    for (const actor of [
      'secretaria',
      'segundoComando',
      'inteligencia',
      'radio',
      'comando',
    ] as const) {
      await api('get', `/documentacion/documentos/${idDoc}`, actor).expect(200);
      const vista = await api(
        'get',
        `/documentacion/documentos/${idDoc}/trazabilidad`,
        actor,
      ).expect(200);
      expect(vista.body.expediente.estado_actual).toBe('ARCHIVADO');
      expect(vista.body.expediente.hoja_ruta.proveidos).toHaveLength(2);
      expect(vista.body.expediente.cumplimientos).toHaveLength(1);
    }

    // Logistica no participo en este expediente concreto.
    await api('get', `/documentacion/documentos/${idDoc}`, 'logistica').expect(
      404,
    );

    for (const actor of [
      'secretaria',
      'segundoComando',
      'inteligencia',
      'comando',
    ] as const) {
      await api('post', `/documentacion/documentos/${idDoc}/enviar`, actor)
        .send({ id_seccion_destino: secciones.RADIO })
        .expect(403);
    }
  });

  describe('CASO RESPUESTA — documento relacionado sin workflow propio', () => {
    it('Logística crea una respuesta institucional; no tiene ExpedienteDocumento ni HojaRuta propios', async () => {
      const { idDocumento: idDoc } = await avanzarHastaArea(
        'E2E - caso respuesta',
        'RESPUESTA',
      );

      const respuesta = await api(
        'post',
        `/documentacion/documentos/${idDoc}/respuesta`,
        'logistica',
      )
        .send({
          tipo_documento: 'OFICIO',
          asunto: 'Respuesta E2E',
          prioridad: 'RUTINARIO',
          clasificacion: 'PUBLICO',
        })
        .expect(201);

      expect(respuesta.body.relacion.tipo_relacion).toBe('RESPUESTA');
      const idRespuesta = respuesta.body.respuesta.id_documento;

      const expedienteRespuesta = await prisma.expedienteDocumento.findUnique({
        where: { id_documento: idRespuesta },
      });
      expect(expedienteRespuesta).toBeNull();

      const hojaRutaRespuesta = await prisma.hojaRuta.findUnique({
        where: { id_documento: idRespuesta },
      });
      expect(hojaRutaRespuesta).toBeNull();
    });
  });

  describe('CASO OBSERVACIÓN — devolución, corrección y reenvío sin perder historial', () => {
    it('Segundo Comando revisa una respuesta, la observa y recibe una nueva versión sin perder historial', async () => {
      const { idDocumento: idDoc } = await avanzarHastaArea(
        'E2E - respuesta observada',
        'RESPUESTA',
      );

      const primeraRespuesta = await api(
        'post',
        `/documentacion/documentos/${idDoc}/respuesta`,
        'logistica',
      )
        .send({
          tipo_documento: 'OFICIO',
          asunto: 'Primera respuesta incompleta',
          clasificacion: 'SECRETO',
        })
        .expect(201);
      const idPrimeraRespuesta = primeraRespuesta.body.respuesta.id_documento;
      const archivoRespuesta = await request(app.getHttpServer())
        .post(`/documentacion/documentos/${idPrimeraRespuesta}/archivos`)
        .set('x-test-user', String(usuarios.logistica))
        .attach('archivo', Buffer.from('%PDF-1.4 respuesta inicial'), {
          filename: 'respuesta-inicial.pdf',
          contentType: 'application/pdf',
        })
        .expect(201);
      const envio = await api(
        'post',
        `/documentacion/documentos/${idDoc}/enviar`,
        'logistica',
      )
        .send({ id_seccion_destino: secciones.SEGUNDO_COMANDO })
        .expect(201);
      await api(
        'post',
        `/documentacion/movimientos/${envio.body.movimiento.id_movimiento}/recibir`,
        'segundoComando',
      )
        .send({})
        .expect(201);

      const vistaRevision = await api(
        'get',
        `/documentacion/documentos/${idDoc}/trazabilidad`,
        'segundoComando',
      ).expect(200);
      const relacionVisible = vistaRevision.body.documento.relaciones_como_origen.find(
        (relacion: any) =>
          relacion.id_documento_relacionado === idPrimeraRespuesta,
      );
      expect(relacionVisible.documento_relacionado.archivos).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id_archivo: archivoRespuesta.body.id_archivo }),
        ]),
      );
      expect(relacionVisible.documento_relacionado.usuario_registro).toBeDefined();
      expect(relacionVisible.documento_relacionado.seccion_registro.nombre).toBe(
        'LOGISTICA',
      );
      await api(
        'get',
        `/documentacion/documentos/${idPrimeraRespuesta}/archivos/${archivoRespuesta.body.id_archivo}/visualizar`,
        'segundoComando',
      ).expect(200);

      const historialAntes = await prisma.historialEstadoDocumento.count({
        where: { id_documento: idDoc },
      });

      const observado = await api(
        'post',
        `/documentacion/documentos/${idDoc}/observar`,
        'segundoComando',
      )
        .send({ comentario: 'Falta evidencia fotográfica.' })
        .expect(201);
      expect(observado.body.expediente.estado_actual).toBe('EN_TRANSITO');
      const idObservacion = observado.body.observacion.id_observacion;

      const devolucion = await prisma.movimientoDocumento.findFirstOrThrow({
        where: { id_documento: idDoc, tipo_movimiento: 'DEVOLUCION' },
      });
      const recepcionDevolucion = await api(
        'post',
        `/documentacion/movimientos/${devolucion.id_movimiento}/recibir`,
        'logistica',
      )
        .send({})
        .expect(201);
      expect(recepcionDevolucion.body.expediente.estado_actual).toBe(
        'OBSERVADO',
      );

      await api(
        'post',
        `/documentacion/documentos/${idDoc}/respuesta`,
        'logistica',
      )
        .send({
          tipo_documento: 'OFICIO',
          asunto: 'Respuesta corregida con evidencia',
          clasificacion: 'SECRETO',
        })
        .expect(201);

      const subsanado = await api(
        'post',
        `/documentacion/documentos/${idDoc}/subsanar`,
        'logistica',
      )
        .send({ comentario: 'Corrección enviada.' })
        .expect(201);
      expect(subsanado.body.movimiento.tipo_movimiento).toBe('REENVIO');

      await api(
        'post',
        `/documentacion/movimientos/${subsanado.body.movimiento.id_movimiento}/recibir`,
        'segundoComando',
      )
        .send({})
        .expect(201);

      const observacion = await prisma.observacionDocumento.findUniqueOrThrow({
        where: { id_observacion: idObservacion },
      });
      expect(observacion.subsanada).toBe(true);
      expect(observacion.fecha_hora_subsanacion).not.toBeNull();

      const vistaCorregida = await api(
        'get',
        `/documentacion/documentos/${idDoc}/trazabilidad`,
        'segundoComando',
      ).expect(200);
      expect(vistaCorregida.body.documento.relaciones_como_origen).toHaveLength(2);
      expect(vistaCorregida.body.expediente.observaciones).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id_observacion: idObservacion,
            subsanada: true,
          }),
        ]),
      );

      const historialDespues = await prisma.historialEstadoDocumento.count({
        where: { id_documento: idDoc },
      });
      expect(historialDespues).toBeGreaterThan(historialAntes);
    });
  });

  describe('Archivos: subida real (multipart/form-data) y clasificación SECRETO', () => {
    it('sube un archivo real vía multipart, y un usuario sin participación es rechazado en un documento SECRETO', async () => {
      const registro = await api('post', '/documentacion/documentos', 'radio')
        .send({
          tipo_documento: 'RADIOGRAMA',
          asunto: 'E2E - documento secreto',
          prioridad: 'URGENTE',
          clasificacion: 'SECRETO',
        })
        .expect(201);
      const idDoc = registro.body.id_documento;

      const subida = await request(app.getHttpServer())
        .post(`/documentacion/documentos/${idDoc}/archivos`)
        .set('x-test-user', String(usuarios.radio))
        .attach('archivo', Buffer.from('%PDF-1.4 contenido de prueba e2e'), {
          filename: 'orden-original.pdf',
          contentType: 'application/pdf',
        })
        .expect(201);
      const idArchivo = subida.body.id_archivo;
      expect(subida.body.nombre_original).toBe('orden-original.pdf');
      expect(subida.body.hash_sha256).toHaveLength(64);

      // Quien registró el documento sí puede visualizarlo.
      await api(
        'get',
        `/documentacion/documentos/${idDoc}/archivos/${idArchivo}/visualizar`,
        'radio',
      ).expect(200);

      // Un usuario sin ninguna participación en el expediente, no.
      await api(
        'get',
        `/documentacion/documentos/${idDoc}/archivos/${idArchivo}/visualizar`,
        'intruso',
      ).expect(403);

      // La sección de destino puede consultar el expediente desde que el
      // movimiento está pendiente, pero eso no abre el adjunto clasificado
      // a todos sus integrantes.
      await api('post', `/documentacion/documentos/${idDoc}/enviar`, 'radio')
        .send({ id_seccion_destino: secciones.SECRETARIA_GENERAL })
        .expect(201);
      await api(
        'get',
        `/documentacion/documentos/${idDoc}`,
        'secretariaColega',
      ).expect(200);
      await api(
        'get',
        `/documentacion/documentos/${idDoc}/trazabilidad`,
        'secretariaColega',
      ).expect(200);
      await api(
        'get',
        `/documentacion/documentos/${idDoc}/archivos/${idArchivo}/visualizar`,
        'secretariaColega',
      ).expect(403);

      // Administración no participó: no puede consultar el expediente ni
      // usar el rol de sistema como bypass de visibilidad documental.
      await api(
        'get',
        `/documentacion/documentos/${idDoc}`,
        'administrador',
      ).expect(404);
      await api(
        'get',
        `/documentacion/documentos/${idDoc}/archivos/${idArchivo}/visualizar`,
        'administrador',
      ).expect(403);

      const intento = await prisma.auditoriaAccion.count({
        where: {
          accion: 'INTENTO_ACCESO_DENEGADO',
          id_entidad: idArchivo,
          id_usuario: usuarios.intruso,
        },
      });
      expect(intento).toBe(1);
    });

    it('sube un .docx cuyo cliente reporta application/octet-stream (fallback por extensión)', async () => {
      const registro = await api('post', '/documentacion/documentos', 'radio')
        .send({
          tipo_documento: 'MEMORANDUM',
          asunto: 'E2E - fallback de mimetype para .docx',
          prioridad: 'RUTINARIO',
          clasificacion: 'PUBLICO',
        })
        .expect(201);
      const idDoc = registro.body.id_documento;

      const subida = await request(app.getHttpServer())
        .post(`/documentacion/documentos/${idDoc}/archivos`)
        .set('x-test-user', String(usuarios.radio))
        .attach('archivo', Buffer.from('PK contenido docx de prueba e2e'), {
          filename: 'informe.docx',
          // Mimetype genérico, como reportan algunos clientes/SO para .docx
          // en vez del mimetype real de Office Open XML.
          contentType: 'application/octet-stream',
        })
        .expect(201);
      expect(subida.body.tipo_mime).toBe(
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      );

      const archivo = await prisma.archivoDocumento.findUniqueOrThrow({
        where: { id_archivo: subida.body.id_archivo },
      });
      expect(archivo.nombre_original).toBe('informe.docx');
    });

    it('rechaza un archivo cuya extensión no coincide con ningún tipo permitido (400)', async () => {
      const registro = await api('post', '/documentacion/documentos', 'radio')
        .send({
          tipo_documento: 'MEMORANDUM',
          asunto: 'E2E - extensión no permitida',
          prioridad: 'RUTINARIO',
          clasificacion: 'PUBLICO',
        })
        .expect(201);
      const idDoc = registro.body.id_documento;

      await request(app.getHttpServer())
        .post(`/documentacion/documentos/${idDoc}/archivos`)
        .set('x-test-user', String(usuarios.radio))
        .attach('archivo', Buffer.from('contenido arbitrario'), {
          filename: 'script.exe',
          contentType: 'application/octet-stream',
        })
        .expect(400);
    });
  });

  describe('ADMINISTRACIÓN — bandeja operativa con alcance por participación', () => {
    let idDocAdmin: number;

    it('Administración no puede registrar un documento principal (403)', async () => {
      await api('post', '/documentacion/documentos', 'administrador')
        .send({
          tipo_documento: 'OFICIO',
          asunto: 'no debería crearse',
          prioridad: 'RUTINARIO',
          clasificacion: 'PUBLICO',
        })
        .expect(403);
    });

    it('Administración no puede intervenir documentos ajenos ni ejecutar acciones institucionales (403)', async () => {
      const registro = await api('post', '/documentacion/documentos', 'radio')
        .send({
          tipo_documento: 'OFICIO',
          asunto: 'E2E - Administración sin participación',
          prioridad: 'RUTINARIO',
          clasificacion: 'PUBLICO',
        })
        .expect(201);
      idDocAdmin = registro.body.id_documento;

      await api(
        'post',
        `/documentacion/documentos/${idDocAdmin}/enviar`,
        'administrador',
      )
        .send({ id_seccion_destino: secciones.SECRETARIA_GENERAL })
        .expect(403);
      await api(
        'post',
        `/documentacion/documentos/${idDocAdmin}/hoja-ruta`,
        'administrador',
      ).expect(403);
      await api(
        'post',
        `/documentacion/hojas-ruta/${idHojaRuta}/proveidos`,
        'administrador',
      )
        .send({ contenido: 'no debería poder' })
        .expect(403);
      await api(
        'patch',
        `/documentacion/hojas-ruta/${idHojaRuta}/proveidos/primero`,
        'administrador',
      )
        .send({ contenido: 'no debería poder' })
        .expect(403);
      await api(
        'post',
        `/documentacion/documentos/${idDocAdmin}/observar`,
        'administrador',
      )
        .send({ comentario: 'no debería poder' })
        .expect(403);
      await api(
        'post',
        `/documentacion/documentos/${idDocAdmin}/aprobar`,
        'administrador',
      ).expect(403);
      await api(
        'post',
        `/documentacion/documentos/${idDocAdmin}/finalizar`,
        'administrador',
      ).expect(403);
      await api(
        'post',
        `/documentacion/documentos/${idDocAdmin}/archivar`,
        'administrador',
      ).expect(403);
    });

    it('Administración no tiene alcance global y ve seguimiento solo de su participación', async () => {
      await api(
        'get',
        `/documentacion/documentos/${idDocAdmin}/trazabilidad`,
        'administrador',
      ).expect(404);
      const seguimiento = await api(
        'get',
        '/documentacion/reportes/seguimiento-institucional',
        'administrador',
      ).expect(200);
      expect(seguimiento.body.alcance).toBe('PARTICIPACION_HISTORICA');
      const dashboard = await api(
        'get',
        '/documentacion/reportes/seguimiento?pestana=TODOS',
        'administrador',
      ).expect(200);
      expect(dashboard.body.alcance).toBe('PARTICIPACION_HISTORICA');
      expect(
        dashboard.body.documentos.some(
          (documento: any) => documento.id_documento === idDocAdmin,
        ),
      ).toBe(false);
    });

    it('Segundo Comando deriva a Administración con RESPUESTA; Administración recibe, responde, adjunta y devuelve a revisión', async () => {
      const flujo = await avanzarHastaArea(
        'E2E - respuesta de Administración',
        'RESPUESTA',
        {
          nombre: 'ADMINISTRACION_SISTEMA',
          actor: 'administrador',
        },
      );

      const bandeja = await api(
        'get',
        '/documentacion/documentos',
        'administrador',
      ).expect(200);
      expect(
        bandeja.body.some(
          (documento: any) =>
            documento.id_documento === flujo.idDocumento &&
            documento.expediente.id_seccion_actual ===
              secciones.ADMINISTRACION_SISTEMA,
        ),
      ).toBe(true);

      const respuesta = await api(
        'post',
        `/documentacion/documentos/${flujo.idDocumento}/respuesta`,
        'administrador',
      )
        .send({
          tipo_documento: 'OFICIO',
          asunto: 'Respuesta institucional de Administración',
        })
        .expect(201);
      expect(respuesta.body.relacion.tipo_relacion).toBe('RESPUESTA');

      await request(app.getHttpServer())
        .post(
          `/documentacion/documentos/${respuesta.body.respuesta.id_documento}/archivos`,
        )
        .set('x-test-user', String(usuarios.administrador))
        .attach('archivo', Buffer.from('respuesta de administración'), {
          filename: 'respuesta-administracion.pdf',
          contentType: 'application/pdf',
        })
        .expect(201);

      const envio = await api(
        'post',
        `/documentacion/documentos/${flujo.idDocumento}/enviar`,
        'administrador',
      )
        .send({ id_seccion_destino: secciones.SEGUNDO_COMANDO })
        .expect(201);
      expect(envio.body.movimiento).toEqual(
        expect.objectContaining({
          id_seccion_origen: secciones.ADMINISTRACION_SISTEMA,
          id_seccion_destino: secciones.SEGUNDO_COMANDO,
          estado_movimiento: 'PENDIENTE',
        }),
      );
    });
  });

  describe('CADETE — no pertenece a Gestión Documental', () => {
    it('CADETE no puede listar, ver detalle ni trazabilidad de documentos (403)', async () => {
      await api('get', '/documentacion/documentos', 'cadete').expect(403);
      await api(
        'get',
        `/documentacion/documentos/${idDocumento}`,
        'cadete',
      ).expect(403);
      await api(
        'get',
        `/documentacion/documentos/${idDocumento}/trazabilidad`,
        'cadete',
      ).expect(403);
      await api(
        'get',
        '/documentacion/reportes/seguimiento-institucional',
        'cadete',
      ).expect(403);
      await api(
        'get',
        '/documentacion/reportes/control-plazos',
        'cadete',
      ).expect(403);
    });
  });

  describe('Destino institucional — MovimientosService.enviar rechaza cualquier salto que no sea el siguiente de la secuencia', () => {
    let idDocDestino: number;

    beforeAll(async () => {
      const registro = await api('post', '/documentacion/documentos', 'radio')
        .send({
          tipo_documento: 'OFICIO',
          asunto: 'E2E - validación de destino institucional',
          prioridad: 'RUTINARIO',
          clasificacion: 'PUBLICO',
        })
        .expect(201);
      idDocDestino = registro.body.id_documento;
    });

    it('RADIO -> LOGISTICA directo (403/409), saltándose Secretaría General', async () => {
      await api(
        'post',
        `/documentacion/documentos/${idDocDestino}/enviar`,
        'radio',
      )
        .send({ id_seccion_destino: secciones.LOGISTICA })
        .expect(403);
    });

    it('RADIO -> SECRETARIA_GENERAL (correcto, 201)', async () => {
      const envio = await api(
        'post',
        `/documentacion/documentos/${idDocDestino}/enviar`,
        'radio',
      )
        .send({ id_seccion_destino: secciones.SECRETARIA_GENERAL })
        .expect(201);
      await api(
        'post',
        `/documentacion/movimientos/${envio.body.movimiento.id_movimiento}/recibir`,
        'secretaria',
      )
        .send({})
        .expect(201);
      await api(
        'post',
        `/documentacion/documentos/${idDocDestino}/hoja-ruta`,
        'secretaria',
      ).expect(201);
      await api(
        'post',
        `/documentacion/hojas-ruta/${(await prisma.hojaRuta.findFirstOrThrow({ where: { id_documento: idDocDestino } })).id_hoja_ruta}/proveidos`,
        'secretaria',
      )
        .send({ contenido: 'A Comando.' })
        .expect(201);
    });

    it('SECRETARIA_GENERAL -> SEGUNDO_COMANDO directo (403/409), saltándose Comando', async () => {
      await api(
        'post',
        `/documentacion/documentos/${idDocDestino}/enviar`,
        'secretaria',
      )
        .send({ id_seccion_destino: secciones.SEGUNDO_COMANDO })
        .expect(403);
    });

    it('SECRETARIA_GENERAL -> COMANDO (correcto, 201)', async () => {
      const envio = await api(
        'post',
        `/documentacion/documentos/${idDocDestino}/enviar`,
        'secretaria',
      )
        .send({ id_seccion_destino: secciones.COMANDO })
        .expect(201);
      await api(
        'post',
        `/documentacion/movimientos/${envio.body.movimiento.id_movimiento}/recibir`,
        'comando',
      )
        .send({})
        .expect(201);
    });

    it('COMANDO -> RADIO directo (403/409), saltándose Segundo Comando (y Secretaría, en el retorno)', async () => {
      await api(
        'post',
        `/documentacion/documentos/${idDocDestino}/enviar`,
        'comando',
      )
        .send({ id_seccion_destino: secciones.RADIO })
        .expect(403);
    });

    it('COMANDO -> SEGUNDO_COMANDO (correcto, 201)', async () => {
      const envio = await api(
        'post',
        `/documentacion/documentos/${idDocDestino}/enviar`,
        'comando',
      )
        .send({ id_seccion_destino: secciones.SEGUNDO_COMANDO })
        .expect(201);
      await api(
        'post',
        `/documentacion/movimientos/${envio.body.movimiento.id_movimiento}/recibir`,
        'segundoComando',
      )
        .send({})
        .expect(201);

      const hr = await prisma.hojaRuta.findFirstOrThrow({
        where: { id_documento: idDocDestino },
      });
      await api(
        'post',
        `/documentacion/hojas-ruta/${hr.id_hoja_ruta}/proveidos`,
        'segundoComando',
      )
        .send({
          contenido: 'Deriva a Inteligencia.',
          id_seccion_destino: secciones.INTELIGENCIA,
          tipo_atencion_requerida: 'CUMPLIMIENTO',
        })
        .expect(201);
    });

    it('el segundo proveído no puede derivar a una sección institucional (400)', async () => {
      const hr = await prisma.hojaRuta.findFirstOrThrow({
        where: { id_documento: idDocDestino },
      });
      // Ya existe el segundo proveído del test anterior; se prueba la regla
      // en un expediente nuevo para no interferir con el resto del flujo.
      const registro = await api('post', '/documentacion/documentos', 'radio')
        .send({
          tipo_documento: 'OFICIO',
          asunto: 'E2E - segundo proveído a sección institucional',
          prioridad: 'RUTINARIO',
          clasificacion: 'PUBLICO',
        })
        .expect(201);
      const idDoc = registro.body.id_documento;
      let envio = await api(
        'post',
        `/documentacion/documentos/${idDoc}/enviar`,
        'radio',
      )
        .send({ id_seccion_destino: secciones.SECRETARIA_GENERAL })
        .expect(201);
      await api(
        'post',
        `/documentacion/movimientos/${envio.body.movimiento.id_movimiento}/recibir`,
        'secretaria',
      )
        .send({})
        .expect(201);
      const hrPropia = await api(
        'post',
        `/documentacion/documentos/${idDoc}/hoja-ruta`,
        'secretaria',
      ).expect(201);
      await api(
        'post',
        `/documentacion/hojas-ruta/${hrPropia.body.id_hoja_ruta}/proveidos`,
        'secretaria',
      )
        .send({ contenido: 'A Comando.' })
        .expect(201);
      envio = await api(
        'post',
        `/documentacion/documentos/${idDoc}/enviar`,
        'secretaria',
      )
        .send({ id_seccion_destino: secciones.COMANDO })
        .expect(201);
      await api(
        'post',
        `/documentacion/movimientos/${envio.body.movimiento.id_movimiento}/recibir`,
        'comando',
      )
        .send({})
        .expect(201);
      envio = await api(
        'post',
        `/documentacion/documentos/${idDoc}/enviar`,
        'comando',
      )
        .send({ id_seccion_destino: secciones.SEGUNDO_COMANDO })
        .expect(201);
      await api(
        'post',
        `/documentacion/movimientos/${envio.body.movimiento.id_movimiento}/recibir`,
        'segundoComando',
      )
        .send({})
        .expect(201);

      await api(
        'post',
        `/documentacion/hojas-ruta/${hrPropia.body.id_hoja_ruta}/proveidos`,
        'segundoComando',
      )
        .send({
          contenido: 'Deriva a Radio (inválido).',
          id_seccion_destino: secciones.RADIO,
          tipo_atencion_requerida: 'CUMPLIMIENTO',
        })
        .expect(400);

      expect(hr).toBeTruthy();
    });

    it('AREA (Inteligencia) -> COMANDO directo (403/409): un área solo puede devolver a Segundo Comando', async () => {
      const envio = await api(
        'post',
        `/documentacion/documentos/${idDocDestino}/enviar`,
        'segundoComando',
      )
        .send({
          id_seccion_destino: secciones.INTELIGENCIA,
          tipo_movimiento: 'DERIVACION',
        })
        .expect(201);
      await api(
        'post',
        `/documentacion/movimientos/${envio.body.movimiento.id_movimiento}/recibir`,
        'inteligencia',
      )
        .send({})
        .expect(201);

      await api(
        'post',
        `/documentacion/documentos/${idDocDestino}/enviar`,
        'inteligencia',
      )
        .send({ id_seccion_destino: secciones.COMANDO })
        .expect(403);
    });

    it('AREA (Inteligencia) -> RADIO directo (403/409)', async () => {
      await api(
        'post',
        `/documentacion/documentos/${idDocDestino}/enviar`,
        'inteligencia',
      )
        .send({ id_seccion_destino: secciones.RADIO })
        .expect(403);
    });

    it('AREA (Inteligencia) -> SEGUNDO_COMANDO (correcto, 201)', async () => {
      await api(
        'post',
        `/documentacion/documentos/${idDocDestino}/enviar`,
        'inteligencia',
      )
        .send({ id_seccion_destino: secciones.SEGUNDO_COMANDO })
        .expect(201);
    });
  });

  describe('Lectura historica por participacion (D.3)', () => {
    it('una seccion que nunca participo no puede ver detalle ni trazabilidad (404)', async () => {
      await api(
        'get',
        `/documentacion/documentos/${idDocumento}`,
        'inteligencia',
      ).expect(404);
      await api(
        'get',
        `/documentacion/documentos/${idDocumento}/trazabilidad`,
        'inteligencia',
      ).expect(404);
    });

    it('una seccion no global conserva acceso cuando el documento avanza', async () => {
      const registro = await api('post', '/documentacion/documentos', 'radio')
        .send({
          tipo_documento: 'OFICIO',
          asunto: 'E2E - conserva acceso tras avanzar',
          prioridad: 'RUTINARIO',
          clasificacion: 'PUBLICO',
        })
        .expect(201);
      const idDoc = registro.body.id_documento;

      let envio = await api(
        'post',
        `/documentacion/documentos/${idDoc}/enviar`,
        'radio',
      )
        .send({ id_seccion_destino: secciones.SECRETARIA_GENERAL })
        .expect(201);
      await api(
        'post',
        `/documentacion/movimientos/${envio.body.movimiento.id_movimiento}/recibir`,
        'secretaria',
      )
        .send({})
        .expect(201);

      // Mientras está en Secretaría General, Secretaría sí lo ve.
      await api(
        'get',
        `/documentacion/documentos/${idDoc}`,
        'secretaria',
      ).expect(200);
      await api(
        'get',
        `/documentacion/documentos/${idDoc}/trazabilidad`,
        'secretaria',
      ).expect(200);
      const listadoConDoc = await api(
        'get',
        '/documentacion/documentos',
        'secretaria',
      ).expect(200);
      expect(
        listadoConDoc.body.some((d: any) => d.id_documento === idDoc),
      ).toBe(true);

      envio = await api(
        'post',
        `/documentacion/documentos/${idDoc}/enviar`,
        'secretaria',
      )
        .send({ id_seccion_destino: secciones.COMANDO })
        .expect(201);
      await api(
        'post',
        `/documentacion/movimientos/${envio.body.movimiento.id_movimiento}/recibir`,
        'comando',
      )
        .send({})
        .expect(201);

      // Ya esta en Comando, pero Secretaria conserva lectura historica.
      await api(
        'get',
        `/documentacion/documentos/${idDoc}`,
        'secretaria',
      ).expect(200);
      await api(
        'get',
        `/documentacion/documentos/${idDoc}/trazabilidad`,
        'secretaria',
      ).expect(200);
      const listadoSinDoc = await api(
        'get',
        '/documentacion/documentos',
        'secretaria',
      ).expect(200);
      expect(
        listadoSinDoc.body.some((d: any) => d.id_documento === idDoc),
      ).toBe(true);

      // COMANDO sí es actor global: lo ve aunque nunca hubiera participado antes.
      await api('get', `/documentacion/documentos/${idDoc}`, 'comando').expect(
        200,
      );

      // RADIO, también global, lo ve en todo momento sin importar la sección.
      await api('get', `/documentacion/documentos/${idDoc}`, 'radio').expect(
        200,
      );
    });
  });

  describe('Reportes principales: seguimiento institucional y control de plazos', () => {
    it('una sección normal conserva su propia área aunque intente seleccionar otra', async () => {
      const reporte = await api(
        'get',
        `/documentacion/reportes/seguimiento?modo=HISTORICO&pestana=TODOS&id_seccion=${secciones.INTELIGENCIA}`,
        'logistica',
      ).expect(200);

      expect(reporte.body.alcance).toBe('PARTICIPACION_HISTORICA');
      expect(reporte.body.modo).toBe('HISTORICO');
      expect(reporte.body.id_seccion_reporte).toBe(secciones.LOGISTICA);
      expect(
        reporte.body.documentos.every(
          (documento: any) => documento.movimientos_area.every(
            (movimiento: any) =>
              movimiento.origen.id_seccion === secciones.LOGISTICA ||
              movimiento.destino.id_seccion === secciones.LOGISTICA,
          ),
        ),
      ).toBe(true);
    });

    it('el histórico de una sección incluye documentos que pasaron por ella y excluye áreas ajenas', async () => {
      const logistica = await api(
        'get',
        '/documentacion/reportes/seguimiento?modo=HISTORICO&pestana=TODOS',
        'logistica',
      ).expect(200);
      expect(
        logistica.body.documentos.some(
          (documento: any) => documento.id_documento === idDocumento,
        ),
      ).toBe(true);

      const inteligencia = await api(
        'get',
        '/documentacion/reportes/seguimiento?modo=HISTORICO&pestana=TODOS',
        'inteligencia',
      ).expect(200);
      expect(
        inteligencia.body.documentos.some(
          (documento: any) => documento.id_documento === idDocumento,
        ),
      ).toBe(false);
    });

    it('RADIO puede consultar todas las áreas o limitar el reporte a una sección', async () => {
      const todas = await api(
        'get',
        '/documentacion/reportes/seguimiento?modo=HISTORICO&pestana=TODOS',
        'radio',
      ).expect(200);
      expect(todas.body.alcance).toBe('GLOBAL');
      expect(todas.body.id_seccion_reporte).toBeNull();

      const logistica = await api(
        'get',
        `/documentacion/reportes/seguimiento?modo=HISTORICO&pestana=TODOS&id_seccion=${secciones.LOGISTICA}`,
        'radio',
      ).expect(200);
      expect(logistica.body.id_seccion_reporte).toBe(secciones.LOGISTICA);
      expect(
        logistica.body.documentos.every(
          (documento: any) => documento.movimientos_area.every(
            (movimiento: any) =>
              movimiento.origen.id_seccion === secciones.LOGISTICA ||
              movimiento.destino.id_seccion === secciones.LOGISTICA,
          ),
        ),
      ).toBe(true);
    });

    it('RADIO y COMANDO reciben alcance global', async () => {
      for (const actor of ['radio', 'comando'] as const) {
        const seguimiento = await api(
          'get',
          `/documentacion/reportes/seguimiento-institucional?gestion=${new Date().getFullYear()}`,
          actor,
        ).expect(200);
        expect(seguimiento.body.alcance).toBe('GLOBAL');
        expect(seguimiento.body.gestiones).toEqual(expect.any(Array));
        expect(seguimiento.body.gestiones[0].registrados).toBeGreaterThan(0);
        expect(seguimiento.body.gestiones[0].archivados).toBeGreaterThan(0);

        const plazos = await api(
          'get',
          '/documentacion/reportes/control-plazos',
          actor,
        ).expect(200);
        expect(plazos.body.alcance).toBe('GLOBAL');
      }
    });

    it('Segundo Comando y las secciones participantes consultan solo su alcance histórico', async () => {
      for (const actor of [
        'secretaria',
        'segundoComando',
        'logistica',
      ] as const) {
        const seguimiento = await api(
          'get',
          '/documentacion/reportes/seguimiento-institucional',
          actor,
        ).expect(200);
        expect(seguimiento.body.alcance).toBe('PARTICIPACION_HISTORICA');

        const control = await api(
          'get',
          '/documentacion/reportes/control-plazos',
          actor,
        ).expect(200);
        expect(control.body.alcance).toBe('PARTICIPACION_HISTORICA');
        expect(
          control.body.plazos.some(
            (plazo: any) => plazo.documento.id_documento === idDocumento,
          ),
        ).toBe(true);
      }
    });

    it('control de plazos entrega las seis columnas institucionales y aplica filtros', async () => {
      const control = await api(
        'get',
        `/documentacion/reportes/control-plazos?gestion=${new Date().getFullYear()}&tipo_documento=OFICIO&prioridad=URGENTE&estado=ARCHIVADO&id_seccion=${secciones.LOGISTICA}`,
        'radio',
      ).expect(200);
      const plazo = control.body.plazos.find(
        (fila: any) => fila.documento.id_documento === idDocumento,
      );
      expect(plazo).toMatchObject({
        hoja_ruta: expect.stringMatching(/^HR-/),
        documento: {
          id_documento: idDocumento,
          estado: 'ARCHIVADO',
        },
        seccion_responsable: {
          id_seccion: secciones.LOGISTICA,
          nombre: 'LOGISTICA',
        },
        resultado: 'EN PLAZO',
      });
      expect(plazo.fecha_hora_limite).toBeTruthy();
      expect(plazo.fecha_hora_cumplimiento).toBeTruthy();
    });

    it('control de plazos distingue días tarde y vencimiento pendiente', async () => {
      const plazo = await prisma.plazoDocumento.findFirstOrThrow({
        where: {
          proveido: { hoja_ruta: { id_documento: idDocumento } },
        },
      });
      const ahora = new Date();
      const limiteTardio = new Date(ahora.getTime() - 2 * 86_400_000);
      await prisma.plazoDocumento.update({
        where: { id_plazo: plazo.id_plazo },
        data: {
          fecha_hora_limite: limiteTardio,
          fecha_hora_cumplimiento: ahora,
        },
      });

      let control = await api(
        'get',
        '/documentacion/reportes/control-plazos',
        'radio',
      ).expect(200);
      let fila = control.body.plazos.find(
        (item: any) => item.id_plazo === plazo.id_plazo,
      );
      expect(fila.resultado).toBe('2 DÍAS TARDE');

      await prisma.plazoDocumento.update({
        where: { id_plazo: plazo.id_plazo },
        data: { fecha_hora_cumplimiento: null },
      });
      control = await api(
        'get',
        '/documentacion/reportes/control-plazos',
        'radio',
      ).expect(200);
      fila = control.body.plazos.find(
        (item: any) => item.id_plazo === plazo.id_plazo,
      );
      expect(fila.resultado).toBe('VENCIDO');
    });

    it('una sección ajena no recibe plazos de expedientes en los que no participó', async () => {
      const control = await api(
        'get',
        '/documentacion/reportes/control-plazos',
        'inteligencia',
      ).expect(200);
      expect(
        control.body.plazos.some(
          (plazo: any) => plazo.documento.id_documento === idDocumento,
        ),
      ).toBe(false);
    });

    it('el reporte general anterior ya no existe para evitar un tercer reporte duplicado', async () => {
      await api('get', '/documentacion/reportes/general', 'radio').expect(404);
    });
  });

  describe('Editar Primer Proveído (D.5) — solo COMANDO, antes del segundo proveído', () => {
    it('COMANDO edita el Primer Proveído mientras lo tiene, antes de que exista el segundo (201)', async () => {
      const registro = await api('post', '/documentacion/documentos', 'radio')
        .send({
          tipo_documento: 'OFICIO',
          asunto: 'E2E - editar primer proveído',
          prioridad: 'RUTINARIO',
          clasificacion: 'PUBLICO',
        })
        .expect(201);
      const idDoc = registro.body.id_documento;

      let envio = await api(
        'post',
        `/documentacion/documentos/${idDoc}/enviar`,
        'radio',
      )
        .send({ id_seccion_destino: secciones.SECRETARIA_GENERAL })
        .expect(201);
      await api(
        'post',
        `/documentacion/movimientos/${envio.body.movimiento.id_movimiento}/recibir`,
        'secretaria',
      )
        .send({})
        .expect(201);
      const hr = await api(
        'post',
        `/documentacion/documentos/${idDoc}/hoja-ruta`,
        'secretaria',
      ).expect(201);
      await api(
        'post',
        `/documentacion/hojas-ruta/${hr.body.id_hoja_ruta}/proveidos`,
        'secretaria',
      )
        .send({ contenido: 'A Comando (original).' })
        .expect(201);
      envio = await api(
        'post',
        `/documentacion/documentos/${idDoc}/enviar`,
        'secretaria',
      )
        .send({ id_seccion_destino: secciones.COMANDO })
        .expect(201);
      await api(
        'post',
        `/documentacion/movimientos/${envio.body.movimiento.id_movimiento}/recibir`,
        'comando',
      )
        .send({})
        .expect(201);

      // RADIO no puede editar el primer proveído.
      await api(
        'patch',
        `/documentacion/hojas-ruta/${hr.body.id_hoja_ruta}/proveidos/primero`,
        'radio',
      )
        .send({ contenido: 'no debería poder' })
        .expect(403);

      const editado = await api(
        'patch',
        `/documentacion/hojas-ruta/${hr.body.id_hoja_ruta}/proveidos/primero`,
        'comando',
      )
        .send({ contenido: 'A Comando (editado por Comando).' })
        .expect(200);
      expect(editado.body.contenido).toBe('A Comando (editado por Comando).');

      const proveidoUno = await prisma.proveido.findFirstOrThrow({
        where: { id_hoja_ruta: hr.body.id_hoja_ruta, numero_momento: 1 },
      });
      expect(proveidoUno.contenido).toBe('A Comando (editado por Comando).');
    });

    it('el primer proveído ya no puede editarse una vez que existe el segundo (409)', async () => {
      const { idDocumento: idDoc, idHojaRuta: idHR } = await avanzarHastaArea(
        'E2E - primer proveído ya cerrado',
        'CUMPLIMIENTO',
      );
      void idDoc;

      await api(
        'patch',
        `/documentacion/hojas-ruta/${idHR}/proveidos/primero`,
        'segundoComando',
      )
        .send({ contenido: 'no debería poder, no es Comando' })
        .expect(403);
    });
  });
});
