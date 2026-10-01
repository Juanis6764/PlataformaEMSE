-- DropForeignKey
ALTER TABLE "BaremoEntrenamientoFisico" DROP CONSTRAINT "BaremoEntrenamientoFisico_id_componente_fkey";

-- DropForeignKey
ALTER TABLE "BaremoEntrenamientoFisico" DROP CONSTRAINT "BaremoEntrenamientoFisico_id_configuracion_fkey";

-- DropForeignKey
ALTER TABLE "CatalogoDisciplina" DROP CONSTRAINT "CatalogoDisciplina_id_creador_fkey";

-- DropForeignKey
ALTER TABLE "CierreGestionAcademica" DROP CONSTRAINT "CierreGestionAcademica_id_gestion_destino_fkey";

-- DropForeignKey
ALTER TABLE "CierreGestionAcademica" DROP CONSTRAINT "CierreGestionAcademica_id_gestion_fkey";

-- DropForeignKey
ALTER TABLE "CierreGestionAcademica" DROP CONSTRAINT "CierreGestionAcademica_id_usuario_fkey";

-- DropForeignKey
ALTER TABLE "ComponenteEntrenamientoFisico" DROP CONSTRAINT "ComponenteEntrenamientoFisico_id_configuracion_fkey";

-- DropForeignKey
ALTER TABLE "ComponenteEvaluacion" DROP CONSTRAINT "ComponenteEvaluacion_id_grupo_fkey";

-- DropForeignKey
ALTER TABLE "ConfiguracionCalculoEvaluacion" DROP CONSTRAINT "ConfiguracionCalculoEvaluacion_id_gestion_fkey";

-- DropForeignKey
ALTER TABLE "ConfiguracionEntrenamientoFisico" DROP CONSTRAINT "ConfiguracionEntrenamientoFisico_id_creador_fkey";

-- DropForeignKey
ALTER TABLE "ConfiguracionEntrenamientoFisico" DROP CONSTRAINT "ConfiguracionEntrenamientoFisico_id_gestion_fkey";

-- DropForeignKey
ALTER TABLE "ConfiguracionMateriaEvaluacion" DROP CONSTRAINT "ConfiguracionMateriaEvaluacion_id_materia_fkey";

-- DropForeignKey
ALTER TABLE "ConfiguracionSemestreDisciplina" DROP CONSTRAINT "ConfiguracionSemestreDisciplina_id_creador_fkey";

-- DropForeignKey
ALTER TABLE "ConfiguracionSemestreDisciplina" DROP CONSTRAINT "ConfiguracionSemestreDisciplina_id_gestion_fkey";

-- DropForeignKey
ALTER TABLE "ConsolidadoAnualEntrenamientoFisico" DROP CONSTRAINT "ConsolidadoAnualEntrenamientoFisico_id_creador_fkey";

-- DropForeignKey
ALTER TABLE "ConsolidadoAnualEntrenamientoFisico" DROP CONSTRAINT "ConsolidadoAnualEntrenamientoFisico_id_gestion_fkey";

-- DropForeignKey
ALTER TABLE "ConsolidadoAnualEntrenamientoFisico" DROP CONSTRAINT "ConsolidadoAnualEntrenamientoFisico_id_matriz_i_fkey";

-- DropForeignKey
ALTER TABLE "ConsolidadoAnualEntrenamientoFisico" DROP CONSTRAINT "ConsolidadoAnualEntrenamientoFisico_id_matriz_ii_fkey";

-- DropForeignKey
ALTER TABLE "DesquiteEvaluacion" DROP CONSTRAINT "DesquiteEvaluacion_id_detalle_fkey";

-- DropForeignKey
ALTER TABLE "DesquiteEvaluacion" DROP CONSTRAINT "DesquiteEvaluacion_id_usuario_fkey";

-- DropForeignKey
ALTER TABLE "DetalleCierreGestion" DROP CONSTRAINT "DetalleCierreGestion_id_cierre_fkey";

