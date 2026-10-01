-- CreateEnum
CREATE TYPE "PeriodoAcademico" AS ENUM ('I', 'II');

-- CreateEnum
CREATE TYPE "EstadoInscripcionAcademica" AS ENUM ('INSCRITO', 'EN_CURSO', 'APROBADO', 'REPROBADO', 'PENDIENTE', 'PENDIENTE_DE_SEGUNDA_INSTANCIA', 'PENDIENTE_DE_RESOLUCION', 'PROMOVIDO', 'EGRESADO');

-- CreateEnum
CREATE TYPE "TipoComponenteEvaluacion" AS ENUM ('FORMATIVA', 'SUMATIVA', 'TRABAJO_PRACTICO', 'TRABAJO_INVESTIGACION');

-- CreateEnum
CREATE TYPE "EstadoPlanillaEvaluacion" AS ENUM ('BORRADOR', 'ENVIADA', 'OBSERVADA', 'APROBADA', 'PUBLICADA');

-- CreateEnum
CREATE TYPE "TipoMatrizEvaluacion" AS ENUM ('SEMESTRAL', 'ANUAL', 'FINAL_EGRESO');

-- CreateEnum
CREATE TYPE "EstadoMatrizEvaluacion" AS ENUM ('BORRADOR', 'GENERADA', 'ENVIADA_SECCION_ACADEMICA', 'OBSERVADA', 'APROBADA', 'PUBLICADA');

-- CreateEnum
CREATE TYPE "EstadoCierreGestion" AS ENUM ('PREVISUALIZADO', 'PROCESANDO', 'COMPLETADO', 'FALLIDO');

-- AlterTable
ALTER TABLE "HistorialCursoCadete" ADD COLUMN     "id_inscripcion" INTEGER,
ADD COLUMN     "periodo" "PeriodoAcademico";

-- CreateTable
CREATE TABLE "InscripcionAcademicaAnual" (
    "id_inscripcion" SERIAL NOT NULL,
    "id_cadete" INTEGER NOT NULL,
    "id_gestion" INTEGER NOT NULL,
    "id_curso" INTEGER NOT NULL,
    "estado" "EstadoInscripcionAcademica" NOT NULL DEFAULT 'INSCRITO',
    "id_inscripcion_origen" INTEGER,
    "resultado_anual" DECIMAL(9,4),
    "motivo_pendiente" TEXT,
    "fecha_inscripcion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_resolucion" TIMESTAMP(3),
    "fecha_actualizacion" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InscripcionAcademicaAnual_pkey" PRIMARY KEY ("id_inscripcion")
);

-- CreateTable
CREATE TABLE "MateriaEvaluacion" (
    "id_materia" SERIAL NOT NULL,
    "id_gestion" INTEGER NOT NULL,
    "id_curso" INTEGER NOT NULL,
    "periodo" "PeriodoAcademico" NOT NULL,
    "nombre" TEXT NOT NULL,
    "carga_horaria" INTEGER NOT NULL,
    "fecha_inicio" TIMESTAMP(3),
    "fecha_fin" TIMESTAMP(3),
    "orden" INTEGER NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "id_operador" INTEGER,
    "id_creador" INTEGER NOT NULL,
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_actualizacion" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MateriaEvaluacion_pkey" PRIMARY KEY ("id_materia")
);

-- CreateTable
CREATE TABLE "ConfiguracionMateriaEvaluacion" (
    "id_configuracion" SERIAL NOT NULL,
    "id_materia" INTEGER NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "vigente" BOOLEAN NOT NULL DEFAULT true,
    "completa" BOOLEAN NOT NULL DEFAULT false,
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConfiguracionMateriaEvaluacion_pkey" PRIMARY KEY ("id_configuracion")
);

-- CreateTable
CREATE TABLE "GrupoComponenteEvaluacion" (
    "id_grupo" SERIAL NOT NULL,
    "id_configuracion" INTEGER NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "ponderacion" DECIMAL(9,4) NOT NULL,
    "orden" INTEGER NOT NULL,

    CONSTRAINT "GrupoComponenteEvaluacion_pkey" PRIMARY KEY ("id_grupo")
);

-- CreateTable
CREATE TABLE "ComponenteEvaluacion" (
    "id_componente" SERIAL NOT NULL,
    "id_grupo" INTEGER NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" "TipoComponenteEvaluacion" NOT NULL,
    "orden" INTEGER NOT NULL,
    "requerido" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ComponenteEvaluacion_pkey" PRIMARY KEY ("id_componente")
);

-- CreateTable
CREATE TABLE "PlanillaEvaluacion" (
    "id_planilla" SERIAL NOT NULL,
    "id_materia" INTEGER NOT NULL,
    "id_configuracion" INTEGER NOT NULL,
    "id_operador" INTEGER NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "vigente" BOOLEAN NOT NULL DEFAULT true,
    "estado" "EstadoPlanillaEvaluacion" NOT NULL DEFAULT 'BORRADOR',
    "observacion" TEXT,
    "fecha_envio" TIMESTAMP(3),
    "fecha_aprobacion" TIMESTAMP(3),
    "fecha_publicacion" TIMESTAMP(3),
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_actualizacion" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanillaEvaluacion_pkey" PRIMARY KEY ("id_planilla")
);

