"use client";

import { useCallback, useEffect, useState } from "react";
import AccesoRestringido from "../../../../../componentes/seguridad/AccesoRestringido";
import DetalleMateriaEvaluacionPanel from "../../../../../componentes/notas/evaluaciones/DetalleMateriaEvaluacion";
import {
  AvisoEvaluaciones,
  botonPrimarioEvaluaciones,
  botonSecundarioEvaluaciones,
  CargandoEvaluaciones,
  campoEvaluaciones,
  EncabezadoEvaluaciones,
  EstadoMateriaBadge,
  ModalEvaluaciones,
  NivelRevisionEvaluacionBadge,
  nombreCursoEvaluaciones,
  PaginaProtegidaEvaluaciones,
  tarjetaEvaluaciones,
  VacioEvaluaciones,
} from "../../../../../componentes/notas/evaluaciones/InterfazEvaluaciones";
import { useAuth } from "../../../../../contextos/AuthContext";
import {
  aprobarMateriaEvaluacion,
  listarMateriasEvaluaciones,
  listarPendientesEvaluaciones,
  marcarMateriaRevisadaEvaluacion,
  mensajeErrorApi,
  modificarNotaExtraordinariaEvaluacion,
  observarMateriaEvaluacion,
  obtenerContextoEvaluaciones,
  obtenerMateriaEvaluacion,
  publicarMateriaEvaluacion,
} from "../../../../../servicios/notas/evaluaciones.service";
import {
  CadeteMateriaEvaluacion,
  ContextoEvaluaciones,
  DetalleMateriaEvaluacion,
  MateriaEvaluacion,
} from "../../../../../tipos/notas/evaluaciones";

const PATRON_NOTA = /^(?:100(?:\.0{1,4})?|\d{1,2}(?:\.\d{1,4})?)$/;

