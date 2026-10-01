import api from "../api";
import {
  Cadete,
  CrearCadete,
  Curso,
  EstadoCadete,
  RespuestaCadetes,
} from "../../tipos/cadete";

export interface FiltrosCadetes {
  pagina?: number;
  limite?: number;
  buscar?: string;
  id_curso?: number;
  estado_cadete?: EstadoCadete;
  arma?: string;
}
export const obtenerCadetes = async (
  filtros: FiltrosCadetes,
): Promise<RespuestaCadetes> =>
  (await api.get<RespuestaCadetes>("/cadetes", { params: filtros })).data;
export const obtenerCursos = async (): Promise<Curso[]> =>
  (await api.get<Curso[]>("/cursos")).data;
export const crearCadete = async (datos: CrearCadete): Promise<Cadete> =>
  (await api.post<Cadete>("/cadetes", datos)).data;
export const actualizarCadete = async (
  id: number,
  datos: Partial<Pick<Cadete, "arma" | "estado_cadete" | "gestion_egreso">>,
): Promise<Cadete> => (await api.patch<Cadete>(`/cadetes/${id}`, datos)).data;
export const actualizarUsuarioCadete = async (
  id: number,
  datos: { ci?: string; nombres?: string; apellidos?: string; correo?: string },
): Promise<unknown> => (await api.patch(`/usuarios/${id}`, datos)).data;
export const cambiarEstadoUsuario = async (
  id: number,
  habilitado: boolean,
): Promise<unknown> =>
  (await api.patch(`/usuarios/${id}/estado`, { habilitado })).data;
export const restablecerPassword = async (id: number): Promise<unknown> =>
  (await api.post(`/usuarios/${id}/restablecer-contrasena`)).data;
export const cambiarCurso = async (
  id: number,
  id_curso: number,
  id_periodo: number,
): Promise<Cadete> =>
  (
    await api.post<Cadete>(`/cadetes/${id}/cambiar-curso`, {
      id_curso,
      id_periodo,
    })
  ).data;
export const promoverCurso = async (
  id_curso: number,
  id_periodo: number,
): Promise<{ promovidos: number }> =>
  (await api.post(`/cadetes/promociones/${id_curso}`, { id_periodo })).data;
