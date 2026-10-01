export type EstadoUsuario = "ACTIVO" | "INACTIVO";
export type EstadoCadete = "REGULAR" | "BAJA" | "EGRESADO";

export interface Curso {
  id_curso: number;
  nombre: string;
  orden: number;
  _count?: { cadetes: number };
}
export interface UsuarioCadete {
  id_usuario: number;
  nombres: string;
  apellidos: string;
  ci: string;
  correo: string | null;
  estado: EstadoUsuario;
  habilitado: boolean;
  estado_conexion: "EN_LINEA" | "DESCONECTADO";
}
export interface HistorialCursoCadete {
  id_historial: number;
  id_cadete: number;
  id_curso: number;
  id_periodo: number;
  estado_cadete: EstadoCadete;
  fecha_registro: string;
  semestre: number;
  curso: Curso;
  periodoLectivo: {
    id_periodo: number;
    id_gestion: number;
    periodo: "I" | "II";
    gestion: {
      id_gestion: number;
      ano: number;
      estado: "PLANIFICACION" | "ACTIVA" | "CERRADA";
    };
  };
}
export interface Cadete {
  id_cadete: number;
  id_usuario: number;
  arma: string | null;
  id_curso: number;
  gestion_ingreso: number;
  gestion_egreso: number | null;
  estado_cadete: EstadoCadete;
  usuario: UsuarioCadete;
  curso: Curso;
  historial_cursos?: HistorialCursoCadete[];
}
export interface MetaPaginacion {
  total: number;
  pagina: number;
  limite: number;
  paginas_totales: number;
}
export interface RespuestaCadetes {
  data: Cadete[];
  meta: MetaPaginacion;
}
export interface CrearCadete {
  nombres: string;
  apellidos: string;
  ci: string;
  correo: string;
  contrasena?: string;
  estado: EstadoUsuario;
  estado_cadete: EstadoCadete;
  id_curso: number;
  gestion_ingreso: number;
  arma?: string | null;
}
