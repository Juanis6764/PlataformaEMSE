"use client";

import { PlazoDocumento, Proveido, Trazabilidad } from "../../tipos/documentacion";
import {
  ClasificacionBadge,
  EstadoDocumentoBadge,
  PrioridadBadge,
  estadoPlazoVisual,
  fechaLegibleDoc,
  tiempoRestanteDoc,
} from "./InterfazDocumentacion";
import WorkflowVisual from "./WorkflowVisual";

function plazoDeMomento(trazabilidad: Trazabilidad, numeroMomento: number): PlazoDocumento | null {
  return trazabilidad.plazos.find((p) => p.proveido?.numero_momento === numeroMomento) ?? null;
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{etiqueta}</dt>
      <dd className="text-sm text-slate-900">{valor ?? "—"}</dd>
    </div>
  );
}

function BloqueProveido({
  titulo,
  seccionEmisora,
  proveido,
  plazo,
  extra,
}: {
  titulo: string;
  seccionEmisora: string;
  proveido: Proveido | undefined;
  plazo: PlazoDocumento | null;
  extra?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-[#1b4332]">{titulo}</h3>
      {!proveido ? (
        <p className="text-sm text-slate-400">Aún no registrado.</p>
      ) : (
        <div className="space-y-3">
          <Dato etiqueta="Contenido" valor={proveido.contenido} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Dato etiqueta={seccionEmisora} valor={proveido.seccion_emisora?.nombre?.replace(/_/g, " ")} />
            <Dato etiqueta="Fecha/hora de registro" valor={fechaLegibleDoc(proveido.fecha_hora)} />
            <Dato
              etiqueta="Fecha/hora límite"
              valor={plazo ? fechaLegibleDoc(plazo.fecha_hora_limite) : "Sin plazo fijado"}
            />
            {extra}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Hoja de Ruta digital: una sola vista con los datos del documento, ambos
 * proveídos y el estado actual, construida enteramente a partir de la
 * respuesta ya existente de GET /documentacion/documentos/:id/trazabilidad
 * (Documento + ExpedienteDocumento + HojaRuta/Proveido + plazos) — sin
 * tabla, endpoint ni lógica nueva de backend. Acompaña al documento
 * durante todo el trámite: es la misma Hoja de Ruta (mismo número) sin
 * importar qué sección la esté consultando o en qué momento del recorrido
 * esté el expediente.
 */
export default function HojaRutaDigital({ trazabilidad }: { trazabilidad: Trazabilidad }) {
  const { documento, expediente, plazo_vigente } = trazabilidad;
  if (!expediente) return null;

  const proveidoUno = expediente.hoja_ruta?.proveidos?.find((p) => p.numero_momento === 1);
  const proveidoDos = expediente.hoja_ruta?.proveidos?.find((p) => p.numero_momento === 2);
  const plazoUno = plazoDeMomento(trazabilidad, 1);
  const plazoDos = plazoDeMomento(trazabilidad, 2);
  const plazoVisualActual = plazo_vigente ? estadoPlazoVisual(plazo_vigente) : null;

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#52796f]">
          Hoja de Ruta Digital
        </p>
        <h2 className="text-xl font-bold text-slate-950">
          HOJA DE RUTA N.º {expediente.hoja_ruta?.numero ?? "—"}
        </h2>
      </header>

      <section className="rounded-xl border border-slate-200 p-4">
        <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-[#1b4332]">
          Datos del documento
        </h3>
        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Dato etiqueta="Tipo" valor={documento.tipo_documento.replace("_", " ")} />
          <Dato etiqueta="Código interno" valor={documento.codigo_interno} />
          <Dato etiqueta="Número de origen" valor={documento.numero_origen} />
          <Dato etiqueta="Procedencia" valor={documento.procedencia} />
          <Dato etiqueta="Fecha" valor={fechaLegibleDoc(documento.fecha_documento)} />
          <Dato etiqueta="Asunto" valor={documento.asunto} />
          <Dato etiqueta="Prioridad" valor={<PrioridadBadge prioridad={documento.prioridad} />} />
          <Dato
            etiqueta="Clasificación"
            valor={<ClasificacionBadge clasificacion={documento.clasificacion} />}
          />
        </dl>
      </section>

      <BloqueProveido
        titulo="Primer Proveído"
        seccionEmisora="Secretaría General"
        proveido={proveidoUno}
        plazo={plazoUno}
      />

      <BloqueProveido
        titulo="Segundo Proveído"
        seccionEmisora="Segundo Comando"
        proveido={proveidoDos}
        plazo={plazoDos}
        extra={
          <Dato
            etiqueta="Sección destino"
            valor={proveidoDos?.seccion_destino?.nombre?.replace(/_/g, " ")}
          />
        }
      />
      {proveidoDos && (
        <div className="-mt-4 px-4 text-sm text-slate-700">
          <span className="font-semibold text-slate-700">Tipo de atención: </span>
          {expediente.tipo_atencion_requerida ?? "—"}
        </div>
      )}

      <section className="rounded-xl border border-slate-200 p-4">
        <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-[#1b4332]">
          Estado actual
        </h3>
        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Dato etiqueta="Sección actual" valor={expediente.seccion_actual?.nombre?.replace(/_/g, " ")} />
          <Dato
            etiqueta="Responsable"
            valor={
              expediente.usuario_responsable_actual
                ? `${expediente.usuario_responsable_actual.nombres} ${expediente.usuario_responsable_actual.apellidos}`
                : null
            }
          />
          <Dato etiqueta="Estado" valor={<EstadoDocumentoBadge estado={expediente.estado_actual} />} />
          <Dato
            etiqueta="Plazo vigente"
            valor={plazo_vigente ? fechaLegibleDoc(plazo_vigente.fecha_hora_limite) : "Sin plazo vigente"}
          />
          <Dato
            etiqueta="Tiempo restante"
            valor={
              plazo_vigente && plazoVisualActual ? (
                <span className={plazoVisualActual.clase}>
                  {plazoVisualActual.emoji}{" "}
                  {plazo_vigente.estado_calculado === "PENDIENTE"
                    ? tiempoRestanteDoc(plazo_vigente.fecha_hora_limite)
                    : plazoVisualActual.texto}
                </span>
              ) : null
            }
          />
        </dl>
      </section>

      <section>
        <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-[#1b4332]">
          ¿Dónde está el documento?
        </h3>
        <WorkflowVisual trazabilidad={trazabilidad} />
      </section>
    </div>
  );
}
