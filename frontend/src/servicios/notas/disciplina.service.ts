import { AxiosError } from "axios";
import api from "../api";
import {
  AcumuladoDisciplina,
  ActualizarRegistroDisciplina,
  CatalogoDisciplina,
  ConfiguracionDisciplina,
  ContextoDisciplina,
  CrearRegistroDisciplina,
  CuadroDemostrativoDisciplina,
  EstadoSemanaDisciplina,
  GestionCadeteDisciplina,
  NivelRevisionDisciplina,
  OficialDisciplina,
  RegistroDisciplina,
  RegistroPublicadoCadete,
  ResultadoFinalDisciplina,
  SemanaDetalleDisciplina,
  SemanaDisciplina,
  TipoDisciplina,
} from "../../tipos/notas/disciplina";

const base = "/notas/disciplina";

export function mensajeErrorApi(error: unknown) {
  if (error instanceof AxiosError) {
    const mensaje = error.response?.data?.message;
    if (Array.isArray(mensaje)) return mensaje.join(" ");
    if (typeof mensaje === "string" && mensaje.trim()) return mensaje;
    if (error.response?.status === 403)
      return "No tiene autorización para realizar esta acción.";
    if (error.response?.status === 409)
      return "La información cambió. Actualice la pantalla y vuelva a intentarlo.";
  }
  return "No se pudo completar la operación.";
}

export const obtenerContextoDisciplina = () =>
  api
    .get<ContextoDisciplina>(`${base}/contexto`)
    .then((respuesta) => respuesta.data);

export const listarConfiguracionesDisciplina = (filtros?: {
  id_periodo?: number;
  id_curso?: number;
  solo_activas?: boolean;
}) =>
  api
    .get<
      ConfiguracionDisciplina[]
    >(`${base}/configuraciones`, { params: filtros })
    .then((respuesta) => respuesta.data);

export const crearConfiguracionDisciplina = (datos: {
  id_periodo: number;
  id_curso: number;
  cantidad_semanas: number;
}) =>
  api
    .post<ConfiguracionDisciplina>(`${base}/configuraciones`, datos)
    .then((respuesta) => respuesta.data);

export const actualizarConfiguracionDisciplina = (
  id: number,
  cantidad_semanas: number,
) =>
  api
    .patch<ConfiguracionDisciplina>(`${base}/configuraciones/${id}`, {
      cantidad_semanas,
    })
    .then((respuesta) => respuesta.data);

export const desactivarConfiguracionDisciplina = (id: number) =>
  api
    .patch<ConfiguracionDisciplina>(`${base}/configuraciones/${id}/desactivar`)
    .then((respuesta) => respuesta.data);

export const listarOficialesDisciplina = (filtros?: {
  solo_activos?: boolean;
  buscar?: string;
}) =>
  api
    .get<OficialDisciplina[]>(`${base}/oficiales`, { params: filtros })
    .then((respuesta) => respuesta.data);

export const crearOficialDisciplina = (datos: {
  codigo: string;
  nombre_completo: string;
}) =>
  api
    .post<OficialDisciplina>(`${base}/oficiales`, datos)
    .then((respuesta) => respuesta.data);

export const actualizarOficialDisciplina = (
  id: number,
  datos: Partial<Pick<OficialDisciplina, "codigo" | "nombre_completo">>,
) =>
  api
    .patch<OficialDisciplina>(`${base}/oficiales/${id}`, datos)
    .then((respuesta) => respuesta.data);

export const cambiarEstadoOficialDisciplina = (id: number, activo: boolean) =>
  api
    .patch<OficialDisciplina>(
      `${base}/oficiales/${id}/${activo ? "reactivar" : "desactivar"}`,
    )
    .then((respuesta) => respuesta.data);

export const listarCatalogosDisciplina = (filtros?: {
  tipo?: TipoDisciplina;
  solo_activos?: boolean;
  buscar?: string;
}) =>
  api
    .get<CatalogoDisciplina[]>(`${base}/catalogos`, { params: filtros })
    .then((respuesta) => respuesta.data);

export const crearCatalogoDisciplina = (datos: {
  tipo: TipoDisciplina;
  codigo: string;
  nombre: string;
  puntaje_base?: string;
}) =>
  api
    .post<CatalogoDisciplina>(`${base}/catalogos`, datos)
    .then((respuesta) => respuesta.data);

export const actualizarCatalogoDisciplina = (
  id: number,
  datos: Partial<{
    tipo: TipoDisciplina;
    codigo: string;
    nombre: string;
    puntaje_base: string;
  }>,
) =>
  api
    .patch<CatalogoDisciplina>(`${base}/catalogos/${id}`, datos)
    .then((respuesta) => respuesta.data);

export const cambiarEstadoCatalogoDisciplina = (id: number, activo: boolean) =>
  api
    .patch<CatalogoDisciplina>(
      `${base}/catalogos/${id}/${activo ? "reactivar" : "desactivar"}`,
    )
    .then((respuesta) => respuesta.data);

