-- Reestructuración aprobada de usuarios, RBAC, secciones y cadetes.
-- Este archivo preserva los ids, CI, correos, contraseñas y tablas de autenticación.

-- Estado de conexión y habilitación administrativa.
ALTER TABLE "Usuario"
  ADD COLUMN "habilitado" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "es_mixto" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Usuario" ALTER COLUMN "estado" DROP DEFAULT;
ALTER TYPE "EstadoUsuario" RENAME TO "EstadoUsuario_anterior";
CREATE TYPE "EstadoUsuario" AS ENUM ('ACTIVO', 'INACTIVO');
ALTER TABLE "Usuario" ALTER COLUMN "estado" TYPE "EstadoUsuario"
USING (CASE WHEN "estado"::text = 'ACTIVO' THEN 'ACTIVO' ELSE 'INACTIVO' END)::"EstadoUsuario";
ALTER TABLE "Usuario" ALTER COLUMN "estado" SET DEFAULT 'INACTIVO';
DROP TYPE "EstadoUsuario_anterior";

UPDATE "Usuario" u
SET "estado" = CASE WHEN EXISTS (
  SELECT 1 FROM "Sesion" s
  WHERE s."id_usuario" = u."id_usuario"
    AND s."activa" = true
    AND s."fecha_expiracion" > CURRENT_TIMESTAMP
) THEN 'ACTIVO'::"EstadoUsuario" ELSE 'INACTIVO'::"EstadoUsuario" END;

ALTER TABLE "Usuario"
  DROP COLUMN "grupo_usuario",
  DROP COLUMN "modulo_documental",
  DROP COLUMN "modulo_academico";
DROP TYPE "GrupoUsuario";

-- Cinco roles institucionales. Se conservan ids estables seleccionados.
UPDATE "Usuario" SET "id_rol" = 2 WHERE "id_rol" IN (2, 3, 4, 6);
UPDATE "Usuario" SET "id_rol" = 7 WHERE "id_rol" IN (5, 7, 8, 9, 10);

DELETE FROM "RolPermiso";
UPDATE "Rol" SET "nombre" = 'ADMINISTRADOR', "descripcion" = 'Administrador del sistema' WHERE "id_rol" = 1;
UPDATE "Rol" SET "nombre" = 'ADMINISTRATIVO', "descripcion" = 'Personal administrativo institucional' WHERE "id_rol" = 2;
UPDATE "Rol" SET "nombre" = 'COMANDO_BATALLON', "descripcion" = 'Personal del Comando de Batallón' WHERE "id_rol" = 5;
UPDATE "Rol" SET "nombre" = 'ADMINISTRATIVO_ACADEMICO', "descripcion" = 'Personal administrativo académico' WHERE "id_rol" = 7;
DELETE FROM "Rol" WHERE "id_rol" IN (3, 4, 6, 8, 9, 10);

-- RBAC simplificado.
DELETE FROM "Permiso"
WHERE "nombre" NOT IN (
  'VER_PANEL', 'GESTIONAR_USUARIOS', 'CREAR_USUARIO', 'LISTAR_USUARIOS',
  'VER_USUARIO', 'EDITAR_USUARIO', 'SUSPENDER_USUARIO', 'ACTIVAR_USUARIO',
  'RESETEAR_CONTRASENA', 'CREAR_CADETE', 'LISTAR_CADETES', 'VER_CADETE',
  'EDITAR_CADETE', 'GESTIONAR_ROLES', 'GESTIONAR_SECCIONES'
);

INSERT INTO "RolPermiso" ("id_rol", "id_permiso")
SELECT 1, p."id_permiso" FROM "Permiso" p;
INSERT INTO "RolPermiso" ("id_rol", "id_permiso")
SELECT r."id_rol", p."id_permiso"
FROM "Rol" r CROSS JOIN "Permiso" p
WHERE r."nombre" <> 'ADMINISTRADOR' AND p."nombre" = 'VER_PANEL';

DROP TABLE "PermisoSeccionRol";

