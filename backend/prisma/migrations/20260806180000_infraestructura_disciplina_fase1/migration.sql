-- Fase 1 del nuevo modulo de Disciplina.
-- Crea exclusivamente estructura, restricciones y permisos. No precarga
-- configuraciones, oficiales, catalogos, semanas, registros ni notificaciones.
BEGIN;

CREATE TYPE "TipoDisciplina" AS ENUM ('MERITO', 'DEMERITO');
CREATE TYPE "EstadoSemanaDisciplina" AS ENUM (
  'BORRADOR',
  'EN_REVISION',
  'OBSERVADO',
  'REVISADO',
  'PUBLICADO'
);
CREATE TYPE "NivelRevisionNota" AS ENUM (
  'ENCARGADO_AREA',
  'SECCION_ACADEMICA',
  'JEFE_ESTUDIOS'
);
CREATE TYPE "ModuloNotificacion" AS ENUM (
  'ACADEMICO',
  'DOCUMENTAL',
  'SISTEMA'
);

CREATE TABLE "ConfiguracionDisciplinaPeriodo" (
  "id_configuracion" SERIAL NOT NULL,
  "id_periodo" INTEGER NOT NULL,
  "id_curso" INTEGER NOT NULL,
  "cantidad_semanas" INTEGER NOT NULL,
  "activo" BOOLEAN NOT NULL DEFAULT true,
  "id_creador" INTEGER NOT NULL,
  "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "fecha_actualizacion" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ConfiguracionDisciplinaPeriodo_pkey" PRIMARY KEY ("id_configuracion"),
  CONSTRAINT "ConfiguracionDisciplinaPeriodo_cantidad_semanas_check"
    CHECK ("cantidad_semanas" BETWEEN 1 AND 22)
);

CREATE TABLE "OficialDisciplina" (
  "id_oficial" SERIAL NOT NULL,
  "codigo" VARCHAR(30) NOT NULL,
  "nombre_completo" VARCHAR(200) NOT NULL,
  "activo" BOOLEAN NOT NULL DEFAULT true,
  "id_creador" INTEGER NOT NULL,
  "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "fecha_actualizacion" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OficialDisciplina_pkey" PRIMARY KEY ("id_oficial"),
  CONSTRAINT "OficialDisciplina_codigo_formato_check"
    CHECK (LENGTH(BTRIM("codigo")) > 0 AND "codigo" = UPPER(BTRIM("codigo"))),
  CONSTRAINT "OficialDisciplina_nombre_check"
    CHECK (LENGTH(BTRIM("nombre_completo")) > 0)
);

CREATE TABLE "CatalogoDisciplina" (
  "id_catalogo" SERIAL NOT NULL,
  "tipo" "TipoDisciplina" NOT NULL,
  "codigo" VARCHAR(30) NOT NULL,
  "nombre" VARCHAR(200) NOT NULL,
  "puntaje_base" DECIMAL(10,4),
  "activo" BOOLEAN NOT NULL DEFAULT true,
  "id_creador" INTEGER NOT NULL,
  "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "fecha_actualizacion" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CatalogoDisciplina_pkey" PRIMARY KEY ("id_catalogo"),
  CONSTRAINT "CatalogoDisciplina_codigo_formato_check"
    CHECK (LENGTH(BTRIM("codigo")) > 0 AND "codigo" = UPPER(BTRIM("codigo"))),
  CONSTRAINT "CatalogoDisciplina_nombre_check"
    CHECK (LENGTH(BTRIM("nombre")) > 0),
  CONSTRAINT "CatalogoDisciplina_tipo_puntaje_check"
    CHECK (
      ("tipo" = 'MERITO' AND "puntaje_base" IS NULL)
      OR
      ("tipo" = 'DEMERITO' AND "puntaje_base" IN (1, 2, 3, 4, 5, 6))
    )
);

CREATE TABLE "SemanaDisciplina" (
  "id_semana" SERIAL NOT NULL,
  "id_periodo" INTEGER NOT NULL,
  "id_curso" INTEGER NOT NULL,
  "numero_semana" INTEGER NOT NULL,
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
  CONSTRAINT "SemanaDisciplina_pkey" PRIMARY KEY ("id_semana"),
  CONSTRAINT "SemanaDisciplina_numero_semana_check"
    CHECK ("numero_semana" BETWEEN 1 AND 22),
  CONSTRAINT "SemanaDisciplina_version_flujo_check"
    CHECK ("version_flujo" >= 0),
  CONSTRAINT "SemanaDisciplina_estado_nivel_check"
    CHECK (
      ("estado" = 'BORRADOR' AND "nivel_revision_actual" IS NULL)
      OR
      ("estado" IN ('EN_REVISION', 'OBSERVADO') AND "nivel_revision_actual" IS NOT NULL)
      OR
      ("estado" IN ('REVISADO', 'PUBLICADO') AND "nivel_revision_actual" IS NULL)
    )
);

