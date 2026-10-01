"use client";

import { useCallback, useEffect, useState } from "react";
import DetalleSemanaDisciplina from "../../../../../componentes/notas/disciplina/DetalleSemanaDisciplina";
import FormularioRegistroDisciplina from "../../../../../componentes/notas/disciplina/FormularioRegistroDisciplina";
import {
  AvisoDisciplina,
  botonPrimarioDisciplina,
  botonSecundarioDisciplina,
  CargandoDisciplina,
  campoDisciplina,
  EncabezadoDisciplina,
  EstadoSemanaBadge,
  fechaLegible,
  ModalDisciplina,
  NivelRevisionBadge,
  PaginaProtegidaDisciplina,
  tarjetaDisciplina,
  VacioDisciplina,
} from "../../../../../componentes/notas/disciplina/InterfazDisciplina";
import { useAuth } from "../../../../../contextos/AuthContext";
import AccesoRestringido from "../../../../../componentes/seguridad/AccesoRestringido";
import {
  aprobarSemanaDisciplina,
  consultarAcumuladoDisciplina,
  listarCatalogosDisciplina,
  listarOficialesDisciplina,
  listarPendientesDisciplina,
  listarSemanasDisciplina,
  marcarSemanaRevisadaDisciplina,
  mensajeErrorApi,
  modificarRegistroExtraordinario,
  observarSemanaDisciplina,
  obtenerContextoDisciplina,
  obtenerSemanaDisciplina,
  publicarSemanaDisciplina,
} from "../../../../../servicios/notas/disciplina.service";
import {
  AcumuladoDisciplina,
  ActualizarRegistroDisciplina,
  CatalogoDisciplina,
  ContextoDisciplina,
  OficialDisciplina,
  RegistroDisciplina,
  SemanaDetalleDisciplina,
  SemanaDisciplina,
} from "../../../../../tipos/notas/disciplina";

