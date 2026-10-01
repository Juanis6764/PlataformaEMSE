"use client";

import {
  CadetePlanillaEntrenamiento,
  DetallePlanillaEntrenamiento,
} from "../../../tipos/notas/entrenamiento-fisico";
import {
  EstadoPlanillaEntrenamientoBadge,
  NivelEntrenamientoBadge,
  nombreCursoEntrenamiento,
} from "./InterfazEntrenamientoFisico";

export default function PlanillaEntrenamientoFisico({
  detalle,
  valores,
  cambiarNota,
  modificarExtraordinariamente,
}: {
  detalle: DetallePlanillaEntrenamiento;
  valores?: Record<number, string>;
  cambiarNota?: (idCadete: number, valor: string) => void;
  modificarExtraordinariamente?: (cadete: CadetePlanillaEntrenamiento) => void;
}) {
  const editable = detalle.acciones.guardar && Boolean(cambiarNota);
  return (
    <div className="space-y-4">
      <div className="hidden text-center print:block">
        <h1 className="text-xl font-black">ENTRENAMIENTO FÍSICO</h1>
        <p className="mt-1 font-bold">
          {nombreCursoEntrenamiento(detalle.curso.nombre)}
        </p>
        <p>
          PERIODO {detalle.periodo.periodo}/{detalle.gestion.ano}
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <h2 className="text-lg font-black text-slate-950">
            {nombreCursoEntrenamiento(detalle.curso.nombre)} · {detalle.periodo.periodo}/
            {detalle.gestion.ano}
          </h2>
          <p className="text-sm text-slate-600">
            {detalle.resumen.notas_registradas} registradas · {detalle.resumen.pendientes} pendientes
          </p>
        </div>
        {detalle.planilla && (
          <div className="flex flex-wrap gap-2">
            <EstadoPlanillaEntrenamientoBadge estado={detalle.planilla.estado} />
            <NivelEntrenamientoBadge nivel={detalle.planilla.nivel_revision_actual} />
          </div>
        )}
      </div>
      <div className="overflow-x-auto rounded-xl border border-slate-200 print:overflow-visible print:rounded-none print:border-black">
        <table className="w-full min-w-[720px] text-left text-sm print:min-w-0 print:text-xs">
          <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-600 print:bg-white print:text-black">
            <tr>
              <th className="w-16 p-3 text-center print:border print:border-black print:p-1">N°</th>
              <th className="p-3 print:border print:border-black print:p-1">CI</th>
              <th className="p-3 print:border print:border-black print:p-1">Apellidos y nombres</th>
              <th className="w-48 p-3 text-center print:border print:border-black print:p-1">Nota final</th>
              {modificarExtraordinariamente && (
                <th className="w-32 p-3 text-center print:hidden">Acción</th>
              )}
            </tr>
          </thead>
          <tbody>
            {detalle.cadetes.map((cadete, indice) => (
              <tr key={cadete.id_cadete} className="border-t border-slate-200">
                <td className="p-3 text-center print:border print:border-black print:p-1">{indice + 1}</td>
                <td className="p-3 font-mono text-xs print:border print:border-black print:p-1">{cadete.ci}</td>
                <td className="p-3 font-semibold print:border print:border-black print:p-1">
                  {cadete.apellidos} {cadete.nombres}
                </td>
                <td className="p-3 text-center print:border print:border-black print:p-1">
                  {editable ? (
                    <input
                      aria-label={`Nota final de ${cadete.apellidos} ${cadete.nombres}`}
                      inputMode="decimal"
                      maxLength={8}
                      value={valores?.[cadete.id_cadete] ?? ""}
                      onChange={(evento) =>
                        cambiarNota?.(cadete.id_cadete, evento.target.value)
                      }
                      className="w-32 rounded-lg border border-slate-300 px-3 py-2 text-right font-mono font-bold outline-none focus:border-[#2d6a4f] focus:ring-2 focus:ring-[#2d6a4f]/15"
                      placeholder="0.0000"
                    />
                  ) : (
                    <span className="font-mono font-bold">
                      {cadete.nota_final ?? "—"}
                    </span>
                  )}
                </td>
                {modificarExtraordinariamente && (
                  <td className="p-3 text-center print:hidden">
                    <button
                      type="button"
                      disabled={!cadete.id_nota}
                      className="text-xs font-bold text-[#1b4332] underline disabled:opacity-40"
                      onClick={() => modificarExtraordinariamente(cadete)}
                    >
                      Modificar
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
