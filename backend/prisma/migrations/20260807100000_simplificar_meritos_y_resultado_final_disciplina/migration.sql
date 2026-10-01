-- Un Mérito se identifica por catálogo y puntaje; no requiere fecha ni responsable.
-- Los valores existentes se conservan y la relajación solo permite NULL futuro.
ALTER TABLE "RegistroDisciplina"
  ALTER COLUMN "fecha_hecho" DROP NOT NULL;

-- La restricción anterior exigía responsable para cualquier tipo de registro.
-- La obligatoriedad queda en el servicio únicamente para DEMERITO; en ambos
-- tipos se conserva la exclusión entre oficial y responsable manual.
ALTER TABLE "RegistroDisciplina"
  DROP CONSTRAINT IF EXISTS "RegistroDisciplina_responsable_check";

ALTER TABLE "RegistroDisciplina"
  ADD CONSTRAINT "RegistroDisciplina_responsable_exclusivo_check"
  CHECK (NOT (
    "id_oficial" IS NOT NULL
    AND "nombre_responsable_manual" IS NOT NULL
  ));

-- Snapshot mínimo del resultado final aprobado que consumirá Evaluaciones.
-- No duplica méritos, deméritos, semanas, responsables ni observaciones.
CREATE TABLE "ResultadoFinalDisciplina" (
  "id_resultado" SERIAL NOT NULL,
  "id_cadete" INTEGER NOT NULL,
  "id_periodo" INTEGER NOT NULL,
  "id_curso" INTEGER NOT NULL,
  "nota_final_disciplina" DECIMAL(10,4) NOT NULL,
  "id_publicador" INTEGER NOT NULL,
  "fecha_publicacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "id_emisor_evaluaciones" INTEGER,
  "fecha_envio_evaluaciones" TIMESTAMP(3),

  CONSTRAINT "ResultadoFinalDisciplina_pkey" PRIMARY KEY ("id_resultado"),
  CONSTRAINT "ResultadoFinalDisciplina_nota_check"
    CHECK ("nota_final_disciplina" >= 0 AND "nota_final_disciplina" <= 100),
  CONSTRAINT "ResultadoFinalDisciplina_envio_check"
    CHECK (
      ("id_emisor_evaluaciones" IS NULL AND "fecha_envio_evaluaciones" IS NULL)
      OR
      ("id_emisor_evaluaciones" IS NOT NULL AND "fecha_envio_evaluaciones" IS NOT NULL)
    )
);

CREATE UNIQUE INDEX "ResultadoFinalDisciplina_id_cadete_id_periodo_id_curso_key"
  ON "ResultadoFinalDisciplina"("id_cadete", "id_periodo", "id_curso");
CREATE INDEX "ResultadoFinalDisciplina_id_periodo_id_curso_idx"
  ON "ResultadoFinalDisciplina"("id_periodo", "id_curso");
CREATE INDEX "ResultadoFinalDisciplina_fecha_envio_evaluaciones_idx"
  ON "ResultadoFinalDisciplina"("fecha_envio_evaluaciones");

ALTER TABLE "ResultadoFinalDisciplina"
  ADD CONSTRAINT "ResultadoFinalDisciplina_id_cadete_fkey"
  FOREIGN KEY ("id_cadete") REFERENCES "Cadete"("id_cadete") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ResultadoFinalDisciplina"
  ADD CONSTRAINT "ResultadoFinalDisciplina_id_periodo_fkey"
  FOREIGN KEY ("id_periodo") REFERENCES "PeriodoLectivo"("id_periodo") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ResultadoFinalDisciplina"
  ADD CONSTRAINT "ResultadoFinalDisciplina_id_curso_fkey"
  FOREIGN KEY ("id_curso") REFERENCES "Curso"("id_curso") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ResultadoFinalDisciplina"
  ADD CONSTRAINT "ResultadoFinalDisciplina_id_publicador_fkey"
  FOREIGN KEY ("id_publicador") REFERENCES "Usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ResultadoFinalDisciplina"
  ADD CONSTRAINT "ResultadoFinalDisciplina_id_emisor_evaluaciones_fkey"
  FOREIGN KEY ("id_emisor_evaluaciones") REFERENCES "Usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;
