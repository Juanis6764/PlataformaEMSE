"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import {
  AvisoDisciplina,
  botonPrimarioDisciplina,
  botonSecundarioDisciplina,
  CargandoDisciplina,
  campoDisciplina,
  EncabezadoDisciplina,
  ModalDisciplina,
  PaginaProtegidaDisciplina,
  tarjetaDisciplina,
  VacioDisciplina,
} from "../../../../../componentes/notas/disciplina/InterfazDisciplina";
import { SelectoresDisciplina } from "../../../../../componentes/notas/disciplina/SelectoresDisciplina";
import {
  actualizarCatalogoDisciplina,
  actualizarConfiguracionDisciplina,
  actualizarOficialDisciplina,
  cambiarEstadoCatalogoDisciplina,
  cambiarEstadoOficialDisciplina,
  crearCatalogoDisciplina,
  crearConfiguracionDisciplina,
  crearOficialDisciplina,
  crearSemanaDisciplina,
  listarCatalogosDisciplina,
  listarConfiguracionesDisciplina,
  listarOficialesDisciplina,
  listarSemanasDisciplina,
  mensajeErrorApi,
  obtenerContextoDisciplina,
} from "../../../../../servicios/notas/disciplina.service";
import {
  notificarSemanasDisciplinaActualizadas,
  suscribirseASemanasDisciplina,
} from "../../../../../servicios/notas/sincronizacion-disciplina";
import {
  CatalogoDisciplina,
  ConfiguracionDisciplina,
  ContextoDisciplina,
  OficialDisciplina,
  SemanaDisciplina,
  TipoDisciplina,
} from "../../../../../tipos/notas/disciplina";

type Pestaña = "SEMANAS" | "OFICIALES" | "DEMERITOS" | "MERITOS";