-- DropForeignKey
ALTER TABLE "DetalleCierreGestion" DROP CONSTRAINT "DetalleCierreGestion_id_inscripcion_destino_fkey";

-- DropForeignKey
ALTER TABLE "DetalleCierreGestion" DROP CONSTRAINT "DetalleCierreGestion_id_inscripcion_origen_fkey";

-- DropForeignKey
ALTER TABLE "DetalleConsolidadoEntrenamientoFisico" DROP CONSTRAINT "DetalleConsolidadoEntrenamientoFisico_id_cadete_fkey";

-- DropForeignKey
ALTER TABLE "DetalleConsolidadoEntrenamientoFisico" DROP CONSTRAINT "DetalleConsolidadoEntrenamientoFisico_id_consolidado_fkey";

-- DropForeignKey
ALTER TABLE "DetalleConsolidadoEntrenamientoFisico" DROP CONSTRAINT "DetalleConsolidadoEntrenamientoFisico_id_curso_fkey";

-- DropForeignKey
ALTER TABLE "DetalleMatrizEntrenamientoFisico" DROP CONSTRAINT "DetalleMatrizEntrenamientoFisico_id_cadete_fkey";

-- DropForeignKey
ALTER TABLE "DetalleMatrizEntrenamientoFisico" DROP CONSTRAINT "DetalleMatrizEntrenamientoFisico_id_curso_fkey";

-- DropForeignKey
ALTER TABLE "DetalleMatrizEntrenamientoFisico" DROP CONSTRAINT "DetalleMatrizEntrenamientoFisico_id_detalle_planilla_fkey";

-- DropForeignKey
ALTER TABLE "DetalleMatrizEntrenamientoFisico" DROP CONSTRAINT "DetalleMatrizEntrenamientoFisico_id_matriz_fkey";

-- DropForeignKey
ALTER TABLE "DetalleMatrizEvaluacion" DROP CONSTRAINT "DetalleMatrizEvaluacion_id_cadete_fkey";

-- DropForeignKey
ALTER TABLE "DetalleMatrizEvaluacion" DROP CONSTRAINT "DetalleMatrizEvaluacion_id_curso_fkey";

-- DropForeignKey
ALTER TABLE "DetalleMatrizEvaluacion" DROP CONSTRAINT "DetalleMatrizEvaluacion_id_inscripcion_fkey";

-- DropForeignKey
ALTER TABLE "DetalleMatrizEvaluacion" DROP CONSTRAINT "DetalleMatrizEvaluacion_id_matriz_fkey";

-- DropForeignKey
ALTER TABLE "DetallePlanillaEntrenamientoFisico" DROP CONSTRAINT "DetallePlanillaEntrenamientoFisico_id_cadete_fkey";

-- DropForeignKey
ALTER TABLE "DetallePlanillaEntrenamientoFisico" DROP CONSTRAINT "DetallePlanillaEntrenamientoFisico_id_historial_fkey";

-- DropForeignKey
ALTER TABLE "DetallePlanillaEntrenamientoFisico" DROP CONSTRAINT "DetallePlanillaEntrenamientoFisico_id_planilla_fkey";

-- DropForeignKey
ALTER TABLE "DetallePlanillaEvaluacion" DROP CONSTRAINT "DetallePlanillaEvaluacion_id_cadete_fkey";

-- DropForeignKey
ALTER TABLE "DetallePlanillaEvaluacion" DROP CONSTRAINT "DetallePlanillaEvaluacion_id_inscripcion_fkey";

-- DropForeignKey
ALTER TABLE "DetallePlanillaEvaluacion" DROP CONSTRAINT "DetallePlanillaEvaluacion_id_planilla_fkey";

-- DropForeignKey
ALTER TABLE "EscalaAtributoEvaluacion" DROP CONSTRAINT "EscalaAtributoEvaluacion_id_gestion_fkey";

-- DropForeignKey
ALTER TABLE "FirmanteReporte" DROP CONSTRAINT "FirmanteReporte_id_creador_fkey";

