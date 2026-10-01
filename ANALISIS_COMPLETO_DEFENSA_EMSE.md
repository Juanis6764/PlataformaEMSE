# Análisis completo de la Plataforma EMSE para defensa oral

**Fecha del análisis:** 15 de septiembre de 2026  
**Alcance:** código fuente, `package.json`, `schema.prisma`, migraciones, pruebas y documentación existente del workspace.  
**Regla aplicada:** se distingue entre lo que está implementado, lo que está documentado como prueba anterior y lo que solo constituye una recomendación futura.

## 0. Veredicto ejecutivo

La plataforma es una aplicación web institucional separada en dos aplicaciones:

```text
Navegador
   |
   | Next.js + React + TypeScript + Tailwind + Axios
   | Socket.IO Client para presencia y cambios documentales
   v
API NestJS
   |
   | Guards, permisos, servicios de negocio, transacciones
   | WebSockets / Socket.IO y tareas programadas
   v
Prisma ORM
   |
   v
PostgreSQL
```

Su valor principal no es solamente guardar datos. El backend controla quién puede ejecutar cada acción, en qué sección se encuentra el expediente, cuál es el siguiente paso permitido, quién revisó, qué estado tenía antes y qué estado tiene después. Por eso el módulo documental es un workflow y no un CRUD simple.

El código actual contiene módulos funcionales de:

- autenticación con contraseña, OTP, JWT, sesiones y refresh token rotativo;
- usuarios, roles, permisos, secciones, cursos, cadetes y asignaciones;
- gestión académica;
- Disciplina;
- Evaluaciones;
- Entrenamiento Físico;
- matriz académica semestral/anual;
- gestión documental con hoja de ruta, proveídos, derivaciones, observaciones, cumplimiento, plazos, archivos y trazabilidad;
- auditoría;
- notificaciones persistentes;
- presencia de usuarios en línea;
- WebSocket documental;
- pruebas unitarias, E2E y scripts QA externos.

No se encontró un motor BPM como Camunda, Zeebe o Temporal, ni archivos BPMN. La interpretación correcta es: el proceso fue modelado conceptualmente con estados, actores y reglas; luego esas reglas se implementaron en servicios NestJS, enums, validaciones, transacciones, historial y notificaciones.

### Presentación de 2–3 minutos

> “La Plataforma Institucional EMSE fue desarrollada para centralizar dos procesos que requieren control y seguimiento: la gestión documental y la gestión académica. La solución utiliza un frontend construido con Next.js, React, TypeScript y Tailwind CSS; un backend NestJS organizado por módulos; Prisma como ORM; y PostgreSQL como base de datos relacional.
>
> El usuario inicia sesión con CI, contraseña y un código OTP enviado al correo institucional. Después, el backend verifica la sesión, el rol, los permisos y, cuando corresponde, la sección o asignación académica. En el módulo académico se registran, revisan, aprueban y publican notas de Disciplina, Evaluaciones y Entrenamiento Físico. Estas fuentes pueden consolidarse en una matriz académica semestral o anual.
>
> En el módulo documental, un documento principal tiene una ubicación actual y avanza por una secuencia institucional: Radio, Secretaría General, Comando, Segundo Comando, el área responsable y luego el retorno hasta Radio. Cada movimiento cambia el estado, registra historial, auditoría y puede generar una notificación. La trazabilidad se obtiene combinando el documento, el expediente, la hoja de ruta, los proveídos, movimientos, observaciones, cumplimientos, plazos y auditoría.
>
> El workflow se implementa con transacciones y control de concurrencia optimista, de modo que una acción solo se acepta si el estado y la sección todavía son los esperados. Las notificaciones documentales se guardan en la base de datos y, si el usuario está conectado, también se envían por Socket.IO. Así la plataforma mejora el control, reduce la pérdida de seguimiento y mantiene evidencia de las acciones institucionales.”

### Versión corta para memorizar

> “EMSE es una plataforma web modular que centraliza la gestión académica y documental. El backend aplica autenticación, permisos y reglas de workflow; PostgreSQL conserva la información y la trazabilidad; y Socket.IO comunica cambios documentales en tiempo real. La solución está diseñada como monolito modular porque el alcance institucional y la cantidad esperada de usuarios no justifican inicialmente microservicios.”

## 1. Problema, usuarios y flujo general

### Problema que resuelve

El proyecto aborda dos necesidades relacionadas:

1. **Documental:** saber dónde está un documento, quién lo tiene, qué acción sigue, si tiene plazo, si fue observado y cuál fue su recorrido.
2. **Académica:** registrar calificaciones por área, controlar revisiones, consolidar resultados y permitir consultas según el perfil.

La solución no elimina la responsabilidad institucional. La hace explícita mediante usuarios, secciones, asignaciones, estados, responsables, historial y permisos.

### Participantes reales identificables en el código

- **Administrador:** configura usuarios, roles, permisos y catálogos.
- **Actores documentales:** Radio, Secretaría General, Comando, Segundo Comando y áreas ejecutoras.
- **Área de Disciplina:** encargado y operadores por curso.
- **Área de Evaluaciones:** encargado y operadores por curso.
- **Entrenamiento Físico:** encargado y niveles de revisión académica.
- **Sección Académica, Jefatura de Estudios y Comando:** revisan información académica según el proceso.
- **Cadete:** consulta su información publicada y sus matrices publicadas.

### Flujo de información

1. El navegador muestra una página Next.js.
2. Una página o componente llama un servicio frontend.
3. El servicio usa Axios contra la API NestJS.
4. El interceptor agrega `Authorization: Bearer <token>`.
5. `JwtAuthGuard` valida el JWT y la sesión en PostgreSQL.
6. `PermisosGuard` verifica el permiso solicitado en tiempo real.
7. El controller recibe la petición y delega en un service.
8. El service valida reglas de negocio y usa Prisma.
9. Prisma genera consultas para PostgreSQL.
10. El backend devuelve JSON; el frontend actualiza la pantalla.

Para una acción documental, además:

```text
Petición REST
  -> validar actor, permiso, estado y sección
  -> transacción PostgreSQL
       -> actualizar estado
       -> insertar movimiento/historial/auditoría/notificación
  -> confirmar transacción
  -> emitir evento Socket.IO
  -> frontend vuelve a consultar la información autorizada
```

## 2. Arquitectura real

### Arquitectura lógica

Es una **arquitectura monolítica modular**. Existe un backend desplegable como una aplicación NestJS, pero internamente está dividido en módulos con responsabilidades claras. No es un monolito desordenado: la modularidad separa control de acceso, notas, documentación, auditoría, notificaciones y persistencia.

### Arquitectura tecnológica

| Capa | Tecnología real | Evidencia |
|---|---|---|
| Presentación | Next.js 16.2.6, React 19.2.4 | `frontend/package.json`, `frontend/src/app` |
| Tipado | TypeScript | archivos `.ts` y `.tsx` |
| Estilos | Tailwind CSS 4 | `frontend/src/app/globals.css` |
| HTTP | Axios 1.16.1 | `frontend/src/servicios/api.ts` |
| Tiempo real | Socket.IO Client 4.8.3 | servicios `presencia` y `documentacion` |
| API | NestJS 11 sobre Node.js | `backend/src/main.ts`, `app.module.ts` |
| Validación | `ValidationPipe`, `class-validator`, `class-transformer` | `backend/src/main.ts`, DTOs |
| ORM | Prisma 7.8 con `@prisma/adapter-pg` | `backend/src/prisma/prisma.service.ts` |
| BD | PostgreSQL | `backend/prisma/schema.prisma` |
| Seguridad | bcrypt, JWT, HMAC/SHA-256, sesiones | autenticación |

### Capas dentro del backend

- **Controller:** expone endpoints y recibe DTOs.
- **Guard/decorator:** decide si la petición puede continuar.
- **Service:** contiene reglas de negocio, transacciones y orquestación.
- **PrismaService:** abre la conexión y expone el cliente Prisma.
- **PostgreSQL:** almacena datos, relaciones, restricciones e historial.

### Ejemplo: Controller → Service → Prisma

En `backend/src/modulos/documentacion/documentos/documentos.controller.ts`, una ruta de registro recibe el usuario autenticado y un DTO. El controller llama a `DocumentosService.registrarPrincipal` en `documentos.service.ts`. El service valida que el actor sea Radio y tenga permiso, genera el correlativo, y dentro de una transacción crea `Documento`, `ExpedienteDocumento`, historial y auditoría mediante Prisma.

