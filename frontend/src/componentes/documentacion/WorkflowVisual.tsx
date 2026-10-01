"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  PlazoDocumento,
  SeccionResumen,
  SituacionPlazoDocumental,
  Trazabilidad,
} from "../../tipos/documentacion";
import { fechaLegibleDoc } from "./InterfazDocumentacion";
import { formatearRetraso, situacionHistoricaPlazo } from "./plazos-historicos";

type EstadoEtapa =
  | "COMPLETADO"
  | "ACTUAL"
  | "EN_TRANSITO"
  | "PENDIENTE"
  | "OBSERVADO"
  | "VENCIDO";

interface Etapa {
  id: string;
  idSeccion?: number;
  nombre: string;
  estado: EstadoEtapa;
  fecha?: string | null;
  plazo?: PlazoDocumento;
  resultadoPlazo?: SituacionPlazoDocumental;
  detalle: {
    accion: string;
    usuario?: string;
    estado: string;
    observacion?: string | null;
    fechaEnvio?: string | null;
    fechaRecepcion?: string | null;
  };
}

function etiquetaSeccion(nombre?: string | null) {
  return nombre ? nombre.replace(/_/g, " ") : "—";
}

function persona(usuario?: { nombres: string; apellidos: string } | null) {
  return usuario ? `${usuario.nombres} ${usuario.apellidos}` : undefined;
}

function ultimaPosicion<T>(items: T[], predicate: (item: T) => boolean) {
  for (let i = items.length - 1; i >= 0; i -= 1) {
    if (predicate(items[i])) return i;
  }
  return -1;
}

function indiceEtapaDelPlazo(
  etapas: Etapa[],
  plazo: PlazoDocumento,
  fechaProveido?: string,
) {
  const candidatas = etapas
    .map((etapa, indice) => ({ etapa, indice }))
    .filter(({ etapa }) => etapa.idSeccion === plazo.id_seccion_responsable);
  if (candidatas.length === 0) return -1;
  if (!fechaProveido) return candidatas[0].indice;

  const instanteProveido = new Date(fechaProveido).getTime();
  return (
    candidatas.find(
      ({ etapa }) =>
        !etapa.fecha || new Date(etapa.fecha).getTime() >= instanteProveido,
    ) ?? candidatas.at(-1)!
  ).indice;
}

