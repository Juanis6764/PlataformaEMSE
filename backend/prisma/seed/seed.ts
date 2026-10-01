import 'dotenv/config';
import { PrismaClient, EstadoCadete } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

import { ROLES } from './datos/roles';
import { SECCIONES } from './datos/secciones';
import { PERMISOS } from './datos/permisos';
import { CURSOS, GESTION_ACTUAL } from './datos/cursos';
import { CADETES_PRIMER_ANIO } from './datos/cadetes-primer-anio';
import { CADETES_SEGUNDO_ANIO } from './datos/cadetes-segundo-anio';
import { CADETES_TERCER_ANIO } from './datos/cadetes-tercer-anio';

// ─── Configuración de conexión ────────────────────────────────────────────────
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ─── Contraseña temporal y correo ─────────────────────────────────────────────
const CONTRASENA_TEMPORAL = '123456';
const GESTION_INGRESO = new Date().getFullYear();
const CORREO_CADETES_OTP =
  process.env.CORREO_CADETES_OTP || 'pruebaemse2026@gmail.com';

// CI ficticios anteriores a eliminar de la BD
const CI_FICTICIOS = [
  '100001',
  '100002',
  '100003',
  '100004',
  '100005', // placeholders anteriores
  '200001',
  '200002',
  '200003',
  '200004',
  '200005',
  '300001',
  '300002',
  '300003',
  '300004',
  '300005',
];

// ─── FASE 0: Validaciones previas al seed ────────────────────────────────────