-- Secciones institucionales y subsecciones académicas reales.
UPDATE "Seccion" SET "nombre" = 'OPERADOR_RADIO', "descripcion" = 'Operador de Radio institucional' WHERE "id_seccion" = 10;
UPDATE "Seccion" SET "nombre" = 'ACADEMICA', "descripcion" = 'Subsección Académica' WHERE "id_seccion" = 6;
UPDATE "Seccion" SET "id_seccion_padre" = 5 WHERE "id_seccion" IN (6, 11, 12);
UPDATE "Seccion" SET "id_seccion_padre" = 8 WHERE "id_seccion" = 7;

ALTER TABLE "Seccion" ALTER COLUMN "tipo" DROP DEFAULT;
ALTER TYPE "TipoSeccion" RENAME TO "TipoSeccion_anterior";
CREATE TYPE "TipoSeccion" AS ENUM ('SISTEMA', 'ADMINISTRATIVA', 'ACADEMICA', 'DOCUMENTACION');
ALTER TABLE "Seccion" ALTER COLUMN "tipo" TYPE "TipoSeccion" USING (
  CASE
    WHEN "tipo"::text = 'MIXTA' AND "id_seccion" = 7 THEN 'DOCUMENTACION'
    WHEN "tipo"::text IN ('MIXTA', 'FUTURA') THEN 'ADMINISTRATIVA'
    ELSE "tipo"::text
  END
)::"TipoSeccion";
ALTER TABLE "Seccion" ALTER COLUMN "tipo" SET DEFAULT 'ADMINISTRATIVA';
DROP TYPE "TipoSeccion_anterior";
UPDATE "Seccion" SET "tipo" = 'DOCUMENTACION' WHERE "id_seccion" IN (7, 8, 14, 15, 16);

-- Consolidación de los cursos duplicados.
ALTER TABLE "Cadete" DROP CONSTRAINT "Cadete_id_curso_fkey";
ALTER TABLE "HistorialCursoCadete" DROP CONSTRAINT "HistorialCursoCadete_id_curso_fkey";
ALTER TABLE "AsignacionAcademica" DROP CONSTRAINT "AsignacionAcademica_id_curso_fkey";
ALTER TABLE "Nota" DROP CONSTRAINT "Nota_id_curso_fkey";

UPDATE "Cadete" SET "id_curso" = CASE "id_curso" WHEN 5 THEN 1 WHEN 6 THEN 2 WHEN 7 THEN 3 ELSE "id_curso" END;
UPDATE "HistorialCursoCadete" SET "id_curso" = CASE "id_curso" WHEN 5 THEN 1 WHEN 6 THEN 2 WHEN 7 THEN 3 ELSE "id_curso" END;
UPDATE "AsignacionAcademica" SET "id_curso" = CASE "id_curso" WHEN 5 THEN 1 WHEN 6 THEN 2 WHEN 7 THEN 3 ELSE "id_curso" END;
UPDATE "Nota" SET "id_curso" = CASE "id_curso" WHEN 5 THEN 1 WHEN 6 THEN 2 WHEN 7 THEN 3 ELSE "id_curso" END;
DELETE FROM "Curso" WHERE "id_curso" IN (5, 6, 7);
UPDATE "Curso" SET "nombre" = 'PRIMER_ANIO', "orden" = 1 WHERE "id_curso" = 1;
UPDATE "Curso" SET "nombre" = 'SEGUNDO_ANIO', "orden" = 2 WHERE "id_curso" = 2;
UPDATE "Curso" SET "nombre" = 'TERCER_ANIO', "orden" = 3 WHERE "id_curso" = 3;
UPDATE "Curso" SET "nombre" = 'EGRESADO', "orden" = 4 WHERE "id_curso" = 4;
CREATE UNIQUE INDEX "Curso_orden_key" ON "Curso"("orden");

