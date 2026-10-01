"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import AccesoRestringido from "../../../../../componentes/seguridad/AccesoRestringido";
import {
  AvisoEvaluaciones,
  botonPrimarioEvaluaciones,
  botonSecundarioEvaluaciones,
  CargandoEvaluaciones,
  campoEvaluaciones,
  ClasificacionBadge,
  clasificarNotaVisual,
  EncabezadoEvaluaciones,
  EstadoMateriaBadge,
  ModalEvaluaciones,
  nombreCursoEvaluaciones,
  normalizarNota,
  notaConsideradaVisual,
  PaginaProtegidaEvaluaciones,
  tarjetaEvaluaciones,
  VacioEvaluaciones,
} from "../../../../../componentes/notas/evaluaciones/InterfazEvaluaciones";
import {
  crearMateriaEvaluacion,
  enviarMateriaEvaluacion,
  guardarNotasEvaluacion,
  listarConfiguracionesEvaluaciones,
  listarMateriasEvaluaciones,
  mensajeErrorApi,
  obtenerContextoEvaluaciones,
  obtenerMateriaEvaluacion,
} from "../../../../../servicios/notas/evaluaciones.service";
import {
  ConfiguracionEvaluaciones,
  ContextoEvaluaciones,
  DetalleMateriaEvaluacion,
  MateriaEvaluacion,
} from "../../../../../tipos/notas/evaluaciones";

const PATRON_NOTA = /^(?:100(?:\.0{1,4})?|\d{1,2}(?:\.\d{1,4})?)$/;

