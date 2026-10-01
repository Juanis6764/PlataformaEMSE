"use client";

import { useCallback, useEffect, useState } from "react";
import AccesoRestringido from "../../seguridad/AccesoRestringido";
import {
  modificarResultadoFinalDisciplinaExtraordinario,
} from "../../../servicios/notas/disciplina.service";
import { modificarNotaExtraordinariaEntrenamiento } from "../../../servicios/notas/entrenamiento-fisico.service";
import {
  mensajeErrorApi,
  modificarNotaExtraordinariaEvaluacion,
  obtenerContextoEvaluaciones,
} from "../../../servicios/notas/evaluaciones.service";
import { buscarCorreccionesExtraordinarias } from "../../../servicios/notas/matriz-academica.service";
import { ContextoEvaluaciones } from "../../../tipos/notas/evaluaciones";
import {
  AuditoriaCorreccionNota,
  EstudianteCorreccionExtraordinaria,
  ExpedienteCorreccionExtraordinaria,
} from "../../../tipos/notas/matriz-academica";
import {
  AvisoEvaluaciones,
  botonPrimarioEvaluaciones,
  botonSecundarioEvaluaciones,
  CargandoEvaluaciones,
  campoEvaluaciones,
  EncabezadoEvaluaciones,
  ModalEvaluaciones,
  PaginaProtegidaEvaluaciones,
  tarjetaEvaluaciones,
  VacioEvaluaciones,
} from "./InterfazEvaluaciones";
import { SelectoresEvaluaciones } from "./SelectoresEvaluaciones";

const PATRON_NOTA = /^(?:100(?:\.0{1,4})?|\d{1,2}(?:\.\d{1,4})?)$/;

type CorreccionSeleccionada = {
  area: "EVALUACIONES" | "ENTRENAMIENTO_FISICO" | "DISCIPLINA";
  id: number;
  concepto: string;
  notaAnterior: string;
};

