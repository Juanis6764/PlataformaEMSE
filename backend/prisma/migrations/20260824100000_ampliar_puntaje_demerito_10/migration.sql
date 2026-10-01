ALTER TABLE "CatalogoDisciplina"
  DROP CONSTRAINT IF EXISTS "CatalogoDisciplina_tipo_puntaje_check";

ALTER TABLE "CatalogoDisciplina"
  ADD CONSTRAINT "CatalogoDisciplina_tipo_puntaje_check"
  CHECK (
    ("tipo" = 'MERITO' AND "puntaje_base" IS NULL)
    OR
    (
      "tipo" = 'DEMERITO'
      AND "puntaje_base" IN (1, 2, 3, 4, 5, 6, 7, 8, 9, 10)
    )
  );
