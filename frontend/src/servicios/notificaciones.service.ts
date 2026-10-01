import api from "./api";
import { ListaNotificaciones, Notificacion } from "../tipos/notificacion";

export const contarNotificacionesNoLeidas = () =>
  api
    .get<{ total: number }>("/notificaciones/no-leidas/conteo")
    .then((respuesta) => respuesta.data.total);

export const listarNotificaciones = (filtros?: {
  pagina?: number;
  limite?: number;
  leida?: boolean;
  modulo?: "ACADEMICO" | "DOCUMENTAL" | "SISTEMA";
  area?: string;
  tipo?: string;
}) =>
  api
    .get<ListaNotificaciones>("/notificaciones", { params: filtros })
    .then((respuesta) => respuesta.data);

export const marcarNotificacionLeida = (id: number) =>
  api
    .patch<Notificacion>(`/notificaciones/${id}/leida`)
    .then((respuesta) => respuesta.data);

export const marcarTodasNotificacionesLeidas = () =>
  api
    .patch<{ count: number }>("/notificaciones/leidas/todas")
    .then((respuesta) => respuesta.data);