export default function RevisionDisciplinaPage() {
  const { tienePermiso } = useAuth();
  const [contexto, setContexto] = useState<ContextoDisciplina | null>(null);
  const [pendientes, setPendientes] = useState<SemanaDisciplina[]>([]);
  const [listasPublicacion, setListasPublicacion] = useState<
    SemanaDisciplina[]
  >([]);
  const [detalle, setDetalle] = useState<SemanaDetalleDisciplina | null>(null);
  const [catalogos, setCatalogos] = useState<CatalogoDisciplina[]>([]);
  const [oficiales, setOficiales] = useState<OficialDisciplina[]>([]);
  const [registroExtraordinario, setRegistroExtraordinario] =
    useState<RegistroDisciplina | null>(null);
  const [acumulado, setAcumulado] = useState<AcumuladoDisciplina | null>(null);
  const [modalObservar, setModalObservar] = useState(false);
  const [comentario, setComentario] = useState("");
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState("");
  const [exito, setExito] = useState("");

  const cargarBandeja = useCallback(async () => {
    setError("");
    try {
      const contextoReal = await obtenerContextoDisciplina();
      setContexto(contextoReal);
      const [pendientesReales, revisadas, catalogosReales, oficialesReales] =
        await Promise.all([
          listarPendientesDisciplina(),
          tienePermiso("PUBLICAR_NOTAS")
            ? listarSemanasDisciplina({ estado: "REVISADO" })
            : Promise.resolve([]),
          tienePermiso("MODIFICAR_NOTA_BLOQUEADA")
            ? listarCatalogosDisciplina({ solo_activos: false })
            : Promise.resolve([]),
          tienePermiso("MODIFICAR_NOTA_BLOQUEADA")
            ? listarOficialesDisciplina({ solo_activos: false })
            : Promise.resolve([]),
        ]);
      setPendientes(pendientesReales);
      setListasPublicacion(revisadas);
      setCatalogos(catalogosReales);
      setOficiales(oficialesReales);
    } catch (e) {
      setError(mensajeErrorApi(e));
    } finally {
      setCargando(false);
    }
  }, [tienePermiso]);

  const abrir = useCallback(async (idSemana: number) => {
    setProcesando(true);
    setError("");
    try {
      setDetalle(await obtenerSemanaDisciplina(idSemana));
    } catch (e) {
      setError(mensajeErrorApi(e));
    } finally {
      setProcesando(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void cargarBandeja().then(() => {
        const id = Number(
          new URLSearchParams(window.location.search).get("semana"),
        );
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
      setDetalle(await obtenerSemanaDisciplina(detalle.id_semana));
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
      () => observarSemanaDisciplina(detalle.id_semana, comentario.trim()),
      "Semana observada y devuelta para corrección.",
    );
    setModalObservar(false);
    setComentario("");
  }

  async function verAcumulado() {
    if (!detalle?.periodo?.gestion.id_gestion) return;
    setProcesando(true);
    setError("");
    try {
      setAcumulado(
        await consultarAcumuladoDisciplina({
          id_gestion: detalle.periodo.gestion.id_gestion,
          id_periodo: detalle.id_periodo,
          id_curso: detalle.id_curso,
        }),
      );
    } catch (e) {
      setError(mensajeErrorApi(e));
    } finally {
      setProcesando(false);
    }
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
    detalle?.estado === "REVISADO" && tienePermiso("PUBLICAR_NOTAS");

  if (cargando) {
    return (
      <PaginaProtegidaDisciplina
        permisos={["REVISAR_NOTAS", "MARCAR_NOTAS_REVISADAS", "PUBLICAR_NOTAS"]}
      >
        <CargandoDisciplina />
      </PaginaProtegidaDisciplina>
    );
  }
  if (contexto?.perfil === "ADMINISTRADOR") return <AccesoRestringido />;

  return (
    <PaginaProtegidaDisciplina
      permisos={["REVISAR_NOTAS", "MARCAR_NOTAS_REVISADAS", "PUBLICAR_NOTAS"]}
    >
      <div className="mx-auto max-w-7xl space-y-5">
        <EncabezadoDisciplina
          titulo={
            contexto?.perfil === "SECCION_ACADEMICA"
              ? "Pendientes de Disciplina"
              : contexto?.perfil === "JEFE_ESTUDIOS"
                ? "Revisión final"
                : "Revisión y publicación"
          }
          descripcion="La bandeja muestra únicamente semanas asignadas a su nivel. Las acciones quedan registradas en auditoría."
        />
        {error && <AvisoDisciplina tipo="error">{error}</AvisoDisciplina>}
        {exito && <AvisoDisciplina tipo="exito">{exito}</AvisoDisciplina>}

        <section className={tarjetaDisciplina}>
          <h2 className="mb-3 text-lg font-bold text-slate-950">
            Pendientes de su nivel
          </h2>
          {pendientes.length === 0 ? (
            <VacioDisciplina
              titulo="Sin semanas pendientes"
              descripcion="No existen semanas enviadas a su nivel de revisión."
            />
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {pendientes.map((semana) => (
                <TarjetaSemana
                  key={semana.id_semana}
                  semana={semana}
                  abrir={() => void abrir(semana.id_semana)}
                />
              ))}
            </div>
          )}
        </section>

        {tienePermiso("PUBLICAR_NOTAS") && (
          <section className={tarjetaDisciplina}>
            <h2 className="mb-3 text-lg font-bold text-slate-950">
              Listas para publicación
            </h2>
            {listasPublicacion.length === 0 ? (
              <VacioDisciplina
                titulo="Sin semanas revisadas"
                descripcion="Solo aparecerán aquí las semanas marcadas REVISADO por Jefe de Estudios."
              />
            ) : (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {listasPublicacion.map((semana) => (
                  <TarjetaSemana
                    key={semana.id_semana}
                    semana={semana}
                    abrir={() => void abrir(semana.id_semana)}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {procesando && !detalle && <CargandoDisciplina />}
        {detalle && (
          <section className={tarjetaDisciplina}>
            <div className="mb-4 flex flex-col gap-3 border-b border-slate-200 pb-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-950">
                  Detalle institucional
                </h2>
                <p className="text-sm text-slate-600">
                  Revise el curso completo antes de ejecutar una transición.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={procesando}
                  className={botonSecundarioDisciplina}
                  onClick={() => void verAcumulado()}
                >
                  Ver acumulados
                </button>
                {puedeObservar && (
                  <button
                    type="button"
                    disabled={procesando}
                    className={botonSecundarioDisciplina}
                    onClick={() => setModalObservar(true)}
                  >
                    Observar
                  </button>
                )}
                {puedeAprobar && (
                  <button
                    type="button"
                    disabled={procesando}
                    className={botonPrimarioDisciplina}
                    onClick={() =>
                      void ejecutar(
                        () => aprobarSemanaDisciplina(detalle.id_semana),
                        nivel === "ENCARGADO_AREA"
                          ? "Semana aprobada y enviada a Sección Académica."
                          : "Semana aprobada y enviada a Jefe de Estudios.",
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
                    className={botonPrimarioDisciplina}
                    onClick={() =>
                      void ejecutar(
                        () => marcarSemanaRevisadaDisciplina(detalle.id_semana),
                        "Semana marcada como REVISADO y enviada al Encargado de Disciplina.",
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
                    className={botonPrimarioDisciplina}
                    onClick={() =>
                      window.confirm(
                        "¿Publicar esta semana para la consulta de los estudiantes?",
                      ) &&
                      void ejecutar(
                        () => publicarSemanaDisciplina(detalle.id_semana),
                        "Semana publicada correctamente.",
                      )
                    }
                  >
                    Publicar
                  </button>
                )}
              </div>
            </div>
            <DetalleSemanaDisciplina
              semana={detalle}
              permitirExtraordinaria={tienePermiso("MODIFICAR_NOTA_BLOQUEADA")}
              modificarExtraordinariamente={setRegistroExtraordinario}
            />
          </section>
        )}
      </div>

      <ModalDisciplina
        abierto={modalObservar}
        titulo="Observar semana"
        descripcion="El comentario es obligatorio y será visible para el creador en su notificación."
        cerrar={() => setModalObservar(false)}
      >
        <div className="space-y-4">
          <label className="block text-sm font-semibold text-slate-700">
            Comentario de observación
            <textarea
              required
              maxLength={1000}
              className={`${campoDisciplina} mt-1 min-h-28`}
              value={comentario}
              onChange={(evento) => setComentario(evento.target.value)}
            />
          </label>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className={botonSecundarioDisciplina}
              onClick={() => setModalObservar(false)}
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={procesando || !comentario.trim()}
              className={botonPrimarioDisciplina}
              onClick={() => void observar()}
            >
              Confirmar observación
            </button>
          </div>
        </div>
      </ModalDisciplina>

      <ModalDisciplina
        abierto={Boolean(registroExtraordinario)}
        titulo="Modificación extraordinaria"
        descripcion="Requiere una justificación explícita. El valor anterior y el nuevo quedarán auditados."
        cerrar={() => setRegistroExtraordinario(null)}
      >
        {registroExtraordinario && (
          <FormularioRegistroDisciplina
            idCadete={registroExtraordinario.id_cadete}
            catalogos={catalogos}
            oficiales={oficiales}
            registro={registroExtraordinario}
            guardando={procesando}
            modoExtraordinario
            cancelar={() => setRegistroExtraordinario(null)}
            guardar={async (datos, justificacion) => {
              if (!justificacion || !detalle) return;
              await ejecutar(
                () =>
                  modificarRegistroExtraordinario(
                    registroExtraordinario.id_registro,
                    {
                      ...(datos as ActualizarRegistroDisciplina),
                      justificacion,
                    },
                  ),
                "Modificación extraordinaria aplicada y auditada.",
              );
              setRegistroExtraordinario(null);
            }}
          />
        )}
      </ModalDisciplina>

      <ModalDisciplina
        abierto={Boolean(acumulado)}
        titulo="Acumulados del curso"
        descripcion="Cálculo en tiempo real con todos los estudiantes del curso."
        cerrar={() => setAcumulado(null)}
        ancho="max-w-5xl"
      >
        {acumulado && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
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
                  <tr key={fila.id_cadete} className="border-b">
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
                          Más de 30
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
      </ModalDisciplina>
    </PaginaProtegidaDisciplina>
  );
}

function TarjetaSemana({
  semana,
  abrir,
}: {
  semana: SemanaDisciplina;
  abrir: () => void;
}) {
  const responsable = semana.ultimo_responsable;
  const etiquetaResponsable =
    semana.nivel_revision_actual === "ENCARGADO_AREA"
      ? "Operador"
      : "Último responsable";
  return (
    <button
      type="button"
      onClick={abrir}
      className="rounded-xl border border-slate-200 p-4 text-left transition hover:border-[#74a892] hover:bg-emerald-50/40"
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-bold uppercase text-slate-500">
            {semana.periodo?.gestion.ano} / {semana.periodo?.periodo}
          </p>
          <h3 className="text-lg font-black">
            {semana.curso?.nombre.replaceAll("_", " ")} · Semana{" "}
            {semana.numero_semana}
          </h3>
        </div>
        <EstadoSemanaBadge estado={semana.estado} />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <NivelRevisionBadge nivel={semana.nivel_revision_actual} />
        <span className="text-xs text-slate-500">
          Versión {semana.version_flujo} · {semana._count?.registros ?? 0}{" "}
          registros
        </span>
      </div>
      <p className="mt-3 text-xs text-slate-500">
        {etiquetaResponsable}:{" "}
        {responsable ? `${responsable.apellidos} ${responsable.nombres}` : "—"}{" "}
        · {fechaLegible(semana.fecha_envio)}
      </p>
    </button>
  );
}

function Numero({ valor }: { valor: string }) {
  return (
    <td className="p-2 text-right font-mono">{Number(valor).toFixed(4)}</td>
  );
}
