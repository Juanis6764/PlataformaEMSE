import api from "../api";
import {
  ConfiguracionEvaluaciones,
  ContextoEvaluaciones,
  DetalleMateriaEvaluacion,
  EstadoMateriaEvaluacion,
  GuardarNotaEvaluacion,
  MateriaEvaluacion,
  MatrizEvaluaciones,
  NivelRevisionEvaluacion,
  NotaPropiaEvaluacion,
  RespuestaGuardarNotasEvaluacion,
  ResultadosRecibidosEvaluaciones,
  ResultadosEvaluaciones,
} from "../../tipos/notas/evaluaciones";
import { mensajeErrorApi } from "./disciplina.service";

const base = "/notas/evaluaciones";

export { mensajeErrorApi };

export const obtenerContextoEvaluaciones = () =>
  api.get<ContextoEvaluaciones>(`${base}/contexto`).then((r) => r.data);

export const listarConfiguracionesEvaluaciones = (filtros?: {
  id_gestion?: number;
  id_periodo?: number;
  id_curso?: number;
  solo_activas?: boolean;
}) =>
  api
    .get<ConfiguracionEvaluaciones[]>(`${base}/configuraciones`, {
      params: filtros,
    })
    .then((r) => r.data);

export const crearConfiguracionEvaluaciones = (datos: {
  id_periodo: number;
  id_curso: number;
  cantidad_materias: number;
}) =>
  api
    .post<ConfiguracionEvaluaciones>(`${base}/configuraciones`, datos)
    .then((r) => r.data);

export const actualizarConfiguracionEvaluaciones = (
  id: number,
  cantidad_materias: number,
) =>
  api
    .patch<ConfiguracionEvaluaciones>(`${base}/configuraciones/${id}`, {
      cantidad_materias,
    })
    .then((r) => r.data);

export const listarMateriasEvaluaciones = (filtros?: {
  id_gestion?: number;
  id_periodo?: number;
  id_curso?: number;
  estado?: EstadoMateriaEvaluacion;
  nivel_revision?: NivelRevisionEvaluacion;
}) =>
  api
    .get<MateriaEvaluacion[]>(`${base}/materias`, { params: filtros })
    .then((r) => r.data);

export const listarPendientesEvaluaciones = () =>
  api.get<MateriaEvaluacion[]>(`${base}/materias/pendientes`).then((r) => r.data);

export const crearMateriaEvaluacion = (datos: {
  id_periodo: number;
  id_curso: number;
  nombre: string;
}) =>
  api.post<MateriaEvaluacion>(`${base}/materias`, datos).then((r) => r.data);

export const obtenerMateriaEvaluacion = (id: number) =>
  api
    .get<DetalleMateriaEvaluacion>(`${base}/materias/${id}`)
    .then((r) => r.data);

export const guardarNotasEvaluacion = (
  idMateria: number,
  notas: GuardarNotaEvaluacion[],
) =>
  api
    .put<RespuestaGuardarNotasEvaluacion>(
      `${base}/materias/${idMateria}/notas`,
      { notas },
    )
    .then((r) => r.data);

export const enviarMateriaEvaluacion = (id: number) =>
  api.post<MateriaEvaluacion>(`${base}/materias/${id}/enviar`).then((r) => r.data);

export const observarMateriaEvaluacion = (id: number, comentario: string) =>
  api
    .post<MateriaEvaluacion>(`${base}/materias/${id}/observar`, { comentario })
    .then((r) => r.data);

export const aprobarMateriaEvaluacion = (id: number) =>
  api.post<MateriaEvaluacion>(`${base}/materias/${id}/aprobar`).then((r) => r.data);

export const marcarMateriaRevisadaEvaluacion = (id: number) =>
  api
    .post<MateriaEvaluacion>(`${base}/materias/${id}/marcar-revisada`)
    .then((r) => r.data);

export const publicarMateriaEvaluacion = (id: number) =>
  api.post<MateriaEvaluacion>(`${base}/materias/${id}/publicar`).then((r) => r.data);

export const modificarNotaExtraordinariaEvaluacion = (
  idNota: number,
  datos: {
    nota_inicial?: string;
    nota_desquite?: string | null;
    justificacion: string;
  },
) =>
  api.patch(`${base}/notas/${idNota}/extraordinaria`, datos).then((r) => r.data);

export interface SeleccionConsultaEvaluaciones {
  id_gestion: number;
  id_periodo: number;
  id_curso: number;
}

export const consultarMatrizEvaluaciones = (
  filtros: SeleccionConsultaEvaluaciones,
) => api.get<MatrizEvaluaciones>(`${base}/matriz`, { params: filtros }).then((r) => r.data);

export const consultarResultadosEvaluaciones = (
  filtros: SeleccionConsultaEvaluaciones,
) =>
  api
    .get<ResultadosEvaluaciones>(`${base}/resultados`, { params: filtros })
    .then((r) => r.data);

export const consultarResultadosRecibidosEvaluaciones = (
  filtros: SeleccionConsultaEvaluaciones,
) =>
  api
    .get<ResultadosRecibidosEvaluaciones>(`${base}/resultados-recibidos`, {
      params: filtros,
    })
    .then((r) => r.data);

export const listarMisNotasEvaluaciones = (filtros?: {
  id_gestion?: number;
  id_periodo?: number;
}) =>
  api
    .get<NotaPropiaEvaluacion[]>(`${base}/mis-notas`, { params: filtros })
    .then((r) => r.data);
