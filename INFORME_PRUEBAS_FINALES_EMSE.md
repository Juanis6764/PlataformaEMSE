# INFORME DE PRUEBAS FINALES — PLATAFORMA INSTITUCIONAL EMSE

**Fecha de ejecución:** 13 de agosto de 2026  
**Zona horaria:** America/La_Paz (UTC-4)  
**Modalidad:** evaluación QA sin modificación del código ni de los datos  
**Resultado general:** aprobación parcial con limitaciones; no corresponde declarar certificación total.

## 1. Introducción

El objetivo fue evaluar el estado verificable de la Plataforma Institucional EMSE mediante pruebas finales de caja negra, integración, seguridad, base de datos, carga, estrés, rendimiento y aceptación. Se respetó la regla de no corregir, refactorizar ni modificar frontend, backend, Prisma, migraciones, configuración o datos operativos.

Se crearon únicamente cuatro utilidades externas dentro de `pruebas-finales/`:

- `qa_readonly.cjs`: consultas SQL dentro de `BEGIN TRANSACTION READ ONLY` y sondas HTTP seguras.
- `qa_load.cjs`: carga, estrés y recuperación mediante solicitudes `GET`.
- `qa_frontend_clean_build.ps1`: construcción temporal aislada del frontend, sin instalar dependencias.
- `qa_auth_timing.cjs`: comparación controlada de tiempos de dos respuestas de autenticación fallida.

No se ejecutaron `migrate reset`, `db push`, nuevas migraciones, `DROP`, `TRUNCATE`, borrados masivos ni inserciones de prueba sobre `emse_db`. Tampoco se ejecutaron las suites E2E de negocio que crean y eliminan datos. No se instaló ninguna dependencia.

## 2. Entorno de pruebas

| Componente | Entorno observado |
|---|---|
| Sistema operativo | Windows / PowerShell |
| Node.js | 22.14.0 |
| Frontend | Next.js 16.2.6, React 19.2.4, TypeScript 5 |
| Backend | NestJS 11, TypeScript 5.7.3 |
| ORM | Prisma 7.8.0, adaptador PostgreSQL |
| Base de datos | PostgreSQL 16.8, base `emse_db`, esquema `public`, puerto 5432 |
| Pruebas | Jest 30, Supertest, navegador integrado, scripts externos Node.js |
| Carga | Generador Node.js externo; k6, JMeter, Artillery y Docker no estaban disponibles |

### Comandos principales ejecutados

```text
npm.cmd test -- --runInBand --no-cache
npx.cmd jest --config ./test/jest-e2e.json --runInBand --no-cache test/app.e2e-spec.ts
npm.cmd run build                         # backend
npm.cmd run lint                          # frontend
npm.cmd run build                         # frontend en directorio actual
powershell.exe -File pruebas-finales/qa_frontend_clean_build.ps1
npx.cmd prisma validate
npx.cmd prisma migrate status
node --env-file=backend/.env pruebas-finales/qa_readonly.cjs
node pruebas-finales/qa_load.cjs load
node pruebas-finales/qa_load.cjs stress
node pruebas-finales/qa_load.cjs recovery
node --env-file=backend/.env pruebas-finales/qa_auth_timing.cjs
```

## 3. Pruebas existentes

### 3.1 Inventario

