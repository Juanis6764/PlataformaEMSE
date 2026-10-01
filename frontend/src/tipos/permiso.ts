export interface Permiso {
  id_permiso: number;
  nombre: string;
  modulo: string;
  accion: string;
  descripcion?: string;
  estado: boolean;
}