-- CreateTable
CREATE TABLE "DetallePlanillaEvaluacion" (
    "id_detalle" SERIAL NOT NULL,
    "id_planilla" INTEGER NOT NULL,
    "id_inscripcion" INTEGER NOT NULL,
    "id_cadete" INTEGER NOT NULL,
    "nota_original" DECIMAL(9,4),
    "nota_final" DECIMAL(9,4),
    "atributo" TEXT,
    "aprobado" BOOLEAN,
    "cantidad_aplazos" INTEGER NOT NULL DEFAULT 0,
    "completo" BOOLEAN NOT NULL DEFAULT false,
    "fecha_actualizacion" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DetallePlanillaEvaluacion_pkey" PRIMARY KEY ("id_detalle")
);

-- CreateTable
CREATE TABLE "ResultadoComponenteEvaluacion" (
    "id_resultado" SERIAL NOT NULL,
    "id_detalle" INTEGER NOT NULL,
    "id_componente" INTEGER NOT NULL,
    "nota" DECIMAL(9,4) NOT NULL,
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_actualizacion" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResultadoComponenteEvaluacion_pkey" PRIMARY KEY ("id_resultado")
);

-- CreateTable
CREATE TABLE "DesquiteEvaluacion" (
    "id_desquite" SERIAL NOT NULL,
    "id_detalle" INTEGER NOT NULL,
    "nota_original" DECIMAL(9,4) NOT NULL,
    "nota_desquite" DECIMAL(9,4) NOT NULL,
    "aprobado" BOOLEAN NOT NULL,
    "cuenta_aplazo" BOOLEAN NOT NULL DEFAULT true,
    "id_usuario" INTEGER NOT NULL,
    "observacion" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DesquiteEvaluacion_pkey" PRIMARY KEY ("id_desquite")
);

-- CreateTable
CREATE TABLE "MovimientoPlanillaEvaluacion" (
    "id_movimiento" SERIAL NOT NULL,
    "id_planilla" INTEGER NOT NULL,
    "id_usuario" INTEGER NOT NULL,
    "accion" TEXT NOT NULL,
    "estado_anterior" "EstadoPlanillaEvaluacion",
    "estado_nuevo" "EstadoPlanillaEvaluacion" NOT NULL,
    "observacion" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MovimientoPlanillaEvaluacion_pkey" PRIMARY KEY ("id_movimiento")
);

-- CreateTable
CREATE TABLE "EscalaAtributoEvaluacion" (
    "id_escala" SERIAL NOT NULL,
    "id_gestion" INTEGER NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "vigente" BOOLEAN NOT NULL DEFAULT true,
    "completa" BOOLEAN NOT NULL DEFAULT false,
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EscalaAtributoEvaluacion_pkey" PRIMARY KEY ("id_escala")
);

-- CreateTable
CREATE TABLE "RangoAtributoEvaluacion" (
    "id_rango" SERIAL NOT NULL,
    "id_escala" INTEGER NOT NULL,
    "atributo" TEXT NOT NULL,
    "minimo" DECIMAL(9,4) NOT NULL,
    "maximo" DECIMAL(9,4) NOT NULL,
    "aprobado" BOOLEAN NOT NULL,
    "orden" INTEGER NOT NULL,

    CONSTRAINT "RangoAtributoEvaluacion_pkey" PRIMARY KEY ("id_rango")
);

-- CreateTable
CREATE TABLE "ConfiguracionCalculoEvaluacion" (
    "id_configuracion" SERIAL NOT NULL,
    "id_gestion" INTEGER NOT NULL,
    "precision_decimal" INTEGER NOT NULL DEFAULT 4,
    "redondeo_intermedio" BOOLEAN NOT NULL DEFAULT false,
    "nota_desquite_en_promedio" BOOLEAN NOT NULL DEFAULT false,
    "nota_desquite_en_merito" BOOLEAN NOT NULL DEFAULT false,
    "desquite_conserva_aplazo" BOOLEAN NOT NULL DEFAULT true,
    "maximo_materias_desquite" INTEGER NOT NULL DEFAULT 2,
    "vigente" BOOLEAN NOT NULL DEFAULT true,
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConfiguracionCalculoEvaluacion_pkey" PRIMARY KEY ("id_configuracion")
);

-- CreateTable
CREATE TABLE "MatrizEvaluacion" (
    "id_matriz" SERIAL NOT NULL,
    "id_gestion" INTEGER NOT NULL,
    "id_curso" INTEGER,
    "periodo" "PeriodoAcademico",
    "tipo" "TipoMatrizEvaluacion" NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "vigente" BOOLEAN NOT NULL DEFAULT true,
    "estado" "EstadoMatrizEvaluacion" NOT NULL DEFAULT 'BORRADOR',
    "codigo" TEXT NOT NULL,
    "id_creador" INTEGER NOT NULL,
    "observacion" TEXT,
    "fecha_envio" TIMESTAMP(3),
    "fecha_aprobacion" TIMESTAMP(3),
    "fecha_publicacion" TIMESTAMP(3),
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_actualizacion" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MatrizEvaluacion_pkey" PRIMARY KEY ("id_matriz")
);