CREATE TABLE "RegistroDisciplina" (
  "id_registro" SERIAL NOT NULL,
  "id_semana" INTEGER NOT NULL,
  "id_cadete" INTEGER NOT NULL,
  "id_catalogo" INTEGER NOT NULL,
  "id_oficial" INTEGER,
  "nombre_responsable_manual" VARCHAR(200),
  "fecha_hecho" DATE NOT NULL,
  "puntaje" DECIMAL(10,4) NOT NULL,
  "observacion" TEXT,
  "id_creador" INTEGER NOT NULL,
  "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "fecha_actualizacion" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RegistroDisciplina_pkey" PRIMARY KEY ("id_registro"),
  CONSTRAINT "RegistroDisciplina_puntaje_check" CHECK ("puntaje" > 0),
  CONSTRAINT "RegistroDisciplina_responsable_check"
    CHECK (
      NUM_NONNULLS("id_oficial", "nombre_responsable_manual") = 1
      AND (
        "nombre_responsable_manual" IS NULL
        OR LENGTH(BTRIM("nombre_responsable_manual")) > 0
      )
    )
);

CREATE TABLE "Notificacion" (
  "id_notificacion" SERIAL NOT NULL,
  "id_usuario_destinatario" INTEGER NOT NULL,
  "modulo" "ModuloNotificacion" NOT NULL,
  "area" VARCHAR(50),
  "tipo" VARCHAR(80) NOT NULL,
  "titulo" VARCHAR(160) NOT NULL,
  "mensaje" TEXT NOT NULL,
  "id_referencia" INTEGER,
  "ruta_destino" VARCHAR(255),
  "clave_evento" VARCHAR(255) NOT NULL,
  "leida" BOOLEAN NOT NULL DEFAULT false,
  "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "fecha_lectura" TIMESTAMP(3),
  CONSTRAINT "Notificacion_pkey" PRIMARY KEY ("id_notificacion"),
  CONSTRAINT "Notificacion_contenido_check"
    CHECK (
      LENGTH(BTRIM("tipo")) > 0
      AND LENGTH(BTRIM("titulo")) > 0
      AND LENGTH(BTRIM("mensaje")) > 0
      AND LENGTH(BTRIM("clave_evento")) > 0
      AND ("area" IS NULL OR LENGTH(BTRIM("area")) > 0)
    ),
  CONSTRAINT "Notificacion_lectura_check"
    CHECK (
      ("leida" = false AND "fecha_lectura" IS NULL)
      OR
      ("leida" = true AND "fecha_lectura" IS NOT NULL)
    )
);

CREATE UNIQUE INDEX "ConfiguracionDisciplinaPeriodo_id_periodo_id_curso_key"
  ON "ConfiguracionDisciplinaPeriodo"("id_periodo", "id_curso");
CREATE INDEX "ConfiguracionDisciplinaPeriodo_activo_idx"
  ON "ConfiguracionDisciplinaPeriodo"("activo");

CREATE UNIQUE INDEX "OficialDisciplina_codigo_key"
  ON "OficialDisciplina"("codigo");
CREATE INDEX "OficialDisciplina_activo_idx"
  ON "OficialDisciplina"("activo");

CREATE UNIQUE INDEX "CatalogoDisciplina_tipo_codigo_key"
  ON "CatalogoDisciplina"("tipo", "codigo");
CREATE INDEX "CatalogoDisciplina_tipo_activo_idx"
  ON "CatalogoDisciplina"("tipo", "activo");

CREATE UNIQUE INDEX "SemanaDisciplina_id_periodo_id_curso_numero_semana_key"
  ON "SemanaDisciplina"("id_periodo", "id_curso", "numero_semana");
CREATE INDEX "SemanaDisciplina_id_periodo_id_curso_estado_idx"
  ON "SemanaDisciplina"("id_periodo", "id_curso", "estado");
CREATE INDEX "SemanaDisciplina_estado_nivel_revision_actual_idx"
  ON "SemanaDisciplina"("estado", "nivel_revision_actual");
CREATE INDEX "SemanaDisciplina_id_creador_idx"
  ON "SemanaDisciplina"("id_creador");

CREATE INDEX "RegistroDisciplina_id_semana_id_cadete_idx"
  ON "RegistroDisciplina"("id_semana", "id_cadete");
CREATE INDEX "RegistroDisciplina_id_cadete_idx"
  ON "RegistroDisciplina"("id_cadete");
CREATE INDEX "RegistroDisciplina_id_catalogo_idx"
  ON "RegistroDisciplina"("id_catalogo");

CREATE UNIQUE INDEX "Notificacion_clave_evento_key"
  ON "Notificacion"("clave_evento");
