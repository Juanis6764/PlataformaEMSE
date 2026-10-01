"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AvisoDoc, CargandoDoc, EncabezadoDoc, PaginaProtegidaDocumentacion,
  PERMISOS_DOC, VacioDoc, botonPrimarioDoc, botonSecundarioDoc, campoDoc,
  esActorGlobalDocumental, fechaLegibleDoc,
} from "../../../../componentes/documentacion/InterfazDocumentacion";
import { useAuth } from "../../../../contextos/AuthContext";
import { conectarDocumentacion } from "../../../../servicios/documentacion/documentacion-socket.service";
import { mensajeErrorApi, obtenerSeccionesDocumentales, obtenerSeguimientoDocumental } from "../../../../servicios/documentacion/documentacion.service";
import {
  EstadoDocumento, FiltrosSeguimientoDocumental, SeguimientoDocumental,
  TarjetaSeguimientoDocumental, TipoDocumento,
} from "../../../../tipos/documentacion";
import { Seccion } from "../../../../tipos/seccion";

const TIPOS: TipoDocumento[] = ["RADIOGRAMA", "MEMORANDUM", "OFICIO", "NOTA_SERVICIO", "INFORME", "DIRECTIVA", "CIRCULAR", "PARTE"];
const ESTADOS: EstadoDocumento[] = ["REGISTRADO", "EN_TRANSITO", "EN_TRAMITE", "OBSERVADO", "APROBADO", "FINALIZADO", "ARCHIVADO"];
const INICIALES: FiltrosSeguimientoDocumental = { modo: "HISTORICO", pestana: "TODOS" };

