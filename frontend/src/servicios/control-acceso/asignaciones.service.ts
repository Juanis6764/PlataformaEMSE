import api from "../api";
import { Curso } from "../../tipos/cadete";
import { Seccion } from "../../tipos/seccion";
export type TipoAsignacionAcademica = "OPERADOR" | "RESPONSABLE";
export interface Asignacion {
  id_asignacion: number;
  id_usuario: number;
  id_seccion: number;
  id_curso: number | null;
  tipo: TipoAsignacionAcademica;
  activo: boolean;
  usuario: {
    id_usuario: number;
    nombres: string;
    apellidos: string;
    ci: string;
    habilitado: boolean;
    estado_conexion: "EN_LINEA" | "DESCONECTADO";
  };
  seccion: Seccion;
  curso: Curso | null;
}
export interface CrearAsignacion {
  id_usuario: number;
  id_seccion: number;
  id_curso?: number;
  tipo: TipoAsignacionAcademica;
}
export const listarAsignaciones = async (): Promise<Asignacion[]> =>
  (await api.get("/asignaciones-academicas")).data;
export const crearAsignacion = async (
  datos: CrearAsignacion,
): Promise<Asignacion> =>
  (await api.post("/asignaciones-academicas", datos)).data;
export const revocarAsignacion = async (id: number): Promise<Asignacion> =>
  (await api.delete(`/asignaciones-academicas/${id}`)).data;
