export interface Notificacion {
  id_notificacion: number;
  id_usuario_destinatario: number;
  modulo: "ACADEMICO" | "DOCUMENTAL" | "SISTEMA";
  area: string | null;
  tipo: string;
  titulo: string;
  mensaje: string;
  id_referencia: number | null;
  ruta_destino: string | null;
  clave_evento: string;
  leida: boolean;
  fecha_creacion: string;
  fecha_lectura: string | null;
}

export interface ListaNotificaciones {
  data: Notificacion[];
  meta: {
    total: number;
    pagina: number;
    limite: number;
    paginas_totales: number;
  };
}