| Tipo de prueba existente | Archivo | Módulo | Qué valida | Estado |
|---|---|---|---|---|
| Configuración Jest | `backend/package.json` | Backend | Patrón `*.spec.ts`, ts-jest y entorno Node | CONFIGURADO |
| Configuración Jest E2E | `backend/test/jest-e2e.json` | Backend | Patrón `*.e2e-spec.ts` y Supertest | CONFIGURADO |
| Unitaria | `backend/src/app.controller.spec.ts` | Aplicación | Definición del controlador raíz | APROBADO |
| Unitaria | `backend/src/comun/utilidades/semestre-academico.spec.ts` | Académico | Cálculo de semestre académico | APROBADO |
| Unitaria | `backend/src/comun/validaciones/persona.validaciones.spec.ts` | Datos personales | Formatos válidos e inválidos | APROBADO |
| Unitaria | `backend/src/comun/validaciones/seed-academico.spec.ts` | Seed académico | No fabricar historial y periodos de la gestión actual | APROBADO |
| Unitaria | `backend/src/modulos/auditoria/auditoria.service.spec.ts` | Auditoría | Cliente transaccional y ocultación de secretos | APROBADO |
| Unitaria | `backend/src/modulos/control-acceso/autenticacion/autenticacion.controller.spec.ts` | Autenticación | Instanciación del controlador | APROBADO |
| Unitaria | `backend/src/modulos/control-acceso/autenticacion/autenticacion.service.spec.ts` | Autenticación | Instanciación del servicio | APROBADO; cobertura funcional mínima |
| Unitaria | `backend/src/modulos/control-acceso/cadetes/cadetes.service.spec.ts` | Cadetes | Curso, periodo e historial académico real | APROBADO |
| Unitaria | `backend/src/modulos/control-acceso/permisos/permisos.controller.spec.ts` | Permisos | Definición y listado | APROBADO |
| Unitaria | `backend/src/modulos/control-acceso/permisos/permisos.service.spec.ts` | Permisos | Listado, inexistencia y duplicados | APROBADO |
| Unitaria | `backend/src/modulos/control-acceso/presencia/presencia.service.spec.ts` | Presencia | Pestañas, latidos y desconexión | APROBADO |
| Unitaria | `backend/src/modulos/control-acceso/roles/roles.controller.spec.ts` | Roles | Definición y listado | APROBADO |
| Unitaria | `backend/src/modulos/control-acceso/roles/roles.service.spec.ts` | Roles | Crear, duplicado, ADMIN protegido e inexistencia | APROBADO |
| Unitaria | `backend/src/modulos/control-acceso/secciones/secciones.controller.spec.ts` | Secciones | Definición y listado | APROBADO |
| Unitaria | `backend/src/modulos/control-acceso/secciones/secciones.service.spec.ts` | Secciones | Inexistencia, duplicado y jerarquía activa | APROBADO |
| Unitaria | `backend/src/modulos/control-acceso/usuarios/usuarios.controller.spec.ts` | Usuarios | Definición y paginación | APROBADO |
| Unitaria | `backend/src/modulos/control-acceso/usuarios/usuarios.service.spec.ts` | Usuarios | CI duplicado, inexistencia y restablecimiento | APROBADO |
| Unitaria | `backend/src/modulos/documentacion/comun/correlativo-documental.service.spec.ts` | Documental | Correlativo atómico y hoja de ruta | APROBADO |
| Unitaria | `backend/src/modulos/documentacion/comun/flujo-documental.service.spec.ts` | Documental | Carrera/doble clic, historial y auditoría transaccional | APROBADO |
| Unitaria | `backend/src/modulos/documentacion/comun/validaciones-documentales.service.spec.ts` | Documental/RBAC | Perfil, permisos, sección y alcance histórico | APROBADO |
| Unitaria | `backend/src/modulos/documentacion/plazos/plazos.service.spec.ts` | Plazos | Pendiente, vencido y cumplimiento | APROBADO |
| Unitaria | `backend/src/modulos/notas/comun/calculo-disciplina.spec.ts` | Disciplina | Méritos, deméritos, redondeo y alertas | APROBADO |
| Unitaria | `backend/src/modulos/notas/comun/validaciones-notas.service.spec.ts` | Notas/RBAC | Curso del operador y alcances de Encargado/Comando | APROBADO |
| Unitaria | `backend/src/modulos/notas/evaluaciones/calculo-evaluaciones.spec.ts` | Evaluaciones | Desquite, promedio, ranking y empates | APROBADO |
| Unitaria | `backend/src/modulos/notificaciones/notificaciones.service.spec.ts` | Notificaciones | Emisor, idempotencia y destinatarios únicos | APROBADO |
| E2E | `backend/test/app.e2e-spec.ts` | Aplicación | Arranque de AppModule y `GET /` | APROBADO: 1/1 |
| E2E con BD aislada | `backend/test/documentacion.e2e-spec.ts` | Documental | 41 casos: recorrido completo, archivos, observación, respuesta, roles, secciones y reportes | NO EJECUTADO: escribe datos y exige BD aislada |
| E2E con BD aislada | `backend/test/notas-disciplina.e2e-spec.ts` | Disciplina | 15 casos: registro, revisión, publicación, cadete, Comando y snapshot | NO EJECUTADO: escribe datos y exige BD aislada |
| E2E con BD aislada | `backend/test/notas-evaluaciones.e2e-spec.ts` | Evaluaciones | 8 casos: configuración, notas, revisión, publicación y resultados | NO EJECUTADO: escribe datos y exige BD aislada |
| Automatizada | Frontend | Next.js | No se encontraron `*.spec.*`, `*.test.*`, Playwright, Cypress, Jest ni Vitest | AUSENTE |

### 3.2 Resultado de ejecución existente

```text
Test Suites: 25 passed, 25 total
Tests:       111 passed, 111 total
Snapshots:   0 total
Time:        9.562 s
```

La prueba E2E de arranque obtuvo `1 passed, 1 total` en 20,035 s. El backend también compiló correctamente.

### 3.3 Cobertura faltante o incompleta

