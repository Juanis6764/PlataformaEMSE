export type EstadoPlanillaEntrenamiento =
  | "BORRADOR"
  | "EN_REVISION"
  | "OBSERVADO"
  | "REVISADO";

export type NivelRevisionEntrenamiento =
  | "SECCION_ACADEMICA"
  | "JEFE_ESTUDIOS";

export type PerfilEntrenamiento =
  | "ADMINISTRADOR"
  | "ENCARGADO_ENTRENAMIENTO_FISICO"
  | "SECCION_ACADEMICA"
  | "JEFE_ESTUDIOS"
  | "COMANDO";

export interface ContextoEntrenamiento {
  perfil: PerfilEntrenamiento;
  permisos: string[];
  gestiones: Array<{
    id_gestion: number;
    ano: number;
    estado: string;
    periodos: Array<{
      id_periodo: number;
      periodo: "I" | "II";
      activo: boolean;
    }>;
  }>;
  cursos: Array<{ id_curso: number; nombre: string; orden: number }>;
}

export interface SeleccionEntrenamiento {
  id_gestion: number;
  id_periodo: number;
  id_curso: number;
}

export interface ResumenPlanillaEntrenamiento {
  id_planilla: number;
  estado: EstadoPlanillaEntrenamiento;
  nivel_revision_actual: NivelRevisionEntrenamiento | null;
  version_flujo: number;
  fecha_actualizacion: string;
  gestion: number;
  id_gestion: number;
  periodo: "I" | "II";
  id_periodo: number;
  curso: string;
  id_curso: number;
  total_cadetes: number;
  notas_registradas: number;
  pendientes: number;
}

export interface CadetePlanillaEntrenamiento {
  id_nota: number | null;
  id_cadete: number;
  ci: string;
  nombres: string;
  apellidos: string;
  nota_final: string | null;
}

export interface DetallePlanillaEntrenamiento {
  perfil: PerfilEntrenamiento;
  gestion: { id_gestion: number; ano: number };
  periodo: { id_periodo: number; periodo: "I" | "II" };
  curso: { id_curso: number; nombre: string; orden: number };
  planilla: null | {
    id_planilla: number;
    estado: EstadoPlanillaEntrenamiento;
    nivel_revision_actual: NivelRevisionEntrenamiento | null;
    version_flujo: number;
    fecha_actualizacion: string;
    enviada_evaluaciones: boolean;
  };
  resumen: {
    total_cadetes: number;
    notas_registradas: number;
    pendientes: number;
    completo: boolean;
  };
  acciones: {
    guardar: boolean;
    enviar: boolean;
    aprobar: boolean;
    observar: boolean;
    marcar_revisada: boolean;
    modificar_extraordinaria: boolean;
    enviar_evaluaciones: boolean;
    imprimir: boolean;
  };
  cadetes: CadetePlanillaEntrenamiento[];
}

export interface ResultadoEntrenamientoParaEvaluaciones {
  id_cadete: number;
  id_periodo: number;
  id_curso: number;
  nota_final_entrenamiento_fisico: string;
}
