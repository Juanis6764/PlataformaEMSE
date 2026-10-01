-- Fase 2: normaliza HistorialCursoCadete para que PeriodoLectivo sea
-- la única fuente de gestión y periodo. Toda la operación es atómica.
BEGIN;

LOCK TABLE "HistorialCursoCadete" IN ACCESS EXCLUSIVE MODE;

DO $$
BEGIN
  IF (SELECT COUNT(*) FROM "HistorialCursoCadete") <> 1460 THEN
    RAISE EXCEPTION 'Se esperaban exactamente 1460 historiales antes de normalizar';
  END IF;
END $$;

-- Primero nullable para permitir un backfill verificable.
ALTER TABLE "HistorialCursoCadete"
  ADD COLUMN "id_periodo" INTEGER;

UPDATE "HistorialCursoCadete" h
SET "id_periodo" = p."id_periodo"
FROM "PeriodoLectivo" p
WHERE p."id_gestion" = h."id_gestion"
  AND p."periodo" = h."periodo";

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "HistorialCursoCadete"
    WHERE "id_periodo" IS NULL
  ) THEN
    RAISE EXCEPTION 'Existen historiales sin PeriodoLectivo coincidente';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "HistorialCursoCadete"
    GROUP BY "id_cadete", "id_periodo"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Existen duplicados de (id_cadete, id_periodo)';
  END IF;

  IF (SELECT COUNT(*) FROM "HistorialCursoCadete") <> 1460 THEN
    RAISE EXCEPTION 'La cantidad de historiales cambió durante el backfill';
  END IF;
END $$;

ALTER TABLE "HistorialCursoCadete"
  ALTER COLUMN "id_periodo" SET NOT NULL;

ALTER TABLE "HistorialCursoCadete"
  DROP CONSTRAINT "HistorialCursoCadete_semestre_periodo_check";

DROP INDEX "HistorialCursoCadete_id_cadete_id_gestion_semestre_key";

ALTER TABLE "HistorialCursoCadete"
  DROP CONSTRAINT "HistorialCursoCadete_id_gestion_fkey";

ALTER TABLE "HistorialCursoCadete"
  DROP COLUMN "id_gestion",
  DROP COLUMN "semestre",
  DROP COLUMN "periodo";

ALTER TABLE "HistorialCursoCadete"
  ADD CONSTRAINT "HistorialCursoCadete_id_periodo_fkey"
  FOREIGN KEY ("id_periodo")
  REFERENCES "PeriodoLectivo"("id_periodo")
  ON DELETE RESTRICT
  ON UPDATE CASCADE;

CREATE UNIQUE INDEX "HistorialCursoCadete_id_cadete_id_periodo_key"
  ON "HistorialCursoCadete"("id_cadete", "id_periodo");

CREATE INDEX "HistorialCursoCadete_id_periodo_idx"
  ON "HistorialCursoCadete"("id_periodo");

DO $$
BEGIN
  IF (SELECT COUNT(*) FROM "HistorialCursoCadete") <> 1460 THEN
    RAISE EXCEPTION 'La cantidad final de historiales no es 1460';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "HistorialCursoCadete"
    GROUP BY "id_cadete", "id_periodo"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'La restricción lógica final contiene duplicados';
  END IF;
END $$;

COMMIT;