export default function CorreccionExtraordinariaNotas() {
  const [contexto, setContexto] = useState<ContextoEvaluaciones | null>(null);
  const [idGestion, setIdGestion] = useState<number | null>(null);
  const [idPeriodo, setIdPeriodo] = useState<number | null>(null);
  const [idCurso, setIdCurso] = useState<number | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [expediente, setExpediente] =
    useState<ExpedienteCorreccionExtraordinaria | null>(null);
  const [estudiante, setEstudiante] =
    useState<EstudianteCorreccionExtraordinaria | null>(null);
  const [correccion, setCorreccion] =
    useState<CorreccionSeleccionada | null>(null);
  const [nuevaNota, setNuevaNota] = useState("");
  const [justificacion, setJustificacion] = useState("");
  const [auditoria, setAuditoria] = useState<AuditoriaCorreccionNota[] | null>(
    null,
  );
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState("");
  const [exito, setExito] = useState("");

  const cargarContexto = useCallback(async () => {
    try {
      const real = await obtenerContextoEvaluaciones();
      setContexto(real);
      const gestion =
        real.gestiones.find((item) => item.periodos.some((p) => p.activo)) ??
        real.gestiones[0];
      setIdGestion(gestion?.id_gestion ?? null);
      setIdPeriodo(
        gestion?.periodos.find((periodo) => periodo.activo)?.id_periodo ??
          gestion?.periodos[0]?.id_periodo ??
          null,
      );
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

  async function buscar(idCadeteSeleccionado?: number) {
    if (!idGestion || !idPeriodo || !idCurso) {
      setError("Seleccione gestión, periodo y curso.");
      return;
    }
    setProcesando(true);
    setError("");
    try {
      const resultado = await buscarCorreccionesExtraordinarias({
        id_gestion: idGestion,
        id_periodo: idPeriodo,
        id_curso: idCurso,
        q: busqueda.trim() || undefined,
      });
      setExpediente(resultado);
      const seleccionado = idCadeteSeleccionado
        ? resultado.estudiantes.find(
            (item) => item.id_cadete === idCadeteSeleccionado,
          )
        : undefined;
      setEstudiante(seleccionado ?? null);
    } catch (e) {
      setError(mensajeErrorApi(e));
    } finally {
      setProcesando(false);
    }
  }

  function abrirCorreccion(seleccion: CorreccionSeleccionada) {
    setCorreccion(seleccion);
    setNuevaNota(seleccion.notaAnterior);
    setJustificacion("");
    setError("");
  }

  async function confirmarCorreccion() {
    if (!correccion || !estudiante) return;
    const nota = nuevaNota.trim().replace(",", ".");
    const motivo = justificacion.trim();
    if (!PATRON_NOTA.test(nota)) {
      setError("La nota debe estar entre 0.0000 y 100.0000, con hasta cuatro decimales.");
      return;
    }
    if (!motivo) {
      setError("El motivo de la modificación es obligatorio.");
      return;
    }
    setProcesando(true);
    setError("");
    setExito("");
    try {
      if (correccion.area === "EVALUACIONES") {
        await modificarNotaExtraordinariaEvaluacion(correccion.id, {
          nota_inicial: nota,
          nota_desquite: null,
          justificacion: motivo,
        });
      } else if (correccion.area === "ENTRENAMIENTO_FISICO") {
        await modificarNotaExtraordinariaEntrenamiento(
          correccion.id,
          nota,
          motivo,
        );
      } else {
        await modificarResultadoFinalDisciplinaExtraordinario(
          correccion.id,
          nota,
          motivo,
        );
      }
      const idCadete = estudiante.id_cadete;
      setCorreccion(null);
      setExito(
        "Corrección extraordinaria aplicada. La fuente, la matriz y el orden de mérito fueron recalculados.",
      );
      await buscar(idCadete);
    } catch (e) {
      setError(mensajeErrorApi(e));
    } finally {
      setProcesando(false);
    }
  }

  if (cargando) {
    return (
      <PaginaProtegidaEvaluaciones permisos={["MODIFICAR_NOTA_BLOQUEADA"]}>
        <CargandoEvaluaciones />
      </PaginaProtegidaEvaluaciones>
    );
  }
  if (
    !contexto ||
    !["JEFE_ESTUDIOS", "SECCION_ACADEMICA", "COMANDO"].includes(
      contexto.perfil,
    )
  ) {
    return <AccesoRestringido />;
  }

  return (
    <PaginaProtegidaEvaluaciones permisos={["MODIFICAR_NOTA_BLOQUEADA"]}>
      <div className="mx-auto max-w-[110rem] space-y-5">
        <EncabezadoEvaluaciones
          titulo="Corrección extraordinaria de notas"
          descripcion="Consulta una cohorte histórica y corrige exclusivamente la fuente oficial. Cada cambio exige motivo, queda auditado y recalcula las matrices existentes."
        />
        {error && <AvisoEvaluaciones tipo="error">{error}</AvisoEvaluaciones>}
        {exito && <AvisoEvaluaciones tipo="exito">{exito}</AvisoEvaluaciones>}

        <section className={tarjetaEvaluaciones}>
          <div className="space-y-4">
            <SelectoresEvaluaciones
              contexto={contexto}
              idGestion={idGestion}
              idPeriodo={idPeriodo}
              idCurso={idCurso}
              cambiarGestion={(id) => {
                setIdGestion(id);
                setExpediente(null);
                setEstudiante(null);
              }}
              cambiarPeriodo={(id) => {
                setIdPeriodo(id);
                setExpediente(null);
                setEstudiante(null);
              }}
              cambiarCurso={(id) => {
                setIdCurso(id);
                setExpediente(null);
                setEstudiante(null);
              }}
            />
            <div className="flex flex-col gap-3 md:flex-row md:items-end">
              <label className="flex-1 text-sm font-semibold text-slate-700">
                CI, nombres o apellidos
                <input
                  className={`${campoEvaluaciones} mt-1`}
                  value={busqueda}
                  onChange={(evento) => setBusqueda(evento.target.value)}
                  onKeyDown={(evento) => {
                    if (evento.key === "Enter") void buscar();
                  }}
                  placeholder="Buscar estudiante"
                />
              </label>
              <button
                type="button"
                className={botonPrimarioEvaluaciones}
                disabled={procesando || !idGestion || !idPeriodo || !idCurso}
                onClick={() => void buscar()}
              >
                {procesando ? "Consultando…" : "Buscar estudiante"}
              </button>
            </div>
          </div>
        </section>

        {expediente && (
          <section className={tarjetaEvaluaciones}>
            <h2 className="text-lg font-black text-slate-950">
              Estudiantes encontrados
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              {expediente.curso.replaceAll("_", " ")} · {expediente.periodo}/
              {expediente.gestion}
            </p>
            {expediente.estudiantes.length === 0 ? (
              <div className="mt-4">
                <VacioEvaluaciones
                  titulo="Sin resultados"
                  descripcion="No existen fuentes oficiales para el filtro seleccionado."
                />
              </div>
            ) : (
              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {expediente.estudiantes.map((item) => (
                  <button
                    key={item.id_cadete}
                    type="button"
                    onClick={() => setEstudiante(item)}
                    className={`rounded-xl border p-4 text-left transition ${
                      estudiante?.id_cadete === item.id_cadete
                        ? "border-emerald-600 bg-emerald-50 ring-2 ring-emerald-100"
                        : "border-slate-200 hover:border-emerald-300"
                    }`}
                  >
                    <p className="font-black text-slate-950">
                      {item.apellidos} {item.nombres}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">CI: {item.ci}</p>
                  </button>
                ))}
              </div>
            )}
          </section>
        )}

        {estudiante && (
          <ExpedienteEstudiante
            estudiante={estudiante}
            corregir={abrirCorreccion}
            verAuditoria={setAuditoria}
          />
        )}
      </div>

      <ModalEvaluaciones
        abierto={Boolean(correccion)}
        titulo="CORRECCIÓN EXTRAORDINARIA"
        descripcion="La fuente oficial y cualquier matriz existente se actualizarán de forma controlada."
        cerrar={() => setCorreccion(null)}
      >
        {correccion && estudiante && (
          <div className="space-y-4">
            <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
              <p><strong>Estudiante:</strong> {estudiante.apellidos} {estudiante.nombres}</p>
              <p><strong>Área:</strong> {correccion.area.replaceAll("_", " ")}</p>
              <p><strong>Materia/Concepto:</strong> {correccion.concepto}</p>
              <p><strong>Nota anterior:</strong> {correccion.notaAnterior}</p>
            </div>
            <label className="block text-sm font-semibold text-slate-700">
              Nota nueva
              <input
                className={`${campoEvaluaciones} mt-1`}
                inputMode="decimal"
                value={nuevaNota}
                onChange={(evento) => setNuevaNota(evento.target.value)}
              />
            </label>
            <label className="block text-sm font-semibold text-slate-700">
              Motivo de la modificación
              <textarea
                required
                maxLength={1000}
                className={`${campoEvaluaciones} mt-1 min-h-28`}
                value={justificacion}
                onChange={(evento) => setJustificacion(evento.target.value)}
              />
            </label>
            <div className="flex justify-end gap-2">
              <button type="button" className={botonSecundarioEvaluaciones} onClick={() => setCorreccion(null)}>
                Cancelar
              </button>
              <button
                type="button"
                className={botonPrimarioEvaluaciones}
                disabled={procesando || !justificacion.trim()}
                onClick={() => void confirmarCorreccion()}
              >
                Confirmar corrección
              </button>
            </div>
          </div>
        )}
      </ModalEvaluaciones>

      <ModalEvaluaciones
        abierto={Boolean(auditoria)}
        titulo="Auditoría de la nota"
        descripcion="Historial registrado en AuditoriaAccion."
        cerrar={() => setAuditoria(null)}
      >
        <div className="space-y-3">
          {(auditoria ?? []).map((item) => (
            <article key={item.id_auditoria} className="rounded-xl border border-slate-200 p-4 text-sm">
              <p><strong>Nota anterior:</strong> {item.valor_anterior ?? "—"}</p>
              <p><strong>Nota actual:</strong> {item.valor_nuevo ?? "—"}</p>
              <p><strong>Modificado por:</strong> {item.usuario}{item.rol ? ` · ${item.rol.replaceAll("_", " ")}` : ""}</p>
              <p><strong>Fecha:</strong> {new Date(item.fecha).toLocaleString("es-BO")}</p>
              <p><strong>Motivo:</strong> {item.justificacion ?? "—"}</p>
            </article>
          ))}
        </div>
      </ModalEvaluaciones>
    </PaginaProtegidaEvaluaciones>
  );
}

function ExpedienteEstudiante({
  estudiante,
  corregir,
  verAuditoria,
}: {
  estudiante: EstudianteCorreccionExtraordinaria;
  corregir: (seleccion: CorreccionSeleccionada) => void;
  verAuditoria: (auditoria: AuditoriaCorreccionNota[]) => void;
}) {
  return (
    <section className={tarjetaEvaluaciones}>
      <h2 className="text-xl font-black text-slate-950">
        {estudiante.apellidos} {estudiante.nombres}
      </h2>
      <p className="text-sm text-slate-600">CI: {estudiante.ci}</p>

      <div className="mt-5 grid gap-5 xl:grid-cols-3">
        <AreaNotas titulo="Evaluaciones">
          {estudiante.evaluaciones.map((nota) => (
            <NotaCorregible
              key={nota.id_nota}
              concepto={nota.materia}
              nota={nota.nota_actual}
              estado={nota.estado}
              corregible={nota.corregible}
              corregida={nota.corregida}
              auditoria={nota.auditoria}
              corregir={() =>
                corregir({
                  area: "EVALUACIONES",
                  id: nota.id_nota,
                  concepto: nota.materia,
                  notaAnterior: nota.nota_actual,
                })
              }
              verAuditoria={verAuditoria}
            />
          ))}
        </AreaNotas>
        <AreaNotas titulo="Entrenamiento Físico">
          {estudiante.entrenamiento_fisico.map((nota) => (
            <NotaCorregible
              key={nota.id_nota}
              concepto="Nota final de Entrenamiento Físico"
              nota={nota.nota_actual}
              estado={nota.estado}
              corregible={nota.corregible}
              corregida={nota.corregida}
              auditoria={nota.auditoria}
              corregir={() =>
                corregir({
                  area: "ENTRENAMIENTO_FISICO",
                  id: nota.id_nota!,
                  concepto: "Nota final de Entrenamiento Físico",
                  notaAnterior: nota.nota_actual!,
                })
              }
              verAuditoria={verAuditoria}
            />
          ))}
        </AreaNotas>
        <AreaNotas titulo="Disciplina">
          {estudiante.disciplina.map((nota) => (
            <NotaCorregible
              key={nota.id_resultado}
              concepto="Nota final oficial de Disciplina"
              nota={nota.nota_actual}
              corregible={nota.corregible}
              corregida={nota.corregida}
              auditoria={nota.auditoria}
              corregir={() =>
                corregir({
                  area: "DISCIPLINA",
                  id: nota.id_resultado!,
                  concepto: "Nota final oficial de Disciplina",
                  notaAnterior: nota.nota_actual!,
                })
              }
              verAuditoria={verAuditoria}
            />
          ))}
        </AreaNotas>
      </div>

      <div className="mt-6">
        <h3 className="text-lg font-black text-slate-950">Matrices existentes</h3>
        {estudiante.matrices.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">No existe una matriz persistida para esta selección.</p>
        ) : (
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            {estudiante.matrices.map((matriz) => (
              <article key={matriz.id_matriz} className="rounded-xl border border-slate-200 p-4 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-black">Matriz {matriz.tipo.toLowerCase()} · {matriz.periodo}</p>
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold">{matriz.estado.replaceAll("_", " ")}</span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-slate-700 sm:grid-cols-4">
                  <p>Promedio: <strong>{matriz.promedio_general}</strong></p>
                  <p>Aplazos: <strong>{matriz.cantidad_aplazos}</strong></p>
                  <p>Atributo: <strong>{matriz.atributo}</strong></p>
                  <p>Orden: <strong>{matriz.orden_merito}</strong></p>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function AreaNotas({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-3 text-base font-black text-slate-950">{titulo}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function NotaCorregible({
  concepto,
  nota,
  estado,
  corregible,
  corregida,
  auditoria,
  corregir,
  verAuditoria,
}: {
  concepto: string;
  nota: string | null;
  estado?: string;
  corregible: boolean;
  corregida: boolean;
  auditoria: AuditoriaCorreccionNota[];
  corregir: () => void;
  verAuditoria: (auditoria: AuditoriaCorreccionNota[]) => void;
}) {
  return (
    <article className="rounded-xl border border-slate-200 p-3 text-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-bold text-slate-900">{concepto}</p>
          {estado && <p className="text-xs text-slate-500">{estado.replaceAll("_", " ")}</p>}
        </div>
        <p className="font-mono text-base font-black">{nota ?? "—"}</p>
      </div>
      {corregida && (
        <p className="mt-2 text-xs font-bold text-amber-700">Nota corregida</p>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        {corregible && nota !== null && (
          <button type="button" className={botonPrimarioEvaluaciones} onClick={corregir}>
            Corregir
          </button>
        )}
        {auditoria.length > 0 && (
          <button type="button" className={botonSecundarioEvaluaciones} onClick={() => verAuditoria(auditoria)}>
            Ver auditoría
          </button>
        )}
      </div>
    </article>
  );
}