export default function ConfiguracionDisciplinaPage() {
  const [pestaña, setPestaña] = useState<Pestaña>("SEMANAS");
  const [contexto, setContexto] = useState<ContextoDisciplina | null>(null);
  const [configuraciones, setConfiguraciones] = useState<
    ConfiguracionDisciplina[]
  >([]);
  const [oficiales, setOficiales] = useState<OficialDisciplina[]>([]);
  const [catalogos, setCatalogos] = useState<CatalogoDisciplina[]>([]);
  const [semanas, setSemanas] = useState<SemanaDisciplina[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [exito, setExito] = useState("");
  const [idGestion, setIdGestion] = useState<number | null>(null);
  const [idPeriodo, setIdPeriodo] = useState<number | null>(null);
  const [idCurso, setIdCurso] = useState<number | null>(null);
  const [cantidadSemanas, setCantidadSemanas] = useState("");
  const [buscarOficial, setBuscarOficial] = useState("");
  const [modalOficial, setModalOficial] = useState(false);
  const [oficialEditando, setOficialEditando] =
    useState<OficialDisciplina | null>(null);
  const [modalCatalogo, setModalCatalogo] = useState<TipoDisciplina | null>(
    null,
  );
  const [catalogoEditando, setCatalogoEditando] =
    useState<CatalogoDisciplina | null>(null);

  const cargar = useCallback(async () => {
    setError("");
    try {
      const [
        contextoReal,
        configuracionesReales,
        oficialesReales,
        catalogosReales,
        semanasReales,
      ] = await Promise.all([
        obtenerContextoDisciplina(),
        listarConfiguracionesDisciplina({ solo_activas: false }),
        listarOficialesDisciplina({ solo_activos: false }),
        listarCatalogosDisciplina({ solo_activos: false }),
        listarSemanasDisciplina(),
      ]);
      setContexto(contextoReal);
      setConfiguraciones(configuracionesReales);
      setOficiales(oficialesReales);
      setCatalogos(catalogosReales);
      setSemanas(semanasReales);
      const gestionActiva =
        contextoReal.gestiones.find((gestion) =>
          gestion.periodos.some((periodo) => periodo.activo),
        ) ?? contextoReal.gestiones[0];
      const periodoActivo =
        gestionActiva?.periodos.find((periodo) => periodo.activo) ??
        gestionActiva?.periodos[0];
      setIdGestion((actual) => actual ?? gestionActiva?.id_gestion ?? null);
      setIdPeriodo((actual) => actual ?? periodoActivo?.id_periodo ?? null);
      setIdCurso(
        (actual) => actual ?? contextoReal.cursos[0]?.id_curso ?? null,
      );
    } catch (e) {
      setError(mensajeErrorApi(e));
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => void cargar());
  }, [cargar]);

  const configuracionSeleccionada = configuraciones.find(
    (item) => item.id_periodo === idPeriodo && item.id_curso === idCurso,
  );
  const semanasSeleccionadas = semanas.filter(
    (semana) => semana.id_periodo === idPeriodo && semana.id_curso === idCurso,
  );
  const numerosHabilitados = new Set(
    semanasSeleccionadas.map((semana) => semana.numero_semana),
  );
  const numerosHabilitables = configuracionSeleccionada
    ? Array.from(
        { length: configuracionSeleccionada.cantidad_semanas },
        (_, indice) => indice + 1,
      ).filter(
        (numero) =>
          !numerosHabilitados.has(numero) &&
          (numero === 1 || numerosHabilitados.has(numero - 1)),
      )
    : [];
  useEffect(() => {
    queueMicrotask(() =>
      setCantidadSemanas(
        configuracionSeleccionada?.cantidad_semanas?.toString() ?? "",
      ),
    );
  }, [configuracionSeleccionada]);

  useEffect(
    () =>
      suscribirseASemanasDisciplina(async () => {
        setSemanas(await listarSemanasDisciplina());
      }),
    [],
  );

  const periodoSeleccionado = contexto?.gestiones
    .flatMap((gestion) => gestion.periodos)
    .find((periodo) => periodo.id_periodo === idPeriodo);

  async function ejecutar(accion: () => Promise<unknown>, mensaje: string) {
    setGuardando(true);
    setError("");
    setExito("");
    try {
      await accion();
      setExito(mensaje);
      await cargar();
      return true;
    } catch (e) {
      setError(mensajeErrorApi(e));
      return false;
    } finally {
      setGuardando(false);
    }
  }

  async function guardarSemanas(evento: FormEvent) {
    evento.preventDefault();
    if (!idPeriodo || !idCurso)
      return setError("Seleccione gestión, periodo y curso.");
    const cantidad = Number(cantidadSemanas);
    if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > 22) {
      return setError("La cantidad debe ser un entero entre 1 y 22.");
    }
    const accion = configuracionSeleccionada
      ? () =>
          actualizarConfiguracionDisciplina(
            configuracionSeleccionada.id_configuracion,
            cantidad,
          )
      : () =>
          crearConfiguracionDisciplina({
            id_periodo: idPeriodo,
            id_curso: idCurso,
            cantidad_semanas: cantidad,
          });
    await ejecutar(
      accion,
      configuracionSeleccionada
        ? "Cantidad de semanas actualizada."
        : "Configuración de semanas creada.",
    );
  }

  async function habilitarSemanaSeleccionada(numero: number) {
    if (guardando) return;
    if (!idPeriodo || !idCurso) {
      setError("Seleccione gestión, periodo y curso.");
      return;
    }
    if (!numerosHabilitables.includes(numero)) {
      setError("Seleccione la siguiente semana disponible.");
      return;
    }
    const habilitada = await ejecutar(
      () =>
        crearSemanaDisciplina({
          id_periodo: idPeriodo,
          id_curso: idCurso,
          numero_semana: numero,
        }),
      `Semana ${numero} habilitada. Ya está disponible para el Operador y las consultas autorizadas.`,
    );
    if (habilitada) {
      notificarSemanasDisciplinaActualizadas();
    }
  }

  if (cargando) {
    return (
      <PaginaProtegidaDisciplina permisos={["CONFIGURAR_DISCIPLINA"]}>
        <CargandoDisciplina />
      </PaginaProtegidaDisciplina>
    );
  }

  return (
    <PaginaProtegidaDisciplina permisos={["CONFIGURAR_DISCIPLINA"]}>
      <div className="mx-auto max-w-7xl space-y-5">
        <EncabezadoDisciplina
          titulo="Configuración"
          descripcion="Registre únicamente la configuración, oficiales y catálogos reales que utilizará Disciplina."
        />
        {error && <AvisoDisciplina tipo="error">{error}</AvisoDisciplina>}
        {exito && <AvisoDisciplina tipo="exito">{exito}</AvisoDisciplina>}

        <nav className="flex gap-2 overflow-x-auto rounded-xl border bg-white p-2 shadow-sm">
          {(
            [
              ["SEMANAS", "Semanas"],
              ["OFICIALES", "Oficiales"],
              ["DEMERITOS", "Catálogo de deméritos"],
              ["MERITOS", "Catálogo de méritos"],
            ] as Array<[Pestaña, string]>
          ).map(([valor, etiqueta]) => (
            <button
              key={valor}
              type="button"
              onClick={() => setPestaña(valor)}
              className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-bold transition ${pestaña === valor ? "bg-[#1b4332] text-white" : "text-slate-600 hover:bg-slate-100"}`}
            >
              {etiqueta}
            </button>
          ))}
        </nav>

        {pestaña === "SEMANAS" && contexto && (
          <section className={tarjetaDisciplina}>
            <div className="mb-5">
              <h2 className="text-lg font-bold text-slate-950">
                Semanas por periodo y curso
              </h2>
              <p className="text-sm text-slate-600">
                La cantidad es solo un límite. No se crearán semanas vacías.
              </p>
            </div>
            <form className="space-y-4" onSubmit={guardarSemanas}>
              <SelectoresDisciplina
                contexto={contexto}
                idGestion={idGestion}
                idPeriodo={idPeriodo}
                idCurso={idCurso}
                cambiarGestion={setIdGestion}
                cambiarPeriodo={setIdPeriodo}
                cambiarCurso={setIdCurso}
              />
              <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                <label className="text-sm font-semibold text-slate-700">
                  Cantidad de semanas
                  <input
                    required
                    type="number"
                    min={1}
                    max={22}
                    className={`${campoDisciplina} mt-1`}
                    value={cantidadSemanas}
                    onChange={(evento) =>
                      setCantidadSemanas(evento.target.value)
                    }
                    placeholder="Defina la cantidad real"
                  />
                </label>
                <button
                  disabled={guardando || !periodoSeleccionado?.activo}
                  className={botonPrimarioDisciplina}
                >
                  {guardando
                    ? "Guardando…"
                    : configuracionSeleccionada
                      ? "Actualizar configuración"
                      : "Crear configuración"}
                </button>
              </div>
              {!periodoSeleccionado?.activo && idPeriodo && (
                <AvisoDisciplina tipo="alerta">
                  El periodo está inactivo. Puede consultarlo, pero no crear ni
                  modificar su configuración.
                </AvisoDisciplina>
              )}
              {configuracionSeleccionada && (
                <div className="space-y-4">
                  <AvisoDisciplina tipo="info">
                    Configuración actual:{" "}
                    {configuracionSeleccionada.cantidad_semanas} semanas. Cada
                    semana debe habilitarse manualmente; configurar el límite no
                    la habilita.
                  </AvisoDisciplina>
                  <div>
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <h3 className="font-bold text-slate-950">
                        Habilitación manual
                      </h3>
                      <span className="text-sm text-slate-500">
                        {semanasSeleccionadas.length} habilitadas
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
                      {Array.from(
                        { length: configuracionSeleccionada.cantidad_semanas },
                        (_, indice) => {
                          const numero = indice + 1;
                          const habilitada = semanas.find(
                            (semana) =>
                              semana.id_periodo === idPeriodo &&
                              semana.id_curso === idCurso &&
                              semana.numero_semana === numero,
                          );
                          const esHabilitable =
                            contexto.perfil === "ENCARGADO_DISCIPLINA" &&
                            Boolean(periodoSeleccionado?.activo) &&
                            numerosHabilitables.includes(numero);
                          return habilitada ? (
                            <div
                              key={numero}
                              className="rounded-xl border border-emerald-200 bg-emerald-50 p-3"
                            >
                              <p className="text-xs font-bold text-emerald-700">
                                Semana
                              </p>
                              <p className="text-xl font-black text-slate-950">
                                {numero}
                              </p>
                              <p className="mt-1 text-xs font-bold text-emerald-800">
                                Habilitada ✓
                              </p>
                              <p className="text-[11px] text-slate-500">
                                {habilitada.estado.replace("_", " ")}
                              </p>
                            </div>
                          ) : esHabilitable ? (
                            <button
                              key={numero}
                              type="button"
                              aria-busy={guardando}
                              onClick={() =>
                                void habilitarSemanaSeleccionada(numero)
                              }
                              className="group cursor-pointer rounded-xl border border-dashed border-emerald-400 bg-white p-3 text-left transition hover:-translate-y-0.5 hover:border-emerald-600 hover:bg-emerald-50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
                            >
                              <p className="text-xs font-bold text-emerald-700">
                                Semana
                              </p>
                              <p className="text-xl font-black text-slate-950">
                                {numero}
                              </p>
                              <p className="mt-1 text-xs font-black text-emerald-700 group-hover:text-emerald-900">
                                {guardando
                                  ? "Habilitando…"
                                  : "Habilitar semana"}
                              </p>
                            </button>
                          ) : (
                            <div
                              key={numero}
                              aria-disabled="true"
                              className="cursor-not-allowed rounded-xl border border-dashed border-slate-300 bg-slate-100 p-3 text-left opacity-70"
                            >
                              <p className="text-xs font-bold text-slate-500">
                                Semana
                              </p>
                              <p className="text-xl font-black text-slate-950">
                                {numero}
                              </p>
                              <p className="mt-1 text-xs font-bold text-slate-500">
                                Bloqueada
                              </p>
                            </div>
                          );
                        },
                      )}
                    </div>
                  </div>
                </div>
              )}
            </form>
          </section>
        )}

        {pestaña === "OFICIALES" && (
          <OficialesPanel
            oficiales={oficiales}
            buscar={buscarOficial}
            cambiarBuscar={setBuscarOficial}
            nuevo={() => {
              setOficialEditando(null);
              setModalOficial(true);
            }}
            editar={(oficial) => {
              setOficialEditando(oficial);
              setModalOficial(true);
            }}
            cambiarEstado={(oficial) =>
              void ejecutar(
                () =>
                  cambiarEstadoOficialDisciplina(
                    oficial.id_oficial,
                    !oficial.activo,
                  ),
                oficial.activo ? "Oficial desactivado." : "Oficial reactivado.",
              )
            }
          />
        )}

        {(pestaña === "DEMERITOS" || pestaña === "MERITOS") && (
          <CatalogosPanel
            tipo={pestaña === "DEMERITOS" ? "DEMERITO" : "MERITO"}
            catalogos={catalogos}
            nuevo={(tipo) => {
              setCatalogoEditando(null);
              setModalCatalogo(tipo);
            }}
            editar={(catalogo) => {
              setCatalogoEditando(catalogo);
              setModalCatalogo(catalogo.tipo);
            }}
            cambiarEstado={(catalogo) =>
              void ejecutar(
                () =>
                  cambiarEstadoCatalogoDisciplina(
                    catalogo.id_catalogo,
                    !catalogo.activo,
                  ),
                catalogo.activo
                  ? "Catálogo desactivado."
                  : "Catálogo reactivado.",
              )
            }
          />
        )}
      </div>

      <ModalDisciplina
        abierto={modalOficial}
        titulo={oficialEditando ? "Editar oficial" : "Registrar oficial"}
        descripcion="Use un único campo para el nombre completo institucional."
        cerrar={() => setModalOficial(false)}
      >
        <FormularioOficial
          oficial={oficialEditando}
          guardando={guardando}
          cancelar={() => setModalOficial(false)}
          guardar={async (datos) => {
            const guardado = await ejecutar(
              () =>
                oficialEditando
                  ? actualizarOficialDisciplina(
                      oficialEditando.id_oficial,
                      datos,
                    )
                  : crearOficialDisciplina(datos),
              oficialEditando ? "Oficial actualizado." : "Oficial registrado.",
            );
            if (guardado) setModalOficial(false);
          }}
        />
      </ModalDisciplina>

      <ModalDisciplina
        abierto={Boolean(modalCatalogo)}
        titulo={catalogoEditando ? "Editar catálogo" : "Registrar catálogo"}
        cerrar={() => setModalCatalogo(null)}
      >
        {modalCatalogo && (
          <FormularioCatalogo
            tipo={modalCatalogo}
            catalogo={catalogoEditando}
            guardando={guardando}
            cancelar={() => setModalCatalogo(null)}
            guardar={async (datos) => {
              const guardado = await ejecutar(
                () =>
                  catalogoEditando
                    ? actualizarCatalogoDisciplina(
                        catalogoEditando.id_catalogo,
                        datos,
                      )
                    : crearCatalogoDisciplina(datos),
                catalogoEditando
                  ? "Catálogo actualizado."
                  : "Catálogo registrado.",
              );
              if (guardado) setModalCatalogo(null);
            }}
          />
        )}
      </ModalDisciplina>
    </PaginaProtegidaDisciplina>
  );
}

function OficialesPanel({
  oficiales,
  buscar,
  cambiarBuscar,
  nuevo,
  editar,
  cambiarEstado,
}: {
  oficiales: OficialDisciplina[];
  buscar: string;
  cambiarBuscar: (valor: string) => void;
  nuevo: () => void;
  editar: (oficial: OficialDisciplina) => void;
  cambiarEstado: (oficial: OficialDisciplina) => void;
}) {
  const termino = buscar.toLocaleLowerCase("es").trim();
  const filtrados = oficiales.filter((oficial) =>
    `${oficial.codigo} ${oficial.nombre_completo}`
      .toLocaleLowerCase("es")
      .includes(termino),
  );
  return (
    <section className={tarjetaDisciplina}>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold">Oficiales e instructores</h2>
          <p className="text-sm text-slate-600">
            {oficiales.length} registros reales.
          </p>
        </div>
        <button className={botonPrimarioDisciplina} onClick={nuevo}>
          Registrar oficial
        </button>
      </div>
      <input
        className={campoDisciplina}
        value={buscar}
        onChange={(e) => cambiarBuscar(e.target.value)}
        placeholder="Buscar por código o nombre completo"
      />
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {filtrados.map((oficial) => (
          <article key={oficial.id_oficial} className="rounded-xl border p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="font-mono text-xs font-black text-[#2d6a4f]">
                  {oficial.codigo}
                </span>
                <h3 className="font-bold text-slate-950">
                  {oficial.nombre_completo}
                </h3>
                <p
                  className={`mt-1 text-xs font-semibold ${oficial.activo ? "text-emerald-700" : "text-slate-500"}`}
                >
                  {oficial.activo ? "Activo" : "Inactivo"}
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <button
                  className={botonSecundarioDisciplina}
                  onClick={() => editar(oficial)}
                >
                  Editar
                </button>
                <button
                  className={botonSecundarioDisciplina}
                  onClick={() => cambiarEstado(oficial)}
                >
                  {oficial.activo ? "Desactivar" : "Reactivar"}
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
      {filtrados.length === 0 && (
        <VacioDisciplina
          titulo="Sin oficiales"
          descripcion="Registre manualmente el primer oficial o cambie la búsqueda."
        />
      )}
    </section>
  );
}

function CatalogosPanel({
  tipo,
  catalogos,
  nuevo,
  editar,
  cambiarEstado,
}: {
  tipo: TipoDisciplina;
  catalogos: CatalogoDisciplina[];
  nuevo: (tipo: TipoDisciplina) => void;
  editar: (catalogo: CatalogoDisciplina) => void;
  cambiarEstado: (catalogo: CatalogoDisciplina) => void;
}) {
  const filas = catalogos.filter((catalogo) => catalogo.tipo === tipo);
  return (
    <section className={tarjetaDisciplina}>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold">
            Catálogo de {tipo === "MERITO" ? "méritos" : "deméritos"}
          </h2>
          <p className="text-sm text-slate-600">
            {tipo === "MERITO"
              ? "El puntaje se asignará en cada registro."
              : "Cada elemento conserva un puntaje fijo de 1 a 10."}
          </p>
        </div>
        <button className={botonPrimarioDisciplina} onClick={() => nuevo(tipo)}>
          Registrar {tipo === "MERITO" ? "mérito" : "demérito"}
        </button>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        {filas.map((catalogo) => (
          <article key={catalogo.id_catalogo} className="rounded-xl border p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="font-mono text-xs font-black text-[#2d6a4f]">
                  {catalogo.codigo}
                </span>
                <h3 className="font-bold text-slate-950">{catalogo.nombre}</h3>
                <p
                  className={`mt-1 text-xs font-semibold ${catalogo.activo ? "text-emerald-700" : "text-slate-500"}`}
                >
                  {catalogo.activo ? "Activo" : "Inactivo"}
                </p>
              </div>
              {catalogo.puntaje_base && (
                <PuntajeIntensidad puntaje={catalogo.puntaje_base} />
              )}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                className={botonSecundarioDisciplina}
                onClick={() => editar(catalogo)}
              >
                Editar
              </button>
              <button
                className={botonSecundarioDisciplina}
                onClick={() => cambiarEstado(catalogo)}
              >
                {catalogo.activo ? "Desactivar" : "Reactivar"}
              </button>
            </div>
          </article>
        ))}
      </div>
      {filas.length === 0 && (
        <VacioDisciplina
          titulo={`Sin ${tipo === "MERITO" ? "méritos" : "deméritos"}`}
          descripcion="El catálogo está vacío y espera registros reales."
        />
      )}
    </section>
  );
}

function PuntajeIntensidad({ puntaje }: { puntaje: string }) {
  const valor = Math.max(1, Math.min(10, Number(puntaje)));
  const clases = [
    "bg-amber-50 text-amber-800",
    "bg-amber-100 text-amber-800",
    "bg-amber-200 text-amber-900",
    "bg-orange-200 text-orange-900",
    "bg-orange-300 text-orange-950",
    "bg-orange-400 text-orange-950",
    "bg-red-300 text-red-950",
    "bg-red-400 text-white",
    "bg-red-500 text-white",
    "bg-red-600 text-white",
  ];
  return (
    <span
      className={`rounded-xl px-3 py-2 font-mono text-lg font-black ${clases[valor - 1]}`}
    >
      {Number(puntaje).toFixed(4)}
    </span>
  );
}

function FormularioOficial({
  oficial,
  guardando,
  guardar,
  cancelar,
}: {
  oficial: OficialDisciplina | null;
  guardando: boolean;
  guardar: (datos: {
    codigo: string;
    nombre_completo: string;
  }) => Promise<void>;
  cancelar: () => void;
}) {
  const [codigo, setCodigo] = useState(oficial?.codigo ?? "");
  const [nombre, setNombre] = useState(oficial?.nombre_completo ?? "");
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        void guardar({ codigo: codigo.trim(), nombre_completo: nombre.trim() });
      }}
    >
      <label className="block text-sm font-semibold">
        Código
        <input
          required
          maxLength={30}
          className={`${campoDisciplina} mt-1`}
          value={codigo}
          onChange={(e) => setCodigo(e.target.value)}
          placeholder="P001"
        />
      </label>
      <label className="block text-sm font-semibold">
        Nombre completo institucional
        <input
          required
          maxLength={200}
          className={`${campoDisciplina} mt-1`}
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Cnl. DAEN. Nombre completo"
        />
      </label>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          className={botonSecundarioDisciplina}
          onClick={cancelar}
        >
          Cancelar
        </button>
        <button disabled={guardando} className={botonPrimarioDisciplina}>
          {guardando ? "Guardando…" : "Guardar"}
        </button>
      </div>
    </form>
  );
}

function FormularioCatalogo({
  tipo,
  catalogo,
  guardando,
  guardar,
  cancelar,
}: {
  tipo: TipoDisciplina;
  catalogo: CatalogoDisciplina | null;
  guardando: boolean;
  guardar: (datos: {
    tipo: TipoDisciplina;
    codigo: string;
    nombre: string;
    puntaje_base?: string;
  }) => Promise<void>;
  cancelar: () => void;
}) {
  const [codigo, setCodigo] = useState(catalogo?.codigo ?? "");
  const [nombre, setNombre] = useState(catalogo?.nombre ?? "");
  const [puntaje, setPuntaje] = useState(
    catalogo?.puntaje_base ? String(Number(catalogo.puntaje_base)) : "",
  );
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        void guardar({
          tipo,
          codigo: codigo.trim(),
          nombre: nombre.trim(),
          puntaje_base: tipo === "DEMERITO" ? puntaje : undefined,
        });
      }}
    >
      <label className="block text-sm font-semibold">
        Código
        <input
          required
          maxLength={30}
          className={`${campoDisciplina} mt-1`}
          value={codigo}
          onChange={(e) => setCodigo(e.target.value)}
        />
      </label>
      <label className="block text-sm font-semibold">
        Nombre
        <input
          required
          maxLength={200}
          className={`${campoDisciplina} mt-1`}
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
        />
      </label>
      {tipo === "DEMERITO" && (
        <label className="block text-sm font-semibold">
          Puntaje fijo
          <input
            required
            type="number"
            min={1}
            max={10}
            step={1}
            className={`${campoDisciplina} mt-1`}
            value={puntaje}
            onChange={(e) => setPuntaje(e.target.value)}
          />
        </label>
      )}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          className={botonSecundarioDisciplina}
          onClick={cancelar}
        >
          Cancelar
        </button>
        <button disabled={guardando} className={botonPrimarioDisciplina}>
          {guardando ? "Guardando…" : "Guardar"}
        </button>
      </div>
    </form>
  );
}
