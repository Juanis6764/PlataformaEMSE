export type TipoMatrizAcademica = "SEMESTRAL" | "ANUAL";
export type EstadoMatrizAcademica =
  | "BORRADOR"
  | "EN_REVISION"
  | "OBSERVADO"
  | "APROBADO"
  | "PUBLICADO";

export interface FilaMatrizAcademica {
  id_cadete: number;
  ci: string;
  nombres: string;
  apellidos: string;
  materias: Array<{ id_materia?: number; nombre: string; nota: string | null }>;
  promedio_academico: string | null;
  ponderacion_evaluaciones: string | null;
  nota_entrenamiento_fisico: string | null;
  ponderacion_entrenamiento: string | null;
  nota_disciplina: string | null;
  ponderacion_disciplina: string | null;
  promedio_general: string | null;
  cantidad_aplazos: number | null;
  promedio_acumulado: string | null;
  cantidad_aplazos_acumulados: number | null;
  atributo: "E" | "MB" | "B" | "R" | "M" | null;
  orden_merito: number | null;
}

export interface MatrizAcademica {
  id_matriz: number | null;
  tipo: TipoMatrizAcademica;
  estado: EstadoMatrizAcademica | null;
  nivel_revision_actual: string | null;
  version_flujo: number;
  gestion: number;
  periodo: "I" | "II";
  curso: string;
  disponibilidad: Record<string, string>;
  completo: boolean;
  fecha_publicacion?: string | null;
  acciones: {
    generar: boolean;
    enviar: boolean;
    aprobar: boolean;
    observar: boolean;
    publicar: boolean;
  };
  filas: FilaMatrizAcademica[];
}

export interface MatrizPropiaAcademica extends FilaMatrizAcademica {
  id_matriz: number;
  tipo: TipoMatrizAcademica;
  gestion: number;
  periodo: "I" | "II";
  curso: string;
}

export interface AuditoriaCorreccionNota {
  id_auditoria: number;
  fecha: string;
  usuario: string;
  rol: string | null;
  valor_anterior: string | null;
  valor_nuevo: string | null;
  justificacion: string | null;
}

export interface NotaCorregibleEvaluacion {
  id_nota: number;
  id_materia: number;
  materia: string;
  estado: string;
  nota_inicial: string;
  nota_desquite: string | null;
  nota_actual: string;
  corregible: boolean;
  corregida: boolean;
  auditoria: AuditoriaCorreccionNota[];
}

export interface NotaCorregibleArea {
  id_nota?: number;
  id_resultado?: number;
  estado?: string;
  nota_actual: string | null;
  corregible: boolean;
  corregida: boolean;
  auditoria: AuditoriaCorreccionNota[];
}

export interface ResumenMatrizCorreccion {
  id_matriz: number;
  tipo: TipoMatrizAcademica;
  estado: EstadoMatrizAcademica;
  periodo: "I" | "II";
  promedio_academico: string | null;
  ponderacion_evaluaciones: string | null;
  ponderacion_entrenamiento: string | null;
  ponderacion_disciplina: string | null;
  promedio_general: string;
  cantidad_aplazos: number;
  atributo: string;
  orden_merito: number;
}

export interface EstudianteCorreccionExtraordinaria {
  id_cadete: number;
  ci: string;
  nombres: string;
  apellidos: string;
  evaluaciones: NotaCorregibleEvaluacion[];
  entrenamiento_fisico: NotaCorregibleArea[];
  disciplina: NotaCorregibleArea[];
  matrices: ResumenMatrizCorreccion[];
}

export interface ExpedienteCorreccionExtraordinaria {
  gestion: number;
  periodo: "I" | "II";
  curso: string;
  estudiantes: EstudianteCorreccionExtraordinaria[];
}
