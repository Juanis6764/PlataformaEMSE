"use client";

import { useCallback, useEffect, useState } from "react";
import AccesoRestringido from "../../../../../componentes/seguridad/AccesoRestringido";
import DetalleMateriaEvaluacionPanel from "../../../../../componentes/notas/evaluaciones/DetalleMateriaEvaluacion";
import TablaMatrizEvaluaciones from "../../../../../componentes/notas/evaluaciones/MatrizEvaluaciones";
import TablaResultadosEvaluaciones from "../../../../../componentes/notas/evaluaciones/ResultadosEvaluaciones";
import ResultadosRecibidosEvaluacionesPanel from "../../../../../componentes/notas/evaluaciones/ResultadosRecibidosEvaluaciones";
import {
  AvisoEvaluaciones,
  botonPrimarioEvaluaciones,
  CargandoEvaluaciones,
  campoEvaluaciones,
  EncabezadoEvaluaciones,
  EstadoMateriaBadge,
  nombreCursoEvaluaciones,
  PaginaProtegidaEvaluaciones,
  tarjetaEvaluaciones,
  VacioEvaluaciones,
} from "../../../../../componentes/notas/evaluaciones/InterfazEvaluaciones";
import { SelectoresEvaluaciones } from "../../../../../componentes/notas/evaluaciones/SelectoresEvaluaciones";
import {
  consultarMatrizEvaluaciones,
  consultarResultadosRecibidosEvaluaciones,
  consultarResultadosEvaluaciones,
  listarMateriasEvaluaciones,
  mensajeErrorApi,
  obtenerContextoEvaluaciones,
  obtenerMateriaEvaluacion,
} from "../../../../../servicios/notas/evaluaciones.service";
import {
  ContextoEvaluaciones,
  DetalleMateriaEvaluacion,
  MateriaEvaluacion,
  MatrizEvaluaciones,
  ResultadosRecibidosEvaluaciones,
  ResultadosEvaluaciones,
} from "../../../../../tipos/notas/evaluaciones";

type VistaConsulta =
  | "RESULTADOS_RECIBIDOS"
  | "MATERIAS"
  | "MATRIZ"
  | "RESULTADOS";