function validarDatosPrevios() {
  console.log('\n🔎 VALIDACIONES PREVIAS A LA CARGA...');
  const errores: string[] = [];

  // Conteos exactos
  if (CADETES_PRIMER_ANIO.length !== 116)
    errores.push(
      `Primer Año: se esperaban 116, hay ${CADETES_PRIMER_ANIO.length}`,
    );
  if (CADETES_SEGUNDO_ANIO.length !== 130)
    errores.push(
      `Segundo Año: se esperaban 130, hay ${CADETES_SEGUNDO_ANIO.length}`,
    );
  if (CADETES_TERCER_ANIO.length !== 117)
    errores.push(
      `Tercer Año: se esperaban 117, hay ${CADETES_TERCER_ANIO.length}`,
    );

  const total =
    CADETES_PRIMER_ANIO.length +
    CADETES_SEGUNDO_ANIO.length +
    CADETES_TERCER_ANIO.length;
  if (total !== 363) errores.push(`Total: se esperaban 363, hay ${total}`);

  // Validar rangos y formato de CI
  const ciPrimero = CADETES_PRIMER_ANIO.map((c) => c.ci);
  const ciSegundo = CADETES_SEGUNDO_ANIO.map((c) => c.ci);
  const ciTercero = CADETES_TERCER_ANIO.map((c) => c.ci);
  const todosLosCi = [...ciPrimero, ...ciSegundo, ...ciTercero];

  // CI únicos
  const ciSet = new Set(todosLosCi);
  if (ciSet.size !== todosLosCi.length)
    errores.push('Existen CI duplicados entre los tres años');

  // Todos de 6 dígitos
  const ciNoValidos = todosLosCi.filter((ci) => !/^\d{6}$/.test(ci));
  if (ciNoValidos.length > 0)
    errores.push(
      `CI con formato inválido (no son 6 dígitos): ${ciNoValidos.join(', ')}`,
    );

  // Rangos correctos
  const ciPrimeroNums = ciPrimero.map(Number);
  if (
    Math.min(...ciPrimeroNums) !== 100001 ||
    Math.max(...ciPrimeroNums) !== 100116
  )
    errores.push(
      `Rango Primer Año incorrecto: min=${Math.min(...ciPrimeroNums)}, max=${Math.max(...ciPrimeroNums)}`,
    );

  const ciSegundoNums = ciSegundo.map(Number);
  if (
    Math.min(...ciSegundoNums) !== 200001 ||
    Math.max(...ciSegundoNums) !== 200130
  )
    errores.push(
      `Rango Segundo Año incorrecto: min=${Math.min(...ciSegundoNums)}, max=${Math.max(...ciSegundoNums)}`,
    );

  const ciTerceroNums = ciTercero.map(Number);
  if (
    Math.min(...ciTerceroNums) !== 300001 ||
    Math.max(...ciTerceroNums) !== 300117
  )
    errores.push(
      `Rango Tercer Año incorrecto: min=${Math.min(...ciTerceroNums)}, max=${Math.max(...ciTerceroNums)}`,
    );

  // Nombres y apellidos no vacíos
  const sinNombre = todosLosCi.filter((_, i) => {
    const todos = [
      ...CADETES_PRIMER_ANIO,
      ...CADETES_SEGUNDO_ANIO,
      ...CADETES_TERCER_ANIO,
    ];
    return !todos[i].nombres?.trim() || !todos[i].apellidos?.trim();
  });
  if (sinNombre.length > 0)
    errores.push(`Cadetes sin nombres o apellidos: CI ${sinNombre.join(', ')}`);

  // Primer Año no tiene arma
  const primerConArma = CADETES_PRIMER_ANIO.filter(
    (c) => (c as any).arma && (c as any).arma !== '',
  );
  if (primerConArma.length > 0)
    errores.push(`Primer Año tiene ${primerConArma.length} cadetes con arma`);

  // Segundo y Tercer Año tienen arma válida
  const armasValidas = [
    'Inf.',
    'Cab.',
    'Art.',
    'Ing.',
    'Com.',
    'Int.',
    'Mot.',
    'San.',
    'MB.',
  ];
  const segundoSinArma = CADETES_SEGUNDO_ANIO.filter(
    (c) => !armasValidas.includes(c.arma),
  );
  if (segundoSinArma.length > 0)
    errores.push(
      `Segundo Año: ${segundoSinArma.length} cadetes con arma inválida`,
    );
  const terceroSinArma = CADETES_TERCER_ANIO.filter(
    (c) => !armasValidas.includes(c.arma),
  );
  if (terceroSinArma.length > 0)
    errores.push(
      `Tercer Año: ${terceroSinArma.length} cadetes con arma inválida`,
    );

  if (errores.length > 0) {
    console.error(
      '\n❌ Validación fallida. Corrige los siguientes errores antes de continuar:',
    );
    errores.forEach((e) => console.error(`   - ${e}`));
    process.exit(1);
  }

  console.log(`   ✅ Primer Año: ${CADETES_PRIMER_ANIO.length} registros`);
  console.log(`   ✅ Segundo Año: ${CADETES_SEGUNDO_ANIO.length} registros`);
  console.log(`   ✅ Tercer Año: ${CADETES_TERCER_ANIO.length} registros`);
  console.log(`   ✅ Total: ${total} registros`);
  console.log(`   ✅ CI únicos y con formato válido`);
  console.log(`   ✅ Rangos de CI correctos`);
  console.log(`   ✅ Armas válidas en Segundo y Tercer Año`);
  console.log('   🟢 Todas las validaciones previas pasaron.\n');
}

// ─── 1. Catálogos base ────────────────────────────────────────────────────────

async function seedRoles() {
  console.log('📌 Creando roles...');
  for (const rol of ROLES) {
    await prisma.rol.upsert({
      where: { nombre: rol.nombre },
      update: { descripcion: rol.descripcion },
      create: { nombre: rol.nombre, descripcion: rol.descripcion },
    });
  }
  console.log(`   ✅ ${ROLES.length} roles procesados`);
}

