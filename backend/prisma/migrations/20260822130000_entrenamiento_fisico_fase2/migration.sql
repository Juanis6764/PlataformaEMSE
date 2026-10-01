-- Entrenamiento Fisico: planilla por periodo/curso y una nota final por cadete.
-- No crea configuraciones, matrices, historiales, reportes ni tablas de envio.
BEGIN;

CREATE TABLE "PlanillaEntrenamientoFisico" (
  "id_planilla" SERIAL NOT NULL,
  "id_periodo" INTEGER NOT NULL,
  "id_curso" INTEGER NOT NULL,
  "estado" "EstadoSemanaDisciplina" NOT NULL DEFAULT 'BORRADOR',
  "nivel_revision_actual" "NivelRevisionNota",
  "version_flujo" INTEGER NOT NULL DEFAULT 0,
  "id_creador" INTEGER NOT NULL,
  "id_ultimo_responsable" INTEGER NOT NULL,
  "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "fecha_actualizacion" TIMESTAMP(3) NOT NULL,
  "fecha_envio" TIMESTAMP(3),
  "fecha_revision" TIMESTAMP(3),
  CONSTRAINT "PlanillaEntrenamientoFisico_pkey" PRIMARY KEY ("id_planilla"),
  CONSTRAINT "PlanillaEntrenamientoFisico_version_flujo_check"
    CHECK ("version_flujo" >= 0),
  CONSTRAINT "PlanillaEntrenamientoFisico_estado_nivel_check"
    CHECK (
      ("estado" = 'BORRADOR' AND "nivel_revision_actual" IS NULL)
      OR
      ("estado" = 'EN_REVISION'
        AND "nivel_revision_actual" IN ('SECCION_ACADEMICA', 'JEFE_ESTUDIOS'))
      OR
      ("estado" IN ('OBSERVADO', 'REVISADO')
        AND "nivel_revision_actual" IS NULL)
    )
);

CREATE TABLE "NotaEntrenamientoFisico" (
  "id_nota" SERIAL NOT NULL,
  "id_planilla" INTEGER NOT NULL,
  "id_cadete" INTEGER NOT NULL,
  "nota_final" DECIMAL(10,4),
  "id_creador" INTEGER NOT NULL,
  "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "fecha_actualizacion" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "NotaEntrenamientoFisico_pkey" PRIMARY KEY ("id_nota"),
  CONSTRAINT "NotaEntrenamientoFisico_nota_final_check"
    CHECK (
      "nota_final" IS NULL
      OR ("nota_final" >= 0 AND "nota_final" <= 100)
    )
);

CREATE UNIQUE INDEX "PlanillaEntrenamientoFisico_id_periodo_id_curso_key"
  ON "PlanillaEntrenamientoFisico"("id_periodo", "id_curso");
CREATE INDEX "PlanillaEntrenamientoFisico_id_periodo_id_curso_estado_idx"
  ON "PlanillaEntrenamientoFisico"("id_periodo", "id_curso", "estado");
CREATE INDEX "PlanillaEntrenamientoFisico_estado_nivel_revision_actual_idx"
  ON "PlanillaEntrenamientoFisico"("estado", "nivel_revision_actual");
CREATE INDEX "PlanillaEntrenamientoFisico_id_creador_idx"
  ON "PlanillaEntrenamientoFisico"("id_creador");

CREATE UNIQUE INDEX "NotaEntrenamientoFisico_id_planilla_id_cadete_key"
  ON "NotaEntrenamientoFisico"("id_planilla", "id_cadete");
CREATE INDEX "NotaEntrenamientoFisico_id_cadete_idx"
  ON "NotaEntrenamientoFisico"("id_cadete");
CREATE INDEX "NotaEntrenamientoFisico_id_creador_idx"
  ON "NotaEntrenamientoFisico"("id_creador");

