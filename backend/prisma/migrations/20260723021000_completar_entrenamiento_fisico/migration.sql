-- CreateEnum
CREATE TYPE "TipoEvaluacionFisica" AS ENUM ('FORMATIVA', 'SUMATIVA');

-- CreateEnum
CREATE TYPE "EstadoConsolidadoEntrenamientoFisico" AS ENUM ('EN_PREPARACION', 'GENERADO', 'LISTO_PARA_EVALUACIONES', 'ENVIADO_A_EVALUACIONES', 'RECIBIDO_POR_EVALUACIONES', 'CERRADO');

-- DropIndex
DROP INDEX "ResultadoComponenteEntrenamientoFisico_id_detalle_id_compon_key";

-- AlterTable
ALTER TABLE "DetallePlanillaEntrenamientoFisico" ADD COLUMN     "atributo" TEXT,
ADD COLUMN     "condicion" TEXT,
ADD COLUMN     "resultado_formativa" DECIMAL(7,4),
ADD COLUMN     "resultado_sumativa" DECIMAL(7,4);
ALTER TABLE "DetallePlanillaEntrenamientoFisico"
  ALTER COLUMN "resultado_final" TYPE DECIMAL(7,4);
ALTER TABLE "DetalleMatrizEntrenamientoFisico"
  ALTER COLUMN "resultado_final" TYPE DECIMAL(7,4);

-- AlterTable
ALTER TABLE "ResultadoComponenteEntrenamientoFisico" ADD COLUMN     "condicion_especial" TEXT,
ADD COLUMN     "medida_original" TEXT,
ADD COLUMN     "nota" DECIMAL(7,4),
ADD COLUMN     "observacion" TEXT,
ADD COLUMN     "ponderado" DECIMAL(7,4),
ADD COLUMN     "reprogramado" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "tipo_evaluacion" "TipoEvaluacionFisica" NOT NULL DEFAULT 'FORMATIVA';

-- CreateTable
CREATE TABLE "BaremoEntrenamientoFisico" (
    "id_baremo" SERIAL NOT NULL,
    "id_configuracion" INTEGER NOT NULL,
    "id_componente" INTEGER NOT NULL,
    "orden_curso" INTEGER NOT NULL,
    "genero" TEXT NOT NULL,
    "tipo_evaluacion" "TipoEvaluacionFisica",
    "medida_desde" DECIMAL(12,4),
    "medida_hasta" DECIMAL(12,4),
    "nota" DECIMAL(7,4) NOT NULL,
    "unidad" TEXT NOT NULL,
    "regla" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BaremoEntrenamientoFisico_pkey" PRIMARY KEY ("id_baremo")
);

-- CreateTable
CREATE TABLE "ConsolidadoAnualEntrenamientoFisico" (
    "id_consolidado" SERIAL NOT NULL,
    "id_gestion" INTEGER NOT NULL,
    "id_matriz_i" INTEGER NOT NULL,
    "id_matriz_ii" INTEGER NOT NULL,
    "id_creador" INTEGER NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "vigente" BOOLEAN NOT NULL DEFAULT true,
    "ponderacion_i" DECIMAL(7,4) NOT NULL DEFAULT 50,
    "ponderacion_ii" DECIMAL(7,4) NOT NULL DEFAULT 50,
    "estado" "EstadoConsolidadoEntrenamientoFisico" NOT NULL DEFAULT 'EN_PREPARACION',
    "codigo" TEXT NOT NULL,
    "fecha_generacion" TIMESTAMP(3),
    "fecha_aprobacion" TIMESTAMP(3),
    "fecha_envio" TIMESTAMP(3),
    "fecha_recepcion" TIMESTAMP(3),
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_actualizacion" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConsolidadoAnualEntrenamientoFisico_pkey" PRIMARY KEY ("id_consolidado")
);

