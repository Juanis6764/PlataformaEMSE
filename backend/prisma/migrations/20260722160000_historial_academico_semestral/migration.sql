-- Convierte el historial anual existente en una trayectoria normalizada de seis semestres.
ALTER TYPE "EstadoReporteDisciplina" ADD VALUE IF NOT EXISTS 'PROCESADO_EVALUACIONES';
ALTER TYPE "EstadoReporteDisciplina" ADD VALUE IF NOT EXISTS 'PUBLICADO';
ALTER TYPE "AccionReporteDisciplina" ADD VALUE IF NOT EXISTS 'PROCESADO_EVALUACIONES';
ALTER TYPE "AccionReporteDisciplina" ADD VALUE IF NOT EXISTS 'PUBLICADO';

ALTER TABLE "HistorialCursoCadete" ADD COLUMN IF NOT EXISTS "id_gestion" INTEGER;
ALTER TABLE "HistorialCursoCadete" ADD COLUMN IF NOT EXISTS "semestre" INTEGER;

INSERT INTO "GestionAcademica" ("ano", "estado")
SELECT DISTINCT "gestion", 'CERRADA'::"EstadoGestion"
FROM "HistorialCursoCadete"
ON CONFLICT ("ano") DO NOTHING;

UPDATE "HistorialCursoCadete" h
SET "id_gestion" = g."id_gestion",
    "semestre" = ((c."orden" - 1) * 2) + 1
FROM "GestionAcademica" g, "Curso" c
WHERE g."ano" = h."gestion" AND c."id_curso" = h."id_curso";

DROP INDEX IF EXISTS "HistorialCursoCadete_id_cadete_id_curso_gestion_estado_key";

INSERT INTO "HistorialCursoCadete"
  ("id_cadete", "id_curso", "gestion", "estado_cadete", "fecha_registro", "id_gestion", "semestre")
SELECT "id_cadete", "id_curso", "gestion", "estado_cadete", "fecha_registro", "id_gestion", "semestre" + 1
FROM "HistorialCursoCadete"
WHERE "semestre" BETWEEN 1 AND 5
  AND NOT EXISTS (
    SELECT 1 FROM "HistorialCursoCadete" existente
    WHERE existente."id_cadete" = "HistorialCursoCadete"."id_cadete"
      AND existente."id_gestion" = "HistorialCursoCadete"."id_gestion"
      AND existente."semestre" = "HistorialCursoCadete"."semestre" + 1
  );

ALTER TABLE "HistorialCursoCadete" ALTER COLUMN "id_gestion" SET NOT NULL;
ALTER TABLE "HistorialCursoCadete" ALTER COLUMN "semestre" SET NOT NULL;
ALTER TABLE "HistorialCursoCadete" DROP COLUMN "gestion";
ALTER TABLE "HistorialCursoCadete"
  ADD CONSTRAINT "HistorialCursoCadete_id_gestion_fkey"
  FOREIGN KEY ("id_gestion") REFERENCES "GestionAcademica"("id_gestion") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE UNIQUE INDEX "HistorialCursoCadete_id_cadete_id_gestion_semestre_key"
  ON "HistorialCursoCadete"("id_cadete", "id_gestion", "semestre");

ALTER TABLE "OficialDisciplina" ADD COLUMN IF NOT EXISTS "ci" TEXT;
ALTER TABLE "OficialDisciplina" ADD COLUMN IF NOT EXISTS "grado" TEXT;
ALTER TABLE "OficialDisciplina" ADD COLUMN IF NOT EXISTS "cargo" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "OficialDisciplina_ci_key" ON "OficialDisciplina"("ci");

ALTER TABLE "RegistroDisciplina" ADD COLUMN IF NOT EXISTS "id_historial" INTEGER;
UPDATE "RegistroDisciplina" r
SET "id_historial" = h."id_historial"
FROM "ConfiguracionSemestreDisciplina" cs, "HistorialCursoCadete" h
WHERE r."id_configuracion" = cs."id_configuracion"
  AND h."id_cadete" = r."id_cadete"
  AND h."id_gestion" = cs."id_gestion"
  AND h."semestre" = cs."semestre";
ALTER TABLE "RegistroDisciplina"
  ADD CONSTRAINT "RegistroDisciplina_id_historial_fkey"
  FOREIGN KEY ("id_historial") REFERENCES "HistorialCursoCadete"("id_historial") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX IF NOT EXISTS "RegistroDisciplina_id_historial_idx" ON "RegistroDisciplina"("id_historial");

-- El cadete reutiliza VER_NOTAS, pero el servicio solo expone periodos PUBLICADOS.
INSERT INTO "RolPermiso" ("id_rol", "id_permiso")
SELECT r."id_rol", p."id_permiso"
FROM "Rol" r CROSS JOIN "Permiso" p
WHERE r."nombre" = 'CADETE' AND p."nombre" = 'VER_NOTAS'
ON CONFLICT ("id_rol", "id_permiso") DO NOTHING;