async function seedSecciones() {
  console.log('📌 Creando secciones...');
  for (const sec of SECCIONES) {
    await prisma.seccion.upsert({
      where: { nombre: sec.nombre },
      update: {
        descripcion: sec.descripcion,
        nivel: sec.nivel,
        tipo: sec.tipo,
      },
      create: {
        nombre: sec.nombre,
        descripcion: sec.descripcion,
        nivel: sec.nivel,
        tipo: sec.tipo,
      },
    });
  }
  // Vincular sub-áreas a JEFATURA_ESTUDIOS
  const jefatura = await prisma.seccion.findUnique({
    where: { nombre: 'JEFATURA_ESTUDIOS' },
  });
  if (jefatura) {
    for (const nombre of [
      'EVALUACIONES',
      'DISCIPLINA',
      'ENTRENAMIENTO_FISICO',
    ]) {
      await prisma.seccion.update({
        where: { nombre },
        data: { id_seccion_padre: jefatura.id_seccion },
      });
    }
  }
  console.log(`   ✅ ${SECCIONES.length} secciones procesadas`);
}

async function seedPermisos() {
  console.log('📌 Creando permisos...');
  for (const permiso of PERMISOS) {
    await prisma.permiso.upsert({
      where: { nombre: permiso.nombre },
      update: {
        modulo: permiso.modulo,
        accion: permiso.accion,
        descripcion: permiso.descripcion,
      },
      create: {
        nombre: permiso.nombre,
        modulo: permiso.modulo,
        accion: permiso.accion,
        descripcion: permiso.descripcion,
      },
    });
  }
  console.log(`   ✅ ${PERMISOS.length} permisos procesados`);
}

// Permisos documentales genéricos reemplazados por el set granular DOC_*
// (ver prisma/seed/datos/permisos.ts). El seed nunca borra filas de
// Permiso (podrían estar referenciadas por RolPermiso/UsuarioPermiso
// históricos); se desactivan explícitamente para que PermisosGuard y los
// perfiles de validación (que ya filtran por `permiso.estado: true`) dejen
// de considerarlos, sin perder el historial.
async function desactivarPermisosDocumentalesLegacy() {
  console.log('📌 Desactivando permisos documentales reemplazados...');
  const legacy = ['VER_DOCUMENTOS', 'CREAR_DOCUMENTO', 'EDITAR_DOCUMENTO'];
  const resultado = await prisma.permiso.updateMany({
    where: { nombre: { in: legacy }, estado: true },
    data: { estado: false },
  });
  console.log(`   ✅ ${resultado.count} permiso(s) legacy desactivados`);
}

// Dentro de Gestión Documental, ADMINISTRADOR es solo monitor institucional
// (ver Hoja de Ruta, trazabilidad, estado, plazos, descargar/imprimir
// contenido — siempre sujeto a ArchivosService.tieneAccesoPorClasificacion,
// que no da bypass a admin sobre contenido CONFIDENCIAL/RESERVADO/SECRETO).
// NO participa del workflow (crear, enviar, recibir, asignar hoja de ruta,
// proveídos, derivar, cumplimiento, respuesta, observar, aprobar, finalizar,
// archivar quedan reservados a RADIO/SECRETARIA_GENERAL/COMANDO/
// SEGUNDO_COMANDO/áreas, según ValidacionesDocumentalesService.exigirTipo).
const PERMISOS_DOCUMENTALES_ADMINISTRADOR = [
  'DOC_VER_DOCUMENTOS',
  'DOC_DESCARGAR_DOCUMENTO',
  'DOC_IMPRIMIR_DOCUMENTO',
];

const PERMISOS_DOCUMENTALES_ADMINISTRACION_OPERATIVA = [
  'DOC_VER_DOCUMENTOS',
  'DOC_RECIBIR_DOCUMENTO',
  'DOC_REGISTRAR_CUMPLIMIENTO',
  'DOC_CREAR_RESPUESTA',
  'DOC_ENVIAR_DOCUMENTO',
  'DOC_DESCARGAR_DOCUMENTO',
];

