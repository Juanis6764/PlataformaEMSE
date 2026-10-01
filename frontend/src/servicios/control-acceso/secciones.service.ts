import api from '../api';
import { Seccion } from '../../tipos/seccion';

export const obtenerSecciones = async (): Promise<Seccion[]> => {
  const response = await api.get<Seccion[]>('/secciones');
  return response.data;
};

export interface DatosSeccion { nombre: string; nivel: number; descripcion?: string; tipo: 'SISTEMA'|'ADMINISTRATIVA'|'ACADEMICA'|'DOCUMENTACION'|'MIXTA'|'FUTURA'; id_seccion_padre?: number }
export const crearSeccion = async (datos: DatosSeccion): Promise<Seccion> => {
  const response = await api.post<Seccion>('/secciones', datos);
  return response.data;
};
export const actualizarSeccion = async (id:number, datos:Partial<DatosSeccion>):Promise<Seccion> => (await api.patch<Seccion>(`/secciones/${id}`,datos)).data;
export const eliminarSeccion = async (id:number):Promise<Seccion> => (await api.delete<Seccion>(`/secciones/${id}`)).data;