El controller no debería decidir la secuencia institucional. Esa decisión pertenece al service, porque debe ser reutilizable, verificable y transaccional.

### ¿Por qué fue adecuada?

- El sistema tiene varias áreas con reglas distintas, pero comparten usuarios, permisos, auditoría y base de datos.
- NestJS facilita módulos, inyección de dependencias, guards y WebSockets.
- PostgreSQL es adecuado para relaciones fuertes e historial.
- El monolito modular reduce complejidad de despliegue y permite una sola transacción entre workflow, auditoría y notificación.

### Ventajas

- menor complejidad operativa que microservicios;
- transacciones sencillas entre módulos;
- despliegue más fácil;
- tipado común en TypeScript;
- reglas centralizadas en backend;
- separación razonable por dominio.

### Limitaciones

- una falla del proceso del backend puede afectar todos los módulos;
- el escalamiento horizontal requiere revisar sesiones, archivos locales, scheduler y WebSockets;
- los módulos no se despliegan independientemente;
- el frontend tiene URLs locales fijas.

### ¿Era necesario usar microservicios?

No. Para más de 300 usuarios, el número de usuarios por sí solo no obliga a microservicios. Un monolito modular bien diseñado puede manejar esa escala, especialmente cuando el sistema necesita transacciones consistentes entre documentos, movimientos, historial y notificaciones.

Microservicios tendrían sentido si existieran volúmenes muy diferentes por módulo, equipos independientes, despliegues separados, integración con otros sistemas, necesidades de alta disponibilidad diferenciadas o una carga documental/tiempo real que justificara separar componentes.

## 3. Frontend

### Next.js y App Router

- **Qué es:** framework de React con enrutamiento, compilación y servidor web.
- **Uso real:** las carpetas bajo `frontend/src/app` representan rutas; por ejemplo, `iniciar-sesion/page.tsx`, `panel/page.tsx` y los módulos.
- **Evidencia:** `frontend/src/app/layout.tsx` define el layout raíz y monta `AuthProvider`.
- **Elección:** ofrece estructura de rutas y una base ordenada para una aplicación institucional.
- **Alternativas:** React con Vite, Angular o Vue.
- **Respuesta corta:** “Utilicé Next.js porque me proporciona el enrutamiento y la estructura de una aplicación React organizada; en este proyecto lo uso con App Router y páginas protegidas.”

### React

- **Qué es:** biblioteca para construir interfaces mediante componentes y estado.
- **Uso real:** formularios, tablas, modales, menú, campana de notificaciones y vistas de workflow usan hooks como `useState`, `useEffect`, `useCallback` y `useMemo`.
- **Evidencia:** `frontend/src/contextos/AuthContext.tsx`, `frontend/src/componentes/layout` y páginas `.tsx`.
- **Elección:** permite reutilizar componentes y actualizar solo la parte necesaria de la pantalla.
- **Alternativas:** HTML tradicional, Vue o Angular.
- **Respuesta corta:** “React me permite separar la interfaz en componentes reutilizables y manejar el estado de la sesión, formularios y consultas.”

### TypeScript

- **Qué es:** JavaScript con tipos estáticos.
- **Uso real:** interfaces como `UsuarioSesion`, `Documento`, `Trazabilidad` y respuestas de servicios.
- **Evidencia:** `frontend/src/tipos`, `frontend/src/servicios` y todos los `.tsx`.
- **Elección:** reduce errores de nombres y formas de datos entre frontend y backend.
- **Alternativa:** JavaScript.
- **Respuesta corta:** “TypeScript ayuda a detectar errores antes de ejecutar y documenta qué datos espera cada componente y servicio.”

### Tailwind CSS

- **Qué es:** sistema de clases utilitarias para estilos.
- **Uso real:** `globals.css` importa Tailwind y las páginas usan clases para layout, colores, tablas, modales y estados.
- **Alternativa:** CSS tradicional, Bootstrap o Material UI.
- **Respuesta corta:** “Tailwind permitió construir una interfaz consistente y responsive directamente en los componentes, sin crear una hoja de estilos separada para cada vista.”

### Axios

- **Qué es:** cliente HTTP para navegador y Node.
- **Uso real:** `frontend/src/servicios/api.ts` configura `baseURL`, agrega el JWT y reacciona a respuestas 401.
- **Alternativa:** `fetch` nativo.
- **Respuesta corta:** “Axios centraliza las llamadas a la API y permite agregar automáticamente el token y manejar errores de autenticación.”

### Socket.IO Client

- **Qué es:** cliente para comunicación bidireccional basada en WebSocket con mecanismos de reconexión.
- **Uso real:** `presencia.service.ts` conecta a `/presencia`; `documentacion-socket.service.ts` conecta a `/documentacion`.
- **Alternativa:** polling HTTP o WebSocket nativo.
- **Respuesta corta:** “Axios resuelve solicitudes puntuales; Socket.IO permite recibir cambios sin que el usuario tenga que actualizar manualmente la pantalla.”

### Servicios, componentes y páginas

- `frontend/src/servicios`: acceso a API y sockets.
- `frontend/src/componentes`: piezas reutilizables.
- `frontend/src/app`: rutas y pantallas.
- `frontend/src/contextos/AuthContext.tsx`: estado global de autenticación.
- `LayoutProtegido.tsx`: redirección de usuarios no autenticados.
- `BarraLateral.tsx`: menú según permisos y rol/sección.

### Token y sesión en el frontend

Después del OTP, `AuthContext.guardarSesion` guarda `accessToken`, `refreshToken` y el perfil en `localStorage`. El interceptor de Axios usa el access token.

Importante: el backend sí tiene `/refresh` y rotación de refresh token, pero el frontend actual no invoca `/refresh`. `refrescarSesion()` usa el access token contra `/autenticacion/me`; cuando recibe error, limpia la sesión. Por tanto, la renovación automática está incompleta en la integración actual.

### Formularios y errores

`iniciar-sesion/page.tsx` valida CI, contraseña, OTP de seis dígitos, pegado y navegación. Las páginas muestran mensajes de error provenientes de los servicios. El backend complementa esto con `ValidationPipe` y DTOs; la validación visual del frontend no sustituye la del backend.

## 4. Backend y seguridad de acceso

### NestJS, Node.js y TypeScript

Node.js ejecuta JavaScript en el servidor. NestJS organiza la aplicación en módulos, controllers, services, guards e inyección de dependencias. TypeScript tipa el código y facilita mantener contratos entre las capas.

`backend/src/app.module.ts` importa los módulos de control de acceso, auditoría, gestión académica, notificaciones, notas y documentación. `backend/src/main.ts` crea la aplicación, configura validación global, filtro de excepciones, CORS y Swagger en desarrollo.

### DTO

Un DTO es la forma esperada de una entrada. En este proyecto los DTOs reciben datos de login, usuarios, notas, documentos, proveídos, movimientos y filtros. El `ValidationPipe` usa `whitelist: true` y `forbidNonWhitelisted: true`, por lo que elimina o rechaza propiedades no declaradas según la configuración de validación.

### JwtAuthGuard

Archivo: `backend/src/comun/guards/jwt-auth.guard.ts`  
Método: `canActivate`.

Hace lo siguiente:

1. extrae `Bearer` del header;
2. verifica la firma y expiración del JWT;
3. usa `sid` para buscar la sesión en `Sesion`;
4. exige sesión activa y no expirada;
5. exige que el usuario esté habilitado;
6. agrega a `request.user` el id, CI, rol, sección, primer inicio y `sid`;
7. restringe al usuario con `primer_inicio` hasta que cambie la contraseña.

### PermisosGuard

Archivo: `backend/src/comun/guards/permisos.guard.ts`  
Método: `canActivate`.

Lee el decorador `@Permisos(...)`, consulta los permisos activos del rol y aplica los permisos individuales de `UsuarioPermiso`. Un override concedido agrega el permiso; uno denegado lo elimina. La acción se permite si existe al menos uno de los permisos requeridos.

### Roles versus permisos

Existe el decorador `Roles` en `backend/src/comun/decorators/roles.decorator.ts`, pero no se encontró un `RolesGuard` en uso. La autorización efectiva está implementada principalmente mediante `PermisosGuard` y los servicios de validación contextual. En notas y documentos, además del permiso se verifica el tipo de actor, la sección y la asignación.

La forma correcta de decirlo es: “El rol es una fuente de permisos, pero el acceso efectivo también depende de permisos individuales, sección, asignación académica y estado del workflow”.

## 5. Base de datos y Prisma

