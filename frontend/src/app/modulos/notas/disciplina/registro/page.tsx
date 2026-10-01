"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import FormularioRegistroDisciplina from "../../../../../componentes/notas/disciplina/FormularioRegistroDisciplina";
import {
  AvisoDisciplina,
  botonPrimarioDisciplina,
  botonSecundarioDisciplina,
  CargandoDisciplina,
  campoDisciplina,
  EncabezadoDisciplina,
  EstadoSemanaBadge,
  ModalDisciplina,
  PaginaProtegidaDisciplina,
  tarjetaDisciplina,
  VacioDisciplina,
} from "../../../../../componentes/notas/disciplina/InterfazDisciplina";
import { SelectoresDisciplina } from "../../../../../componentes/notas/disciplina/SelectoresDisciplina";
import { useAuth } from "../../../../../contextos/AuthContext";
import AccesoRestringido from "../../../../../componentes/seguridad/AccesoRestringido";
import {
  actualizarRegistroDisciplina,
  crearRegistroDisciplina,
  eliminarRegistroDisciplina,
  enviarSemanaDisciplina,
  listarCatalogosDisciplina,
  listarConfiguracionesDisciplina,
  listarOficialesDisciplina,
  listarSemanasDisciplina,
  mensajeErrorApi,
  obtenerContextoDisciplina,
  obtenerSemanaDisciplina,
} from "../../../../../servicios/notas/disciplina.service";
import { suscribirseASemanasDisciplina } from "../../../../../servicios/notas/sincronizacion-disciplina";
import {
  ActualizarRegistroDisciplina,
  CatalogoDisciplina,
  ConfiguracionDisciplina,
  ContextoDisciplina,
  CrearRegistroDisciplina,
  OficialDisciplina,
  RegistroDisciplina,
  SemanaDetalleDisciplina,
  SemanaDisciplina,
} from "../../../../../tipos/notas/disciplina";