export default function RevisionEvaluacionesPage() {
  const { tienePermiso } = useAuth();
  const [contexto, setContexto] = useState<ContextoEvaluaciones | null>(null);
  const [pendientes, setPendientes] = useState<MateriaEvaluacion[]>([]);
  const [listasPublicacion, setListasPublicacion] = useState<MateriaEvaluacion[]>([]);
  const [materiasCorreccion, setMateriasCorreccion] = useState<MateriaEvaluacion[]>([]);
  const [detalle, setDetalle] = useState<DetalleMateriaEvaluacion | null>(null);
  const [modalObservar, setModalObservar] = useState(false);
  const [comentario, setComentario] = useState("");
  const [notaExtraordinaria, setNotaExtraordinaria] =
    useState<CadeteMateriaEvaluacion | null>(null);
  const [nuevaInicial, setNuevaInicial] = useState("");
  const [justificacion, setJustificacion] = useState("");
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState("");
  const [exito, setExito] = useState("");

  const cargarBandeja = useCallback(async () => {
    setError("");
    try {
      const contextoReal = await obtenerContextoEvaluaciones();
      const [pendientesReales, revisadas, publicadasCorregibles] = await Promise.all([
        contextoReal.perfil === "COMANDO"
          ? Promise.resolve([])
          : listarPendientesEvaluaciones(),
        contextoReal.perfil === "ENCARGADO_EVALUACIONES"
          ? listarMateriasEvaluaciones({ estado: "REVISADO" })
          : Promise.resolve([]),
        tienePermiso("MODIFICAR_NOTA_BLOQUEADA") &&
        ["SECCION_ACADEMICA", "JEFE_ESTUDIOS", "COMANDO"].includes(contextoReal.perfil)
          ? listarMateriasEvaluaciones({ estado: "PUBLICADO" })
          : Promise.resolve([]),
      ]);
      setContexto(contextoReal);
      setPendientes(pendientesReales);
      setListasPublicacion(revisadas);
      setMateriasCorreccion(publicadasCorregibles);
    } catch (e) {
      setError(mensajeErrorApi(e));
    } finally {
      setCargando(false);
    }
  }, [tienePermiso]);

  const abrir = useCallback(async (id: number) => {
    setProcesando(true);
    setError("");
    try {
      setDetalle(await obtenerMateriaEvaluacion(id));
    } catch (e) {
      setError(mensajeErrorApi(e));
    } finally {
      setProcesando(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void cargarBandeja().then(() => {
        const id = Number(new URLSearchParams(window.location.search).get("materia"));
        if (Number.isInteger(id) && id > 0) void abrir(id);
      });
    });
  }, [abrir, cargarBandeja]);

  async function ejecutar(accion: () => Promise<unknown>, mensaje: string) {
    if (!detalle) return;
    setProcesando(true);
    setError("");
    setExito("");
    try {
      await accion();
      setExito(mensaje);
      await cargarBandeja();
      setDetalle(await obtenerMateriaEvaluacion(detalle.id_materia));
      window.dispatchEvent(new Event("notificaciones:actualizar"));
    } catch (e) {
      setError(mensajeErrorApi(e));
    } finally {
      setProcesando(false);
    }
  }

  async function observar() {
    if (!detalle || !comentario.trim()) {
      setError("El comentario de observación es obligatorio.");
      return;
    }
    await ejecutar(
      () => observarMateriaEvaluacion(detalle.id_materia, comentario.trim()),
      "Materia observada y devuelta al Operador.",
    );
    setModalObservar(false);
    setComentario("");
  }

  function abrirExtraordinaria(fila: CadeteMateriaEvaluacion) {
    setNotaExtraordinaria(fila);
    setNuevaInicial(fila.nota_inicial ?? "");
    setJustificacion("");
  }

  async function guardarExtraordinaria() {
    if (!notaExtraordinaria?.id_nota || !detalle) return;
    const inicial = nuevaInicial.trim().replace(",", ".");
    if (!PATRON_NOTA.test(inicial)) {
      setError("La nueva nota debe estar entre 0 y 100.");
      return;
    }
    if (!justificacion.trim()) {
      setError("La justificación es obligatoria.");
      return;
    }
    await ejecutar(
      () =>
        modificarNotaExtraordinariaEvaluacion(notaExtraordinaria.id_nota as number, {
          nota_inicial: inicial,
          justificacion: justificacion.trim(),
        }),
      "Modificación extraordinaria aplicada y auditada.",
    );
    setNotaExtraordinaria(null);
  }

  const nivel = detalle?.nivel_revision_actual;
  const puedeActuar = detalle?.estado === "EN_REVISION";
  const puedeObservar = puedeActuar && tienePermiso("OBSERVAR_NOTAS");
  const puedeAprobar =
    puedeActuar &&
    tienePermiso("REVISAR_NOTAS") &&
    (nivel === "ENCARGADO_AREA" || nivel === "SECCION_ACADEMICA");
  const puedeMarcar =
    puedeActuar &&
    nivel === "JEFE_ESTUDIOS" &&
    tienePermiso("MARCAR_NOTAS_REVISADAS");
  const puedePublicar =
    contexto?.perfil === "ENCARGADO_EVALUACIONES" &&
    detalle?.estado === "REVISADO" &&
    tienePermiso("PUBLICAR_NOTAS");
  const puedeModificar =
    Boolean(contexto && ["JEFE_ESTUDIOS", "SECCION_ACADEMICA", "COMANDO"].includes(contexto.perfil)) &&
    tienePermiso("MODIFICAR_NOTA_BLOQUEADA") &&
    Boolean(detalle && ["EN_REVISION", "REVISADO", "PUBLICADO"].includes(detalle.estado));

  if (cargando) {
    return (
      <PaginaProtegidaEvaluaciones
        permisos={["REVISAR_NOTAS", "MARCAR_NOTAS_REVISADAS", "PUBLICAR_NOTAS", "MODIFICAR_NOTA_BLOQUEADA"]}
      >
        <CargandoEvaluaciones />
      </PaginaProtegidaEvaluaciones>
    );
  }
  if (
    !contexto ||
    !["ENCARGADO_EVALUACIONES", "SECCION_ACADEMICA", "JEFE_ESTUDIOS", "COMANDO"].includes(
      contexto.perfil,
    )
  ) {
    return <AccesoRestringido />;
  }

  return (
    <PaginaProtegidaEvaluaciones
      permisos={["REVISAR_NOTAS", "MARCAR_NOTAS_REVISADAS", "PUBLICAR_NOTAS", "MODIFICAR_NOTA_BLOQUEADA"]}
    >
      <div className="mx-auto max-w-[96rem] space-y-5">
        <EncabezadoEvaluaciones
          titulo={
            contexto.perfil === "JEFE_ESTUDIOS"
              ? "Revisión final"
              : contexto.perfil === "SECCION_ACADEMICA"
                ? "Revisión de Sección Académica"
                : "Revisión y publicación"
          }
          descripcion="La bandeja muestra únicamente las materias pendientes de su nivel. Toda transición utiliza el flujo institucional del backend."
        />
        {error && <AvisoEvaluaciones tipo="error">{error}</AvisoEvaluaciones>}
        {exito && <AvisoEvaluaciones tipo="exito">{exito}</AvisoEvaluaciones>}

        <section className={tarjetaEvaluaciones}>
          <h2 className="mb-3 text-lg font-bold text-slate-950">Pendientes de su nivel</h2>
          {pendientes.length === 0 ? (
            <VacioEvaluaciones
              titulo="Sin materias pendientes"
              descripcion="No existen materias enviadas a su nivel de revisión."
            />
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {pendientes.map((materia) => (
                <TarjetaMateria key={materia.id_materia} materia={materia} abrir={() => void abrir(materia.id_materia)} />
              ))}
            </div>
          )}
        </section>

        {contexto.perfil === "ENCARGADO_EVALUACIONES" && (
          <section className={tarjetaEvaluaciones}>
            <h2 className="mb-3 text-lg font-bold text-slate-950">Listas para publicación</h2>
            {listasPublicacion.length === 0 ? (
              <VacioEvaluaciones
                titulo="Sin materias revisadas"
                descripcion="Aquí aparecerán las materias marcadas REVISADO por Jefe de Estudios."
              />
            ) : (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {listasPublicacion.map((materia) => (
                  <TarjetaMateria key={materia.id_materia} materia={materia} abrir={() => void abrir(materia.id_materia)} />
                ))}
              </div>
            )}
          </section>
        )}

        {materiasCorreccion.length > 0 && (
          <section className={tarjetaEvaluaciones}>
            <h2 className="mb-1 text-lg font-bold text-slate-950">Corrección extraordinaria</h2>
            <p className="mb-3 text-sm text-slate-600">
              Solo para usuarios autorizados. La fuente oficial y cualquier matriz existente se recalculan con auditoría.
            </p>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {materiasCorreccion.map((materia) => (
                <TarjetaMateria key={materia.id_materia} materia={materia} abrir={() => void abrir(materia.id_materia)} />
              ))}
            </div>
          </section>
        )}

        {procesando && !detalle && <CargandoEvaluaciones />}
        {detalle && (
          <section className={tarjetaEvaluaciones}>
            <div className="mb-4 flex flex-col gap-3 border-b border-slate-200 pb-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-950">Detalle institucional</h2>
                <p className="text-sm text-slate-600">Revise todas las notas antes de continuar.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {puedeObservar && (
                  <button type="button" disabled={procesando} className={botonSecundarioEvaluaciones} onClick={() => setModalObservar(true)}>
                    Observar
                  </button>
                )}
                {puedeAprobar && (
                  <button
                    type="button"
                    disabled={procesando}
                    className={botonPrimarioEvaluaciones}
                    onClick={() =>
                      void ejecutar(
                        () => aprobarMateriaEvaluacion(detalle.id_materia),
                        nivel === "ENCARGADO_AREA"
                          ? "Materia aprobada y enviada a Sección Académica."
                          : "Materia aprobada y enviada a Jefe de Estudios.",
                      )
                    }
                  >
                    Aprobar y continuar
                  </button>
                )}
                {puedeMarcar && (
                  <button
                    type="button"
                    disabled={procesando}
                    className={botonPrimarioEvaluaciones}
                    onClick={() =>
                      void ejecutar(
                        () => marcarMateriaRevisadaEvaluacion(detalle.id_materia),
                        "Materia marcada REVISADO y devuelta al Encargado para publicación.",
                      )
                    }
                  >
                    Marcar como revisado
                  </button>
                )}
                {puedePublicar && (
                  <button
                    type="button"
                    disabled={procesando}
                    className={botonPrimarioEvaluaciones}
                    onClick={() =>
                      window.confirm("¿Publicar esta materia para Estudiantes y Comando?") &&
                      void ejecutar(
                        () => publicarMateriaEvaluacion(detalle.id_materia),
                        "Materia publicada correctamente.",
                      )
                    }
                  >
                    Publicar
                  </button>
                )}
              </div>
            </div>
            <DetalleMateriaEvaluacionPanel
              materia={detalle}
              modificarExtraordinariamente={puedeModificar ? abrirExtraordinaria : undefined}
            />
          </section>
        )}
      </div>

      <ModalEvaluaciones
        abierto={modalObservar}
        titulo="Observar materia"
        descripcion="El comentario es obligatorio y la materia volverá al Operador."
        cerrar={() => setModalObservar(false)}
      >
        <div className="space-y-4">
          <label className="block text-sm font-semibold text-slate-700">
            Comentario de observación
            <textarea
              required
              maxLength={1000}
              className={`${campoEvaluaciones} mt-1 min-h-28`}
              value={comentario}
              onChange={(evento) => setComentario(evento.target.value)}
            />
          </label>
          <div className="flex justify-end gap-2">
            <button type="button" className={botonSecundarioEvaluaciones} onClick={() => setModalObservar(false)}>
              Cancelar
            </button>
            <button type="button" disabled={procesando || !comentario.trim()} className={botonPrimarioEvaluaciones} onClick={() => void observar()}>
              Confirmar observación
            </button>
          </div>
        </div>
      </ModalEvaluaciones>

      <ModalEvaluaciones
        abierto={Boolean(notaExtraordinaria)}
        titulo="Modificación extraordinaria"
        descripcion="La nota anterior, el nuevo valor y la justificación quedarán auditados."
        cerrar={() => setNotaExtraordinaria(null)}
      >
        {notaExtraordinaria && (
          <div className="space-y-4">
            <div className="rounded-xl bg-slate-50 p-4 text-sm">
              <p className="font-bold">{notaExtraordinaria.apellidos} {notaExtraordinaria.nombres}</p>
              <p className="mt-1 text-slate-600">
                Nota actual: {notaExtraordinaria.nota_inicial ?? "—"}
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm font-semibold text-slate-700">
                Nueva nota
                <input
                  className={`${campoEvaluaciones} mt-1`}
                  inputMode="decimal"
                  value={nuevaInicial}
                  onChange={(evento) => setNuevaInicial(evento.target.value)}
                />
              </label>
            </div>
            <label className="block text-sm font-semibold text-slate-700">
              Justificación
              <textarea
                required
                maxLength={1000}
                className={`${campoEvaluaciones} mt-1 min-h-28`}
                value={justificacion}
                onChange={(evento) => setJustificacion(evento.target.value)}
              />
            </label>
            <div className="flex justify-end gap-2">
              <button type="button" className={botonSecundarioEvaluaciones} onClick={() => setNotaExtraordinaria(null)}>
                Cancelar
              </button>
              <button type="button" disabled={procesando || !justificacion.trim()} className={botonPrimarioEvaluaciones} onClick={() => void guardarExtraordinaria()}>
                Aplicar modificación
              </button>
            </div>
          </div>
        )}
      </ModalEvaluaciones>
    </PaginaProtegidaEvaluaciones>
  );
}

function TarjetaMateria({
  materia,
  abrir,
}: {
  materia: MateriaEvaluacion;
  abrir: () => void;
}) {
  return (
    <button
      type="button"
      onClick={abrir}
      className="rounded-xl border border-slate-200 p-4 text-left transition hover:border-[#74a892] hover:bg-emerald-50/40"
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-bold uppercase text-slate-500">
            {materia.periodo?.periodo}/{materia.periodo?.gestion.ano} · Materia {materia.numero_materia}
          </p>
          <h3 className="text-lg font-black">{materia.nombre}</h3>
          <p className="text-xs text-slate-500">{nombreCursoEvaluaciones(materia.curso?.nombre)}</p>
        </div>
        <EstadoMateriaBadge estado={materia.estado} />
      </div>
      <div className="flex flex-wrap gap-2">
        <NivelRevisionEvaluacionBadge nivel={materia.nivel_revision_actual} />
        <span className="text-xs text-slate-500">{materia._count?.notas ?? 0} notas</span>
      </div>
      <p className="mt-3 text-xs text-slate-500">
        Operador: {materia.creador ? `${materia.creador.apellidos} ${materia.creador.nombres}` : "—"}
      </p>
    </button>
  );
}
