-- Fase 1: completa exclusivamente los periodos lectivos históricos faltantes.
-- No modifica HistorialCursoCadete ni elimina datos.
BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM "Usuario"
    WHERE "id_usuario" = 1
  ) THEN
    RAISE EXCEPTION 'No existe el usuario creador requerido con id_usuario = 1';
  END IF;

  IF (SELECT COUNT(*) FROM "GestionAcademica" WHERE "ano" IN (2024, 2025)) <> 2 THEN
    RAISE EXCEPTION 'Deben existir exactamente las gestiones académicas 2024 y 2025';
  END IF;
END $$;

INSERT INTO "PeriodoLectivo" (
  "id_gestion",
  "periodo",
  "activo",
  "id_creador",
  "fecha_actualizacion"
)
SELECT
  g."id_gestion",
  periodos."periodo"::"PeriodoAcademico",
  false,
  1,
  CURRENT_TIMESTAMP
FROM "GestionAcademica" g
CROSS JOIN (VALUES ('I'), ('II')) AS periodos("periodo")
WHERE g."ano" IN (2024, 2025)
ON CONFLICT ("id_gestion", "periodo") DO NOTHING;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "GestionAcademica" g
    CROSS JOIN (VALUES ('I'), ('II')) AS esperados("periodo")
    LEFT JOIN "PeriodoLectivo" p
      ON p."id_gestion" = g."id_gestion"
     AND p."periodo" = esperados."periodo"::"PeriodoAcademico"
    WHERE g."ano" IN (2024, 2025)
      AND p."id_periodo" IS NULL
  ) THEN
    RAISE EXCEPTION 'No se pudieron crear todos los periodos históricos requeridos';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "PeriodoLectivo" p
    JOIN "GestionAcademica" g ON g."id_gestion" = p."id_gestion"
    WHERE g."ano" IN (2024, 2025)
      AND (p."activo" <> false OR p."id_creador" <> 1)
  ) THEN
    RAISE EXCEPTION 'Los periodos históricos deben quedar inactivos y con id_creador = 1';
  END IF;
END $$;

COMMIT;
