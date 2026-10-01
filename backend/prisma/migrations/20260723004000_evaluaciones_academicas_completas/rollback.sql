-- Procedimiento de recuperación. Ejecutar únicamente después de restaurar o
-- verificar el respaldo previo. No se ejecuta automáticamente.
ALTER TABLE "HistorialCursoCadete"
  DROP CONSTRAINT IF EXISTS "HistorialCursoCadete_id_inscripcion_fkey",
  DROP CONSTRAINT IF EXISTS "HistorialCursoCadete_semestre_periodo_check",
  DROP COLUMN IF EXISTS "id_inscripcion",
  DROP COLUMN IF EXISTS "periodo";

DROP TABLE IF EXISTS "DetalleCierreGestion";
DROP TABLE IF EXISTS "CierreGestionAcademica";
DROP TABLE IF EXISTS "MovimientoMatrizEvaluacion";
DROP TABLE IF EXISTS "DetalleMatrizEvaluacion";
DROP TABLE IF EXISTS "MatrizEvaluacion";
DROP TABLE IF EXISTS "ConfiguracionCalculoEvaluacion";
DROP TABLE IF EXISTS "RangoAtributoEvaluacion";
DROP TABLE IF EXISTS "EscalaAtributoEvaluacion";
DROP TABLE IF EXISTS "MovimientoPlanillaEvaluacion";
DROP TABLE IF EXISTS "DesquiteEvaluacion";
DROP TABLE IF EXISTS "ResultadoComponenteEvaluacion";
DROP TABLE IF EXISTS "DetallePlanillaEvaluacion";
DROP TABLE IF EXISTS "PlanillaEvaluacion";
DROP TABLE IF EXISTS "ComponenteEvaluacion";
DROP TABLE IF EXISTS "GrupoComponenteEvaluacion";
DROP TABLE IF EXISTS "ConfiguracionMateriaEvaluacion";
DROP TABLE IF EXISTS "MateriaEvaluacion";
DROP TABLE IF EXISTS "InscripcionAcademicaAnual";

DROP TYPE IF EXISTS "EstadoCierreGestion";
DROP TYPE IF EXISTS "EstadoMatrizEvaluacion";
DROP TYPE IF EXISTS "TipoMatrizEvaluacion";
DROP TYPE IF EXISTS "EstadoPlanillaEvaluacion";
DROP TYPE IF EXISTS "TipoComponenteEvaluacion";
DROP TYPE IF EXISTS "EstadoInscripcionAcademica";
DROP TYPE IF EXISTS "PeriodoAcademico";

-- Los permisos se conservan deliberadamente para evitar eliminar asignaciones
-- que pudieran haberse usado después de la migración.
