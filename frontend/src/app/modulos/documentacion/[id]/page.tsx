"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  PaginaProtegidaDocumentacion,
  PERMISOS_DOC,
  EncabezadoDoc,
  AvisoDoc,
  CargandoDoc,
  EstadoDocumentoBadge,
  PrioridadBadge,
  ClasificacionBadge,
  ModalDoc,
  botonSecundarioDoc,
  tarjetaDoc,
} from "../../../../componentes/documentacion/InterfazDocumentacion";
import WorkflowVisual from "../../../../componentes/documentacion/WorkflowVisual";
import HojaRutaDigital from "../../../../componentes/documentacion/HojaRutaDigital";
import PanelAcciones from "../../../../componentes/documentacion/PanelAcciones";
import SubidaArchivos from "../../../../componentes/documentacion/SubidaArchivos";
import RespuestasExpediente from "../../../../componentes/documentacion/RespuestasExpediente";
import {
  mensajeErrorApi,
  obtenerSeccionesDocumentales,
  obtenerTrazabilidad,
} from "../../../../servicios/documentacion/documentacion.service";
import { Trazabilidad } from "../../../../tipos/documentacion";
import { Seccion } from "../../../../tipos/seccion";
import { useAuth } from "../../../../contextos/AuthContext";
import {
  conectarDocumentacion,
  desconectarDocumentacion,
} from "../../../../servicios/documentacion/documentacion-socket.service";

function DetalleDocumento() {
  const params = useParams<{ id: string }>();
  const idDocumento = Number(params.id);
  const { token } = useAuth();

  const [trazabilidad, setTrazabilidad] = useState<Trazabilidad | null>(null);
  const [secciones, setSecciones] = useState<Seccion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [verHojaRuta, setVerHojaRuta] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const [datos, listaSecciones] = await Promise.all([
        obtenerTrazabilidad(idDocumento),
        obtenerSeccionesDocumentales(),
      ]);
      setTrazabilidad(datos);
      setSecciones(listaSecciones);
    } catch (e) {
      setError(mensajeErrorApi(e));
    } finally {
      setCargando(false);
    }
  }, [idDocumento]);

  useEffect(() => {
    queueMicrotask(() => void cargar());
  }, [cargar]);

  useEffect(() => {
    if (!token) return;
    const socket = conectarDocumentacion(token);
    const alRecibirEvento = (evento: { id_documento: number }) => {
      if (evento.id_documento === idDocumento) void cargar();
    };
    socket.on("documento:evento", alRecibirEvento);
    return () => {
      socket.off("documento:evento", alRecibirEvento);
    };
  }, [token, idDocumento, cargar]);

  useEffect(() => () => desconectarDocumentacion(), []);

  if (cargando) return <CargandoDoc texto="Cargando expediente…" />;
  if (error) return <AvisoDoc tipo="error">{error}</AvisoDoc>;
  if (!trazabilidad) return null;

  const { documento, expediente } = trazabilidad;

  return (
    <div className="space-y-6">
      <EncabezadoDoc
        titulo={`${documento.codigo_interno} — ${documento.tipo_documento.replace("_", " ")}`}
        descripcion={documento.asunto}
      />

      <div className="flex flex-wrap items-center gap-2">
        <PrioridadBadge prioridad={documento.prioridad} />
        <ClasificacionBadge clasificacion={documento.clasificacion} />
        {expediente && (
          <EstadoDocumentoBadge estado={expediente.estado_actual} />
        )}
      </div>

      <section className={`${tarjetaDoc} border-l-4 border-l-[#1b4332]`}>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#52796f]">
          Documento original
        </p>
        <div className="mt-3 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-xs font-semibold text-slate-500">Código</p>
            <p className="font-mono font-bold text-slate-950">{documento.codigo_interno}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500">Tipo</p>
            <p>{documento.tipo_documento.replaceAll("_", " ")}</p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-xs font-semibold text-slate-500">Asunto</p>
            <p>{documento.asunto}</p>
          </div>
        </div>
      </section>

      {expediente && (
        <div className={tarjetaDoc}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-slate-950">
              Hoja de Ruta {expediente.hoja_ruta?.numero ?? ""} — ¿dónde está el
              documento?
            </h2>
            {expediente.hoja_ruta && (
              <button
                type="button"
                className={botonSecundarioDoc}
                onClick={() => setVerHojaRuta(true)}
              >
                Ver Hoja de Ruta
              </button>
            )}
          </div>
          <WorkflowVisual trazabilidad={trazabilidad} />
        </div>
      )}

      <ModalDoc
        abierto={verHojaRuta}
        titulo={`Hoja de Ruta ${expediente?.hoja_ruta?.numero ?? ""}`}
        cerrar={() => setVerHojaRuta(false)}
        ancho="max-w-3xl"
      >
        <HojaRutaDigital trazabilidad={trazabilidad} />
      </ModalDoc>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className={tarjetaDoc}>
          <h2 className="mb-3 text-lg font-bold text-slate-950">Acciones</h2>
          <PanelAcciones
            trazabilidad={trazabilidad}
            secciones={secciones}
            onCambio={cargar}
          />
        </div>

        <div className={tarjetaDoc}>
          <h2 className="mb-3 text-lg font-bold uppercase text-slate-950">
            Archivos del documento original ({documento.archivos?.length ?? 0})
          </h2>
          <SubidaArchivos
            idDocumento={documento.id_documento}
            archivos={documento.archivos ?? []}
            onSubido={cargar}
            seccionActualNombre={expediente?.seccion_actual?.nombre ?? null}
          />
        </div>

        {documento.sintesis && (
          <div className={`${tarjetaDoc} lg:col-span-2`}>
            <h2 className="mb-2 text-lg font-bold text-slate-950">Síntesis</h2>
            <p className="text-sm text-slate-700">{documento.sintesis}</p>
          </div>
        )}

        {expediente?.tipo_atencion_requerida === "RESPUESTA" && (
          <div className={`${tarjetaDoc} lg:col-span-2`}>
            <RespuestasExpediente
              relaciones={documento.relaciones_como_origen ?? []}
              observaciones={expediente.observaciones ?? []}
              estadoExpediente={expediente.estado_actual}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default function Pagina() {
  return (
    <PaginaProtegidaDocumentacion permisos={[PERMISOS_DOC.VER]}>
      <DetalleDocumento />
    </PaginaProtegidaDocumentacion>
  );
}
