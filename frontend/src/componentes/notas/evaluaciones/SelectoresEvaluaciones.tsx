"use client";

import {
  ContextoEvaluaciones,
  GestionContextoEvaluaciones,
} from "../../../tipos/notas/evaluaciones";
import { campoEvaluaciones, nombreCursoEvaluaciones } from "./InterfazEvaluaciones";

export function SelectoresEvaluaciones({
  contexto,
  idGestion,
  idPeriodo,
  idCurso,
  cambiarGestion,
  cambiarPeriodo,
  cambiarCurso,
  incluirInactivos = true,
}: {
  contexto: ContextoEvaluaciones;
  idGestion: number | null;
  idPeriodo: number | null;
  idCurso: number | null;
  cambiarGestion: (id: number | null) => void;
  cambiarPeriodo: (id: number | null) => void;
  cambiarCurso: (id: number | null) => void;
  incluirInactivos?: boolean;
}) {
  const gestion = contexto.gestiones.find((item) => item.id_gestion === idGestion);
  const periodos = periodosDisponibles(gestion, incluirInactivos);
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <label className="text-sm font-semibold text-slate-700">
        Gestión
        <select
          className={`${campoEvaluaciones} mt-1`}
          value={idGestion ?? ""}
          onChange={(evento) => {
            cambiarGestion(Number(evento.target.value) || null);
            cambiarPeriodo(null);
          }}
        >
          <option value="">Seleccione</option>
          {contexto.gestiones.map((item) => (
            <option key={item.id_gestion} value={item.id_gestion}>
              {item.ano} · {item.estado}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm font-semibold text-slate-700">
        Periodo
        <select
          className={`${campoEvaluaciones} mt-1`}
          value={idPeriodo ?? ""}
          disabled={!gestion}
          onChange={(evento) => cambiarPeriodo(Number(evento.target.value) || null)}
        >
          <option value="">Seleccione</option>
          {periodos.map((item) => (
            <option key={item.id_periodo} value={item.id_periodo}>
              {item.periodo} {item.activo ? "· activo" : "· inactivo"}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm font-semibold text-slate-700">
        Curso
        <select
          className={`${campoEvaluaciones} mt-1`}
          value={idCurso ?? ""}
          onChange={(evento) => cambiarCurso(Number(evento.target.value) || null)}
        >
          <option value="">Seleccione</option>
          {contexto.cursos.map((item) => (
            <option key={item.id_curso} value={item.id_curso}>
              {nombreCursoEvaluaciones(item.nombre)}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

function periodosDisponibles(
  gestion: GestionContextoEvaluaciones | undefined,
  incluirInactivos: boolean,
) {
  if (!gestion) return [];
  return incluirInactivos
    ? gestion.periodos
    : gestion.periodos.filter((periodo) => periodo.activo);
}
