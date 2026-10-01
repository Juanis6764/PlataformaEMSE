import api from "../api";
import { mensajeErrorApi } from "./disciplina.service";
import {
  ContextoEntrenamiento,
  DetallePlanillaEntrenamiento,
  EstadoPlanillaEntrenamiento,
  ResumenPlanillaEntrenamiento,
  ResultadoEntrenamientoParaEvaluaciones,
  SeleccionEntrenamiento,
} from "../../tipos/notas/entrenamiento-fisico";

const base = "/notas/entrenamiento-fisico";

export { mensajeErrorApi };

export const obtenerContextoEntrenamiento = () =>
  api.get<ContextoEntrenamiento>(`${base}/contexto`).then((r) => r.data);

export const consultarPlanillaEntrenamiento = (
  seleccion: SeleccionEntrenamiento,
) =>
  api
    .get<DetallePlanillaEntrenamiento>(`${base}/planilla`, {
      params: seleccion,
    })
    .then((r) => r.data);

export const listarPlanillasEntrenamiento = (filtros?: {
  id_gestion?: number;
  id_periodo?: number;
  id_curso?: number;
  estado?: EstadoPlanillaEntrenamiento;
}) =>
  api
    .get<ResumenPlanillaEntrenamiento[]>(`${base}/planillas`, {
      params: filtros,
    })
    .then((r) => r.data);

export const listarPendientesEntrenamiento = () =>
  api
    .get<ResumenPlanillaEntrenamiento[]>(`${base}/planillas/pendientes`)
    .then((r) => r.data);

export const guardarNotasEntrenamiento = (
  seleccion: SeleccionEntrenamiento,
  notas: Array<{ id_cadete: number; nota_final: string }>,
) =>
  api
    .put<DetallePlanillaEntrenamiento>(`${base}/planillas/notas`, {
      ...seleccion,
      notas,
    })
    .then((r) => r.data);

export const enviarPlanillaEntrenamiento = (idPlanilla: number) =>
  api
    .post<DetallePlanillaEntrenamiento>(
      `${base}/planillas/${idPlanilla}/enviar`,
    )
    .then((r) => r.data);

export const observarPlanillaEntrenamiento = (
  idPlanilla: number,
  comentario: string,
) =>
  api
    .post<DetallePlanillaEntrenamiento>(
      `${base}/planillas/${idPlanilla}/observar`,
      { comentario },
    )
    .then((r) => r.data);

export const aprobarPlanillaEntrenamiento = (idPlanilla: number) =>
  api
    .post<DetallePlanillaEntrenamiento>(
      `${base}/planillas/${idPlanilla}/aprobar`,
    )
    .then((r) => r.data);

export const marcarPlanillaRevisadaEntrenamiento = (idPlanilla: number) =>
  api
    .post<DetallePlanillaEntrenamiento>(
      `${base}/planillas/${idPlanilla}/marcar-revisada`,
    )
    .then((r) => r.data);

export const modificarNotaExtraordinariaEntrenamiento = (
  idNota: number,
  notaFinal: string,
  justificacion: string,
) =>
  api
    .patch(`${base}/notas/${idNota}/extraordinaria`, {
      nota_final: notaFinal,
      justificacion,
    })
    .then((r) => r.data);

export const enviarResultadosEntrenamientoEvaluaciones = (
  idPlanilla: number,
) =>
  api
    .post<{
      id_planilla: number;
      cantidad: number;
      ya_enviado: boolean;
    }>(`${base}/planillas/${idPlanilla}/enviar-evaluaciones`)
    .then((r) => r.data);

export const consultarResultadosEntrenamientoParaEvaluaciones = (
  idPlanilla?: number,
) =>
  api
    .get<ResultadoEntrenamientoParaEvaluaciones[]>(
      `${base}/resultados-evaluaciones`,
      { params: { id_planilla: idPlanilla } },
    )
    .then((r) => r.data);
