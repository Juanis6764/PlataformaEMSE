"use client";

import { useMemo, useState } from "react";
import {
  RegistroDisciplina,
  SemanaDetalleDisciplina,
} from "../../../tipos/notas/disciplina";
import {
  botonSecundarioDisciplina,
  campoDisciplina,
  EstadoSemanaBadge,
  fechaLegible,
  NivelRevisionBadge,
  VacioDisciplina,
} from "./InterfazDisciplina";

export default function DetalleSemanaDisciplina({
  semana,
  permitirExtraordinaria = false,
  modificarExtraordinariamente,
}: {
  semana: SemanaDetalleDisciplina;
  permitirExtraordinaria?: boolean;
  modificarExtraordinariamente?: (registro: RegistroDisciplina) => void;
}) {
  const [buscar, setBuscar] = useState("");
  const [cadeteSeleccionado, setCadeteSeleccionado] = useState<number | null>(
    null,
  );
  const registrosPorCadete = useMemo(() => {
    const mapa = new Map<number, RegistroDisciplina[]>();
    for (const registro of semana.registros) {
      const filas = mapa.get(registro.id_cadete) ?? [];
      filas.push(registro);
      mapa.set(registro.id_cadete, filas);
    }
    return mapa;
  }, [semana.registros]);
  const termino = buscar.trim().toLocaleLowerCase("es");
  const cadetes = semana.cadetes.filter((cadete) => {
    const texto =
      `${cadete.usuario.ci} ${cadete.usuario.nombres} ${cadete.usuario.apellidos}`.toLocaleLowerCase(
        "es",
      );
    return !termino || texto.includes(termino);
  });
  const seleccion = semana.cadetes.find(
    (cadete) => cadete.id_cadete === cadeteSeleccionado,
  );
  const registrosSeleccionados = cadeteSeleccionado
    ? (registrosPorCadete.get(cadeteSeleccionado) ?? [])
    : [];

  return (
    <div className="space-y-4">
      <div className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <Dato label="Gestión / periodo">
          {semana.periodo?.gestion.ano ?? "—"} /{" "}
          {semana.periodo?.periodo ?? "—"}
        </Dato>
        <Dato label="Curso">
          {semana.curso?.nombre.replaceAll("_", " ") ?? "—"}
        </Dato>
        <Dato label="Semana">N.º {semana.numero_semana}</Dato>
        <Dato label="Versión">{semana.version_flujo}</Dato>
        <Dato label="Estado">
          <EstadoSemanaBadge estado={semana.estado} />
        </Dato>
        <Dato label="Nivel">
          <NivelRevisionBadge nivel={semana.nivel_revision_actual} />
        </Dato>
        <Dato label="Creador">
          {semana.creador
            ? `${semana.creador.apellidos} ${semana.creador.nombres}`
            : "—"}
        </Dato>
        <Dato label="Fecha de envío">{fechaLegible(semana.fecha_envio)}</Dato>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(280px,0.8fr)_minmax(0,1.2fr)]">
        <section className="rounded-xl border border-slate-200 bg-white p-3">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="font-bold text-slate-900">Estudiantes del curso</h3>
            <span className="text-xs font-semibold text-slate-500">
              {semana.cadetes.length}
            </span>
          </div>
          <input
            className={campoDisciplina}
            value={buscar}
            onChange={(evento) => setBuscar(evento.target.value)}
            placeholder="Buscar por CI o nombre"
          />
          <div className="mt-3 max-h-[28rem] space-y-2 overflow-y-auto pr-1">
            {cadetes.map((cadete) => {
              const cantidad =
                registrosPorCadete.get(cadete.id_cadete)?.length ?? 0;
              const activo = cadete.id_cadete === cadeteSeleccionado;
              return (
                <button
                  key={cadete.id_cadete}
                  type="button"
                  onClick={() => setCadeteSeleccionado(cadete.id_cadete)}
                  className={`w-full rounded-lg border p-3 text-left transition ${activo ? "border-[#2d6a4f] bg-emerald-50 ring-2 ring-emerald-100" : "border-slate-200 hover:bg-slate-50"}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-bold text-slate-900">
                        {cadete.usuario.apellidos} {cadete.usuario.nombres}
                      </p>
                      <p className="text-xs text-slate-500">
                        CI {cadete.usuario.ci}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2 py-1 text-[11px] font-bold ${cantidad ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}`}
                    >
                      {cantidad} registro{cantidad === 1 ? "" : "s"}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4">
          {!seleccion ? (
            <VacioDisciplina
              titulo="Seleccione un estudiante"
              descripcion="Abra un estudiante para revisar sus registros reales de esta semana."
            />
          ) : (
            <div className="space-y-3">
              <div>
                <h3 className="text-lg font-bold text-slate-950">
                  {seleccion.usuario.apellidos} {seleccion.usuario.nombres}
                </h3>
                <p className="text-sm text-slate-500">
                  CI {seleccion.usuario.ci}
                </p>
              </div>
              {registrosSeleccionados.length === 0 ? (
                <VacioDisciplina
                  titulo="Sin registros"
                  descripcion="Este estudiante no tiene méritos ni deméritos en la semana."
                />
              ) : (
                registrosSeleccionados.map((registro) => (
                  <article
                    key={registro.id_registro}
                    className={`rounded-xl border p-4 ${registro.catalogo.tipo === "DEMERITO" ? "border-red-200 bg-red-50/50" : "border-emerald-200 bg-emerald-50/50"}`}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <span
                          className={`text-xs font-black uppercase tracking-wider ${registro.catalogo.tipo === "DEMERITO" ? "text-red-700" : "text-emerald-700"}`}
                        >
                          {registro.catalogo.tipo}
                        </span>
                        <h4 className="font-bold text-slate-950">
                          {registro.catalogo.codigo} ·{" "}
                          {registro.catalogo.nombre}
                        </h4>
                        {registro.catalogo.tipo === "DEMERITO" && (
                          <p className="mt-1 text-sm text-slate-600">
                            {registro.fecha_hecho?.slice(0, 10)} · Responsable:{" "}
                            {registro.oficial?.nombre_completo ??
                              registro.nombre_responsable_manual}
                          </p>
                        )}
                        {registro.observacion && (
                          <p className="mt-2 rounded-lg bg-white/80 p-2 text-sm text-slate-700">
                            {registro.observacion}
                          </p>
                        )}
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-2">
                        <span className="font-mono text-lg font-black text-slate-950">
                          {registro.puntaje}
                        </span>
                        {permitirExtraordinaria &&
                          modificarExtraordinariamente && (
                            <button
                              type="button"
                              className={botonSecundarioDisciplina}
                              onClick={() =>
                                modificarExtraordinariamente(registro)
                              }
                            >
                              Modificar con justificación
                            </button>
                          )}
                      </div>
                    </div>
                  </article>
                ))
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function Dato({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
        {label}
      </p>
      <div className="mt-1 text-sm font-semibold text-slate-900">
        {children}
      </div>
    </div>
  );
}