ALTER TABLE "PlanillaEntrenamientoFisico"
  ADD CONSTRAINT "PlanillaEntrenamientoFisico_id_periodo_fkey"
  FOREIGN KEY ("id_periodo") REFERENCES "PeriodoLectivo"("id_periodo")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PlanillaEntrenamientoFisico"
  ADD CONSTRAINT "PlanillaEntrenamientoFisico_id_curso_fkey"
  FOREIGN KEY ("id_curso") REFERENCES "Curso"("id_curso")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PlanillaEntrenamientoFisico"
  ADD CONSTRAINT "PlanillaEntrenamientoFisico_id_creador_fkey"
  FOREIGN KEY ("id_creador") REFERENCES "Usuario"("id_usuario")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PlanillaEntrenamientoFisico"
  ADD CONSTRAINT "PlanillaEntrenamientoFisico_id_ultimo_responsable_fkey"
  FOREIGN KEY ("id_ultimo_responsable") REFERENCES "Usuario"("id_usuario")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "NotaEntrenamientoFisico"
  ADD CONSTRAINT "NotaEntrenamientoFisico_id_planilla_fkey"
  FOREIGN KEY ("id_planilla") REFERENCES "PlanillaEntrenamientoFisico"("id_planilla")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "NotaEntrenamientoFisico"
  ADD CONSTRAINT "NotaEntrenamientoFisico_id_cadete_fkey"
  FOREIGN KEY ("id_cadete") REFERENCES "Cadete"("id_cadete")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "NotaEntrenamientoFisico"
  ADD CONSTRAINT "NotaEntrenamientoFisico_id_creador_fkey"
  FOREIGN KEY ("id_creador") REFERENCES "Usuario"("id_usuario")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE FUNCTION validar_nota_entrenamiento_fisico_curso()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $func$
DECLARE
  curso_planilla INTEGER;
  curso_cadete INTEGER;
BEGIN
  SELECT "id_curso"
  INTO curso_planilla
  FROM "PlanillaEntrenamientoFisico"
  WHERE "id_planilla" = NEW."id_planilla";

  SELECT "id_curso"
  INTO curso_cadete
  FROM "Cadete"
  WHERE "id_cadete" = NEW."id_cadete";

  IF curso_planilla IS NULL OR curso_cadete IS NULL
    OR curso_planilla <> curso_cadete THEN
    RAISE EXCEPTION 'El cadete no pertenece al curso de la planilla';
  END IF;
  RETURN NEW;
END;
$func$;

CREATE TRIGGER "NotaEntrenamientoFisico_validar_curso_trg"
BEFORE INSERT OR UPDATE OF "id_planilla", "id_cadete"
ON "NotaEntrenamientoFisico"
FOR EACH ROW
EXECUTE FUNCTION validar_nota_entrenamiento_fisico_curso();

-- Concede permisos generales existentes al unico responsable activo del area.
DO $func$
DECLARE
  responsables INTEGER;
  permisos_existentes INTEGER;
BEGIN
  SELECT COUNT(DISTINCT aa."id_usuario")
  INTO responsables
  FROM "AsignacionAcademica" aa
  JOIN "Seccion" s ON s."id_seccion" = aa."id_seccion"
  WHERE aa."activo" = true
    AND aa."tipo" = 'RESPONSABLE'
    AND UPPER(s."nombre") = 'ENTRENAMIENTO_FISICO';

  IF responsables <> 1 THEN
    RAISE EXCEPTION
      'Se esperaba exactamente un Encargado de Entrenamiento Fisico activo; existen %',
      responsables;
  END IF;

  SELECT COUNT(*)
  INTO permisos_existentes
  FROM "Permiso"
  WHERE "estado" = true
    AND "nombre" IN ('REGISTRAR_NOTAS', 'EDITAR_NOTAS', 'ENVIAR_NOTAS');

  IF permisos_existentes <> 3 THEN
    RAISE EXCEPTION
      'No estan disponibles los tres permisos generales requeridos';
  END IF;
END;
$func$;

INSERT INTO "UsuarioPermiso" ("id_usuario", "id_permiso", "concedido")
SELECT DISTINCT aa."id_usuario", p."id_permiso", true
FROM "AsignacionAcademica" aa
JOIN "Seccion" s ON s."id_seccion" = aa."id_seccion"
CROSS JOIN "Permiso" p
WHERE aa."activo" = true
  AND aa."tipo" = 'RESPONSABLE'
  AND UPPER(s."nombre") = 'ENTRENAMIENTO_FISICO'
  AND p."estado" = true
  AND p."nombre" IN ('REGISTRAR_NOTAS', 'EDITAR_NOTAS', 'ENVIAR_NOTAS')
ON CONFLICT ("id_usuario", "id_permiso")
DO UPDATE SET "concedido" = true;

DO $func$
BEGIN
  IF (SELECT COUNT(*) FROM "PlanillaEntrenamientoFisico") <> 0
    OR (SELECT COUNT(*) FROM "NotaEntrenamientoFisico") <> 0 THEN
    RAISE EXCEPTION
      'La migracion no debe precargar planillas ni notas de Entrenamiento Fisico';
  END IF;
END;
$func$;

COMMIT;
