-- Fase 2 del modulo de Evaluaciones.
-- Crea exclusivamente las tres tablas aprobadas, sus relaciones y
-- restricciones. No precarga configuraciones, materias ni notas.
BEGIN;

CREATE TABLE "ConfiguracionEvaluacionesPeriodo" (
  "id_configuracion" SERIAL NOT NULL,
  "id_periodo" INTEGER NOT NULL,
  "id_curso" INTEGER NOT NULL,
  "cantidad_materias" INTEGER NOT NULL,
  "activo" BOOLEAN NOT NULL DEFAULT true,
  "id_creador" INTEGER NOT NULL,
  "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "fecha_actualizacion" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ConfiguracionEvaluacionesPeriodo_pkey"
    PRIMARY KEY ("id_configuracion"),
  CONSTRAINT "ConfiguracionEvaluacionesPeriodo_cantidad_materias_check"
    CHECK ("cantidad_materias" > 0)
);

CREATE TABLE "MateriaEvaluacion" (
  "id_materia" SERIAL NOT NULL,
  "id_periodo" INTEGER NOT NULL,
  "id_curso" INTEGER NOT NULL,
  "numero_materia" INTEGER NOT NULL,
  "nombre" VARCHAR(200) NOT NULL,
  "estado" "EstadoSemanaDisciplina" NOT NULL DEFAULT 'BORRADOR',
  "nivel_revision_actual" "NivelRevisionNota",
  "version_flujo" INTEGER NOT NULL DEFAULT 0,
  "id_creador" INTEGER NOT NULL,
  "id_ultimo_responsable" INTEGER NOT NULL,
  "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "fecha_actualizacion" TIMESTAMP(3) NOT NULL,
  "fecha_envio" TIMESTAMP(3),
  "fecha_revision" TIMESTAMP(3),
  "fecha_publicacion" TIMESTAMP(3),
  CONSTRAINT "MateriaEvaluacion_pkey" PRIMARY KEY ("id_materia"),
  CONSTRAINT "MateriaEvaluacion_numero_materia_check"
    CHECK ("numero_materia" > 0),
  CONSTRAINT "MateriaEvaluacion_nombre_check"
    CHECK (LENGTH(BTRIM("nombre")) > 0),
  CONSTRAINT "MateriaEvaluacion_version_flujo_check"
    CHECK ("version_flujo" >= 0),
  CONSTRAINT "MateriaEvaluacion_estado_nivel_check"
    CHECK (
      ("estado" = 'BORRADOR' AND "nivel_revision_actual" IS NULL)
      OR
      ("estado" IN ('EN_REVISION', 'OBSERVADO')
        AND "nivel_revision_actual" IS NOT NULL)
      OR
      ("estado" IN ('REVISADO', 'PUBLICADO')
        AND "nivel_revision_actual" IS NULL)
    )
);

CREATE TABLE "NotaEvaluacion" (
  "id_nota" SERIAL NOT NULL,
  "id_materia" INTEGER NOT NULL,
  "id_cadete" INTEGER NOT NULL,
  "nota_inicial" DECIMAL(10,4) NOT NULL,
  "nota_desquite" DECIMAL(10,4),
  "id_creador" INTEGER NOT NULL,
  "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "fecha_actualizacion" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "NotaEvaluacion_pkey" PRIMARY KEY ("id_nota"),
  CONSTRAINT "NotaEvaluacion_nota_inicial_check"
    CHECK ("nota_inicial" >= 0 AND "nota_inicial" <= 100),
  CONSTRAINT "NotaEvaluacion_nota_desquite_check"
    CHECK (
      "nota_desquite" IS NULL
      OR (
        "nota_inicial" <= 50
        AND "nota_desquite" > "nota_inicial"
        AND "nota_desquite" <= 100
      )
    )
);

CREATE UNIQUE INDEX "ConfiguracionEvaluacionesPeriodo_id_periodo_id_curso_key"
  ON "ConfiguracionEvaluacionesPeriodo"("id_periodo", "id_curso");
CREATE INDEX "ConfiguracionEvaluacionesPeriodo_activo_idx"
  ON "ConfiguracionEvaluacionesPeriodo"("activo");

CREATE UNIQUE INDEX "MateriaEvaluacion_id_periodo_id_curso_numero_materia_key"
  ON "MateriaEvaluacion"("id_periodo", "id_curso", "numero_materia");
CREATE INDEX "MateriaEvaluacion_id_periodo_id_curso_estado_idx"
  ON "MateriaEvaluacion"("id_periodo", "id_curso", "estado");
CREATE INDEX "MateriaEvaluacion_estado_nivel_revision_actual_idx"
  ON "MateriaEvaluacion"("estado", "nivel_revision_actual");
CREATE INDEX "MateriaEvaluacion_id_creador_idx"
  ON "MateriaEvaluacion"("id_creador");

CREATE UNIQUE INDEX "NotaEvaluacion_id_materia_id_cadete_key"
  ON "NotaEvaluacion"("id_materia", "id_cadete");
