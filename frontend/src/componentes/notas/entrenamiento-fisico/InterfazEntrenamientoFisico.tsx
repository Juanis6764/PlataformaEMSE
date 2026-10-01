"use client";

import { ReactNode } from "react";
import LayoutProtegido from "../../layout/LayoutProtegido";
import AccesoRestringido from "../../seguridad/AccesoRestringido";
import { useAuth } from "../../../contextos/AuthContext";
import {
  EstadoPlanillaEntrenamiento,
  NivelRevisionEntrenamiento,
} from "../../../tipos/notas/entrenamiento-fisico";

export const campoEntrenamiento =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-950 outline-none transition focus:border-[#2d6a4f] focus:ring-2 focus:ring-[#2d6a4f]/15 disabled:cursor-not-allowed disabled:bg-slate-100";
export const botonPrimarioEntrenamiento =
  "inline-flex items-center justify-center rounded-lg bg-[#1b4332] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#2d6a4f] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50";
export const botonSecundarioEntrenamiento =
  "inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50";
export const tarjetaEntrenamiento =
  "rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 print:border-0 print:p-0 print:shadow-none";

export function PaginaProtegidaEntrenamiento({
  children,
  permisos = ["VER_NOTAS"],
}: {
  children: ReactNode;
  permisos?: string[];
}) {
  const { usuario, permisos: permisosUsuario } = useAuth();
  const esCadete = usuario?.rol?.toUpperCase() === "CADETE";
  if (
    esCadete ||
    !permisos.some((permiso) => permisosUsuario.includes(permiso))
  ) {
    return <AccesoRestringido />;
  }
  return <LayoutProtegido>{children}</LayoutProtegido>;
}

export function EncabezadoEntrenamiento({
  titulo,
  descripcion,
  acciones,
}: {
  titulo: string;
  descripcion: string;
  acciones?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between print:hidden">
      <div>
        <p className="mb-1 text-xs font-bold uppercase tracking-[0.18em] text-[#52796f]">
          Notas · Entrenamiento Físico
        </p>
        <h1 className="text-2xl font-bold text-slate-950 sm:text-3xl">
          {titulo}
        </h1>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
          {descripcion}
        </p>
      </div>
      {acciones && <div className="flex flex-wrap gap-2">{acciones}</div>}
    </header>
  );
}

const clasesEstado: Record<EstadoPlanillaEntrenamiento, string> = {
  BORRADOR: "border-slate-300 bg-slate-100 text-slate-700",
  EN_REVISION: "border-blue-200 bg-blue-50 text-blue-800",
  OBSERVADO: "border-amber-200 bg-amber-50 text-amber-900",
  REVISADO: "border-emerald-200 bg-emerald-50 text-emerald-800",
};

export function EstadoPlanillaEntrenamientoBadge({
  estado,
}: {
  estado: EstadoPlanillaEntrenamiento;
}) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${clasesEstado[estado]}`}
    >
      {estado.replaceAll("_", " ")}
    </span>
  );
}

export function NivelEntrenamientoBadge({
  nivel,
}: {
  nivel: NivelRevisionEntrenamiento | null;
}) {
  if (!nivel) return null;
  return (
    <span className="inline-flex rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-800">
      {nivel.replaceAll("_", " ")}
    </span>
  );
}

export function AvisoEntrenamiento({
  tipo,
  children,
}: {
  tipo: "error" | "exito" | "info" | "alerta";
  children: ReactNode;
}) {
  const clases = {
    error: "border-red-200 bg-red-50 text-red-800",
    exito: "border-emerald-200 bg-emerald-50 text-emerald-800",
    info: "border-blue-200 bg-blue-50 text-blue-800",
    alerta: "border-amber-200 bg-amber-50 text-amber-900",
  }[tipo];
  return (
    <div className={`rounded-xl border p-3 text-sm print:hidden ${clases}`}>
      {children}
    </div>
  );
}

export function CargandoEntrenamiento({ texto = "Cargando planilla…" }) {
  return (
    <div className="flex min-h-52 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
      <div className="size-9 animate-spin rounded-full border-2 border-[#1b4332] border-t-transparent" />
      <p className="text-sm text-slate-600">{texto}</p>
    </div>
  );
}

export function VacioEntrenamiento({
  titulo,
  descripcion,
}: {
  titulo: string;
  descripcion: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
      <div className="mx-auto mb-3 flex size-11 items-center justify-center rounded-full bg-slate-200 text-xl">
        ∅
      </div>
      <h3 className="font-semibold text-slate-900">{titulo}</h3>
      <p className="mx-auto mt-1 max-w-lg text-sm text-slate-600">
        {descripcion}
      </p>
    </div>
  );
}

export function ModalEntrenamiento({
  abierto,
  titulo,
  descripcion,
  children,
  cerrar,
}: {
  abierto: boolean;
  titulo: string;
  descripcion?: string;
  children: ReactNode;
  cerrar: () => void;
}) {
  if (!abierto) return null;
  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/60 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={titulo}
    >
      <button aria-label="Cerrar ventana" className="absolute inset-0" onClick={cerrar} />
      <div className="relative max-h-[92dvh] w-full max-w-xl overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl sm:p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-950">{titulo}</h2>
            {descripcion && (
              <p className="mt-1 text-sm text-slate-600">{descripcion}</p>
            )}
          </div>
          <button
            type="button"
            onClick={cerrar}
            className="rounded-lg border px-3 py-1.5 text-sm font-bold text-slate-600 hover:bg-slate-50"
          >
            Cerrar
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function nombreCursoEntrenamiento(nombre?: string) {
  if (!nombre) return "—";
  return nombre.replaceAll("_", " ").replace("ANO", "AÑO");
}

export function normalizarNotaEntrenamiento(valor: string) {
  return valor.trim().replace(",", ".");
}
