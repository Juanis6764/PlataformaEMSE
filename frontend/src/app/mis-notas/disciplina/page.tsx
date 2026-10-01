"use client";

import { useEffect, useState } from "react";
import {
  AvisoDisciplina,
  CargandoDisciplina,
  campoDisciplina,
  EncabezadoDisciplina,
  PaginaProtegidaDisciplina,
  tarjetaDisciplina,
  VacioDisciplina,
} from "../../../componentes/notas/disciplina/InterfazDisciplina";
import {
  listarMisGestionesDisciplina,
  listarMisRegistrosDisciplina,
  mensajeErrorApi,
} from "../../../servicios/notas/disciplina.service";
import {
  GestionCadeteDisciplina,
  RegistroPublicadoCadete,
} from "../../../tipos/notas/disciplina";

export default function MisRegistrosDisciplinaPage() {
  const [gestiones, setGestiones] = useState<GestionCadeteDisciplina[]>([]);
  const [idGestion, setIdGestion] = useState<number | null>(null);
  const [idPeriodo, setIdPeriodo] = useState<number | null>(null);
  const [registros, setRegistros] = useState<RegistroPublicadoCadete[]>([]);
  const [cargando, setCargando] = useState(true);
  const [consultando, setConsultando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void listarMisGestionesDisciplina()
      .then((reales) => {
        setGestiones(reales);
        setIdGestion(reales[0]?.id_gestion ?? null);
        setIdPeriodo(reales[0]?.periodos[0]?.id_periodo ?? null);
      })
      .catch((e) => setError(mensajeErrorApi(e)))
      .finally(() => setCargando(false));
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      if (!idGestion) {
        setRegistros([]);
        return;
      }
      setConsultando(true);
      setError("");
      void listarMisRegistrosDisciplina({
        id_gestion: idGestion,
        id_periodo: idPeriodo ?? undefined,
      })
        .then(setRegistros)
        .catch((e) => setError(mensajeErrorApi(e)))
        .finally(() => setConsultando(false));
    });
  }, [idGestion, idPeriodo]);

  const gestion = gestiones.find((item) => item.id_gestion === idGestion);

  if (cargando) {
    return (
      <PaginaProtegidaDisciplina soloCadete>
        <CargandoDisciplina />
      </PaginaProtegidaDisciplina>
    );
  }

  return (
    <PaginaProtegidaDisciplina soloCadete>
      <div className="mx-auto max-w-6xl space-y-5">
        <EncabezadoDisciplina
          titulo="Mi Disciplina"
          descripcion="Aquí se muestran exclusivamente sus méritos y deméritos publicados."
        />
        {error && <AvisoDisciplina tipo="error">{error}</AvisoDisciplina>}

        {gestiones.length === 0 ? (
          <VacioDisciplina
            titulo="Aún no existen publicaciones"
            descripcion="Las gestiones aparecerán solo cuando exista información de Disciplina publicada que le corresponda."
          />
        ) : (
          <section className={tarjetaDisciplina}>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm font-semibold text-slate-700">
                Gestión
                <select
                  className={`${campoDisciplina} mt-1`}
                  value={idGestion ?? ""}
                  onChange={(evento) => {
                    const nuevaGestion = gestiones.find(
                      (item) => item.id_gestion === Number(evento.target.value),
                    );
                    setIdGestion(nuevaGestion?.id_gestion ?? null);
                    setIdPeriodo(nuevaGestion?.periodos[0]?.id_periodo ?? null);
                  }}
                >
                  {gestiones.map((item) => (
                    <option key={item.id_gestion} value={item.id_gestion}>
                      {item.ano}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-semibold text-slate-700">
                Periodo
                <select
                  className={`${campoDisciplina} mt-1`}
                  value={idPeriodo ?? ""}
                  onChange={(evento) =>
                    setIdPeriodo(Number(evento.target.value) || null)
                  }
                >
                  <option value="">Todos los periodos publicados</option>
                  {gestion?.periodos.map((item) => (
                    <option key={item.id_periodo} value={item.id_periodo}>
                      Periodo {item.periodo}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </section>
        )}

        {consultando ? (
          <CargandoDisciplina texto="Consultando publicaciones…" />
        ) : registros.length === 0 && gestiones.length > 0 ? (
          <VacioDisciplina
            titulo="Sin registros publicados"
            descripcion="No hay méritos ni deméritos publicados para la selección actual. Los borradores y revisiones nunca se muestran aquí."
          />
        ) : registros.length > 0 ? (
          <section className={tarjetaDisciplina}>
            <div className="mb-4">
              <h2 className="text-lg font-bold text-slate-950">
                Registros publicados
              </h2>
              <p className="text-sm text-slate-600">
                {registros.length} registro{registros.length === 1 ? "" : "s"}{" "}
                visible{registros.length === 1 ? "" : "s"}.
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {registros.map((registro) => (
                <article
                  key={registro.id_registro}
                  className={`rounded-xl border p-4 ${registro.tipo === "MERITO" ? "border-emerald-200 bg-emerald-50/60" : "border-red-200 bg-red-50/60"}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span
                        className={`text-xs font-black uppercase tracking-wider ${registro.tipo === "MERITO" ? "text-emerald-700" : "text-red-700"}`}
                      >
                        {registro.tipo === "MERITO" ? "Mérito" : "Demérito"}
                      </span>
                      <h3 className="mt-1 font-bold text-slate-950">
                        {registro.nombre}
                      </h3>
                    </div>
                    <span className="rounded-lg border bg-white px-2 py-1 text-xs font-bold text-slate-600">
                      {registro.gestion} / {registro.periodo}
                    </span>
                  </div>
                  {registro.tipo === "DEMERITO" && registro.fecha && (
                    <p className="mt-3 text-sm text-slate-600">
                      Fecha: {registro.fecha.slice(0, 10)}
                    </p>
                  )}
                </article>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </PaginaProtegidaDisciplina>
  );
}
