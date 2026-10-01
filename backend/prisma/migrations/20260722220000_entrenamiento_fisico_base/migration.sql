-- CreateEnum
CREATE TYPE "EstadoPlanillaEntrenamientoFisico" AS ENUM ('BORRADOR', 'ENVIADA_A_ENCARGADO', 'OBSERVADA_POR_ENCARGADO', 'APROBADA_POR_ENCARGADO', 'INCLUIDA_EN_MATRIZ_AREA', 'CERRADA');

-- CreateEnum
CREATE TYPE "EstadoMatrizEntrenamientoFisico" AS ENUM ('EN_PREPARACION', 'GENERADA', 'ENVIADA_A_SECCION_ACADEMICA', 'OBSERVADA_POR_SECCION_ACADEMICA', 'APROBADA_POR_SECCION_ACADEMICA', 'ENVIADA_A_EVALUACIONES', 'RECIBIDA_POR_EVALUACIONES', 'CERRADA');

-- CreateEnum
CREATE TYPE "TipoValorComponenteFisico" AS ENUM ('NUMERICO', 'TEXTO');

-- CreateTable
CREATE TABLE "ConfiguracionEntrenamientoFisico" (
    "id_configuracion" SERIAL NOT NULL,
    "id_gestion" INTEGER NOT NULL,
    "semestre" INTEGER NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "id_creador" INTEGER NOT NULL,
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_actualizacion" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConfiguracionEntrenamientoFisico_pkey" PRIMARY KEY ("id_configuracion")
);

-- CreateTable
CREATE TABLE "ComponenteEntrenamientoFisico" (
    "id_componente" SERIAL NOT NULL,
    "id_configuracion" INTEGER NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo_valor" "TipoValorComponenteFisico" NOT NULL,
    "requerido" BOOLEAN NOT NULL DEFAULT true,
    "orden" INTEGER NOT NULL,
    "ponderacion" DECIMAL(7,4),
    "es_resultado_final" BOOLEAN NOT NULL DEFAULT false,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ComponenteEntrenamientoFisico_pkey" PRIMARY KEY ("id_componente")
);

-- CreateTable
CREATE TABLE "PlanillaEntrenamientoFisico" (
    "id_planilla" SERIAL NOT NULL,
    "id_configuracion" INTEGER NOT NULL,
    "id_gestion" INTEGER NOT NULL,
    "semestre" INTEGER NOT NULL,
    "id_curso" INTEGER NOT NULL,
    "id_operador" INTEGER NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "vigente" BOOLEAN NOT NULL DEFAULT true,
    "estado" "EstadoPlanillaEntrenamientoFisico" NOT NULL DEFAULT 'BORRADOR',
    "fecha_envio" TIMESTAMP(3),
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_actualizacion" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanillaEntrenamientoFisico_pkey" PRIMARY KEY ("id_planilla")
);

-- CreateTable
CREATE TABLE "DetallePlanillaEntrenamientoFisico" (
    "id_detalle" SERIAL NOT NULL,
    "id_planilla" INTEGER NOT NULL,
    "id_cadete" INTEGER NOT NULL,
    "id_historial" INTEGER NOT NULL,
    "resultado_final" DECIMAL(7,3),
    "completo" BOOLEAN NOT NULL DEFAULT false,
    "fecha_actualizacion" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DetallePlanillaEntrenamientoFisico_pkey" PRIMARY KEY ("id_detalle")
);

-- CreateTable
CREATE TABLE "ResultadoComponenteEntrenamientoFisico" (
    "id_resultado" SERIAL NOT NULL,
    "id_detalle" INTEGER NOT NULL,
    "id_componente" INTEGER NOT NULL,
    "valor_numerico" DECIMAL(10,4),
    "valor_texto" TEXT,
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_actualizacion" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResultadoComponenteEntrenamientoFisico_pkey" PRIMARY KEY ("id_resultado")
);

