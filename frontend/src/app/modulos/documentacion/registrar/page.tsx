"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  PaginaProtegidaDocumentacion,
  PERMISOS_DOC,
  EncabezadoDoc,
  AvisoDoc,
  campoDoc,
  botonPrimarioDoc,
  tarjetaDoc,
} from "../../../../componentes/documentacion/InterfazDocumentacion";
import {
  mensajeErrorApi,
  registrarDocumento,
  subirArchivoDocumento,
} from "../../../../servicios/documentacion/documentacion.service";
import {
  ClasificacionDocumento,
  PrioridadDocumento,
  RegistrarDocumentoInput,
  TipoDocumento,
} from "../../../../tipos/documentacion";
import {
  ListaCargaArchivos,
  useCargaArchivos,
} from "../../../../componentes/documentacion/CargaArchivos";

const TIPOS_DOCUMENTO: TipoDocumento[] = [
  "RADIOGRAMA",
  "MEMORANDUM",
  "OFICIO",
  "NOTA_SERVICIO",
  "INFORME",
  "DIRECTIVA",
  "CIRCULAR",
  "PARTE",
];
const PRIORIDADES: PrioridadDocumento[] = ["RUTINARIO", "URGENTE"];
const CLASIFICACIONES: ClasificacionDocumento[] = [
  "PUBLICO",
  "CONFIDENCIAL",
  "RESERVADO",
  "SECRETO",
];

const inicial: RegistrarDocumentoInput = {
  tipo_documento: "RADIOGRAMA",
  asunto: "",
  numero_origen: "",
  procedencia: "",
  sintesis: "",
  prioridad: "RUTINARIO",
  clasificacion: "PUBLICO",
  fecha_documento: "",
};

function RegistrarDocumentoPagina() {
  const router = useRouter();
  const [datos, setDatos] = useState<RegistrarDocumentoInput>(inicial);
  const carga = useCargaArchivos();
  const [idRegistrado, setIdRegistrado] = useState<number | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const registroIniciado = useRef(false);

  const campo = <K extends keyof RegistrarDocumentoInput>(
    clave: K,
    valor: RegistrarDocumentoInput[K],
  ) => setDatos((actual) => ({ ...actual, [clave]: valor }));

  const enviar = async (evento: React.FormEvent) => {
    evento.preventDefault();
    if (registroIniciado.current) return;
    setError("");
    if (!datos.asunto.trim()) {
      setError("El asunto es obligatorio.");
      return;
    }
    registroIniciado.current = true;
    let documentoCreado = false;
    setGuardando(true);
    try {
      const documento = await registrarDocumento({
        ...datos,
        numero_origen: datos.numero_origen?.trim() || undefined,
        procedencia: datos.procedencia?.trim() || undefined,
        sintesis: datos.sintesis?.trim() || undefined,
        fecha_documento: datos.fecha_documento || undefined,
      });
      documentoCreado = true;
      setIdRegistrado(documento.id_documento);
      const correcto = await carga.subirPendientes((archivo) =>
        subirArchivoDocumento(documento.id_documento, archivo),
      );
      if (!correcto) {
        setError(
          "El documento fue registrado, pero no todos los archivos fueron confirmados. Reintente únicamente los que fallaron.",
        );
        return;
      }
    } catch (e) {
      setError(mensajeErrorApi(e));
    } finally {
      if (!documentoCreado) registroIniciado.current = false;
      setGuardando(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <EncabezadoDoc
        titulo="Registrar documento"
        descripcion="Radio: llene los datos, adjunte el PDF/Word/imagen del documento original y guarde. Después, desde el detalle, podrá enviarlo a Secretaría General."
      />

      {error && <AvisoDoc tipo="error">{error}</AvisoDoc>}
      {idRegistrado &&
        carga.items.every((item) => item.estado === "SUBIDO") && (
          <AvisoDoc tipo="exito">
            Documento registrado correctamente.<br />
            {carga.items.length} {carga.items.length === 1 ? "archivo adjunto guardado" : "archivos adjuntos guardados"}.
          </AvisoDoc>
        )}

      <form onSubmit={enviar} className={`${tarjetaDoc} space-y-4`}>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-semibold text-slate-700">
            Tipo de documento
            <select
              className={`${campoDoc} mt-1`}
              value={datos.tipo_documento}
              onChange={(e) =>
                campo("tipo_documento", e.target.value as TipoDocumento)
              }
            >
              {TIPOS_DOCUMENTO.map((tipo) => (
                <option key={tipo} value={tipo}>
                  {tipo.replace("_", " ")}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm font-semibold text-slate-700">
            Número de origen
            <input
              className={`${campoDoc} mt-1`}
              value={datos.numero_origen}
              onChange={(e) => campo("numero_origen", e.target.value)}
              placeholder="Referencia del remitente (opcional)"
            />
          </label>

          <label className="block text-sm font-semibold text-slate-700">
            Procedencia
            <input
              className={`${campoDoc} mt-1`}
              value={datos.procedencia}
              onChange={(e) => campo("procedencia", e.target.value)}
              placeholder="Institución u oficina de origen (opcional)"
            />
          </label>

          <label className="block text-sm font-semibold text-slate-700">
            Fecha del documento
            <input
              type="date"
              className={`${campoDoc} mt-1`}
              value={datos.fecha_documento}
              onChange={(e) => campo("fecha_documento", e.target.value)}
            />
          </label>

          <label className="block text-sm font-semibold text-slate-700">
            Prioridad
            <select
              className={`${campoDoc} mt-1`}
              value={datos.prioridad}
              onChange={(e) =>
                campo("prioridad", e.target.value as PrioridadDocumento)
              }
            >
              {PRIORIDADES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm font-semibold text-slate-700">
            Clasificación de seguridad
            <select
              className={`${campoDoc} mt-1`}
              value={datos.clasificacion}
              onChange={(e) =>
                campo(
                  "clasificacion",
                  e.target.value as ClasificacionDocumento,
                )
              }
            >
              {CLASIFICACIONES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="block text-sm font-semibold text-slate-700">
          Asunto
          <input
            className={`${campoDoc} mt-1`}
            value={datos.asunto}
            onChange={(e) => campo("asunto", e.target.value)}
            required
          />
        </label>

        <label className="block text-sm font-semibold text-slate-700">
          Síntesis
          <textarea
            className={`${campoDoc} mt-1`}
            rows={3}
            value={datos.sintesis}
            onChange={(e) => campo("sintesis", e.target.value)}
            placeholder="Resumen breve del contenido (opcional)"
          />
        </label>

        <ListaCargaArchivos
          carga={carga}
          deshabilitado={guardando}
          onReintentar={async (item) => {
            if (!idRegistrado) return;
            const correcto = await carga.subirUno(item, (archivo) =>
              subirArchivoDocumento(idRegistrado, archivo),
            );
            if (correcto) setError("");
          }}
        />

        {idRegistrado && (
          <button
            type="button"
            className={botonPrimarioDoc}
            onClick={() =>
              router.push(`/modulos/documentacion/${idRegistrado}`)
            }
          >
            Abrir documento registrado
          </button>
        )}

        <div className="flex justify-end">
          <button type="submit" className={botonPrimarioDoc} disabled={guardando || idRegistrado !== null}>
            {guardando ? "Registrando…" : "Registrar documento"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function Pagina() {
  return (
    <PaginaProtegidaDocumentacion permisos={[PERMISOS_DOC.CREAR]} soloRadio>
      <RegistrarDocumentoPagina />
    </PaginaProtegidaDocumentacion>
  );
}