const PERMISOS_DOCUMENTALES_DENEGADOS_ADMINISTRACION = [
  'DOC_CREAR_DOCUMENTO',
  'DOC_ASIGNAR_HOJA_RUTA',
  'DOC_REGISTRAR_PROVEIDO',
  'DOC_DERIVAR_DOCUMENTO',
  'DOC_OBSERVAR_DOCUMENTO',
  'DOC_APROBAR_DOCUMENTO',
  'DOC_FINALIZAR_DOCUMENTO',
  'DOC_ARCHIVAR_DOCUMENTO',
];

async function seedRolPermisos() {
  console.log('📌 Asignando permisos al rol ADMIN...');
  const rolAdmin = await prisma.rol.findUnique({
    where: { nombre: 'ADMINISTRADOR' },
  });
  if (!rolAdmin) return;
  const todosLosPermisos = await prisma.permiso.findMany();
  for (const permiso of todosLosPermisos) {
    if (
      permiso.modulo === 'DOCUMENTOS' &&
      !PERMISOS_DOCUMENTALES_ADMINISTRADOR.includes(permiso.nombre)
    ) {
      continue;
    }
    const existe = await prisma.rolPermiso.findFirst({
      where: { id_rol: rolAdmin.id_rol, id_permiso: permiso.id_permiso },
    });
    if (!existe) {
      await prisma.rolPermiso.create({
        data: { id_rol: rolAdmin.id_rol, id_permiso: permiso.id_permiso },
      });
    }
  }
  // El bloque anterior es aditivo (solo crea lo que falta); si en una BD
  // existente ADMINISTRADOR ya tenía permisos operativos DOC_* de antes de
  // esta corrección, hay que quitarlos explícitamente.
  const operativosDocumentalesAdmin = await prisma.permiso.findMany({
    where: {
      modulo: 'DOCUMENTOS',
      nombre: { notIn: PERMISOS_DOCUMENTALES_ADMINISTRADOR },
    },
  });
  const eliminadosAdmin = await prisma.rolPermiso.deleteMany({
    where: {
      id_rol: rolAdmin.id_rol,
      id_permiso: { in: operativosDocumentalesAdmin.map((p) => p.id_permiso) },
    },
  });
  if (eliminadosAdmin.count > 0) {
    console.log(
      `   ⚠️  ${eliminadosAdmin.count} permiso(s) documentales operativos retirados de ADMINISTRADOR.`,
    );
  }

  // Permisos básicos al rol CADETE. CADETE no pertenece a Gestión
  // Documental: DOC_VER_DOCUMENTOS no se asigna (y se retira si ya existía).
  const rolCadete = await prisma.rol.findUnique({
    where: { nombre: 'CADETE' },
  });
  if (rolCadete) {
    const permisosVer = await prisma.permiso.findMany({
      where: { nombre: { in: ['VER_CADETE'] } },
    });
    for (const permiso of permisosVer) {
      const existe = await prisma.rolPermiso.findFirst({
        where: { id_rol: rolCadete.id_rol, id_permiso: permiso.id_permiso },
      });
      if (!existe) {
        await prisma.rolPermiso.create({
          data: { id_rol: rolCadete.id_rol, id_permiso: permiso.id_permiso },
        });
      }
    }
    const permisoDocVer = await prisma.permiso.findUnique({
      where: { nombre: 'DOC_VER_DOCUMENTOS' },
    });
    if (permisoDocVer) {
      const eliminadosCadete = await prisma.rolPermiso.deleteMany({
        where: {
          id_rol: rolCadete.id_rol,
          id_permiso: permisoDocVer.id_permiso,
        },
      });
      if (eliminadosCadete.count > 0) {
        console.log(
          `   ⚠️  DOC_VER_DOCUMENTOS retirado de CADETE (${eliminadosCadete.count}).`,
        );
      }
    }
  }

  // Permisos del módulo documental al rol ADMINISTRATIVO (personal
  // genérico de Radio/Secretaría General/Comando/Segundo Comando/áreas —
  // la sección concreta del usuario, no el rol, determina qué paso del
  // workflow puede ejecutar; ver ValidacionesDocumentalesService).
  const rolAdministrativo = await prisma.rol.findUnique({
    where: { nombre: 'ADMINISTRATIVO' },
  });
  if (rolAdministrativo) {
    const permisosDocumentales = await prisma.permiso.findMany({
      where: { modulo: 'DOCUMENTOS' },
    });
    for (const permiso of permisosDocumentales) {
      const existe = await prisma.rolPermiso.findFirst({
        where: {
          id_rol: rolAdministrativo.id_rol,
          id_permiso: permiso.id_permiso,
        },
      });
      if (!existe) {
        await prisma.rolPermiso.create({
          data: {
            id_rol: rolAdministrativo.id_rol,
            id_permiso: permiso.id_permiso,
          },
        });
      }
    }
  }
  console.log('   ✅ Permisos asignados');
}