-- DropForeignKey
ALTER TABLE "FirmanteReporte" DROP CONSTRAINT "FirmanteReporte_id_gestion_fkey";

-- DropForeignKey
ALTER TABLE "GrupoComponenteEvaluacion" DROP CONSTRAINT "GrupoComponenteEvaluacion_id_configuracion_fkey";

-- DropForeignKey
ALTER TABLE "HistorialCursoCadete" DROP CONSTRAINT "HistorialCursoCadete_id_inscripcion_fkey";

-- DropForeignKey
ALTER TABLE "InscripcionAcademicaAnual" DROP CONSTRAINT "InscripcionAcademicaAnual_id_cadete_fkey";

-- DropForeignKey
ALTER TABLE "InscripcionAcademicaAnual" DROP CONSTRAINT "InscripcionAcademicaAnual_id_curso_fkey";

-- DropForeignKey
ALTER TABLE "InscripcionAcademicaAnual" DROP CONSTRAINT "InscripcionAcademicaAnual_id_gestion_fkey";

-- DropForeignKey
ALTER TABLE "InscripcionAcademicaAnual" DROP CONSTRAINT "InscripcionAcademicaAnual_id_inscripcion_origen_fkey";

-- DropForeignKey
ALTER TABLE "MateriaEvaluacion" DROP CONSTRAINT "MateriaEvaluacion_id_creador_fkey";

-- DropForeignKey
ALTER TABLE "MateriaEvaluacion" DROP CONSTRAINT "MateriaEvaluacion_id_curso_fkey";

-- DropForeignKey
ALTER TABLE "MateriaEvaluacion" DROP CONSTRAINT "MateriaEvaluacion_id_gestion_fkey";

-- DropForeignKey
ALTER TABLE "MateriaEvaluacion" DROP CONSTRAINT "MateriaEvaluacion_id_operador_fkey";

-- DropForeignKey
ALTER TABLE "MatrizEntrenamientoFisico" DROP CONSTRAINT "MatrizEntrenamientoFisico_id_creador_fkey";

-- DropForeignKey
ALTER TABLE "MatrizEntrenamientoFisico" DROP CONSTRAINT "MatrizEntrenamientoFisico_id_gestion_fkey";

-- DropForeignKey
ALTER TABLE "MatrizEvaluacion" DROP CONSTRAINT "MatrizEvaluacion_id_creador_fkey";

-- DropForeignKey
ALTER TABLE "MatrizEvaluacion" DROP CONSTRAINT "MatrizEvaluacion_id_curso_fkey";

-- DropForeignKey
ALTER TABLE "MatrizEvaluacion" DROP CONSTRAINT "MatrizEvaluacion_id_gestion_fkey";

-- DropForeignKey
ALTER TABLE "MovimientoConsolidadoEntrenamientoFisico" DROP CONSTRAINT "MovimientoConsolidadoEntrenamientoFisico_id_consolidado_fkey";

-- DropForeignKey
ALTER TABLE "MovimientoConsolidadoEntrenamientoFisico" DROP CONSTRAINT "MovimientoConsolidadoEntrenamientoFisico_id_usuario_fkey";

-- DropForeignKey
ALTER TABLE "MovimientoMatrizEntrenamientoFisico" DROP CONSTRAINT "MovimientoMatrizEntrenamientoFisico_id_matriz_fkey";

-- DropForeignKey
ALTER TABLE "MovimientoMatrizEntrenamientoFisico" DROP CONSTRAINT "MovimientoMatrizEntrenamientoFisico_id_usuario_fkey";

-- DropForeignKey
ALTER TABLE "MovimientoMatrizEvaluacion" DROP CONSTRAINT "MovimientoMatrizEvaluacion_id_matriz_fkey";

-- DropForeignKey
ALTER TABLE "MovimientoMatrizEvaluacion" DROP CONSTRAINT "MovimientoMatrizEvaluacion_id_usuario_fkey";

