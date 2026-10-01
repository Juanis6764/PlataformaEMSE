"use client";

import { useCallback, useEffect, useState } from "react";
import AccesoRestringido from "../../seguridad/AccesoRestringido";
import {
  consultarPlanillaEntrenamiento,
  enviarPlanillaEntrenamiento,
  enviarResultadosEntrenamientoEvaluaciones,
  guardarNotasEntrenamiento,
  listarPlanillasEntrenamiento,
  mensajeErrorApi,
  obtenerContextoEntrenamiento,
} from "../../../servicios/notas/entrenamiento-fisico.service";
import {
  ContextoEntrenamiento,
  DetallePlanillaEntrenamiento,
  ResumenPlanillaEntrenamiento,
} from "../../../tipos/notas/entrenamiento-fisico";
import {
  AvisoEntrenamiento,
  botonPrimarioEntrenamiento,
  botonSecundarioEntrenamiento,
  CargandoEntrenamiento,
  EncabezadoEntrenamiento,
  EstadoPlanillaEntrenamientoBadge,
  nombreCursoEntrenamiento,
  normalizarNotaEntrenamiento,
  PaginaProtegidaEntrenamiento,
  tarjetaEntrenamiento,
  VacioEntrenamiento,
} from "./InterfazEntrenamientoFisico";
import PlanillaEntrenamientoFisico from "./PlanillaEntrenamientoFisico";
import { SelectoresEntrenamientoFisico } from "./SelectoresEntrenamientoFisico";

const PATRON_NOTA = /^(?:100(?:\.0{1,4})?|\d{1,2}(?:\.\d{1,4})?)$/;

