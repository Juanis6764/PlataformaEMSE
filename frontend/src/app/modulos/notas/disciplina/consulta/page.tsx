"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AccesoRestringido from "../../../../../componentes/seguridad/AccesoRestringido";
import DetalleSemanaDisciplina from "../../../../../componentes/notas/disciplina/DetalleSemanaDisciplina";
import ResultadoFinalDisciplina from "../../../../../componentes/notas/disciplina/ResultadoFinalDisciplina";
import {
  AvisoDisciplina,
  botonPrimarioDisciplina,
  CargandoDisciplina,
  EncabezadoDisciplina,
  EstadoSemanaBadge,
  PaginaProtegidaDisciplina,
  tarjetaDisciplina,
  VacioDisciplina,
} from "../../../../../componentes/notas/disciplina/InterfazDisciplina";
import { SelectoresDisciplina } from "../../../../../componentes/notas/disciplina/SelectoresDisciplina";
import {
  consultarAcumuladoDisciplina,
  listarConfiguracionesDisciplina,
  listarSemanasDisciplina,
  mensajeErrorApi,
  obtenerContextoDisciplina,
  obtenerSemanaDisciplina,
} from "../../../../../servicios/notas/disciplina.service";
import { suscribirseASemanasDisciplina } from "../../../../../servicios/notas/sincronizacion-disciplina";
import {
  AcumuladoDisciplina,
  ConfiguracionDisciplina,
  ContextoDisciplina,
  SemanaDetalleDisciplina,
  SemanaDisciplina,
} from "../../../../../tipos/notas/disciplina";