function ReportesDocumentales() {
  const { token, usuario } = useAuth();
  const esGlobal = esActorGlobalDocumental(usuario);
  const [filtros, setFiltros] = useState(INICIALES);
  const [resultado, setResultado] = useState<SeguimientoDocumental | null>(null);
  const [secciones, setSecciones] = useState<Seccion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const consultar = useCallback(async (criterios: FiltrosSeguimientoDocumental) => {
    setCargando(true); setError("");
    try { setResultado(await obtenerSeguimientoDocumental(criterios)); }
    catch (e) { setError(mensajeErrorApi(e)); }
    finally { setCargando(false); }
  }, []);

  useEffect(() => {
    let vigente = true;
    const carga = esGlobal
      ? Promise.all([obtenerSeguimientoDocumental(INICIALES), obtenerSeccionesDocumentales()])
      : Promise.all([obtenerSeguimientoDocumental(INICIALES), Promise.resolve([] as Seccion[])]);
    void carga
      .then(([reporte, areas]) => {
        if (!vigente) return;
        setResultado(reporte);
        setSecciones(areas);
      })
      .catch((e) => { if (vigente) setError(mensajeErrorApi(e)); })
      .finally(() => { if (vigente) setCargando(false); });
    return () => { vigente = false; };
  }, [esGlobal]);

  useEffect(() => {
    if (!token) return;
    const socket = conectarDocumentacion(token);
    const refrescar = () => void consultar(filtros);
    socket.on("documento:evento", refrescar);
    return () => { socket.off("documento:evento", refrescar); };
  }, [token, filtros, consultar]);

  const actualizar = <K extends keyof FiltrosSeguimientoDocumental>(clave: K, valor: FiltrosSeguimientoDocumental[K]) =>
    setFiltros((actual) => ({ ...actual, [clave]: valor }));
  const limpiar = () => {
    const siguientes = { ...INICIALES };
    setFiltros(siguientes); void consultar(siguientes);
  };
  const areaSeleccionada = secciones.find((s) => s.id_seccion === filtros.id_seccion)?.nombre;
  const alcance = esGlobal ? areaSeleccionada ?? "Todas las áreas" : usuario?.seccion?.replaceAll("_", " ") ?? "Mi área";
  const detalleFiltros = useMemo(() => [
    `Área: ${alcance}`,
    filtros.fecha_desde && `Desde: ${filtros.fecha_desde}`, filtros.fecha_hasta && `Hasta: ${filtros.fecha_hasta}`,
    filtros.tipo_documento && `Tipo: ${filtros.tipo_documento}`, filtros.estado && `Estado: ${filtros.estado}`,
    filtros.codigo_interno && `Código: ${filtros.codigo_interno}`, filtros.numero_hoja_ruta && `HR: ${filtros.numero_hoja_ruta}`,
    filtros.asunto && `Asunto: ${filtros.asunto}`,
  ].filter(Boolean).join(" · "), [alcance, filtros]);

  return <div className="space-y-6">
    <style jsx global>{`@media print { body * { visibility:hidden!important } .reporte-imprimible,.reporte-imprimible * { visibility:visible!important } .reporte-imprimible { position:absolute;inset:0;width:100%;padding:20px } .no-imprimir { display:none!important } @page { size:landscape;margin:12mm } }`}</style>
    <div className="no-imprimir"><EncabezadoDoc titulo="Reportes documentales" descripcion={`Documentos que pasaron por ${alcance}.`} /></div>
    {error && <AvisoDoc tipo="error">{error}</AvisoDoc>}
    <AvisoDoc tipo="info"><strong>Documentos que pasaron por {alcance}.</strong> El periodo considera fechas reales de recepción y envío.</AvisoDoc>
    <section className="no-imprimir grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
      <Campo texto="Desde"><input type="date" className={campoDoc} value={filtros.fecha_desde ?? ""} onChange={(e) => actualizar("fecha_desde", e.target.value || undefined)} /></Campo>
      <Campo texto="Hasta"><input type="date" className={campoDoc} value={filtros.fecha_hasta ?? ""} onChange={(e) => actualizar("fecha_hasta", e.target.value || undefined)} /></Campo>
      <Campo texto="Tipo"><select className={campoDoc} value={filtros.tipo_documento ?? ""} onChange={(e) => actualizar("tipo_documento", (e.target.value || undefined) as TipoDocumento | undefined)}><option value="">Todos</option>{TIPOS.map((v) => <option key={v} value={v}>{v.replaceAll("_", " ")}</option>)}</select></Campo>
      <Campo texto="Estado"><select className={campoDoc} value={filtros.estado ?? ""} onChange={(e) => actualizar("estado", (e.target.value || undefined) as EstadoDocumento | undefined)}><option value="">Todos</option>{ESTADOS.map((v) => <option key={v} value={v}>{v.replaceAll("_", " ")}</option>)}</select></Campo>
      <Campo texto="Código"><input className={campoDoc} value={filtros.codigo_interno ?? ""} onChange={(e) => actualizar("codigo_interno", e.target.value || undefined)} placeholder="DOC-..." /></Campo>
      <Campo texto="Hoja de Ruta"><input className={campoDoc} value={filtros.numero_hoja_ruta ?? ""} onChange={(e) => actualizar("numero_hoja_ruta", e.target.value || undefined)} placeholder="HR-..." /></Campo>
      <Campo texto="Asunto"><input className={campoDoc} value={filtros.asunto ?? ""} onChange={(e) => actualizar("asunto", e.target.value || undefined)} placeholder="Texto del asunto" /></Campo>
      {esGlobal && <Campo texto="Área"><select className={campoDoc} value={filtros.id_seccion ?? ""} onChange={(e) => actualizar("id_seccion", e.target.value ? Number(e.target.value) : undefined)}><option value="">Todas las áreas</option>{secciones.map((s) => <option key={s.id_seccion} value={s.id_seccion}>{s.nombre}</option>)}</select></Campo>}
      <div className="flex items-end gap-2 lg:col-span-4">
        <button className={botonPrimarioDoc} onClick={() => void consultar({ ...filtros, modo: "HISTORICO", pestana: "TODOS" })}>Aplicar filtros</button>
        <button className={botonSecundarioDoc} onClick={limpiar}>Limpiar</button>
        <button className={botonSecundarioDoc} disabled={!resultado?.documentos.length} onClick={() => window.print()}>Descargar PDF</button>
      </div>
    </section>
    {cargando ? <CargandoDoc texto="Generando reporte…" /> : <Reporte resultado={resultado} alcance={alcance} filtros={detalleFiltros} />}
  </div>;
}