export default function VistaEntrenamientoFisico({
  modo,
}: {
  modo: "REGISTRO" | "CONSULTA" | "RESULTADOS";
}) {
  const [contexto, setContexto] = useState<ContextoEntrenamiento | null>(null);
  const [idGestion, setIdGestion] = useState<number | null>(null);
  const [idPeriodo, setIdPeriodo] = useState<number | null>(null);
  const [idCurso, setIdCurso] = useState<number | null>(null);
  const [detalle, setDetalle] = useState<DetallePlanillaEntrenamiento | null>(null);
  const [resumenCursos, setResumenCursos] = useState<ResumenPlanillaEntrenamiento[]>([]);
  const [valores, setValores] = useState<Record<number, string>>({});
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState("");
  const [exito, setExito] = useState("");

  const cargarContexto = useCallback(async () => {
    setError("");
    try {
      const real = await obtenerContextoEntrenamiento();
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
    } catch (e) {
      setError(mensajeErrorApi(e));
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => void cargarContexto());
  }, [cargarContexto]);

  function sincronizarDetalle(nuevo: DetallePlanillaEntrenamiento) {
    setDetalle(nuevo);
    setValores(
      Object.fromEntries(
        nuevo.cadetes.map((cadete) => [
          cadete.id_cadete,
          cadete.nota_final ?? "",
        ]),
      ),
    );
  }

  async function consultar() {
    if (!idGestion || !idPeriodo || !idCurso) {
      setError("Seleccione gestión, periodo y curso.");
      return;
    }
    setProcesando(true);
    setError("");
    setExito("");
    try {
      if (modo === "RESULTADOS") {
        setResumenCursos(
          await listarPlanillasEntrenamiento({
            id_gestion: idGestion,
            id_periodo: idPeriodo,
          }),
        );
      }
      sincronizarDetalle(
        await consultarPlanillaEntrenamiento({
          id_gestion: idGestion,
          id_periodo: idPeriodo,
          id_curso: idCurso,
        }),
      );
    } catch (e) {
      setDetalle(null);
      setError(mensajeErrorApi(e));
    } finally {
      setProcesando(false);
    }
  }

  async function guardar() {
    if (!detalle || !idGestion || !idPeriodo || !idCurso) return;
    const notas = detalle.cadetes
      .map((cadete) => ({
        id_cadete: cadete.id_cadete,
        nota_final: normalizarNotaEntrenamiento(valores[cadete.id_cadete] ?? ""),
      }))
      .filter((nota) => nota.nota_final !== "");
    const invalida = notas.find((nota) => !PATRON_NOTA.test(nota.nota_final));
    if (invalida) {
      setError("Todas las notas deben estar entre 0.0000 y 100.0000, con máximo cuatro decimales.");
      return;
    }
    if (notas.length === 0) {
      setError("Registre al menos una nota antes de guardar.");
      return;
    }
    setProcesando(true);
    setError("");
    setExito("");
    try {
      sincronizarDetalle(
        await guardarNotasEntrenamiento(
          {
            id_gestion: idGestion,
            id_periodo: idPeriodo,
            id_curso: idCurso,
          },
          notas,
        ),
      );
      setExito("Notas guardadas correctamente");
    } catch (e) {
      setError(mensajeErrorApi(e));
    } finally {
      setProcesando(false);
    }
  }

  async function enviarRevision() {
    if (!detalle?.planilla) return;
    if (detalle.resumen.pendientes > 0) {
      setError("No se puede enviar porque existen notas pendientes.");
      return;
    }
    const confirmar = window.confirm(
      "¿Está seguro de enviar las notas de Entrenamiento Físico?\n\n" +
        "Verifique que todas las calificaciones estén correctamente registradas.\n\n" +
        "Después del envío ya no podrá modificarlas normalmente.\n\n" +
        `Gestión: ${detalle.gestion.ano}\nPeriodo: ${detalle.periodo.periodo}\nCurso: ${nombreCursoEntrenamiento(detalle.curso.nombre)}\nTotal de cadetes: ${detalle.resumen.total_cadetes}\nNotas registradas: ${detalle.resumen.notas_registradas}\nPendientes: ${detalle.resumen.pendientes}`,
    );
    if (!confirmar) return;
    setProcesando(true);
    setError("");
    setExito("");
    try {
      sincronizarDetalle(
        await enviarPlanillaEntrenamiento(detalle.planilla.id_planilla),
      );
      setExito("Planilla enviada a Sección Académica.");
      window.dispatchEvent(new Event("notificaciones:actualizar"));
    } catch (e) {
      setError(mensajeErrorApi(e));
    } finally {
      setProcesando(false);
    }
  }

  async function enviarEvaluaciones() {
    if (!detalle?.planilla) return;
    if (
      !window.confirm(
        "¿Enviar las notas finales revisadas al Encargado de Evaluaciones?",
      )
    ) {
      return;
    }
    setProcesando(true);
    setError("");
    setExito("");
    try {
      const respuesta = await enviarResultadosEntrenamientoEvaluaciones(
        detalle.planilla.id_planilla,
      );
      sincronizarDetalle(
        await consultarPlanillaEntrenamiento({
          id_gestion: detalle.gestion.id_gestion,
          id_periodo: detalle.periodo.id_periodo,
          id_curso: detalle.curso.id_curso,
        }),
      );
      setExito(
        respuesta.ya_enviado
          ? "Este resultado ya había sido enviado a Evaluaciones."
          : "Notas finales enviadas a Evaluaciones correctamente.",
      );
      window.dispatchEvent(new Event("notificaciones:actualizar"));
    } catch (e) {
      setError(mensajeErrorApi(e));
    } finally {
      setProcesando(false);
    }
  }

  if (cargando) {
    return (
      <PaginaProtegidaEntrenamiento>
        <CargandoEntrenamiento />
      </PaginaProtegidaEntrenamiento>
    );
  }
  const perfilPermitido =
    contexto &&
    (modo === "REGISTRO" || modo === "RESULTADOS"
      ? contexto.perfil === "ENCARGADO_ENTRENAMIENTO_FISICO"
      : [
          "ADMINISTRADOR",
          "ENCARGADO_ENTRENAMIENTO_FISICO",
          "SECCION_ACADEMICA",
          "JEFE_ESTUDIOS",
          "COMANDO",
        ].includes(contexto.perfil));
  if (!contexto || !perfilPermitido) return <AccesoRestringido />;

  const titulo =
    modo === "REGISTRO"
      ? "Registro de notas"
      : modo === "RESULTADOS"
        ? "Resultados finales"
        : "Consulta";
  const puedeIntentarEnviar =
    modo === "REGISTRO" &&
    detalle?.perfil === "ENCARGADO_ENTRENAMIENTO_FISICO" &&
    Boolean(
      detalle.planilla &&
        ["BORRADOR", "OBSERVADO"].includes(detalle.planilla.estado),
    );

  return (
    <PaginaProtegidaEntrenamiento>
      <div className="mx-auto max-w-[100rem] space-y-5 print:max-w-none">
        <EncabezadoEntrenamiento
          titulo={titulo}
          descripcion={
            modo === "REGISTRO"
              ? "Registre una única nota final por cadete. Puede guardar avances y continuar después."
              : modo === "RESULTADOS"
                ? "Consulte el estado de los tres cursos y envíe cada resultado revisado a Evaluaciones cuando esté listo."
                : "Consulta reutilizable por gestión, periodo y curso. Las acciones dependen del perfil autorizado."
          }
        />
        {error && <AvisoEntrenamiento tipo="error">{error}</AvisoEntrenamiento>}
        {exito && <AvisoEntrenamiento tipo="exito">{exito}</AvisoEntrenamiento>}

        <section className={`${tarjetaEntrenamiento} print:hidden`}>
          <div className="space-y-4">
            <SelectoresEntrenamientoFisico
              contexto={contexto}
              idGestion={idGestion}
              idPeriodo={idPeriodo}
              idCurso={idCurso}
              cambiarGestion={(id) => {
                setIdGestion(id);
                setIdPeriodo(null);
                setDetalle(null);
              }}
              cambiarPeriodo={(id) => {
                setIdPeriodo(id);
                setDetalle(null);
              }}
              cambiarCurso={(id) => {
                setIdCurso(id);
                setDetalle(null);
              }}
            />
            <button
              type="button"
              disabled={procesando || !idGestion || !idPeriodo || !idCurso}
              className={botonPrimarioEntrenamiento}
              onClick={() => void consultar()}
            >
              {procesando ? "Consultando…" : "Consultar"}
            </button>
          </div>
        </section>

        {modo === "RESULTADOS" && resumenCursos.length > 0 && (
          <section className={`${tarjetaEntrenamiento} print:hidden`}>
            <h2 className="mb-3 text-lg font-bold">Estado por curso</h2>
            <div className="grid gap-3 md:grid-cols-3">
              {resumenCursos.map((planilla) => (
                <button
                  key={planilla.id_planilla}
                  type="button"
                  onClick={() => {
                    setIdCurso(planilla.id_curso);
                    void consultarPlanillaEntrenamiento({
                      id_gestion: planilla.id_gestion,
                      id_periodo: planilla.id_periodo,
                      id_curso: planilla.id_curso,
                    }).then(sincronizarDetalle);
                  }}
                  className="rounded-xl border border-slate-200 p-4 text-left transition hover:border-[#2d6a4f] hover:bg-emerald-50/40"
                >
                  <p className="font-black">
                    {nombreCursoEntrenamiento(planilla.curso)}
                  </p>
                  <div className="mt-2">
                    <EstadoPlanillaEntrenamientoBadge estado={planilla.estado} />
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    {planilla.notas_registradas}/{planilla.total_cadetes} notas
                  </p>
                </button>
              ))}
            </div>
          </section>
        )}

        <section className={tarjetaEntrenamiento}>
          {procesando && !detalle ? (
            <CargandoEntrenamiento />
          ) : !detalle ? (
            <VacioEntrenamiento
              titulo="Seleccione los filtros"
              descripcion="Elija gestión, periodo y curso para abrir la planilla completa."
            />
          ) : detalle.cadetes.length === 0 ? (
            <VacioEntrenamiento
              titulo="Sin planilla revisada"
              descripcion="No existe información disponible para la selección."
            />
          ) : (
            <>
              <div className="mb-4 flex flex-wrap justify-end gap-2 print:hidden">
                {modo === "REGISTRO" && detalle.acciones.guardar && (
                  <button
                    type="button"
                    disabled={procesando}
                    className={botonSecundarioEntrenamiento}
                    onClick={() => void guardar()}
                  >
                    Guardar avance
                  </button>
                )}
                {puedeIntentarEnviar && (
                  <button
                    type="button"
                    disabled={procesando}
                    className={botonPrimarioEntrenamiento}
                    onClick={() => void enviarRevision()}
                  >
                    ENVIAR NOTAS
                  </button>
                )}
                {detalle.acciones.enviar_evaluaciones && (
                  <button
                    type="button"
                    disabled={procesando}
                    className={botonPrimarioEntrenamiento}
                    onClick={() => void enviarEvaluaciones()}
                  >
                    ENVIAR NOTAS FINALES A EVALUACIONES
                  </button>
                )}
                {detalle.planilla?.enviada_evaluaciones && (
                  <span className="inline-flex items-center rounded-lg bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-800">
                    Enviado a Evaluaciones
                  </span>
                )}
                {detalle.acciones.imprimir && (
                  <button
                    type="button"
                    className={botonSecundarioEntrenamiento}
                    onClick={() => window.print()}
                  >
                    Imprimir
                  </button>
                )}
              </div>
              <PlanillaEntrenamientoFisico
                detalle={detalle}
                valores={valores}
                cambiarNota={
                  modo === "REGISTRO" && detalle.acciones.guardar
                    ? (id, valor) =>
                        setValores((actuales) => ({
                          ...actuales,
                          [id]: valor,
                        }))
                    : undefined
                }
              />
            </>
          )}
        </section>
      </div>
    </PaginaProtegidaEntrenamiento>
  );
}
