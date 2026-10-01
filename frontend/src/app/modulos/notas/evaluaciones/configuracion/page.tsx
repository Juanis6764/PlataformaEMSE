"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import AccesoRestringido from "../../../../../componentes/seguridad/AccesoRestringido";
import {
  AvisoEvaluaciones,
  botonPrimarioEvaluaciones,
  CargandoEvaluaciones,
  campoEvaluaciones,
  EncabezadoEvaluaciones,
  nombreCursoEvaluaciones,
  PaginaProtegidaEvaluaciones,
  tarjetaEvaluaciones,
  VacioEvaluaciones,
} from "../../../../../componentes/notas/evaluaciones/InterfazEvaluaciones";
import { SelectoresEvaluaciones } from "../../../../../componentes/notas/evaluaciones/SelectoresEvaluaciones";
import {
  actualizarConfiguracionEvaluaciones,
  crearConfiguracionEvaluaciones,
  listarConfiguracionesEvaluaciones,
  mensajeErrorApi,
  obtenerContextoEvaluaciones,
} from "../../../../../servicios/notas/evaluaciones.service";
import {
  ConfiguracionEvaluaciones,
  ContextoEvaluaciones,
} from "../../../../../tipos/notas/evaluaciones";

export default function ConfiguracionEvaluacionesPage() {
  const [contexto, setContexto] = useState<ContextoEvaluaciones | null>(null);
  const [configuraciones, setConfiguraciones] = useState<ConfiguracionEvaluaciones[]>([]);
  const [idGestion, setIdGestion] = useState<number | null>(null);
  const [idPeriodo, setIdPeriodo] = useState<number | null>(null);
  const [idCurso, setIdCurso] = useState<number | null>(null);
  const [cantidad, setCantidad] = useState("");
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [exito, setExito] = useState("");

  const cargar = useCallback(async () => {
    setError("");
    try {
      const [contextoReal, configuracionesReales] = await Promise.all([
        obtenerContextoEvaluaciones(),
        listarConfiguracionesEvaluaciones({ solo_activas: false }),
      ]);
      setContexto(contextoReal);
      setConfiguraciones(configuracionesReales);
      const gestion =
        contextoReal.gestiones.find((item) => item.periodos.some((periodo) => periodo.activo)) ??
        contextoReal.gestiones[0];
      const periodo =
        gestion?.periodos.find((item) => item.activo) ?? gestion?.periodos[0];
      setIdGestion((actual) => actual ?? gestion?.id_gestion ?? null);
      setIdPeriodo((actual) => actual ?? periodo?.id_periodo ?? null);
      setIdCurso((actual) => actual ?? contextoReal.cursos[0]?.id_curso ?? null);
    } catch (e) {
      setError(mensajeErrorApi(e));
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => void cargar());
  }, [cargar]);

  const seleccionada = configuraciones.find(
    (item) => item.id_periodo === idPeriodo && item.id_curso === idCurso,
  );

  useEffect(() => {
    queueMicrotask(() => setCantidad(seleccionada?.cantidad_materias.toString() ?? ""));
  }, [seleccionada]);

  async function guardar(evento: FormEvent) {
    evento.preventDefault();
    if (!idPeriodo || !idCurso) {
      setError("Seleccione gestión, periodo y curso.");
      return;
    }
    const valor = Number(cantidad);
    if (!Number.isInteger(valor) || valor < 1 || valor > 100) {
      setError("La cantidad debe ser un entero entre 1 y 100.");
      return;
    }
    setGuardando(true);
    setError("");
    setExito("");
    try {
      if (seleccionada) {
        await actualizarConfiguracionEvaluaciones(seleccionada.id_configuracion, valor);
      } else {
        await crearConfiguracionEvaluaciones({
          id_periodo: idPeriodo,
          id_curso: idCurso,
          cantidad_materias: valor,
        });
      }
      setExito(
        seleccionada
          ? "Cantidad de materias actualizada correctamente."
          : "Configuración creada. No se creó ninguna materia automáticamente.",
      );
      await cargar();
    } catch (e) {
      setError(mensajeErrorApi(e));
    } finally {
      setGuardando(false);
    }
  }

  if (cargando) {
    return (
      <PaginaProtegidaEvaluaciones permisos={["REGISTRAR_NOTAS", "EDITAR_NOTAS"]}>
        <CargandoEvaluaciones />
      </PaginaProtegidaEvaluaciones>
    );
  }
  if (contexto?.perfil !== "ENCARGADO_EVALUACIONES") return <AccesoRestringido />;

  return (
    <PaginaProtegidaEvaluaciones permisos={["REGISTRAR_NOTAS", "EDITAR_NOTAS"]}>
      <div className="mx-auto max-w-7xl space-y-5">
        <EncabezadoEvaluaciones
          titulo="Configuración"
          descripcion="Defina el límite real de materias por gestión, periodo y curso. El Operador seguirá creando cada materia con su nombre real."
        />
        {error && <AvisoEvaluaciones tipo="error">{error}</AvisoEvaluaciones>}
        {exito && <AvisoEvaluaciones tipo="exito">{exito}</AvisoEvaluaciones>}

        {contexto && (
          <section className={tarjetaEvaluaciones}>
            <form className="space-y-4" onSubmit={guardar}>
              <SelectoresEvaluaciones
                contexto={contexto}
                idGestion={idGestion}
                idPeriodo={idPeriodo}
                idCurso={idCurso}
                cambiarGestion={setIdGestion}
                cambiarPeriodo={setIdPeriodo}
                cambiarCurso={setIdCurso}
                incluirInactivos={false}
              />
              <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                <label className="text-sm font-semibold text-slate-700">
                  Cantidad de materias
                  <input
                    required
                    type="number"
                    min={1}
                    max={100}
                    className={`${campoEvaluaciones} mt-1`}
                    value={cantidad}
                    onChange={(evento) => setCantidad(evento.target.value)}
                  />
                </label>
                <button
                  type="submit"
                  disabled={guardando || !idPeriodo || !idCurso}
                  className={botonPrimarioEvaluaciones}
                >
                  {guardando ? "Guardando…" : seleccionada ? "Actualizar" : "Configurar"}
                </button>
              </div>
              {seleccionada && (
                <AvisoEvaluaciones tipo="info">
                  {seleccionada.cantidad_materias} materias configuradas · {" "}
                  {seleccionada.materias_registradas} materias creadas
                </AvisoEvaluaciones>
              )}
            </form>
          </section>
        )}

        <section className={tarjetaEvaluaciones}>
          <h2 className="mb-3 text-lg font-bold text-slate-950">Configuraciones registradas</h2>
          {configuraciones.length === 0 ? (
            <VacioEvaluaciones
              titulo="Sin configuraciones"
              descripcion="Aún no se configuró la cantidad de materias para ningún curso."
            />
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {configuraciones.map((item) => (
                <article key={item.id_configuracion} className="rounded-xl border border-slate-200 p-4">
                  <p className="text-xs font-bold uppercase text-slate-500">
                    {item.periodo?.periodo}/{item.periodo?.gestion.ano}
                  </p>
                  <h3 className="mt-1 text-lg font-black text-slate-950">
                    {nombreCursoEvaluaciones(item.curso?.nombre)}
                  </h3>
                  <p className="mt-3 text-sm text-slate-700">
                    <strong>{item.cantidad_materias}</strong> materias configuradas
                  </p>
                  <p className="text-sm text-slate-600">
                    <strong>{item.materias_registradas}</strong> materias creadas
                  </p>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </PaginaProtegidaEvaluaciones>
  );
}