-- CreateTable
CREATE TABLE "DetalleMatrizEvaluacion" (
    "id_detalle" SERIAL NOT NULL,
    "id_matriz" INTEGER NOT NULL,
    "id_inscripcion" INTEGER NOT NULL,
    "id_cadete" INTEGER NOT NULL,
    "id_curso" INTEGER NOT NULL,
    "promedio_academico" DECIMAL(9,4),
    "aporte_academico" DECIMAL(9,4),
    "nota_disciplina" DECIMAL(9,4),
    "aporte_disciplina" DECIMAL(9,4),
    "nota_entrenamiento" DECIMAL(9,4),
    "aporte_entrenamiento" DECIMAL(9,4),
    "promedio_general" DECIMAL(9,4),
    "promedio_periodo_i" DECIMAL(9,4),
    "promedio_periodo_ii" DECIMAL(9,4),
    "promedio_anual" DECIMAL(9,4),
    "promedio_anio_uno" DECIMAL(9,4),
    "promedio_anio_dos" DECIMAL(9,4),
    "promedio_anio_tres" DECIMAL(9,4),
    "cantidad_aplazos" INTEGER NOT NULL DEFAULT 0,
    "atributo" TEXT,
    "orden_merito" INTEGER,
    "empate" BOOLEAN NOT NULL DEFAULT false,
    "completo" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "DetalleMatrizEvaluacion_pkey" PRIMARY KEY ("id_detalle")
);

-- CreateTable
CREATE TABLE "MovimientoMatrizEvaluacion" (
    "id_movimiento" SERIAL NOT NULL,
    "id_matriz" INTEGER NOT NULL,
    "id_usuario" INTEGER NOT NULL,
    "accion" TEXT NOT NULL,
    "estado_anterior" "EstadoMatrizEvaluacion",
    "estado_nuevo" "EstadoMatrizEvaluacion" NOT NULL,
    "observacion" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MovimientoMatrizEvaluacion_pkey" PRIMARY KEY ("id_movimiento")
);

-- CreateTable
CREATE TABLE "CierreGestionAcademica" (
    "id_cierre" SERIAL NOT NULL,
    "id_gestion" INTEGER NOT NULL,
    "id_gestion_destino" INTEGER NOT NULL,
    "codigo_ejecucion" TEXT NOT NULL,
    "estado" "EstadoCierreGestion" NOT NULL DEFAULT 'PREVISUALIZADO',
    "id_usuario" INTEGER NOT NULL,
    "fecha_previsualizacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_confirmacion" TIMESTAMP(3),
    "resumen" JSONB,

    CONSTRAINT "CierreGestionAcademica_pkey" PRIMARY KEY ("id_cierre")
);

-- CreateTable
CREATE TABLE "DetalleCierreGestion" (
    "id_detalle" SERIAL NOT NULL,
    "id_cierre" INTEGER NOT NULL,
    "id_inscripcion_origen" INTEGER NOT NULL,
    "id_inscripcion_destino" INTEGER,
    "accion" TEXT NOT NULL,
    "estado_anterior" "EstadoInscripcionAcademica" NOT NULL,
    "estado_nuevo" "EstadoInscripcionAcademica" NOT NULL,
    "motivo" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DetalleCierreGestion_pkey" PRIMARY KEY ("id_detalle")
);

-- Migración reversible de los dos periodos históricos hacia una inscripción anual.
-- No elimina ni sobrescribe HistorialCursoCadete.
INSERT INTO "InscripcionAcademicaAnual"
  ("id_cadete", "id_gestion", "id_curso", "estado", "fecha_inscripcion", "fecha_actualizacion")
SELECT h."id_cadete", h."id_gestion", h."id_curso",
       CASE WHEN g."estado" = 'ACTIVA'::"EstadoGestion"
            THEN 'EN_CURSO'::"EstadoInscripcionAcademica"
            ELSE 'PENDIENTE'::"EstadoInscripcionAcademica" END,
       MIN(h."fecha_registro"), CURRENT_TIMESTAMP
FROM "HistorialCursoCadete" h
JOIN "GestionAcademica" g ON g."id_gestion" = h."id_gestion"
GROUP BY h."id_cadete", h."id_gestion", h."id_curso", g."estado"
;

UPDATE "HistorialCursoCadete" h
SET "id_inscripcion" = i."id_inscripcion",
    "periodo" = CASE WHEN h."semestre" IN (1, 3, 5)
                     THEN 'I'::"PeriodoAcademico"
                     ELSE 'II'::"PeriodoAcademico" END
