"use client";

import { useCallback, useEffect, useState } from "react";
import AccesoRestringido from "../../seguridad/AccesoRestringido";
import {
  consultarMatrizEvaluaciones,
  consultarResultadosEvaluaciones,
  mensajeErrorApi,
  obtenerContextoEvaluaciones,
} from "../../../servicios/notas/evaluaciones.service";
import {
  ContextoEvaluaciones,
  MatrizEvaluaciones,
  ResultadosEvaluaciones,
} from "../../../tipos/notas/evaluaciones";
import {
  AvisoEvaluaciones,
  botonPrimarioEvaluaciones,
  CargandoEvaluaciones,
  EncabezadoEvaluaciones,
  PaginaProtegidaEvaluaciones,
  tarjetaEvaluaciones,
  VacioEvaluaciones,
} from "./InterfazEvaluaciones";
import { SelectoresEvaluaciones } from "./SelectoresEvaluaciones";
import TablaMatrizEvaluaciones from "./MatrizEvaluaciones";
import TablaResultadosEvaluaciones from "./ResultadosEvaluaciones";

export default function VistaConsultaDerivadaEvaluaciones({
  modo,
  soloEncargado = true,
}: {
  modo: "MATRIZ" | "RESULTADOS";
  soloEncargado?: boolean;
}) {
  const [contexto, setContexto] = useState<ContextoEvaluaciones | null>(null);
  const [idGestion, setIdGestion] = useState<number | null>(null);
  const [idPeriodo, setIdPeriodo] = useState<number | null>(null);
  const [idCurso, setIdCurso] = useState<number | null>(null);
  const [matriz, setMatriz] = useState<MatrizEvaluaciones | null>(null);
  const [resultados, setResultados] = useState<ResultadosEvaluaciones | null>(null);
  const [cargando, setCargando] = useState(true);
  const [consultando, setConsultando] = useState(false);
  const [error, setError] = useState("");

  const cargarContexto = useCallback(async () => {
    setError("");
    try {
      const real = await obtenerContextoEvaluaciones();
      setContexto(real);
      const gestion =
        real.gestiones.find((item) => item.periodos.some((periodo) => periodo.activo)) ??
        real.gestiones[0];
      const periodo =
        gestion?.periodos.find((item) => item.activo) ?? gestion?.periodos[0];
      setIdGestion(gestion?.id_gestion ?? null);
      setIdPeriodo(periodo?.id_periodo ?? null);
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

  async function consultar() {
    if (!idGestion || !idPeriodo || !idCurso) {
      setError("Seleccione gestión, periodo y curso.");
      return;
    }
    setConsultando(true);
    setError("");
    try {
      const filtros = { id_gestion: idGestion, id_periodo: idPeriodo, id_curso: idCurso };
      if (modo === "MATRIZ") {
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

  if (cargando) {
    return (
      <PaginaProtegidaEvaluaciones>
        <CargandoEvaluaciones />
      </PaginaProtegidaEvaluaciones>
    );
  }
  if (
    !contexto ||
    (soloEncargado && contexto.perfil !== "ENCARGADO_EVALUACIONES") ||
    (!soloEncargado &&
      !["ENCARGADO_EVALUACIONES", "SECCION_ACADEMICA", "JEFE_ESTUDIOS", "COMANDO", "ADMINISTRADOR"].includes(
        contexto.perfil,
      ))
  ) {
    return <AccesoRestringido />;
  }

  const contenido = modo === "MATRIZ" ? matriz : resultados;
  return (
    <PaginaProtegidaEvaluaciones>
      <div className="mx-auto max-w-[100rem] space-y-5">
        <EncabezadoEvaluaciones
          titulo={modo === "MATRIZ" ? "Matriz" : "Resultados"}
          descripcion={
            modo === "MATRIZ"
              ? "Consulta dinámica de materias publicadas, promedios y orden de mérito entregados por el backend."
              : "Seguimiento del promedio parcial y resultado final cuando todas las materias estén publicadas."
          }
        />
        {error && <AvisoEvaluaciones tipo="error">{error}</AvisoEvaluaciones>}
        <section className={tarjetaEvaluaciones}>
          <div className="space-y-4">
            <SelectoresEvaluaciones
              contexto={contexto}
              idGestion={idGestion}
              idPeriodo={idPeriodo}
              idCurso={idCurso}
              cambiarGestion={(id) => {
                setIdGestion(id);
                setMatriz(null);
                setResultados(null);
              }}
              cambiarPeriodo={(id) => {
                setIdPeriodo(id);
                setMatriz(null);
                setResultados(null);
              }}
              cambiarCurso={(id) => {
                setIdCurso(id);
                setMatriz(null);
                setResultados(null);
              }}
            />
            <button
              type="button"
              disabled={consultando || !idGestion || !idPeriodo || !idCurso}
              className={botonPrimarioEvaluaciones}
              onClick={() => void consultar()}
            >
              {consultando ? "Consultando…" : `Consultar ${modo === "MATRIZ" ? "matriz" : "resultados"}`}
            </button>
          </div>
        </section>

        <section className={tarjetaEvaluaciones}>
          {consultando ? (
            <CargandoEvaluaciones />
          ) : !contenido ? (
            <VacioEvaluaciones
              titulo="Seleccione los filtros"
              descripcion={`Use gestión, periodo y curso para consultar ${modo === "MATRIZ" ? "la matriz" : "los resultados"}.`}
            />
          ) : modo === "MATRIZ" && matriz ? (
            <TablaMatrizEvaluaciones matriz={matriz} />
          ) : resultados ? (
            <TablaResultadosEvaluaciones resultados={resultados} />
          ) : null}
        </section>
      </div>
    </PaginaProtegidaEvaluaciones>
  );
}
