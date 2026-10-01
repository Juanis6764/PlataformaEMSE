CREATE TYPE "EstadoSemanaDisciplina" AS ENUM (
  'BORRADOR', 'ENVIADO', 'OBSERVADO', 'APROBADO_DISCIPLINA',
  'ENVIADO_SECCION_ACADEMICA', 'APROBADO_SECCION_ACADEMICA', 'PUBLICADO'
);
CREATE TYPE "AccionSemanaDisciplina" AS ENUM (
  'CREADO', 'ENVIADO', 'OBSERVADO', 'APROBADO_DISCIPLINA',
  'ENVIADO_SECCION_ACADEMICA', 'APROBADO_SECCION_ACADEMICA', 'PUBLICADO'
);

CREATE TABLE "SemanaReporteDisciplina" (
  "id_semana" SERIAL PRIMARY KEY,
  "id_reporte" INTEGER NOT NULL,
  "semana" INTEGER NOT NULL,
  "estado" "EstadoSemanaDisciplina" NOT NULL DEFAULT 'BORRADOR',
  "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "fecha_actualizacion" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX "SemanaReporteDisciplina_id_reporte_semana_key"
  ON "SemanaReporteDisciplina"("id_reporte", "semana");
CREATE INDEX "SemanaReporteDisciplina_estado_idx" ON "SemanaReporteDisciplina"("estado");

CREATE TABLE "MovimientoSemanaDisciplina" (
  "id_movimiento" SERIAL PRIMARY KEY,
  "id_semana" INTEGER NOT NULL,
  "id_usuario" INTEGER NOT NULL,
  "accion" "AccionSemanaDisciplina" NOT NULL,
  "estado_anterior" "EstadoSemanaDisciplina",
  "estado_nuevo" "EstadoSemanaDisciplina" NOT NULL,
  "observacion" TEXT,
  "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "MovimientoSemanaDisciplina_id_semana_fecha_idx"
  ON "MovimientoSemanaDisciplina"("id_semana", "fecha");

ALTER TABLE "SemanaReporteDisciplina" ADD CONSTRAINT "SemanaReporteDisciplina_id_reporte_fkey"
  FOREIGN KEY ("id_reporte") REFERENCES "ReporteDisciplina"("id_reporte") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MovimientoSemanaDisciplina" ADD CONSTRAINT "MovimientoSemanaDisciplina_id_semana_fkey"
  FOREIGN KEY ("id_semana") REFERENCES "SemanaReporteDisciplina"("id_semana") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MovimientoSemanaDisciplina" ADD CONSTRAINT "MovimientoSemanaDisciplina_id_usuario_fkey"
  FOREIGN KEY ("id_usuario") REFERENCES "Usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;