-- DropForeignKey
ALTER TABLE "MovimientoPlanillaEntrenamientoFisico" DROP CONSTRAINT "MovimientoPlanillaEntrenamientoFisico_id_planilla_fkey";

-- DropForeignKey
ALTER TABLE "MovimientoPlanillaEntrenamientoFisico" DROP CONSTRAINT "MovimientoPlanillaEntrenamientoFisico_id_usuario_fkey";

-- DropForeignKey
ALTER TABLE "MovimientoPlanillaEvaluacion" DROP CONSTRAINT "MovimientoPlanillaEvaluacion_id_planilla_fkey";

-- DropForeignKey
ALTER TABLE "MovimientoPlanillaEvaluacion" DROP CONSTRAINT "MovimientoPlanillaEvaluacion_id_usuario_fkey";

-- DropForeignKey
ALTER TABLE "MovimientoReporteDisciplina" DROP CONSTRAINT "MovimientoReporteDisciplina_id_reporte_fkey";

-- DropForeignKey
ALTER TABLE "MovimientoReporteDisciplina" DROP CONSTRAINT "MovimientoReporteDisciplina_id_usuario_fkey";

-- DropForeignKey
ALTER TABLE "MovimientoSemanaDisciplina" DROP CONSTRAINT "MovimientoSemanaDisciplina_id_semana_fkey";

-- DropForeignKey
ALTER TABLE "MovimientoSemanaDisciplina" DROP CONSTRAINT "MovimientoSemanaDisciplina_id_usuario_fkey";

-- DropForeignKey
ALTER TABLE "NotificacionDisciplina" DROP CONSTRAINT "NotificacionDisciplina_id_reporte_fkey";

-- DropForeignKey
ALTER TABLE "NotificacionDisciplina" DROP CONSTRAINT "NotificacionDisciplina_id_usuario_fkey";

-- DropForeignKey
ALTER TABLE "OficialDisciplina" DROP CONSTRAINT "OficialDisciplina_id_creador_fkey";

-- DropForeignKey
ALTER TABLE "PlanillaEntrenamientoFisico" DROP CONSTRAINT "PlanillaEntrenamientoFisico_id_configuracion_fkey";

-- DropForeignKey
ALTER TABLE "PlanillaEntrenamientoFisico" DROP CONSTRAINT "PlanillaEntrenamientoFisico_id_curso_fkey";

-- DropForeignKey
ALTER TABLE "PlanillaEntrenamientoFisico" DROP CONSTRAINT "PlanillaEntrenamientoFisico_id_gestion_fkey";

-- DropForeignKey
ALTER TABLE "PlanillaEntrenamientoFisico" DROP CONSTRAINT "PlanillaEntrenamientoFisico_id_operador_fkey";

-- DropForeignKey
ALTER TABLE "PlanillaEvaluacion" DROP CONSTRAINT "PlanillaEvaluacion_id_configuracion_fkey";

-- DropForeignKey
ALTER TABLE "PlanillaEvaluacion" DROP CONSTRAINT "PlanillaEvaluacion_id_materia_fkey";

-- DropForeignKey
ALTER TABLE "PlanillaEvaluacion" DROP CONSTRAINT "PlanillaEvaluacion_id_operador_fkey";

-- DropForeignKey
ALTER TABLE "PlanillaMatrizEntrenamientoFisico" DROP CONSTRAINT "PlanillaMatrizEntrenamientoFisico_id_matriz_fkey";

-- DropForeignKey
ALTER TABLE "PlanillaMatrizEntrenamientoFisico" DROP CONSTRAINT "PlanillaMatrizEntrenamientoFisico_id_planilla_fkey";

-- DropForeignKey
ALTER TABLE "RangoAtributoEvaluacion" DROP CONSTRAINT "RangoAtributoEvaluacion_id_escala_fkey";

-- DropForeignKey
ALTER TABLE "RegistroDisciplina" DROP CONSTRAINT "RegistroDisciplina_id_cadete_fkey";

-- DropForeignKey
ALTER TABLE "RegistroDisciplina" DROP CONSTRAINT "RegistroDisciplina_id_catalogo_fkey";

