import { AxiosError } from "axios";
import api from "../api";
import {
  ArchivoDocumento,
  CumplimientoDocumento,
  Documento,
  DocumentoRelacionado,
  EditarProveidoInput,
  EnviarDocumentoInput,
  FiltrosReporteDocumental,
  HojaRuta,
  MovimientoDocumento,
  Proveido,
  RegistrarDocumentoInput,
  RegistrarProveidoInput,
  ReporteControlPlazos,
  ReporteSeguimientoInstitucional,
  FiltrosSeguimientoDocumental,
  SeguimientoDocumental,
  Trazabilidad,
} from "../../tipos/documentacion";
import { Seccion } from "../../tipos/seccion";

const base = "/documentacion";

export function mensajeErrorApi(error: unknown) {
  if (error instanceof AxiosError) {
    // 403: nunca mostrar el texto técnico del backend (p. ej. "Permiso
    // requerido: X" o "Su sección/rol no puede ejecutar esta acción...").
    // El backend sigue siendo la protección real; la interfaz solo informa
    // en términos institucionales, sin nombres de permisos.
    if (error.response?.status === 403)
      return "No tiene autorización para realizar esta acción.";
    const mensaje = error.response?.data?.message;
    if (Array.isArray(mensaje)) return mensaje.join(" ");
    if (typeof mensaje === "string" && mensaje.trim()) return mensaje;
    if (error.response?.status === 409)
      return "El expediente cambió de estado. Actualice la pantalla y vuelva a intentarlo.";
  }
  return "No se pudo completar la operación.";
}

// ── Documentos ────────────────────────────────────────────────────

export const registrarDocumento = (datos: RegistrarDocumentoInput) =>
  api.post<Documento>(`${base}/documentos`, datos).then((r) => r.data);

export const listarDocumentos = () =>
  api.get<Documento[]>(`${base}/documentos`).then((r) => r.data);

export const obtenerDocumento = (idDocumento: number) =>
  api.get<Documento>(`${base}/documentos/${idDocumento}`).then((r) => r.data);

export const crearRespuesta = (
  idDocumento: number,
  datos: RegistrarDocumentoInput,
) =>
  api
    .post<{
      respuesta: Documento;
      relacion: DocumentoRelacionado;
    }>(`${base}/documentos/${idDocumento}/respuesta`, datos)
    .then((r) => r.data);

// ── Movimientos ───────────────────────────────────────────────────

export const enviarDocumento = (
  idDocumento: number,
  datos: EnviarDocumentoInput,
) =>
  api
    .post<{
      expediente: Documento["expediente"];
      movimiento: MovimientoDocumento;
    }>(`${base}/documentos/${idDocumento}/enviar`, datos)
    .then((r) => r.data);

export const recibirMovimiento = (idMovimiento: number, observacion?: string) =>
  api
    .post<{
      expediente: Documento["expediente"];
      movimiento: MovimientoDocumento;
    }>(`${base}/movimientos/${idMovimiento}/recibir`, { observacion })
    .then((r) => r.data);

export const listarMovimientosPendientes = () =>
  api
    .get<MovimientoDocumento[]>(`${base}/movimientos/pendientes`)
    .then((r) => r.data);

// ── Hoja de ruta y proveídos ──────────────────────────────────────

export const asignarHojaRuta = (idDocumento: number) =>
  api
    .post<HojaRuta>(`${base}/documentos/${idDocumento}/hoja-ruta`)
    .then((r) => r.data);

export const registrarProveido = (
  idHojaRuta: number,
  datos: RegistrarProveidoInput,
) =>
  api
    .post<Proveido>(`${base}/hojas-ruta/${idHojaRuta}/proveidos`, datos)
    .then((r) => r.data);

/** Solo COMANDO, y solo mientras no exista el segundo proveído. */
export const editarPrimerProveido = (
  idHojaRuta: number,
  datos: EditarProveidoInput,
) =>
  api
    .patch<Proveido>(
      `${base}/hojas-ruta/${idHojaRuta}/proveidos/primero`,
      datos,
    )
    .then((r) => r.data);

// ── Cumplimiento y respuesta (ver crearRespuesta arriba) ─────────

