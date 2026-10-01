-- Completar el catálogo RBAC utilizado por los controladores actuales.
INSERT INTO "Permiso" ("nombre", "modulo", "accion", "descripcion", "estado") VALUES
  ('GESTIONAR_PERMISOS', 'SISTEMA', 'ADMIN', 'Asignar y revocar permisos', true),
  ('VER_ASIGNACIONES', 'ASIGNACIONES', 'READ', 'Ver asignaciones académicas', true),
  ('ASIGNAR_ACADEMICO', 'ASIGNACIONES', 'CREATE', 'Crear asignaciones académicas', true),
  ('EDITAR_ASIGNACION', 'ASIGNACIONES', 'UPDATE', 'Modificar o revocar asignaciones académicas', true)
ON CONFLICT ("nombre") DO UPDATE SET
  "modulo" = EXCLUDED."modulo",
  "accion" = EXCLUDED."accion",
  "descripcion" = EXCLUDED."descripcion",
  "estado" = true;

-- El administrador debe poder alcanzar todos los recursos de control de acceso.
INSERT INTO "RolPermiso" ("id_rol", "id_permiso")
SELECT r."id_rol", p."id_permiso"
FROM "Rol" r
CROSS JOIN "Permiso" p
WHERE r."nombre" = 'ADMINISTRADOR'
  AND p."nombre" IN (
    'GESTIONAR_PERMISOS',
    'VER_ASIGNACIONES',
    'ASIGNAR_ACADEMICO',
    'EDITAR_ASIGNACION'
  )
ON CONFLICT ("id_rol", "id_permiso") DO NOTHING;

-- JEFATURA_ESTUDIOS es la unidad institucional; COORDINACION_ACADEMICA era
-- una capa duplicada. Se conservan todas sus referencias antes de eliminarla.
UPDATE "Seccion" SET "id_seccion_padre" = 17 WHERE "id_seccion_padre" = 5;
UPDATE "Usuario" SET "id_seccion" = 17 WHERE "id_seccion" = 5;
UPDATE "AsignacionAcademica" SET "id_seccion" = 17 WHERE "id_seccion" = 5;
UPDATE "AsignacionAdministrativa" SET "id_seccion" = 17 WHERE "id_seccion" = 5;
UPDATE "Nota" SET "id_seccion" = 17 WHERE "id_seccion" = 5;
DELETE FROM "Seccion" WHERE "id_seccion" = 5 AND "nombre" = 'COORDINACION_ACADEMICA';

-- PostgreSQL considera distintos los NULL en una restricción UNIQUE. Estos
-- índices impiden duplicados activos también para responsables sin curso.
CREATE UNIQUE INDEX "AsignacionAcademica_usuario_activa_key"
ON "AsignacionAcademica" ("id_usuario", "id_seccion", COALESCE("id_curso", 0), "tipo")
WHERE "activo" = true;

CREATE UNIQUE INDEX "AsignacionAcademica_responsabilidad_activa_key"
ON "AsignacionAcademica" ("id_seccion", COALESCE("id_curso", 0), "tipo")
WHERE "activo" = true;

-- El valor legado se sincroniza, pero las APIs calculan conexión directamente
-- desde sesiones activas y no lo utilizan para autorizar.
UPDATE "Usuario" u
SET "estado" = CASE
  WHEN EXISTS (
    SELECT 1 FROM "Sesion" s
    WHERE s."id_usuario" = u."id_usuario"
      AND s."activa" = true
      AND s."fecha_expiracion" > CURRENT_TIMESTAMP
  ) THEN 'ACTIVO'::"EstadoUsuario"
  ELSE 'INACTIVO'::"EstadoUsuario"
END;
