"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../../contextos/AuthContext";
import {
  aprobarMatrizAcademica,
  consultarMatrizAcademica,
  enviarMatrizAcademica,
  generarMatrizAcademica,
  observarMatrizAcademica,
  publicarMatrizAcademica,
  registrarAntecedenteAcademico,
} from "../../../servicios/notas/matriz-academica.service";
import {
  mensajeErrorApi,
  obtenerContextoEvaluaciones,
} from "../../../servicios/notas/evaluaciones.service";
import { ContextoEvaluaciones } from "../../../tipos/notas/evaluaciones";
import {
  MatrizAcademica,
  TipoMatrizAcademica,
} from "../../../tipos/notas/matriz-academica";
import {
  AvisoEvaluaciones,
  botonPrimarioEvaluaciones,
  botonSecundarioEvaluaciones,
  CargandoEvaluaciones,
  EncabezadoEvaluaciones,
  PaginaProtegidaEvaluaciones,
  tarjetaEvaluaciones,
  VacioEvaluaciones,
} from "./InterfazEvaluaciones";
import { SelectoresEvaluaciones } from "./SelectoresEvaluaciones";

const etiquetaFuente: Record<string, string> = {
  evaluaciones: "Evaluaciones",
  disciplina: "Disciplina",
  entrenamiento_fisico: "Entrenamiento Físico",
  semestre_i: "Matriz semestral I",
  semestre_ii: "Matriz semestral II",
};