CREATE INDEX "NotaEvaluacion_id_cadete_idx"
  ON "NotaEvaluacion"("id_cadete");
CREATE INDEX "NotaEvaluacion_id_creador_idx"
  ON "NotaEvaluacion"("id_creador");

ALTER TABLE "ConfiguracionEvaluacionesPeriodo"
  ADD CONSTRAINT "ConfiguracionEvaluacionesPeriodo_id_periodo_fkey"
  FOREIGN KEY ("id_periodo") REFERENCES "PeriodoLectivo"("id_periodo")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ConfiguracionEvaluacionesPeriodo"
  ADD CONSTRAINT "ConfiguracionEvaluacionesPeriodo_id_curso_fkey"
  FOREIGN KEY ("id_curso") REFERENCES "Curso"("id_curso")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ConfiguracionEvaluacionesPeriodo"
  ADD CONSTRAINT "ConfiguracionEvaluacionesPeriodo_id_creador_fkey"
  FOREIGN KEY ("id_creador") REFERENCES "Usuario"("id_usuario")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "MateriaEvaluacion"
  ADD CONSTRAINT "MateriaEvaluacion_id_periodo_fkey"
  FOREIGN KEY ("id_periodo") REFERENCES "PeriodoLectivo"("id_periodo")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MateriaEvaluacion"
  ADD CONSTRAINT "MateriaEvaluacion_id_curso_fkey"
  FOREIGN KEY ("id_curso") REFERENCES "Curso"("id_curso")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MateriaEvaluacion"
  ADD CONSTRAINT "MateriaEvaluacion_id_creador_fkey"
  FOREIGN KEY ("id_creador") REFERENCES "Usuario"("id_usuario")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MateriaEvaluacion"
  ADD CONSTRAINT "MateriaEvaluacion_id_ultimo_responsable_fkey"
  FOREIGN KEY ("id_ultimo_responsable") REFERENCES "Usuario"("id_usuario")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "NotaEvaluacion"
  ADD CONSTRAINT "NotaEvaluacion_id_materia_fkey"
  FOREIGN KEY ("id_materia") REFERENCES "MateriaEvaluacion"("id_materia")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "NotaEvaluacion"
  ADD CONSTRAINT "NotaEvaluacion_id_cadete_fkey"
  FOREIGN KEY ("id_cadete") REFERENCES "Cadete"("id_cadete")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "NotaEvaluacion"
  ADD CONSTRAINT "NotaEvaluacion_id_creador_fkey"
  FOREIGN KEY ("id_creador") REFERENCES "Usuario"("id_usuario")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- La normalizacion evita duplicados por mayusculas, espacios o diacriticos
-- comunes del castellano sin almacenar una columna derivada.
CREATE FUNCTION normalizar_nombre_evaluacion(valor TEXT)
RETURNS TEXT
LANGUAGE SQL
IMMUTABLE
STRICT
PARALLEL SAFE
AS $func$
  SELECT UPPER(
    REGEXP_REPLACE(
      TRANSLATE(
        BTRIM(valor),
        'ÁÀÄÂÉÈËÊÍÌÏÎÓÒÖÔÚÙÜÛÑÇáàäâéèëêíìïîóòöôúùüûñç',
        'AAAAEEEEIIIIOOOOUUUUNCAAAAEEEEIIIIOOOOUUUUNC'
      ),
      '[[:space:]]+',
      ' ',
      'g'
    )
  );
$func$;

-- Serializa la creacion por configuracion y exige 1, 2, 3... hasta el
-- limite configurado. El nombre permanece a cargo del Operador.
CREATE FUNCTION validar_materia_evaluacion()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $func$
DECLARE
  limite INTEGER;
  siguiente INTEGER;
BEGIN
  SELECT "cantidad_materias"
  INTO limite
  FROM "ConfiguracionEvaluacionesPeriodo"
  WHERE "id_periodo" = NEW."id_periodo"
    AND "id_curso" = NEW."id_curso"
    AND "activo" = true
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION
      'No existe una configuracion activa de Evaluaciones para el periodo y curso';
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW."id_periodo" IS DISTINCT FROM OLD."id_periodo"
      OR NEW."id_curso" IS DISTINCT FROM OLD."id_curso"
      OR NEW."numero_materia" IS DISTINCT FROM OLD."numero_materia" THEN
      RAISE EXCEPTION
        'Periodo, curso y numero de una materia creada no pueden modificarse';
    END IF;
  ELSE
    SELECT COALESCE(MAX("numero_materia"), 0) + 1
    INTO siguiente
    FROM "MateriaEvaluacion"
    WHERE "id_periodo" = NEW."id_periodo"
      AND "id_curso" = NEW."id_curso";

    IF NEW."numero_materia" <> siguiente THEN
      RAISE EXCEPTION
        'La siguiente materia debe ser Materia %', siguiente;
    END IF;

    IF NEW."numero_materia" > limite THEN
      RAISE EXCEPTION
        'La materia supera la cantidad configurada (%)', limite;
    END IF;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "MateriaEvaluacion" existente
    WHERE existente."id_periodo" = NEW."id_periodo"
      AND existente."id_curso" = NEW."id_curso"
      AND existente."id_materia" <> COALESCE(NEW."id_materia", 0)
      AND normalizar_nombre_evaluacion(existente."nombre") =
        normalizar_nombre_evaluacion(NEW."nombre")
  ) THEN
    RAISE EXCEPTION
      'Ya existe una materia con el mismo nombre normalizado en el curso y periodo';
  END IF;

  RETURN NEW;