-- DropForeignKey
ALTER TABLE "RegistroDisciplina" DROP CONSTRAINT "RegistroDisciplina_id_configuracion_fkey";

-- DropForeignKey
ALTER TABLE "RegistroDisciplina" DROP CONSTRAINT "RegistroDisciplina_id_historial_fkey";

-- DropForeignKey
ALTER TABLE "RegistroDisciplina" DROP CONSTRAINT "RegistroDisciplina_id_oficial_fkey";

-- DropForeignKey
ALTER TABLE "RegistroDisciplina" DROP CONSTRAINT "RegistroDisciplina_id_operador_fkey";

-- DropForeignKey
ALTER TABLE "RegistroDisciplina" DROP CONSTRAINT "RegistroDisciplina_id_registro_raiz_fkey";

-- DropForeignKey
ALTER TABLE "ReporteDisciplina" DROP CONSTRAINT "ReporteDisciplina_id_creador_fkey";

-- DropForeignKey
ALTER TABLE "ReporteDisciplina" DROP CONSTRAINT "ReporteDisciplina_id_curso_fkey";

-- DropForeignKey
ALTER TABLE "ReporteDisciplina" DROP CONSTRAINT "ReporteDisciplina_id_gestion_fkey";

-- DropForeignKey
ALTER TABLE "ReporteRegistroDisciplina" DROP CONSTRAINT "ReporteRegistroDisciplina_id_registro_fkey";

-- DropForeignKey
ALTER TABLE "ReporteRegistroDisciplina" DROP CONSTRAINT "ReporteRegistroDisciplina_id_reporte_fkey";

-- DropForeignKey
ALTER TABLE "ResultadoComponenteEntrenamientoFisico" DROP CONSTRAINT "ResultadoComponenteEntrenamientoFisico_id_componente_fkey";

-- DropForeignKey
ALTER TABLE "ResultadoComponenteEntrenamientoFisico" DROP CONSTRAINT "ResultadoComponenteEntrenamientoFisico_id_detalle_fkey";

-- DropForeignKey
ALTER TABLE "ResultadoComponenteEvaluacion" DROP CONSTRAINT "ResultadoComponenteEvaluacion_id_componente_fkey";

-- DropForeignKey
ALTER TABLE "ResultadoComponenteEvaluacion" DROP CONSTRAINT "ResultadoComponenteEvaluacion_id_detalle_fkey";

-- DropForeignKey
ALTER TABLE "SemanaReporteDisciplina" DROP CONSTRAINT "SemanaReporteDisciplina_id_reporte_fkey";

-- DropIndex
DROP INDEX "HistorialCursoCadete_id_inscripcion_periodo_idx";

-- AlterTable
ALTER TABLE "HistorialCursoCadete" DROP COLUMN "id_inscripcion";

-- DropTable
DROP TABLE "BaremoEntrenamientoFisico";

-- DropTable
DROP TABLE "CatalogoDisciplina";

-- DropTable
DROP TABLE "CierreGestionAcademica";

-- DropTable
DROP TABLE "ComponenteEntrenamientoFisico";

-- DropTable
DROP TABLE "ComponenteEvaluacion";

-- DropTable
DROP TABLE "ConfiguracionCalculoEvaluacion";

-- DropTable
DROP TABLE "ConfiguracionEntrenamientoFisico";

-- DropTable
DROP TABLE "ConfiguracionMateriaEvaluacion";

-- DropTable
DROP TABLE "ConfiguracionSemestreDisciplina";

-- DropTable
DROP TABLE "ConsolidadoAnualEntrenamientoFisico";

-- DropTable
DROP TABLE "DesquiteEvaluacion";

-- DropTable
DROP TABLE "DetalleCierreGestion";

-- DropTable
DROP TABLE "DetalleConsolidadoEntrenamientoFisico";

-- DropTable
DROP TABLE "DetalleMatrizEntrenamientoFisico";

-- DropTable
DROP TABLE "DetalleMatrizEvaluacion";