### PostgreSQL

PostgreSQL es una base de datos relacional. Es adecuada porque EMSE tiene relaciones y reglas que deben conservarse: un usuario pertenece a un rol; un cadete extiende un usuario; una nota pertenece a una materia y a un cadete; un movimiento pertenece a un expediente; un historial pertenece a un documento y a un actor.

En el `schema.prisma` actual se observan **46 modelos y 23 enums**. El repositorio contiene **43 directorios de migración**; el informe QA existente registró 39 migraciones aplicadas en la base revisada el 13 de agosto de 2026. No debe presentarse ese número como una verificación nueva de la base actual.

### Tablas/modelos más importantes para la defensa

| Área | Modelos | Qué representan |
|---|---|---|
| Identidad | `Usuario`, `Rol`, `Permiso`, `RolPermiso`, `UsuarioPermiso` | identidad y autorización |
| Organización | `Seccion`, `Curso`, `Cadete`, asignaciones | estructura institucional y cohortes |
| Sesiones | `Sesion`, `RefreshHistorico`, `CodigoVerificacion`, `LogAcceso` | seguridad y acceso |
| Académica | `GestionAcademica`, `PeriodoLectivo`, `SemanaDisciplina`, `RegistroDisciplina`, `MateriaEvaluacion`, `NotaEvaluacion` | captura y revisión |
| Físico | `PlanillaEntrenamientoFisico`, `NotaEntrenamientoFisico` | planilla y notas de EF |
| Consolidación | `ResultadoFinalDisciplina`, `MatrizAcademica`, `DetalleMatrizAcademica`, `AntecedenteAcademicoCadete` | resultados y acumulados |
| Documental | `Documento`, `ExpedienteDocumento`, `HojaRuta`, `Proveido`, `MovimientoDocumento` | workflow |
| Evidencia | `HistorialEstadoDocumento`, `AuditoriaAccion`, `ObservacionDocumento`, `CumplimientoDocumento`, `PlazoDocumento` | trazabilidad y control |
| Alertas | `Notificacion` | bandeja persistente |
| Archivos | `ArchivoDocumento` | metadatos y almacenamiento privado |

### Relaciones

- **1:1:** `Usuario`–`Cadete`; `Documento`–`ExpedienteDocumento` para documentos principales.
- **1:N:** `Rol`–`Usuario`; `Seccion`–`Usuario`; `Sesion`–`RefreshHistorico`; `MateriaEvaluacion`–`NotaEvaluacion`; `ExpedienteDocumento`–`MovimientoDocumento`; `Documento`–`ArchivoDocumento`.
- **N:M mediante tablas puente:** `Rol`–`Permiso` por `RolPermiso`; permisos individuales mediante `UsuarioPermiso`.
- **Jerarquía:** `Seccion` tiene `id_seccion_padre`, `seccion_padre` y `subsecciones`.

### Integridad y normalización

El esquema usa claves primarias autoincrementales, claves foráneas, `onDelete` controlado, restricciones únicas, enums, checks e índices. Ejemplos: CI único, nombre de rol y permiso únicos, una nota por materia/cadete, una semana por periodo/curso/número, y una matriz por periodo/curso/tipo.

La información se mantiene separada por conceptos: el documento identifica el asunto; el expediente guarda ubicación y estado; los movimientos representan envíos; el historial registra transiciones; la auditoría registra la acción y datos antes/después. Esto evita guardar todo en una sola tabla y facilita consultar cada dimensión.

### Migraciones

Las migraciones en `backend/prisma/migrations` versionan cambios de estructura: control de acceso, doble verificación, refresh token, disciplina, evaluaciones, entrenamiento físico, documentación y matriz académica. Una migración no es una copia de datos: es una instrucción versionada para llevar la estructura de la base de un estado a otro.

## 6. Prisma ORM

Un ORM traduce operaciones de objetos TypeScript a consultas de base de datos. Prisma no reemplaza PostgreSQL: Prisma es la capa de acceso; PostgreSQL sigue almacenando y protegiendo los datos.

### ¿Por qué Prisma?

- genera tipos a partir del esquema;
- expresa relaciones con `include` y `where`;
- centraliza el modelo en `schema.prisma`;
- facilita transacciones;
- reduce SQL repetitivo y errores de nombres.

### Ejemplos reales

```ts
this.prisma.usuario.findUnique({ where: { ci } })
```

Busca un usuario por CI durante login.

```ts
this.prisma.$transaction(async (tx) => {
  await tx.expedienteDocumento.updateMany(...);
  await tx.movimientoDocumento.create(...);
  await tx.historialEstadoDocumento.create(...);
});
```

Agrupa cambios de workflow para que se confirmen juntos o se reviertan juntos.

En Evaluaciones se usa una operación SQL transaccional con `FOR UPDATE` sobre la configuración para proteger la creación secuencial de materias. La mayoría de las consultas se realiza con Prisma y parámetros estructurados.

Cuando cambia `schema.prisma`, se genera el cliente y se crea una migración revisable. En producción se aplica la migración pendiente; no se debe cambiar la base manualmente sin versionar el cambio.

## 7. Seguridad implementada y mejoras

### Medidas realmente presentes

- bcrypt para contraseñas;
- login con CI y contraseña;
- OTP aleatorio de seis dígitos;
- OTP guardado como HMAC-SHA-256, con vencimiento y uso único;
- límite de intentos en memoria;
- JWT de acceso con `sid`;
- sesión consultada en base de datos, no solo firma JWT;
- refresh token almacenado como hash y rotado;
- detección de reutilización de refresh token;
- cierre de sesiones al cambiar permisos, rol o contraseña;
- `primer_inicio` obligatorio para contraseña temporal;
- guards de autenticación y permisos;
- permisos de rol y overrides individuales;
- validación global de DTOs;
- auditoría y logs de acceso;
- control de sección actual en mutaciones documentales;
- control de clasificación para archivos;
- archivos fuera de `frontend/public`;
- protección contra path traversal en almacenamiento local;
- transacciones y concurrencia optimista en flujos.

### Mejoras de seguridad futuras

- eliminar secretos por defecto y exigir variables de entorno en producción;
- restringir CORS a dominios concretos;
- integrar el refresh token en el frontend;
- mover tokens fuera de `localStorage` o evaluar cookies HttpOnly/SameSite;
- sustituir rate limit en memoria por Redis o almacenamiento compartido;
- generar contraseñas temporales aleatorias y de un solo uso;
- incorporar inspección de contenido/magic bytes, antivirus y política de cifrado de archivos;
- revisar la persistencia del access token en `Sesion.token`;
- agregar pruebas funcionales autenticadas y análisis de seguridad automatizado;
- revisar logs para no exponer datos sensibles.

## 8. Usuarios, roles, permisos y control jerárquico

### Modelo mental

```text
Usuario
  -> Rol
       -> RolPermiso
  -> UsuarioPermiso (concede o revoca individualmente)
  -> Seccion
  -> AsignacionAcademica / AsignacionAdministrativa
  -> Sesion
```

La sección no es solo un dato informativo. En documentos determina el actor del workflow y puede determinar si una acción está permitida. En notas, la asignación académica puede limitar al operador a uno o varios cursos.

### Ejemplo práctico

Un usuario de un área recibe un documento y quiere aprobarlo:

1. el frontend muestra el botón solo si el permiso aparece en el perfil;
2. aun así, el usuario podría llamar directamente a la API;
3. `JwtAuthGuard` valida token, sesión y usuario habilitado;
4. `PermisosGuard` verifica `DOC_APROBAR_DOCUMENTO`;
5. `ValidacionesDocumentalesService` identifica su tipo de actor y sección;
6. `RevisionService` comprueba que solo Segundo Comando puede aprobar en el código actual;
7. `exigirSeccionActual` verifica que el expediente esté en su sección;
8. se exige estado `EN_TRAMITE`;
9. la transacción cambia a `APROBADO`, crea historial y auditoría;
10. solo después del commit se emite el evento Socket.IO.

Si falla cualquier condición, la API responde un error y no se ejecuta el cambio.

## 9. Gestión de notas

El módulo se integra mediante `backend/src/modulos/notas/notas.module.ts` y se divide en Disciplina, Evaluaciones, Entrenamiento Físico, matriz académica y servicios comunes.

### Estados de notas

Para semanas, materias y planilla se usa `EstadoSemanaDisciplina`:

```text
BORRADOR -> EN_REVISION -> REVISADO -> PUBLICADO
                 |
             OBSERVADO -> BORRADOR/reenviado
```