-- CreateTable
CREATE TABLE "MovimientoPlanillaEntrenamientoFisico" (
    "id_movimiento" SERIAL NOT NULL,
    "id_planilla" INTEGER NOT NULL,
    "id_usuario" INTEGER NOT NULL,
    "accion" TEXT NOT NULL,
    "estado_anterior" "EstadoPlanillaEntrenamientoFisico",
    "estado_nuevo" "EstadoPlanillaEntrenamientoFisico" NOT NULL,
    "funcion" TEXT NOT NULL,
    "observacion" TEXT,
    "ip" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MovimientoPlanillaEntrenamientoFisico_pkey" PRIMARY KEY ("id_movimiento")
);

-- CreateTable
CREATE TABLE "MatrizEntrenamientoFisico" (
    "id_matriz" SERIAL NOT NULL,
    "id_gestion" INTEGER NOT NULL,
    "semestre" INTEGER NOT NULL,
    "id_creador" INTEGER NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "vigente" BOOLEAN NOT NULL DEFAULT true,
    "estado" "EstadoMatrizEntrenamientoFisico" NOT NULL DEFAULT 'EN_PREPARACION',
    "codigo" TEXT NOT NULL,
    "fecha_generacion" TIMESTAMP(3),
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_actualizacion" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MatrizEntrenamientoFisico_pkey" PRIMARY KEY ("id_matriz")
);

-- CreateTable
CREATE TABLE "PlanillaMatrizEntrenamientoFisico" (
    "id_vinculo" SERIAL NOT NULL,
    "id_matriz" INTEGER NOT NULL,
    "id_planilla" INTEGER NOT NULL,

    CONSTRAINT "PlanillaMatrizEntrenamientoFisico_pkey" PRIMARY KEY ("id_vinculo")
);

-- CreateTable
CREATE TABLE "DetalleMatrizEntrenamientoFisico" (
    "id_detalle_matriz" SERIAL NOT NULL,
    "id_matriz" INTEGER NOT NULL,
    "id_detalle_planilla" INTEGER NOT NULL,
    "id_cadete" INTEGER NOT NULL,
    "id_curso" INTEGER NOT NULL,
    "resultado_final" DECIMAL(7,3) NOT NULL,

    CONSTRAINT "DetalleMatrizEntrenamientoFisico_pkey" PRIMARY KEY ("id_detalle_matriz")
);

-- CreateTable
CREATE TABLE "MovimientoMatrizEntrenamientoFisico" (
    "id_movimiento" SERIAL NOT NULL,
    "id_matriz" INTEGER NOT NULL,
    "id_usuario" INTEGER NOT NULL,
    "accion" TEXT NOT NULL,
    "estado_anterior" "EstadoMatrizEntrenamientoFisico",
    "estado_nuevo" "EstadoMatrizEntrenamientoFisico" NOT NULL,
    "funcion" TEXT NOT NULL,
    "observacion" TEXT,
    "ip" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MovimientoMatrizEntrenamientoFisico_pkey" PRIMARY KEY ("id_movimiento")
);

-- CreateTable
CREATE TABLE "FirmanteReporte" (
    "id_firmante" SERIAL NOT NULL,
    "id_gestion" INTEGER NOT NULL,
    "tipo_reporte" TEXT NOT NULL,
    "orden" INTEGER NOT NULL,
    "grado" TEXT,
    "nombre" TEXT,
    "cargo" TEXT NOT NULL,
    "linea_adicional" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "id_creador" INTEGER NOT NULL,
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_actualizacion" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FirmanteReporte_pkey" PRIMARY KEY ("id_firmante")
);

-- CreateIndex
CREATE INDEX "ConfiguracionEntrenamientoFisico_activo_idx" ON "ConfiguracionEntrenamientoFisico"("activo");

-- CreateIndex
CREATE UNIQUE INDEX "ConfiguracionEntrenamientoFisico_id_gestion_semestre_key" ON "ConfiguracionEntrenamientoFisico"("id_gestion", "semestre");

