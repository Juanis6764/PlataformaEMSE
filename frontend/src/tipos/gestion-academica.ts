export interface PeriodoLectivo {
  id_periodo: number; periodo: "I" | "II"; activo: boolean;
}
export interface GestionAcademicaAdmin {
  id_gestion: number; ano: number; estado: "PLANIFICACION" | "ACTIVA" | "CERRADA";
  periodos_lectivos: PeriodoLectivo[];
}