function construirEtapas(trazabilidad: Trazabilidad, ahora: Date): Etapa[] {
  const { documento, expediente } = trazabilidad;
  if (!expediente) return [];

  const etapas: Etapa[] = [];
  const agregarEvento = (
    id: string,
    seccion: SeccionResumen | undefined | null,
    fecha: string | null | undefined,
    detalle: Etapa["detalle"],
  ) => {
    if (!seccion) return;
    etapas.push({
      id,
      idSeccion: seccion.id_seccion,
      nombre: etiquetaSeccion(seccion.nombre),
      estado: "PENDIENTE",
      fecha,
      detalle,
    });
  };

  agregarEvento("registro", documento.seccion_registro, documento.fecha_hora_registro, {
    accion: "Registro documental",
    usuario: persona(documento.usuario_registro),
    estado: "REGISTRADO",
  });

  for (const movimiento of expediente.movimientos ?? []) {
    agregarEvento(
      `movimiento-${movimiento.id_movimiento}`,
      movimiento.seccion_destino,
      movimiento.fecha_hora_recepcion ?? movimiento.fecha_hora_envio,
      {
        accion: movimiento.fecha_hora_recepcion
          ? `${movimiento.tipo_movimiento}: recibido desde ${etiquetaSeccion(movimiento.seccion_origen?.nombre)}`
          : `${movimiento.tipo_movimiento}: pendiente desde ${etiquetaSeccion(movimiento.seccion_origen?.nombre)}`,
        usuario: persona(movimiento.usuario_recibe ?? movimiento.usuario_envia),
        estado: movimiento.fecha_hora_recepcion
          ? movimiento.tipo_movimiento === "DEVOLUCION"
            ? "DEVOLUCIÓN RECIBIDA"
            : movimiento.tipo_movimiento === "REENVIO"
              ? "REENVÍO RECIBIDO"
              : "RECIBIDO"
          : "EN TRÁNSITO",
        observacion: movimiento.observacion,
        fechaEnvio: movimiento.fecha_hora_envio,
        fechaRecepcion: movimiento.fecha_hora_recepcion,
      },
    );
  }

  for (const cumplimiento of expediente.cumplimientos ?? []) {
    agregarEvento(
      `cumplimiento-${cumplimiento.id_cumplimiento}`,
      cumplimiento.seccion,
      cumplimiento.fecha_hora,
      {
        accion: "Cumplimiento registrado",
        usuario: persona(cumplimiento.usuario),
        estado: "CUMPLIMIENTO",
        observacion: cumplimiento.descripcion,
      },
    );
  }

  for (const relacion of documento.relaciones_como_origen ?? []) {
    if (relacion.tipo_relacion !== "RESPUESTA") continue;
    const respuesta = relacion.documento_relacionado;
    agregarEvento(
      `respuesta-${relacion.id_relacion}`,
      respuesta?.seccion_registro,
      respuesta?.fecha_hora_registro ?? relacion.fecha_hora,
      {
        accion: `Respuesta institucional ${respuesta?.codigo_interno ?? "registrada"}`,
        usuario: persona(respuesta?.usuario_registro),
        estado: "RESPUESTA CREADA",
        observacion: respuesta?.asunto,
      },
    );
  }

  for (const observacion of expediente.observaciones ?? []) {
    agregarEvento(
      `observacion-${observacion.id_observacion}`,
      observacion.seccion,
      observacion.fecha_hora,
      {
        accion: "Documento observado y devuelto al área",
        usuario: persona(observacion.usuario),
        estado: observacion.subsanada ? "OBSERVACIÓN SUBSANADA" : "OBSERVADO",
        observacion: observacion.descripcion,
      },
    );
  }

  for (const cambio of expediente.historial ?? []) {
    if (![
      "APROBADO",
      "FINALIZADO",
      "ARCHIVADO",
    ].includes(cambio.estado_nuevo)) continue;
    etapas.push({
      id: `estado-${cambio.id_historial}`,
      idSeccion: cambio.seccion?.id_seccion,
      nombre:
        cambio.estado_nuevo === "APROBADO"
          ? etiquetaSeccion(cambio.seccion?.nombre)
          : cambio.estado_nuevo,
      estado: "PENDIENTE",
      fecha: cambio.fecha_hora,
      detalle: {
        accion:
          cambio.estado_nuevo === "APROBADO"
            ? "Respuesta revisada y aprobada"
            : cambio.estado_nuevo === "FINALIZADO"
              ? "Expediente finalizado"
              : "Expediente archivado",
        usuario: persona(cambio.usuario),
        estado: cambio.estado_nuevo,
        observacion: cambio.motivo,
      },
    });
  }

  etapas.sort(
    (a, b) =>
      new Date(a.fecha ?? 0).getTime() - new Date(b.fecha ?? 0).getTime(),
  );

  const seccionActual = expediente.seccion_actual;
  const ultimoIndiceSeccion = ultimaPosicion(
    etapas,
    (etapa) => etapa.idSeccion === seccionActual?.id_seccion,
  );
  const indiceActual =
    expediente.estado_actual === "ARCHIVADO"
      ? ultimaPosicion(etapas, (etapa) => etapa.nombre === "ARCHIVADO")
      : expediente.estado_actual === "FINALIZADO"
        ? ultimaPosicion(etapas, (etapa) => etapa.nombre === "FINALIZADO")
        : ultimoIndiceSeccion >= 0
          ? ultimoIndiceSeccion
          : Math.max(0, etapas.length - 1);

  for (const plazo of trazabilidad.plazos ?? []) {
    const proveido = expediente.hoja_ruta?.proveidos?.find(
      (item) => item.id_proveido === plazo.id_proveido,
    );
    const indice = indiceEtapaDelPlazo(etapas, plazo, proveido?.fecha_hora);
    if (indice >= 0) etapas[indice].plazo = plazo;
  }

  return etapas.map((etapa, indice) => {
    let estado: EstadoEtapa = indice < indiceActual ? "COMPLETADO" : "PENDIENTE";
    if (etapa.detalle.estado === "EN TRÁNSITO") estado = "EN_TRANSITO";
    const resultadoPlazo = etapa.plazo
      ? situacionHistoricaPlazo(etapa.plazo, ahora, indice === indiceActual)
      : undefined;
    if (indice === indiceActual) {
      estado =
        resultadoPlazo === "VENCIDO"
          ? "VENCIDO"
          : expediente.estado_actual === "OBSERVADO"
            ? "OBSERVADO"
            : "ACTUAL";
    }
    if (
      etapa.nombre === "FINALIZADO" &&
      expediente.estado_actual === "ARCHIVADO"
    ) {
      estado = "COMPLETADO";
    }
    if (
      etapa.nombre === "ARCHIVADO" &&
      expediente.estado_actual === "ARCHIVADO"
    ) {
      estado = "ACTUAL";
    }
    return { ...etapa, estado, resultadoPlazo };
  });
}

