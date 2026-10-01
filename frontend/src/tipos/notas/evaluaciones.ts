export type EstadoMateriaEvaluacion =
  | "BORRADOR"
  | "EN_REVISION"
  | "OBSERVADO"
  | "REVISADO"
  | "PUBLICADO";

export type NivelRevisionEvaluacion =
  | "ENCARGADO_AREA"
  | "SECCION_ACADEMICA"
  | "JEFE_ESTUDIOS";

export type PerfilEvaluaciones =
  | "ADMINISTRADOR"
  | "ENCARGADO_EVALUACIONES"
  | "OPERADOR_EVALUACIONES"
  | "SECCION_ACADEMICA"
  | "JEFE_ESTUDIOS"
  | "COMANDO"
  | "CADETE"
  | "OTRO";

export type ClasificacionEvaluacion = "E" | "MB" | "B" | "R" | "M";

export interface CursoEvaluaciones {
  id_curso: number;
  nombre: string;
  orden: number;
}

export interface PeriodoContextoEvaluaciones {
  id_periodo: number;
  periodo: "I" | "II";
  activo: boolean;
}

export interface GestionContextoEvaluaciones {
  id_gestion: number;
  ano: number;
  estado: "PLANIFICACION" | "ACTIVA" | "CERRADA";
  periodos: PeriodoContextoEvaluaciones[];
}

export interface ContextoEvaluaciones {
  perfil: PerfilEvaluaciones;
  cursos: CursoEvaluaciones[];
  gestiones: GestionContextoEvaluaciones[];
}

export interface UsuarioBreveEvaluaciones {
  id_usuario: number;
  nombres: string;
  apellidos: string;
}

export interface ConfiguracionEvaluaciones {
  id_configuracion: number;
  id_periodo: number;
  id_curso: number;
  cantidad_materias: number;
  activo: boolean;
  id_creador: number;
  materias_registradas: number;
  periodo?: PeriodoContextoEvaluaciones & {
    gestion: { id_gestion: number; ano: number; estado: string };
  };
  curso?: CursoEvaluaciones;
}

export interface MateriaEvaluacion {
  id_materia: number;
  id_periodo: number;
  id_curso: number;
  numero_materia: number;
  nombre: string;
  estado: EstadoMateriaEvaluacion;
  nivel_revision_actual: NivelRevisionEvaluacion | null;
  version_flujo: number;
  id_creador: number;
  id_ultimo_responsable: number;
  fecha_creacion: string;
  fecha_actualizacion: string;
  fecha_envio: string | null;
  fecha_revision: string | null;
  fecha_publicacion: string | null;
  periodo?: PeriodoContextoEvaluaciones & {
    gestion: { id_gestion: number; ano: number; estado: string };
  };
  curso?: CursoEvaluaciones;
  creador?: UsuarioBreveEvaluaciones;
  ultimo_responsable?: UsuarioBreveEvaluaciones;
  _count?: { notas: number };
}

export interface CadeteMateriaEvaluacion {
  id_nota?: number;
  id_cadete: number;
  ci: string;
  nombres: string;
  apellidos: string;
  nota_inicial: string | null;
  nota_desquite: string | null;
  nota_considerada: string | null;
  clasificacion: ClasificacionEvaluacion | null;
  orden_merito: number | null;
  estado: "PENDIENTE" | "REGISTRADA";
}

export interface ResumenMateriaEvaluacion {
  cantidad_cadetes: number;
  notas_registradas: number;
  notas_pendientes: number;
  alumnos_con_desquite: number;
  completo: boolean;
}

export interface DetalleMateriaEvaluacion extends MateriaEvaluacion {
  cadetes: CadeteMateriaEvaluacion[];
  resumen: ResumenMateriaEvaluacion;
}

export interface GuardarNotaEvaluacion {
  id_cadete: number;
  nota_inicial: string;
  nota_desquite?: string | null;
}

export interface RespuestaGuardarNotasEvaluacion {
  id_materia: number;
  cambios: number;
  notas_registradas: number;
  notas_pendientes: number;
  completo: boolean;
}

export interface ColumnaMatrizEvaluacion {
  id_materia: number;
  numero_materia: number;
  nombre: string;
}

export interface CeldaMatrizEvaluacion {
  id_materia: number;
  nota_inicial: string | null;
  nota_desquite: string | null;
  nota_considerada: string | null;
  clasificacion: ClasificacionEvaluacion | null;
  orden_merito: number | null;
}

export interface FilaMatrizEvaluacion {
  id_cadete: number;
  ci: string;
  nombres: string;
  apellidos: string;
  materias: CeldaMatrizEvaluacion[];
  promedio_parcial: string | null;
  promedio_final: string | null;
}

export interface MatrizEvaluaciones {
  id_gestion: number;
  gestion: number;
  id_periodo: number;
  periodo: "I" | "II";
  id_curso: number;
  curso: string;
  materias_configuradas: number;
  materias_publicadas: number;
  completo: boolean;
  columnas: ColumnaMatrizEvaluacion[];
  cadetes: FilaMatrizEvaluacion[];
}

export interface FilaResultadoEvaluacion {
  id_cadete: number;
  ci: string;
  nombres: string;
  apellidos: string;
  promedio_parcial: string | null;
  nota_final_evaluaciones: string | null;
  clasificacion_final: ClasificacionEvaluacion | null;
}

export interface ResultadosEvaluaciones {
  id_gestion: number;
  gestion: number;
  id_periodo: number;
  periodo: "I" | "II";
  id_curso: number;
  curso: string;
  materias_configuradas: number;
  materias_publicadas: number;
  completo: boolean;
  cadetes: FilaResultadoEvaluacion[];
}

export type EstadoFuenteResultado = "COMPLETO" | "RECIBIDO" | "PENDIENTE";

export interface NotaResultadoRecibido {
  id_cadete: number;
  ci: string;
  nombres: string;
  apellidos: string;
  nota_final: string;
}

export interface FuenteResultadoRecibido {
  estado: "RECIBIDO" | "PENDIENTE";
  fecha_recepcion: string | null;
  cantidad_cadetes: number;
  notas: NotaResultadoRecibido[];
}

export interface ResultadosRecibidosEvaluaciones {
  id_gestion: number;
  gestion: number;
  id_periodo: number;
  periodo: "I" | "II";
  id_curso: number;
  curso: string;
  evaluaciones: {
    estado: "COMPLETO" | "PENDIENTE";
    materias_configuradas: number;
    materias_publicadas: number;
  };
  disciplina: FuenteResultadoRecibido;
  entrenamiento_fisico: FuenteResultadoRecibido & {
    id_planilla: number | null;
  };
}

export interface NotaPropiaEvaluacion {
  nombre: string;
  nota_considerada: string;
  clasificacion: ClasificacionEvaluacion;
  orden_merito: number;
}