- La autenticación existente solo comprueba que controlador y servicio puedan instanciarse; no cubre login, OTP, refresh, logout, expiración ni bloqueo.
- No hay pruebas directas de `JwtAuthGuard` ni `PermisosGuard`.
- Las tres suites E2E de negocio sustituyen los guards reales por guards de prueba; validan servicios y restricciones de dominio, pero no la cadena JWT/RBAC real.
- No hay pruebas automatizadas del frontend.
- No existían pruebas de carga, estrés o aceptación.
- Falta un entorno E2E aislado autorizado con credenciales de perfiles representativos.

## 4. Pruebas funcionales de caja negra

Estados usados: **APROBADO**, **FALLIDO**, **NO EVALUABLE**.

| ID | Módulo | Caso de prueba | Precondición | Acción | Resultado esperado | Resultado obtenido | Estado |
|---|---|---|---|---|---|---|---|
| FUN-01 | Backend | Salud pública | Backend levantado | `GET /` | 200 | 200, “Backend funcionando”, 26,68 ms | APROBADO |
| FUN-02 | Backend | Swagger de desarrollo | Backend levantado | `GET /api/documentacion` | 200 | 200, Swagger UI | APROBADO |
| FUN-03 | Frontend | Portada de producción | Build limpio | `GET /` | 200 | 200, 44 ms | APROBADO |
| FUN-04 | Frontend/Auth | Formulario de acceso | Build limpio | Abrir `/iniciar-sesion` | Formulario visible | Logo, CI, contraseña y botón visibles | APROBADO |
| FUN-05 | Frontend/Auth | Campos obligatorios | Formulario vacío | Pulsar Iniciar sesión | Bloqueo del navegador | Ambos campos `required`; mensaje “Completa este campo” | APROBADO |
| FUN-06 | Auth | Contraseña incorrecta | Usuario habilitado existente | POST con clave incorrecta | 401 genérico | 401 “Credenciales inválidas” | APROBADO |
| FUN-07 | Auth | Usuario inexistente | CI numérico inexistente | POST de login | 401 genérico | 401 “Credenciales inválidas” | APROBADO |
| FUN-08 | Auth | Usuario inhabilitado | Usuario inhabilitado | Login | 401 | Los 389 usuarios están habilitados; falta precondición | NO EVALUABLE |
| FUN-09 | JWT | `/autenticacion/me` sin token | Ninguna | GET directo | 401 | 401, token no proporcionado | APROBADO |
| FUN-10 | JWT | `/autenticacion/me` con token inválido | Token ficticio | GET directo | 401 | 401, token inválido | APROBADO |
| FUN-11 | JWT | Login correcto y OTP | Credencial real y acceso al segundo factor | Login y verificación | Tokens válidos | No se proporcionaron credenciales/OTP | NO EVALUABLE |
| FUN-12 | JWT | `/autenticacion/me` con token válido | Sesión activa | GET | Perfil del usuario | No había sesiones activas aptas | NO EVALUABLE |
| FUN-13 | ACL/UI | URL administrativa sin sesión | Navegador sin sesión | Abrir `/modulos/control-acceso/usuarios` | Redirección | Redirigió a `/iniciar-sesion` | APROBADO |
| FUN-14 | ACL/API | Usuarios sin token | Ninguna | `GET /usuarios` | 401 | 401 | APROBADO |
| FUN-15 | Usuarios | Administrador gestiona usuarios | Token ADMINISTRADOR | CRUD controlado | Permitido | Faltan credenciales y BD aislada | NO EVALUABLE |
| FUN-16 | ACL | Usuario sin permiso entra a administración | Token limitado | URL y API directa | 403 | Falta token de perfil limitado | NO EVALUABLE |
| FUN-17 | ACL | Cadete entra a administración | Token CADETE | URL y API directa | 403 | Falta token de cadete | NO EVALUABLE |
| FUN-18 | Secciones | Operador actúa fuera de su sección/curso | Token OPERADOR y datos de prueba | API directa | 403 | Falta token y entorno aislado | NO EVALUABLE |
| FUN-19 | Documental | Listado sin token | Ninguna | `GET /documentacion/documentos` | 401 | 401 | APROBADO |
| FUN-20 | Documental | Registrar documento y cargar archivo | Actor RADIO, archivo y BD aislada | POST y multipart | Persistencia | Prueba mutaría datos operativos | NO EVALUABLE |
| FUN-21 | Documental | Hoja de ruta y proveídos | Documento de prueba | Acciones sucesivas | Cambios válidos | Prueba mutaría datos operativos | NO EVALUABLE |
| FUN-22 | Documental | Envío, derivación y recepción | Documento de prueba | Flujo institucional | Estados válidos | Prueba mutaría datos operativos | NO EVALUABLE |
| FUN-23 | Documental | Transición inválida o repetida | Documento de prueba | Doble recepción/transición | 409/403 | Prueba mutaría datos operativos | NO EVALUABLE |
| FUN-24 | Documental | Sección incorrecta/acceso cruzado | Varios perfiles | API directa | 403/404 | Faltan tokens y datos aislados | NO EVALUABLE |
| FUN-25 | Documental | Observación, subsanación, aprobación, finalización y archivo | Expediente aislado | Flujo completo | Historial coherente | Prueba mutaría datos operativos | NO EVALUABLE |
| FUN-26 | Documental | Trazabilidad, historial y notificaciones | Token participante | Consultar | Datos completos | API no evaluable; BD contiene 1 expediente archivado, 20 eventos y 16 notificaciones | NO EVALUABLE |
| FUN-27 | Cadetes | Consulta sin token | Ninguna | `GET /cadetes` | 401 | 401 | APROBADO |
| FUN-28 | Académico | Gestiones, cursos y periodos | Token autorizado | CRUD controlado | Flujo válido | Falta token y entorno aislado | NO EVALUABLE |
| FUN-29 | Disciplina | Registro, envío, revisión, aprobación y publicación | Datos académicos aislados | Flujo completo | Resultado publicado | Prueba mutaría datos operativos | NO EVALUABLE |
| FUN-30 | Evaluaciones | Notas y workflow | Materias y datos aislados | Flujo completo | Resultados correctos | Hay 0 materias y 0 notas; falta entorno aislado | NO EVALUABLE |
| FUN-31 | Cadete | Mis notas sin token | Ninguna | `GET /notas/evaluaciones/mis-notas` | 401 | 401 | APROBADO |
| FUN-32 | Cadete | Propias notas vs. otro cadete | Token CADETE | Consultas directas | Solo datos propios | Falta token válido | NO EVALUABLE |
| FUN-33 | Entrenamiento físico | Funciones actuales | Implementación activa | Inspección | Solo evaluar lo implementado | Funcionalidad pendiente de implementación; no evaluada | NO EVALUABLE |
| FUN-34 | Frontend dev | Rutas desde estado local actual | `npm run dev` | Abrir cuatro rutas | 200 | Todas devolvieron 404; build aislado sí funciona | FALLIDO |

