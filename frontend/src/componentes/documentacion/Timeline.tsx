"use client";

import { Trazabilidad } from "../../tipos/documentacion";
import { fechaLegibleDoc } from "./InterfazDocumentacion";

interface EventoLinea {
  fecha: string;
  titulo: string;
  detalle?: string;
  icono: string;
}

/**
 * No existe una tabla "Timeline": se construye combinando Documento +
 * ExpedienteDocumento + HojaRuta/Proveido + Movimientos +
 * HistorialEstadoDocumento + Observaciones + Cumplimientos, tal como se
 * definió en el diseño de FASE 1. El orden real del camino no es fijo de
 * antemano (puede haber devoluciones/reenvíos), así que se muestra la
 * secuencia cronológica real ocurrida, no una ruta predeterminada.
 */
export default function Timeline({ trazabilidad }: { trazabilidad: Trazabilidad }) {
  const { documento, expediente } = trazabilidad;

  const eventos: EventoLinea[] = [
    {
      fecha: documento.fecha_hora_registro,
      titulo: `Registrado en ${documento.seccion_registro?.nombre ?? "Radio"}`,
      detalle: documento.usuario_registro
        ? `${documento.usuario_registro.nombres} ${documento.usuario_registro.apellidos}`
        : undefined,
      icono: "✓",
    },
  ];

  if (expediente) {
    for (const m of expediente.movimientos ?? []) {
      eventos.push({
        fecha: m.fecha_hora_envio,
        titulo: `Enviado de ${m.seccion_origen?.nombre ?? "?"} a ${m.seccion_destino?.nombre ?? "?"} (${m.tipo_movimiento})`,
        detalle: m.usuario_envia
          ? `${m.usuario_envia.nombres} ${m.usuario_envia.apellidos}${m.observacion ? ` — ${m.observacion}` : ""}`
          : m.observacion ?? undefined,
        icono: "→",
      });
      if (m.fecha_hora_recepcion) {
        eventos.push({
          fecha: m.fecha_hora_recepcion,
          titulo: `Recibido en ${m.seccion_destino?.nombre ?? "?"}`,
          detalle: m.usuario_recibe
            ? `${m.usuario_recibe.nombres} ${m.usuario_recibe.apellidos}`
            : undefined,
          icono: "✓",
        });
      }
    }

    if (expediente.hoja_ruta) {
      eventos.push({
        fecha: expediente.hoja_ruta.fecha_hora_asignacion,
        titulo: `Hoja de ruta ${expediente.hoja_ruta.numero} asignada`,
        detalle: expediente.hoja_ruta.usuario_asigno
          ? `${expediente.hoja_ruta.usuario_asigno.nombres} ${expediente.hoja_ruta.usuario_asigno.apellidos}`
          : undefined,
        icono: "📋",
      });
      for (const p of expediente.hoja_ruta.proveidos ?? []) {
        eventos.push({
          fecha: p.fecha_hora,
          titulo: `Proveído ${p.numero_momento} registrado (${p.seccion_emisora?.nombre ?? "?"})`,
          detalle: p.contenido,
          icono: "✎",
        });
      }
    }

    for (const o of expediente.observaciones ?? []) {
      eventos.push({
        fecha: o.fecha_hora,
        titulo: `Observado por ${o.seccion?.nombre ?? "?"}`,
        detalle: o.descripcion,
        icono: "⚠",
      });
      if (o.fecha_hora_subsanacion) {
        eventos.push({
          fecha: o.fecha_hora_subsanacion,
          titulo: "Observación subsanada",
          icono: "✓",
        });
      }
    }

    for (const c of expediente.cumplimientos ?? []) {
      eventos.push({
        fecha: c.fecha_hora,
        titulo: `Cumplimiento registrado (${c.seccion?.nombre ?? "?"})`,
        detalle: c.descripcion,
        icono: "📎",
      });
    }
  }

  for (const rel of documento.relaciones_como_origen ?? []) {
    if (rel.tipo_relacion === "RESPUESTA" && rel.documento_relacionado) {
      eventos.push({
        fecha: rel.fecha_hora,
        titulo: `Respuesta creada: ${rel.documento_relacionado.codigo_interno}`,
        detalle: rel.documento_relacionado.asunto,
        icono: "↩",
      });
    }
  }

  eventos.sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());

  return (
    <ol className="space-y-0">
      {eventos.map((evento, indice) => (
        <li key={indice} className="relative flex gap-4 pb-6 last:pb-0">
          {indice < eventos.length - 1 && (
            <span className="absolute left-[15px] top-8 h-full w-px bg-slate-200" />
          )}
          <span className="z-10 flex size-8 shrink-0 items-center justify-center rounded-full border border-[#2d6a4f] bg-white text-sm text-[#1b4332]">
            {evento.icono}
          </span>
          <div className="pt-1">
            <p className="font-semibold text-slate-950">{evento.titulo}</p>
            {evento.detalle && (
              <p className="text-sm text-slate-600">{evento.detalle}</p>
            )}
            <p className="text-xs text-slate-400">{fechaLegibleDoc(evento.fecha)}</p>
          </div>
        </li>
      ))}
      {expediente && (
        <li className="relative flex gap-4">
          <span className="z-10 flex size-8 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-slate-400 bg-slate-50 text-sm text-slate-500">
            ●
          </span>
          <div className="pt-1">
            <p className="font-semibold text-slate-950">
              Estado actual: {expediente.estado_actual.replace("_", " ")}
            </p>
            <p className="text-sm text-slate-600">
              {expediente.seccion_actual?.nombre ?? "—"}
              {expediente.usuario_responsable_actual
                ? ` · ${expediente.usuario_responsable_actual.nombres} ${expediente.usuario_responsable_actual.apellidos}`
                : ""}
            </p>
          </div>
        </li>
      )}
    </ol>
  );
}