CREATE INDEX "Notificacion_id_usuario_destinatario_leida_fecha_creacion_idx"
  ON "Notificacion"("id_usuario_destinatario", "leida", "fecha_creacion");

ALTER TABLE "ConfiguracionDisciplinaPeriodo"
  ADD CONSTRAINT "ConfiguracionDisciplinaPeriodo_id_periodo_fkey"
  FOREIGN KEY ("id_periodo") REFERENCES "PeriodoLectivo"("id_periodo")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ConfiguracionDisciplinaPeriodo"
  ADD CONSTRAINT "ConfiguracionDisciplinaPeriodo_id_curso_fkey"
  FOREIGN KEY ("id_curso") REFERENCES "Curso"("id_curso")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ConfiguracionDisciplinaPeriodo"
  ADD CONSTRAINT "ConfiguracionDisciplinaPeriodo_id_creador_fkey"
  FOREIGN KEY ("id_creador") REFERENCES "Usuario"("id_usuario")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "OficialDisciplina"
  ADD CONSTRAINT "OficialDisciplina_id_creador_fkey"
  FOREIGN KEY ("id_creador") REFERENCES "Usuario"("id_usuario")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CatalogoDisciplina"
  ADD CONSTRAINT "CatalogoDisciplina_id_creador_fkey"
  FOREIGN KEY ("id_creador") REFERENCES "Usuario"("id_usuario")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SemanaDisciplina"
  ADD CONSTRAINT "SemanaDisciplina_id_periodo_fkey"
  FOREIGN KEY ("id_periodo") REFERENCES "PeriodoLectivo"("id_periodo")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SemanaDisciplina"
  ADD CONSTRAINT "SemanaDisciplina_id_curso_fkey"
  FOREIGN KEY ("id_curso") REFERENCES "Curso"("id_curso")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SemanaDisciplina"
  ADD CONSTRAINT "SemanaDisciplina_id_creador_fkey"
  FOREIGN KEY ("id_creador") REFERENCES "Usuario"("id_usuario")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SemanaDisciplina"
  ADD CONSTRAINT "SemanaDisciplina_id_ultimo_responsable_fkey"
  FOREIGN KEY ("id_ultimo_responsable") REFERENCES "Usuario"("id_usuario")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "RegistroDisciplina"
  ADD CONSTRAINT "RegistroDisciplina_id_semana_fkey"
  FOREIGN KEY ("id_semana") REFERENCES "SemanaDisciplina"("id_semana")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RegistroDisciplina"
  ADD CONSTRAINT "RegistroDisciplina_id_cadete_fkey"
  FOREIGN KEY ("id_cadete") REFERENCES "Cadete"("id_cadete")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RegistroDisciplina"
  ADD CONSTRAINT "RegistroDisciplina_id_catalogo_fkey"
  FOREIGN KEY ("id_catalogo") REFERENCES "CatalogoDisciplina"("id_catalogo")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RegistroDisciplina"
  ADD CONSTRAINT "RegistroDisciplina_id_oficial_fkey"
  FOREIGN KEY ("id_oficial") REFERENCES "OficialDisciplina"("id_oficial")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RegistroDisciplina"
  ADD CONSTRAINT "RegistroDisciplina_id_creador_fkey"
  FOREIGN KEY ("id_creador") REFERENCES "Usuario"("id_usuario")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Notificacion"
  ADD CONSTRAINT "Notificacion_id_usuario_destinatario_fkey"
  FOREIGN KEY ("id_usuario_destinatario") REFERENCES "Usuario"("id_usuario")
  ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "Permiso" ("nombre", "modulo", "accion", "descripcion", "estado") VALUES
  ('VER_NOTAS', 'NOTAS', 'READ', 'Consultar informacion academica autorizada', true),
  ('REGISTRAR_NOTAS', 'NOTAS', 'CREATE', 'Registrar informacion academica', true),
  ('EDITAR_NOTAS', 'NOTAS', 'UPDATE', 'Editar informacion academica en estado editable', true),
  ('ENVIAR_NOTAS', 'NOTAS', 'SEND', 'Enviar informacion academica a revision', true),
  ('REVISAR_NOTAS', 'NOTAS', 'REVIEW', 'Revisar informacion academica', true),
  ('OBSERVAR_NOTAS', 'NOTAS', 'OBSERVE', 'Observar informacion academica con comentario', true),
  ('MARCAR_NOTAS_REVISADAS', 'NOTAS', 'FINAL_REVIEW', 'Marcar informacion academica como revisada', true),
  ('PUBLICAR_NOTAS', 'NOTAS', 'PUBLISH', 'Publicar informacion academica revisada', true),
  ('MODIFICAR_NOTA_BLOQUEADA', 'NOTAS', 'OVERRIDE', 'Modificar informacion academica bloqueada con justificacion', true);