FROM "InscripcionAcademicaAnual" i
WHERE i."id_cadete" = h."id_cadete"
  AND i."id_gestion" = h."id_gestion";

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "HistorialCursoCadete"
    WHERE "id_inscripcion" IS NULL OR "periodo" IS NULL
  ) THEN
    RAISE EXCEPTION 'Existen periodos históricos sin inscripción o periodo inequívoco';
  END IF;
END $$;

ALTER TABLE "HistorialCursoCadete"
  ALTER COLUMN "id_inscripcion" SET NOT NULL,
  ALTER COLUMN "periodo" SET NOT NULL;

ALTER TABLE "HistorialCursoCadete"
  ADD CONSTRAINT "HistorialCursoCadete_semestre_periodo_check"
  CHECK (
    ("semestre" IN (1, 3, 5) AND "periodo" = 'I'::"PeriodoAcademico")
    OR ("semestre" IN (2, 4, 6) AND "periodo" = 'II'::"PeriodoAcademico")
  );

ALTER TABLE "MateriaEvaluacion"
  ADD CONSTRAINT "MateriaEvaluacion_carga_horaria_check"
  CHECK ("carga_horaria" BETWEEN 1 AND 120);
ALTER TABLE "GrupoComponenteEvaluacion"
  ADD CONSTRAINT "GrupoComponenteEvaluacion_ponderacion_check"
  CHECK ("ponderacion" > 0 AND "ponderacion" <= 100);
ALTER TABLE "ResultadoComponenteEvaluacion"
  ADD CONSTRAINT "ResultadoComponenteEvaluacion_nota_check"
  CHECK ("nota" BETWEEN 0 AND 100);
ALTER TABLE "DetallePlanillaEvaluacion"
  ADD CONSTRAINT "DetallePlanillaEvaluacion_notas_check"
  CHECK (
    ("nota_original" IS NULL OR "nota_original" BETWEEN 0 AND 100)
    AND ("nota_final" IS NULL OR "nota_final" BETWEEN 0 AND 100)
  );
ALTER TABLE "DesquiteEvaluacion"
  ADD CONSTRAINT "DesquiteEvaluacion_notas_check"
  CHECK ("nota_original" BETWEEN 0 AND 100 AND "nota_desquite" BETWEEN 0 AND 100);
ALTER TABLE "RangoAtributoEvaluacion"
  ADD CONSTRAINT "RangoAtributoEvaluacion_limites_check"
  CHECK ("minimo" >= 0 AND "maximo" <= 100 AND "minimo" <= "maximo");

-- Escala oficial confirmada por los artículos 37 y 57 del reglamento.
INSERT INTO "EscalaAtributoEvaluacion"
  ("id_gestion", "version", "vigente", "completa", "fecha_creacion")
SELECT g."id_gestion", 1, true, true, CURRENT_TIMESTAMP
FROM "GestionAcademica" g
;

INSERT INTO "RangoAtributoEvaluacion"
  ("id_escala", "atributo", "minimo", "maximo", "aprobado", "orden")
SELECT e."id_escala", r.atributo, r.minimo, r.maximo, r.aprobado, r.orden
FROM "EscalaAtributoEvaluacion" e
CROSS JOIN (VALUES
  ('E', 100.0000::decimal, 100.0000::decimal, true, 1),
  ('MB', 85.0000::decimal, 99.9999::decimal, true, 2),
  ('B', 71.0000::decimal, 84.9999::decimal, true, 3),
  ('R', 51.0000::decimal, 70.9999::decimal, true, 4),
  ('M', 30.0000::decimal, 50.9999::decimal, false, 5),
  ('D', 0.0000::decimal, 29.9999::decimal, false, 6)
) AS r(atributo, minimo, maximo, aprobado, orden)
;

-- Política confirmada por los artículos 58 y 59: la segunda instancia solo
-- determina aprobación; la nota original permanece en promedio y mérito.
INSERT INTO "ConfiguracionCalculoEvaluacion"
  ("id_gestion", "precision_decimal", "redondeo_intermedio",
   "nota_desquite_en_promedio", "nota_desquite_en_merito",
   "desquite_conserva_aplazo", "maximo_materias_desquite", "vigente", "fecha_creacion")
SELECT g."id_gestion", 4, false, false, false, true, 2, true, CURRENT_TIMESTAMP
FROM "GestionAcademica" g
;