-- CreateIndex
CREATE UNIQUE INDEX "ComponenteEntrenamientoFisico_id_configuracion_codigo_key" ON "ComponenteEntrenamientoFisico"("id_configuracion", "codigo");

-- CreateIndex
CREATE UNIQUE INDEX "ComponenteEntrenamientoFisico_id_configuracion_orden_key" ON "ComponenteEntrenamientoFisico"("id_configuracion", "orden");
CREATE UNIQUE INDEX "ComponenteEntrenamientoFisico_resultado_final_key"
ON "ComponenteEntrenamientoFisico"("id_configuracion")
WHERE "es_resultado_final" = true AND "activo" = true;

-- CreateIndex
CREATE INDEX "PlanillaEntrenamientoFisico_id_operador_vigente_idx" ON "PlanillaEntrenamientoFisico"("id_operador", "vigente");

-- CreateIndex
CREATE INDEX "PlanillaEntrenamientoFisico_estado_idx" ON "PlanillaEntrenamientoFisico"("estado");

-- CreateIndex
CREATE UNIQUE INDEX "PlanillaEntrenamientoFisico_id_gestion_semestre_id_curso_ve_key" ON "PlanillaEntrenamientoFisico"("id_gestion", "semestre", "id_curso", "version");

-- Garantiza una sola planilla vigente por gestión, semestre y curso.
CREATE UNIQUE INDEX "PlanillaEntrenamientoFisico_periodo_vigente_key"
ON "PlanillaEntrenamientoFisico"("id_gestion", "semestre", "id_curso")
WHERE "vigente" = true;

-- CreateIndex
CREATE UNIQUE INDEX "DetallePlanillaEntrenamientoFisico_id_planilla_id_cadete_key" ON "DetallePlanillaEntrenamientoFisico"("id_planilla", "id_cadete");

-- CreateIndex
CREATE UNIQUE INDEX "DetallePlanillaEntrenamientoFisico_id_planilla_id_historial_key" ON "DetallePlanillaEntrenamientoFisico"("id_planilla", "id_historial");

-- CreateIndex
CREATE UNIQUE INDEX "ResultadoComponenteEntrenamientoFisico_id_detalle_id_compon_key" ON "ResultadoComponenteEntrenamientoFisico"("id_detalle", "id_componente");

-- CreateIndex
CREATE INDEX "MovimientoPlanillaEntrenamientoFisico_id_planilla_fecha_idx" ON "MovimientoPlanillaEntrenamientoFisico"("id_planilla", "fecha");

-- CreateIndex
CREATE UNIQUE INDEX "MatrizEntrenamientoFisico_codigo_key" ON "MatrizEntrenamientoFisico"("codigo");

-- CreateIndex
CREATE INDEX "MatrizEntrenamientoFisico_estado_vigente_idx" ON "MatrizEntrenamientoFisico"("estado", "vigente");

-- CreateIndex
CREATE UNIQUE INDEX "MatrizEntrenamientoFisico_id_gestion_semestre_version_key" ON "MatrizEntrenamientoFisico"("id_gestion", "semestre", "version");

-- Garantiza una sola matriz de área vigente por gestión y semestre.
CREATE UNIQUE INDEX "MatrizEntrenamientoFisico_periodo_vigente_key"
ON "MatrizEntrenamientoFisico"("id_gestion", "semestre")
WHERE "vigente" = true;

-- CreateIndex
CREATE UNIQUE INDEX "PlanillaMatrizEntrenamientoFisico_id_matriz_id_planilla_key" ON "PlanillaMatrizEntrenamientoFisico"("id_matriz", "id_planilla");

-- CreateIndex
CREATE UNIQUE INDEX "PlanillaMatrizEntrenamientoFisico_id_planilla_key" ON "PlanillaMatrizEntrenamientoFisico"("id_planilla");