### Workflow documental real encontrado

El esquema implementa: `REGISTRADO → EN_TRANSITO ↔ EN_TRAMITE → APROBADO → EN_TRANSITO/EN_TRAMITE → FINALIZADO → ARCHIVADO`, con la rama `OBSERVADO`. Los conceptos hoja de ruta, proveído y derivación son entidades/acciones, no estados del enum.

La lectura no destructiva encontró un expediente actualmente `ARCHIVADO` y las siguientes transiciones persistidas: inicio→registrado (1), registrado→en tránsito (1), en tránsito→en trámite (8), en trámite→en tránsito (6), en trámite→aprobado (1), aprobado→en tránsito (1), en trámite→finalizado (1) y finalizado→archivado (1). Esto demuestra persistencia histórica existente, pero no sustituye una nueva ejecución funcional con actores reales.

## 5. Pruebas de integración

| ID | Componentes involucrados | Entrada | Proceso | Esperado | Obtenido | Estado |
|---|---|---|---|---|---|---|
| INT-01 | NestJS → AppModule → Prisma → PostgreSQL | Arranque E2E y `GET /` | Inicializa módulos y conexión | 200 | 1 prueba E2E aprobada | APROBADO |
| INT-02 | Next.js → TypeScript → rutas | Código copiado a entorno temporal | Build limpio y servidor de producción | Build y rutas 200 | 30 rutas generadas; cuatro rutas 200 | APROBADO |
| INT-03 | Navegador → protección frontend | URL administrativa sin sesión | AuthContext/Layout protegido | Redirigir a login | Redirección correcta | APROBADO |
| INT-04 | HTTP → NestJS → JwtAuthGuard | Recursos protegidos sin token | Petición directa, sin UI | Rechazo backend | 401 en usuarios, documentos, cadetes y mis notas | APROBADO |
| INT-05 | Prisma CLI → esquema → PostgreSQL | `validate` y `migrate status` | Carga schema y revisa migraciones | Válido/actualizado | Schema válido; 39 migraciones; BD actualizada | APROBADO |
| INT-06 | Frontend → API → JWT → permisos → servicios → Prisma | Usuario real | Flujo autenticado completo | Resultado de negocio | Sin credenciales, OTP ni sesión válida | NO EVALUABLE |
| INT-07 | Workflow documental/académico completo | Datos de prueba aislados | Escrituras, historial y notificación | Persistencia integral | Prohibido usar `emse_db`; no se creó BD aislada | NO EVALUABLE |

## 6. Pruebas de seguridad y control de acceso

### 6.1 Matriz de acceso ejecutada