ALTER TABLE "Cadete" ADD CONSTRAINT "Cadete_id_curso_fkey" FOREIGN KEY ("id_curso") REFERENCES "Curso"("id_curso") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "HistorialCursoCadete" ADD CONSTRAINT "HistorialCursoCadete_id_curso_fkey" FOREIGN KEY ("id_curso") REFERENCES "Curso"("id_curso") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Nota" ADD CONSTRAINT "Nota_id_curso_fkey" FOREIGN KEY ("id_curso") REFERENCES "Curso"("id_curso") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Estados de cadete y datos correctos por cohorte.
ALTER TABLE "Cadete" ALTER COLUMN "estado_cadete" DROP DEFAULT;
ALTER TYPE "EstadoCadete" RENAME TO "EstadoCadete_anterior";
CREATE TYPE "EstadoCadete" AS ENUM ('REGULAR', 'BAJA', 'EGRESADO');
ALTER TABLE "Cadete" ALTER COLUMN "estado_cadete" TYPE "EstadoCadete" USING (
  CASE WHEN "estado_cadete"::text IN ('CONDICIONADO', 'DE_BAJA') THEN 'BAJA' ELSE "estado_cadete"::text END
)::"EstadoCadete";
ALTER TABLE "HistorialCursoCadete" ALTER COLUMN "estado_cadete" TYPE "EstadoCadete" USING (
  CASE WHEN "estado_cadete"::text IN ('CONDICIONADO', 'DE_BAJA') THEN 'BAJA' ELSE "estado_cadete"::text END
)::"EstadoCadete";
ALTER TABLE "Cadete" ALTER COLUMN "estado_cadete" SET DEFAULT 'REGULAR';
DROP TYPE "EstadoCadete_anterior";

UPDATE "Cadete" c SET "gestion_ingreso" = 2026, "id_curso" = 1
FROM "Usuario" u WHERE u."id_usuario" = c."id_usuario" AND u."ci" BETWEEN '100001' AND '100116';
UPDATE "Cadete" c SET "gestion_ingreso" = 2025, "id_curso" = 2
FROM "Usuario" u WHERE u."id_usuario" = c."id_usuario" AND u."ci" BETWEEN '200001' AND '200130';
UPDATE "Cadete" c SET "gestion_ingreso" = 2024, "id_curso" = 3
FROM "Usuario" u WHERE u."id_usuario" = c."id_usuario" AND u."ci" BETWEEN '300001' AND '300117';

-- Completa la relación 1:1 del usuario cadete histórico que no tenía perfil.
INSERT INTO "Cadete" ("id_usuario", "grado", "arma", "id_curso", "gestion_ingreso", "estado_cadete", "fecha_actualizacion")
SELECT u."id_usuario", 'TRANSITORIO', NULL, 3, 2024, 'REGULAR', CURRENT_TIMESTAMP
FROM "Usuario" u
WHERE u."ci" = '3000005' AND u."id_rol" = 11
  AND NOT EXISTS (SELECT 1 FROM "Cadete" c WHERE c."id_usuario" = u."id_usuario");

ALTER TABLE "Cadete" DROP COLUMN "grado";
ALTER TABLE "Cadete" DROP CONSTRAINT "Cadete_id_usuario_fkey";
ALTER TABLE "Cadete" ADD CONSTRAINT "Cadete_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "Usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Corrige el registro actual e incorpora los movimientos históricos faltantes.
UPDATE "HistorialCursoCadete" h SET "gestion" = c."gestion_ingreso", "id_curso" = 1, "estado_cadete" = 'REGULAR'
FROM "Cadete" c JOIN "Usuario" u ON u."id_usuario" = c."id_usuario"
WHERE h."id_cadete" = c."id_cadete" AND u."ci" BETWEEN '100001' AND '100116';
UPDATE "HistorialCursoCadete" h SET "gestion" = 2026, "id_curso" = 2, "estado_cadete" = 'REGULAR'
FROM "Cadete" c JOIN "Usuario" u ON u."id_usuario" = c."id_usuario"
WHERE h."id_cadete" = c."id_cadete" AND u."ci" BETWEEN '200001' AND '200130';
UPDATE "HistorialCursoCadete" h SET "gestion" = 2026, "id_curso" = 3, "estado_cadete" = 'REGULAR'
FROM "Cadete" c JOIN "Usuario" u ON u."id_usuario" = c."id_usuario"
WHERE h."id_cadete" = c."id_cadete" AND (u."ci" BETWEEN '300001' AND '300117' OR u."ci" = '3000005');

