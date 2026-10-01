ALTER TABLE "ConsolidadoAnualEntrenamientoFisico" DROP CONSTRAINT IF EXISTS "ConsolidadoAnualEntrenamientoFisico_ponderacion_check";
ALTER TABLE "ConsolidadoAnualEntrenamientoFisico" DROP CONSTRAINT IF EXISTS "ConsolidadoAnualEntrenamientoFisico_matrices_distintas_check";
ALTER TABLE "ResultadoComponenteEntrenamientoFisico" DROP CONSTRAINT IF EXISTS "ResultadoComponenteEntrenamientoFisico_nota_check";
ALTER TABLE "ComponenteEntrenamientoFisico" DROP CONSTRAINT IF EXISTS "ComponenteEntrenamientoFisico_ponderacion_check";
ALTER TABLE "MatrizEntrenamientoFisico" DROP CONSTRAINT IF EXISTS "MatrizEntrenamientoFisico_periodo_check";
ALTER TABLE "PlanillaEntrenamientoFisico" DROP CONSTRAINT IF EXISTS "PlanillaEntrenamientoFisico_periodo_check";
ALTER TABLE "ConfiguracionEntrenamientoFisico" DROP CONSTRAINT IF EXISTS "ConfiguracionEntrenamientoFisico_periodo_check";

DROP TABLE IF EXISTS "MovimientoConsolidadoEntrenamientoFisico";
DROP TABLE IF EXISTS "DetalleConsolidadoEntrenamientoFisico";
DROP TABLE IF EXISTS "ConsolidadoAnualEntrenamientoFisico";
DROP TABLE IF EXISTS "BaremoEntrenamientoFisico";

DROP INDEX IF EXISTS "ResultadoComponenteEntrenamientoFisico_tipo_evaluacion_idx";
DROP INDEX IF EXISTS "ResultadoComponenteEntrenamientoFisico_id_detalle_id_compon_key";
CREATE UNIQUE INDEX "ResultadoComponenteEntrenamientoFisico_id_detalle_id_compon_key"
  ON "ResultadoComponenteEntrenamientoFisico"("id_detalle", "id_componente");

ALTER TABLE "ResultadoComponenteEntrenamientoFisico"
  DROP COLUMN IF EXISTS "condicion_especial",
  DROP COLUMN IF EXISTS "medida_original",
  DROP COLUMN IF EXISTS "nota",
  DROP COLUMN IF EXISTS "observacion",
  DROP COLUMN IF EXISTS "ponderado",
  DROP COLUMN IF EXISTS "reprogramado",
  DROP COLUMN IF EXISTS "tipo_evaluacion";

ALTER TABLE "DetallePlanillaEntrenamientoFisico"
  DROP COLUMN IF EXISTS "atributo",
  DROP COLUMN IF EXISTS "condicion",
  DROP COLUMN IF EXISTS "resultado_formativa",
  DROP COLUMN IF EXISTS "resultado_sumativa";
ALTER TABLE "DetallePlanillaEntrenamientoFisico"
  ALTER COLUMN "resultado_final" TYPE DECIMAL(7,3);
ALTER TABLE "DetalleMatrizEntrenamientoFisico"
  ALTER COLUMN "resultado_final" TYPE DECIMAL(7,3);

DROP TYPE IF EXISTS "EstadoConsolidadoEntrenamientoFisico";
DROP TYPE IF EXISTS "TipoEvaluacionFisica";