| Usuario/Rol | Recurso | Acción | Debería permitir | Resultado | Estado |
|---|---|---|---|---|---|
| Anónimo | `/autenticacion/me` | Leer perfil | No | 401 | APROBADO |
| Token inválido | `/autenticacion/me` | Leer perfil | No | 401 | APROBADO |
| Anónimo | `/usuarios` | Listar | No | 401 | APROBADO |
| Anónimo | `/documentacion/documentos` | Listar | No | 401 | APROBADO |
| Anónimo | `/cadetes` | Listar | No | 401 | APROBADO |
| Anónimo | `/notas/evaluaciones/mis-notas` | Consultar | No | 401 | APROBADO |
| Sin sesión de navegador | Administración de usuarios | Abrir URL | No | Redirección a login | APROBADO |
| ADMINISTRADOR | Usuarios | Gestionar | Sí | Falta sesión real | NO EVALUABLE |
| Usuario sin permiso | Administración | Acceder por API | No | Falta sesión limitada | NO EVALUABLE |
| CADETE | Administración | Acceder por API | No | Falta sesión de cadete | NO EVALUABLE |
| OPERADOR | Curso/sección ajena | Modificar | No | Falta sesión y datos aislados | NO EVALUABLE |
| Documental de otra sección | Documento ajeno | Ver/actuar | No | Falta sesión y datos aislados | NO EVALUABLE |
| CADETE | Otro cadete | Consultar notas | No | Falta sesión válida | NO EVALUABLE |

El backend sí rechaza peticiones directas sin token, por lo que esconder botones en el frontend no es la única barrera. No se pudo demostrar el control fino por rol/sección con JWT real.

### 6.2 Comparación temporal de login inválido

| Caso | Muestras | HTTP | Promedio | Mediana | p95 | Mínimo | Máximo |
|---|---:|---|---:|---:|---:|---:|---:|
| Usuario real + clave incorrecta | 5 | 5×401 | 142,61 ms | 107,99 ms | 316,99 ms | 84,08 ms | 316,99 ms |
| Usuario inexistente | 5 | 5×401 | 199,97 ms | 198,14 ms | 231,76 ms | 172,15 ms | 231,76 ms |

El contenido de la respuesta es uniforme, pero el promedio del usuario inexistente fue 1,40× mayor. Se registra como posible canal lateral temporal de severidad MEDIA; la muestra local es pequeña y no permite afirmar explotación práctica.

## 7. Pruebas de carga

Herramienta: `qa_load.cjs`. Metodología: ráfagas locales de tres iteraciones por usuario virtual, solo contra `GET /`, el único endpoint de consulta exitoso, público y no mutable disponible sin credenciales. Total: **2.055 solicitudes**, todas 200.

| Usuarios | Solicitudes | Exitosas | Fallidas | Promedio | p95 | Error % | Estado |
|---:|---:|---:|---:|---:|---:|---:|---|
| 10 | 30 | 30 | 0 | 17,49 ms | 46,05 ms | 0 % | APROBADO |
| 25 | 75 | 75 | 0 | 15,22 ms | 34,64 ms | 0 % | APROBADO |
| 50 | 150 | 150 | 0 | 29,17 ms | 73,20 ms | 0 % | APROBADO |
| 100 | 300 | 300 | 0 | 43,43 ms | 90,19 ms | 0 % | APROBADO |
| 200 | 600 | 600 | 0 | 68,33 ms | 151,46 ms | 0 % | APROBADO |
| 300 | 900 | 900 | 0 | 87,72 ms | 169,95 ms | 0 % | APROBADO |

| Usuarios | Mediana | p90 | Máximo | Throughput |
|---:|---:|---:|---:|---:|
| 10 | 6,41 ms | 40,11 ms | 66,13 ms | 344,76 req/s |
| 25 | 14,77 ms | 27,65 ms | 40,48 ms | 770,01 req/s |
| 50 | 25,20 ms | 66,36 ms | 77,52 ms | 856,12 req/s |
| 100 | 40,18 ms | 77,71 ms | 100,98 ms | 1.066,23 req/s |
| 200 | 60,86 ms | 134,84 ms | 173,27 ms | 1.288,51 req/s |
| 300 | 84,47 ms | 153,78 ms | 193,39 ms | 1.539,68 req/s |

**Interpretación:** el endpoint raíz permaneció estable hasta la carga máxima aplicada. No es válido extrapolar este resultado a login, JWT, listados, Prisma ni PostgreSQL.

## 8. Pruebas de estrés

Se aplicaron dos iteraciones por usuario virtual en ráfagas de 50 a 400 concurrentes. Total: **2.900 solicitudes**, todas 200.

