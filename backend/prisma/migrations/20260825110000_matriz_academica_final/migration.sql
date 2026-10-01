-- Infraestructura mínima para la matriz académica consolidada.
-- No transforma, elimina ni duplica datos académicos existentes.
CREATE TYPE "TipoMatrizAcademica" AS ENUM ('SEMESTRAL', 'ANUAL');
CREATE TYPE "EstadoMatrizAcademica" AS ENUM ('BORRADOR', 'EN_REVISION', 'OBSERVADO', 'APROBADO', 'PUBLICADO');

CREATE TABLE "AntecedenteAcademicoCadete" (
    "id_antecedente" SERIAL NOT NULL,
    "id_cadete" INTEGER NOT NULL,
    "gestion" INTEGER NOT NULL,
    "promedio_general" DECIMAL(10,4) NOT NULL,
    "cantidad_aplazos" INTEGER NOT NULL,
    "id_registrador" INTEGER NOT NULL,
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_actualizacion" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AntecedenteAcademicoCadete_pkey" PRIMARY KEY ("id_antecedente"),
    CONSTRAINT "AntecedenteAcademicoCadete_promedio_check" CHECK ("promedio_general" >= 0 AND "promedio_general" <= 100),
    CONSTRAINT "AntecedenteAcademicoCadete_aplazos_check" CHECK ("cantidad_aplazos" >= 0),
    CONSTRAINT "AntecedenteAcademicoCadete_gestion_check" CHECK ("gestion" < 2026)
);

CREATE TABLE "MatrizAcademica" (
    "id_matriz" SERIAL NOT NULL,
    "id_periodo" INTEGER NOT NULL,
    "id_curso" INTEGER NOT NULL,
    "tipo" "TipoMatrizAcademica" NOT NULL,
    "estado" "EstadoMatrizAcademica" NOT NULL DEFAULT 'BORRADOR',
    "nivel_revision_actual" "NivelRevisionNota",
    "version_flujo" INTEGER NOT NULL DEFAULT 0,
    "id_creador" INTEGER NOT NULL,
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_actualizacion" TIMESTAMP(3) NOT NULL,
    "fecha_envio" TIMESTAMP(3),
    "fecha_revision" TIMESTAMP(3),
    "fecha_aprobacion" TIMESTAMP(3),
    "fecha_publicacion" TIMESTAMP(3),
    CONSTRAINT "MatrizAcademica_pkey" PRIMARY KEY ("id_matriz")
);

CREATE TABLE "DetalleMatrizAcademica" (
    "id_detalle" SERIAL NOT NULL,
    "id_matriz" INTEGER NOT NULL,
    "id_cadete" INTEGER NOT NULL,
    "promedio_academico" DECIMAL(10,4),
    "ponderacion_evaluaciones" DECIMAL(10,4),
    "nota_entrenamiento_fisico" DECIMAL(10,4),
    "ponderacion_entrenamiento" DECIMAL(10,4),
    "nota_disciplina" DECIMAL(10,4),
    "ponderacion_disciplina" DECIMAL(10,4),
    "promedio_general" DECIMAL(10,4) NOT NULL,
    "cantidad_aplazos" INTEGER NOT NULL,
    "promedio_acumulado" DECIMAL(10,4) NOT NULL,
    "cantidad_aplazos_acumulados" INTEGER NOT NULL,
    "atributo" VARCHAR(2) NOT NULL,
    "orden_merito" INTEGER NOT NULL,
    CONSTRAINT "DetalleMatrizAcademica_pkey" PRIMARY KEY ("id_detalle"),
    CONSTRAINT "DetalleMatrizAcademica_promedio_check" CHECK ("promedio_general" >= 0 AND "promedio_general" <= 100 AND "promedio_acumulado" >= 0 AND "promedio_acumulado" <= 100),
    CONSTRAINT "DetalleMatrizAcademica_aplazos_check" CHECK ("cantidad_aplazos" >= 0 AND "cantidad_aplazos_acumulados" >= 0),
    CONSTRAINT "DetalleMatrizAcademica_orden_check" CHECK ("orden_merito" > 0),
    CONSTRAINT "DetalleMatrizAcademica_atributo_check" CHECK ("atributo" IN ('E', 'MB', 'B', 'R', 'M'))
);

CREATE UNIQUE INDEX "AntecedenteAcademicoCadete_id_cadete_gestion_key" ON "AntecedenteAcademicoCadete"("id_cadete", "gestion");
CREATE INDEX "AntecedenteAcademicoCadete_gestion_idx" ON "AntecedenteAcademicoCadete"("gestion");
CREATE UNIQUE INDEX "MatrizAcademica_id_periodo_id_curso_tipo_key" ON "MatrizAcademica"("id_periodo", "id_curso", "tipo");
CREATE INDEX "MatrizAcademica_estado_nivel_revision_actual_idx" ON "MatrizAcademica"("estado", "nivel_revision_actual");
CREATE INDEX "MatrizAcademica_id_curso_tipo_fecha_publicacion_idx" ON "MatrizAcademica"("id_curso", "tipo", "fecha_publicacion");
CREATE UNIQUE INDEX "DetalleMatrizAcademica_id_matriz_id_cadete_key" ON "DetalleMatrizAcademica"("id_matriz", "id_cadete");
CREATE UNIQUE INDEX "DetalleMatrizAcademica_id_matriz_orden_merito_key" ON "DetalleMatrizAcademica"("id_matriz", "orden_merito");
CREATE INDEX "DetalleMatrizAcademica_id_cadete_idx" ON "DetalleMatrizAcademica"("id_cadete");

ALTER TABLE "AntecedenteAcademicoCadete" ADD CONSTRAINT "AntecedenteAcademicoCadete_id_cadete_fkey" FOREIGN KEY ("id_cadete") REFERENCES "Cadete"("id_cadete") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AntecedenteAcademicoCadete" ADD CONSTRAINT "AntecedenteAcademicoCadete_id_registrador_fkey" FOREIGN KEY ("id_registrador") REFERENCES "Usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MatrizAcademica" ADD CONSTRAINT "MatrizAcademica_id_periodo_fkey" FOREIGN KEY ("id_periodo") REFERENCES "PeriodoLectivo"("id_periodo") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MatrizAcademica" ADD CONSTRAINT "MatrizAcademica_id_curso_fkey" FOREIGN KEY ("id_curso") REFERENCES "Curso"("id_curso") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MatrizAcademica" ADD CONSTRAINT "MatrizAcademica_id_creador_fkey" FOREIGN KEY ("id_creador") REFERENCES "Usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DetalleMatrizAcademica" ADD CONSTRAINT "DetalleMatrizAcademica_id_matriz_fkey" FOREIGN KEY ("id_matriz") REFERENCES "MatrizAcademica"("id_matriz") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DetalleMatrizAcademica" ADD CONSTRAINT "DetalleMatrizAcademica_id_cadete_fkey" FOREIGN KEY ("id_cadete") REFERENCES "Cadete"("id_cadete") ON DELETE RESTRICT ON UPDATE CASCADE;
