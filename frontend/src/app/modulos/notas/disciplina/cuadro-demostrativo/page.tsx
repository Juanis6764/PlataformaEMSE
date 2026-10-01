"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  AvisoDisciplina,
  botonPrimarioDisciplina,
  CargandoDisciplina,
  campoDisciplina,
  EncabezadoDisciplina,
  EstadoSemanaBadge,
  ModalDisciplina,
  PaginaProtegidaDisciplina,
  tarjetaDisciplina,
  VacioDisciplina,
} from "../../../../../componentes/notas/disciplina/InterfazDisciplina";
import {
  consultarCuadroDemostrativoDisciplina,
  mensajeErrorApi,
  obtenerContextoDisciplina,
} from "../../../../../servicios/notas/disciplina.service";
import {
  ContextoDisciplina,
  CuadroDemostrativoDisciplina,
  SemanaCuadroDisciplina,
} from "../../../../../tipos/notas/disciplina";

type DetalleSeleccionado = {
  estudiante: string;
  semana: SemanaCuadroDisciplina;
};

export default function CuadroDemostrativoDisciplinaPage() {
  const [contexto, setContexto] = useState<ContextoDisciplina | null>(null);
  const [idGestion, setIdGestion] = useState<number | null>(null);
  const [idPeriodo, setIdPeriodo] = useState<number | null>(null);
  const [resultado, setResultado] =
    useState<CuadroDemostrativoDisciplina | null>(null);
  const [detalle, setDetalle] = useState<DetalleSeleccionado | null>(null);
  const [cargando, setCargando] = useState(true);
  const [consultando, setConsultando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let vigente = true;

    async function iniciar() {
      try {
        const real = await obtenerContextoDisciplina();
        if (!vigente) return;
        setContexto(real);

        const gestion =
          real.gestiones.find((item) =>
            item.periodos.some((periodo) => periodo.activo),
          ) ?? real.gestiones[0];
        const periodo =
          gestion?.periodos.find((item) => item.activo) ?? gestion?.periodos[0];
        setIdGestion(gestion?.id_gestion ?? null);
        setIdPeriodo(periodo?.id_periodo ?? null);

        if (real.perfil !== "OPERADOR_DISCIPLINA") {
          setError(
            "El cuadro demostrativo está disponible únicamente para operadores de Disciplina.",
          );
          return;
        }
        if (!gestion || !periodo) return;

        const cuadro = await consultarCuadroDemostrativoDisciplina({
          id_gestion: gestion.id_gestion,
          id_periodo: periodo.id_periodo,
        });
        if (vigente) setResultado(cuadro);
      } catch (e) {
        if (vigente) setError(mensajeErrorApi(e));
      } finally {
        if (vigente) setCargando(false);
      }
    }

    void iniciar();
    return () => {
      vigente = false;
    };
  }, []);

  async function consultar(evento: FormEvent) {
    evento.preventDefault();
    if (!idGestion || !idPeriodo) {
      setError("Seleccione la gestión y el periodo.");
      return;
    }
    setConsultando(true);
    setError("");
    try {
      setResultado(
        await consultarCuadroDemostrativoDisciplina({
          id_gestion: idGestion,
          id_periodo: idPeriodo,
        }),
      );
    } catch (e) {
      setError(mensajeErrorApi(e));
    } finally {
      setConsultando(false);
    }
  }

  const gestionSeleccionada = contexto?.gestiones.find(
    (gestion) => gestion.id_gestion === idGestion,
  );
  const cursoAsignado = resultado?.curso ?? contexto?.cursos[0]?.nombre;

  if (cargando) {
    return (
      <PaginaProtegidaDisciplina permisos={["VER_NOTAS"]}>
        <CargandoDisciplina texto="Construyendo el cuadro demostrativo con los registros actuales…" />
      </PaginaProtegidaDisciplina>
    );
  }

  return (
    <PaginaProtegidaDisciplina permisos={["VER_NOTAS"]}>
      <div className="mx-auto max-w-[1800px] space-y-5">
        <EncabezadoDisciplina
          titulo="Cuadro demostrativo"
          descripcion="Vista consolidada de solo lectura para el curso asignado. Los deméritos se distribuyen por semana y los méritos se totalizan por semestre."
        />

        {error && <AvisoDisciplina tipo="error">{error}</AvisoDisciplina>}

        {contexto && contexto.perfil === "OPERADOR_DISCIPLINA" && (
          <form
            className={`${tarjetaDisciplina} grid gap-4 md:grid-cols-[1fr_1fr_1fr_auto] md:items-end`}
            onSubmit={consultar}
          >
            <label className="text-sm font-semibold text-slate-700">
              Gestión
              <select
                className={`${campoDisciplina} mt-1`}
                value={idGestion ?? ""}
                onChange={(evento) => {
                  const siguienteGestion = Number(evento.target.value);
                  const gestion = contexto.gestiones.find(
                    (item) => item.id_gestion === siguienteGestion,
                  );
                  const periodo =
                    gestion?.periodos.find((item) => item.activo) ??
                    gestion?.periodos[0];
                  setIdGestion(siguienteGestion);
                  setIdPeriodo(periodo?.id_periodo ?? null);
                  setResultado(null);
                }}
              >
                {contexto.gestiones.map((gestion) => (
                  <option key={gestion.id_gestion} value={gestion.id_gestion}>
                    {gestion.ano}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm font-semibold text-slate-700">
              Periodo / semestre
              <select
                className={`${campoDisciplina} mt-1`}
                value={idPeriodo ?? ""}
                onChange={(evento) => {
                  setIdPeriodo(Number(evento.target.value));
                  setResultado(null);
                }}
              >
                {(gestionSeleccionada?.periodos ?? []).map((periodo) => (
                  <option key={periodo.id_periodo} value={periodo.id_periodo}>
                    Periodo {periodo.periodo}
                  </option>
                ))}
              </select>
            </label>

            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Curso asignado
              </p>
              <p className="mt-0.5 text-sm font-bold text-slate-900">
                {cursoAsignado?.replaceAll("_", " ") ?? "Sin asignación"}
              </p>
            </div>

            <button
              type="submit"
              disabled={consultando || !idGestion || !idPeriodo}
              className={botonPrimarioDisciplina}
            >
              {consultando ? "Actualizando…" : "Actualizar cuadro"}
            </button>
          </form>
        )}

        {!resultado ? (
          <VacioDisciplina
            titulo="Sin cuadro para mostrar"
            descripcion="Seleccione la gestión y el periodo para consultar los registros actuales de su curso asignado."
          />
        ) : (
          <section className={tarjetaDisciplina}>
            <div className="mb-4 flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#52796f]">
                  Cuadro demostrativo de disciplina
                </p>
                <h2 className="mt-1 text-xl font-black text-slate-950">
                  {resultado.curso.replaceAll("_", " ")} · Periodo {" "}
                  {resultado.periodo} · Gestión {resultado.gestion}
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  {resultado.cantidad_semanas} semanas · {resultado.cadetes.length}{" "}
                  estudiantes · incluye registros en BORRADOR y demás estados
                  actuales
                </p>
              </div>
              <span className="inline-flex w-fit rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-800">
                SOLO LECTURA
              </span>
            </div>

            {resultado.cadetes.length === 0 ? (
              <VacioDisciplina
                titulo="Sin estudiantes en el curso"
                descripcion="El curso asignado no tiene estudiantes actuales."
              />
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full min-w-[2200px] border-collapse text-center text-sm">
                  <thead className="bg-slate-100 text-xs uppercase text-slate-600">
                    <tr>
                      <th className="sticky left-0 z-20 w-14 border-b border-r border-slate-200 bg-slate-100 p-2">
                        N.º
                      </th>
                      <th className="sticky left-14 z-20 min-w-72 border-b border-r border-slate-200 bg-slate-100 p-2 text-left">
                        Estudiante
                      </th>
                      {Array.from(
                        { length: resultado.cantidad_semanas },
                        (_, indice) => (
                          <th
                            key={indice + 1}
                            className="w-16 border-b border-r border-slate-200 p-2"
                          >
                            Sem. {indice + 1}
                          </th>
                        ),
                      )}
                      <th className="min-w-28 border-b border-r border-slate-200 bg-emerald-50 p-2 text-emerald-900">
                        Total méritos
                      </th>
                      <th className="min-w-32 border-b border-slate-200 bg-red-50 p-2 text-red-900">
                        Total deméritos
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {resultado.cadetes.map((fila, indice) => (
                      <tr key={fila.id_cadete} className="border-b last:border-b-0">
                        <td className="sticky left-0 z-10 border-r border-slate-200 bg-white p-2 font-semibold tabular-nums">
                          {indice + 1}
                        </td>
                        <td className="sticky left-14 z-10 border-r border-slate-200 bg-white p-2 text-left">
                          <p className="font-semibold text-slate-900">
                            {fila.apellidos} {fila.nombres}
                          </p>
                          <p className="text-xs text-slate-500">CI {fila.ci}</p>
                        </td>
                        {fila.semanas.map((semana) => {
                          const tieneDeméritos = Number(semana.total_demeritos) > 0;
                          return (
                            <td
                              key={semana.numero_semana}
                              className="border-r border-slate-200 p-1.5 font-mono tabular-nums"
                            >
                              {tieneDeméritos ? (
                                <button
                                  type="button"
                                  className="w-full rounded-md bg-red-50 px-2 py-1 font-bold text-red-800 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-300"
                                  title={`Ver detalle de la semana ${semana.numero_semana}`}
                                  onClick={() =>
                                    setDetalle({
                                      estudiante: `${fila.apellidos} ${fila.nombres}`,
                                      semana,
                                    })
                                  }
                                >
                                  {formatearPuntos(semana.total_demeritos)}
                                </button>
                              ) : (
                                "0"
                              )}
                            </td>
                          );
                        })}
                        <td className="border-r border-slate-200 bg-emerald-50/50 p-2 font-mono font-bold tabular-nums text-emerald-900">
                          {formatearPuntos(fila.total_meritos)}
                        </td>
                        <td className="bg-red-50/50 p-2 font-mono font-bold tabular-nums text-red-900">
                          {formatearPuntos(fila.total_demeritos)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <p className="mt-3 text-xs text-slate-500">
              Cada celda semanal contiene únicamente la suma de deméritos. Los
              méritos corresponden al total del semestre. Seleccione una cifra
              semanal para ver su detalle.
            </p>
          </section>
        )}
      </div>

      <ModalDisciplina
        abierto={Boolean(detalle)}
        titulo={`Detalle de semana ${detalle?.semana.numero_semana ?? ""}`}
        descripcion={detalle?.estudiante}
        cerrar={() => setDetalle(null)}
      >
        <div className="space-y-3">
          {detalle?.semana.detalles.map((registro) => (
            <div
              key={registro.id_registro}
              className="rounded-xl border border-slate-200 p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    {registro.codigo}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {registro.nombre}
                  </p>
                </div>
                <p className="font-mono font-black tabular-nums text-red-800">
                  {formatearPuntos(registro.puntaje)}
                </p>
              </div>
              <div className="mt-3">
                <EstadoSemanaBadge estado={registro.estado} />
              </div>
            </div>
          ))}
        </div>
      </ModalDisciplina>
    </PaginaProtegidaDisciplina>
  );
}

function formatearPuntos(valor: string) {
  const numero = Number(valor);
  return Number.isInteger(numero)
    ? numero.toString()
    : numero.toLocaleString("es-BO", { maximumFractionDigits: 4 });
}