INSERT INTO "HistorialCursoCadete" ("id_cadete", "id_curso", "gestion", "estado_cadete")
SELECT c."id_cadete", 1, 2025, 'REGULAR' FROM "Cadete" c JOIN "Usuario" u ON u."id_usuario" = c."id_usuario"
WHERE u."ci" BETWEEN '200001' AND '200130';
INSERT INTO "HistorialCursoCadete" ("id_cadete", "id_curso", "gestion", "estado_cadete")
SELECT c."id_cadete", 1, 2024, 'REGULAR' FROM "Cadete" c JOIN "Usuario" u ON u."id_usuario" = c."id_usuario"
WHERE u."ci" BETWEEN '300001' AND '300117' OR u."ci" = '3000005';
INSERT INTO "HistorialCursoCadete" ("id_cadete", "id_curso", "gestion", "estado_cadete")
SELECT c."id_cadete", 2, 2025, 'REGULAR' FROM "Cadete" c JOIN "Usuario" u ON u."id_usuario" = c."id_usuario"
WHERE u."ci" BETWEEN '300001' AND '300117' OR u."ci" = '3000005';
INSERT INTO "HistorialCursoCadete" ("id_cadete", "id_curso", "gestion", "estado_cadete")
SELECT c."id_cadete", 3, 2026, 'REGULAR' FROM "Cadete" c JOIN "Usuario" u ON u."id_usuario" = c."id_usuario"
WHERE u."ci" = '3000005';
CREATE UNIQUE INDEX "HistorialCursoCadete_id_cadete_id_curso_gestion_estado_key"
ON "HistorialCursoCadete"("id_cadete", "id_curso", "gestion", "estado_cadete");
ALTER TABLE "HistorialCursoCadete" DROP CONSTRAINT "HistorialCursoCadete_id_cadete_fkey";
ALTER TABLE "HistorialCursoCadete" ADD CONSTRAINT "HistorialCursoCadete_id_cadete_fkey" FOREIGN KEY ("id_cadete") REFERENCES "Cadete"("id_cadete") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Las tablas de notas pasan a referenciar el perfil Cadete, no Usuario.
ALTER TABLE "Nota" DROP CONSTRAINT "Nota_id_cadete_fkey";
ALTER TABLE "CertificadoNota" DROP CONSTRAINT "CertificadoNota_id_cadete_fkey";
UPDATE "Nota" n SET "id_cadete" = c."id_cadete" FROM "Cadete" c WHERE c."id_usuario" = n."id_cadete";
UPDATE "CertificadoNota" n SET "id_cadete" = c."id_cadete" FROM "Cadete" c WHERE c."id_usuario" = n."id_cadete";
ALTER TABLE "Nota" ADD CONSTRAINT "Nota_id_cadete_fkey" FOREIGN KEY ("id_cadete") REFERENCES "Cadete"("id_cadete") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CertificadoNota" ADD CONSTRAINT "CertificadoNota_id_cadete_fkey" FOREIGN KEY ("id_cadete") REFERENCES "Cadete"("id_cadete") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Asignaciones académicas ligadas a la sección/subsección real.
DROP TABLE "AsignacionAcademica";
DROP TYPE "AreaAcademica";
DROP TYPE "NivelResponsabilidad";
CREATE TYPE "TipoAsignacionAcademica" AS ENUM ('OPERADOR', 'RESPONSABLE');
CREATE TABLE "AsignacionAcademica" (
  "id_asignacion" SERIAL PRIMARY KEY,
  "id_usuario" INTEGER NOT NULL,
  "id_seccion" INTEGER NOT NULL,
  "id_curso" INTEGER,
  "tipo" "TipoAsignacionAcademica" NOT NULL,
  "activo" BOOLEAN NOT NULL DEFAULT true,
  "fecha_asignacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "fecha_fin" TIMESTAMP(3),
  CONSTRAINT "AsignacionAcademica_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "Usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "AsignacionAcademica_id_seccion_fkey" FOREIGN KEY ("id_seccion") REFERENCES "Seccion"("id_seccion") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "AsignacionAcademica_id_curso_fkey" FOREIGN KEY ("id_curso") REFERENCES "Curso"("id_curso") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "AsignacionAcademica_id_usuario_id_seccion_id_curso_key" ON "AsignacionAcademica"("id_usuario", "id_seccion", "id_curso");
CREATE INDEX "AsignacionAcademica_id_seccion_tipo_activo_idx" ON "AsignacionAcademica"("id_seccion", "tipo", "activo");
CREATE UNIQUE INDEX "AsignacionAcademica_responsable_activo_key" ON "AsignacionAcademica"("id_seccion") WHERE "activo" AND "tipo" = 'RESPONSABLE';
CREATE UNIQUE INDEX "AsignacionAcademica_operador_activo_key" ON "AsignacionAcademica"("id_seccion", "id_curso") WHERE "activo" AND "tipo" = 'OPERADOR';

INSERT INTO "AsignacionAcademica" ("id_usuario", "id_seccion", "id_curso", "tipo") VALUES
  (7, 6, NULL, 'RESPONSABLE'),
  (8, 11, NULL, 'RESPONSABLE'),
  (9, 12, NULL, 'RESPONSABLE'),
  (10, 5, NULL, 'RESPONSABLE');

-- Encargaturas administrativas explícitas.
CREATE TYPE "TipoAsignacionAdministrativa" AS ENUM ('ENCARGADO');
CREATE TABLE "AsignacionAdministrativa" (
  "id_asignacion" SERIAL PRIMARY KEY,
  "id_usuario" INTEGER NOT NULL,
  "id_seccion" INTEGER NOT NULL,
  "tipo" "TipoAsignacionAdministrativa" NOT NULL DEFAULT 'ENCARGADO',
  "activo" BOOLEAN NOT NULL DEFAULT true,
  "fecha_asignacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "fecha_fin" TIMESTAMP(3),
  CONSTRAINT "AsignacionAdministrativa_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "Usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "AsignacionAdministrativa_id_seccion_fkey" FOREIGN KEY ("id_seccion") REFERENCES "Seccion"("id_seccion") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "AsignacionAdministrativa_id_usuario_id_seccion_key" ON "AsignacionAdministrativa"("id_usuario", "id_seccion");
CREATE INDEX "AsignacionAdministrativa_id_seccion_activo_idx" ON "AsignacionAdministrativa"("id_seccion", "activo");
CREATE UNIQUE INDEX "AsignacionAdministrativa_encargado_activo_key" ON "AsignacionAdministrativa"("id_seccion") WHERE "activo";
INSERT INTO "AsignacionAdministrativa" ("id_usuario", "id_seccion") VALUES
  (2, 10), (3, 1), (4, 2), (6, 3);

-- Jerarquía libre queda reservada al futuro flujo documental.
ALTER TABLE "JerarquiaUsuario" DROP CONSTRAINT "JerarquiaUsuario_id_supervisor_fkey";
ALTER TABLE "JerarquiaUsuario" DROP CONSTRAINT "JerarquiaUsuario_id_subordinado_fkey";
ALTER TABLE "JerarquiaUsuario" ADD CONSTRAINT "JerarquiaUsuario_id_supervisor_fkey" FOREIGN KEY ("id_supervisor") REFERENCES "Usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "JerarquiaUsuario" ADD CONSTRAINT "JerarquiaUsuario_id_subordinado_fkey" FOREIGN KEY ("id_subordinado") REFERENCES "Usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;