El nivel de revisión es `ENCARGADO_AREA`, `SECCION_ACADEMICA` o `JEFE_ESTUDIOS`.

`FlujoNotasService` centraliza transiciones para Disciplina, Evaluaciones y Entrenamiento Físico. Comprueba estado, nivel y `version_flujo` dentro de `updateMany`; si no actualiza exactamente una fila, devuelve conflicto.

### Disciplina

Archivos principales:

- `semanas-disciplina.service.ts`: crea, envía, observa, aprueba, marca revisada y publica semanas.
- `registros-disciplina.service.ts`: crea, edita, elimina y modifica extraordinariamente registros.
- `consultas-disciplina.service.ts`: consulta registros publicados, cuadros y acumulados.
- `resultados-finales-disciplina.service.ts`: crea el snapshot final y lo envía a Evaluaciones.
- `calculo-disciplina.ts`: cálculo decimal institucional.

El operador registra méritos o deméritos. Un demérito requiere oficial o responsable manual, fecha del hecho y puntaje fijo del catálogo. Un mérito exige puntaje positivo. El cadete debe pertenecer al curso de la semana.

El cálculo real es:

```text
demérito neto = máximo(total deméritos - total méritos, 0)
descuento = demérito neto * 0.9800
nota = 100.0000 - descuento
alerta = demérito neto > 30
```

Se usa `Prisma.Decimal`, no `number`, para evitar errores de redondeo.

El flujo es: operador registra → encargado revisa → Sección Académica aprueba → Jefe marca revisada → encargado publica. Al publicar todas las semanas configuradas, se puede construir el resultado final por cadete.

### Evaluaciones

- `materias-evaluaciones.service.ts`: materias y flujo.
- `notas-evaluaciones.service.ts`: registro, avance y corrección extraordinaria.
- `consultas-evaluaciones.service.ts`: consultas y resultados.
- `calculo-evaluaciones.ts`: desquite, promedio, clasificación y orden.

La nota considerada es el desquite si existe; de lo contrario, la inicial. La validación exige nota entre 0 y 100. El desquite solo existe si la inicial es menor o igual a 50, debe ser mayor que la inicial y no superar 100.

Clasificación real:

```text
100       -> E
85–99.99  -> MB
71–84.99  -> B
51–70.99  -> R
0–50.99   -> M
```

El operador solo trabaja materias en `BORRADOR` u `OBSERVADO` y cursos asignados. No puede editar después del envío normal. Las modificaciones extraordinarias requieren permiso, perfil autorizado, justificación, auditoría y aumento de versión.

### Entrenamiento Físico

`entrenamiento-fisico.service.ts` tiene lógica de consulta, registro, envío, observación, aprobación, revisión, corrección extraordinaria, envío de resultados a Evaluaciones y lectura de resultados por el destinatario.

La planilla se crea de forma diferida con la cohorte completa congelada. Las notas son de 0 a 100 y el envío exige completar la planilla. El flujo pasa por Sección Académica y Jefatura; el comentario del esquema indica que EF no publica directamente al cadete, sino que entrega el resultado a Evaluaciones.

### Matriz académica

`matrices-academicas.service.ts` calcula matriz semestral y anual.

Para el semestre:

```text
promedio académico = promedio de materias publicadas
ponderación evaluaciones = promedio académico * 0.80
ponderación EF = nota EF * 0.10
ponderación disciplina = nota disciplina * 0.10
promedio general = suma de las tres ponderaciones
```

También calcula aplazos, acumulado histórico, clasificación y orden de mérito. El orden prioriza menor cantidad de aplazos y luego mayor promedio. Si hay empate exacto en aplazos y promedio a cuatro decimales, el sistema lanza conflicto; no inventa un criterio institucional.

La matriz semestral puede pasar por `BORRADOR`, `EN_REVISION`, `OBSERVADO`, `APROBADO` y `PUBLICADO`. La matriz anual solo se construye desde el periodo II combinando las matrices semestrales publicadas; la publicación anual está bloqueada mientras no se definan expresamente criterios de promoción.

## 10. Gestión documental y workflow

### Estados reales del código

El enum `EstadoDocumento` actual contiene:

```text
REGISTRADO
EN_TRANSITO
EN_TRAMITE
OBSERVADO
APROBADO
FINALIZADO
ARCHIVADO
```

Los conceptos `HOJA_RUTA`, `PRIMER_PROVEIDO`, `SEGUNDO_PROVEIDO`, `DERIVADO`, `RECIBIDO`, `EN_ATENCION` y `EN_REVISION` no son valores del enum actual. Se representan mediante entidades, movimientos, plazos y combinación de estado/ubicación. No conviene decir ante el tribunal que todos son estados guardados en la base.

### Documento principal y relacionado

- `Documento` contiene código, tipo, procedencia, asunto, prioridad, clasificación y registro.
- `ExpedienteDocumento` existe para el documento principal y contiene estado, sección actual, responsable y atención requerida.
- respuestas, anexos y correcciones se relacionan mediante `DocumentoRelacionado` y no necesariamente tienen expediente propio.

### Secuencia documental implementada

La secuencia fija en `MovimientosService` es:

```text
RADIO
  -> SECRETARIA_GENERAL
  -> COMANDO
  -> SEGUNDO_COMANDO
  -> AREA RESPONSABLE
  -> SEGUNDO_COMANDO
  -> COMANDO
  -> SECRETARIA_GENERAL
  -> RADIO
```

`resolverDestinoInstitucional` calcula el destino según el actor y si existe el segundo proveído. El destino enviado en el body se compara con el destino esperado; no puede escoger arbitrariamente la siguiente sección.

### Acciones y responsables

| Acción | Regla real resumida |
|---|---|
| Registrar principal | Radio, permiso de creación; crea documento y expediente en `REGISTRADO` |
| Enviar | sección actual, estado permitido y destino calculado por workflow |
| Recibir | sección destino, movimiento pendiente y permiso de recepción |
| Asignar hoja de ruta | Secretaría General, expediente `EN_TRAMITE` |
| Primer proveído | Secretaría General hacia Comando |
| Segundo proveído | Segundo Comando; define área y atención requerida |
| Derivar | Segundo Comando hacia el área del proveído |
| Observar | el código actual permite esta acción en Segundo Comando; crea observación y devolución |
| Subsanar | sección actual corrige observación y reenvía |
| Aprobar | el código actual exige Segundo Comando y `EN_TRAMITE` |
| Finalizar | Radio, `EN_TRAMITE` |
| Archivar | Radio, `FINALIZADO` |

### Cómo se evita saltar estados

Cada service verifica previamente el estado, pero la garantía importante está en `FlujoDocumentalService.cambiarEstado`:

```ts
updateMany({
  where: {
    id_documento,
    estado_actual: { in: estados_permitidos },
    id_seccion_actual: id_seccion_actual_esperada,
  },
  data: { estado_actual: estado_nuevo },
})
```

Si el conteo actualizado no es exactamente uno, se lanza `ConflictException`. Luego se insertan historial y auditoría dentro de la misma transacción.

### Concurrencia optimista

La concurrencia optimista significa que no se bloquea toda la pantalla ni se supone que el dato sigue igual. La operación se ejecuta solo si conserva el estado y sección esperados. Si dos usuarios pulsan al mismo tiempo, una transacción gana; la otra encuentra cero filas actualizables y recibe conflicto.

En notas, además del estado y nivel, se usa `version_flujo`. En documentos se condiciona estado y sección.

### Por qué no es solo CRUD

Un CRUD permitiría crear, leer, modificar y eliminar sin una secuencia institucional estricta. Aquí una acción depende de actor, permiso, sección, estado anterior, destino, revisión, plazo y evidencia. Además, cada transición produce historial, auditoría y notificación. Eso es comportamiento de workflow.

## 11. BPM, BPMN y workflow

| Concepto | Significado sencillo | Aplicación real |
|---|---|---|
| BPM | disciplina para analizar, modelar, mejorar y gestionar procesos | el proyecto define el proceso institucional y sus reglas |
| BPMN | notación gráfica estándar para dibujar procesos | no se encontraron archivos BPMN en el repositorio |
| Workflow | ejecución ordenada de tareas, estados, actores y transiciones | sí está implementado en services, enums y transacciones |
| Motor BPM | software especializado que ejecuta modelos BPMN | no se encontró Camunda, Zeebe, Temporal ni motor equivalente |

Respuesta correcta al tribunal:

> “BPM es el enfoque de gestión del proceso; BPMN es una notación para representarlo; workflow es la ejecución controlada de sus pasos. En mi proyecto el proceso fue modelado conceptualmente y sus reglas se implementaron dentro de NestJS y PostgreSQL. No incorporé un motor BPMN externo.”

Esto no debilita el proyecto. Lo importante es no afirmar una integración que no existe.

## 12. Trazabilidad

Trazabilidad significa poder reconstruir qué ocurrió, quién lo hizo, cuándo, desde dónde y qué cambió.

### Datos que registra el código

- usuario ejecutor;
- acción;
- módulo;
- entidad e identificador;
- descripción;
- datos anteriores y posteriores;
- IP y agente de usuario cuando están disponibles;
- estado anterior y nuevo;
- sección que ejecuta;
- sección origen y destino;
- usuario que envía y recibe;
- fecha de envío y recepción;
- observación y subsanación;
- plazo, responsable y cumplimiento;
- archivos, nombre, tipo, tamaño y SHA-256;
- notificación, destinatario, tipo y clave idempotente.

### Servicio de trazabilidad

`backend/src/modulos/documentacion/trazabilidad/trazabilidad.service.ts` no usa una tabla única de timeline. Construye una vista combinando `Documento`, `ExpedienteDocumento`, `HojaRuta`, `Proveido`, `MovimientoDocumento`, `HistorialEstadoDocumento`, `ObservacionDocumento`, `CumplimientoDocumento`, relaciones, archivos y plazos.

Frase corta:

> “La trazabilidad permite reconstruir la vida del documento, identificando actor, fecha, sección, estado anterior, estado nuevo, observaciones, plazos y evidencias.”

## 13. Notificaciones y tiempo real

### HTTP versus WebSocket

- **HTTP/REST:** el cliente pregunta y el servidor responde.
- **WebSocket:** mantiene una conexión para que el servidor pueda enviar eventos al cliente.

Axios no es suficiente para avisos espontáneos. Con solo polling, el frontend consulta cada cierto tiempo. Socket.IO permite comunicar cambios documentales cuando ocurren.

### Gateways reales

1. `backend/src/modulos/documentacion/tiempo-real/documentacion.gateway.ts`
   - namespace `/documentacion`;
   - valida JWT y sesión al conectar;
   - crea sala por usuario;
   - emite `documento:evento`.
2. `backend/src/modulos/control-acceso/presencia/presencia.gateway.ts`
   - namespace `/presencia`;
   - registra conexiones y latidos;
   - emite `presencia:estado` a administradores autorizados.

### Eventos documentales

Después de confirmar una transacción, el backend emite eventos como documento enviado, recibido y avisos de plazo. También emite un evento liviano de documento actualizado. El frontend de bandeja y detalle escucha `documento:evento` y vuelve a consultar por REST; el evento no sustituye el control de permisos.

### Persistencia y usuario desconectado

La notificación se guarda primero en `Notificacion` con una `clave_evento` única. Si el usuario está conectado, recibe además el evento por Socket.IO. Si está desconectado, la notificación queda en la base y aparecerá cuando consulte la campana.

Alcance preciso: el WebSocket documental sí está implementado. La campana general de notas y sistema usa persistencia y polling cada 30 segundos/eventos locales; `NotificacionesService` no emite Socket.IO general para todas las áreas.

## 14. Scrum y metodología

No se encontraron en el repositorio archivos verificables de backlog, historias de usuario, actas de sprint, retrospectivas o cronograma Scrum. El código muestra desarrollo incremental por módulos, pero eso por sí solo no demuestra que se hayan ejecutado todas las ceremonias Scrum.

La explicación defendible es:

> “Utilicé Scrum como marco académico e incremental, organizando el desarrollo por módulos y entregables. Fue una adaptación al contexto de un proyecto individual o académico; no afirmo que se hayan aplicado todas las ceremonias y roles de Scrum con la formalidad de un equipo empresarial si no existe evidencia documental.”

### Comparación

| Metodología | Ventaja en este proyecto | Limitación |
|---|---|---|
| Scrum | permite entregar primero acceso, notas y documentos, y ajustar reglas | requiere evidencias de sprints, backlog y revisión |
| Cascada | ordena requisitos, diseño, construcción y pruebas | cambiar reglas institucionales tarde es costoso |
| Kanban | flexible para tareas individuales y correcciones | menos estructura de entregas |
| XP | favorece pruebas, integración y refactorización continua | exige disciplina técnica y prácticas específicas |
| Híbrida | combina planificación inicial con iteraciones | debe documentarse para no quedar ambigua |

Pregunta: “¿Por qué Scrum y no Cascada?”

> “Porque el proyecto tenía módulos con reglas que podían descubrirse y ajustarse durante el desarrollo. La iteración permitió validar primero la base de usuarios y seguridad, después notas y finalmente el workflow documental. Lo presento como una adaptación académica de Scrum, no como una implementación empresarial completa de todos sus roles.”

## 15. Evaluación objetiva del stack

El stack es **adecuado**, no necesariamente el mejor en abstracto.

- **Next.js + React:** buena estructura para una aplicación con muchas rutas y componentes; React puro con Vite sería más simple si no se necesitara la estructura de Next.
- **TypeScript:** apropiado para muchos contratos de datos y reglas de negocio; JavaScript reduciría configuración pero aumentaría errores posibles.
- **NestJS:** adecuado para módulos, guards, DTOs, inyección y WebSockets; Express sería más liviano, pero exigiría construir más convenciones manualmente.
- **PostgreSQL:** apropiado para relaciones, checks, transacciones e historial; MongoDB sería menos natural para relaciones institucionales fuertes.
- **Prisma:** reduce SQL repetitivo y entrega tipos; SQL directo puede ser útil en consultas muy especializadas, pero aumenta mantenimiento.
- **REST + Axios:** simple y suficiente para operaciones de negocio; GraphQL podría reducir sobrecarga de consultas, pero agrega complejidad.
- **Socket.IO:** conveniente para eventos y reconexión; WebSocket nativo tendría menos abstracción, pero más trabajo.

Angular, Vue, Django, Laravel, Spring Boot, MySQL y SQL Server también podrían resolver el problema. La justificación debe basarse en ajuste al alcance, conocimiento del equipo, velocidad de desarrollo, relaciones de datos y mantenimiento previsto.

Para más de 300 usuarios, la capacidad dependerá también de consultas, índices, hardware, red, pool de conexiones, archivos y pruebas con endpoints autenticados. No basta con mencionar el framework.

## 16. Linux y despliegue

Ubuntu Server/Linux suele recomendarse en producción por consumo de recursos, automatización, compatibilidad con Node.js/PostgreSQL/Nginx/PM2/Docker/Certbot, disponibilidad de herramientas y ausencia de licencia por servidor. No es una obligación absoluta: el sistema también puede funcionar en Windows Server.

### Desarrollo versus producción

| Desarrollo | Producción |
|---|---|
| Windows 11, PowerShell | Ubuntu Server u otro Linux |
| `localhost` | dominio y HTTPS |
| frontend y backend separados manualmente | Nginx como reverse proxy |
| base PostgreSQL local | PostgreSQL protegido en red privada |
| procesos de desarrollo | PM2, systemd o Docker |
| credenciales locales | secretos gestionados y respaldos |

### Cambios probables

- `DATABASE_URL` y variables SMTP/JWT;
- `PORT` del backend;
- URL de API usada por el frontend;
- URL de Socket.IO;
- ruta de almacenamiento documental;
- CORS;
- comandos de arranque;
- permisos de carpetas;
- certificados y dominio.

La lógica TypeScript, Prisma y PostgreSQL no debería cambiar por usar Linux, pero la operación, rutas, variables y servicios sí.

## 17. Infraestructura propuesta

```text
Internet
   |
Dominio HTTPS
   |
Nginx :443 / :80
   |---------------------> Frontend Next.js :3000
   |
   +---------------------> Backend NestJS :3001
                              |
                              +--> PostgreSQL :5432
                              +--> almacenamiento privado
                              +--> SMTP
                              +--> Socket.IO
```

- **80:** HTTP, normalmente redirecciona a HTTPS.
- **443:** HTTPS público.
- **3000:** puerto usual del frontend Next.js; no es el puerto real configurado del backend.
- **3001:** puerto por defecto real en `backend/src/main.ts`.
- **5432:** PostgreSQL; debe quedar restringido a la red del servidor/backend.
- **Nginx:** recibe el dominio y reenvía al proceso correcto.
- **PM2/systemd/Docker:** mantienen procesos y reinicios.
- **Certbot:** puede automatizar certificados Let’s Encrypt.
- **Backups:** deben incluir base de datos, archivos documentales y procedimiento de restauración.

