"use client";

import { FormEvent, useMemo, useState } from "react";
import {
  ActualizarRegistroDisciplina,
  CatalogoDisciplina,
  CrearRegistroDisciplina,
  OficialDisciplina,
  RegistroDisciplina,
  TipoDisciplina,
} from "../../../tipos/notas/disciplina";
import {
  botonPrimarioDisciplina,
  botonSecundarioDisciplina,
  campoDisciplina,
} from "./InterfazDisciplina";

export default function FormularioRegistroDisciplina({
  idCadete,
  catalogos,
  oficiales,
  registro,
  guardando,
  modoExtraordinario = false,
  guardar,
  cancelar,
}: {
  idCadete: number;
  catalogos: CatalogoDisciplina[];
  oficiales: OficialDisciplina[];
  registro?: RegistroDisciplina | null;
  guardando: boolean;
  modoExtraordinario?: boolean;
  guardar: (
    datos: CrearRegistroDisciplina | ActualizarRegistroDisciplina,
    justificacion?: string,
  ) => Promise<void>;
  cancelar: () => void;
}) {
  const [tipo, setTipo] = useState<TipoDisciplina>(
    registro?.catalogo.tipo ?? "DEMERITO",
  );
  const [idCatalogo, setIdCatalogo] = useState(registro?.id_catalogo ?? 0);
  const [responsable, setResponsable] = useState<"OFICIAL" | "MANUAL">(
    registro?.id_oficial ? "OFICIAL" : "MANUAL",
  );
  const [idOficial, setIdOficial] = useState(registro?.id_oficial ?? 0);
  const [nombreManual, setNombreManual] = useState(
    registro?.nombre_responsable_manual ?? "",
  );
  const [fecha, setFecha] = useState(registro?.fecha_hecho?.slice(0, 10) ?? "");
  const [puntaje, setPuntaje] = useState(registro?.puntaje ?? "");
  const [observacion, setObservacion] = useState(registro?.observacion ?? "");
  const [justificacion, setJustificacion] = useState("");
  const [buscarCatalogo, setBuscarCatalogo] = useState("");
  const [buscarOficial, setBuscarOficial] = useState("");
  const [error, setError] = useState("");

  const catalogosTipo = useMemo(() => {
    const termino = buscarCatalogo.trim().toLocaleLowerCase("es");
    return catalogos.filter(
      (catalogo) =>
        catalogo.tipo === tipo &&
        (catalogo.activo || catalogo.id_catalogo === registro?.id_catalogo) &&
        (!termino ||
          `${catalogo.codigo} ${catalogo.nombre}`
            .toLocaleLowerCase("es")
            .includes(termino) ||
          catalogo.id_catalogo === idCatalogo),
    );
  }, [buscarCatalogo, catalogos, idCatalogo, registro?.id_catalogo, tipo]);
  const catalogo = catalogos.find((item) => item.id_catalogo === idCatalogo);

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setError("");
    if (!catalogo) return setError("Seleccione un elemento real del catálogo.");
    if (tipo === "DEMERITO" && responsable === "OFICIAL" && !idOficial) {
      return setError("Seleccione un oficial.");
    }
    if (
      tipo === "DEMERITO" &&
      responsable === "MANUAL" &&
      !nombreManual.trim()
    ) {
      return setError("Escriba el nombre del responsable manual.");
    }
    if (tipo === "DEMERITO" && !fecha) {
      return setError("El demérito requiere fecha del hecho.");
    }
    if (tipo === "MERITO" && (!puntaje || Number(puntaje) <= 0)) {
      return setError("El mérito requiere un puntaje positivo.");
    }
    if (modoExtraordinario && !justificacion.trim()) {
      return setError("La justificación es obligatoria.");
    }
    if (
      modoExtraordinario &&
      !window.confirm(
        "¿Confirma la modificación extraordinaria? El valor anterior y el nuevo quedarán auditados.",
      )
    ) {
      return;
    }
    const datos: CrearRegistroDisciplina = {
      id_cadete: idCadete,
      id_catalogo: idCatalogo,
      puntaje: tipo === "MERITO" ? puntaje : undefined,
      ...(tipo === "DEMERITO"
        ? {
            id_oficial: responsable === "OFICIAL" ? idOficial : null,
            nombre_responsable_manual:
              responsable === "MANUAL" ? nombreManual.trim() : null,
            fecha_hecho: fecha,
            observacion: observacion.trim() || null,
          }
        : {}),
    };
    await guardar(datos, modoExtraordinario ? justificacion.trim() : undefined);
  }

  return (
    <form className="space-y-4" onSubmit={enviar}>
      {modoExtraordinario && registro && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          Valor actual: <strong>{registro.catalogo.nombre}</strong> · puntaje{" "}
          <strong>{registro.puntaje}</strong>. El estado de la semana no
          cambiará.
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-semibold text-slate-700">
          Tipo
          <select
            className={`${campoDisciplina} mt-1`}
            value={tipo}
            onChange={(evento) => {
              setTipo(evento.target.value as TipoDisciplina);
              setIdCatalogo(0);
              setPuntaje("");
            }}
          >
            <option value="DEMERITO">Demérito</option>
            <option value="MERITO">Mérito</option>
          </select>
        </label>
        <label className="text-sm font-semibold text-slate-700">
          Elemento del catálogo
          <select
            required
            className={`${campoDisciplina} mt-1`}
            value={idCatalogo || ""}
            onChange={(evento) => setIdCatalogo(Number(evento.target.value))}
          >
            <option value="">Seleccione</option>
            {catalogosTipo.map((item) => (
              <option key={item.id_catalogo} value={item.id_catalogo}>
                {item.codigo} · {item.nombre}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="block text-sm font-semibold text-slate-700">
        Buscar en el catálogo
        <input
          className={`${campoDisciplina} mt-1`}
          value={buscarCatalogo}
          onChange={(evento) => setBuscarCatalogo(evento.target.value)}
          placeholder="Buscar por código o nombre"
        />
      </label>
      {catalogosTipo.length === 0 && (
        <p className="text-sm text-amber-700">
          No existe un catálogo activo de{" "}
          {tipo === "MERITO" ? "méritos" : "deméritos"}.
        </p>
      )}
      {tipo === "DEMERITO" && (
        <div className="rounded-xl border border-slate-200 p-3">
          <p className="mb-3 text-sm font-semibold text-slate-800">
            Responsable del hecho
          </p>
          <div className="mb-3 flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={responsable === "OFICIAL"}
                onChange={() => setResponsable("OFICIAL")}
              />
              Oficial registrado
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={responsable === "MANUAL"}
                onChange={() => setResponsable("MANUAL")}
              />
              Responsable manual
            </label>
          </div>
          {responsable === "OFICIAL" ? (
            <div className="space-y-2">
              <input
                className={campoDisciplina}
                value={buscarOficial}
                onChange={(evento) => setBuscarOficial(evento.target.value)}
                placeholder="Buscar oficial por código o nombre completo"
              />
              <select
                required
                className={campoDisciplina}
                value={idOficial || ""}
                onChange={(evento) => setIdOficial(Number(evento.target.value))}
              >
                <option value="">Seleccione un oficial</option>
                {oficiales
                  .filter((oficial) => {
                    const termino = buscarOficial
                      .trim()
                      .toLocaleLowerCase("es");
                    return (
                      (oficial.activo ||
                        oficial.id_oficial === registro?.id_oficial) &&
                      (!termino ||
                        `${oficial.codigo} ${oficial.nombre_completo}`
                          .toLocaleLowerCase("es")
                          .includes(termino) ||
                        oficial.id_oficial === idOficial)
                    );
                  })
                  .map((oficial) => (
                    <option key={oficial.id_oficial} value={oficial.id_oficial}>
                      {oficial.codigo} · {oficial.nombre_completo}
                    </option>
                  ))}
              </select>
            </div>
          ) : (
            <input
              required
              className={campoDisciplina}
              value={nombreManual}
              maxLength={200}
              placeholder="Nombre completo del responsable"
              onChange={(evento) => setNombreManual(evento.target.value)}
            />
          )}
        </div>
      )}
      {tipo === "DEMERITO" ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-semibold text-slate-700">
              Fecha
              <input
                required
                type="date"
                className={`${campoDisciplina} mt-1`}
                value={fecha}
                onChange={(evento) => setFecha(evento.target.value)}
              />
            </label>
            <label className="text-sm font-semibold text-slate-700">
              Puntaje
              <input
                disabled
                type="number"
                min="0.0001"
                step="0.0001"
                className={`${campoDisciplina} mt-1 font-mono`}
                value={catalogo?.puntaje_base ?? ""}
                placeholder="Definido por catálogo"
                readOnly
              />
            </label>
          </div>
          <label className="block text-sm font-semibold text-slate-700">
            Observación del registro
            <textarea
              className={`${campoDisciplina} mt-1 min-h-24 resize-y`}
              value={observacion}
              maxLength={2000}
              onChange={(evento) => setObservacion(evento.target.value)}
              placeholder="Opcional"
            />
          </label>
        </>
      ) : (
        <label className="block text-sm font-semibold text-slate-700">
          Puntaje del mérito
          <input
            required
            type="number"
            min="0.0001"
            step="0.0001"
            className={`${campoDisciplina} mt-1 font-mono`}
            value={puntaje}
            placeholder="0.0000"
            onChange={(evento) => setPuntaje(evento.target.value)}
          />
        </label>
      )}
      {modoExtraordinario && (
        <label className="block text-sm font-semibold text-slate-700">
          Justificación obligatoria
          <textarea
            required
            className={`${campoDisciplina} mt-1 min-h-24 resize-y border-amber-300`}
            value={justificacion}
            maxLength={1000}
            onChange={(evento) => setJustificacion(evento.target.value)}
            placeholder="Explique el motivo documentado de la modificación"
          />
        </label>
      )}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          className={botonSecundarioDisciplina}
          onClick={cancelar}
        >
          Cancelar
        </button>
        <button disabled={guardando} className={botonPrimarioDisciplina}>
          {guardando
            ? "Guardando…"
            : modoExtraordinario
              ? "Aplicar modificación"
              : "GUARDAR"}
        </button>
      </div>
    </form>
  );
}
