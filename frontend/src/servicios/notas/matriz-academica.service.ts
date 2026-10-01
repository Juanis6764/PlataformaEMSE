import api from "../api";
import {
  ExpedienteCorreccionExtraordinaria,
  MatrizAcademica,
  MatrizPropiaAcademica,
  TipoMatrizAcademica,
} from "../../tipos/notas/matriz-academica";

const base = "/notas/matrices-academicas";

export interface SeleccionMatrizAcademica {
  id_gestion: number;
  id_periodo: number;
  id_curso: number;
  tipo: TipoMatrizAcademica;
}

export const consultarMatrizAcademica = (filtros: SeleccionMatrizAcademica) =>
  api.get<MatrizAcademica>(base, { params: filtros }).then((r) => r.data);

export const generarMatrizAcademica = (datos: SeleccionMatrizAcademica) =>
  api.post<MatrizAcademica>(`${base}/generar`, datos).then((r) => r.data);

export const enviarMatrizAcademica = (id: number) =>
  api.post<MatrizAcademica>(`${base}/${id}/enviar`).then((r) => r.data);

export const aprobarMatrizAcademica = (id: number) =>
  api.post<MatrizAcademica>(`${base}/${id}/aprobar`).then((r) => r.data);

export const observarMatrizAcademica = (id: number, observacion: string) =>
  api
    .post<MatrizAcademica>(`${base}/${id}/observar`, { observacion })
    .then((r) => r.data);

export const publicarMatrizAcademica = (id: number) =>
  api.post<MatrizAcademica>(`${base}/${id}/publicar`).then((r) => r.data);

export const listarMisMatricesAcademicas = () =>
  api.get<MatrizPropiaAcademica[]>(`${base}/mis-matrices`).then((r) => r.data);

export const registrarAntecedenteAcademico = (datos: {
  id_cadete: number;
  gestion: number;
  promedio_general: string;
  cantidad_aplazos: number;
}) => api.post(`${base}/antecedentes`, datos).then((r) => r.data);

export const buscarCorreccionesExtraordinarias = (filtros: {
  id_gestion: number;
  id_periodo: number;
  id_curso: number;
  q?: string;
}) =>
  api
    .get<ExpedienteCorreccionExtraordinaria>(`${base}/correcciones/buscar`, {
      params: filtros,
    })
    .then((r) => r.data);