function etiquetaResultadoPlazo(resultado?: SituacionPlazoDocumental) {
  if (resultado === "CUMPLIDO") return "EN PLAZO";
  if (resultado === "CUMPLIDO_TARDE") return "CUMPLIDO TARDE";
  if (resultado === "PROXIMO_A_VENCER") return "PRÓXIMO A VENCER";
  if (resultado === "VENCE_HOY") return "VENCE HOY";
  if (resultado === "VENCIDO") return "VENCIDO";
  if (resultado === "EN_PLAZO") return "EN PLAZO";
  return undefined;
}

function presentacionEtapa(etapa: Etapa) {
  if (etapa.nombre === "ARCHIVADO") {
    return {
      circulo: "border-slate-800 bg-slate-800 text-white ring-4 ring-slate-100",
      texto: "text-slate-800",
      icono: "■",
    };
  }
  if (etapa.nombre === "FINALIZADO") {
    return {
      circulo: "border-blue-700 bg-blue-600 text-white ring-4 ring-blue-100",
      texto: "text-blue-800",
      icono: "✓",
    };
  }
  if (
    etapa.detalle.estado.includes("OBSERV") ||
    etapa.detalle.estado.includes("DEVOLUCIÓN")
  ) {
    return {
      circulo: "border-amber-600 bg-amber-100 text-amber-900 ring-4 ring-amber-50",
      texto: "text-amber-900",
      icono: "↩",
    };
  }
  if (etapa.detalle.estado.includes("REENVÍO")) {
    return {
      circulo: "border-indigo-600 bg-indigo-100 text-indigo-800 ring-4 ring-indigo-50",
      texto: "text-indigo-800",
      icono: "↗",
    };
  }
  if (etapa.resultadoPlazo === "CUMPLIDO_TARDE") {
    return {
      circulo: "border-red-700 bg-red-600 text-white shadow-md shadow-red-200",
      texto: "text-red-800",
      icono: "✓",
    };
  }
  if (etapa.resultadoPlazo === "VENCIDO") {
    return {
      circulo: "border-red-700 bg-red-600 text-white shadow-md shadow-red-200",
      texto: "text-red-800",
      icono: "⚠",
    };
  }
  if (
    etapa.resultadoPlazo === "PROXIMO_A_VENCER" ||
    etapa.resultadoPlazo === "VENCE_HOY"
  ) {
    return {
      circulo: "border-amber-500 bg-amber-100 text-amber-900",
      texto: "text-amber-900",
      icono: "!",
    };
  }
  if (etapa.estado === "COMPLETADO") {
    return {
      circulo: "border-emerald-600 bg-emerald-600 text-white",
      texto: "text-emerald-800",
      icono: "✓",
    };
  }
  if (etapa.estado === "OBSERVADO") {
    return {
      circulo: "border-amber-500 bg-amber-100 text-amber-800",
      texto: "text-amber-900",
      icono: "!",
    };
  }
  if (etapa.estado === "EN_TRANSITO") {
    return {
      circulo: "border-sky-600 bg-sky-100 text-sky-800 ring-4 ring-sky-50",
      texto: "text-sky-800",
      icono: "→",
    };
  }
  if (etapa.estado === "ACTUAL") {
    return {
      circulo:
        "border-[#1b4332] bg-[#d8f3dc] text-[#1b4332] ring-4 ring-[#d8f3dc]",
      texto: "text-[#1b4332]",
      icono: "●",
    };
  }
  return {
    circulo: "border-slate-300 bg-slate-100 text-slate-400",
    texto: "text-slate-400",
    icono: "○",
  };
}

