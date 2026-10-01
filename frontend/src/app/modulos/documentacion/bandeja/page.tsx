"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  PaginaProtegidaDocumentacion,
  PERMISOS_DOC,
  EncabezadoDoc,
  AvisoDoc,
  CargandoDoc,
  VacioDoc,
  EstadoDocumentoBadge,
  PrioridadBadge,
  botonPrimarioDoc,
  botonSecundarioDoc,
  campoDoc,
  tarjetaDoc,
  fechaLegibleDoc,
  esRadioDocumental,
} from "../../../../componentes/documentacion/InterfazDocumentacion";
import {
  listarDocumentos,
  listarMovimientosPendientes,
  mensajeErrorApi,
  obtenerSeccionesDocumentales,
  recibirMovimiento,
} from "../../../../servicios/documentacion/documentacion.service";
import {
  Documento,
  MovimientoDocumento,
} from "../../../../tipos/documentacion";
import { useAuth } from "../../../../contextos/AuthContext";
import {
  conectarDocumentacion,
  desconectarDocumentacion,
} from "../../../../servicios/documentacion/documentacion-socket.service";

const ETIQUETA_TIPO_MOVIMIENTO: Record<string, string> = {
  DEVOLUCION: "Devuelto por observación",
  REENVIO: "Corrección reenviada",
  DERIVACION: "Derivado",
};

function BandejaDocumental() {
  const { token, tienePermiso, usuario } = useAuth();
  const esRadio = esRadioDocumental(usuario);
  const [pendientes, setPendientes] = useState<MovimientoDocumento[]>([]);
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [nombresSeccion, setNombresSeccion] = useState<Record<number, string>>(
    {},
  );
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [recibiendo, setRecibiendo] = useState<number | null>(null);
  const [busqueda, setBusqueda] = useState("");

  const cargar = useCallback(async () => {
    try {
      const [listaPendientes, listaDocumentos, secciones] = await Promise.all([
        listarMovimientosPendientes(),
        listarDocumentos(),
        obtenerSeccionesDocumentales(),
      ]);
      setPendientes(listaPendientes);
      setDocumentos(listaDocumentos);
      setNombresSeccion(
        Object.fromEntries(secciones.map((s) => [s.id_seccion, s.nombre])),
      );
    } catch (e) {
      setError(mensajeErrorApi(e));
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => void cargar());
  }, [cargar]);

  // Tiempo real (con fallback de refresco cada 30s si el socket está caído).
  useEffect(() => {
    if (!token) return;
    const socket = conectarDocumentacion(token);
    const alRecibirEvento = () => void cargar();
    socket.on("documento:evento", alRecibirEvento);
    const respaldo = window.setInterval(() => {
      if (!socket.connected) void cargar();
    }, 30_000);
    return () => {
      socket.off("documento:evento", alRecibirEvento);
      window.clearInterval(respaldo);
    };
  }, [token, cargar]);

  useEffect(() => () => desconectarDocumentacion(), []);

  const recibir = async (idMovimiento: number) => {
    setRecibiendo(idMovimiento);
    setError("");
    try {
      await recibirMovimiento(idMovimiento);
      await cargar();
    } catch (e) {
      setError(mensajeErrorApi(e));
    } finally {
      setRecibiendo(null);
    }
  };

  const documentosFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    if (!texto) return documentos;
    return documentos.filter(
      (d) =>
        d.codigo_interno.toLowerCase().includes(texto) ||
        d.asunto.toLowerCase().includes(texto),
    );
  }, [documentos, busqueda]);

  if (cargando) return <CargandoDoc texto="Cargando bandeja documental…" />;

  return (
    <div className="space-y-8">
      <EncabezadoDoc
        titulo="Bandeja documental"
        descripcion="Pendientes de recepción para su sección y documentos en curso."
        acciones={
          esRadio ? (
            <Link
              href="/modulos/documentacion/registrar"
              className={botonPrimarioDoc}
            >
              + Registrar documento
            </Link>
          ) : undefined
        }
      />

      {error && <AvisoDoc tipo="error">{error}</AvisoDoc>}

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-slate-950">
          Pendientes de recepción ({pendientes.length})
        </h2>
        {pendientes.length === 0 ? (
          <VacioDoc
            titulo="Nada pendiente"
            descripcion="No hay movimientos dirigidos a su sección en este momento."
          />
        ) : (
          <div className="space-y-2">
            {pendientes.map((m) => (
              <div
                key={m.id_movimiento}
                className={`${tarjetaDoc} flex flex-wrap items-center justify-between gap-3`}
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-bold text-slate-950">
                      {m.expediente?.documento
                        ? `${m.expediente.documento.codigo_interno} — ${m.expediente.documento.asunto}`
                        : `Documento #${m.id_documento}`}
                    </p>
                    {ETIQUETA_TIPO_MOVIMIENTO[m.tipo_movimiento] && (
                      <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-800">
                        {ETIQUETA_TIPO_MOVIMIENTO[m.tipo_movimiento]}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-600">
                    Enviado por {m.seccion_origen?.nombre ?? "—"}
                    {m.usuario_envia
                      ? ` (${m.usuario_envia.nombres} ${m.usuario_envia.apellidos})`
                      : ""}{" "}
                    · {fechaLegibleDoc(m.fecha_hora_envio)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/modulos/documentacion/${m.id_documento}`}
                    className={botonSecundarioDoc}
                  >
                    Ver
                  </Link>
                  {tienePermiso(PERMISOS_DOC.RECIBIR) && (
                    <button
                      type="button"
                      className={botonPrimarioDoc}
                      disabled={recibiendo === m.id_movimiento}
                      onClick={() => recibir(m.id_movimiento)}
                    >
                      {recibiendo === m.id_movimiento
                        ? "Recibiendo…"
                        : "Recibir"}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-slate-950">Documentos</h2>
          <input
            className={`${campoDoc} max-w-xs`}
            placeholder="Buscar por código o asunto…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
        {documentosFiltrados.length === 0 ? (
          <VacioDoc
            titulo="Sin resultados"
            descripcion="No hay documentos que coincidan."
          />
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-[var(--color-night-blue)] text-white">
                <tr>
                  <th className="px-4 py-3">Código</th>
                  <th className="px-4 py-3">Asunto</th>
                  <th className="px-4 py-3">Prioridad</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Sección actual</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {documentosFiltrados.map((d) => (
                  <tr
                    key={d.id_documento}
                    className="border-t border-slate-100"
                  >
                    <td className="px-4 py-3 font-mono text-xs">
                      {d.codigo_interno}
                    </td>
                    <td className="px-4 py-3">{d.asunto}</td>
                    <td className="px-4 py-3">
                      <PrioridadBadge prioridad={d.prioridad} />
                    </td>
                    <td className="px-4 py-3">
                      {d.expediente ? (
                        <EstadoDocumentoBadge
                          estado={d.expediente.estado_actual}
                        />
                      ) : (
                        <span className="text-xs text-slate-500">
                          Relacionado
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {d.expediente
                        ? (nombresSeccion[d.expediente.id_seccion_actual] ??
                          "—")
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/modulos/documentacion/${d.id_documento}`}
                        className={botonSecundarioDoc}
                      >
                        Ver
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

export default function Pagina() {
  return (
    <PaginaProtegidaDocumentacion permisos={[PERMISOS_DOC.VER]}>
      <BandejaDocumental />
    </PaginaProtegidaDocumentacion>
  );
}
