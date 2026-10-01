"use client";

import { MatrizEvaluaciones } from "../../../tipos/notas/evaluaciones";
import { ClasificacionBadge, VacioEvaluaciones } from "./InterfazEvaluaciones";

export default function TablaMatrizEvaluaciones({ matriz }: { matriz: MatrizEvaluaciones }) {
  if (matriz.columnas.length === 0) {
    return (
      <VacioEvaluaciones
        titulo="Sin materias publicadas"
        descripcion="La matriz crecerá automáticamente cuando el Encargado publique materias."
      />
    );
  }
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 text-sm">
        <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold">
          Publicadas: {matriz.materias_publicadas}/{matriz.materias_configuradas}
        </span>
        <span
          className={`rounded-full px-3 py-1 font-semibold ${matriz.completo ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"}`}
        >
          {matriz.completo ? "Completo" : "En progreso"}
        </span>
      </div>
      <div className="max-w-full overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full min-w-max text-left text-sm">
          <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-600">
            <tr>
              <th className="sticky left-0 z-10 min-w-64 bg-slate-100 p-3">Estudiante</th>
              {matriz.columnas.map((columna) => (
                <th key={columna.id_materia} className="min-w-40 p-3 text-center">
                  <span className="block">{columna.nombre}</span>
                  <span className="font-normal normal-case text-slate-400">
                    Materia {columna.numero_materia}
                  </span>
                </th>
              ))}
              <th className="min-w-36 p-3 text-right">Promedio parcial</th>
              <th className="min-w-36 p-3 text-right">Promedio final</th>
            </tr>
          </thead>
          <tbody>
            {matriz.cadetes.map((fila) => (
              <tr key={fila.id_cadete} className="border-t border-slate-200">
                <td className="sticky left-0 z-10 bg-white p-3">
                  <strong>{fila.apellidos} {fila.nombres}</strong>
                  <br />
                  <span className="text-xs text-slate-500">CI {fila.ci}</span>
                </td>
                {fila.materias.map((celda) => (
                  <td key={celda.id_materia} className="p-3 text-center">
                    <span className="font-mono font-black">
                      {celda.nota_considerada === null
                        ? "—"
                        : Number(celda.nota_considerada).toFixed(4)}
                    </span>
                    <div className="mt-1 flex items-center justify-center gap-1.5">
                      <ClasificacionBadge clasificacion={celda.clasificacion} />
                      {celda.orden_merito && (
                        <span className="text-xs font-bold text-slate-500">
                          #{celda.orden_merito}
                        </span>
                      )}
                    </div>
                  </td>
                ))}
                <Promedio valor={fila.promedio_parcial} />
                <Promedio valor={fila.promedio_final} destacado={matriz.completo} />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-500 sm:hidden">
        Deslice horizontalmente para consultar todas las materias.
      </p>
    </div>
  );
}

function Promedio({ valor, destacado = false }: { valor: string | null; destacado?: boolean }) {
  return (
    <td className={`p-3 text-right font-mono ${destacado ? "font-black text-emerald-800" : "font-bold"}`}>
      {valor === null ? "—" : Number(valor).toFixed(4)}
    </td>
  );
}