| Concurrentes | Solicitudes | Promedio | Mediana | p95 | Máximo | Error % | Throughput |
|---:|---:|---:|---:|---:|---:|---:|---:|
| 50 | 100 | 22,16 ms | 25,25 ms | 37,13 ms | 45,14 ms | 0 % | 1.017,12 req/s |
| 100 | 200 | 31,78 ms | 30,93 ms | 63,78 ms | 68,78 ms | 0 % | 1.507,73 req/s |
| 150 | 300 | 44,64 ms | 41,32 ms | 89,81 ms | 100,73 ms | 0 % | 1.435,78 req/s |
| 200 | 400 | 58,25 ms | 54,99 ms | 118,87 ms | 127,14 ms | 0 % | 1.444,34 req/s |
| 250 | 500 | 75,83 ms | 72,85 ms | 157,72 ms | 170,75 ms | 0 % | 1.486,05 req/s |
| 300 | 600 | 84,10 ms | 80,12 ms | 171,29 ms | 192,15 ms | 0 % | 1.621,18 req/s |
| 400 | 800 | 103,17 ms | 100,54 ms | 202,68 ms | 226,55 ms | 0 % | 1.765,22 req/s |

Recuperación posterior: 10 concurrentes, 30/30 respuestas 200, promedio 9,88 ms y p95 15,84 ms.

- **Carga estable observada:** 50–400 para `GET /`.
- **Inicio de degradación:** aumento gradual de latencia; p95 pasó de 37,13 a 202,68 ms.
- **Saturación:** no alcanzada para el endpoint raíz.
- **Después de reducir carga:** retorno a p95 15,84 ms y 0 % de error.

**Advertencia obligatoria:** usuarios registrados ≠ usuarios concurrentes. La base contiene 389 usuarios y 369 cadetes, pero la prueba no demuestra que 400 personas puedan ejecutar simultáneamente operaciones autenticadas de negocio.

## 9. Pruebas de rendimiento

Clasificación orientativa: muy bueno <500 ms; aceptable 500 ms–1 s; revisar 1–2 s; lento >2 s.

| Endpoint/operación | Condición | Medición | Clasificación | Alcance |
|---|---|---:|---|---|
| Backend `/` | 1 solicitud | 26,68 ms | Muy bueno | Público |
| Swagger | 1 solicitud | 2,71 ms | Muy bueno | Desarrollo |
| `/autenticacion/me` | Sin token | 3,25 ms | Muy bueno | Solo rechazo JWT |
| `/autenticacion/me` | Token inválido | 1,96 ms | Muy bueno | Solo rechazo JWT |
| `/usuarios` | Sin token | 1,66 ms | Muy bueno | No ejecutó consulta de negocio |
| `/documentacion/documentos` | Sin token | 7,81 ms | Muy bueno | No ejecutó consulta de negocio |
| `/cadetes` | Sin token | 1,75 ms | Muy bueno | No ejecutó consulta de negocio |
| `/notas/evaluaciones/mis-notas` | Sin token | 3,46 ms | Muy bueno | No ejecutó consulta de negocio |
| Login real con clave incorrecta | 5 muestras | 142,61 ms promedio | Muy bueno | bcrypt; terminó en 401 |
| Login inexistente | 5 muestras | 199,97 ms promedio | Muy bueno | bcrypt ficticio; terminó en 401 |
| Frontend `/` limpio | Producción | 44 ms | Muy bueno | Render inicial HTTP |
| Frontend `/iniciar-sesion` limpio | Producción | 34 ms | Muy bueno | Render inicial HTTP |
| Frontend `/panel` limpio | Producción | 34 ms | Muy bueno | Sin sesión de negocio |
| Frontend usuarios limpio | Producción | 33 ms | Muy bueno | Render inicial HTTP |
| Carga 300 | `GET /` | p95 169,95 ms | Muy bueno | Ráfaga pública |
| Estrés 400 | `GET /` | p95 202,68 ms | Muy bueno | Ráfaga pública |

No se identificaron endpoints lentos entre los efectivamente ejecutados. Listados autenticados, trazabilidad, notificaciones y consultas académicas de negocio quedan **NO EVALUABLES**.

## 10. Prueba de aceptación del usuario

No se inventaron participantes ni respuestas. Instrumento preparado para aplicación posterior.

Escala Likert: 1 = Muy en desacuerdo; 2 = En desacuerdo; 3 = Neutral; 4 = De acuerdo; 5 = Muy de acuerdo.

| Código | Afirmación |
|---|---|
| P1 | El inicio de sesión y el acceso a la plataforma son fáciles de comprender. |
| P2 | La interfaz presenta textos, botones y mensajes claros. |
| P3 | Puedo encontrar rápidamente las funciones que necesito. |
| P4 | Las funciones utilizadas operan correctamente durante mi tarea. |
| P5 | La velocidad de respuesta me permite trabajar sin demoras importantes. |
| P6 | El módulo documental facilita registrar, derivar y atender documentos. |
| P7 | La trazabilidad permite conocer claramente el recorrido y estado de un documento. |
| P8 | La consulta académica presenta notas y resultados de forma comprensible. |
| P9 | Las notificaciones son oportunas y útiles para mis responsabilidades. |
| P10 | En general, estoy satisfecho/a con la Plataforma Institucional EMSE. |

