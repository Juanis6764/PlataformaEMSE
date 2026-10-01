# Guía de pruebas: validaciones y restablecimiento de contraseña

## Preparación

- Base URL: `http://localhost:3001`.
- Inicie sesión con un administrador y guarde el access token como `{{token_admin}}`.
- En las peticiones administrativas use `Authorization: Bearer {{token_admin}}`.
- Sustituya `{{id_rol}}`, `{{id_curso}}` e IDs de usuario por registros existentes.
- Use un CI nuevo en cada creación válida. Los ejemplos `990001` y `990002` son ilustrativos.

## 1. Crear usuario válido

`POST /usuarios`

```json
{
  "nombres": "María José",
  "apellidos": "Núñez Álvarez",
  "ci": "990001",
  "correo": "correo.compartido@emse.edu.bo",
  "id_rol": {{id_rol}}
}
```

Respuesta esperada: `201`, usuario creado y `primer_inicio: true`.

Verificación PostgreSQL:

```sql
SELECT id_usuario, nombres, apellidos, ci, correo, primer_inicio
FROM "Usuario" WHERE ci = '990001';
```

Debe existir exactamente una fila, con los datos enviados y `primer_inicio = true`.

## 2. Permitir correo repetido

Repita `POST /usuarios` con CI `990002`, los mismos datos personales válidos y exactamente el mismo correo de la prueba 1.

Respuesta esperada: `201`. Nunca debe responder `409` por el correo.

```sql
SELECT ci, correo FROM "Usuario"
WHERE correo = 'correo.compartido@emse.edu.bo'
ORDER BY ci;
```

Debe devolver ambos usuarios. El CI continúa siendo único.

## 3. Rechazar CI inválido por API directa

Ejecute `POST /usuarios` cuatro veces, cambiando `ci` por `"12A3"`, `"12 3"`, `"12-3"` y `"+123"`.

Respuesta esperada en todos: `400`, con `El CI solo puede contener números`.

```sql
SELECT count(*) FROM "Usuario" WHERE ci IN ('12A3', '12 3', '12-3', '+123');
```

Debe devolver `0`.

## 4. Rechazar nombres y apellidos inválidos

Use el JSON de creación, primero con `"nombres": "Ana2"` y luego con `"apellidos": "Pérez!"`.

Respuesta esperada: `400`, indicando claramente el campo que solo admite letras, espacios y letras con tilde.

Compruebe con el CI usado en cada intento:

```sql
SELECT count(*) FROM "Usuario" WHERE ci = '<CI_DEL_INTENTO>';
```

Debe devolver `0`.

## 5. Rechazar correo inválido

Use el JSON válido con `"correo": "correo-invalido"`.

Respuesta esperada: `400`, con `El correo electrónico no tiene un formato válido`. La consulta por el CI del intento debe devolver cero filas.

## 6. Repetir validaciones al editar

`PATCH /usuarios/{{id_usuario}}`

Pruebe por separado:

```json
{ "ci": "123 A" }
```

```json
{ "nombres": "Nombre#" }
```

```json
{ "apellidos": "Apellido9" }
```

```json
{ "correo": "sin-arroba" }
```

Respuesta esperada: `400` en todos. Consulte la fila y confirme que conserva sus valores anteriores:

```sql
SELECT nombres, apellidos, ci, correo FROM "Usuario"
WHERE id_usuario = {{id_usuario}};
```

## 7. Crear y editar cadete

`POST /cadetes`

```json
{
  "nombres": "Ángela María",
  "apellidos": "Gómez Peña",
  "ci": "990003",
  "correo": "correo.compartido@emse.edu.bo",
  "estado": "ACTIVO",
  "estado_cadete": "REGULAR",
  "id_curso": {{id_curso}},
  "gestion_ingreso": 2026,
  "arma": null
}
```

Respuesta esperada: `201`. Para un curso de segundo o tercer año envíe un `arma` no vacío. Repita los casos inválidos de las pruebas 3 a 5: deben responder `400` y no insertar filas.

Para editar sus datos personales use `PATCH /usuarios/{{id_usuario_cadete}}`; se aplican exactamente las mismas reglas, incluido el CI.

```sql
SELECT u.nombres, u.apellidos, u.ci, u.correo, c.id_cadete, c.id_curso
FROM "Usuario" u JOIN "Cadete" c ON c.id_usuario = u.id_usuario
WHERE u.ci = '990003';
```

## 8. Restablecer contraseña

Guarde antes el hash actual:

```sql
SELECT contrasena, primer_inicio FROM "Usuario"
WHERE id_usuario = {{id_usuario}};
```

Ejecute `POST /usuarios/{{id_usuario}}/restablecer-contrasena` con token administrador y sin body.

Respuesta esperada: `201` con mensaje de restablecimiento a `EMSE2026.`.

```sql
SELECT contrasena, primer_inicio FROM "Usuario"
WHERE id_usuario = {{id_usuario}};

SELECT activa, motivo_cierre FROM "Sesion"
WHERE id_usuario = {{id_usuario}} ORDER BY id_sesion DESC;

SELECT contrasena, fecha_cambio FROM "HistorialPassword"
WHERE id_usuario = {{id_usuario}} ORDER BY fecha_cambio DESC LIMIT 1;
```

El hash debe ser distinto del anterior, comenzar normalmente con `$2b$`, `primer_inicio` debe ser `true`, las sesiones anteriores deben estar inactivas y el hash más reciente del historial debe coincidir con el guardado en `Usuario`.

## 9. Comprobar contraseña anterior, temporal y acceso restringido

1. `POST /autenticacion/iniciar-sesion` con el CI y la contraseña anterior: espere `401`.
2. Repita con `"contrasena": "EMSE2026"` (sin punto): espere `401`.
3. Repita con `"contrasena": "EMSE2026."`: espere `200` y envío de OTP.
4. Complete `POST /autenticacion/verificar-codigo` con `{"ci":"<CI>","codigo":"<OTP>"}`. Guarde el token como `{{token_restablecido}}`.
5. Con ese token intente `GET /usuarios`: espere `403` y el mensaje que obliga a cambiar la contraseña.

PostgreSQL debe seguir mostrando `primer_inicio = true` hasta realizar el cambio.

## 10. Cambiar contraseña mediante el flujo existente

`POST /autenticacion/cambiar-contrasena`, con `Authorization: Bearer {{token_restablecido}}`:

```json
{
  "contrasenaActual": "EMSE2026.",
  "contrasenaNueva": "NuevaClaveSegura.2026"
}
```

Respuesta esperada: `201`, nuevos tokens y perfil con `primer_inicio: false`.

```sql
SELECT primer_inicio, contrasena FROM "Usuario"
WHERE id_usuario = {{id_usuario}};

SELECT activa, motivo_cierre FROM "Sesion"
WHERE id_usuario = {{id_usuario}} ORDER BY id_sesion DESC;
```

Debe quedar `primer_inicio = false`; la sesión utilizada para el cambio queda invalidada y existe una nueva sesión activa. El login posterior con `EMSE2026.` debe responder `401`; con la nueva contraseña debe continuar al OTP.

## 11. Permisos y payloads manipulados

- Repita una creación/edición sin token: espere `401`.
- Repítala con un usuario sin el permiso correspondiente: espere `403`.
- Agregue una propiedad no declarada, por ejemplo `"saltarseValidacion": true`: espere `400` por propiedad no permitida.
- En todos los casos consulte por el CI o ID objetivo y confirme que PostgreSQL no cambió.