-- DropTable
DROP TABLE "DetallePlanillaEntrenamientoFisico";

-- DropTable
DROP TABLE "DetallePlanillaEvaluacion";

-- DropTable
DROP TABLE "EscalaAtributoEvaluacion";

-- DropTable
DROP TABLE "FirmanteReporte";

-- DropTable
DROP TABLE "GrupoComponenteEvaluacion";

-- DropTable
DROP TABLE "InscripcionAcademicaAnual";

-- DropTable
DROP TABLE "MateriaEvaluacion";

-- DropTable
DROP TABLE "MatrizEntrenamientoFisico";

-- DropTable
DROP TABLE "MatrizEvaluacion";

-- DropTable
DROP TABLE "MovimientoConsolidadoEntrenamientoFisico";

-- DropTable
DROP TABLE "MovimientoMatrizEntrenamientoFisico";

-- DropTable
DROP TABLE "MovimientoMatrizEvaluacion";

-- DropTable
DROP TABLE "MovimientoPlanillaEntrenamientoFisico";

-- DropTable
DROP TABLE "MovimientoPlanillaEvaluacion";

-- DropTable
DROP TABLE "MovimientoReporteDisciplina";

-- DropTable
DROP TABLE "MovimientoSemanaDisciplina";

-- DropTable
DROP TABLE "NotificacionDisciplina";

-- DropTable
DROP TABLE "OficialDisciplina";

-- DropTable
DROP TABLE "PlanillaEntrenamientoFisico";

-- DropTable
DROP TABLE "PlanillaEvaluacion";

-- DropTable
DROP TABLE "PlanillaMatrizEntrenamientoFisico";

-- DropTable
DROP TABLE "RangoAtributoEvaluacion";

-- DropTable
DROP TABLE "RegistroDisciplina";

-- DropTable
DROP TABLE "ReporteDisciplina";

-- DropTable
DROP TABLE "ReporteRegistroDisciplina";

-- DropTable
DROP TABLE "ResultadoComponenteEntrenamientoFisico";

-- DropTable
DROP TABLE "ResultadoComponenteEvaluacion";

-- DropTable
DROP TABLE "SemanaReporteDisciplina";

-- DropEnum
DROP TYPE "AccionReporteDisciplina";

-- DropEnum
DROP TYPE "AccionSemanaDisciplina";

-- DropEnum
DROP TYPE "EstadoCierreGestion";

-- DropEnum
DROP TYPE "EstadoConsolidadoEntrenamientoFisico";

-- DropEnum
DROP TYPE "EstadoInscripcionAcademica";

-- DropEnum
DROP TYPE "EstadoMatrizEntrenamientoFisico";

-- DropEnum
DROP TYPE "EstadoMatrizEvaluacion";

-- DropEnum
DROP TYPE "EstadoPlanillaEntrenamientoFisico";

-- DropEnum
DROP TYPE "EstadoPlanillaEvaluacion";

-- DropEnum
DROP TYPE "EstadoReporteDisciplina";

-- DropEnum
DROP TYPE "EstadoSemanaDisciplina";

-- DropEnum
DROP TYPE "TipoComponenteEvaluacion";

-- DropEnum
DROP TYPE "TipoEvaluacionFisica";

-- DropEnum
DROP TYPE "TipoMatrizEvaluacion";

-- DropEnum
DROP TYPE "TipoNotificacionDisciplina";

-- DropEnum
DROP TYPE "TipoRegistroDisciplina";

-- DropEnum
DROP TYPE "TipoValorComponenteFisico";


-- Reclasifica un permiso mal etiquetado: GESTIONAR_GESTION_ACADEMICA protege
-- Gestion Academica / Periodo Lectivo (modelos conservados), no el modulo de
-- Notas que se retira en esta migracion. No afecta estructura, solo datos.
UPDATE "Permiso" SET "modulo" = 'ACADEMICO' WHERE "nombre" = 'GESTIONAR_GESTION_ACADEMICA';
