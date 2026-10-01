"use client";

import { useCallback, useEffect, useState } from "react";
import AccesoRestringido from "../../seguridad/AccesoRestringido";
import {
  aprobarPlanillaEntrenamiento,
  consultarPlanillaEntrenamiento,
  listarPendientesEntrenamiento,
  listarPlanillasEntrenamiento,
  marcarPlanillaRevisadaEntrenamiento,
  mensajeErrorApi,
  modificarNotaExtraordinariaEntrenamiento,
  observarPlanillaEntrenamiento,
  obtenerContextoEntrenamiento,
} from "../../../servicios/notas/entrenamiento-fisico.service";
import {
  CadetePlanillaEntrenamiento,
  ContextoEntrenamiento,
  DetallePlanillaEntrenamiento,
  ResumenPlanillaEntrenamiento,
} from "../../../tipos/notas/entrenamiento-fisico";
import {
  AvisoEntrenamiento,
  botonPrimarioEntrenamiento,
  botonSecundarioEntrenamiento,
  CargandoEntrenamiento,
  campoEntrenamiento,
  EncabezadoEntrenamiento,
  EstadoPlanillaEntrenamientoBadge,
  ModalEntrenamiento,
  NivelEntrenamientoBadge,
  nombreCursoEntrenamiento,
  normalizarNotaEntrenamiento,
  PaginaProtegidaEntrenamiento,
  tarjetaEntrenamiento,
  VacioEntrenamiento,
} from "./InterfazEntrenamientoFisico";
import PlanillaEntrenamientoFisico from "./PlanillaEntrenamientoFisico";

const PATRON_NOTA = /^(?:100(?:\.0{1,4})?|\d{1,2}(?:\.\d{1,4})?)$/;