END;
$func$;

CREATE TRIGGER "MateriaEvaluacion_validar_secuencia_nombre_trg"
BEFORE INSERT OR UPDATE OF "id_periodo", "id_curso", "numero_materia", "nombre"
ON "MateriaEvaluacion"
FOR EACH ROW
EXECUTE FUNCTION validar_materia_evaluacion();

-- Impide reducir la configuracion por debajo de materias ya creadas.
CREATE FUNCTION validar_limite_configuracion_evaluaciones()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $func$
DECLARE
  ultimo_numero INTEGER;
BEGIN
  SELECT COALESCE(MAX("numero_materia"), 0)
  INTO ultimo_numero
  FROM "MateriaEvaluacion"
  WHERE "id_periodo" = NEW."id_periodo"
    AND "id_curso" = NEW."id_curso";

  IF NEW."cantidad_materias" < ultimo_numero THEN
    RAISE EXCEPTION
      'La cantidad configurada no puede ser menor a la ultima materia creada (%)',
      ultimo_numero;
  END IF;

  RETURN NEW;
END;
$func$;

CREATE TRIGGER "ConfiguracionEvaluacionesPeriodo_validar_limite_trg"
BEFORE UPDATE OF "cantidad_materias"
ON "ConfiguracionEvaluacionesPeriodo"
FOR EACH ROW
EXECUTE FUNCTION validar_limite_configuracion_evaluaciones();

-- Una nota solo puede relacionar un cadete con una materia de su mismo curso.
CREATE FUNCTION validar_nota_evaluacion_curso()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $func$
DECLARE
  curso_materia INTEGER;
  curso_cadete INTEGER;
BEGIN
  SELECT "id_curso"
  INTO curso_materia
  FROM "MateriaEvaluacion"
  WHERE "id_materia" = NEW."id_materia";

  SELECT "id_curso"
  INTO curso_cadete
  FROM "Cadete"
  WHERE "id_cadete" = NEW."id_cadete";

  IF curso_materia IS NULL OR curso_cadete IS NULL
    OR curso_materia <> curso_cadete THEN
    RAISE EXCEPTION
      'El cadete no pertenece al curso de la materia';
  END IF;

  RETURN NEW;
END;
$func$;

CREATE TRIGGER "NotaEvaluacion_validar_curso_trg"
BEFORE INSERT OR UPDATE OF "id_materia", "id_cadete"
ON "NotaEvaluacion"
FOR EACH ROW
EXECUTE FUNCTION validar_nota_evaluacion_curso();

-- El Encargado real de Evaluaciones recibe solo permisos generales ya
-- existentes para crear y editar la configuracion. La autorizacion de notas
-- seguira exigiendo perfil OPERADOR, seccion, asignacion y curso en backend.
DO $func$
DECLARE
  responsables INTEGER;
BEGIN
  SELECT COUNT(DISTINCT aa."id_usuario")
  INTO responsables
  FROM "AsignacionAcademica" aa
  JOIN "Seccion" s ON s."id_seccion" = aa."id_seccion"
  WHERE aa."activo" = true
    AND aa."tipo" = 'RESPONSABLE'
    AND UPPER(s."nombre") = 'EVALUACIONES';

  IF responsables <> 1 THEN
    RAISE EXCEPTION
      'Se esperaba exactamente un Encargado de Evaluaciones activo; existen %',
      responsables;
  END IF;
END;
$func$;

INSERT INTO "UsuarioPermiso" ("id_usuario", "id_permiso", "concedido")
SELECT DISTINCT aa."id_usuario", p."id_permiso", true
FROM "AsignacionAcademica" aa
JOIN "Seccion" s ON s."id_seccion" = aa."id_seccion"
JOIN "Permiso" p ON p."nombre" IN ('REGISTRAR_NOTAS', 'EDITAR_NOTAS')
WHERE aa."activo" = true
  AND aa."tipo" = 'RESPONSABLE'
  AND UPPER(s."nombre") = 'EVALUACIONES'
  AND p."estado" = true
ON CONFLICT ("id_usuario", "id_permiso")
DO UPDATE SET "concedido" = true;

DO $func$
BEGIN
  IF (SELECT COUNT(*) FROM "ConfiguracionEvaluacionesPeriodo") <> 0
    OR (SELECT COUNT(*) FROM "MateriaEvaluacion") <> 0
    OR (SELECT COUNT(*) FROM "NotaEvaluacion") <> 0 THEN
    RAISE EXCEPTION
      'La migracion no debe precargar configuraciones, materias ni notas';
  END IF;
END;
$func$;

COMMIT;