INSERT INTO "RolPermiso" ("id_rol", "id_permiso")
SELECT r."id_rol", p."id_permiso"
FROM "Rol" r
JOIN "Permiso" p ON (
  r."nombre" = 'ADMINISTRADOR'
  OR (r."nombre" = 'OPERADOR' AND p."nombre" IN (
    'VER_NOTAS', 'REGISTRAR_NOTAS', 'EDITAR_NOTAS', 'ENVIAR_NOTAS'
  ))
  OR (r."nombre" = 'RESPONSABLE' AND p."nombre" IN (
    'VER_NOTAS', 'REGISTRAR_NOTAS', 'EDITAR_NOTAS', 'ENVIAR_NOTAS',
    'REVISAR_NOTAS', 'OBSERVAR_NOTAS', 'PUBLICAR_NOTAS'
  ))
  OR (r."nombre" = 'ADMINISTRATIVO_ACADEMICO' AND p."nombre" IN (
    'VER_NOTAS', 'REVISAR_NOTAS', 'OBSERVAR_NOTAS'
  ))
  OR (r."nombre" = 'CADETE' AND p."nombre" = 'VER_NOTAS')
)
WHERE p."nombre" IN (
  'VER_NOTAS',
  'REGISTRAR_NOTAS',
  'EDITAR_NOTAS',
  'ENVIAR_NOTAS',
  'REVISAR_NOTAS',
  'OBSERVAR_NOTAS',
  'MARCAR_NOTAS_REVISADAS',
  'PUBLICAR_NOTAS',
  'MODIFICAR_NOTA_BLOQUEADA'
)
ON CONFLICT ("id_rol", "id_permiso") DO NOTHING;

DO $$
DECLARE
  cantidad_jefes INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO cantidad_jefes
  FROM "Usuario" u
  JOIN "Rol" r ON r."id_rol" = u."id_rol"
  JOIN "Seccion" s ON s."id_seccion" = u."id_seccion"
  WHERE u."nombres" = 'JEFE'
    AND u."apellidos" = 'DE ESTUDIOS DE LA EMSE'
    AND r."nombre" = 'ADMINISTRATIVO_ACADEMICO'
    AND s."nombre" = 'JEFATURA_ESTUDIOS';

  IF cantidad_jefes <> 1 THEN
    RAISE EXCEPTION 'Se esperaba exactamente un Jefe de Estudios vigente; se encontraron %', cantidad_jefes;
  END IF;
END $$;

INSERT INTO "UsuarioPermiso" ("id_usuario", "id_permiso", "concedido")
SELECT u."id_usuario", p."id_permiso", true
FROM "Usuario" u
JOIN "Rol" r ON r."id_rol" = u."id_rol"
JOIN "Seccion" s ON s."id_seccion" = u."id_seccion"
CROSS JOIN "Permiso" p
WHERE u."nombres" = 'JEFE'
  AND u."apellidos" = 'DE ESTUDIOS DE LA EMSE'
  AND r."nombre" = 'ADMINISTRATIVO_ACADEMICO'
  AND s."nombre" = 'JEFATURA_ESTUDIOS'
  AND p."nombre" IN ('MARCAR_NOTAS_REVISADAS', 'MODIFICAR_NOTA_BLOQUEADA')
ON CONFLICT ("id_usuario", "id_permiso")
DO UPDATE SET "concedido" = EXCLUDED."concedido";

DO $$
BEGIN
  IF (
    SELECT COUNT(*)
    FROM "Permiso"
    WHERE "nombre" IN (
      'VER_NOTAS',
      'REGISTRAR_NOTAS',
      'EDITAR_NOTAS',
      'ENVIAR_NOTAS',
      'REVISAR_NOTAS',
      'OBSERVAR_NOTAS',
      'MARCAR_NOTAS_REVISADAS',
      'PUBLICAR_NOTAS',
      'MODIFICAR_NOTA_BLOQUEADA'
    )
  ) <> 9 THEN
    RAISE EXCEPTION 'No se crearon exactamente los nueve permisos generales de Notas';
  END IF;

  IF (SELECT COUNT(*) FROM "ConfiguracionDisciplinaPeriodo") <> 0
    OR (SELECT COUNT(*) FROM "OficialDisciplina") <> 0
    OR (SELECT COUNT(*) FROM "CatalogoDisciplina") <> 0
    OR (SELECT COUNT(*) FROM "SemanaDisciplina") <> 0
    OR (SELECT COUNT(*) FROM "RegistroDisciplina") <> 0
    OR (SELECT COUNT(*) FROM "Notificacion") <> 0 THEN
    RAISE EXCEPTION 'La migracion no debe precargar datos academicos ni notificaciones';
  END IF;
END $$;

COMMIT;