El repositorio actual no trae configuración de Nginx, Docker, PM2 o systemd. Esta es una arquitectura de producción recomendada, no un despliegue ya implementado.

## 18. Pruebas existentes y alcance de la evidencia

### Pruebas del backend

El proyecto contiene pruebas unitarias de aplicación, validaciones, auditoría, autenticación, cadetes, roles, usuarios, permisos, presencia, documentos, plazos, cálculos de Disciplina, Evaluaciones, EF y notificaciones. También existen cinco archivos E2E en `backend/test`.

El informe QA existente (`INFORME_PRUEBAS_FINALES_EMSE.md`) registra que el 13 de agosto de 2026 se ejecutaron **25 suites y 111 casos unitarios aprobados**, además de `GET /` E2E aprobado. El árbol actual contiene más archivos `*.spec.ts` que ese conteo; por eso debe decirse “según el informe de esa ejecución”, no atribuir automáticamente el mismo resultado al estado actual.

### Pruebas de caja negra e integración

El informe registra:

- login visible y validación de campos;
- rechazo de rutas protegidas sin sesión;
- 401 para endpoints sin token o con token inválido;
- inicialización de NestJS, Prisma y PostgreSQL;
- build limpio del frontend.

No demuestra login correcto, OTP real, refresh, logout completo ni workflows autenticados con actores reales.

### Carga, estrés y rendimiento

El informe registra cargas contra el endpoint público `GET /`:

- 2.055 solicitudes en cargas progresivas hasta 300 concurrentes;
- 0 errores en esa prueba;
- p95 de 169,95 ms a 300 concurrentes;
- estrés hasta 400 concurrentes con p95 de 202,68 ms;
- recuperación a 10 concurrentes con p95 de 15,84 ms.

Esto no autoriza a afirmar que 400 usuarios pueden ejecutar simultáneamente listados, trazabilidad, notas o documentos autenticados. No se midieron esas operaciones con JWT y base de datos de negocio.

### Aceptación

Existe un instrumento de encuesta Likert descrito en `EXPLICACION_PRUEBAS_DEFENSA_EMSE.md`, pero no se encontraron resultados de participantes reales. No afirmar porcentaje de aceptación.

### Postman y otras herramientas

Existe `backend/EMSE_PANEL_ADMIN.postman_collection.json` y `backend/GUIA_POSTMAN_VALIDACIONES_Y_RESTABLECIMIENTO.md`. No se encontró integración real con Microsoft Forms, k6, JMeter, Artillery o Docker en el repositorio. Los scripts QA usan Node/PowerShell.

## 19. Archivos que conviene preparar para mostrar

| Archivo | Qué mostrar | Qué demuestra |
|---|---|---|
| `backend/src/main.ts` | `ValidationPipe`, CORS, Swagger, puerto | arranque y validación global |
| `backend/src/app.module.ts` | imports de módulos | arquitectura modular |
| `frontend/src/app/layout.tsx` | `AuthProvider` y layout | estructura del frontend |
| `frontend/src/servicios/api.ts` | base URL e interceptor | comunicación HTTP y JWT |
| `backend/src/comun/guards/jwt-auth.guard.ts` | `canActivate` | autenticación y sesión |
| `backend/src/comun/guards/permisos.guard.ts` | permisos de rol/usuario | autorización granular |
| `backend/prisma/schema.prisma` | Usuario, Rol, Seccion, Documento, Expediente | modelo relacional |
| `backend/src/modulos/control-acceso/autenticacion/autenticacion.service.ts` | OTP, JWT, refresh, logout | seguridad |
| `backend/src/modulos/notas/comun/flujo-notas.service.ts` | `updateMany` con versión | workflow académico y concurrencia |
| `backend/src/modulos/notas/matrices-academicas/matrices-academicas.service.ts` | fórmula y estados de matriz | consolidación académica |
| `backend/src/modulos/documentacion/movimientos/movimientos.service.ts` | `resolverDestinoInstitucional` | secuencia documental |
| `backend/src/modulos/documentacion/comun/flujo-documental.service.ts` | transición, historial, auditoría | workflow y atomicidad |
| `backend/src/modulos/documentacion/trazabilidad/trazabilidad.service.ts` | composición del expediente | trazabilidad |
| `backend/src/modulos/documentacion/tiempo-real/documentacion.gateway.ts` | conexión y `documento:evento` | tiempo real |
| `frontend/src/app/modulos/documentacion/[id]/page.tsx` | escucha socket y recarga | integración frontend documental |

## 20. Preguntas probables del tribunal

### 1. ¿Qué problema resuelve?

**Respuesta técnica:** Centraliza la gestión documental y académica, controla responsables, estados, revisiones, notas, plazos, historial y notificaciones.  
**Respuesta corta:** “Centraliza documentos y notas, y permite saber qué ocurrió, quién es responsable y qué paso sigue.”

### 2. ¿Por qué Next.js?

**Respuesta técnica:** Organiza rutas mediante App Router y facilita construir una aplicación React con páginas y componentes.  
**Respuesta corta:** “Lo elegí por su estructura de rutas y su integración natural con React.”

### 3. ¿Por qué React?

**Respuesta técnica:** Permite componentes reutilizables y manejo de estado para formularios, sesión y datos.  
**Respuesta corta:** “React permite dividir la interfaz en componentes reutilizables.”

### 4. ¿Por qué TypeScript?

**Respuesta técnica:** Define interfaces y detecta inconsistencias entre servicios, páginas y respuestas.  
**Respuesta corta:** “TypeScript reduce errores porque los datos tienen una forma definida.”

### 5. ¿Por qué NestJS?

**Respuesta técnica:** Aporta módulos, inyección de dependencias, guards, controllers, DTOs y WebSockets.  
**Respuesta corta:** “NestJS me ayudó a organizar la lógica institucional por módulos y capas.”

### 6. ¿Cuál es la diferencia entre controller y service?

**Respuesta técnica:** El controller expone la ruta y recibe datos; el service ejecuta reglas, transacciones y persistencia.  
**Respuesta corta:** “El controller recibe; el service decide y procesa.”

### 7. ¿Por qué PostgreSQL?

**Respuesta técnica:** El dominio tiene muchas relaciones, restricciones y transacciones.  
**Respuesta corta:** “PostgreSQL es adecuado porque la información institucional es relacional y requiere integridad.”

### 8. ¿Qué es Prisma?

**Respuesta técnica:** ORM tipado que conecta los servicios TypeScript con PostgreSQL y representa el esquema.  
**Respuesta corta:** “Prisma es la capa tipada de acceso; no reemplaza a PostgreSQL.”

### 9. ¿Qué es una migración?

**Respuesta técnica:** Cambio versionado de estructura que lleva la base de un estado conocido a otro.  
**Respuesta corta:** “Una migración registra de forma repetible cómo cambia la estructura de la base.”

### 10. ¿Cómo funciona la autenticación?

**Respuesta técnica:** CI/contraseña con bcrypt, OTP por correo institucional, JWT de acceso, sesión persistida y refresh token rotativo.  
**Respuesta corta:** “La identidad se verifica con contraseña y OTP; después se controla la sesión con JWT.”

### 11. ¿Qué hace JwtAuthGuard?

**Respuesta técnica:** Verifica JWT, sesión, expiración, usuario habilitado y primer inicio, y adjunta el usuario al request.  
**Respuesta corta:** “No solo valida la firma: también confirma que la sesión siga activa en la base.”

### 12. ¿Cómo funcionan los permisos?

**Respuesta técnica:** `PermisosGuard` lee `@Permisos`, combina permisos del rol con overrides individuales y autoriza si existe el permiso requerido.  
**Respuesta corta:** “El rol da permisos base y el usuario puede tener excepciones controladas.”

### 13. ¿El frontend es suficiente para proteger?

**Respuesta técnica:** No. El frontend oculta o muestra opciones, pero la seguridad real está en guards y services del backend.  
**Respuesta corta:** “La interfaz orienta al usuario; la API es la que realmente autoriza.”

### 14. ¿Cómo controla la jerarquía?

**Respuesta técnica:** Usa secciones, sección padre/hijas, roles, asignaciones y validaciones de actor. En documentos la escritura exige la sección actual; en notas los operadores requieren curso asignado.  
**Respuesta corta:** “La sección y la asignación determinan qué puede hacer el usuario en cada proceso.”