async function seedCursos() {
  console.log('📌 Creando cursos académicos...');
  for (const curso of CURSOS) {
    await prisma.curso.upsert({
      where: { nombre: curso.nombre },
      update: { orden: curso.orden },
      create: { nombre: curso.nombre, orden: curso.orden },
    });
  }
  console.log(`   ✅ ${CURSOS.length} cursos procesados`);
}

async function seedGestion() {
  console.log('📌 Creando gestión académica activa...');
  const administrador = await prisma.usuario.findUnique({
    where: { ci: '9477023' },
    select: { id_usuario: true },
  });
  if (!administrador) {
    throw new Error(
      'El administrador debe existir antes de crear los periodos lectivos.',
    );
  }

  const gestion = await prisma.gestionAcademica.upsert({
    where: { ano: GESTION_ACTUAL.ano },
    update: {},
    create: { ano: GESTION_ACTUAL.ano, estado: 'ACTIVA' },
  });

  for (const periodo of ['I', 'II'] as const) {
    await prisma.periodoLectivo.upsert({
      where: {
        id_gestion_periodo: {
          id_gestion: gestion.id_gestion,
          periodo,
        },
      },
      update: {},
      create: {
        id_gestion: gestion.id_gestion,
        periodo,
        activo: false,
        id_creador: administrador.id_usuario,
      },
    });
  }

  console.log(
    `   ✅ Gestión ${GESTION_ACTUAL.ano} y periodos I/II verificados`,
  );
}

// ─── 2. Usuarios administradores ─────────────────────────────────────────────

async function seedAdministradores() {
  console.log('📌 Creando usuarios administradores...');
  const rolAdmin = await prisma.rol.findUnique({
    where: { nombre: 'ADMINISTRADOR' },
  });
  const seccionSistema = await prisma.seccion.findUnique({
    where: { nombre: 'ADMINISTRACION_SISTEMA' },
  });
  if (!rolAdmin || !seccionSistema) {
    console.log('   ⚠️  Rol ADMIN o sección no encontrados');
    return;
  }

  // Eliminar ADMIN001 si existe
  await prisma.usuario.deleteMany({
    where: { ci: 'ADMIN001' },
  });

  await prisma.usuario.upsert({
    where: { ci: '9477023' },
    update: {
      nombres: 'ADMINISTRADOR',
      apellidos: 'PRINCIPAL',
      correo: 'juanis6764@gmail.com',
      estado: 'ACTIVO',
      id_rol: rolAdmin.id_rol,
      id_seccion: seccionSistema.id_seccion,
    },
    create: {
      ci: '9477023',
      nombres: 'ADMINISTRADOR',
      apellidos: 'PRINCIPAL',
      correo: 'juanis6764@gmail.com',
      // El seed no contiene credenciales conocidas. Para una instalación nueva,
      // el administrador debe pasar por el procedimiento de recuperación seguro.
      contrasena: await bcrypt.hash(
        crypto.randomBytes(32).toString('base64url'),
        12,
      ),
      estado: 'ACTIVO',
      primer_inicio: true,
      es_mixto: true,
      id_rol: rolAdmin.id_rol,
      id_seccion: seccionSistema.id_seccion,
    },
  });
  console.log('   ✅ Administrador oficial juanis6764@gmail.com procesado');
}

