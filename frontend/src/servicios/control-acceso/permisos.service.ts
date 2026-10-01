import api from "../api";
import { Permiso } from "../../tipos/permiso";

export const obtenerPermisos = async (): Promise<Permiso[]> => {
  const response = await api.get<Permiso[]>("/permisos");
  return response.data;
};

export interface DatosPermiso {
  nombre: string;
  modulo: string;
  accion: string;
  descripcion?: string;
}
export const crearPermiso = async (datos: DatosPermiso): Promise<Permiso> => {
  const response = await api.post<Permiso>("/permisos", datos);
  return response.data;
};
export const actualizarPermiso = async (
  id: number,
  datos: Partial<DatosPermiso>,
): Promise<Permiso> =>
  (await api.patch<Permiso>(`/permisos/${id}`, datos)).data;
export const eliminarPermiso = async (id: number): Promise<Permiso> =>
  (await api.delete<Permiso>(`/permisos/${id}`)).data;