function claseConector(etapa: Etapa) {
  if (
    etapa.detalle.estado.includes("OBSERV") ||
    etapa.detalle.estado.includes("DEVOLUCIÓN")
  ) {
    return "bg-amber-400";
  }
  if (etapa.detalle.estado.includes("REENVÍO")) return "bg-indigo-400";
  if (etapa.estado === "COMPLETADO") return "bg-emerald-500";
  if (etapa.estado === "EN_TRANSITO") return "bg-sky-400";
  return "bg-slate-200";
}

function textoEtapa(etapa: Etapa) {
  const resultado = etiquetaResultadoPlazo(etapa.resultadoPlazo);
  if (resultado) return resultado;
  if (etapa.estado === "ACTUAL") return "ACTUAL";
  if (etapa.estado === "OBSERVADO") return "OBSERVADO";
  return etapa.detalle.estado;
}

function fechaBreve(fecha?: string | null) {
  if (!fecha) return "—";
  return new Intl.DateTimeFormat("es-BO", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/La_Paz",
  }).format(new Date(fecha));
}

export default function WorkflowVisual({
  trazabilidad,
}: {
  trazabilidad: Trazabilidad;
}) {
  const [ahora, setAhora] = useState(() => new Date());
  const etapas = useMemo(
    () => construirEtapas(trazabilidad, ahora),
    [trazabilidad, ahora],
  );
  const indiceActual = Math.max(
    0,
    etapas.findIndex((etapa) =>
      ["ACTUAL", "OBSERVADO", "VENCIDO"].includes(etapa.estado),
    ),
  );
  const [seleccionada, setSeleccionada] = useState(indiceActual);
  const [conectorAnimado, setConectorAnimado] = useState<number | null>(null);
  const firmaMovimientoAnterior = useRef<string | null>(null);
  const etapa = etapas[seleccionada] ?? etapas[indiceActual];

  useEffect(() => {
    const reloj = window.setInterval(() => setAhora(new Date()), 60_000);
    return () => window.clearInterval(reloj);
  }, []);

  useEffect(() => {
    const movimiento = trazabilidad.expediente?.movimientos?.at(-1);
    const firma = movimiento
      ? `${movimiento.id_movimiento}:${movimiento.estado_movimiento}:${movimiento.fecha_hora_recepcion ?? ""}`
      : "SIN_MOVIMIENTO";
    const anterior = firmaMovimientoAnterior.current;
    firmaMovimientoAnterior.current = firma;
    if (!anterior || anterior === firma || anterior === "SIN_MOVIMIENTO") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const inicio = window.requestAnimationFrame(() => {
      setConectorAnimado(
        movimiento?.estado_movimiento === "PENDIENTE"
          ? indiceActual
          : Math.max(0, indiceActual - 1),
      );
    });
    const temporizador = window.setTimeout(() => setConectorAnimado(null), 950);
    return () => {
      window.cancelAnimationFrame(inicio);
      window.clearTimeout(temporizador);
    };
  }, [trazabilidad, indiceActual]);

  if (etapas.length === 0) return null;

  const resultadoSeleccionado = etiquetaResultadoPlazo(etapa?.resultadoPlazo);
  const retraso = etapa?.plazo
    ? formatearRetraso(
        etapa.plazo.fecha_hora_limite,
        etapa.plazo.fecha_hora_cumplimiento,
      )
    : null;

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#52796f]">
            Recorrido real
          </p>
          <p className="mt-1 text-sm text-slate-600">
            Cada punto corresponde a un evento registrado en el expediente.
          </p>
          </div>
          <div className="flex flex-wrap gap-3 text-[11px] font-semibold text-slate-600">
            <span className="text-emerald-700">● Completado</span>
            <span className="text-[#1b4332]">● Actual</span>
            <span className="text-sky-700">→ En tránsito</span>
            <span className="text-amber-700">● Observado</span>
          </div>
        </div>
        <ol className="flex flex-wrap justify-center gap-y-8">
          {etapas.map((item, indice) => {
            const presentacion = presentacionEtapa(item);
            return (
              <li key={item.id} className="relative flex w-36 justify-center sm:w-40">
                {indice < etapas.length - 1 && (
                  <span
                    className={`absolute left-1/2 top-[23px] h-1 w-full ${claseConector(item)}`}
                    aria-hidden="true"
                  />
                )}
                <button
                  type="button"
                  className={`group relative z-10 flex w-[8.5rem] flex-col items-center rounded-xl px-2 pb-2 pt-0 text-center transition sm:w-36 ${seleccionada === indice ? "bg-[#f0fff4] ring-2 ring-[#b7e4c7]" : "hover:bg-slate-50"}`}
                  onClick={() => setSeleccionada(indice)}
                  aria-label={`Ver detalle de ${item.nombre}`}
                >
                  <span className="relative">
                    {item.estado === "ACTUAL" && (
                      <span className="absolute inset-0 animate-ping rounded-full bg-[#52b788] opacity-30 motion-reduce:animate-none" />
                    )}
                    <span
                      className={`relative flex size-12 items-center justify-center rounded-full border-2 text-lg font-bold transition ${presentacion.circulo}`}
                    >
                      {presentacion.icono}
                    </span>
                  </span>
                  {conectorAnimado === indice && (
                    <span className="absolute right-3 top-3 flex size-3">
                      <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#2d6a4f] opacity-60" />
                      <span className="relative inline-flex size-3 rounded-full bg-[#1b4332]" />
                    </span>
                  )}
                  <span
                    className={`mt-3 text-xs font-bold uppercase ${presentacion.texto}`}
                  >
                    {item.nombre}
                  </span>
                  <span className="mt-1 text-[10px] leading-4 text-slate-500">
                    {fechaBreve(item.fecha)}
                  </span>
                  <span className={`mt-1 min-h-8 text-[10px] font-bold uppercase leading-4 ${presentacion.texto}`}>
                    {textoEtapa(item)}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </section>

      {etapa && (
        <section className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-bold uppercase tracking-wide text-[#1b4332]">
              Detalle · {etapa.nombre}
            </h3>
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-bold ${etapa.resultadoPlazo === "CUMPLIDO_TARDE" || etapa.resultadoPlazo === "VENCIDO" ? "bg-red-100 text-red-800" : etapa.resultadoPlazo === "PROXIMO_A_VENCER" || etapa.resultadoPlazo === "VENCE_HOY" || etapa.estado === "OBSERVADO" ? "bg-amber-100 text-amber-800" : etapa.estado === "COMPLETADO" ? "bg-emerald-100 text-emerald-800" : "bg-[#d8f3dc] text-[#1b4332]"}`}
            >
              {resultadoSeleccionado ?? etapa.estado}
            </span>
          </div>
          <dl className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <dt className="text-xs font-semibold text-slate-500">Sección</dt>
              <dd>{etapa.nombre}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-slate-500">Plazo</dt>
              <dd>{fechaLegibleDoc(etapa.plazo?.fecha_hora_limite)}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-slate-500">
                Cumplimiento
              </dt>
              <dd>{fechaLegibleDoc(etapa.plazo?.fecha_hora_cumplimiento)}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-slate-500">
                Resultado
              </dt>
              <dd>{resultadoSeleccionado ?? "SIN PLAZO"}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-slate-500">Retraso</dt>
              <dd>{retraso ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-slate-500">Acción</dt>
              <dd>{etapa.detalle.accion}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-slate-500">
                Fecha y hora
              </dt>
              <dd>{fechaLegibleDoc(etapa.fecha)}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-slate-500">Envío</dt>
              <dd>{fechaLegibleDoc(etapa.detalle.fechaEnvio)}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-slate-500">Recepción</dt>
              <dd>
                {etapa.detalle.fechaEnvio && !etapa.detalle.fechaRecepcion
                  ? "PENDIENTE DE RECEPCIÓN"
                  : fechaLegibleDoc(etapa.detalle.fechaRecepcion)}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-slate-500">
                Usuario responsable
              </dt>
              <dd>{etapa.detalle.usuario ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-slate-500">
                Observación
              </dt>
              <dd>{etapa.detalle.observacion ?? "—"}</dd>
            </div>
          </dl>
        </section>
      )}
    </div>
  );
}