-- Permisos idempotentes. CERRAR_GESTION_ACADEMICA se crea sin asignación.
INSERT INTO "Permiso" ("nombre", "modulo", "accion", "descripcion", "estado")
VALUES
 ('VER_NOTAS_EVALUACIONES', 'EVALUACIONES', 'READ', 'Consultar Evaluaciones', true),
 ('CONFIGURAR_MATERIAS_EVALUACIONES', 'EVALUACIONES', 'CONFIGURE', 'Configurar materias y componentes', true),
 ('CARGAR_NOTAS_EVALUACIONES', 'EVALUACIONES', 'CREATE', 'Registrar notas de Evaluaciones', true),
 ('ENVIAR_PLANILLA_EVALUACIONES', 'EVALUACIONES', 'UPDATE', 'Enviar planillas de Evaluaciones', true),
 ('REVISAR_PLANILLAS_EVALUACIONES', 'EVALUACIONES', 'REVIEW', 'Revisar planillas de Evaluaciones', true),
 ('REVISAR_NOTAS_SECCION_ACADEMICA', 'EVALUACIONES', 'REVIEW', 'Revisar matrices en Sección Académica', true),
 ('GENERAR_MATRICES_EVALUACIONES', 'EVALUACIONES', 'CREATE', 'Generar matrices académicas', true),
 ('PUBLICAR_NOTAS_EVALUACIONES', 'EVALUACIONES', 'PUBLISH', 'Publicar resultados aprobados', true),
 ('GENERAR_REPORTES_NOTAS', 'EVALUACIONES', 'REPORT', 'Generar reportes y certificados', true),
 ('VER_NOTAS_PROPIAS', 'EVALUACIONES', 'READ_OWN', 'Consultar resultados propios publicados', true),
 ('VER_PREVISUALIZACION_CIERRE_GESTION', 'EVALUACIONES', 'READ', 'Previsualizar cierre académico', true),
 ('CERRAR_GESTION_ACADEMICA', 'EVALUACIONES', 'CLOSE', 'Confirmar cierre oficial de gestión', true),
 ('RESOLVER_SITUACION_ACADEMICA_PENDIENTE', 'EVALUACIONES', 'RESOLVE', 'Resolver situación académica pendiente', true)
ON CONFLICT ("nombre") DO UPDATE SET
  "descripcion" = EXCLUDED."descripcion", "estado" = true;

INSERT INTO "RolPermiso" ("id_rol", "id_permiso")
SELECT r."id_rol", p."id_permiso"
FROM "Rol" r JOIN "Permiso" p ON p."nombre" IN (
  'VER_NOTAS_EVALUACIONES','CONFIGURAR_MATERIAS_EVALUACIONES',
  'REVISAR_PLANILLAS_EVALUACIONES','GENERAR_MATRICES_EVALUACIONES',
  'PUBLICAR_NOTAS_EVALUACIONES','GENERAR_REPORTES_NOTAS',
  'VER_PREVISUALIZACION_CIERRE_GESTION','RESOLVER_SITUACION_ACADEMICA_PENDIENTE'
)
WHERE r."nombre" IN ('RESPONSABLE','ADMINISTRADOR')
ON CONFLICT ("id_rol", "id_permiso") DO NOTHING;

INSERT INTO "RolPermiso" ("id_rol", "id_permiso")
SELECT r."id_rol", p."id_permiso"
FROM "Rol" r JOIN "Permiso" p ON p."nombre" IN (
  'VER_NOTAS_EVALUACIONES','CARGAR_NOTAS_EVALUACIONES','ENVIAR_PLANILLA_EVALUACIONES'
)
WHERE r."nombre" = 'OPERADOR'
ON CONFLICT ("id_rol", "id_permiso") DO NOTHING;

INSERT INTO "RolPermiso" ("id_rol", "id_permiso")
SELECT r."id_rol", p."id_permiso"
FROM "Rol" r JOIN "Permiso" p ON p."nombre" IN (
  'VER_NOTAS_EVALUACIONES','REVISAR_NOTAS_SECCION_ACADEMICA'
)
WHERE r."nombre" = 'ADMINISTRATIVO_ACADEMICO'
ON CONFLICT ("id_rol", "id_permiso") DO NOTHING;

INSERT INTO "RolPermiso" ("id_rol", "id_permiso")
SELECT r."id_rol", p."id_permiso"
FROM "Rol" r JOIN "Permiso" p ON p."nombre" = 'VER_NOTAS_PROPIAS'
WHERE r."nombre" = 'CADETE'
ON CONFLICT ("id_rol", "id_permiso") DO NOTHING;

-- CreateIndex
CREATE INDEX "InscripcionAcademicaAnual_id_gestion_id_curso_estado_idx" ON "InscripcionAcademicaAnual"("id_gestion", "id_curso", "estado");

-- CreateIndex
CREATE INDEX "InscripcionAcademicaAnual_id_inscripcion_origen_idx" ON "InscripcionAcademicaAnual"("id_inscripcion_origen");

-- CreateIndex
CREATE UNIQUE INDEX "InscripcionAcademicaAnual_id_cadete_id_gestion_key" ON "InscripcionAcademicaAnual"("id_cadete", "id_gestion");

-- CreateIndex
CREATE INDEX "MateriaEvaluacion_id_operador_activo_idx" ON "MateriaEvaluacion"("id_operador", "activo");

-- CreateIndex
CREATE UNIQUE INDEX "MateriaEvaluacion_id_gestion_id_curso_periodo_nombre_key" ON "MateriaEvaluacion"("id_gestion", "id_curso", "periodo", "nombre");

-- CreateIndex
CREATE UNIQUE INDEX "MateriaEvaluacion_id_gestion_id_curso_periodo_orden_key" ON "MateriaEvaluacion"("id_gestion", "id_curso", "periodo", "orden");

