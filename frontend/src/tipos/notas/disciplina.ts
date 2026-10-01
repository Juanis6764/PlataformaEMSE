export type TipoDisciplina = "MERITO" | "DEMERITO";
export type EstadoSemanaDisciplina =
  | "BORRADOR"
  | "EN_REVISION"
  | "OBSERVADO"
  | "REVISADO"
  | "PUBLICADO";
export type NivelRevisionDisciplina =
  | "ENCARGADO_AREA"
  | "SECCION_ACADEMICA"
  | "JEFE_ESTUDIOS";
export type PerfilNotas =
  | "ADMINISTRADOR"
  | "ENCARGADO_DISCIPLINA"
  | "OPERADOR_DISCIPLINA"
  | "SECCION_ACADEMICA"
  | "JEFE_ESTUDIOS"
  | "COMANDO"
  | "CADETE"
  | "OTRO";

export interface CursoDisciplina {
  id_curso: number;
  nombre: string;
  orden: number;
}

export interface PeriodoContextoDisciplina {
  id_periodo: number;
  periodo: "I" | "II";
  activo: boolean;
}

export interface GestionContextoDisciplina {
  id_gestion: number;
  ano: number;
  estado: "PLANIFICACION" | "ACTIVA" | "CERRADA";
  periodos: PeriodoContextoDisciplina[];
}

export interface ContextoDisciplina {
  perfil: PerfilNotas;
  cursos: CursoDisciplina[];
  gestiones: GestionContextoDisciplina[];
}

export interface ConfiguracionDisciplina {
  id_configuracion: number;
  id_periodo: number;
  id_curso: number;
  cantidad_semanas: number;
  activo: boolean;
  id_creador: number;
  periodo?: PeriodoContextoDisciplina & {
    gestion: { id_gestion: number; ano: number; estado: string };
  };
  curso?: CursoDisciplina;
}

export interface OficialDisciplina {
  id_oficial: number;
  codigo: string;
  nombre_completo: string;
  activo: boolean;
  id_creador: number;
}

export interface CatalogoDisciplina {
  id_catalogo: number;
  tipo: TipoDisciplina;
  codigo: string;
  nombre: string;
  puntaje_base: string | null;
  activo: boolean;
  id_creador: number;
}

export interface UsuarioBreveDisciplina {
  id_usuario: number;
  nombres: string;
  apellidos: string;
  ci?: string;
}

export interface CadeteSemanaDisciplina {
  id_cadete: number;
  id_usuario: number;
  arma: string | null;
  id_curso: number;
  usuario: UsuarioBreveDisciplina & { ci: string };
  tiene_registros: boolean;
}

export interface RegistroDisciplina {
  id_registro: number;
  id_semana: number;
  id_cadete: number;
  id_catalogo: number;
  id_oficial: number | null;
  nombre_responsable_manual: string | null;
  fecha_hecho: string | null;
  puntaje: string;
  observacion: string | null;
  id_creador: number;
  catalogo: CatalogoDisciplina;
  oficial: OficialDisciplina | null;
  cadete?: CadeteSemanaDisciplina;
}

export interface SemanaDisciplina {
  id_semana: number;
  id_periodo: number;
  id_curso: number;
  numero_semana: number;
  estado: EstadoSemanaDisciplina;
  nivel_revision_actual: NivelRevisionDisciplina | null;
  version_flujo: number;
  id_creador: number;
  id_ultimo_responsable: number;
  fecha_creacion: string;
  fecha_actualizacion: string;
  fecha_envio: string | null;
  fecha_revision: string | null;
  fecha_publicacion: string | null;
  periodo?: PeriodoContextoDisciplina & {
    gestion: { id_gestion: number; ano: number; estado: string };
  };
  curso?: CursoDisciplina;
  creador?: UsuarioBreveDisciplina;
  ultimo_responsable?: UsuarioBreveDisciplina;
  _count?: { registros: number };
}

export interface SemanaDetalleDisciplina extends SemanaDisciplina {
  registros: RegistroDisciplina[];
  cadetes: CadeteSemanaDisciplina[];
}

export interface CrearRegistroDisciplina {
  id_cadete: number;
  id_catalogo: number;
  id_oficial?: number | null;
  nombre_responsable_manual?: string | null;
  fecha_hecho?: string | null;
  puntaje?: string;
  observacion?: string | null;
}

export type ActualizarRegistroDisciplina = Partial<CrearRegistroDisciplina>;

export interface FilaAcumuladoDisciplina {
  id_cadete: number;
  ci: string;
  nombres: string;
  apellidos: string;
  arma: string | null;
  grado: string;
  total_meritos: string;
  total_demeritos: string;
  demerito_neto: string;
  valor_por_punto: string;
  descuento: string;
  nota: string;
  alerta: boolean;
}

export interface AcumuladoDisciplina {
  gestion: number;
  periodo: "I" | "II";
  curso: string;
  fecha_inicial: string | null;
  fecha_final: string | null;
  semanas_configuradas: number;
  semanas_publicadas: number;
  completo: boolean;
  cadetes: FilaAcumuladoDisciplina[];
}

export interface DetalleSemanaCuadroDisciplina {
  id_registro: number;
  codigo: string;
  nombre: string;
  puntaje: string;
  estado: EstadoSemanaDisciplina;
}

export interface SemanaCuadroDisciplina {
  numero_semana: number;
  total_demeritos: string;
  detalles: DetalleSemanaCuadroDisciplina[];
}

export interface FilaCuadroDemostrativoDisciplina {
  id_cadete: number;
  ci: string;
  nombres: string;
  apellidos: string;
  arma: string | null;
  semanas: SemanaCuadroDisciplina[];
  total_meritos: string;
  total_demeritos: string;
}

export interface CuadroDemostrativoDisciplina {
  id_gestion: number;
  gestion: number;
  id_periodo: number;
  periodo: "I" | "II";
  id_curso: number;
  curso: string;
  cantidad_semanas: number;
  incluye_borrador: boolean;
  cadetes: FilaCuadroDemostrativoDisciplina[];
}

export interface FilaResultadoFinalDisciplina {
  id_cadete: number;
  ci: string;
  nombres: string;
  apellidos: string;
  curso: string;
  total_demeritos: string;
  total_meritos: string;
  demerito_neto: string;
  nota_final_disciplina: string;
}

export interface ResultadoFinalDisciplina {
  id_configuracion: number;
  id_gestion: number;
  gestion: number;
  id_periodo: number;
  periodo: "I" | "II";
  id_curso: number;
  curso: string;
  semanas_configuradas: number;
  semanas_existentes: number;
  semanas_publicadas: number;
  completo: boolean;
  publicado: boolean;
  enviado_evaluaciones: boolean;
  fecha_publicacion: string | null;
  fecha_envio_evaluaciones: string | null;
  puede_publicar: boolean;
  puede_enviar_evaluaciones: boolean;
  filas: FilaResultadoFinalDisciplina[];
}

export interface GestionCadeteDisciplina {
  id_gestion: number;
  ano: number;
  periodos: Array<{ id_periodo: number; periodo: "I" | "II" }>;
}

export interface RegistroPublicadoCadete {
  id_registro: number;
  id_gestion: number;
  gestion: number;
  id_periodo: number;
  periodo: "I" | "II";
  fecha: string | null;
  tipo: TipoDisciplina;
  nombre: string;
}