export const registrarCumplimiento = (
  idDocumento: number,
  descripcion: string,
) =>
  api
    .post<CumplimientoDocumento>(`${base}/documentos/${idDocumento}/cumplimiento`, { descripcion })
    .then((r) => r.data);

// ── Revisión y cierre ─────────────────────────────────────────────

export const aprobarDocumento = (idDocumento: number) =>
  api
    .post<Documento["expediente"]>(`${base}/documentos/${idDocumento}/aprobar`)
    .then((r) => r.data);

export const observarDocumento = (idDocumento: number, comentario: string) =>
  api
    .post(`${base}/documentos/${idDocumento}/observar`, { comentario })
    .then((r) => r.data);

export const subsanarDocumento = (idDocumento: number, comentario?: string) =>
  api
    .post(`${base}/documentos/${idDocumento}/subsanar`, { comentario })
    .then((r) => r.data);

export const finalizarDocumento = (idDocumento: number) =>
  api
    .post<
      Documento["expediente"]
    >(`${base}/documentos/${idDocumento}/finalizar`)
    .then((r) => r.data);

export const archivarDocumento = (idDocumento: number) =>
  api
    .post<Documento["expediente"]>(`${base}/documentos/${idDocumento}/archivar`)
    .then((r) => r.data);

// ── Archivos ──────────────────────────────────────────────────────

export const subirArchivoDocumento = (
  idDocumento: number,
  archivo: File,
  idCumplimiento?: number,
) => {
  const formData = new FormData();
  formData.append("archivo", archivo);
  return api
    .post<ArchivoDocumento>(`${base}/documentos/${idDocumento}/archivos`, formData, {
      params: idCumplimiento ? { id_cumplimiento: idCumplimiento } : undefined,
      // La instancia de Axios fija Content-Type: application/json por
      // defecto; hay que quitarlo explícitamente para que el navegador
      // arme el header multipart/form-data con el boundary correcto.
      headers: { "Content-Type": undefined },
    })
    .then((r) => r.data);
};

const obtenerArchivoBlob = (
  idDocumento: number,
  idArchivo: number,
  accion: "visualizar" | "descargar",
) =>
  api
    .get(`${base}/documentos/${idDocumento}/archivos/${idArchivo}/${accion}`, {
      responseType: "blob",
    })
    .then((r) => r.data as Blob);

export const visualizarArchivoDocumento = (
  idDocumento: number,
  idArchivo: number,
) => obtenerArchivoBlob(idDocumento, idArchivo, "visualizar");

export const descargarArchivoDocumento = (
  idDocumento: number,
  idArchivo: number,
) => obtenerArchivoBlob(idDocumento, idArchivo, "descargar");

// ── Trazabilidad y reportes ───────────────────────────────────────

export const obtenerTrazabilidad = (idDocumento: number) =>
  api
    .get<Trazabilidad>(`${base}/documentos/${idDocumento}/trazabilidad`)
    .then((r) => r.data);

export const obtenerSeguimientoInstitucional = (
  filtros?: FiltrosReporteDocumental,
) =>
  api
    .get<ReporteSeguimientoInstitucional>(
      `${base}/reportes/seguimiento-institucional`,
      { params: filtros },
    )
    .then((r) => r.data);

export const obtenerSeguimientoDocumental = (
  filtros?: FiltrosSeguimientoDocumental,
) =>
  api
    .get<SeguimientoDocumental>(`${base}/reportes/seguimiento`, {
      params: filtros,
    })
    .then((r) => r.data);

export const obtenerControlPlazos = (filtros?: FiltrosReporteDocumental) =>
  api
    .get<ReporteControlPlazos>(`${base}/reportes/control-plazos`, {
      params: filtros,
    })
    .then((r) => r.data);

// ── Secciones (espejo de solo lectura, gateado por DOC_VER_DOCUMENTOS) ──
// No usar el servicio de Control de Acceso (/secciones, GESTIONAR_SECCIONES)
// desde el módulo documental: ningún rol documental tiene ese permiso.
export const obtenerSeccionesDocumentales = () =>
  api.get<Seccion[]>(`${base}/secciones`).then((r) => r.data);
