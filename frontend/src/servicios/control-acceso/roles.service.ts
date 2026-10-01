import api from '../api';
import { Rol } from '../../tipos/rol';

export const obtenerRoles = async (): Promise<Rol[]> => {
  const response = await api.get<Rol[]>('/roles');
  return response.data;
};

export const crearRol = async (datos: { nombre: string; descripcion?: string }): Promise<Rol> => {
  const response = await api.post<Rol>('/roles', datos);
  return response.data;
};
export const actualizarRol = async (id: number, datos: { nombre?: string; descripcion?: string }): Promise<Rol> => (await api.patch<Rol>(`/roles/${id}`, datos)).data;
export const eliminarRol = async (id: number): Promise<Rol> => (await api.delete<Rol>(`/roles/${id}`)).data;

interface RolPermisoRelacion { permiso: import('../../tipos/permiso').Permiso }
interface RolDetalleApi extends Omit<Rol, 'permisos'> { permisos: RolPermisoRelacion[] }
export const obtenerRolDetalle = async (id: number): Promise<Rol> => {
  const detalle = (await api.get<RolDetalleApi>(`/roles/${id}`)).data;
  return { ...detalle, permisos: detalle.permisos.map(relacion => relacion.permiso) };
};
export const asignarPermisosRol = async (id: number, permisosIds: number[]): Promise<Rol> =>
  (await api.put<Rol>(`/roles/${id}/permisos`, { permisosIds })).data;
