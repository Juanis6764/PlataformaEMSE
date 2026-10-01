import { Rol } from "./rol";
import { Seccion } from "./seccion";

export interface UsuarioSesion {
  id_usuario: number;
  nombres: string;
  apellidos: string;
  ci: string;
  estado?: string;
  primer_inicio: boolean;
  rol: string;
  grupo_usuario?: string;
  seccion: string | null;
  permisos: string[];
}

export interface UsuarioListado {
  id_usuario: number;
  nombres: string;
  apellidos: string;
  ci: string;
  estado: "ACTIVO" | "INACTIVO";
  estado_conexion: "EN_LINEA" | "DESCONECTADO";
  habilitado: boolean;
  es_mixto: boolean;
  fecha_creacion: string;
  rol?: Rol;
  seccion?: Seccion;
  correo?: string | null;
  id_rol?: number;
  id_seccion?: number | null;
  permisos_individuales?: {
    id_permiso: number;
    concedido: boolean;
    permiso: { id_permiso: number; nombre: string };
  }[];
  cadete?: {
    id_cadete: number;
    id_curso: number;
    curso: { id_curso: number; nombre: string; orden: number };
  } | null;
}