-- CreateIndex
CREATE INDEX "ConfiguracionMateriaEvaluacion_id_materia_vigente_idx" ON "ConfiguracionMateriaEvaluacion"("id_materia", "vigente");

-- CreateIndex
CREATE UNIQUE INDEX "ConfiguracionMateriaEvaluacion_id_materia_version_key" ON "ConfiguracionMateriaEvaluacion"("id_materia", "version");

-- CreateIndex
CREATE UNIQUE INDEX "GrupoComponenteEvaluacion_id_configuracion_codigo_key" ON "GrupoComponenteEvaluacion"("id_configuracion", "codigo");

-- CreateIndex
CREATE UNIQUE INDEX "GrupoComponenteEvaluacion_id_configuracion_orden_key" ON "GrupoComponenteEvaluacion"("id_configuracion", "orden");

-- CreateIndex
CREATE UNIQUE INDEX "ComponenteEvaluacion_id_grupo_codigo_key" ON "ComponenteEvaluacion"("id_grupo", "codigo");

-- CreateIndex
CREATE UNIQUE INDEX "ComponenteEvaluacion_id_grupo_orden_key" ON "ComponenteEvaluacion"("id_grupo", "orden");

-- CreateIndex
CREATE INDEX "PlanillaEvaluacion_id_operador_estado_vigente_idx" ON "PlanillaEvaluacion"("id_operador", "estado", "vigente");

-- CreateIndex
CREATE UNIQUE INDEX "PlanillaEvaluacion_id_materia_version_key" ON "PlanillaEvaluacion"("id_materia", "version");

-- CreateIndex
CREATE UNIQUE INDEX "DetallePlanillaEvaluacion_id_planilla_id_inscripcion_key" ON "DetallePlanillaEvaluacion"("id_planilla", "id_inscripcion");

-- CreateIndex
CREATE UNIQUE INDEX "DetallePlanillaEvaluacion_id_planilla_id_cadete_key" ON "DetallePlanillaEvaluacion"("id_planilla", "id_cadete");

-- CreateIndex
CREATE UNIQUE INDEX "ResultadoComponenteEvaluacion_id_detalle_id_componente_key" ON "ResultadoComponenteEvaluacion"("id_detalle", "id_componente");

-- CreateIndex
CREATE INDEX "DesquiteEvaluacion_id_detalle_fecha_idx" ON "DesquiteEvaluacion"("id_detalle", "fecha");

-- CreateIndex
CREATE INDEX "MovimientoPlanillaEvaluacion_id_planilla_fecha_idx" ON "MovimientoPlanillaEvaluacion"("id_planilla", "fecha");

-- CreateIndex
CREATE INDEX "EscalaAtributoEvaluacion_id_gestion_vigente_idx" ON "EscalaAtributoEvaluacion"("id_gestion", "vigente");

-- CreateIndex
CREATE UNIQUE INDEX "EscalaAtributoEvaluacion_id_gestion_version_key" ON "EscalaAtributoEvaluacion"("id_gestion", "version");

-- CreateIndex
CREATE UNIQUE INDEX "RangoAtributoEvaluacion_id_escala_atributo_key" ON "RangoAtributoEvaluacion"("id_escala", "atributo");

-- CreateIndex
CREATE UNIQUE INDEX "RangoAtributoEvaluacion_id_escala_orden_key" ON "RangoAtributoEvaluacion"("id_escala", "orden");

-- CreateIndex
CREATE UNIQUE INDEX "ConfiguracionCalculoEvaluacion_id_gestion_key" ON "ConfiguracionCalculoEvaluacion"("id_gestion");

-- CreateIndex
CREATE UNIQUE INDEX "MatrizEvaluacion_codigo_key" ON "MatrizEvaluacion"("codigo");

-- CreateIndex
CREATE INDEX "MatrizEvaluacion_estado_vigente_idx" ON "MatrizEvaluacion"("estado", "vigente");

-- CreateIndex
CREATE UNIQUE INDEX "MatrizEvaluacion_id_gestion_id_curso_periodo_tipo_version_key" ON "MatrizEvaluacion"("id_gestion", "id_curso", "periodo", "tipo", "version");

-- CreateIndex
CREATE UNIQUE INDEX "DetalleMatrizEvaluacion_id_matriz_id_inscripcion_key" ON "DetalleMatrizEvaluacion"("id_matriz", "id_inscripcion");

-- CreateIndex
CREATE UNIQUE INDEX "DetalleMatrizEvaluacion_id_matriz_id_cadete_key" ON "DetalleMatrizEvaluacion"("id_matriz", "id_cadete");

-- CreateIndex
CREATE INDEX "MovimientoMatrizEvaluacion_id_matriz_fecha_idx" ON "MovimientoMatrizEvaluacion"("id_matriz", "fecha");

-- CreateIndex
CREATE UNIQUE INDEX "CierreGestionAcademica_id_gestion_key" ON "CierreGestionAcademica"("id_gestion");