-- CreateIndex
CREATE UNIQUE INDEX "DetalleMatrizEntrenamientoFisico_id_detalle_planilla_key" ON "DetalleMatrizEntrenamientoFisico"("id_detalle_planilla");

-- CreateIndex
CREATE INDEX "DetalleMatrizEntrenamientoFisico_id_curso_idx" ON "DetalleMatrizEntrenamientoFisico"("id_curso");

-- CreateIndex
CREATE UNIQUE INDEX "DetalleMatrizEntrenamientoFisico_id_matriz_id_cadete_key" ON "DetalleMatrizEntrenamientoFisico"("id_matriz", "id_cadete");

-- CreateIndex
CREATE INDEX "MovimientoMatrizEntrenamientoFisico_id_matriz_fecha_idx" ON "MovimientoMatrizEntrenamientoFisico"("id_matriz", "fecha");

-- CreateIndex
CREATE INDEX "FirmanteReporte_tipo_reporte_activo_idx" ON "FirmanteReporte"("tipo_reporte", "activo");

-- CreateIndex
CREATE UNIQUE INDEX "FirmanteReporte_id_gestion_tipo_reporte_orden_key" ON "FirmanteReporte"("id_gestion", "tipo_reporte", "orden");

-- AddForeignKey
ALTER TABLE "ConfiguracionEntrenamientoFisico" ADD CONSTRAINT "ConfiguracionEntrenamientoFisico_id_gestion_fkey" FOREIGN KEY ("id_gestion") REFERENCES "GestionAcademica"("id_gestion") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConfiguracionEntrenamientoFisico" ADD CONSTRAINT "ConfiguracionEntrenamientoFisico_id_creador_fkey" FOREIGN KEY ("id_creador") REFERENCES "Usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComponenteEntrenamientoFisico" ADD CONSTRAINT "ComponenteEntrenamientoFisico_id_configuracion_fkey" FOREIGN KEY ("id_configuracion") REFERENCES "ConfiguracionEntrenamientoFisico"("id_configuracion") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanillaEntrenamientoFisico" ADD CONSTRAINT "PlanillaEntrenamientoFisico_id_configuracion_fkey" FOREIGN KEY ("id_configuracion") REFERENCES "ConfiguracionEntrenamientoFisico"("id_configuracion") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanillaEntrenamientoFisico" ADD CONSTRAINT "PlanillaEntrenamientoFisico_id_gestion_fkey" FOREIGN KEY ("id_gestion") REFERENCES "GestionAcademica"("id_gestion") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanillaEntrenamientoFisico" ADD CONSTRAINT "PlanillaEntrenamientoFisico_id_curso_fkey" FOREIGN KEY ("id_curso") REFERENCES "Curso"("id_curso") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanillaEntrenamientoFisico" ADD CONSTRAINT "PlanillaEntrenamientoFisico_id_operador_fkey" FOREIGN KEY ("id_operador") REFERENCES "Usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetallePlanillaEntrenamientoFisico" ADD CONSTRAINT "DetallePlanillaEntrenamientoFisico_id_planilla_fkey" FOREIGN KEY ("id_planilla") REFERENCES "PlanillaEntrenamientoFisico"("id_planilla") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetallePlanillaEntrenamientoFisico" ADD CONSTRAINT "DetallePlanillaEntrenamientoFisico_id_cadete_fkey" FOREIGN KEY ("id_cadete") REFERENCES "Cadete"("id_cadete") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetallePlanillaEntrenamientoFisico" ADD CONSTRAINT "DetallePlanillaEntrenamientoFisico_id_historial_fkey" FOREIGN KEY ("id_historial") REFERENCES "HistorialCursoCadete"("id_historial") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResultadoComponenteEntrenamientoFisico" ADD CONSTRAINT "ResultadoComponenteEntrenamientoFisico_id_detalle_fkey" FOREIGN KEY ("id_detalle") REFERENCES "DetallePlanillaEntrenamientoFisico"("id_detalle") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResultadoComponenteEntrenamientoFisico" ADD CONSTRAINT "ResultadoComponenteEntrenamientoFisico_id_componente_fkey" FOREIGN KEY ("id_componente") REFERENCES "ComponenteEntrenamientoFisico"("id_componente") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoPlanillaEntrenamientoFisico" ADD CONSTRAINT "MovimientoPlanillaEntrenamientoFisico_id_planilla_fkey" FOREIGN KEY ("id_planilla") REFERENCES "PlanillaEntrenamientoFisico"("id_planilla") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoPlanillaEntrenamientoFisico" ADD CONSTRAINT "MovimientoPlanillaEntrenamientoFisico_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "Usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatrizEntrenamientoFisico" ADD CONSTRAINT "MatrizEntrenamientoFisico_id_gestion_fkey" FOREIGN KEY ("id_gestion") REFERENCES "GestionAcademica"("id_gestion") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatrizEntrenamientoFisico" ADD CONSTRAINT "MatrizEntrenamientoFisico_id_creador_fkey" FOREIGN KEY ("id_creador") REFERENCES "Usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanillaMatrizEntrenamientoFisico" ADD CONSTRAINT "PlanillaMatrizEntrenamientoFisico_id_matriz_fkey" FOREIGN KEY ("id_matriz") REFERENCES "MatrizEntrenamientoFisico"("id_matriz") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanillaMatrizEntrenamientoFisico" ADD CONSTRAINT "PlanillaMatrizEntrenamientoFisico_id_planilla_fkey" FOREIGN KEY ("id_planilla") REFERENCES "PlanillaEntrenamientoFisico"("id_planilla") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetalleMatrizEntrenamientoFisico" ADD CONSTRAINT "DetalleMatrizEntrenamientoFisico_id_matriz_fkey" FOREIGN KEY ("id_matriz") REFERENCES "MatrizEntrenamientoFisico"("id_matriz") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetalleMatrizEntrenamientoFisico" ADD CONSTRAINT "DetalleMatrizEntrenamientoFisico_id_detalle_planilla_fkey" FOREIGN KEY ("id_detalle_planilla") REFERENCES "DetallePlanillaEntrenamientoFisico"("id_detalle") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetalleMatrizEntrenamientoFisico" ADD CONSTRAINT "DetalleMatrizEntrenamientoFisico_id_cadete_fkey" FOREIGN KEY ("id_cadete") REFERENCES "Cadete"("id_cadete") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetalleMatrizEntrenamientoFisico" ADD CONSTRAINT "DetalleMatrizEntrenamientoFisico_id_curso_fkey" FOREIGN KEY ("id_curso") REFERENCES "Curso"("id_curso") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoMatrizEntrenamientoFisico" ADD CONSTRAINT "MovimientoMatrizEntrenamientoFisico_id_matriz_fkey" FOREIGN KEY ("id_matriz") REFERENCES "MatrizEntrenamientoFisico"("id_matriz") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoMatrizEntrenamientoFisico" ADD CONSTRAINT "MovimientoMatrizEntrenamientoFisico_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "Usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FirmanteReporte" ADD CONSTRAINT "FirmanteReporte_id_gestion_fkey" FOREIGN KEY ("id_gestion") REFERENCES "GestionAcademica"("id_gestion") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FirmanteReporte" ADD CONSTRAINT "FirmanteReporte_id_creador_fkey" FOREIGN KEY ("id_creador") REFERENCES "Usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Reutiliza el permiso general ya existente para responsables de área.
INSERT INTO "RolPermiso" ("id_rol", "id_permiso")
SELECT r."id_rol", p."id_permiso"
FROM "Rol" r
CROSS JOIN "Permiso" p
WHERE r."nombre" = 'RESPONSABLE' AND p."nombre" = 'GENERAR_MATRIZ'
ON CONFLICT ("id_rol", "id_permiso") DO NOTHING;
