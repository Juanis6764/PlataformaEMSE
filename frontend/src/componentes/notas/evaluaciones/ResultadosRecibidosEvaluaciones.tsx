"use client";

import { useState } from "react";
import { ResultadosRecibidosEvaluaciones as ResultadosRecibidos } from "../../../tipos/notas/evaluaciones";
import {
  nombreCursoEvaluaciones,
  VacioEvaluaciones,
} from "./InterfazEvaluaciones";

type AreaDetalle = "DISCIPLINA" | "ENTRENAMIENTO_FISICO";

function EstadoFuente({ estado }: { estado: "COMPLETO" | "RECIBIDO" | "PENDIENTE" }) {
  const listo = estado !== "PENDIENTE";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-black ${
        listo
          ? "bg-emerald-100 text-emerald-800"
          : "bg-amber-100 text-amber-800"
      }`}
    >
      <span aria-hidden="true">{listo ? "✓" : "⏳"}</span>
      {estado === "COMPLETO"
        ? "Completo"
        : estado === "RECIBIDO"
          ? "Recibido"
          : "Pendiente"}
    </span>
  );
}

export default function ResultadosRecibidosEvaluaciones({
  resultados,
}: {
  resultados: ResultadosRecibidos;
}) {
  const [areaDetalle, setAreaDetalle] = useState<AreaDetalle | null>(null);
  const fuente =
    areaDetalle === "DISCIPLINA"
      ? resultados.disciplina
      : areaDetalle === "ENTRENAMIENTO_FISICO"
        ? resultados.entrenamiento_fisico
        : null;
  const tituloDetalle =
    areaDetalle === "DISCIPLINA"
      ? "Disciplina"
      : "Entrenamiento Físico";

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-xs font-black uppercase tracking-wide text-slate-500">
          Gestión · Periodo · Curso
        </p>
        <h2 className="mt-1 text-xl font-black text-slate-900">
          {nombreCursoEvaluaciones(resultados.curso)} — {resultados.periodo}/
          {resultados.gestion}
        </h2>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Área</p>
              <h3 className="mt-1 font-black text-slate-900">Evaluaciones</h3>
            </div>
            <EstadoFuente estado={resultados.evaluaciones.estado} />
          </div>
          <p className="mt-4 text-sm text-slate-600">
            {resultados.evaluaciones.materias_publicadas} de{" "}
            {resultados.evaluaciones.materias_configuradas} materias publicadas.
          </p>
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Área</p>
              <h3 className="mt-1 font-black text-slate-900">Disciplina</h3>
            </div>
            <EstadoFuente estado={resultados.disciplina.estado} />
          </div>
          <button
            type="button"
            disabled={resultados.disciplina.estado !== "RECIBIDO"}
            onClick={() => setAreaDetalle("DISCIPLINA")}
            className="mt-4 rounded-lg bg-[#1b4332] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#2d6a4f] disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            Ver notas
          </button>
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Área</p>
              <h3 className="mt-1 font-black text-slate-900">Entrenamiento Físico</h3>
            </div>
            <EstadoFuente estado={resultados.entrenamiento_fisico.estado} />
          </div>
          <button
            type="button"
            disabled={resultados.entrenamiento_fisico.estado !== "RECIBIDO"}
            onClick={() => setAreaDetalle("ENTRENAMIENTO_FISICO")}
            className="mt-4 rounded-lg bg-[#1b4332] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#2d6a4f] disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            Ver notas
          </button>
        </article>
      </div>

      {fuente && (
        <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                Resultado final recibido
              </p>
              <h3 className="mt-1 text-lg font-black text-slate-900">{tituloDetalle}</h3>
            </div>
            <button
              type="button"
              onClick={() => setAreaDetalle(null)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              Cerrar
            </button>
          </div>
          {fuente.notas.length === 0 ? (
            <div className="p-4">
              <VacioEvaluaciones
                titulo="Sin notas recibidas"
                descripcion="El área todavía no entregó un resultado final disponible."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-xs font-black uppercase tracking-wide text-slate-600">
                  <tr>
                    <th className="px-4 py-3">N°</th>
                    <th className="px-4 py-3">CI</th>
                    <th className="px-4 py-3">Apellidos y nombres</th>
                    <th className="px-4 py-3 text-right">
                      {areaDetalle === "DISCIPLINA"
                        ? "Nota final Disciplina"
                        : "Nota final"}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {fuente.notas.map((nota, indice) => (
                    <tr key={nota.id_cadete} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-slate-500">{indice + 1}</td>
                      <td className="px-4 py-3 font-mono text-slate-700">{nota.ci}</td>
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        {nota.apellidos} {nota.nombres}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-black text-slate-900">
                        {nota.nota_final}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