async function seedPermisosAdministracionDocumental() {
  console.log('📌 Configurando permisos documentales de Administración...');
  const seccion = await prisma.seccion.findUnique({
    where: { nombre: 'ADMINISTRACION_SISTEMA' },
  });
  if (!seccion) {
    console.log('   ⚠️  Sección ADMINISTRACION_SISTEMA no encontrada');
    return;
  }

  const nombres = [
    ...PERMISOS_DOCUMENTALES_ADMINISTRACION_OPERATIVA,
    ...PERMISOS_DOCUMENTALES_DENEGADOS_ADMINISTRACION,
  ];
  const permisos = await prisma.permiso.findMany({
    where: { nombre: { in: nombres }, estado: true },
  });
  const permisosPorNombre = new Map(
    permisos.map((permiso) => [permiso.nombre, permiso]),
  );
  const usuarios = await prisma.usuario.findMany({
    where: { id_seccion: seccion.id_seccion },
    select: { id_usuario: true },
  });

  for (const usuario of usuarios) {
    for (const nombre of nombres) {
      const permiso = permisosPorNombre.get(nombre);
      if (!permiso) continue;
      const concedido =
        PERMISOS_DOCUMENTALES_ADMINISTRACION_OPERATIVA.includes(nombre);
      await prisma.usuarioPermiso.upsert({
        where: {
          id_usuario_id_permiso: {
            id_usuario: usuario.id_usuario,
            id_permiso: permiso.id_permiso,
          },
        },
        update: { concedido },
        create: {
          id_usuario: usuario.id_usuario,
          id_permiso: permiso.id_permiso,
          concedido,
        },
      });
    }
  }
  console.log(
    `   ✅ ${usuarios.length} usuario(s) de Administración configurado(s)`,
  );
}

// ─── 3. Limpiar datos ficticios previos ───────────────────────────────────────

async function limpiarFicticios() {
  console.log('\n🧹 Eliminando datos ficticios anteriores...');

  // Identificamos cadetes ficticios por apellidos de placeholder
  const apellidosFicticios = [
    'PRIMERO UNO',
    'PRIMERO DOS',
    'PRIMERO TRES',
    'PRIMERO CUATRO',
    'PRIMERO CINCO',
    'SEGUNDO UNO',
    'SEGUNDO DOS',
    'SEGUNDO TRES',
    'SEGUNDO CUATRO',
    'SEGUNDO CINCO',
    'TERCERO UNO',
    'TERCERO DOS',
    'TERCERO TRES',
    'TERCERO CUATRO',
    'TERCERO CINCO',
  ];

  const usuariosFicticios = await prisma.usuario.findMany({
    where: { apellidos: { in: apellidosFicticios } },
    select: { id_usuario: true, ci: true },
  });

  if (usuariosFicticios.length === 0) {
    console.log('   ℹ️  No se encontraron datos ficticios para eliminar.');
    return;
  }

  const ids = usuariosFicticios.map((u) => u.id_usuario);

  // Eliminar en orden respetando FK
  await prisma.historialCursoCadete.deleteMany({
    where: { cadete: { id_usuario: { in: ids } } },
  });
  await prisma.cadete.deleteMany({ where: { id_usuario: { in: ids } } });
  await prisma.usuario.deleteMany({ where: { id_usuario: { in: ids } } });

  console.log(
    `   ✅ ${usuariosFicticios.length} usuarios ficticios eliminados`,
  );
}

// ─── 4. Carga masiva de cadetes oficiales ─────────────────────────────────────