-- CreateIndex
CREATE UNIQUE INDEX "CierreGestionAcademica_codigo_ejecucion_key" ON "CierreGestionAcademica"("codigo_ejecucion");

-- CreateIndex
CREATE INDEX "CierreGestionAcademica_estado_idx" ON "CierreGestionAcademica"("estado");

-- CreateIndex
CREATE INDEX "DetalleCierreGestion_id_inscripcion_destino_idx" ON "DetalleCierreGestion"("id_inscripcion_destino");

-- CreateIndex
CREATE UNIQUE INDEX "DetalleCierreGestion_id_cierre_id_inscripcion_origen_key" ON "DetalleCierreGestion"("id_cierre", "id_inscripcion_origen");

-- CreateIndex
CREATE INDEX "HistorialCursoCadete_id_inscripcion_periodo_idx" ON "HistorialCursoCadete"("id_inscripcion", "periodo");

-- AddForeignKey
ALTER TABLE "HistorialCursoCadete" ADD CONSTRAINT "HistorialCursoCadete_id_inscripcion_fkey" FOREIGN KEY ("id_inscripcion") REFERENCES "InscripcionAcademicaAnual"("id_inscripcion") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InscripcionAcademicaAnual" ADD CONSTRAINT "InscripcionAcademicaAnual_id_cadete_fkey" FOREIGN KEY ("id_cadete") REFERENCES "Cadete"("id_cadete") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InscripcionAcademicaAnual" ADD CONSTRAINT "InscripcionAcademicaAnual_id_gestion_fkey" FOREIGN KEY ("id_gestion") REFERENCES "GestionAcademica"("id_gestion") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InscripcionAcademicaAnual" ADD CONSTRAINT "InscripcionAcademicaAnual_id_curso_fkey" FOREIGN KEY ("id_curso") REFERENCES "Curso"("id_curso") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InscripcionAcademicaAnual" ADD CONSTRAINT "InscripcionAcademicaAnual_id_inscripcion_origen_fkey" FOREIGN KEY ("id_inscripcion_origen") REFERENCES "InscripcionAcademicaAnual"("id_inscripcion") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MateriaEvaluacion" ADD CONSTRAINT "MateriaEvaluacion_id_gestion_fkey" FOREIGN KEY ("id_gestion") REFERENCES "GestionAcademica"("id_gestion") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MateriaEvaluacion" ADD CONSTRAINT "MateriaEvaluacion_id_curso_fkey" FOREIGN KEY ("id_curso") REFERENCES "Curso"("id_curso") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MateriaEvaluacion" ADD CONSTRAINT "MateriaEvaluacion_id_operador_fkey" FOREIGN KEY ("id_operador") REFERENCES "Usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MateriaEvaluacion" ADD CONSTRAINT "MateriaEvaluacion_id_creador_fkey" FOREIGN KEY ("id_creador") REFERENCES "Usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConfiguracionMateriaEvaluacion" ADD CONSTRAINT "ConfiguracionMateriaEvaluacion_id_materia_fkey" FOREIGN KEY ("id_materia") REFERENCES "MateriaEvaluacion"("id_materia") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrupoComponenteEvaluacion" ADD CONSTRAINT "GrupoComponenteEvaluacion_id_configuracion_fkey" FOREIGN KEY ("id_configuracion") REFERENCES "ConfiguracionMateriaEvaluacion"("id_configuracion") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComponenteEvaluacion" ADD CONSTRAINT "ComponenteEvaluacion_id_grupo_fkey" FOREIGN KEY ("id_grupo") REFERENCES "GrupoComponenteEvaluacion"("id_grupo") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanillaEvaluacion" ADD CONSTRAINT "PlanillaEvaluacion_id_materia_fkey" FOREIGN KEY ("id_materia") REFERENCES "MateriaEvaluacion"("id_materia") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanillaEvaluacion" ADD CONSTRAINT "PlanillaEvaluacion_id_configuracion_fkey" FOREIGN KEY ("id_configuracion") REFERENCES "ConfiguracionMateriaEvaluacion"("id_configuracion") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanillaEvaluacion" ADD CONSTRAINT "PlanillaEvaluacion_id_operador_fkey" FOREIGN KEY ("id_operador") REFERENCES "Usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetallePlanillaEvaluacion" ADD CONSTRAINT "DetallePlanillaEvaluacion_id_planilla_fkey" FOREIGN KEY ("id_planilla") REFERENCES "PlanillaEvaluacion"("id_planilla") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetallePlanillaEvaluacion" ADD CONSTRAINT "DetallePlanillaEvaluacion_id_inscripcion_fkey" FOREIGN KEY ("id_inscripcion") REFERENCES "InscripcionAcademicaAnual"("id_inscripcion") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetallePlanillaEvaluacion" ADD CONSTRAINT "DetallePlanillaEvaluacion_id_cadete_fkey" FOREIGN KEY ("id_cadete") REFERENCES "Cadete"("id_cadete") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResultadoComponenteEvaluacion" ADD CONSTRAINT "ResultadoComponenteEvaluacion_id_detalle_fkey" FOREIGN KEY ("id_detalle") REFERENCES "DetallePlanillaEvaluacion"("id_detalle") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResultadoComponenteEvaluacion" ADD CONSTRAINT "ResultadoComponenteEvaluacion_id_componente_fkey" FOREIGN KEY ("id_componente") REFERENCES "ComponenteEvaluacion"("id_componente") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DesquiteEvaluacion" ADD CONSTRAINT "DesquiteEvaluacion_id_detalle_fkey" FOREIGN KEY ("id_detalle") REFERENCES "DetallePlanillaEvaluacion"("id_detalle") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DesquiteEvaluacion" ADD CONSTRAINT "DesquiteEvaluacion_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "Usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoPlanillaEvaluacion" ADD CONSTRAINT "MovimientoPlanillaEvaluacion_id_planilla_fkey" FOREIGN KEY ("id_planilla") REFERENCES "PlanillaEvaluacion"("id_planilla") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoPlanillaEvaluacion" ADD CONSTRAINT "MovimientoPlanillaEvaluacion_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "Usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EscalaAtributoEvaluacion" ADD CONSTRAINT "EscalaAtributoEvaluacion_id_gestion_fkey" FOREIGN KEY ("id_gestion") REFERENCES "GestionAcademica"("id_gestion") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RangoAtributoEvaluacion" ADD CONSTRAINT "RangoAtributoEvaluacion_id_escala_fkey" FOREIGN KEY ("id_escala") REFERENCES "EscalaAtributoEvaluacion"("id_escala") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConfiguracionCalculoEvaluacion" ADD CONSTRAINT "ConfiguracionCalculoEvaluacion_id_gestion_fkey" FOREIGN KEY ("id_gestion") REFERENCES "GestionAcademica"("id_gestion") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatrizEvaluacion" ADD CONSTRAINT "MatrizEvaluacion_id_gestion_fkey" FOREIGN KEY ("id_gestion") REFERENCES "GestionAcademica"("id_gestion") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatrizEvaluacion" ADD CONSTRAINT "MatrizEvaluacion_id_curso_fkey" FOREIGN KEY ("id_curso") REFERENCES "Curso"("id_curso") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatrizEvaluacion" ADD CONSTRAINT "MatrizEvaluacion_id_creador_fkey" FOREIGN KEY ("id_creador") REFERENCES "Usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetalleMatrizEvaluacion" ADD CONSTRAINT "DetalleMatrizEvaluacion_id_matriz_fkey" FOREIGN KEY ("id_matriz") REFERENCES "MatrizEvaluacion"("id_matriz") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetalleMatrizEvaluacion" ADD CONSTRAINT "DetalleMatrizEvaluacion_id_inscripcion_fkey" FOREIGN KEY ("id_inscripcion") REFERENCES "InscripcionAcademicaAnual"("id_inscripcion") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetalleMatrizEvaluacion" ADD CONSTRAINT "DetalleMatrizEvaluacion_id_cadete_fkey" FOREIGN KEY ("id_cadete") REFERENCES "Cadete"("id_cadete") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetalleMatrizEvaluacion" ADD CONSTRAINT "DetalleMatrizEvaluacion_id_curso_fkey" FOREIGN KEY ("id_curso") REFERENCES "Curso"("id_curso") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoMatrizEvaluacion" ADD CONSTRAINT "MovimientoMatrizEvaluacion_id_matriz_fkey" FOREIGN KEY ("id_matriz") REFERENCES "MatrizEvaluacion"("id_matriz") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoMatrizEvaluacion" ADD CONSTRAINT "MovimientoMatrizEvaluacion_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "Usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CierreGestionAcademica" ADD CONSTRAINT "CierreGestionAcademica_id_gestion_fkey" FOREIGN KEY ("id_gestion") REFERENCES "GestionAcademica"("id_gestion") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CierreGestionAcademica" ADD CONSTRAINT "CierreGestionAcademica_id_gestion_destino_fkey" FOREIGN KEY ("id_gestion_destino") REFERENCES "GestionAcademica"("id_gestion") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CierreGestionAcademica" ADD CONSTRAINT "CierreGestionAcademica_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "Usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetalleCierreGestion" ADD CONSTRAINT "DetalleCierreGestion_id_cierre_fkey" FOREIGN KEY ("id_cierre") REFERENCES "CierreGestionAcademica"("id_cierre") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetalleCierreGestion" ADD CONSTRAINT "DetalleCierreGestion_id_inscripcion_origen_fkey" FOREIGN KEY ("id_inscripcion_origen") REFERENCES "InscripcionAcademicaAnual"("id_inscripcion") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetalleCierreGestion" ADD CONSTRAINT "DetalleCierreGestion_id_inscripcion_destino_fkey" FOREIGN KEY ("id_inscripcion_destino") REFERENCES "InscripcionAcademicaAnual"("id_inscripcion") ON DELETE RESTRICT ON UPDATE CASCADE;
