"use client";

import { useState } from "react";
import { ArchivoDocumento } from "../../tipos/documentacion";
import { mensajeErrorApi } from "../../servicios/documentacion/documentacion.service";
import { botonSecundarioDoc } from "./InterfazDocumentacion";

export type EstadoCargaArchivo =
  | "PENDIENTE"
  | "SUBIENDO"
  | "SUBIDO"
  | "ERROR";

export interface ArchivoEnCarga {
  clave: string;
  archivo: File;
  estado: EstadoCargaArchivo;
  registro?: ArchivoDocumento;
  error?: string;
}

const FORMATOS_ACEPTADOS = ".pdf,.jpg,.jpeg,.png,.doc,.docx";

export function tamanoArchivo(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function claveArchivo(archivo: File) {
  return [archivo.name, archivo.size, archivo.lastModified].join(":");
}

export function useCargaArchivos() {
  const [items, setItems] = useState<ArchivoEnCarga[]>([]);

  const agregar = (seleccion: FileList | File[] | null) => {
    if (!seleccion) return;
    // FileList está vinculado al input. Se copia antes de limpiar su value para
    // que React no lea posteriormente una selección ya vacía.
    const archivosSeleccionados = Array.from(seleccion);
    if (archivosSeleccionados.length === 0) return;

    setItems((actuales) => {
      const existentes = new Set(actuales.map((item) => item.clave));
      const nuevos: ArchivoEnCarga[] = [];
      for (const archivo of archivosSeleccionados) {
        const clave = claveArchivo(archivo);
        if (existentes.has(clave)) continue;
        existentes.add(clave);
        nuevos.push({ clave, archivo, estado: "PENDIENTE" });
      }
      return [...actuales, ...nuevos];
    });
  };

  const quitar = (clave: string) => {
    setItems((actuales) =>
      actuales.filter(
        (item) =>
          item.clave !== clave ||
          item.estado === "SUBIENDO" ||
          item.estado === "SUBIDO",
      ),
    );
  };

  const subirUno = async (
    item: ArchivoEnCarga,
    cargador: (archivo: File) => Promise<ArchivoDocumento>,
  ) => {
    setItems((actuales) =>
      actuales.map((actual) =>
        actual.clave === item.clave
          ? { ...actual, estado: "SUBIENDO", error: undefined }
          : actual,
      ),
    );
    try {
      const registro = await cargador(item.archivo);
      if (!Number.isInteger(registro?.id_archivo) || registro.id_archivo < 1) {
        throw new Error("El backend no confirmó el identificador del archivo.");
      }
      setItems((actuales) =>
        actuales.map((actual) =>
          actual.clave === item.clave
            ? { ...actual, estado: "SUBIDO", registro, error: undefined }
            : actual,
        ),
      );
      return true;
    } catch (error) {
      const detalle =
        error instanceof Error && error.message.startsWith("El backend")
          ? error.message
          : mensajeErrorApi(error);
      setItems((actuales) =>
        actuales.map((actual) =>
          actual.clave === item.clave
            ? { ...actual, estado: "ERROR", error: detalle }
            : actual,
        ),
      );
      return false;
    }
  };

  const subirPendientes = async (
    cargador: (archivo: File) => Promise<ArchivoDocumento>,
  ) => {
    const candidatos = items.filter((item) =>
      ["PENDIENTE", "ERROR"].includes(item.estado),
    );
    const resultados: boolean[] = [];
    for (const item of candidatos) {
      resultados.push(await subirUno(item, cargador));
    }
    return resultados.every(Boolean);
  };

  return { items, agregar, quitar, subirUno, subirPendientes };
}

export function ListaCargaArchivos({
  carga,
  deshabilitado = false,
  bloquearSeleccion = false,
  onReintentar,
}: {
  carga: ReturnType<typeof useCargaArchivos>;
  deshabilitado?: boolean;
  bloquearSeleccion?: boolean;
  onReintentar?: (item: ArchivoEnCarga) => void | Promise<void>;
}) {
  const haySubiendo = carga.items.some((item) => item.estado === "SUBIENDO");

  return (
    <div className="space-y-3">
      {!bloquearSeleccion && (
        <label
          className={`${botonSecundarioDoc} inline-flex cursor-pointer items-center ${
            deshabilitado || haySubiendo ? "pointer-events-none opacity-50" : ""
          }`}
        >
          Añadir archivos
        <input
          type="file"
          multiple
          accept={FORMATOS_ACEPTADOS}
          disabled={deshabilitado || bloquearSeleccion || haySubiendo}
          className="sr-only"
          onChange={(evento) => {
            carga.agregar(evento.target.files);
            evento.currentTarget.value = "";
          }}
        />
        </label>
      )}

      {carga.items.length > 0 && (
        <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-bold tracking-wide text-slate-700">
            ARCHIVOS SELECCIONADOS ({carga.items.length})
          </p>
          {carga.items.map((item) => (
            <div
              key={item.clave}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-white px-3 py-2 text-sm"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-slate-900">
                  {item.estado === "ERROR" ? "⚠" : "✓"} {item.archivo.name}
                </p>
                {item.estado === "SUBIENDO" && (
                  <p className="mt-1 text-xs text-slate-500">Guardando archivo…</p>
                )}
                {item.error && <p className="mt-1 text-xs text-red-700">{item.error}</p>}
              </div>
              <div className="flex gap-2">
                {item.estado === "ERROR" && onReintentar && (
                  <button
                    type="button"
                    className={botonSecundarioDoc}
                    disabled={deshabilitado}
                    onClick={() => void onReintentar(item)}
                  >
                    Reintentar
                  </button>
                )}
                {["PENDIENTE", "ERROR"].includes(item.estado) && (
                  <button
                    type="button"
                    className={botonSecundarioDoc}
                    disabled={deshabilitado}
                    onClick={() => carga.quitar(item.clave)}
                  >
                    Quitar
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
