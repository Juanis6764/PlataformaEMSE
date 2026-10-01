CREATE TYPE "TipoRegistroDisciplina" AS ENUM ('MERITO', 'DEMERITO');
CREATE TYPE "EstadoReporteDisciplina" AS ENUM ('BORRADOR', 'ENVIADO_DISCIPLINA', 'DEVUELTO_DISCIPLINA', 'APROBADO_DISCIPLINA', 'ENVIADO_SECCION_ACADEMICA', 'DEVUELTO_SECCION_ACADEMICA', 'APROBADO_SECCION_ACADEMICA', 'ENVIADO_EVALUACIONES');
CREATE TYPE "AccionReporteDisciplina" AS ENUM ('CREADO', 'ENVIADO_DISCIPLINA', 'DEVUELTO_DISCIPLINA', 'APROBADO_DISCIPLINA', 'ENVIADO_SECCION_ACADEMICA', 'DEVUELTO_SECCION_ACADEMICA', 'APROBADO_SECCION_ACADEMICA', 'ENVIADO_EVALUACIONES');
CREATE TYPE "TipoNotificacionDisciplina" AS ENUM ('REPORTE_ENVIADO', 'REPORTE_DEVUELTO', 'REPORTE_APROBADO', 'REPORTE_ENVIADO_SECCION_ACADEMICA', 'REPORTE_APROBADO_SECCION_ACADEMICA', 'REPORTE_ENVIADO_EVALUACIONES');

