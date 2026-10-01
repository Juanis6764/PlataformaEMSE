import api from "./api";
import { GestionAcademicaAdmin, PeriodoLectivo } from "../tipos/gestion-academica";

const base = "/gestion-academica";

export const listarGestionesAdmin = () =>
  api.get<GestionAcademicaAdmin[]>(`${base}/gestiones`).then(r => r.data);

export const crearGestionAdmin = (ano: number) =>
  api.post<GestionAcademicaAdmin>(`${base}/gestiones`, { ano }).then(r => r.data);

export const actualizarEstadoGestionAdmin = (id: number, estado: "PLANIFICACION" | "ACTIVA" | "CERRADA") =>
  api.patch<GestionAcademicaAdmin>(`${base}/gestiones/${id}`, { estado }).then(r => r.data);

export const activarPeriodoAdmin = (idPeriodo: number) =>
  api.patch<PeriodoLectivo>(`${base}/periodos/${idPeriodo}/activar`).then(r => r.data);

export const obtenerPeriodoActivoAdmin = () =>
  api.get<(PeriodoLectivo & { gestion: { ano: number } }) | null>(`${base}/periodo-activo`).then(r => r.data);