export default function ConsultaComandoDisciplinaPage() {
  const [contexto, setContexto] = useState<ContextoDisciplina | null>(null);
  const [configuraciones, setConfiguraciones] = useState<
    ConfiguracionDisciplina[]
  >([]);
  const [semanas, setSemanas] = useState<SemanaDisciplina[]>([]);
  const [detalle, setDetalle] = useState<SemanaDetalleDisciplina | null>(null);
  const [acumulado, setAcumulado] = useState<AcumuladoDisciplina | null>(null);
  const [idGestion, setIdGestion] = useState<number | null>(null);
  const [idPeriodo, setIdPeriodo] = useState<number | null>(null);
  const [idCurso, setIdCurso] = useState<number | null>(null);
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void Promise.all([
      obtenerContextoDisciplina(),
      listarConfiguracionesDisciplina({ solo_activas: true }),
    ])
      .then(([contextoReal, configuracionesReales]) => {
        setContexto(contextoReal);
        setConfiguraciones(configuracionesReales);
        const gestion =
          contextoReal.gestiones.find((item) =>
            item.periodos.some((periodo) => periodo.activo),
          ) ?? contextoReal.gestiones[0];
        const periodo =
          gestion?.periodos.find((item) => item.activo) ?? gestion?.periodos[0];
        setIdGestion(gestion?.id_gestion ?? null);
        setIdPeriodo(periodo?.id_periodo ?? null);
        setIdCurso(contextoReal.cursos[0]?.id_curso ?? null);
      })
      .catch((e) => setError(mensajeErrorApi(e)))
      .finally(() => setCargando(false));
  }, []);

  const cargarSemanas = useCallback(async () => {
    setDetalle(null);
    setAcumulado(null);
    if (!idPeriodo || !idCurso) {
      setSemanas([]);
      return;
    }
    try {
      setSemanas(
        await listarSemanasDisciplina({
          id_periodo: idPeriodo,
          id_curso: idCurso,
        }),
      );
    } catch (e) {
      setError(mensajeErrorApi(e));
    }
  }, [idCurso, idPeriodo]);

  useEffect(
    () => suscribirseASemanasDisciplina(cargarSemanas),
    [cargarSemanas],
  );

  useEffect(() => {
    queueMicrotask(() => void cargarSemanas());
  }, [cargarSemanas]);

  const configuracion = configuraciones.find(
    (item) => item.id_periodo === idPeriodo && item.id_curso === idCurso,
  );
  const porNumero = useMemo(
    () => new Map(semanas.map((semana) => [semana.numero_semana, semana])),
    [semanas],
  );

  async function abrirSemana(idSemana: number) {
    setProcesando(true);
    setError("");
    try {
      setDetalle(await obtenerSemanaDisciplina(idSemana));
    } catch (e) {
      setError(mensajeErrorApi(e));
    } finally {
      setProcesando(false);
    }
  }

  async function cargarAcumulado() {
    if (!idGestion || !idPeriodo || !idCurso) return;
    setProcesando(true);
    setError("");
    try {
      setAcumulado(
        await consultarAcumuladoDisciplina({
          id_gestion: idGestion,
          id_periodo: idPeriodo,
          id_curso: idCurso,
        }),
      );
    } catch (e) {
      setError(mensajeErrorApi(e));
    } finally {
      setProcesando(false);
    }
  }

  if (cargando) {
    return (
      <PaginaProtegidaDisciplina permisos={["VER_NOTAS"]}>
        <CargandoDisciplina />
      </PaginaProtegidaDisciplina>
    );
  }
  if (
    !contexto ||
    ![
      "ADMINISTRADOR",
      "ENCARGADO_DISCIPLINA",
      "SECCION_ACADEMICA",
      "JEFE_ESTUDIOS",
      "COMANDO",
    ].includes(contexto.perfil)
  ) {
    return <AccesoRestringido />;
  }

  const tituloPerfil =
    contexto.perfil === "COMANDO"
      ? "Consulta de Disciplina · Comando"
      : contexto.perfil === "JEFE_ESTUDIOS"
        ? "Consulta de Disciplina · Jefe de Estudios"
        : contexto.perfil === "SECCION_ACADEMICA"
          ? "Consulta de Disciplina · Sección Académica"
          : contexto.perfil === "ENCARGADO_DISCIPLINA"
            ? "Consulta de Disciplina · Encargado"
            : "Consulta de Disciplina";
  const seleccion =
    idGestion && idPeriodo && idCurso
      ? { id_gestion: idGestion, id_periodo: idPeriodo, id_curso: idCurso }
      : null;

  return (
    <PaginaProtegidaDisciplina permisos={["VER_NOTAS"]}>
      <div className="mx-auto max-w-7xl space-y-5">
        <EncabezadoDisciplina
          titulo={tituloPerfil}
          descripcion="Consulta institucional por gestión, periodo, curso y semana, con avance acumulado y resultado final cuando corresponde."
        />
        {error && <AvisoDisciplina tipo="error">{error}</AvisoDisciplina>}

        <section className={`${tarjetaDisciplina} space-y-4`}>
          <SelectoresDisciplina
            contexto={contexto}
            idGestion={idGestion}
            idPeriodo={idPeriodo}
            idCurso={idCurso}
            cambiarGestion={(id) => {
              setIdGestion(id);
              setDetalle(null);
              setAcumulado(null);
            }}
            cambiarPeriodo={(id) => {
              setIdPeriodo(id);
              setDetalle(null);
              setAcumulado(null);
            }}
            cambiarCurso={(id) => {
              setIdCurso(id);
              setDetalle(null);
              setAcumulado(null);
            }}
          />
          <div className="flex justify-end">
            <button
              type="button"
              disabled={procesando || !idGestion || !idPeriodo || !idCurso}
              className={botonPrimarioDisciplina}
              onClick={() => void cargarAcumulado()}
            >
              Ver acumulado publicado
            </button>
          </div>
        </section>

        <section className={tarjetaDisciplina}>
          <h2 className="text-lg font-black text-slate-950">
            Semanas del curso
          </h2>
          <p className="mb-4 text-sm text-slate-600">
            La configuración define el máximo; cada semana se habilita
            individualmente.
          </p>
          {!configuracion ? (
            <VacioDisciplina
              titulo="Periodo sin configuración"
              descripcion="El Encargado de Disciplina todavía no configuró semanas para esta selección."
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from(
                { length: configuracion.cantidad_semanas },
                (_, indice) => indice + 1,
              ).map((numero) => {
                const semana = porNumero.get(numero);
                return semana ? (
                  <button
                    key={numero}
                    type="button"
                    className="rounded-xl border border-slate-200 p-4 text-left transition hover:border-emerald-500 hover:bg-emerald-50"
                    onClick={() => void abrirSemana(semana.id_semana)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <strong>Semana {numero}</strong>
                      <EstadoSemanaBadge estado={semana.estado} />
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                      {semana._count?.registros ?? 0} registros · Ver detalle
                    </p>
                  </button>
                ) : (
                  <div
                    key={numero}
                    className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-slate-500"
                  >
                    <strong>Semana {numero}</strong>
                    <p className="mt-2 text-xs font-bold uppercase">
                      No habilitada
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {procesando && !detalle && !acumulado && <CargandoDisciplina />}
        {detalle && (
          <section className={tarjetaDisciplina}>
            <h2 className="mb-1 text-xl font-black text-slate-950">
              Detalle de la Semana {detalle.numero_semana}
            </h2>
            {detalle.estado !== "PUBLICADO" && (
              <AvisoDisciplina tipo="info">
                El estado es visible, pero los hechos permanecen reservados
                hasta la publicación.
              </AvisoDisciplina>
            )}
            <DetalleSemanaDisciplina semana={detalle} />
          </section>
        )}

        {acumulado && (
          <section className={tarjetaDisciplina}>
            <h2 className="text-xl font-black text-slate-950">
              Acumulado publicado
            </h2>
            <p className="mb-4 text-sm text-slate-600">
              Gestión {acumulado.gestion} · Periodo {acumulado.periodo} ·{" "}
              {acumulado.curso.replaceAll("_", " ")}
            </p>
            <p className="mb-4 text-sm font-semibold text-emerald-700">
              Avance: {acumulado.semanas_publicadas} de{" "}
              {acumulado.semanas_configuradas} semanas publicadas
            </p>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-left text-sm">
                <thead>
                  <tr className="border-b text-xs uppercase text-slate-500">
                    <th className="p-2">Estudiante</th>
                    <th className="p-2 text-right">Méritos</th>
                    <th className="p-2 text-right">Deméritos</th>
                    <th className="p-2 text-right">Neto</th>
                    <th className="p-2 text-right">Descuento</th>
                    <th className="p-2 text-right">Nota</th>
                    <th className="p-2">Alerta</th>
                  </tr>
                </thead>
                <tbody>
                  {acumulado.cadetes.map((fila) => (
                    <tr
                      key={fila.id_cadete}
                      className={`border-b ${fila.alerta ? "bg-red-50" : ""}`}
                    >
                      <td className="p-2">
                        <strong>
                          {fila.apellidos} {fila.nombres}
                        </strong>
                        <br />
                        <span className="text-xs text-slate-500">
                          CI {fila.ci}
                        </span>
                      </td>
                      <Numero valor={fila.total_meritos} />
                      <Numero valor={fila.total_demeritos} />
                      <Numero valor={fila.demerito_neto} />
                      <Numero valor={fila.descuento} />
                      <Numero valor={fila.nota} />
                      <td className="p-2">
                        {fila.alerta ? (
                          <span className="font-bold text-red-700">
                            Mayor a 30
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
          </section>
        )}

        <ResultadoFinalDisciplina seleccion={seleccion} />
      </div>
    </PaginaProtegidaDisciplina>
  );
}

function Numero({ valor }: { valor: string }) {
  return (
    <td className="p-2 text-right font-mono tabular-nums">
      {Number(valor).toFixed(4)}
    </td>
  );
}