export default function RevisionEntrenamientoFisico() {
  const [contexto, setContexto] = useState<ContextoEntrenamiento | null>(null);
  const [pendientes, setPendientes] = useState<ResumenPlanillaEntrenamiento[]>([]);
  const [revisadas, setRevisadas] = useState<ResumenPlanillaEntrenamiento[]>([]);
  const [detalle, setDetalle] = useState<DetallePlanillaEntrenamiento | null>(null);
  const [modalObservar, setModalObservar] = useState(false);
  const [comentario, setComentario] = useState("");
  const [notaExtraordinaria, setNotaExtraordinaria] =
    useState<CadetePlanillaEntrenamiento | null>(null);
  const [nuevaNota, setNuevaNota] = useState("");
  const [justificacion, setJustificacion] = useState("");
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState("");
  const [exito, setExito] = useState("");

  const abrir = useCallback(async (planilla: ResumenPlanillaEntrenamiento) => {
    setProcesando(true);
    setError("");
    try {
      setDetalle(
        await consultarPlanillaEntrenamiento({
          id_gestion: planilla.id_gestion,
          id_periodo: planilla.id_periodo,
          id_curso: planilla.id_curso,
        }),
      );
    } catch (e) {
      setError(mensajeErrorApi(e));
    } finally {
      setProcesando(false);
    }
  }, []);

  const cargarBandeja = useCallback(async () => {
    setError("");
    try {
      const real = await obtenerContextoEntrenamiento();
      setContexto(real);
      const [pendientesReales, revisadasReales] = await Promise.all([
        listarPendientesEntrenamiento(),
        real.perfil === "JEFE_ESTUDIOS"
          ? listarPlanillasEntrenamiento({ estado: "REVISADO" })
          : Promise.resolve([]),
      ]);
      setPendientes(pendientesReales);
      setRevisadas(revisadasReales);
      const idConsulta = Number(
        new URLSearchParams(window.location.search).get("planilla"),
      );
      const seleccionada = [...pendientesReales, ...revisadasReales].find(
        (item) => item.id_planilla === idConsulta,
      );
      if (seleccionada) await abrir(seleccionada);
    } catch (e) {
      setError(mensajeErrorApi(e));
    } finally {
      setCargando(false);
    }
  }, [abrir]);

  useEffect(() => {
    queueMicrotask(() => void cargarBandeja());
  }, [cargarBandeja]);

  async function ejecutar(
    accion: () => Promise<DetallePlanillaEntrenamiento>,
    mensaje: string,
  ) {
    setProcesando(true);
    setError("");
    setExito("");
    try {
      setDetalle(await accion());
      setExito(mensaje);
      await cargarBandeja();
      window.dispatchEvent(new Event("notificaciones:actualizar"));
    } catch (e) {
      setError(mensajeErrorApi(e));
    } finally {
      setProcesando(false);
    }
  }

  async function observar() {
    if (!detalle?.planilla || !comentario.trim()) {
      setError("El comentario de observación es obligatorio.");
      return;
    }
    await ejecutar(
      () =>
        observarPlanillaEntrenamiento(
          detalle.planilla!.id_planilla,
          comentario.trim(),
        ),
      "Planilla observada y devuelta al Encargado de Entrenamiento Físico.",
    );
    setModalObservar(false);
    setComentario("");
  }

  function abrirExtraordinaria(cadete: CadetePlanillaEntrenamiento) {
    setNotaExtraordinaria(cadete);
    setNuevaNota(cadete.nota_final ?? "");
    setJustificacion("");
  }

  async function guardarExtraordinaria() {
    if (!notaExtraordinaria?.id_nota || !detalle) return;
    const nota = normalizarNotaEntrenamiento(nuevaNota);
    if (!PATRON_NOTA.test(nota)) {
      setError("La nueva nota debe estar entre 0.0000 y 100.0000.");
      return;
    }
    if (!justificacion.trim()) {
      setError("La justificación es obligatoria.");
      return;
    }
    setProcesando(true);
    setError("");
    setExito("");
    try {
      await modificarNotaExtraordinariaEntrenamiento(
        notaExtraordinaria.id_nota,
        nota,
        justificacion.trim(),
      );
      setDetalle(
        await consultarPlanillaEntrenamiento({
          id_gestion: detalle.gestion.id_gestion,
          id_periodo: detalle.periodo.id_periodo,
          id_curso: detalle.curso.id_curso,
        }),
      );
      setExito("Modificación extraordinaria aplicada y auditada.");
      setNotaExtraordinaria(null);
    } catch (e) {
      setError(mensajeErrorApi(e));
    } finally {
      setProcesando(false);
    }
  }

  if (cargando) {
    return (
      <PaginaProtegidaEntrenamiento
        permisos={["REVISAR_NOTAS", "MARCAR_NOTAS_REVISADAS"]}
      >
        <CargandoEntrenamiento />
      </PaginaProtegidaEntrenamiento>
    );
  }
  if (
    !contexto ||
    !["SECCION_ACADEMICA", "JEFE_ESTUDIOS"].includes(contexto.perfil)
  ) {
    return <AccesoRestringido />;
  }

  return (
    <PaginaProtegidaEntrenamiento
      permisos={["REVISAR_NOTAS", "MARCAR_NOTAS_REVISADAS"]}
    >
      <div className="mx-auto max-w-[100rem] space-y-5 print:max-w-none">
        <EncabezadoEntrenamiento
          titulo={
            contexto.perfil === "JEFE_ESTUDIOS"
              ? "Revisión final"
              : "Revisión de Sección Académica"
          }
          descripcion="La bandeja muestra únicamente las planillas pendientes de su nivel institucional."
        />
        {error && <AvisoEntrenamiento tipo="error">{error}</AvisoEntrenamiento>}
        {exito && <AvisoEntrenamiento tipo="exito">{exito}</AvisoEntrenamiento>}

        <section className={`${tarjetaEntrenamiento} print:hidden`}>
          <h2 className="mb-3 text-lg font-bold">Pendientes de su nivel</h2>
          {pendientes.length === 0 ? (
            <VacioEntrenamiento
              titulo="Sin planillas pendientes"
              descripcion="No existen planillas enviadas a su nivel de revisión."
            />
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {pendientes.map((planilla) => (
                <TarjetaPlanilla
                  key={planilla.id_planilla}
                  planilla={planilla}
                  abrir={() => void abrir(planilla)}
                />
              ))}
            </div>
          )}
        </section>

        {contexto.perfil === "JEFE_ESTUDIOS" && (
          <section className={`${tarjetaEntrenamiento} print:hidden`}>
            <h2 className="mb-3 text-lg font-bold">Planillas revisadas</h2>
            {revisadas.length === 0 ? (
              <VacioEntrenamiento
                titulo="Sin planillas revisadas"
                descripcion="Aquí aparecerán las planillas finalizadas disponibles para consulta o modificación extraordinaria."
              />
            ) : (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {revisadas.map((planilla) => (
                  <TarjetaPlanilla
                    key={planilla.id_planilla}
                    planilla={planilla}
                    abrir={() => void abrir(planilla)}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {procesando && !detalle && <CargandoEntrenamiento />}
        {detalle && detalle.planilla && (
          <section className={tarjetaEntrenamiento}>
            <div className="mb-4 flex flex-wrap justify-end gap-2 print:hidden">
              {detalle.acciones.observar && (
                <button
                  type="button"
                  disabled={procesando}
                  className={botonSecundarioEntrenamiento}
                  onClick={() => setModalObservar(true)}
                >
                  Observar
                </button>
              )}
              {detalle.acciones.aprobar && (
                <button
                  type="button"
                  disabled={procesando}
                  className={botonPrimarioEntrenamiento}
                  onClick={() =>
                    void ejecutar(
                      () =>
                        aprobarPlanillaEntrenamiento(
                          detalle.planilla!.id_planilla,
                        ),
                      "Planilla aprobada y enviada a Jefe de Estudios.",
                    )
                  }
                >
                  Aprobar y continuar
                </button>
              )}
              {detalle.acciones.marcar_revisada && (
                <button
                  type="button"
                  disabled={procesando}
                  className={botonPrimarioEntrenamiento}
                  onClick={() =>
                    void ejecutar(
                      () =>
                        marcarPlanillaRevisadaEntrenamiento(
                          detalle.planilla!.id_planilla,
                        ),
                      "Planilla marcada REVISADO.",
                    )
                  }
                >
                  Marcar como REVISADO
                </button>
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
              modificarExtraordinariamente={
                detalle.acciones.modificar_extraordinaria
                  ? abrirExtraordinaria
                  : undefined
              }
            />
          </section>
        )}
      </div>

      <ModalEntrenamiento
        abierto={modalObservar}
        titulo="Observar planilla"
        descripcion="El comentario es obligatorio y la planilla volverá al Encargado de Entrenamiento Físico."
        cerrar={() => setModalObservar(false)}
      >
        <div className="space-y-4">
          <label className="block text-sm font-semibold text-slate-700">
            Comentario de observación
            <textarea
              required
              maxLength={1000}
              className={`${campoEntrenamiento} mt-1 min-h-28`}
              value={comentario}
              onChange={(evento) => setComentario(evento.target.value)}
            />
          </label>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className={botonSecundarioEntrenamiento}
              onClick={() => setModalObservar(false)}
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={procesando || !comentario.trim()}
              className={botonPrimarioEntrenamiento}
              onClick={() => void observar()}
            >
              Confirmar observación
            </button>
          </div>
        </div>
      </ModalEntrenamiento>

      <ModalEntrenamiento
        abierto={Boolean(notaExtraordinaria)}
        titulo="Modificación extraordinaria"
        descripcion="La nota anterior, la nueva y la justificación quedarán auditadas."
        cerrar={() => setNotaExtraordinaria(null)}
      >
        {notaExtraordinaria && (
          <div className="space-y-4">
            <div className="rounded-xl bg-slate-50 p-4 text-sm">
              <p className="font-bold">
                {notaExtraordinaria.apellidos} {notaExtraordinaria.nombres}
              </p>
              <p className="mt-1 text-slate-600">
                Nota actual: {notaExtraordinaria.nota_final ?? "—"}
              </p>
            </div>
            <label className="block text-sm font-semibold text-slate-700">
              Nueva nota final
              <input
                className={`${campoEntrenamiento} mt-1`}
                inputMode="decimal"
                value={nuevaNota}
                onChange={(evento) => setNuevaNota(evento.target.value)}
              />
            </label>
            <label className="block text-sm font-semibold text-slate-700">
              Justificación
              <textarea
                required
                maxLength={1000}
                className={`${campoEntrenamiento} mt-1 min-h-28`}
                value={justificacion}
                onChange={(evento) => setJustificacion(evento.target.value)}
              />
            </label>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className={botonSecundarioEntrenamiento}
                onClick={() => setNotaExtraordinaria(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={procesando || !justificacion.trim()}
                className={botonPrimarioEntrenamiento}
                onClick={() => void guardarExtraordinaria()}
              >
                Aplicar modificación
              </button>
            </div>
          </div>
        )}
      </ModalEntrenamiento>
    </PaginaProtegidaEntrenamiento>
  );
}

function TarjetaPlanilla({
  planilla,
  abrir,
}: {
  planilla: ResumenPlanillaEntrenamiento;
  abrir: () => void;
}) {
  return (
    <button
      type="button"
      onClick={abrir}
      className="rounded-xl border border-slate-200 p-4 text-left transition hover:border-[#74a892] hover:bg-emerald-50/40"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-bold uppercase text-slate-500">
            {planilla.periodo}/{planilla.gestion}
          </p>
          <h3 className="mt-1 text-lg font-black">
            {nombreCursoEntrenamiento(planilla.curso)}
          </h3>
        </div>
        <EstadoPlanillaEntrenamientoBadge estado={planilla.estado} />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <NivelEntrenamientoBadge nivel={planilla.nivel_revision_actual} />
        <span className="text-xs text-slate-500">
          {planilla.notas_registradas}/{planilla.total_cadetes} notas
        </span>
      </div>
    </button>
  );
}
