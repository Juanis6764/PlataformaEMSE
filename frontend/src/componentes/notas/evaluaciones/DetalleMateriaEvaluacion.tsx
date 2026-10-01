"use client";

import {
  CadeteMateriaEvaluacion,
  DetalleMateriaEvaluacion,
} from "../../../tipos/notas/evaluaciones";
import {
  botonSecundarioEvaluaciones,
  ClasificacionBadge,
  EstadoMateriaBadge,
  NivelRevisionEvaluacionBadge,
  nombreCursoEvaluaciones,
} from "./InterfazEvaluaciones";

export default function DetalleMateriaEvaluacionPanel({
  materia,
  modificarExtraordinariamente,
}: {
  materia: DetalleMateriaEvaluacion;
  modificarExtraordinariamente?: (fila: CadeteMateriaEvaluacion) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Materia {materia.numero_materia} · {nombreCursoEvaluaciones(materia.curso?.nombre)}
          </p>
          <h2 className="text-xl font-black text-slate-950">{materia.nombre}</h2>
          <p className="mt-1 text-sm text-slate-600">
            {materia.periodo?.periodo}/{materia.periodo?.gestion.ano} · Operador: {" "}
            {materia.creador
              ? `${materia.creador.apellidos} ${materia.creador.nombres}`
              : "—"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <EstadoMateriaBadge estado={materia.estado} />
          <NivelRevisionEvaluacionBadge nivel={materia.nivel_revision_actual} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Resumen valor={materia.resumen.cantidad_cadetes} etiqueta="Estudiantes" />
        <Resumen valor={materia.resumen.notas_registradas} etiqueta="Cargadas" />
        <Resumen valor={materia.resumen.notas_pendientes} etiqueta="Pendientes" />
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-600">
            <tr>
              <th className="p-3">CI</th>
              <th className="p-3">Apellidos y nombres</th>
              <th className="p-3 text-right">Nota</th>
              <th className="p-3 text-center">Clasificación</th>
              <th className="p-3 text-center">Mérito</th>
              {modificarExtraordinariamente && <th className="p-3">Acción</th>}
            </tr>
          </thead>
          <tbody>
            {materia.cadetes.map((fila) => (
              <tr key={fila.id_cadete} className="border-t border-slate-200">
                <td className="p-3 font-mono text-xs">{fila.ci}</td>
                <td className="p-3 font-semibold text-slate-900">
                  {fila.apellidos} {fila.nombres}
                </td>
                <Numero valor={fila.nota_inicial} destacado />
                <td className="p-3 text-center">
                  <ClasificacionBadge clasificacion={fila.clasificacion} />
                </td>
                <td className="p-3 text-center font-bold">
                  {fila.orden_merito ? `#${fila.orden_merito}` : "—"}
                </td>
                {modificarExtraordinariamente && (
                  <td className="p-3">
                    <button
                      type="button"
                      disabled={!fila.id_nota}
                      className={botonSecundarioEvaluaciones}
                      onClick={() => modificarExtraordinariamente(fila)}
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

function Numero({ valor, destacado = false }: { valor: string | null; destacado?: boolean }) {
  return (
    <td className={`p-3 text-right font-mono ${destacado ? "font-black text-slate-950" : ""}`}>
      {valor === null ? "—" : Number(valor).toFixed(4)}
    </td>
  );
}

function Resumen({ valor, etiqueta }: { valor: number; etiqueta: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 text-center">
      <p className="text-2xl font-black text-slate-950">{valor}</p>
      <p className="text-xs font-semibold text-slate-500">{etiqueta}</p>
    </div>
  );
}
