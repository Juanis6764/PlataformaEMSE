import { Permiso } from './permiso';

export interface Rol {
  id_rol: number;
  nombre: string;
  descripcion?: string;
  estado: boolean;
  permisos?: Array<Permiso & { permiso?: Permiso }>;
}