-- CreateTable
CREATE TABLE "DetalleConsolidadoEntrenamientoFisico" (
    "id_detalle_consolidado" SERIAL NOT NULL,
    "id_consolidado" INTEGER NOT NULL,
    "id_cadete" INTEGER NOT NULL,
    "id_curso" INTEGER NOT NULL,
    "nota_i" DECIMAL(7,4) NOT NULL,
    "nota_ii" DECIMAL(7,4) NOT NULL,
    "nota_anual" DECIMAL(7,4) NOT NULL,
    "atributo" TEXT NOT NULL,
    "condicion" TEXT NOT NULL,

    CONSTRAINT "DetalleConsolidadoEntrenamientoFisico_pkey" PRIMARY KEY ("id_detalle_consolidado")
);

-- CreateTable
CREATE TABLE "MovimientoConsolidadoEntrenamientoFisico" (
    "id_movimiento" SERIAL NOT NULL,
    "id_consolidado" INTEGER NOT NULL,
    "id_usuario" INTEGER NOT NULL,
    "accion" TEXT NOT NULL,
    "estado_anterior" "EstadoConsolidadoEntrenamientoFisico",
    "estado_nuevo" "EstadoConsolidadoEntrenamientoFisico" NOT NULL,
    "funcion" TEXT NOT NULL,
    "observacion" TEXT,
    "ip" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MovimientoConsolidadoEntrenamientoFisico_pkey" PRIMARY KEY ("id_movimiento")
);

-- CreateIndex
CREATE INDEX "BaremoEntrenamientoFisico_id_configuracion_id_componente_or_idx" ON "BaremoEntrenamientoFisico"("id_configuracion", "id_componente", "orden_curso", "genero", "activo");

-- CreateIndex
CREATE UNIQUE INDEX "ConsolidadoAnualEntrenamientoFisico_codigo_key" ON "ConsolidadoAnualEntrenamientoFisico"("codigo");

-- CreateIndex
CREATE INDEX "ConsolidadoAnualEntrenamientoFisico_id_gestion_vigente_esta_idx" ON "ConsolidadoAnualEntrenamientoFisico"("id_gestion", "vigente", "estado");

-- CreateIndex
CREATE UNIQUE INDEX "ConsolidadoAnualEntrenamientoFisico_id_gestion_version_key" ON "ConsolidadoAnualEntrenamientoFisico"("id_gestion", "version");

-- CreateIndex
CREATE INDEX "DetalleConsolidadoEntrenamientoFisico_id_curso_idx" ON "DetalleConsolidadoEntrenamientoFisico"("id_curso");

-- CreateIndex
CREATE UNIQUE INDEX "DetalleConsolidadoEntrenamientoFisico_id_consolidado_id_cad_key" ON "DetalleConsolidadoEntrenamientoFisico"("id_consolidado", "id_cadete");

-- CreateIndex
CREATE INDEX "MovimientoConsolidadoEntrenamientoFisico_id_consolidado_fec_idx" ON "MovimientoConsolidadoEntrenamientoFisico"("id_consolidado", "fecha");

-- CreateIndex
CREATE INDEX "ResultadoComponenteEntrenamientoFisico_tipo_evaluacion_idx" ON "ResultadoComponenteEntrenamientoFisico"("tipo_evaluacion");

-- CreateIndex
CREATE UNIQUE INDEX "ResultadoComponenteEntrenamientoFisico_id_detalle_id_compon_key" ON "ResultadoComponenteEntrenamientoFisico"("id_detalle", "id_componente", "tipo_evaluacion");