function Campo({ texto, children }: { texto: string; children: React.ReactNode }) {
  return <label className="space-y-1 text-sm font-semibold text-slate-700"><span>{texto}</span>{children}</label>;
}

function Reporte({ resultado, alcance, filtros }: { resultado: SeguimientoDocumental | null; alcance: string; filtros: string }) {
  if (!resultado?.documentos.length) return <VacioDoc titulo="Sin documentos" descripcion="No existen documentos autorizados que coincidan con los filtros." />;
  return <section className="reporte-imprimible space-y-4">
    <header><h1 className="text-2xl font-bold text-slate-950">Reporte documental — {alcance}</h1><p className="mt-1 text-xs text-slate-600">{filtros}</p><p className="mt-1 text-xs text-slate-500">Generado: {new Date().toLocaleString("es-BO")}</p></header>
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white"><table className="w-full text-left text-xs"><thead className="bg-[#172554] text-white"><tr>{["N°", "Código", "Tipo", "Asunto", "Hoja de Ruta", "Origen", "Destino", "Fecha recepción", "Fecha envío", "Estado", "Responsable", "Detalle"].map((v) => <th key={v} className="p-3">{v}</th>)}</tr></thead><tbody>{resultado.documentos.map((d, indice) => <Fila key={d.id_documento} documento={d} numero={indice + 1} />)}</tbody></table></div>
    <footer className="text-xs text-slate-500">Total: {resultado.documentos.length} documento(s). Reporte generado con los filtros visibles indicados.</footer>
  </section>;
}

function Fila({ documento: d, numero }: { documento: TarjetaSeguimientoDocumental; numero: number }) {
  return <tr className="border-t border-slate-100 align-top"><td className="p-3">{numero}</td><td className="p-3"><Link className="font-mono font-bold text-[#1b4332] hover:underline print:text-black" href={`/modulos/documentacion/${d.id_documento}`}>{d.codigo_interno}</Link></td><td className="p-3">{d.tipo_documento.replaceAll("_", " ")}</td><td className="max-w-xs p-3">{d.asunto}</td><td className="p-3 font-mono">{d.numero_hoja_ruta ?? "—"}</td><td className="p-3">{d.origen?.nombre ?? "—"}</td><td className="p-3">{d.destino?.nombre ?? "—"}</td><td className="whitespace-nowrap p-3">{d.fecha_recepcion ? fechaLegibleDoc(d.fecha_recepcion) : "—"}</td><td className="whitespace-nowrap p-3">{d.fecha_envio ? fechaLegibleDoc(d.fecha_envio) : "—"}</td><td className="p-3">{d.estado_actual.replaceAll("_", " ")}</td><td className="p-3">{d.responsable_actual ? `${d.responsable_actual.nombres} ${d.responsable_actual.apellidos}` : "Sin asignar"}</td><td className="p-3"><details className="no-imprimir"><summary className="cursor-pointer font-semibold text-[#1b4332]">{d.movimientos_area?.length ?? 0} movimiento(s)</summary><ul className="mt-2 min-w-64 space-y-2">{d.movimientos_area?.map((movimiento, indice) => <li key={`${movimiento.fecha_envio}-${indice}`}><strong>{movimiento.origen.nombre} → {movimiento.destino.nombre}</strong><br />Envío: {fechaLegibleDoc(movimiento.fecha_envio)}<br />Recepción: {movimiento.fecha_recepcion ? fechaLegibleDoc(movimiento.fecha_recepcion) : "Pendiente"}</li>)}</ul></details><span className="hidden print:inline">{d.movimientos_area?.length ?? 0}</span></td></tr>;
}
export default function Pagina() { return <PaginaProtegidaDocumentacion permisos={[PERMISOS_DOC.VER]}><ReportesDocumentales /></PaginaProtegidaDocumentacion>; }
