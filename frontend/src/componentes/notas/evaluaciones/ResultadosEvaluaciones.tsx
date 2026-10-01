"use client";

import { ResultadosEvaluaciones } from "../../../tipos/notas/evaluaciones";
import { ClasificacionBadge, VacioEvaluaciones } from "./InterfazEvaluaciones";

export default function TablaResultadosEvaluaciones({
  resultados,
}: {
  resultados: ResultadosEvaluaciones;
}) {
  if (resultados.cadetes.length === 0) {
    return (
      <VacioEvaluaciones
        titulo="Sin resultados disponibles"
        descripcion="No existen estudiantes o materias publicadas para la selección."
      />
    );
  }
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 text-sm">
        <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold">
          Materias: {resultados.materias_publicadas}/{resultados.materias_configuradas}
        </span>
        <span
          className={`rounded-full px-3 py-1 font-semibold ${resultados.completo ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"}`}
        >
          Estado: {resultados.completo ? "Completo" : "En progreso"}
        </span>
      </div>
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-600">
            <tr>
              <th className="p-3">CI</th>
              <th className="p-3">Estudiante</th>
              <th className="p-3 text-right">Promedio parcial</th>
              <th className="p-3 text-right">Nota final Evaluaciones</th>
              <th className="p-3 text-center">Clasificación</th>
            </tr>
          </thead>
          <tbody>
            {resultados.cadetes.map((fila) => (
              <tr key={fila.id_cadete} className="border-t border-slate-200">
                <td className="p-3 font-mono text-xs">{fila.ci}</td>
                <td className="p-3 font-semibold">{fila.apellidos} {fila.nombres}</td>
                <td className="p-3 text-right font-mono font-bold">
                  {fila.promedio_parcial === null
                    ? "—"
                    : Number(fila.promedio_parcial).toFixed(4)}
                </td>
                <td className="p-3 text-right font-mono font-black text-slate-950">
                  {fila.nota_final_evaluaciones === null
                    ? "En progreso"
                    : Number(fila.nota_final_evaluaciones).toFixed(4)}
                </td>
                <td className="p-3 text-center">
                  <ClasificacionBadge clasificacion={fila.clasificacion_final} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