async function seedCadetes() {
  console.log('\n📌 CARGANDO CADETES OFICIALES...');

  // Un solo hash para los 363 (fuera del bucle)
  const hashContrasena = await bcrypt.hash(CONTRASENA_TEMPORAL, 10);

  const rolCadete = await prisma.rol.findUnique({
    where: { nombre: 'CADETE' },
  });
  if (!rolCadete) {
    console.error('   ❌ Rol CADETE no encontrado');
    process.exit(1);
  }

  const cursoPrimero = await prisma.curso.findUnique({
    where: { nombre: 'Primer Año' },
  });
  const cursoSegundo = await prisma.curso.findUnique({
    where: { nombre: 'Segundo Año' },
  });
  const cursoTercero = await prisma.curso.findUnique({
    where: { nombre: 'Tercer Año' },
  });
  if (!cursoPrimero || !cursoSegundo || !cursoTercero) {
    console.error('   ❌ Cursos no encontrados');
    process.exit(1);
  }

  const listasACurso = [
    {
      lista: CADETES_PRIMER_ANIO as any[],
      curso: cursoPrimero,
      etiqueta: 'Primer Año',
    },
    {
      lista: CADETES_SEGUNDO_ANIO as any[],
      curso: cursoSegundo,
      etiqueta: 'Segundo Año',
    },
    {
      lista: CADETES_TERCER_ANIO as any[],
      curso: cursoTercero,
      etiqueta: 'Tercer Año',
    },
  ];

  for (const { lista, curso, etiqueta } of listasACurso) {
    let count = 0;
    for (const datos of lista) {
      // Correo compartido configurable para pruebas de OTP de cadetes.
      const correo = datos.correo ?? CORREO_CADETES_OTP;

      // Upsert Usuario (idempotente por CI)
      const usuario = await prisma.usuario.upsert({
        where: { ci: datos.ci },
        update: {
          nombres: datos.nombres,
          apellidos: datos.apellidos,
          correo,
        },
        create: {
          ci: datos.ci,
          nombres: datos.nombres,
          apellidos: datos.apellidos,
          correo,
          contrasena: hashContrasena,
          estado: 'ACTIVO',
          primer_inicio: true,
          id_rol: rolCadete.id_rol,
          id_seccion: null,
        },
      });

      // Upsert Cadete (idempotente por id_usuario único)
      const cadeteExistente = await prisma.cadete.findUnique({
        where: { id_usuario: usuario.id_usuario },
      });

      if (!cadeteExistente) {
        await prisma.cadete.create({
          data: {
            id_usuario: usuario.id_usuario,
            arma: datos.arma ?? null,
            id_curso: curso.id_curso,
            gestion_ingreso: GESTION_INGRESO - (curso.orden - 1),
            estado_cadete: 'REGULAR' as EstadoCadete,
          },
        });

        // El seed conserva únicamente el perfil y curso actual del cadete.
        // El historial real se registrará desde publicaciones/cierres académicos.
      } else {
        // Actualizar datos si ya existía
        await prisma.cadete.update({
          where: { id_usuario: usuario.id_usuario },
          data: {
            arma: datos.arma ?? null,
            id_curso: curso.id_curso,
          },
        });
      }

      count++;
    }
    console.log(`   ✅ ${count} cadetes de ${etiqueta} procesados`);
  }
}

// ─── 5. Validaciones post-seed ────────────────────────────────────────────────