### 15. ¿Qué diferencia hay entre rol y permiso?

**Respuesta técnica:** El rol agrupa capacidades; el permiso representa una acción concreta como enviar, observar o publicar.  
**Respuesta corta:** “El rol es el perfil; el permiso es la acción autorizada.”

### 16. ¿Cómo funciona Disciplina?

**Respuesta técnica:** Registra méritos/deméritos, valida catálogo y cadete, calcula acumulado, revisa por niveles, publica semanas y crea resultado final.  
**Respuesta corta:** “Disciplina pasa de registro a revisión, publicación y resultado final con cálculo decimal.”

### 17. ¿Cómo funciona Evaluaciones?

**Respuesta técnica:** Se crean materias secuenciales, se registran notas por cadete, se valida desquite, se revisa por niveles y se publica.  
**Respuesta corta:** “Evaluaciones controla materias, notas, desquite, revisión y publicación.”

### 18. ¿Qué hace la matriz académica?

**Respuesta técnica:** Combina 80% Evaluaciones, 10% EF y 10% Disciplina, calcula acumulado, aplazos, clasificación y mérito.  
**Respuesta corta:** “La matriz consolida las fuentes académicas en un resultado institucional.”

### 19. ¿Qué es workflow?

**Respuesta técnica:** Secuencia de estados y tareas con actores, reglas, transiciones y evidencia.  
**Respuesta corta:** “Workflow es controlar qué paso sigue y quién puede ejecutarlo.”

### 20. ¿Qué diferencia hay entre BPM y BPMN?

**Respuesta técnica:** BPM es la gestión del proceso; BPMN es una notación para diagramarlo. El proyecto implementa reglas de workflow, pero no un motor BPMN externo.  
**Respuesta corta:** “BPM es el enfoque, BPMN es el dibujo y workflow es la ejecución.”

### 21. ¿Por qué no es CRUD?

**Respuesta técnica:** Una mutación depende de estado anterior, actor, permiso, sección, destino y transición válida; además genera historial y notificaciones.  
**Respuesta corta:** “No se puede editar libremente: cada acción debe respetar el proceso institucional.”

### 22. ¿Dónde está la trazabilidad?

**Respuesta técnica:** En historial de estado, auditoría, movimientos, proveídos, observaciones, cumplimientos, plazos, archivos y servicio de trazabilidad.  
**Respuesta corta:** “La trazabilidad está distribuida en evidencias relacionadas que permiten reconstruir el expediente.”

### 23. ¿Qué pasa si dos usuarios actúan a la vez?

**Respuesta técnica:** La actualización condicionada por estado, sección y/o versión afecta a una sola fila; la segunda operación recibe `ConflictException`.  
**Respuesta corta:** “Una operación gana y la otra debe actualizar la pantalla antes de reintentar.”

### 24. ¿Cómo funciona Socket.IO?

**Respuesta técnica:** El gateway autentica la conexión, el backend emite después del commit y el frontend escucha `documento:evento` y recarga datos autorizados.  
**Respuesta corta:** “El evento avisa el cambio y la pantalla vuelve a consultar el detalle.”

### 25. ¿Qué ocurre si el usuario está desconectado?

**Respuesta técnica:** La notificación permanece en `Notificacion`; al volver, la campana consulta las no leídas.  
**Respuesta corta:** “El tiempo real es adicional; la base conserva la notificación.”

### 26. ¿Por qué Scrum?

**Respuesta técnica:** Permitió organizar el desarrollo incremental por módulos, pero en el repositorio no hay evidencia completa de ceremonias formales; debe presentarse como adaptación académica.  
**Respuesta corta:** “Lo usé como marco incremental adaptado al proyecto académico.”

### 27. ¿Por qué no microservicios?

**Respuesta técnica:** El alcance y la necesidad de transacciones compartidas favorecen un monolito modular; microservicios agregarían despliegue, observabilidad y comunicación distribuida.  
**Respuesta corta:** “La modularidad era suficiente y reducía complejidad operativa.”

### 28. ¿Por qué Linux?

**Respuesta técnica:** Ofrece una plataforma de servidor eficiente y compatible con Node, PostgreSQL, Nginx, PM2 y automatización. Windows Server también es posible.  
**Respuesta corta:** “Linux es una decisión de operación y costos, no un requisito de la aplicación.”

### 29. ¿Cómo escalaría el sistema?

**Respuesta técnica:** Separaría frontend/backend, usaría Nginx, pool de conexiones, caché o Redis para rate limit/sesiones distribuidas, almacenamiento compartido, balanceo y pruebas autenticadas.  
**Respuesta corta:** “Primero optimizaría base y operación; después separaría componentes si la carga lo justifica.”

### 30. ¿Qué mejoraría antes de producción?

**Respuesta técnica:** Integraría refresh en el frontend, quitaría secretos por defecto, restringiría CORS, corregiría rutas de notificación, generaría temporales aleatorias, reforzaría archivos y realizaría pruebas autenticadas en entorno aislado.  
**Respuesta corta:** “Priorizaría seguridad de configuración, renovación de sesión, pruebas reales y respaldo operativo.”

## 21. Recomendaciones finales

1. **Se recomienda integrar la renovación automática del access token con el refresh token rotativo para mantener sesiones válidas sin cerrar prematuramente el acceso institucional.**

2. **Se recomienda reemplazar los secretos y contraseñas temporales por defecto por valores obligatorios y generados de forma segura para proteger las credenciales en producción.**

3. **Se recomienda configurar CORS, dominio, HTTPS y variables de entorno separadas por ambiente para desplegar la plataforma de forma controlada.**

4. **Se recomienda implementar copias de seguridad verificadas de PostgreSQL y del almacenamiento documental para garantizar recuperación ante fallas.**

5. **Se recomienda realizar una campaña de pruebas autenticadas en una base aislada con perfiles institucionales para validar workflows, permisos y carga de operaciones reales.**

6. **Se recomienda fortalecer la validación de archivos con inspección de contenido, antivirus y almacenamiento compartido para mejorar la seguridad y continuidad documental.**

7. **Se recomienda corregir y centralizar las rutas de navegación de notificaciones y la URL de API para evitar enlaces inválidos entre ambientes.**

8. **Se recomienda capacitar a los usuarios por perfil y documentar el procedimiento operativo de revisión, observación, cumplimiento, publicación y archivo.**

## 22. Relación entre objetivos, resultados, conclusiones y recomendaciones

| Objetivo | Resultado alcanzado | Conclusión | Recomendación futura |
|---|---|---|---|
| General | Plataforma web modular con gestión académica, documental, trazabilidad y notificaciones | Se construyó una base funcional que integra procesos y control institucional | Poner en producción con seguridad, respaldos y pruebas autenticadas |
| 1. Analizar procesos | Las reglas aparecen reflejadas en actores, secciones, estados, revisiones y flujo fijo | El análisis se tradujo a reglas ejecutables | Mantener sesiones de validación con usuarios institucionales |
| 2. Determinar arquitectura | Frontend Next.js separado de backend NestJS, Prisma y PostgreSQL | La arquitectura es adecuada al alcance y mantiene separación de responsabilidades | Configurar ambientes, proxy y monitoreo de producción |
| 3. Usuarios y jerarquía | Roles, permisos, overrides, secciones, asignaciones y sesiones | El acceso se controla más allá de ocultar botones | Fortalecer secretos, rate limit distribuido y política de temporales |
| 4. Notas | Disciplina, Evaluaciones, EF, resultados y matriz semestral/anual | Existe un flujo académico con validaciones y consolidación | Ejecutar pruebas completas con datos aislados y usuarios por perfil |
| 5. BPM y estados | Estados, niveles de revisión, transiciones, historial y concurrencia | El modelado BPM se materializó como reglas de workflow en código | Documentar diagramas BPMN si la institución los exige como entregable |
| 6. Gestión documental | Documento, expediente, hoja de ruta, proveídos, movimientos, plazos y archivos | El módulo controla el recorrido y la responsabilidad actual | Integrar almacenamiento compartido, antivirus y respaldos |
| 7. Notificaciones | Persistencia general y tiempo real documental mediante Socket.IO | El usuario puede recibir avisos en línea y consultar pendientes después | Unificar eventos en tiempo real para módulos académicos si es necesario |
| 8. Pruebas | Unitarias, E2E, QA de caja negra, integridad y carga pública documentadas | La evidencia es favorable pero no certifica workflows autenticados completos | Ejecutar una segunda campaña aislada con métricas de negocio |

