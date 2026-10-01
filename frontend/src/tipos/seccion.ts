export interface Seccion {
  id_seccion: number;
  nombre: string;
  descripcion?: string;
  nivel: number;
  estado: boolean;
  tipo: 'SISTEMA' | 'ADMINISTRATIVA' | 'ACADEMICA' | 'DOCUMENTACION';
  id_seccion_padre?: number | null;
}