async function validarPostSeed() {
  console.log('\n🔍 VALIDACIONES POST-SEED...');
  let errores = 0;

  // Contar por curso usando rango de CI
  const primer = await prisma.cadete.count({
    where: { usuario: { ci: { gte: '100001', lte: '100116' } } },
  });
  const segundo = await prisma.cadete.count({
    where: { usuario: { ci: { gte: '200001', lte: '200130' } } },
  });
  const tercero = await prisma.cadete.count({
    where: { usuario: { ci: { gte: '300001', lte: '300117' } } },
  });
  const totalCarga = primer + segundo + tercero;

  if (primer !== 116) {
    console.log(`   ❌ Primer Año: esperado 116, hay ${primer}`);
    errores++;
  } else console.log(`   ✅ Primer Año: ${primer} cadetes`);

  if (segundo !== 130) {
    console.log(`   ❌ Segundo Año: esperado 130, hay ${segundo}`);
    errores++;
  } else console.log(`   ✅ Segundo Año: ${segundo} cadetes`);

  if (tercero !== 117) {
    console.log(`   ❌ Tercer Año: esperado 117, hay ${tercero}`);
    errores++;
  } else console.log(`   ✅ Tercer Año: ${tercero} cadetes`);

  if (totalCarga !== 363) {
    console.log(`   ❌ Total carga: esperado 363, hay ${totalCarga}`);
    errores++;
  } else console.log(`   ✅ Total de esta carga: ${totalCarga} cadetes`);

  // Verificar usuarios vinculados (por rango CI)
  const usuariosVinculados = await prisma.usuario.count({
    where: {
      ci: {
        in: [
          ...Array.from({ length: 116 }, (_, i) => String(100001 + i)),
          ...Array.from({ length: 130 }, (_, i) => String(200001 + i)),
          ...Array.from({ length: 117 }, (_, i) => String(300001 + i)),
        ],
      },
      cadete: { isNot: null },
    },
  });
  if (usuariosVinculados !== 363) {
    console.log(
      `   ❌ Usuarios vinculados a cadete: ${usuariosVinculados}/363`,
    );
    errores++;
  } else console.log(`   ✅ 363 relaciones Usuario → Cadete confirmadas`);

  // Verificar que no hay contraseñas en texto plano (bcrypt siempre empieza con $2)
  const sinHash = await prisma.usuario.count({
    where: {
      ci: { gte: '100001', lte: '300117' },
      NOT: { contrasena: { startsWith: '$2' } },
    },
  });
  if (sinHash > 0) {
    console.log(`   ❌ ${sinHash} usuarios con contraseña en texto plano`);
    errores++;
  } else
    console.log('   ✅ Todas las contraseñas almacenadas como hash bcrypt');

  console.log('   ✅ El seed no genera trayectorias ni historiales académicos');

  if (errores === 0)
    console.log(
      '\n   🟢 Todas las validaciones post-seed pasaron correctamente.',
    );
  else console.log(`\n   🔴 ${errores} error(es) detectados.`);
}

// ─── 6. Resumen ───────────────────────────────────────────────────────────────

async function resumen() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 RESUMEN GLOBAL — PLATAFORMA EMSE');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  Roles             : ${await prisma.rol.count()}`);
  console.log(`  Secciones         : ${await prisma.seccion.count()}`);
  console.log(`  Permisos          : ${await prisma.permiso.count()}`);
  console.log(`  Cursos            : ${await prisma.curso.count()}`);
  console.log(`  Gestiones         : ${await prisma.gestionAcademica.count()}`);
  console.log(`  Usuarios total    : ${await prisma.usuario.count()}`);
  console.log(`  Cadetes total     : ${await prisma.cadete.count()}`);
  console.log(
    `  Historial real    : ${await prisma.historialCursoCadete.count()} (no generado por el seed)`,
  );
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🚀 Iniciando Prisma Seed — Plataforma EMSE');

  try {
    // FASE 0: Validar datos antes de tocar la BD
    validarDatosPrevios();

    // FASE 1: Catálogos
    await seedRoles();
    await seedSecciones();
    await seedPermisos();
    await desactivarPermisosDocumentalesLegacy();
    await seedRolPermisos();
    await seedCursos();
    await seedAdministradores();
    await seedPermisosAdministracionDocumental();
    await seedGestion();

    // FASE 2: Limpiar ficticios y cargar oficiales
    await limpiarFicticios();
    await seedCadetes();

    // FASE 3: Validar resultado
    await validarPostSeed();
    await resumen();

    console.log('✅ Seed completado exitosamente.\n');
  } catch (error) {
    console.error('\n❌ Error durante el seed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