## 23. Implementado actualmente versus trabajo futuro

### Implementado actualmente

- arquitectura separada frontend/backend;
- API NestJS modular;
- frontend Next.js con App Router;
- autenticación con OTP y JWT;
- sesiones y refresh token en backend;
- roles, permisos y overrides;
- secciones y asignaciones académicas;
- notas de Disciplina, Evaluaciones y EF;
- matriz académica semestral y anual calculable;
- workflow documental con estados y rutas institucionales;
- hoja de ruta y proveídos;
- movimientos, recepción, observación, subsanación, aprobación, finalización y archivo;
- plazos derivados y scheduler cada diez minutos;
- archivos privados locales con hash SHA-256;
- historial, auditoría y notificaciones persistentes;
- WebSocket documental y presencia;
- pruebas unitarias, E2E y scripts QA.

### Trabajo futuro razonable

- completar integración frontend del refresh;
- configurar producción Linux/Windows con dominio y HTTPS;
- backups restaurables de base y archivos;
- almacenamiento S3 o compartido para varias instancias;
- antivirus y magic bytes para archivos;
- rate limit distribuido;
- métricas, logs centralizados y monitoreo;
- pruebas autenticadas de extremo a extremo y carga sobre negocio;
- encuesta de aceptación aplicada a usuarios reales;
- diagramas BPMN formales si son requeridos por la tesis;
- integración con otros sistemas institucionales;
- reportes adicionales y exportaciones según necesidad.

## 24. Guía de estudio

| Tema | Qué debo entender | Cómo lo explico | Pregunta probable | Respuesta corta |
|---|---|---|---|---|
| Arquitectura | frontend, API, ORM y BD están separados | “Cada capa tiene una responsabilidad” | ¿Cómo viaja una petición? | “UI → Axios → Nest → Prisma → PostgreSQL” |
| Frontend | páginas y componentes muestran y solicitan datos | “Next organiza rutas y React componentes” | ¿Por qué Next? | “Por estructura de rutas y React” |
| Backend | controllers reciben y services deciden | “La regla de negocio vive en services” | ¿Qué hace Nest? | “Organiza la API por módulos” |
| PostgreSQL | relaciones e integridad | “La información institucional es relacional” | ¿Por qué no MongoDB? | “Las relaciones y transacciones son centrales” |
| Prisma | ORM tipado de acceso | “Conecta TypeScript con PostgreSQL” | ¿Reemplaza la BD? | “No, solo facilita acceder a ella” |
| JWT | token firmado de sesión | “Identifica la sesión, pero se valida en BD” | ¿Qué valida el guard? | “Token, sesión, expiración y usuario” |
| Roles/permisos | perfil y acciones autorizadas | “El rol da permisos base y puede haber overrides” | ¿Frontend protege? | “La protección real está en la API” |
| Notas | captura, revisión y publicación | “Las notas no se publican sin pasar niveles” | ¿Qué áreas existen? | “Disciplina, Evaluaciones y EF” |
| Workflow | pasos ordenados y controlados | “Cada transición depende del estado y actor” | ¿Es CRUD? | “No, tiene reglas y evidencia” |
| BPM | gestión y mejora del proceso | “BPM define el enfoque” | ¿Usó motor BPM? | “No; implementé reglas en NestJS” |
| BPMN | notación gráfica | “BPMN es el diagrama” | ¿Es lo mismo que BPM? | “No, uno gestiona y otro representa” |
| Trazabilidad | reconstrucción de la historia | “Registra quién, cuándo y qué cambió” | ¿Dónde está? | “Historial, auditoría y expediente” |
| WebSocket | servidor puede avisar sin polling | “Socket.IO comunica cambios documentales” | ¿Qué pasa desconectado? | “La notificación queda persistida” |
| Scrum | iteración y entregas | “Fue una adaptación académica” | ¿Hay evidencia de sprints? | “El código es incremental; debo respaldar ceremonias con mi documentación” |
| Pruebas | cada tipo responde una pregunta diferente | “Unitarias no sustituyen E2E” | ¿Qué no se probó? | “Workflows autenticados completos y carga de negocio” |
| Linux | opción de servidor | “Reduce costo operativo y facilita herramientas” | ¿Funciona en Windows? | “Sí, cambiando operación y configuración” |
| Despliegue | Nginx, frontend, backend y PostgreSQL | “443 público; 5432 privado” | ¿Por qué no exponer BD? | “Aumenta superficie de ataque” |
| Seguridad | capas, no una sola técnica | “bcrypt, OTP, JWT, permisos y auditoría trabajan juntos” | ¿Qué mejoraría? | “Secretos, refresh, CORS y pruebas reales” |
| Escalabilidad | depende de arquitectura y operación | “Primero optimizo; luego separo si hace falta” | ¿Microservicios? | “No eran necesarios inicialmente” |
| Recomendaciones | deben salir de hallazgos reales | “Cada una indica acción y finalidad” | ¿Cuál es prioridad? | “Preparar producción segura y pruebas autenticadas” |

## 25. PUNTOS QUE DEBO REVISAR ANTES DE LA DEFENSA

### Prioridad alta

1. **Refresh no integrado en frontend.** El backend implementa `/refresh`, rotación y detección de reutilización, pero `AuthContext` no lo usa. Si el tribunal pregunta, decir que la capacidad backend existe y que la integración automática es una mejora pendiente.
2. **Secretos por defecto.** Hay fallback como `clave_secreta_emse`, secretos HMAC de OTP y otros valores en código. En producción deben ser obligatorios y externos.
3. **Contraseñas temporales conocidas.** Usuarios nuevos pueden usar `123456` por defecto y el restablecimiento administrativo usa `EMSE2026.`. Debe cambiarse por un secreto aleatorio y de un solo uso antes de producción.
4. **CORS abierto.** `app.enableCors()` no restringe orígenes. Debe configurarse para el dominio real.
5. **URLs locales fijas.** `frontend/src/servicios/api.ts`, `presencia.service.ts` y `documentacion-socket.service.ts` apuntan a `http://localhost:3001`. Deben usar configuración por ambiente.

### Prioridad media

6. **Rutas de notificación.** El backend documental genera `/documentacion/expedientes/:id`, mientras las páginas reales usan `/modulos/documentacion/:id`. Revisar para que los enlaces de la campana naveguen correctamente.
7. **Notificaciones en tiempo real con alcance parcial.** El gateway documental es real-time; notas y sistema dependen de persistencia, eventos locales y polling. No decir que todos los módulos reciben WebSocket general.
8. **Rate limit en memoria.** Se pierde al reiniciar el proceso y no se comparte entre réplicas. Para varias instancias conviene Redis o almacenamiento compartido.
9. **Archivos.** La validación usa MIME y extensión y calcula SHA-256, pero no inspecciona magic bytes ni antivirus; el proveedor efectivo es almacenamiento local y `cifrado` no se usa como cifrado real.
10. **Access token almacenado.** `Sesion.token` guarda el token de acceso completo. Revisar si realmente se necesita o si debe almacenarse solo una huella/metadato.
11. **Expiraciones duplicadas.** El JWT puede leer variables de entorno, pero la expiración de sesión y refresh en base se calculan con 8 horas y 7 días fijos. Unificar la configuración.
12. **Reglas de observación documental.** `RevisionService.observar` exige `SEGUNDO_COMANDO` en el código actual. Si la documentación institucional exige observación también desde Comando, revisar la discrepancia.
13. **Documentación antigua.** `EXPLICACION_ARQUITECTURA.md` menciona Next 15, puerto 3000 y módulos placeholder. El código actual usa Next 16.2.6, backend 3001 y módulos implementados. Usar el código vigente como fuente principal.
14. **Pruebas.** Los reportes QA son de una ejecución anterior y aclaran que no se probaron workflows autenticados ni carga de negocio. No presentarlos como certificación total.
15. **Scrum/BPMN.** El repositorio no contiene evidencia suficiente de sprints formales ni archivos BPMN. Respaldar esas partes con la documentación metodológica de la tesis o explicarlas como adaptación/modelado conceptual.

### Frase final honesta para la defensa

> “El sistema tiene una base funcional y técnica sólida para su alcance: integra seguridad, permisos, notas, workflow documental, auditoría y tiempo real. Antes de producción todavía deben cerrarse la configuración de secretos y ambientes, la renovación automática del frontend, las pruebas autenticadas en una base aislada y la operación de respaldos.”