export default function RegistroEvaluacionesPage() {
  const [contexto, setContexto] = useState<ContextoEvaluaciones | null>(null);
  const [configuraciones, setConfiguraciones] = useState<ConfiguracionEvaluaciones[]>([]);
  const [materias, setMaterias] = useState<MateriaEvaluacion[]>([]);
  const [detalle, setDetalle] = useState<DetalleMateriaEvaluacion | null>(null);
  const [idGestion, setIdGestion] = useState<number | null>(null);
  const [idPeriodo, setIdPeriodo] = useState<number | null>(null);
  const [idCurso, setIdCurso] = useState<number | null>(null);
  const [nombreMateria, setNombreMateria] = useState("");
  const [ediciones, setEdiciones] = useState<Record<number, string>>({});
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [modalEnvio, setModalEnvio] = useState(false);
  const [error, setError] = useState("");
  const [exito, setExito] = useState("");

  const abrirMateria = useCallback(async (id: number) => {
    setProcesando(true);
    setError("");
    try {
      const materia = await obtenerMateriaEvaluacion(id);
      setDetalle(materia);
      setEdiciones(
        Object.fromEntries(
          materia.cadetes.map((fila) => [fila.id_cadete, fila.nota_inicial ?? ""]),
        ),
      );
    } catch (e) {
      setError(mensajeErrorApi(e));
    } finally {
      setProcesando(false);
    }
  }, []);

  const cargar = useCallback(async () => {
    setError("");
    try {
      const contextoReal = await obtenerContextoEvaluaciones();
      const [configuracionesReales, materiasReales] = await Promise.all([
        listarConfiguracionesEvaluaciones(),
        listarMateriasEvaluaciones(),
      ]);
      setContexto(contextoReal);
      setConfiguraciones(configuracionesReales);
      setMaterias(materiasReales);
      const gestion =
        contextoReal.gestiones.find((item) => item.periodos.some((periodo) => periodo.activo)) ??
        contextoReal.gestiones[0];
      const periodo =
        gestion?.periodos.find((item) => item.activo) ?? gestion?.periodos[0];
      const curso = contextoReal.cursos[0];
      setIdGestion((actual) => actual ?? gestion?.id_gestion ?? null);
      setIdPeriodo((actual) => actual ?? periodo?.id_periodo ?? null);
      setIdCurso((actual) => actual ?? curso?.id_curso ?? null);
      const idUrl = Number(new URLSearchParams(window.location.search).get("materia"));
      if (Number.isInteger(idUrl) && idUrl > 0) await abrirMateria(idUrl);
    } catch (e) {
      setError(mensajeErrorApi(e));
    } finally {
      setCargando(false);
    }
  }, [abrirMateria]);

  useEffect(() => {
    queueMicrotask(() => void cargar());
  }, [cargar]);

  const seleccionadas = useMemo(
    () => materias.filter((item) => item.id_periodo === idPeriodo && item.id_curso === idCurso),
    [materias, idPeriodo, idCurso],
  );
  const configuracion = configuraciones.find(
    (item) => item.id_periodo === idPeriodo && item.id_curso === idCurso,
  );
  const siguienteNumero =
    seleccionadas.reduce((maximo, item) => Math.max(maximo, item.numero_materia), 0) + 1;
  const puedeCrear = Boolean(
    configuracion && siguienteNumero <= configuracion.cantidad_materias,
  );
  const editable = detalle?.estado === "BORRADOR" || detalle?.estado === "OBSERVADO";

  async function crearMateria(evento: FormEvent) {
    evento.preventDefault();
    if (!idPeriodo || !idCurso || !nombreMateria.trim()) {
      setError("Seleccione el periodo y escriba el nombre real de la materia.");
      return;
    }
    setProcesando(true);
    setError("");
    setExito("");
    try {
      const creada = await crearMateriaEvaluacion({
        id_periodo: idPeriodo,
        id_curso: idCurso,
        nombre: nombreMateria.trim(),
      });
      setNombreMateria("");
      setExito(`Materia ${creada.numero_materia} creada correctamente.`);
      const actualizadas = await listarMateriasEvaluaciones();
      setMaterias(actualizadas);
      await abrirMateria(creada.id_materia);
    } catch (e) {
      setError(mensajeErrorApi(e));
    } finally {
      setProcesando(false);
    }
  }

  function cambiarNota(idCadete: number, valor: string) {
    setEdiciones((actuales) => ({ ...actuales, [idCadete]: valor }));
  }

  async function guardarNotas() {
    if (!detalle || !editable) return;
    const notas: { id_cadete: number; nota_inicial: string; nota_desquite: null }[] = [];
    for (const fila of detalle.cadetes) {
      const valor = normalizarNota(ediciones[fila.id_cadete] ?? "");
      if (!valor) continue;
      if (!PATRON_NOTA.test(valor)) {
        setError(
          `Nota inválida para ${fila.apellidos} ${fila.nombres}: debe estar entre 0 y 100, con hasta cuatro decimales.`,
        );
        return;
      }
      notas.push({ id_cadete: fila.id_cadete, nota_inicial: valor, nota_desquite: null });
    }
    if (notas.length === 0) {
      setError("Ingrese al menos una nota antes de guardar.");
      return;
    }
    setProcesando(true);
    setError("");
    setExito("");
    try {
      await guardarNotasEvaluacion(detalle.id_materia, notas);
      setExito("Notas guardadas correctamente");
      await abrirMateria(detalle.id_materia);
    } catch (e) {
      setError(mensajeErrorApi(e));
    } finally {
      setProcesando(false);
    }
  }

  function solicitarEnvio() {
    if (!detalle) return;
    if (!detalle.resumen.completo) {
      setError("No se puede enviar la materia porque faltan notas por registrar.");
      return;
    }
    setError("");
    setModalEnvio(true);
  }

  async function enviar() {
    if (!detalle?.resumen.completo) return;
    setProcesando(true);
    setError("");
    setExito("");
    try {
      await enviarMateriaEvaluacion(detalle.id_materia);
      setExito("Materia enviada al Encargado de Evaluaciones.");
      setModalEnvio(false);
      setMaterias(await listarMateriasEvaluaciones());
      await abrirMateria(detalle.id_materia);
      window.dispatchEvent(new Event("notificaciones:actualizar"));
    } catch (e) {
      setError(mensajeErrorApi(e));
    } finally {
      setProcesando(false);
    }
  }

  if (cargando) {
    return (
      <PaginaProtegidaEvaluaciones permisos={["ENVIAR_NOTAS"]}>
        <CargandoEvaluaciones />
      </PaginaProtegidaEvaluaciones>
    );
  }
  if (contexto?.perfil !== "OPERADOR_EVALUACIONES") return <AccesoRestringido />;

  return (
    <PaginaProtegidaEvaluaciones permisos={["ENVIAR_NOTAS"]}>
      <div className="mx-auto max-w-[96rem] space-y-5">
        <EncabezadoEvaluaciones
          titulo="Registro de materias"
          descripcion="Cree la siguiente materia de su curso, guarde avances y envíe la planilla completa al flujo institucional."
        />
        {error && <AvisoEvaluaciones tipo="error">{error}</AvisoEvaluaciones>}
        {exito && <AvisoEvaluaciones tipo="exito">{exito}</AvisoEvaluaciones>}

        <section className={tarjetaEvaluaciones}>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="text-sm font-semibold text-slate-700">
              Gestión
              <select
                className={`${campoEvaluaciones} mt-1`}
                value={idGestion ?? ""}
                onChange={(evento) => {
                  setIdGestion(Number(evento.target.value) || null);
                  setIdPeriodo(null);
                  setDetalle(null);
                }}
              >
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
                onChange={(evento) => {
                  setIdPeriodo(Number(evento.target.value) || null);
                  setDetalle(null);
                }}
              >
                <option value="">Seleccione</option>
                {contexto.gestiones
                  .find((gestion) => gestion.id_gestion === idGestion)
                  ?.periodos.filter((periodo) => periodo.activo)
                  .map((periodo) => (
                    <option key={periodo.id_periodo} value={periodo.id_periodo}>{periodo.periodo}</option>
                  ))}
              </select>
            </label>
            <label className="text-sm font-semibold text-slate-700">
              Curso asignado
              <select className={`${campoEvaluaciones} mt-1`} value={idCurso ?? ""} disabled>
                {contexto.cursos.map((curso) => (
                  <option key={curso.id_curso} value={curso.id_curso}>
                    {nombreCursoEvaluaciones(curso.nombre)}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>

        <section className={tarjetaEvaluaciones}>
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-950">Materias del periodo</h2>
              <p className="text-sm text-slate-600">
                {configuracion
                  ? `${configuracion.materias_registradas} de ${configuracion.cantidad_materias} creadas`
                  : "El Encargado aún no configuró este curso y periodo."}
              </p>
            </div>
          </div>

          {seleccionadas.length > 0 && (
            <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
              {seleccionadas.map((materia) => (
                <button
                  key={materia.id_materia}
                  type="button"
                  onClick={() => void abrirMateria(materia.id_materia)}
                  className={`min-w-44 rounded-xl border p-3 text-left transition ${detalle?.id_materia === materia.id_materia ? "border-[#2d6a4f] bg-emerald-50" : "border-slate-200 hover:bg-slate-50"}`}
                >
                  <span className="text-xs font-bold text-slate-500">Materia {materia.numero_materia}</span>
                  <strong className="mt-1 block truncate">{materia.nombre}</strong>
                  <span className="mt-2 block"><EstadoMateriaBadge estado={materia.estado} /></span>
                </button>
              ))}
            </div>
          )}

          {configuracion && puedeCrear ? (
            <form onSubmit={crearMateria} className="grid gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-end">
              <div>
                <p className="text-xs font-bold uppercase text-slate-500">Siguiente disponible</p>
                <p className="text-xl font-black">Materia {siguienteNumero}</p>
              </div>
              <label className="text-sm font-semibold text-slate-700">
                Nombre de materia
                <input
                  required
                  maxLength={200}
                  className={`${campoEvaluaciones} mt-1`}
                  value={nombreMateria}
                  onChange={(evento) => setNombreMateria(evento.target.value)}
                  placeholder="Escriba el nombre real"
                />
              </label>
              <button type="submit" disabled={procesando} className={botonPrimarioEvaluaciones}>
                Crear materia
              </button>
            </form>
          ) : seleccionadas.length === 0 ? (
            <VacioEvaluaciones
              titulo={configuracion ? "Sin materias creadas" : "Sin configuración"}
              descripcion={
                configuracion
                  ? "Cree la primera materia escribiendo su nombre real."
                  : "La configuración debe realizarla el Encargado de Evaluaciones."
              }
            />
          ) : null}
        </section>

        {procesando && !detalle && <CargandoEvaluaciones />}
        {detalle && (
          <section className={tarjetaEvaluaciones}>
            <div className="mb-4 flex flex-col gap-3 border-b border-slate-200 pb-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-bold uppercase text-slate-500">Materia {detalle.numero_materia}</p>
                <h2 className="text-xl font-black text-slate-950">{detalle.nombre}</h2>
                <div className="mt-2"><EstadoMateriaBadge estado={detalle.estado} /></div>
              </div>
              <div className="flex flex-wrap gap-2">
                {editable && (
                  <button
                    type="button"
                    disabled={procesando}
                    onClick={() => void guardarNotas()}
                    className={botonPrimarioEvaluaciones}
                  >
                    {procesando ? "Guardando…" : "Guardar notas"}
                  </button>
                )}
                {editable && (
                  <button
                    type="button"
                    disabled={procesando}
                    onClick={solicitarEnvio}
                    className={botonSecundarioEvaluaciones}
                  >
                    ENVIAR MATERIA
                  </button>
                )}
              </div>
            </div>

            {!editable && (
              <AvisoEvaluaciones tipo="info">
                La materia está bloqueada para edición desde su envío. La consulta permanece disponible.
              </AvisoEvaluaciones>
            )}

            <div className="my-4 grid grid-cols-3 gap-2">
              <Resumen valor={detalle.resumen.cantidad_cadetes} etiqueta="Estudiantes" />
              <Resumen valor={detalle.resumen.notas_registradas} etiqueta="Cargadas" />
              <Resumen valor={detalle.resumen.notas_pendientes} etiqueta="Pendientes" />
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="bg-slate-100 text-xs uppercase text-slate-600">
                  <tr>
                    <th className="p-3">CI</th>
                    <th className="p-3">Apellidos y nombres</th>
                    <th className="p-3">Nota</th>
                    <th className="p-3 text-center">Clasificación</th>
                  </tr>
                </thead>
                <tbody>
                  {detalle.cadetes.map((fila) => {
                    const valor = ediciones[fila.id_cadete] ?? "";
                    const considerada = notaConsideradaVisual(valor);
                    return (
                      <tr key={fila.id_cadete} className="border-t border-slate-200">
                        <td className="p-3 font-mono text-xs">{fila.ci}</td>
                        <td className="p-3 font-semibold">{fila.apellidos} {fila.nombres}</td>
                        <td className="p-3">
                          <input
                            aria-label={`Nota de ${fila.apellidos} ${fila.nombres}`}
                            inputMode="decimal"
                            disabled={!editable}
                            className={`${campoEvaluaciones} w-32`}
                            value={valor}
                            onChange={(evento) => cambiarNota(fila.id_cadete, evento.target.value)}
                          />
                        </td>
                        <td className="p-3 text-center">
                          <ClasificacionBadge clasificacion={clasificarNotaVisual(considerada)} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-slate-500 sm:hidden">
              Deslice horizontalmente para editar todas las columnas.
            </p>
          </section>
        )}
      </div>

      <ModalEvaluaciones
        abierto={modalEnvio}
        titulo="Enviar materia"
        descripcion="¿Está seguro de enviar las notas de esta materia? Verifique que todas las calificaciones estén correctamente registradas. Después del envío ya no podrá modificarlas normalmente."
        cerrar={() => setModalEnvio(false)}
      >
        {detalle && (
          <div className="space-y-4">
            <dl className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-4 text-sm">
              <Dato etiqueta="Gestión" valor={detalle.periodo?.gestion.ano ?? "—"} />
              <Dato etiqueta="Periodo" valor={detalle.periodo?.periodo ?? "—"} />
              <Dato etiqueta="Curso" valor={nombreCursoEvaluaciones(detalle.curso?.nombre)} />
              <Dato etiqueta="Materia" valor={detalle.nombre} />
              <Dato etiqueta="Total de estudiantes" valor={detalle.resumen.cantidad_cadetes} />
              <Dato etiqueta="Notas registradas" valor={detalle.resumen.notas_registradas} />
              <Dato etiqueta="Notas pendientes" valor={detalle.resumen.notas_pendientes} />
            </dl>
            <div className="flex justify-end gap-2">
              <button type="button" className={botonSecundarioEvaluaciones} onClick={() => setModalEnvio(false)}>
                Cancelar
              </button>
              <button type="button" disabled={procesando} className={botonPrimarioEvaluaciones} onClick={() => void enviar()}>
                {procesando ? "Enviando…" : "Enviar materia"}
              </button>
            </div>
          </div>
        )}
      </ModalEvaluaciones>
    </PaginaProtegidaEvaluaciones>
  );
}

function Resumen({ valor, etiqueta }: { valor: number; etiqueta: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center">
      <p className="text-2xl font-black">{valor}</p>
      <p className="text-xs font-semibold text-slate-500">{etiqueta}</p>
    </div>
  );
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string | number }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase text-slate-500">{etiqueta}</dt>
      <dd className="mt-1 font-bold text-slate-950">{valor}</dd>
    </div>
  );
}