export default function MatrizAcademicaFinal() {
  const { usuario } = useAuth();
  const [contexto, setContexto] = useState<ContextoEvaluaciones | null>(null);
  const [idGestion, setIdGestion] = useState<number | null>(null);
  const [idPeriodo, setIdPeriodo] = useState<number | null>(null);
  const [idCurso, setIdCurso] = useState<number | null>(null);
  const [tipo, setTipo] = useState<TipoMatrizAcademica>("SEMESTRAL");
  const [matriz, setMatriz] = useState<MatrizAcademica | null>(null);
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState("");
  const [antecedenteCadete, setAntecedenteCadete] = useState("");
  const [antecedenteGestion, setAntecedenteGestion] = useState("2025");
  const [antecedentePromedio, setAntecedentePromedio] = useState("");
  const [antecedenteAplazos, setAntecedenteAplazos] = useState("0");
  const [busqueda, setBusqueda] = useState("");

  const cargarContexto = useCallback(async () => {
    try {
      const real = await obtenerContextoEvaluaciones();
      setContexto(real);
      const gestion =
        real.gestiones.find((item) => item.periodos.some((p) => p.activo)) ??
        real.gestiones[0];
      setIdGestion(gestion?.id_gestion ?? null);
      setIdPeriodo(
        gestion?.periodos.find((periodo) => periodo.activo)?.id_periodo ??
          gestion?.periodos[0]?.id_periodo ??
          null,
      );
      setIdCurso(real.cursos[0]?.id_curso ?? null);
    } catch (e) {
      setError(mensajeErrorApi(e));
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => void cargarContexto());
  }, [cargarContexto]);

  const seleccion =
    idGestion && idPeriodo && idCurso
      ? { id_gestion: idGestion, id_periodo: idPeriodo, id_curso: idCurso, tipo }
      : null;

  async function ejecutar(accion: () => Promise<MatrizAcademica>) {
    setProcesando(true);
    setError("");
    try {
      setMatriz(await accion());
    } catch (e) {
      setError(mensajeErrorApi(e));
    } finally {
      setProcesando(false);
    }
  }

  async function consultar() {
    if (!seleccion) return setError("Seleccione gestión, periodo y curso.");
    await ejecutar(() => consultarMatrizAcademica(seleccion));
  }

  async function guardarAntecedente() {
    if (!antecedenteCadete || !antecedentePromedio.trim()) {
      return setError("Seleccione un estudiante e ingrese el promedio histórico.");
    }
    setProcesando(true);
    setError("");
    try {
      await registrarAntecedenteAcademico({
        id_cadete: Number(antecedenteCadete),
        gestion: Number(antecedenteGestion),
        promedio_general: antecedentePromedio.trim().replace(",", "."),
        cantidad_aplazos: Number(antecedenteAplazos),
      });
      setAntecedentePromedio("");
      setAntecedenteAplazos("0");
      if (seleccion) setMatriz(await consultarMatrizAcademica(seleccion));
    } catch (e) {
      setError(mensajeErrorApi(e));
    } finally {
      setProcesando(false);
    }
  }

  const materias = matriz?.filas[0]?.materias ?? [];
  const esEncargado = contexto?.perfil === "ENCARGADO_EVALUACIONES";
  const termino = busqueda.trim().toLocaleLowerCase("es");
  const filasVisibles =
    matriz?.filas.filter((fila) =>
      !termino ||
      `${fila.ci} ${fila.nombres} ${fila.apellidos}`
        .toLocaleLowerCase("es")
        .includes(termino),
    ) ?? [];

  if (cargando) {
    return (
      <PaginaProtegidaEvaluaciones>
        <CargandoEvaluaciones />
      </PaginaProtegidaEvaluaciones>
    );
  }

  return (
    <PaginaProtegidaEvaluaciones>
      <div className="matriz-academica-pagina mx-auto max-w-[120rem] space-y-5">
        <div className="pantalla-solamente">
          <EncabezadoEvaluaciones
            titulo="Matriz de Notas Final"
            descripcion="Consolidación oficial: Evaluaciones 80 %, Entrenamiento Físico 10 % y Disciplina 10 %. Los datos provienen de sus módulos de origen."
          />
        </div>
        {error && (
          <div className="pantalla-solamente">
            <AvisoEvaluaciones tipo="error">{error}</AvisoEvaluaciones>
          </div>
        )}

        <section className={`${tarjetaEvaluaciones} pantalla-solamente`}>
          {contexto && (
            <div className="space-y-4">
              <SelectoresEvaluaciones
                contexto={contexto}
                idGestion={idGestion}
                idPeriodo={idPeriodo}
                idCurso={idCurso}
                cambiarGestion={(id) => {
                  setIdGestion(id);
                  setMatriz(null);
                }}
                cambiarPeriodo={(id) => {
                  setIdPeriodo(id);
                  setMatriz(null);
                }}
                cambiarCurso={(id) => {
                  setIdCurso(id);
                  setMatriz(null);
                }}
              />
              <div className="flex flex-wrap items-end gap-3">
                <label className="text-sm font-semibold text-slate-700">
                  Tipo de matriz
                  <select
                    className="ml-2 rounded-lg border border-slate-300 bg-white px-3 py-2"
                    value={tipo}
                    onChange={(e) => {
                      setTipo(e.target.value as TipoMatrizAcademica);
                      setMatriz(null);
                    }}
                  >
                    <option value="SEMESTRAL">Semestral</option>
                    <option value="ANUAL">Anual (cierre II)</option>
                  </select>
                </label>
                <button
                  type="button"
                  className={botonPrimarioEvaluaciones}
                  disabled={procesando || !seleccion}
                  onClick={() => void consultar()}
                >
                  {procesando ? "Procesando…" : "Consultar matriz"}
                </button>
              </div>
            </div>
          )}
        </section>

        {!matriz ? (
          <VacioEvaluaciones
            titulo="Seleccione una cohorte"
            descripcion="La matriz se puede revisar parcialmente aunque todavía falte alguna fuente oficial."
          />
        ) : (
          <>
            <section className={`${tarjetaEvaluaciones} pantalla-solamente`}>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap gap-2">
                  {Object.entries(matriz.disponibilidad)
                    .filter(([fuente]) => fuente in etiquetaFuente)
                    .map(([fuente, estado]) => {
                      const listo = estado === "COMPLETO" || estado === "PUBLICADO";
                      return (
                        <span
                          key={fuente}
                          className={`rounded-full border px-3 py-1.5 text-sm font-bold ${
                            listo
                              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                              : "border-amber-200 bg-amber-50 text-amber-800"
                          }`}
                        >
                          {etiquetaFuente[fuente]} {listo ? "✓" : "⏳"}
                        </span>
                      );
                    })}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className={botonSecundarioEvaluaciones}
                    onClick={() => window.print()}
                  >
                    IMPRIMIR MATRIZ
                  </button>
                  {matriz.acciones.generar && esEncargado && seleccion && (
                    <button
                      type="button"
                      className={botonPrimarioEvaluaciones}
                      disabled={procesando}
                      onClick={() => void ejecutar(() => generarMatrizAcademica(seleccion))}
                    >
                      Generar matriz
                    </button>
                  )}
                  {matriz.acciones.enviar && matriz.id_matriz && (
                    <button
                      type="button"
                      className={botonPrimarioEvaluaciones}
                      disabled={procesando}
                      onClick={() => void ejecutar(() => enviarMatrizAcademica(matriz.id_matriz!))}
                    >
                      Enviar matriz
                    </button>
                  )}
                  {matriz.acciones.aprobar && matriz.id_matriz && (
                    <button
                      type="button"
                      className={botonPrimarioEvaluaciones}
                      disabled={procesando}
                      onClick={() => void ejecutar(() => aprobarMatrizAcademica(matriz.id_matriz!))}
                    >
                      Aprobar
                    </button>
                  )}
                  {matriz.acciones.observar && matriz.id_matriz && (
                    <button
                      type="button"
                      className={botonSecundarioEvaluaciones}
                      disabled={procesando}
                      onClick={() => {
                        const motivo = window.prompt("Observación obligatoria");
                        if (motivo?.trim()) {
                          void ejecutar(() =>
                            observarMatrizAcademica(matriz.id_matriz!, motivo.trim()),
                          );
                        }
                      }}
                    >
                      Observar
                    </button>
                  )}
                  {matriz.acciones.publicar && matriz.id_matriz && (
                    <button
                      type="button"
                      className={botonPrimarioEvaluaciones}
                      disabled={procesando}
                      onClick={() => void ejecutar(() => publicarMatrizAcademica(matriz.id_matriz!))}
                    >
                      Publicar
                    </button>
                  )}
                </div>
              </div>
              <label className="mt-4 block max-w-xl text-sm font-semibold text-slate-700">
                Buscar por CI, nombres o apellidos
                <input
                  type="search"
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Escriba para filtrar la cohorte seleccionada"
                />
              </label>
            </section>

            {esEncargado && (
              <section className={`${tarjetaEvaluaciones} pantalla-solamente`}>
                <h2 className="text-lg font-black text-slate-950">Antecedentes históricos faltantes</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Solo 2024/2025. Desde 2026 el sistema usa automáticamente la matriz anual publicada.
                </p>
                <div className="mt-4 grid gap-3 md:grid-cols-5 md:items-end">
                  <label className="text-sm font-semibold text-slate-700 md:col-span-2">
                    Estudiante
                    <select className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2" value={antecedenteCadete} onChange={(e) => setAntecedenteCadete(e.target.value)}>
                      <option value="">Seleccione</option>
                      {matriz.filas.map((fila) => (
                        <option key={fila.id_cadete} value={fila.id_cadete}>{fila.ci} · {fila.apellidos} {fila.nombres}</option>
                      ))}
                    </select>
                  </label>
                  <label className="text-sm font-semibold text-slate-700">
                    Gestión
                    <select className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2" value={antecedenteGestion} onChange={(e) => setAntecedenteGestion(e.target.value)}>
                      <option value="2025">2025</option>
                      <option value="2024">2024</option>
                    </select>
                  </label>
                  <label className="text-sm font-semibold text-slate-700">
                    Promedio general
                    <input inputMode="decimal" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" value={antecedentePromedio} onChange={(e) => setAntecedentePromedio(e.target.value)} placeholder="0.0000" />
                  </label>
                  <label className="text-sm font-semibold text-slate-700">
                    Aplazos
                    <input type="number" min={0} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" value={antecedenteAplazos} onChange={(e) => setAntecedenteAplazos(e.target.value)} />
                  </label>
                </div>
                <button type="button" disabled={procesando || !antecedenteCadete || !antecedentePromedio.trim()} className={`${botonPrimarioEvaluaciones} mt-3`} onClick={() => void guardarAntecedente()}>
                  Guardar antecedente
                </button>
              </section>
            )}

            <section id="matriz-academica-imprimible" className="matriz-imprimible matriz-academica-imprimible rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="matriz-encabezado mb-4 text-center">
                <h2 className="text-xl font-black uppercase text-slate-950">
                  Matriz de Notas Final
                </h2>
                <div className="mt-1 flex flex-wrap justify-center gap-x-5 gap-y-1 text-sm text-slate-700">
                  <span><strong>Gestión:</strong> {matriz.gestion}</span>
                  <span><strong>Periodo / Semestre:</strong> {matriz.periodo}</span>
                  <span><strong>Curso:</strong> {matriz.curso.replaceAll("_", " ")}</span>
                  <span><strong>Tipo:</strong> {matriz.tipo === "ANUAL" ? "Anual" : "Semestral"}</span>
                  {matriz.estado && (
                    <span><strong>Estado:</strong> {matriz.estado.replaceAll("_", " ")}</span>
                  )}
                </div>
              </div>
              <div className="matriz-tabla-contenedor overflow-x-auto">
                <table className="min-w-max border-collapse text-[11px]">
                  <thead className="bg-slate-900 text-white">
                    <tr>
                      <th className="border border-slate-400 px-2 py-2">N°</th>
                      <th className="border border-slate-400 px-2 py-2">CI</th>
                      <th className="min-w-56 border border-slate-400 px-2 py-2 text-left">Apellidos y nombres</th>
                      {materias.map((materia) => (
                        <th key={materia.id_materia ?? materia.nombre} className="max-w-28 border border-slate-400 px-2 py-2">
                          {materia.nombre}
                        </th>
                      ))}
                      <th className="border border-slate-400 px-2 py-2">Prom. académico</th>
                      <th className="border border-slate-400 px-2 py-2">Eval. 80 %</th>
                      <th className="border border-slate-400 px-2 py-2">EF</th>
                      <th className="border border-slate-400 px-2 py-2">EF 10 %</th>
                      <th className="border border-slate-400 px-2 py-2">Disciplina</th>
                      <th className="border border-slate-400 px-2 py-2">Disc. 10 %</th>
                      <th className="border border-slate-400 px-2 py-2">Prom. general</th>
                      <th className="border border-slate-400 px-2 py-2">Aplazos</th>
                      <th className="border border-slate-400 px-2 py-2">Prom. acumulado</th>
                      <th className="border border-slate-400 px-2 py-2">Total aplazos</th>
                      <th className="border border-slate-400 px-2 py-2">Atributo</th>
                      <th className="border border-slate-400 px-2 py-2">Orden de mérito / Antigüedad</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filasVisibles.map((fila, indice) => (
                      <tr key={fila.id_cadete} className="odd:bg-slate-50">
                        <td className="border px-2 py-1 text-center">{indice + 1}</td>
                        <td className="border px-2 py-1">{fila.ci}</td>
                        <td className="border px-2 py-1 font-semibold">{fila.apellidos} {fila.nombres}</td>
                        {materias.map((materia) => (
                          <td key={materia.id_materia ?? materia.nombre} className="border px-2 py-1 text-center font-mono">
                            {fila.materias.find((item) => (item.id_materia ?? item.nombre) === (materia.id_materia ?? materia.nombre))?.nota ?? "—"}
                          </td>
                        ))}
                        {[fila.promedio_academico, fila.ponderacion_evaluaciones, fila.nota_entrenamiento_fisico, fila.ponderacion_entrenamiento, fila.nota_disciplina, fila.ponderacion_disciplina, fila.promedio_general].map((valor, i) => (
                          <td key={i} className="border px-2 py-1 text-center font-mono">{valor ?? "—"}</td>
                        ))}
                        <td className="border px-2 py-1 text-center">{fila.cantidad_aplazos ?? "—"}</td>
                        <td className="border px-2 py-1 text-center font-mono">{fila.promedio_acumulado ?? "—"}</td>
                        <td className="border px-2 py-1 text-center">{fila.cantidad_aplazos_acumulados ?? "—"}</td>
                        <td className="border px-2 py-1 text-center font-bold">{fila.atributo ?? "—"}</td>
                        <td className="border px-2 py-1 text-center font-black">
                          {fila.orden_merito
                            ? `${fila.orden_merito}/${matriz.filas.length}`
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
        <p className="pantalla-solamente text-xs text-slate-500">
          Sesión: {usuario?.nombres} {usuario?.apellidos}. Los cambios de estado y correcciones extraordinarias quedan registrados en Auditoría.
        </p>
      </div>
    </PaginaProtegidaEvaluaciones>
  );
}
