"use client";

import { ContextoEntrenamiento } from "../../../tipos/notas/entrenamiento-fisico";
import { campoEntrenamiento, nombreCursoEntrenamiento } from "./InterfazEntrenamientoFisico";

export function SelectoresEntrenamientoFisico({
  contexto,
  idGestion,
  idPeriodo,
  idCurso,
  cambiarGestion,
  cambiarPeriodo,
  cambiarCurso,
}: {
  contexto: ContextoEntrenamiento;
  idGestion: number | null;
  idPeriodo: number | null;
  idCurso: number | null;
  cambiarGestion: (id: number | null) => void;
  cambiarPeriodo: (id: number | null) => void;
  cambiarCurso: (id: number | null) => void;
}) {
  const gestion = contexto.gestiones.find(
    (item) => item.id_gestion === idGestion,
  );
  return (
    <div className="grid gap-3 md:grid-cols-3">
      <label className="text-sm font-semibold text-slate-700">
        Gestión
        <select
          className={`${campoEntrenamiento} mt-1`}
          value={idGestion ?? ""}
          onChange={(evento) => cambiarGestion(Number(evento.target.value) || null)}
        >
          <option value="">Seleccione</option>
          {contexto.gestiones.map((item) => (
            <option key={item.id_gestion} value={item.id_gestion}>
              {item.ano}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm font-semibold text-slate-700">
        Periodo
        <select
          className={`${campoEntrenamiento} mt-1`}
          value={idPeriodo ?? ""}
          disabled={!gestion}
          onChange={(evento) => cambiarPeriodo(Number(evento.target.value) || null)}
        >
          <option value="">Seleccione</option>
          {gestion?.periodos.map((periodo) => (
            <option key={periodo.id_periodo} value={periodo.id_periodo}>
              {periodo.periodo} {periodo.activo ? "· Activo" : ""}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm font-semibold text-slate-700">
        Curso
        <select
          className={`${campoEntrenamiento} mt-1`}
          value={idCurso ?? ""}
          onChange={(evento) => cambiarCurso(Number(evento.target.value) || null)}
        >
          <option value="">Seleccione</option>
          {contexto.cursos.map((curso) => (
            <option key={curso.id_curso} value={curso.id_curso}>
              {nombreCursoEntrenamiento(curso.nombre)}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
