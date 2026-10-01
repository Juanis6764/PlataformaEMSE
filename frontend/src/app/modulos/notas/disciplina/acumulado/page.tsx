"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  AvisoDisciplina,
  botonPrimarioDisciplina,
  botonSecundarioDisciplina,
  CargandoDisciplina,
  campoDisciplina,
  EncabezadoDisciplina,
  PaginaProtegidaDisciplina,
  tarjetaDisciplina,
  VacioDisciplina,
} from "../../../../../componentes/notas/disciplina/InterfazDisciplina";
import { SelectoresDisciplina } from "../../../../../componentes/notas/disciplina/SelectoresDisciplina";
import {
  consultarAcumuladoDisciplina,
  mensajeErrorApi,
  obtenerContextoDisciplina,
} from "../../../../../servicios/notas/disciplina.service";
import {
  AcumuladoDisciplina,
  ContextoDisciplina,
} from "../../../../../tipos/notas/disciplina";

export default function AcumuladoDisciplinaPage() {
  const [contexto, setContexto] = useState<ContextoDisciplina | null>(null);
  const [idGestion, setIdGestion] = useState<number | null>(null);
  const [idPeriodo, setIdPeriodo] = useState<number | null>(null);
  const [idCurso, setIdCurso] = useState<number | null>(null);
  const [fechaInicial, setFechaInicial] = useState("");
  const [fechaFinal, setFechaFinal] = useState("");
  const [resultado, setResultado] = useState<AcumuladoDisciplina | null>(null);
  const [cargando, setCargando] = useState(true);
  const [consultando, setConsultando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void obtenerContextoDisciplina()
      .then((real) => {
        setContexto(real);
        const gestion =
          real.gestiones.find((item) =>
            item.periodos.some((periodo) => periodo.activo),
          ) ?? real.gestiones[0];
        const periodo =
          gestion?.periodos.find((item) => item.activo) ?? gestion?.periodos[0];
        setIdGestion(gestion?.id_gestion ?? null);
        setIdPeriodo(periodo?.id_periodo ?? null);
        setIdCurso(real.cursos[0]?.id_curso ?? null);
      })
      .catch((e) => setError(mensajeErrorApi(e)))
      .finally(() => setCargando(false));
  }, []);

  async function consultar(evento: FormEvent) {
    evento.preventDefault();
    if (!idGestion || !idPeriodo || !idCurso) {
      setError("Seleccione gestión, periodo y curso.");
      return;
    }
    if (fechaInicial && fechaFinal && fechaInicial > fechaFinal) {
      setError("La fecha inicial no puede ser posterior a la fecha final.");
      return;
    }
    setConsultando(true);
    setError("");
    try {
      setResultado(
        await consultarAcumuladoDisciplina({
          id_gestion: idGestion,
          id_periodo: idPeriodo,
          id_curso: idCurso,
          fecha_inicial: fechaInicial || undefined,
          fecha_final: fechaFinal || undefined,
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
      <PaginaProtegidaDisciplina permisos={["PUBLICAR_NOTAS"]}>
        <CargandoDisciplina />
      </PaginaProtegidaDisciplina>
    );
  }

  return (
    <PaginaProtegidaDisciplina permisos={["PUBLICAR_NOTAS"]}>
      <div className="mx-auto max-w-7xl space-y-5 print:max-w-none">
        <div className="print:hidden">
          <EncabezadoDisciplina
            titulo="Acumulado de Disciplina"
            descripcion="Consulta en tiempo real. Incluye a todos los estudiantes del curso, aunque no tengan registros publicados."
          />
        </div>
        {error && <AvisoDisciplina tipo="error">{error}</AvisoDisciplina>}
        {contexto && (
          <form
            className={`${tarjetaDisciplina} space-y-4 print:hidden`}
            onSubmit={consultar}
          >
            <SelectoresDisciplina
              contexto={contexto}
              idGestion={idGestion}
              idPeriodo={idPeriodo}
              idCurso={idCurso}
              cambiarGestion={(id) => {
                setIdGestion(id);
                setResultado(null);
              }}
              cambiarPeriodo={(id) => {
                setIdPeriodo(id);
                setResultado(null);
              }}
              cambiarCurso={(id) => {
                setIdCurso(id);
                setResultado(null);
              }}
            />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
              <label className="text-sm font-semibold text-slate-700">
                Fecha inicial
                <input
                  type="date"
                  className={`${campoDisciplina} mt-1`}
                  value={fechaInicial}
                  onChange={(evento) => setFechaInicial(evento.target.value)}
                />
              </label>
              <label className="text-sm font-semibold text-slate-700">
                Fecha final
                <input
                  type="date"
                  className={`${campoDisciplina} mt-1`}
                  value={fechaFinal}
                  onChange={(evento) => setFechaFinal(evento.target.value)}
                />
              </label>
              <button
                disabled={consultando}
                className={botonPrimarioDisciplina}
              >
                {consultando ? "Calculando…" : "Calcular acumulado"}
              </button>
            </div>
          </form>
        )}

        {!resultado ? (
          <VacioDisciplina
            titulo="Seleccione los filtros"
            descripcion="El reporte no se guarda como tabla y solo se calcula cuando realiza una consulta."
          />
        ) : (
          <section
            className={`${tarjetaDisciplina} print:border-0 print:p-0 print:shadow-none`}
          >
            <div className="mb-5 flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
                  Reporte en pantalla
                </p>
                <h1 className="text-2xl font-black text-slate-950">
                  Acumulado de Disciplina
                </h1>
                <p className="text-sm text-slate-600">
                  Gestión {resultado.gestion} · Periodo {resultado.periodo} ·{" "}
                  {resultado.curso.replaceAll("_", " ")}
                </p>
                <p className="text-sm font-semibold text-emerald-700">
                  Calculado con {resultado.semanas_publicadas} de{" "}
                  {resultado.semanas_configuradas} semanas publicadas
                </p>
                <p className="text-xs text-slate-500">
                  Rango: {resultado.fecha_inicial ?? "inicio del periodo"} a{" "}
                  {resultado.fecha_final ?? "fecha actual"}
                </p>
              </div>
              <button
                type="button"
                className={`${botonSecundarioDisciplina} print:hidden`}
                onClick={() => window.print()}
              >
                Imprimir desde el navegador
              </button>
            </div>
            <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4 print:hidden">
              <Indicador
                valor={resultado.cadetes.length}
                etiqueta="Estudiantes incluidos"
              />
              <Indicador
                valor={resultado.cadetes.filter((fila) => fila.alerta).length}
                etiqueta="Alertas > 30"
                alerta
              />
              <Indicador
                valor={
                  resultado.cadetes.filter(
                    (fila) => Number(fila.total_meritos) > 0,
                  ).length
                }
                etiqueta="Con méritos"
              />
              <Indicador
                valor={
                  resultado.cadetes.filter(
                    (fila) => Number(fila.total_demeritos) > 0,
                  ).length
                }
                etiqueta="Con deméritos"
              />
            </div>
            {resultado.cadetes.length === 0 ? (
              <VacioDisciplina
                titulo="Sin estudiantes en el curso"
                descripcion="El curso seleccionado no tiene estudiantes actuales."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] border-collapse text-left text-sm print:min-w-0 print:text-[9px]">
                  <thead>
                    <tr className="border-y bg-slate-50 text-xs uppercase text-slate-600">
                      <th className="p-2">N.º</th>
                      <th className="p-2">CI</th>
                      <th className="p-2">Curso</th>
                      <th className="p-2">Apellidos y nombres</th>
                      <th className="p-2 text-right">Méritos</th>
                      <th className="p-2 text-right">Deméritos</th>
                      <th className="p-2 text-right">Neto</th>
                      <th className="p-2 text-right">Valor/punto</th>
                      <th className="p-2 text-right">Descuento</th>
                      <th className="p-2 text-right">Nota acumulada</th>
                      <th className="p-2">Alerta</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resultado.cadetes.map((fila, indice) => (
                      <tr
                        key={fila.id_cadete}
                        className={`border-b ${fila.alerta ? "bg-red-50" : ""}`}
                      >
                        <td className="p-2">{indice + 1}</td>
                        <td className="p-2">{fila.ci}</td>
                        <td className="p-2">
                          {fila.grado.replaceAll("_", " ")}
                        </td>
                        <td className="p-2 font-semibold">
                          {fila.apellidos} {fila.nombres}
                        </td>
                        <Decimal valor={fila.total_meritos} />
                        <Decimal valor={fila.total_demeritos} />
                        <Decimal valor={fila.demerito_neto} />
                        <Decimal valor={fila.valor_por_punto} />
                        <Decimal valor={fila.descuento} />
                        <Decimal valor={fila.nota} />
                        <td className="p-2">
                          {fila.alerta ? (
                            <span className="font-bold text-red-700">
                              Demérito neto mayor a 30
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="mt-4 text-xs text-slate-500">
              Valores calculados al momento de la consulta. La nota se muestra
              con cuatro decimales.
            </p>
          </section>
        )}
      </div>
    </PaginaProtegidaDisciplina>
  );
}

function Decimal({ valor }: { valor: string }) {
  return (
    <td className="p-2 text-right font-mono tabular-nums">
      {Number(valor).toFixed(4)}
    </td>
  );
}

function Indicador({
  valor,
  etiqueta,
  alerta = false,
}: {
  valor: number;
  etiqueta: string;
  alerta?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-3 ${alerta && valor ? "border-red-200 bg-red-50" : "border-slate-200 bg-slate-50"}`}
    >
      <p className="text-2xl font-black">{valor}</p>
      <p className="text-xs text-slate-500">{etiqueta}</p>
    </div>
  );
}