export default function ConsultaEvaluacionesPage() {
  const [contexto, setContexto] = useState<ContextoEvaluaciones | null>(null);
  const [vista, setVista] = useState<VistaConsulta>("RESULTADOS_RECIBIDOS");
  const [idGestion, setIdGestion] = useState<number | null>(null);
  const [idPeriodo, setIdPeriodo] = useState<number | null>(null);
  const [idCurso, setIdCurso] = useState<number | null>(null);
  const [idMateria, setIdMateria] = useState<number | null>(null);
  const [materias, setMaterias] = useState<MateriaEvaluacion[]>([]);
  const [detalle, setDetalle] = useState<DetalleMateriaEvaluacion | null>(null);
  const [matriz, setMatriz] = useState<MatrizEvaluaciones | null>(null);
  const [resultados, setResultados] = useState<ResultadosEvaluaciones | null>(null);
  const [resultadosRecibidos, setResultadosRecibidos] =
    useState<ResultadosRecibidosEvaluaciones | null>(null);
  const [cargando, setCargando] = useState(true);
  const [consultando, setConsultando] = useState(false);
  const [error, setError] = useState("");

  const cargarContexto = useCallback(async () => {
    setError("");
    try {
      const real = await obtenerContextoEvaluaciones();
      setContexto(real);
      const parametros = new URLSearchParams(window.location.search);
      const idGestionSolicitado = Number(parametros.get("id_gestion"));
      const idPeriodoSolicitado = Number(parametros.get("id_periodo"));
      const idCursoSolicitado = Number(parametros.get("id_curso"));
      const gestionPorDefecto =
        real.gestiones.find((item) => item.periodos.some((periodo) => periodo.activo)) ??
        real.gestiones[0];
      const gestion =
        real.gestiones.find(
          (item) => item.id_gestion === idGestionSolicitado,
        ) ?? gestionPorDefecto;
      const periodo =
        gestion?.periodos.find(
          (item) => item.id_periodo === idPeriodoSolicitado,
        ) ??
        gestion?.periodos.find((item) => item.activo) ??
        gestion?.periodos[0];
      const curso =
        real.cursos.find((item) => item.id_curso === idCursoSolicitado) ??
        real.cursos[0];
      const seleccion = {
        id_gestion: gestion?.id_gestion ?? null,
        id_periodo: periodo?.id_periodo ?? null,
        id_curso: curso?.id_curso ?? null,
      };
      setIdGestion(seleccion.id_gestion);
      setIdPeriodo(seleccion.id_periodo);
      setIdCurso(seleccion.id_curso);

      setVista("RESULTADOS_RECIBIDOS");
      if (
        seleccion.id_gestion &&
        seleccion.id_periodo &&
        seleccion.id_curso
      ) {
        setConsultando(true);
        setResultadosRecibidos(
          await consultarResultadosRecibidosEvaluaciones({
            id_gestion: seleccion.id_gestion,
            id_periodo: seleccion.id_periodo,
            id_curso: seleccion.id_curso,
          }),
        );
      }
    } catch (e) {
      setError(mensajeErrorApi(e));
    } finally {
      setConsultando(false);
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => void cargarContexto());
  }, [cargarContexto]);

  function limpiarResultados() {
    setIdMateria(null);
    setMaterias([]);
    setDetalle(null);
    setMatriz(null);
    setResultados(null);
    setResultadosRecibidos(null);
  }

  async function consultar() {
    if (!idGestion || !idPeriodo || !idCurso) {
      setError("Seleccione gestión, periodo y curso.");
      return;
    }
    setConsultando(true);
    setError("");
    try {
      const filtros = { id_gestion: idGestion, id_periodo: idPeriodo, id_curso: idCurso };
      if (vista === "RESULTADOS_RECIBIDOS") {
        setResultadosRecibidos(
          await consultarResultadosRecibidosEvaluaciones(filtros),
        );
      } else if (vista === "MATERIAS") {
        const lista = await listarMateriasEvaluaciones(filtros);
        setMaterias(lista);
        const elegida = idMateria && lista.some((item) => item.id_materia === idMateria)
          ? idMateria
          : null;
        setIdMateria(elegida);
        setDetalle(elegida ? await obtenerMateriaEvaluacion(elegida) : null);
      } else if (vista === "MATRIZ") {
        setMatriz(await consultarMatrizEvaluaciones(filtros));
      } else {
        setResultados(await consultarResultadosEvaluaciones(filtros));
      }
    } catch (e) {
      setError(mensajeErrorApi(e));
    } finally {
      setConsultando(false);
    }
  }

  async function abrirMateria(id: number) {
    setIdMateria(id);
    setConsultando(true);
    setError("");
    try {
      setDetalle(await obtenerMateriaEvaluacion(id));
    } catch (e) {
      setError(mensajeErrorApi(e));
    } finally {
      setConsultando(false);
    }
  }

  if (cargando) {
    return (
      <PaginaProtegidaEvaluaciones>
        <CargandoEvaluaciones />
      </PaginaProtegidaEvaluaciones>
    );
  }
  if (
    !contexto ||
    !["ENCARGADO_EVALUACIONES", "SECCION_ACADEMICA", "JEFE_ESTUDIOS", "COMANDO", "ADMINISTRADOR"].includes(
      contexto.perfil,
    )
  ) {
    return <AccesoRestringido />;
  }

  return (
    <PaginaProtegidaEvaluaciones>
      <div className="mx-auto max-w-[100rem] space-y-5">
        <EncabezadoEvaluaciones
          titulo="Consulta"
          descripcion="Consulte los resultados finales recibidos de cada área y las notas publicadas de Evaluaciones. Esta vista es únicamente de lectura."
        />
        {error && <AvisoEvaluaciones tipo="error">{error}</AvisoEvaluaciones>}

        <nav className="flex gap-2 overflow-x-auto rounded-xl border bg-white p-2 shadow-sm">
          {(
            [
              ["RESULTADOS_RECIBIDOS", "Resultados recibidos"],
              ["MATERIAS", "Materias y notas"],
              ["MATRIZ", "Matriz"],
              ["RESULTADOS", "Resultados"],
            ] as Array<[VistaConsulta, string]>
          ).map(([valor, etiqueta]) => (
            <button
              key={valor}
              type="button"
              onClick={() => {
                setVista(valor);
                limpiarResultados();
              }}
              className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-bold transition ${vista === valor ? "bg-[#1b4332] text-white" : "text-slate-600 hover:bg-slate-100"}`}
            >
              {etiqueta}
            </button>
          ))}
        </nav>

        <section className={tarjetaEvaluaciones}>
          <div className="space-y-4">
            <SelectoresEvaluaciones
              contexto={contexto}
              idGestion={idGestion}
              idPeriodo={idPeriodo}
              idCurso={idCurso}
              cambiarGestion={(id) => {
                setIdGestion(id);
                limpiarResultados();
              }}
              cambiarPeriodo={(id) => {
                setIdPeriodo(id);
                limpiarResultados();
              }}
              cambiarCurso={(id) => {
                setIdCurso(id);
                limpiarResultados();
              }}
            />
            {vista === "MATERIAS" && (
              <label className="block text-sm font-semibold text-slate-700 sm:max-w-xl">
                Materia
                <select
                  className={`${campoEvaluaciones} mt-1`}
                  value={idMateria ?? ""}
                  disabled={materias.length === 0}
                  onChange={(evento) => {
                    const id = Number(evento.target.value) || null;
                    setIdMateria(id);
                    setDetalle(null);
                  }}
                >
                  <option value="">Todas / seleccione después de consultar</option>
                  {materias.map((materia) => (
                    <option key={materia.id_materia} value={materia.id_materia}>
                      Materia {materia.numero_materia} · {materia.nombre}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <button
              type="button"
              disabled={consultando || !idGestion || !idPeriodo || !idCurso}
              className={botonPrimarioEvaluaciones}
              onClick={() => void consultar()}
            >
              {consultando ? "Consultando…" : "Consultar"}
            </button>
          </div>
        </section>

        {vista === "RESULTADOS_RECIBIDOS" && (
          <section className={tarjetaEvaluaciones}>
            {consultando ? (
              <CargandoEvaluaciones texto="Consultando resultados recibidos…" />
            ) : resultadosRecibidos ? (
              <ResultadosRecibidosEvaluacionesPanel
                resultados={resultadosRecibidos}
              />
            ) : (
              <VacioEvaluaciones
                titulo="Sin resultados consultados"
                descripcion="Seleccione gestión, periodo y curso para revisar la disponibilidad de las tres áreas."
              />
            )}
          </section>
        )}

        {vista === "MATERIAS" && (
          <section className={tarjetaEvaluaciones}>
            {consultando && materias.length === 0 ? (
              <CargandoEvaluaciones />
            ) : materias.length === 0 ? (
              <VacioEvaluaciones
                titulo="Sin materias consultadas"
                descripcion="Seleccione los filtros y consulte. Comando verá únicamente materias publicadas."
              />
            ) : (
              <>
                <div className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {materias.map((materia) => (
                    <button
                      key={materia.id_materia}
                      type="button"
                      onClick={() => void abrirMateria(materia.id_materia)}
                      className={`rounded-xl border p-4 text-left transition ${idMateria === materia.id_materia ? "border-[#2d6a4f] bg-emerald-50" : "border-slate-200 hover:bg-slate-50"}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-xs font-bold uppercase text-slate-500">
                            Materia {materia.numero_materia} · {nombreCursoEvaluaciones(materia.curso?.nombre)}
                          </p>
                          <h3 className="mt-1 font-black">{materia.nombre}</h3>
                        </div>
                        <EstadoMateriaBadge estado={materia.estado} />
                      </div>
                    </button>
                  ))}
                </div>
                {consultando ? (
                  <CargandoEvaluaciones />
                ) : detalle ? (
                  <DetalleMateriaEvaluacionPanel materia={detalle} />
                ) : (
                  <VacioEvaluaciones
                    titulo="Seleccione una materia"
                    descripcion="Abra una materia para consultar la planilla completa y su orden de mérito publicado."
                  />
                )}
              </>
            )}
          </section>
        )}

        {vista === "MATRIZ" && (
          <section className={tarjetaEvaluaciones}>
            {consultando ? (
              <CargandoEvaluaciones />
            ) : matriz ? (
              <TablaMatrizEvaluaciones matriz={matriz} />
            ) : (
              <VacioEvaluaciones titulo="Sin matriz consultada" descripcion="Seleccione los filtros y consulte la matriz publicada." />
            )}
          </section>
        )}

        {vista === "RESULTADOS" && (
          <section className={tarjetaEvaluaciones}>
            {consultando ? (
              <CargandoEvaluaciones />
            ) : resultados ? (
              <TablaResultadosEvaluaciones resultados={resultados} />
            ) : (
              <VacioEvaluaciones titulo="Sin resultados consultados" descripcion="Seleccione los filtros y consulte el avance o resultado final." />
            )}
          </section>
        )}
      </div>
    </PaginaProtegidaEvaluaciones>
  );
}