### Plantilla de registro

| Participante anónimo | Perfil | P1 | P2 | P3 | P4 | P5 | P6 | P7 | P8 | P9 | P10 | Comentario |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| U01 |  |  |  |  |  |  |  |  |  |  |  |  |
| U02 |  |  |  |  |  |  |  |  |  |  |  |  |
| U03 |  |  |  |  |  |  |  |  |  |  |  |  |

### Cálculos

- Promedio por pregunta: suma de las respuestas válidas de esa pregunta / número de participantes que la respondieron.
- Promedio general: suma de todas las respuestas válidas / cantidad total de respuestas válidas.
- Porcentaje de aceptación: `(cantidad de respuestas 4 o 5 / cantidad total de respuestas válidas) × 100`.
- Presentar siempre el número real de participantes, perfil, fecha y tareas realizadas. No interpretar respuestas vacías como cero.

## 11. Defectos encontrados

| ID | Módulo | Problema | Severidad | Evidencia | Recomendación posterior |
|---|---|---|---|---|---|
| DEF-01 | Frontend/entorno local | El estado generado `.next/dev/types/routes.d.ts` está corrupto; `npm run dev` respondió 404 en `/`, login, panel y usuarios. El build del directorio actual falló en la línea 56 del archivo generado. | MEDIO | Cuatro HTTP 404 y texto residual `iar-sesion": {}`; el build limpio aislado pasó y sirvió 200 | Después de esta auditoría, detener Next, respaldar evidencia, limpiar únicamente `.next` y regenerar; no cambiar fuente salvo que reaparezca |
| DEF-02 | Autenticación | Posible canal lateral temporal: usuario inexistente promedió 199,97 ms frente a 142,61 ms para usuario real con clave incorrecta. La rama inexistente genera además un hash bcrypt síncrono por solicitud. | MEDIO | 5+5 muestras, todas 401; razón 1,40×; `autenticacion.service.ts` líneas 97–106 | Precalcular un hash ficticio con costo equivalente, hacer una sola comparación y añadir prueba estadística de regresión |
| DEF-03 | Recuperación de administrador | `scripts/recuperar-admin.ts` busca el rol `ADMIN`, mientras seed, esquema y BD usan `ADMINISTRADOR`; el procedimiento lanzaría “no se encontró” antes de recuperar la cuenta. | ALTO | Script líneas 62–65; BD observada: rol `ADMINISTRADOR` con 1 usuario | Alinear el nombre del rol y probar el procedimiento exclusivamente en una copia aislada antes de usarlo |

No se aplicó ninguna corrección.

## 12. Prueba de base de datos

| Verificación | Resultado | Estado |
|---|---|---|
| Conexión PostgreSQL | `emse_db`, PostgreSQL 16.8, no está en recuperación | APROBADO |
| Prisma schema | `prisma validate`: válido | APROBADO |
| Migraciones | 39 encontradas; “Database schema is up to date” | APROBADO |
| Restricciones | 42 PK, 90 FK, 22 CHECK, 1 UNIQUE constraint, 80 índices únicos totales | APROBADO |
| Validez de restricciones/índices | 0 restricciones no validadas; 0 índices inválidos | APROBADO |
| Duplicados comprobados | 0 en CI, rol, permiso, código documental, hoja de ruta y nota materia/cadete | APROBADO |
| Integridad referencial lógica | 0 huérfanos en ocho relaciones principales | APROBADO |
| Persistencia | 389 usuarios, 369 cadetes, 1 documento/expediente, 20 historiales, 16 notificaciones, 53 registros disciplina | APROBADO |
| Evaluaciones operativas | 0 materias y 0 notas; falta dato funcional | NO EVALUABLE |
| Intento de insertar duplicados/FK inválidas | Implicaría escritura, aunque fuera con rollback | NO EVALUABLE por regla de no alterar datos |

Todas las consultas de la sonda se ejecutaron en transacción `READ ONLY` y finalizaron con `ROLLBACK`.

## 13. Caja blanca limitada

| Archivo | Método | Lógica crítica | Caminos que debería cubrir una prueba futura |
|---|---|---|---|
| `backend/src/modulos/control-acceso/autenticacion/autenticacion.service.ts` | `iniciarSesion`, `verificarCodigo`, `refresh` | bcrypt, usuario habilitado, OTP, sesión, RTR y expiraciones | usuario inexistente/real, clave válida/inválida, sin correo, OTP válido/expirado/reutilizado, límite de intentos, refresh válido/reutilizado |
| `backend/src/comun/guards/permisos.guard.ts` y `jwt-auth.guard.ts` | `canActivate` | Firma JWT, sesión activa, primer inicio, permisos de rol y overrides individuales | sin token, token inválido/expirado, sesión cerrada, usuario bloqueado, permiso concedido/revocado, OR de permisos |
| `backend/src/modulos/documentacion/comun/flujo-documental.service.ts` | `cambiarEstado` | Estado/sección esperados, `updateMany` concurrente, historial y auditoría transaccional | transición permitida, estado incorrecto, sección incorrecta, doble clic, carrera, rollback si falla historial/auditoría |