-- AddForeignKey
ALTER TABLE "BaremoEntrenamientoFisico" ADD CONSTRAINT "BaremoEntrenamientoFisico_id_configuracion_fkey" FOREIGN KEY ("id_configuracion") REFERENCES "ConfiguracionEntrenamientoFisico"("id_configuracion") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BaremoEntrenamientoFisico" ADD CONSTRAINT "BaremoEntrenamientoFisico_id_componente_fkey" FOREIGN KEY ("id_componente") REFERENCES "ComponenteEntrenamientoFisico"("id_componente") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsolidadoAnualEntrenamientoFisico" ADD CONSTRAINT "ConsolidadoAnualEntrenamientoFisico_id_gestion_fkey" FOREIGN KEY ("id_gestion") REFERENCES "GestionAcademica"("id_gestion") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsolidadoAnualEntrenamientoFisico" ADD CONSTRAINT "ConsolidadoAnualEntrenamientoFisico_id_matriz_i_fkey" FOREIGN KEY ("id_matriz_i") REFERENCES "MatrizEntrenamientoFisico"("id_matriz") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsolidadoAnualEntrenamientoFisico" ADD CONSTRAINT "ConsolidadoAnualEntrenamientoFisico_id_matriz_ii_fkey" FOREIGN KEY ("id_matriz_ii") REFERENCES "MatrizEntrenamientoFisico"("id_matriz") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsolidadoAnualEntrenamientoFisico" ADD CONSTRAINT "ConsolidadoAnualEntrenamientoFisico_id_creador_fkey" FOREIGN KEY ("id_creador") REFERENCES "Usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetalleConsolidadoEntrenamientoFisico" ADD CONSTRAINT "DetalleConsolidadoEntrenamientoFisico_id_consolidado_fkey" FOREIGN KEY ("id_consolidado") REFERENCES "ConsolidadoAnualEntrenamientoFisico"("id_consolidado") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetalleConsolidadoEntrenamientoFisico" ADD CONSTRAINT "DetalleConsolidadoEntrenamientoFisico_id_cadete_fkey" FOREIGN KEY ("id_cadete") REFERENCES "Cadete"("id_cadete") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetalleConsolidadoEntrenamientoFisico" ADD CONSTRAINT "DetalleConsolidadoEntrenamientoFisico_id_curso_fkey" FOREIGN KEY ("id_curso") REFERENCES "Curso"("id_curso") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoConsolidadoEntrenamientoFisico" ADD CONSTRAINT "MovimientoConsolidadoEntrenamientoFisico_id_consolidado_fkey" FOREIGN KEY ("id_consolidado") REFERENCES "ConsolidadoAnualEntrenamientoFisico"("id_consolidado") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoConsolidadoEntrenamientoFisico" ADD CONSTRAINT "MovimientoConsolidadoEntrenamientoFisico_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "Usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Restricciones institucionales y de consistencia.
ALTER TABLE "ConfiguracionEntrenamientoFisico"
  ADD CONSTRAINT "ConfiguracionEntrenamientoFisico_periodo_check" CHECK ("semestre" IN (1, 2));
ALTER TABLE "PlanillaEntrenamientoFisico"
  ADD CONSTRAINT "PlanillaEntrenamientoFisico_periodo_check" CHECK ("semestre" IN (1, 2));
ALTER TABLE "MatrizEntrenamientoFisico"
  ADD CONSTRAINT "MatrizEntrenamientoFisico_periodo_check" CHECK ("semestre" IN (1, 2));
ALTER TABLE "ComponenteEntrenamientoFisico"
  ADD CONSTRAINT "ComponenteEntrenamientoFisico_ponderacion_check"
  CHECK ("ponderacion" IS NULL OR ("ponderacion" > 0 AND "ponderacion" <= 100));
ALTER TABLE "ResultadoComponenteEntrenamientoFisico"
  ADD CONSTRAINT "ResultadoComponenteEntrenamientoFisico_nota_check"
  CHECK ("nota" IS NULL OR ("nota" >= 0 AND "nota" <= 100));
ALTER TABLE "ConsolidadoAnualEntrenamientoFisico"
  ADD CONSTRAINT "ConsolidadoAnualEntrenamientoFisico_matrices_distintas_check"
  CHECK ("id_matriz_i" <> "id_matriz_ii"),
  ADD CONSTRAINT "ConsolidadoAnualEntrenamientoFisico_ponderacion_check"
  CHECK ("ponderacion_i" + "ponderacion_ii" = 100);
