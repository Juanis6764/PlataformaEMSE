"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AvisoEvaluaciones,
  botonPrimarioEvaluaciones,
  CargandoEvaluaciones,
  campoEvaluaciones,
  ClasificacionBadge,
  EncabezadoEvaluaciones,
  PaginaProtegidaEvaluaciones,
  tarjetaEvaluaciones,
  VacioEvaluaciones,
} from "../../../componentes/notas/evaluaciones/InterfazEvaluaciones";
import {
  listarMisNotasEvaluaciones,
  mensajeErrorApi,
  obtenerContextoEvaluaciones,
} from "../../../servicios/notas/evaluaciones.service";
import {
  ContextoEvaluaciones,
  NotaPropiaEvaluacion,
} from "../../../tipos/notas/evaluaciones";
import { listarMisMatricesAcademicas } from "../../../servicios/notas/matriz-academica.service";
import { MatrizPropiaAcademica } from "../../../tipos/notas/matriz-academica";

export default function MisNotasEvaluacionesPage() {
  const [contexto, setContexto] = useState<ContextoEvaluaciones | null>(null);
  const [notas, setNotas] = useState<NotaPropiaEvaluacion[]>([]);
  const [matrices, setMatrices] = useState<MatrizPropiaAcademica[]>([]);
  const [idGestion, setIdGestion] = useState<number | null>(null);
  const [idPeriodo, setIdPeriodo] = useState<number | null>(null);
  const [cargando, setCargando] = useState(true);
  const [consultando, setConsultando] = useState(false);
  const [error, setError] = useState("");

  const cargar = useCallback(async () => {
    setError("");
    try {
      const [contextoReal, propias, matricesPublicadas] = await Promise.all([
        obtenerContextoEvaluaciones(),
        listarMisNotasEvaluaciones(),
        listarMisMatricesAcademicas(),
      ]);
      setContexto(contextoReal);
      setNotas(propias);
      setMatrices(matricesPublicadas);
      const gestion =
        contextoReal.gestiones.find((item) => item.periodos.some((periodo) => periodo.activo)) ??
        contextoReal.gestiones[0];
      const periodo =
        gestion?.periodos.find((item) => item.activo) ?? gestion?.periodos[0];
      setIdGestion(gestion?.id_gestion ?? null);
      setIdPeriodo(periodo?.id_periodo ?? null);
    } catch (e) {
      setError(mensajeErrorApi(e));
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => void cargar());
  }, [cargar]);

  async function consultar() {
    setConsultando(true);
    setError("");
    try {
      setNotas(
        await listarMisNotasEvaluaciones({
          id_gestion: idGestion ?? undefined,
          id_periodo: idPeriodo ?? undefined,
        }),
      );
    } catch (e) {
      setError(mensajeErrorApi(e));
    } finally {
      setConsultando(false);
    }
  }

  if (cargando) {
    return (
      <PaginaProtegidaEvaluaciones soloCadete>
        <CargandoEvaluaciones />
      </PaginaProtegidaEvaluaciones>
    );
  }

  return (
    <PaginaProtegidaEvaluaciones soloCadete>
      <div className="mx-auto max-w-6xl space-y-5">
        <EncabezadoEvaluaciones
          titulo="Mis Evaluaciones"
          descripcion="Aquí se muestran únicamente sus materias publicadas, con la nota considerada, clasificación y orden de mérito oficial."
        />
        {error && <AvisoEvaluaciones tipo="error">{error}</AvisoEvaluaciones>}

        {contexto && (
          <section className={tarjetaEvaluaciones}>
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
              <label className="text-sm font-semibold text-slate-700">
                Gestión
                <select
                  className={`${campoEvaluaciones} mt-1`}
                  value={idGestion ?? ""}
                  onChange={(evento) => {
                    setIdGestion(Number(evento.target.value) || null);
                    setIdPeriodo(null);
                  }}
                >
                  <option value="">Todas</option>
                  {contexto.gestiones.map((gestion) => (
                    <option key={gestion.id_gestion} value={gestion.id_gestion}>{gestion.ano}</option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-semibold text-slate-700">
                Periodo
                <select
                  className={`${campoEvaluaciones} mt-1`}
                  value={idPeriodo ?? ""}
                  disabled={!idGestion}
                  onChange={(evento) => setIdPeriodo(Number(evento.target.value) || null)}
                >
                  <option value="">Todos</option>
                  {contexto.gestiones
                    .find((gestion) => gestion.id_gestion === idGestion)
                    ?.periodos.map((periodo) => (
                      <option key={periodo.id_periodo} value={periodo.id_periodo}>{periodo.periodo}</option>
                    ))}
                </select>
              </label>
              <button type="button" disabled={consultando} className={botonPrimarioEvaluaciones} onClick={() => void consultar()}>
                {consultando ? "Consultando…" : "Consultar"}
              </button>
            </div>
          </section>
        )}

        {matrices.length > 0 && (
          <section className={tarjetaEvaluaciones}>
            <h2 className="text-lg font-black text-slate-950">Notas finales publicadas</h2>
            <p className="mt-1 text-sm text-slate-600">
              Consolidado oficial de Evaluaciones, Entrenamiento Físico y Disciplina.
            </p>
            <div className="mt-4 space-y-4">
              {matrices.map((matriz) => (
                <article key={matriz.id_matriz} className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-black uppercase text-slate-950">
                      {matriz.tipo === "SEMESTRAL" ? "Notas finales" : "Resultado anual"} — {matriz.periodo}/{matriz.gestion}
                    </h3>
                    <span className="rounded-full bg-emerald-700 px-3 py-1 text-xs font-bold text-white">PUBLICADO</span>
                  </div>
                  {matriz.materias.length > 0 && (
                    <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {matriz.materias.map((materia) => (
                        <div key={materia.nombre} className="flex justify-between gap-3 rounded-lg bg-white px-3 py-2 text-sm">
                          <span>{materia.nombre}</span>
                          <strong className="font-mono">{materia.nota}</strong>
                        </div>
                      ))}
                    </div>
                  )}
                  <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
                    {[
                      ["Promedio académico", matriz.promedio_academico],
                      ["Evaluaciones 80 %", matriz.ponderacion_evaluaciones],
                      ["Entrenamiento Físico", matriz.nota_entrenamiento_fisico],
                      ["Ponderación EF 10 %", matriz.ponderacion_entrenamiento],
                      ["Disciplina", matriz.nota_disciplina],
                      ["Ponderación Disc. 10 %", matriz.ponderacion_disciplina],
                      [matriz.tipo === "ANUAL" ? "Promedio gestión" : "Promedio general", matriz.promedio_general],
                      ["Promedio acumulado", matriz.promedio_acumulado],
                    ].map(([etiqueta, valor]) => (
                      <div key={etiqueta} className="rounded-xl bg-white p-3">
                        <dt className="text-xs font-semibold text-slate-500">{etiqueta}</dt>
                        <dd className="mt-1 font-mono text-lg font-black">{valor ?? "—"}</dd>
                      </div>
                    ))}
                    <div className="rounded-xl bg-white p-3"><dt className="text-xs font-semibold text-slate-500">Atributo</dt><dd className="mt-1 text-lg font-black">{matriz.atributo}</dd></div>
                    <div className="rounded-xl bg-white p-3"><dt className="text-xs font-semibold text-slate-500">Aplazos</dt><dd className="mt-1 text-lg font-black">{matriz.cantidad_aplazos}</dd></div>
                    <div className="rounded-xl bg-white p-3"><dt className="text-xs font-semibold text-slate-500">Orden de mérito</dt><dd className="mt-1 text-lg font-black">#{matriz.orden_merito}</dd></div>
                  </dl>
                </article>
              ))}
            </div>
          </section>
        )}

        <section className={tarjetaEvaluaciones}>
          {consultando ? (
            <CargandoEvaluaciones />
          ) : notas.length === 0 ? (
            <VacioEvaluaciones
              titulo="Sin evaluaciones publicadas"
              descripcion="Las materias aparecerán aquí después de completar el flujo institucional y su publicación."
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {notas.map((nota, indice) => (
                <article key={`${nota.nombre}-${indice}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Materia publicada</p>
                  <h2 className="mt-1 text-xl font-black text-slate-950">{nota.nombre}</h2>
                  <div className="mt-5 grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-xl bg-white p-3">
                      <p className="text-xs font-semibold text-slate-500">Considerada</p>
                      <p className="mt-1 font-mono text-xl font-black">{Number(nota.nota_considerada).toFixed(4)}</p>
                    </div>
                    <div className="rounded-xl bg-white p-3">
                      <p className="mb-2 text-xs font-semibold text-slate-500">Clasificación</p>
                      <ClasificacionBadge clasificacion={nota.clasificacion} />
                    </div>
                    <div className="rounded-xl bg-white p-3">
                      <p className="text-xs font-semibold text-slate-500">Orden</p>
                      <p className="mt-1 text-xl font-black">#{nota.orden_merito}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </PaginaProtegidaEvaluaciones>
  );
}
