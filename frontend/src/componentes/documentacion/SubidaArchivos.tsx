"use client";

import { useState } from "react";
import {
  descargarArchivoDocumento,
  mensajeErrorApi,
  subirArchivoDocumento,
  visualizarArchivoDocumento,
} from "../../servicios/documentacion/documentacion.service";
import { ArchivoDocumento } from "../../tipos/documentacion";
import { AvisoDoc, botonPrimarioDoc, botonSecundarioDoc } from "./InterfazDocumentacion";
import { useAuth } from "../../contextos/AuthContext";
import { PERMISOS_DOC } from "./InterfazDocumentacion";
import {
  ListaCargaArchivos,
  tamanoArchivo,
  useCargaArchivos,
} from "./CargaArchivos";

function abrirBlob(blob: Blob, nombre: string, descargar: boolean) {
  const url = URL.createObjectURL(blob);
  if (descargar) {
    const enlace = document.createElement("a");
    enlace.href = url;
    enlace.download = nombre;
    enlace.click();
  } else {
    window.open(url, "_blank", "noopener,noreferrer");
  }
  // El navegador necesita un instante para abrir/descargar antes de liberar el objeto.
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

export default function SubidaArchivos({
  idDocumento,
  archivos,
  onSubido,
  seccionActualNombre,
}: {
  idDocumento: number;
  archivos: ArchivoDocumento[];
  onSubido: () => void | Promise<void>;
  /**
   * Nombre de la sección que tiene actualmente el expediente
   * (`expediente.seccion_actual.nombre`), o `null` si el documento no
   * tiene expediente propio (respuesta/anexo, sin restricción de sección
   * — backend tampoco la exige en ese caso, ver ArchivosService.subir).
   */
  seccionActualNombre?: string | null;
}) {
  const { tienePermiso, usuario } = useAuth();
  const carga = useCargaArchivos();
  const enMiSeccion =
    !seccionActualNombre || seccionActualNombre === usuario?.seccion;
  const [subiendo, setSubiendo] = useState(false);
  const [procesandoId, setProcesandoId] = useState<number | null>(null);
  const [error, setError] = useState("");

  const subir = async () => {
    if (carga.items.length === 0) return;
    setSubiendo(true);
    setError("");
    try {
      const correcto = await carga.subirPendientes((archivo) =>
        subirArchivoDocumento(idDocumento, archivo),
      );
      await onSubido();
      if (!correcto) {
        setError("No todos los archivos fueron confirmados. Reintente únicamente los que fallaron.");
      }
    } catch (e) {
      setError(mensajeErrorApi(e));
    } finally {
      setSubiendo(false);
    }
  };

  const abrir = async (archivo: ArchivoDocumento, descargar: boolean) => {
    setProcesandoId(archivo.id_archivo);
    setError("");
    try {
      const blob = descargar
        ? await descargarArchivoDocumento(idDocumento, archivo.id_archivo)
        : await visualizarArchivoDocumento(idDocumento, archivo.id_archivo);
      abrirBlob(blob, archivo.nombre_original, descargar);
    } catch (e) {
      setError(mensajeErrorApi(e));
    } finally {
      setProcesandoId(null);
    }
  };

  return (
    <div className="space-y-3">
      {error && <AvisoDoc tipo="error">{error}</AvisoDoc>}

      {archivos.length === 0 ? (
        <p className="text-sm text-slate-500">No se registraron archivos adjuntos.</p>
      ) : (
        <ul className="space-y-2">
          {archivos.map((a) => (
            <li
              key={a.id_archivo}
              className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-2.5 text-sm"
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-slate-900">{a.nombre_original}</p>
                <p className="text-xs text-slate-500">
                  {a.tipo_mime} · {tamanoArchivo(a.tamano_bytes)} · {new Intl.DateTimeFormat("es-BO", {
                    dateStyle: "medium",
                    timeStyle: "short",
                    timeZone: "America/La_Paz",
                  }).format(new Date(a.fecha_hora_subida))}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                {tienePermiso(PERMISOS_DOC.IMPRIMIR) && (
                  <button
                    type="button"
                    className={botonSecundarioDoc}
                    disabled={procesandoId === a.id_archivo}
                    onClick={() => abrir(a, false)}
                  >
                    Ver
                  </button>
                )}
                {tienePermiso(PERMISOS_DOC.DESCARGAR) && (
                  <button
                    type="button"
                    className={botonSecundarioDoc}
                    disabled={procesandoId === a.id_archivo}
                    onClick={() => abrir(a, true)}
                  >
                    Descargar
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {enMiSeccion ? (
        <div className="space-y-3 border-t border-slate-100 pt-3">
          <ListaCargaArchivos
            carga={carga}
            deshabilitado={subiendo}
            onReintentar={async (item) => {
              const correcto = await carga.subirUno(item, (archivo) =>
                subirArchivoDocumento(idDocumento, archivo),
              );
              if (correcto) setError("");
              await onSubido();
            }}
          />
          <button
            type="button"
            className={botonPrimarioDoc}
            disabled={subiendo || !carga.items.some((item) => ["PENDIENTE", "ERROR"].includes(item.estado))}
            onClick={subir}
          >
            {subiendo ? "Subiendo…" : "Subir archivos"}
          </button>
        </div>
      ) : (
        <p className="border-t border-slate-100 pt-3 text-xs text-slate-400">
          El expediente no está actualmente en su sección ({seccionActualNombre}); no puede adjuntar archivos.
        </p>
      )}
      {enMiSeccion && (
        <p className="text-xs text-slate-400">Formatos aceptados: PDF, JPG, JPEG, PNG, DOC, DOCX.</p>
      )}
    </div>
  );
}