## 14. Evidencias recomendadas para el proyecto de grado

| Figura sugerida | Qué debe verse |
|---|---|
| Figura N.º 1: Pruebas unitarias del backend | Consola con “25 passed” y “111 passed” |
| Figura N.º 2: Prueba E2E de disponibilidad | “1 passed” y el comando de `app.e2e-spec.ts` |
| Figura N.º 3: Construcción limpia del frontend | “Compiled successfully”, TypeScript finalizado y lista de 30 rutas |
| Figura N.º 4: Formulario de inicio de sesión | Logo, campos CI/contraseña y botón; no mostrar credenciales |
| Figura N.º 5: Protección de API | Respuestas 401 de `/autenticacion/me` sin token y con token inválido |
| Figura N.º 6: Estado de migraciones | `39 migrations found` y `Database schema is up to date` |
| Figura N.º 7: Integridad de base de datos | Conteos de FK/PK y todos los huérfanos/duplicados en cero |
| Figura N.º 8: Carga con 100 concurrentes | 300/300, p95 90,19 ms, 0 % error |
| Figura N.º 9: Carga con 300 concurrentes | 900/900, p95 169,95 ms, 0 % error |
| Figura N.º 10: Estrés a 400 y recuperación | 800/800, p95 202,68 ms; luego 30/30 y p95 15,84 ms |
| Figura N.º 11: Defecto del entorno frontend | Los 404 y el error de `.next/dev/types/routes.d.ts`; acompañar con el build limpio aprobado |
| Figura N.º 12: Instrumento de aceptación | Escala Likert y diez preguntas, todavía sin resultados |

Evitar en capturas: JWT, refresh tokens, contraseñas, OTP, `DATABASE_URL`, SMTP, correos, CI o nombres personales.

## 15. Resumen general

Las filas se solapan por propósito; no deben sumarse como un total único.

| Tipo de prueba | Ejecutadas | Aprobadas | Fallidas | Resultado |
|---|---:|---:|---:|---|
| Unitarias existentes | 111 | 111 | 0 | APROBADO |
| E2E smoke | 1 | 1 | 0 | APROBADO |
| Funcionales de caja negra | 15 | 14 | 1 | PARCIAL; 19 no evaluables |
| Integración | 5 | 5 | 0 | PARCIAL; 2 flujos completos no evaluables |
| Seguridad | 9 | 8 | 1 | PARCIAL; RBAC fino no evaluable |
| Base de datos | 9 | 9 | 0 | APROBADO en lectura; 2 casos de escritura no evaluables |
| Carga | 6 niveles | 6 | 0 | APROBADO solo para `GET /` |
| Estrés y recuperación | 8 fases | 8 | 0 | APROBADO solo para `GET /` |
| Calidad frontend | 3 | 2 | 1 | Lint y build limpio aprobados; estado `.next` actual falló |
| Aceptación de usuario | 0 | 0 | 0 | INSTRUMENTO PREPARADO |

## 16. Conclusión

Se comprobó objetivamente que:

- Las 111 pruebas unitarias existentes pasan.
- El backend compila, inicia, conecta Prisma/PostgreSQL y protege endpoints ante ausencia o invalidez de JWT.
- Prisma valida el esquema y las 39 migraciones están aplicadas.
- Las relaciones principales verificadas no presentan huérfanos ni duplicados observados.
- El frontend pasa lint y se construye correctamente en un entorno aislado limpio; sus rutas de producción responden 200.
- El endpoint raíz respondió sin errores en las ráfagas aplicadas hasta 400 concurrentes y se recuperó al reducir carga.

Presentan observaciones:

- El estado generado `.next` del directorio actual está corrupto y bloquea desarrollo/producción local hasta regenerarlo.
- Existe una diferencia temporal medible en login inválido que conviene corregir y volver a evaluar.
- El script de recuperación del administrador usa un nombre de rol incompatible con la BD actual.
- No se pudo validar login exitoso, OTP, token válido, RBAC por rol/sección ni workflows completos con la cadena real.

Por falta de credenciales, OTP y una base de pruebas aislada autorizada, varios casos críticos son **NO EVALUABLES**. Por tanto, no se afirma que el sistema sea 100 % seguro ni que soporte 300/400 usuarios concurrentes en operaciones reales. Los resultados de carga se limitan al endpoint público raíz.