export const listarSemanasDisciplina = (filtros?: {
  id_periodo?: number;
  id_curso?: number;
  estado?: EstadoSemanaDisciplina;
  nivel_revision?: NivelRevisionDisciplina;
}) =>
  api
    .get<SemanaDisciplina[]>(`${base}/semanas`, { params: filtros })
    .then((respuesta) => respuesta.data);

export const listarPendientesDisciplina = () =>
  api.get<SemanaDisciplina[]>(`${base}/semanas/pendientes`).then((r) => r.data);

export const crearSemanaDisciplina = (datos: {
  id_periodo: number;
  id_curso: number;
  numero_semana: number;
}) => api.post<SemanaDisciplina>(`${base}/semanas`, datos).then((r) => r.data);

export const obtenerSemanaDisciplina = (id: number) =>
  api.get<SemanaDetalleDisciplina>(`${base}/semanas/${id}`).then((r) => r.data);

export const enviarSemanaDisciplina = (id: number) =>
  api
    .post<SemanaDisciplina>(`${base}/semanas/${id}/enviar`)
    .then((r) => r.data);

export const observarSemanaDisciplina = (id: number, comentario: string) =>
  api
    .post<SemanaDisciplina>(`${base}/semanas/${id}/observar`, { comentario })
    .then((r) => r.data);

export const aprobarSemanaDisciplina = (id: number) =>
  api
    .post<SemanaDisciplina>(`${base}/semanas/${id}/aprobar`)
    .then((r) => r.data);

export const marcarSemanaRevisadaDisciplina = (id: number) =>
  api
    .post<SemanaDisciplina>(`${base}/semanas/${id}/marcar-revisada`)
    .then((r) => r.data);

export const publicarSemanaDisciplina = (id: number) =>
  api
    .post<SemanaDisciplina>(`${base}/semanas/${id}/publicar`)
    .then((r) => r.data);

export const crearRegistroDisciplina = (
  idSemana: number,
  datos: CrearRegistroDisciplina,
) =>
  api
    .post<RegistroDisciplina>(`${base}/semanas/${idSemana}/registros`, datos)
    .then((r) => r.data);

export const actualizarRegistroDisciplina = (
  id: number,
  datos: ActualizarRegistroDisciplina,
) =>
  api
    .patch<RegistroDisciplina>(`${base}/registros/${id}`, datos)
    .then((r) => r.data);

export const eliminarRegistroDisciplina = (id: number) =>
  api
    .delete<{
      eliminado: boolean;
      id_registro: number;
    }>(`${base}/registros/${id}`)
    .then((r) => r.data);

export const modificarRegistroExtraordinario = (
  id: number,
  datos: ActualizarRegistroDisciplina & { justificacion: string },
) =>
  api
    .patch<RegistroDisciplina>(`${base}/registros/${id}/extraordinaria`, datos)
    .then((r) => r.data);

export const modificarResultadoFinalDisciplinaExtraordinario = (
  idResultado: number,
  notaFinal: string,
  justificacion: string,
) =>
  api
    .patch(`${base}/resultados-finales/${idResultado}/extraordinaria`, {
      nota_final: notaFinal,
      justificacion,
    })
    .then((r) => r.data);

export const consultarAcumuladoDisciplina = (filtros: {
  id_gestion: number;
  id_periodo: number;
  id_curso: number;
  fecha_inicial?: string;
  fecha_final?: string;
}) =>
  api
    .get<AcumuladoDisciplina>(`${base}/acumulado`, { params: filtros })
    .then((r) => r.data);

export const consultarCuadroDemostrativoDisciplina = (filtros: {
  id_gestion: number;
  id_periodo: number;
}) =>
  api
    .get<CuadroDemostrativoDisciplina>(`${base}/cuadro-demostrativo`, {
      params: filtros,
    })
    .then((r) => r.data);

export interface SeleccionResultadoFinalDisciplina {
  id_gestion: number;
  id_periodo: number;
  id_curso: number;
}

export const consultarResultadoFinalDisciplina = (
  filtros: SeleccionResultadoFinalDisciplina,
) =>
  api
    .get<ResultadoFinalDisciplina>(`${base}/resultados-finales`, {
      params: filtros,
    })
    .then((r) => r.data);

export const publicarResultadoFinalDisciplina = (
  datos: SeleccionResultadoFinalDisciplina,
) =>
  api
    .post<ResultadoFinalDisciplina>(
      `${base}/resultados-finales/publicar`,
      datos,
    )
    .then((r) => r.data);

export const enviarResultadoFinalEvaluaciones = (
  datos: SeleccionResultadoFinalDisciplina,
) =>
  api
    .post<ResultadoFinalDisciplina>(
      `${base}/resultados-finales/enviar-evaluaciones`,
      datos,
    )
    .then((r) => r.data);

export const listarMisGestionesDisciplina = () =>
  api
    .get<GestionCadeteDisciplina[]>(`${base}/mis-gestiones`)
    .then((r) => r.data);

export const listarMisRegistrosDisciplina = (filtros?: {
  id_gestion?: number;
  id_periodo?: number;
}) =>
  api
    .get<
      RegistroPublicadoCadete[]
    >(`${base}/mis-registros`, { params: filtros })
    .then((r) => r.data);