CREATE TABLE "CatalogoDisciplina" (
  "id_catalogo" SERIAL PRIMARY KEY, "tipo" "TipoRegistroDisciplina" NOT NULL,
  "codigo" TEXT NOT NULL, "nombre" TEXT NOT NULL, "descripcion" TEXT,
  "activo" BOOLEAN NOT NULL DEFAULT true, "id_creador" INTEGER NOT NULL,
  "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "fecha_actualizacion" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX "CatalogoDisciplina_tipo_codigo_key" ON "CatalogoDisciplina"("tipo", "codigo");
CREATE INDEX "CatalogoDisciplina_tipo_activo_idx" ON "CatalogoDisciplina"("tipo", "activo");

CREATE TABLE "OficialDisciplina" (
  "id_oficial" SERIAL PRIMARY KEY, "codigo" TEXT NOT NULL UNIQUE,
  "nombre_completo" TEXT NOT NULL, "activo" BOOLEAN NOT NULL DEFAULT true,
  "id_creador" INTEGER NOT NULL, "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "fecha_actualizacion" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "ConfiguracionSemestreDisciplina" (
  "id_configuracion" SERIAL PRIMARY KEY, "id_gestion" INTEGER NOT NULL,
  "semestre" INTEGER NOT NULL, "cantidad_semanas" INTEGER NOT NULL,
  "activo" BOOLEAN NOT NULL DEFAULT true, "id_creador" INTEGER NOT NULL,
  "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "fecha_actualizacion" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ConfiguracionSemestreDisciplina_id_gestion_semestre_key" UNIQUE ("id_gestion", "semestre")
);

CREATE TABLE "RegistroDisciplina" (
  "id_registro" SERIAL PRIMARY KEY, "id_registro_raiz" INTEGER,
  "version" INTEGER NOT NULL DEFAULT 1, "vigente" BOOLEAN NOT NULL DEFAULT true,
  "id_cadete" INTEGER NOT NULL, "id_configuracion" INTEGER NOT NULL,
  "id_catalogo" INTEGER NOT NULL, "id_oficial" INTEGER NOT NULL,
  "id_operador" INTEGER NOT NULL, "tipo" "TipoRegistroDisciplina" NOT NULL,
  "codigo_catalogo" TEXT NOT NULL, "nombre_catalogo" TEXT NOT NULL,
  "codigo_oficial" TEXT NOT NULL, "nombre_oficial" TEXT NOT NULL,
  "fecha" TIMESTAMP(3) NOT NULL, "semana" INTEGER NOT NULL, "observacion" TEXT,
  "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RegistroDisciplina_id_registro_raiz_version_key" UNIQUE ("id_registro_raiz", "version")
);
CREATE INDEX "RegistroDisciplina_id_cadete_id_configuracion_vigente_idx" ON "RegistroDisciplina"("id_cadete", "id_configuracion", "vigente");
CREATE INDEX "RegistroDisciplina_id_operador_vigente_idx" ON "RegistroDisciplina"("id_operador", "vigente");

CREATE TABLE "ReporteDisciplina" (
  "id_reporte" SERIAL PRIMARY KEY, "id_gestion" INTEGER NOT NULL,
  "semestre" INTEGER NOT NULL, "id_curso" INTEGER NOT NULL, "id_creador" INTEGER NOT NULL,
  "estado" "EstadoReporteDisciplina" NOT NULL DEFAULT 'BORRADOR',
  "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "fecha_actualizacion" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ReporteDisciplina_id_gestion_semestre_id_curso_key" UNIQUE ("id_gestion", "semestre", "id_curso")
);
CREATE INDEX "ReporteDisciplina_estado_idx" ON "ReporteDisciplina"("estado");

CREATE TABLE "ReporteRegistroDisciplina" (
  "id_reporte_registro" SERIAL PRIMARY KEY, "id_reporte" INTEGER NOT NULL,
  "id_registro" INTEGER NOT NULL,
  CONSTRAINT "ReporteRegistroDisciplina_id_reporte_id_registro_key" UNIQUE ("id_reporte", "id_registro")
);

CREATE TABLE "MovimientoReporteDisciplina" (
  "id_movimiento" SERIAL PRIMARY KEY, "id_reporte" INTEGER NOT NULL,
  "id_usuario" INTEGER NOT NULL, "accion" "AccionReporteDisciplina" NOT NULL,
  "estado_anterior" "EstadoReporteDisciplina", "estado_nuevo" "EstadoReporteDisciplina" NOT NULL,
  "observacion" TEXT, "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "MovimientoReporteDisciplina_id_reporte_fecha_idx" ON "MovimientoReporteDisciplina"("id_reporte", "fecha");

CREATE TABLE "NotificacionDisciplina" (
  "id_notificacion" SERIAL PRIMARY KEY, "id_usuario" INTEGER NOT NULL,
  "id_reporte" INTEGER, "tipo" "TipoNotificacionDisciplina" NOT NULL,
  "titulo" TEXT NOT NULL, "mensaje" TEXT NOT NULL,
  "leida" BOOLEAN NOT NULL DEFAULT false,
  "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "fecha_lectura" TIMESTAMP(3)
);
CREATE INDEX "NotificacionDisciplina_id_usuario_leida_fecha_creacion_idx" ON "NotificacionDisciplina"("id_usuario", "leida", "fecha_creacion");

ALTER TABLE "CatalogoDisciplina" ADD CONSTRAINT "CatalogoDisciplina_id_creador_fkey" FOREIGN KEY ("id_creador") REFERENCES "Usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OficialDisciplina" ADD CONSTRAINT "OficialDisciplina_id_creador_fkey" FOREIGN KEY ("id_creador") REFERENCES "Usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ConfiguracionSemestreDisciplina" ADD CONSTRAINT "ConfiguracionSemestreDisciplina_id_gestion_fkey" FOREIGN KEY ("id_gestion") REFERENCES "GestionAcademica"("id_gestion") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ConfiguracionSemestreDisciplina" ADD CONSTRAINT "ConfiguracionSemestreDisciplina_id_creador_fkey" FOREIGN KEY ("id_creador") REFERENCES "Usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RegistroDisciplina" ADD CONSTRAINT "RegistroDisciplina_id_registro_raiz_fkey" FOREIGN KEY ("id_registro_raiz") REFERENCES "RegistroDisciplina"("id_registro") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RegistroDisciplina" ADD CONSTRAINT "RegistroDisciplina_id_cadete_fkey" FOREIGN KEY ("id_cadete") REFERENCES "Cadete"("id_cadete") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RegistroDisciplina" ADD CONSTRAINT "RegistroDisciplina_id_configuracion_fkey" FOREIGN KEY ("id_configuracion") REFERENCES "ConfiguracionSemestreDisciplina"("id_configuracion") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RegistroDisciplina" ADD CONSTRAINT "RegistroDisciplina_id_catalogo_fkey" FOREIGN KEY ("id_catalogo") REFERENCES "CatalogoDisciplina"("id_catalogo") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RegistroDisciplina" ADD CONSTRAINT "RegistroDisciplina_id_oficial_fkey" FOREIGN KEY ("id_oficial") REFERENCES "OficialDisciplina"("id_oficial") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RegistroDisciplina" ADD CONSTRAINT "RegistroDisciplina_id_operador_fkey" FOREIGN KEY ("id_operador") REFERENCES "Usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ReporteDisciplina" ADD CONSTRAINT "ReporteDisciplina_id_gestion_fkey" FOREIGN KEY ("id_gestion") REFERENCES "GestionAcademica"("id_gestion") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ReporteDisciplina" ADD CONSTRAINT "ReporteDisciplina_id_curso_fkey" FOREIGN KEY ("id_curso") REFERENCES "Curso"("id_curso") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ReporteDisciplina" ADD CONSTRAINT "ReporteDisciplina_id_creador_fkey" FOREIGN KEY ("id_creador") REFERENCES "Usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ReporteRegistroDisciplina" ADD CONSTRAINT "ReporteRegistroDisciplina_id_reporte_fkey" FOREIGN KEY ("id_reporte") REFERENCES "ReporteDisciplina"("id_reporte") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ReporteRegistroDisciplina" ADD CONSTRAINT "ReporteRegistroDisciplina_id_registro_fkey" FOREIGN KEY ("id_registro") REFERENCES "RegistroDisciplina"("id_registro") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MovimientoReporteDisciplina" ADD CONSTRAINT "MovimientoReporteDisciplina_id_reporte_fkey" FOREIGN KEY ("id_reporte") REFERENCES "ReporteDisciplina"("id_reporte") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MovimientoReporteDisciplina" ADD CONSTRAINT "MovimientoReporteDisciplina_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "Usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "NotificacionDisciplina" ADD CONSTRAINT "NotificacionDisciplina_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "Usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "NotificacionDisciplina" ADD CONSTRAINT "NotificacionDisciplina_id_reporte_fkey" FOREIGN KEY ("id_reporte") REFERENCES "ReporteDisciplina"("id_reporte") ON DELETE RESTRICT ON UPDATE CASCADE;