export default function RegistroSemanalDisciplinaPage() {
  const { usuario, tienePermiso } = useAuth();
  const [contexto, setContexto] = useState<ContextoDisciplina | null>(null);
  const [configuraciones, setConfiguraciones] = useState<
    ConfiguracionDisciplina[]
  >([]);
  const [semanas, setSemanas] = useState<SemanaDisciplina[]>([]);
  const [catalogos, setCatalogos] = useState<CatalogoDisciplina[]>([]);
  const [oficiales, setOficiales] = useState<OficialDisciplina[]>([]);
  const [idGestion, setIdGestion] = useState<number | null>(null);
  const [idPeriodo, setIdPeriodo] = useState<number | null>(null);
  const [idCurso, setIdCurso] = useState<number | null>(null);
  const [semana, setSemana] = useState<SemanaDetalleDisciplina | null>(null);
  const [cadeteSeleccionado, setCadeteSeleccionado] = useState<number | null>(
    null,
  );
  const [buscar, setBuscar] = useState("");
  const [registroEditando, setRegistroEditando] =
    useState<RegistroDisciplina | null>(null);
  const [modalRegistro, setModalRegistro] = useState(false);
  const [modalEnvio, setModalEnvio] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState("");
  const [exito, setExito] = useState("");
  const enlaceInicialProcesado = useRef(false);

  const cargarBase = useCallback(async () => {
    setError("");
    try {
      const [
        contextoReal,
        configuracionesReales,
        catalogosReales,
        oficialesReales,
      ] = await Promise.all([
        obtenerContextoDisciplina(),
        listarConfiguracionesDisciplina({ solo_activas: true }),
        listarCatalogosDisciplina({ solo_activos: true }),
        listarOficialesDisciplina({ solo_activos: true }),
      ]);
      setContexto(contextoReal);
      setConfiguraciones(configuracionesReales);
      setCatalogos(catalogosReales);
      setOficiales(oficialesReales);
      const gestionInicial =
        contextoReal.gestiones.find((gestion) =>
          gestion.periodos.some((periodo) => periodo.activo),
        ) ?? contextoReal.gestiones[0];
      const periodoInicial =
        gestionInicial?.periodos.find((periodo) => periodo.activo) ??
        gestionInicial?.periodos[0];
      setIdGestion((actual) => actual ?? gestionInicial?.id_gestion ?? null);
      setIdPeriodo((actual) => actual ?? periodoInicial?.id_periodo ?? null);
      setIdCurso(
        (actual) => actual ?? contextoReal.cursos[0]?.id_curso ?? null,
      );
    } catch (e) {
      setError(mensajeErrorApi(e));
    } finally {
      setCargando(false);
    }
  }, []);

  const cargarSemanas = useCallback(async () => {
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

  const abrirSemana = useCallback(async (idSemana: number) => {
    setProcesando(true);
    setError("");
    try {
      const detalle = await obtenerSemanaDisciplina(idSemana);
      setSemana(detalle);
      setCadeteSeleccionado((actual) =>
        detalle.cadetes.some((cadete) => cadete.id_cadete === actual)
          ? actual
          : (detalle.cadetes[0]?.id_cadete ?? null),
      );
    } catch (e) {
      setError(mensajeErrorApi(e));
    } finally {
      setProcesando(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      setSemana(null);
      setCadeteSeleccionado(null);
      void cargarSemanas().then(() => {
        if (enlaceInicialProcesado.current || !idPeriodo || !idCurso) return;
        enlaceInicialProcesado.current = true;
        const id = Number(
          new URLSearchParams(window.location.search).get("semana"),
        );
        if (Number.isInteger(id) && id > 0) void abrirSemana(id);
      });
    });
  }, [abrirSemana, cargarSemanas, idCurso, idPeriodo]);

  useEffect(() => {
    queueMicrotask(() => void cargarBase());
  }, [cargarBase]);

  const configuracion = configuraciones.find(
    (item) => item.id_periodo === idPeriodo && item.id_curso === idCurso,
  );
  const periodo = contexto?.gestiones
    .flatMap((gestion) => gestion.periodos)
    .find((item) => item.id_periodo === idPeriodo);
  const puedeEditar =
    Boolean(semana) &&
    (semana?.estado === "BORRADOR" || semana?.estado === "OBSERVADO") &&
    Boolean(periodo?.activo) &&
    tienePermiso("EDITAR_NOTAS");
  const puedeCrear = puedeEditar;

  const registrosPorCadete = useMemo(() => {
    const mapa = new Map<number, RegistroDisciplina[]>();
    for (const registro of semana?.registros ?? []) {
      const actuales = mapa.get(registro.id_cadete) ?? [];
      actuales.push(registro);
      mapa.set(registro.id_cadete, actuales);
    }
    return mapa;
  }, [semana]);
  const cadetesFiltrados = useMemo(() => {
    const termino = buscar.trim().toLocaleLowerCase("es");
    return (semana?.cadetes ?? []).filter((cadete) =>
      `${cadete.usuario.ci} ${cadete.usuario.nombres} ${cadete.usuario.apellidos}`
        .toLocaleLowerCase("es")
        .includes(termino),
    );
  }, [buscar, semana]);
  const cadete = semana?.cadetes.find(
    (item) => item.id_cadete === cadeteSeleccionado,
  );
  const registrosCadete = cadeteSeleccionado
    ? (registrosPorCadete.get(cadeteSeleccionado) ?? [])
    : [];

  async function guardarRegistro(
    datos: CrearRegistroDisciplina | ActualizarRegistroDisciplina,
  ) {
    if (!semana || !cadeteSeleccionado) return;
    setProcesando(true);
    setError("");
    setExito("");
    try {
      if (registroEditando) {
        await actualizarRegistroDisciplina(registroEditando.id_registro, datos);
      } else {
        await crearRegistroDisciplina(semana.id_semana, {
          ...(datos as CrearRegistroDisciplina),
          id_cadete: cadeteSeleccionado,
        });
      }
      const detalle = await obtenerSemanaDisciplina(semana.id_semana);
      setSemana(detalle);
      setModalRegistro(false);
      setRegistroEditando(null);
      setExito(
        registroEditando
          ? "Registro actualizado correctamente"
          : "Registro guardado correctamente",
      );
    } catch (e) {
      setError(mensajeErrorApi(e));
    } finally {
      setProcesando(false);
    }
  }

  async function eliminar(registro: RegistroDisciplina) {
    if (!semana || !window.confirm("¿Eliminar este registro en borrador?"))
      return;
    setProcesando(true);
    setError("");
    try {
      await eliminarRegistroDisciplina(registro.id_registro);
      setSemana(await obtenerSemanaDisciplina(semana.id_semana));
      setExito("Registro eliminado del borrador.");
    } catch (e) {
      setError(mensajeErrorApi(e));
    } finally {
      setProcesando(false);
    }
  }

  async function enviar() {
    if (!semana) return;
    setProcesando(true);
    setError("");
    try {
      await enviarSemanaDisciplina(semana.id_semana);
      setModalEnvio(false);
      await cargarSemanas();
      await abrirSemana(semana.id_semana);
      setExito(
        "Semana enviada. Desde ahora queda disponible solo para consulta hasta una posible observación.",
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
      <PaginaProtegidaDisciplina permisos={["REGISTRAR_NOTAS"]}>
        <CargandoDisciplina />
      </PaginaProtegidaDisciplina>
    );
  }

  if (contexto?.perfil !== "OPERADOR_DISCIPLINA") {
    return <AccesoRestringido />;
  }

  const conRegistros = registrosPorCadete.size;
  const meritos =
    semana?.registros.filter((r) => r.catalogo.tipo === "MERITO").length ?? 0;
  const demeritos =
    semana?.registros.filter((r) => r.catalogo.tipo === "DEMERITO").length ?? 0;

  return (
    <PaginaProtegidaDisciplina permisos={["REGISTRAR_NOTAS"]}>
      <div className="mx-auto max-w-7xl space-y-5">
        <EncabezadoDisciplina
          titulo="Registro semanal"
          descripcion="Las semanas habilitadas por el Encargado de Disciplina aparecen aquí automáticamente para registrar la información real del curso autorizado."
        />
        {error && <AvisoDisciplina tipo="error">{error}</AvisoDisciplina>}
        {exito && <AvisoDisciplina tipo="exito">{exito}</AvisoDisciplina>}

        {!contexto || contexto.cursos.length === 0 ? (
          <VacioDisciplina
            titulo="Sin curso asignado"
            descripcion="Su usuario no tiene una asignación académica vigente para registrar Disciplina."
          />
        ) : (
          <section className={tarjetaDisciplina}>
            <SelectoresDisciplina
              contexto={contexto}
              idGestion={idGestion}
              idPeriodo={idPeriodo}
              idCurso={idCurso}
              cambiarGestion={setIdGestion}
              cambiarPeriodo={setIdPeriodo}
              cambiarCurso={setIdCurso}
            />
            {!configuracion ? (
              <div className="mt-4">
                <VacioDisciplina
                  titulo="Semanas no configuradas"
                  descripcion="El Encargado de Disciplina debe definir primero la cantidad real de semanas para este periodo y curso."
                />
              </div>
            ) : (
              <div className="mt-5">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <h2 className="font-bold text-slate-950">
                    Semanas configuradas: {configuracion.cantidad_semanas}
                  </h2>
                  {!periodo?.activo && (
                    <span className="text-sm font-semibold text-amber-700">
                      Periodo inactivo: solo continuidad y consulta
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
                  {Array.from(
                    { length: configuracion.cantidad_semanas },
                    (_, indice) => {
                      const numero = indice + 1;
                      const existente = semanas.find(
                        (item) => item.numero_semana === numero,
                      );
                      return (
                        <button
                          key={numero}
                          type="button"
                          disabled={procesando || !existente}
                          onClick={() =>
                            existente && void abrirSemana(existente.id_semana)
                          }
                          className={`rounded-xl border p-3 text-left transition ${!existente ? "cursor-not-allowed border-slate-200 bg-slate-100 opacity-60" : semana?.id_semana === existente.id_semana ? "border-[#2d6a4f] bg-emerald-50 ring-2 ring-emerald-100" : "cursor-pointer border-slate-200 hover:border-slate-300 hover:bg-slate-50"}`}
                        >
                          <span className="block text-xs font-bold text-slate-500">
                            Semana
                          </span>
                          <span className="text-xl font-black text-slate-950">
                            {numero}
                          </span>
                          <span className="mt-1 block text-[11px] font-semibold text-slate-600">
                            {existente
                              ? existente.estado === "BORRADOR" ||
                                existente.estado === "OBSERVADO"
                                ? `${existente.estado.replace("_", " ")} · Editar`
                                : `${existente.estado.replace("_", " ")} · Ver`
                              : "Bloqueada"}
                          </span>
                        </button>
                      );
                    },
                  )}
                </div>
              </div>
            )}
          </section>
        )}

        {procesando && !semana && <CargandoDisciplina />}

        {semana && (
          <section className={tarjetaDisciplina}>
            <div className="mb-4 flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-bold text-slate-950">
                    Semana {semana.numero_semana}
                  </h2>
                  <EstadoSemanaBadge estado={semana.estado} />
                </div>
                <p className="mt-1 text-sm text-slate-600">
                  {semana.registros.length} registros · {conRegistros} estudiantes
                  con registro
                </p>
              </div>
              {(semana.estado === "BORRADOR" ||
                semana.estado === "OBSERVADO") &&
                tienePermiso("ENVIAR_NOTAS") && (
                  <button
                    type="button"
                    disabled={procesando}
                    className={botonPrimarioDisciplina}
                    onClick={() => setModalEnvio(true)}
                  >
                    {semana.estado === "OBSERVADO"
                      ? "REENVIAR SEMANA"
                      : "ENVIAR SEMANA"}
                  </button>
                )}
            </div>
            {semana.estado === "OBSERVADO" && (
              <div className="mb-4">
                <AvisoDisciplina tipo="alerta">
                  La semana fue observada. Puede corregir registros existentes
                  y, si el periodo sigue activo, agregar nuevos antes de
                  reenviar.
                </AvisoDisciplina>
              </div>
            )}
            {!puedeEditar && (
              <div className="mb-4">
                <AvisoDisciplina tipo="info">
                  Semana bloqueada para edición. La información permanece
                  disponible para consulta.
                </AvisoDisciplina>
              </div>
            )}
            <div className="grid gap-4 lg:grid-cols-[minmax(280px,0.8fr)_minmax(0,1.2fr)]">
              <aside className="rounded-xl border border-slate-200 p-3">
                <input
                  className={campoDisciplina}
                  value={buscar}
                  onChange={(evento) => setBuscar(evento.target.value)}
                  placeholder="Buscar por CI o nombre"
                />
                <div className="mt-3 max-h-[34rem] space-y-2 overflow-y-auto">
                  {cadetesFiltrados.map((item) => {
                    const cantidad =
                      registrosPorCadete.get(item.id_cadete)?.length ?? 0;
                    return (
                      <button
                        key={item.id_cadete}
                        type="button"
                        className={`w-full rounded-lg border p-3 text-left ${cadeteSeleccionado === item.id_cadete ? "border-[#2d6a4f] bg-emerald-50" : "border-slate-200 hover:bg-slate-50"}`}
                        onClick={() => setCadeteSeleccionado(item.id_cadete)}
                      >
                        <div className="flex justify-between gap-2">
                          <div>
                            <p className="text-sm font-bold">
                              {item.usuario.apellidos} {item.usuario.nombres}
                            </p>
                            <p className="text-xs text-slate-500">
                              CI {item.usuario.ci}
                            </p>
                          </div>
                          <span
                            className={`h-fit rounded-full px-2 py-1 text-[11px] font-bold ${cantidad ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}`}
                          >
                            {cantidad === 0
                              ? "Sin novedades"
                              : cantidad === 1
                                ? "Registrado ✓"
                                : `${cantidad} registros ✓`}
                          </span>
                        </div>
                        <span className="mt-2 block text-xs font-bold text-[#2d6a4f]">
                          {puedeEditar ? "Editar" : "Ver"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </aside>
              <div className="rounded-xl border border-slate-200 p-4">
                {!cadete ? (
                  <VacioDisciplina
                    titulo="Seleccione un estudiante"
                    descripcion="Abra un estudiante para consultar o registrar información."
                  />
                ) : (
                  <div className="space-y-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h3 className="text-lg font-bold">
                          {cadete.usuario.apellidos} {cadete.usuario.nombres}
                        </h3>
                        <p className="text-sm text-slate-500">
                          CI {cadete.usuario.ci}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          className={botonSecundarioDisciplina}
                          onClick={() => setCadeteSeleccionado(null)}
                        >
                          Regresar a la lista
                        </button>
                        {puedeCrear && (
                          <button
                            type="button"
                            className={botonPrimarioDisciplina}
                            onClick={() => {
                              setRegistroEditando(null);
                              setModalRegistro(true);
                            }}
                          >
                            Agregar mérito o demérito
                          </button>
                        )}
                      </div>
                    </div>
                    {registrosCadete.length === 0 ? (
                      <VacioDisciplina
                        titulo="Sin registros"
                        descripcion="No se crea ningún registro hasta que guarde información real."
                      />
                    ) : (
                      registrosCadete.map((registro) => (
                        <article
                          key={registro.id_registro}
                          className="rounded-xl border border-slate-200 p-4"
                        >
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <span
                                className={`text-xs font-black ${registro.catalogo.tipo === "MERITO" ? "text-emerald-700" : "text-red-700"}`}
                              >
                                {registro.catalogo.tipo}
                              </span>
                              <h4 className="font-bold">
                                {registro.catalogo.codigo} ·{" "}
                                {registro.catalogo.nombre}
                              </h4>
                              {registro.catalogo.tipo === "DEMERITO" && (
                                <p className="mt-1 text-sm text-slate-600">
                                  {registro.fecha_hecho?.slice(0, 10)} ·{" "}
                                  {registro.oficial?.nombre_completo ??
                                    registro.nombre_responsable_manual}
                                </p>
                              )}
                              {registro.observacion && (
                                <p className="mt-2 text-sm text-slate-600">
                                  {registro.observacion}
                                </p>
                              )}
                            </div>
                            <div className="flex shrink-0 flex-col items-end gap-2">
                              <span className="font-mono font-black">
                                {registro.puntaje}
                              </span>
                              {puedeEditar &&
                                registro.id_creador === usuario?.id_usuario && (
                                  <div className="flex gap-2">
                                    <button
                                      type="button"
                                      className={botonSecundarioDisciplina}
                                      onClick={() => {
                                        setRegistroEditando(registro);
                                        setModalRegistro(true);
                                      }}
                                    >
                                      Editar
                                    </button>
                                    {semana.estado === "BORRADOR" && (
                                      <button
                                        type="button"
                                        className={botonSecundarioDisciplina}
                                        onClick={() => void eliminar(registro)}
                                      >
                                        Eliminar
                                      </button>
                                    )}
                                  </div>
                                )}
                            </div>
                          </div>
                        </article>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          </section>
        )}
      </div>

      <ModalDisciplina
        abierto={modalRegistro}
        titulo={registroEditando ? "Editar registro" : "Agregar registro"}
        descripcion="Puede guardar varios méritos o deméritos reales para el mismo estudiante."
        cerrar={() => setModalRegistro(false)}
      >
        {cadeteSeleccionado && (
          <FormularioRegistroDisciplina
            idCadete={cadeteSeleccionado}
            catalogos={catalogos}
            oficiales={oficiales}
            registro={registroEditando}
            guardando={procesando}
            guardar={guardarRegistro}
            cancelar={() => setModalRegistro(false)}
          />
        )}
      </ModalDisciplina>

      <ModalDisciplina
        abierto={modalEnvio}
        titulo="Resumen antes de enviar"
        descripcion="Verifique la cobertura y los registros reales. El envío bloqueará la edición normal."
        cerrar={() => setModalEnvio(false)}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <Resumen valor={semana?.cadetes.length ?? 0} etiqueta="Estudiantes" />
            <Resumen valor={conRegistros} etiqueta="Con registros" />
            <Resumen
              valor={(semana?.cadetes.length ?? 0) - conRegistros}
              etiqueta="Sin novedades"
            />
            <Resumen valor={meritos} etiqueta="Méritos" />
            <Resumen valor={demeritos} etiqueta="Deméritos" />
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
            <strong>{semana?.curso?.nombre.replaceAll("_", " ")}</strong> ·
            Periodo {semana?.periodo?.periodo} / {semana?.periodo?.gestion.ano}{" "}
            · Semana {semana?.numero_semana}
          </div>
          <AvisoDisciplina tipo="info">
            {(semana?.cadetes.length ?? 0) - conRegistros} estudiantes no tienen
            registros. Esto es válido: el sistema no generará filas vacías.
          </AvisoDisciplina>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className={botonSecundarioDisciplina}
              onClick={() => setModalEnvio(false)}
            >
              Volver
            </button>
            <button
              type="button"
              disabled={procesando}
              className={botonPrimarioDisciplina}
              onClick={() => void enviar()}
            >
              {procesando
                ? "Enviando…"
                : semana?.estado === "OBSERVADO"
                  ? "Confirmar reenvío"
                  : "Confirmar envío"}
            </button>
          </div>
        </div>
      </ModalDisciplina>
    </PaginaProtegidaDisciplina>
  );
}

function Resumen({ valor, etiqueta }: { valor: number; etiqueta: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center">
      <p className="text-2xl font-black text-slate-950">{valor}</p>
      <p className="text-xs font-semibold text-slate-500">{etiqueta}</p>
    </div>
  );
}
