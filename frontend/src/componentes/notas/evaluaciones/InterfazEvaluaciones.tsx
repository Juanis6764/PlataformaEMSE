"use client";

import { ReactNode } from "react";
import LayoutProtegido from "../../layout/LayoutProtegido";
import AccesoRestringido from "../../seguridad/AccesoRestringido";
import { useAuth } from "../../../contextos/AuthContext";
import {
  ClasificacionEvaluacion,
  EstadoMateriaEvaluacion,
  NivelRevisionEvaluacion,
} from "../../../tipos/notas/evaluaciones";

export const campoEvaluaciones =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[#2d6a4f] focus:ring-2 focus:ring-[#2d6a4f]/15 disabled:cursor-not-allowed disabled:bg-slate-100";
export const botonPrimarioEvaluaciones =
  "inline-flex items-center justify-center rounded-lg bg-[#1b4332] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#2d6a4f] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50";
export const botonSecundarioEvaluaciones =
  "inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50";
export const tarjetaEvaluaciones =
  "rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5";

export function PaginaProtegidaEvaluaciones({
  children,
  permisos = ["VER_NOTAS"],
  soloCadete = false,
}: {
  children: ReactNode;
  permisos?: string[];
  soloCadete?: boolean;
}) {
  const { usuario, permisos: permisosUsuario } = useAuth();
  const esCadete = usuario?.rol?.toUpperCase() === "CADETE";
  const permitido = soloCadete
    ? esCadete && permisosUsuario.includes("VER_NOTAS")
    : permisos.some((permiso) => permisosUsuario.includes(permiso));
  if (!permitido) return <AccesoRestringido />;
  return <LayoutProtegido>{children}</LayoutProtegido>;
}

export function EncabezadoEvaluaciones({
  titulo,
  descripcion,
  acciones,
}: {
  titulo: string;
  descripcion: string;
  acciones?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="mb-1 text-xs font-bold uppercase tracking-[0.18em] text-[#52796f]">
          Notas · Evaluaciones
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

const clasesEstado: Record<EstadoMateriaEvaluacion, string> = {
  BORRADOR: "border-slate-300 bg-slate-100 text-slate-700",
  EN_REVISION: "border-blue-200 bg-blue-50 text-blue-800",
  OBSERVADO: "border-amber-200 bg-amber-50 text-amber-800",
  REVISADO: "border-violet-200 bg-violet-50 text-violet-800",
  PUBLICADO: "border-emerald-200 bg-emerald-50 text-emerald-800",
};

export function EstadoMateriaBadge({ estado }: { estado: EstadoMateriaEvaluacion }) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${clasesEstado[estado]}`}
    >
      {estado.replaceAll("_", " ")}
    </span>
  );
}

export function NivelRevisionEvaluacionBadge({
  nivel,
}: {
  nivel: NivelRevisionEvaluacion | null;
}) {
  if (!nivel) return null;
  return (
    <span className="inline-flex rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-800">
      {nivel.replaceAll("_", " ")}
    </span>
  );
}

const clasesClasificacion: Record<ClasificacionEvaluacion, string> = {
  E: "bg-emerald-700 text-white",
  MB: "bg-emerald-100 text-emerald-900",
  B: "bg-blue-100 text-blue-900",
  R: "bg-amber-100 text-amber-900",
  M: "bg-red-100 text-red-900",
};

export function ClasificacionBadge({
  clasificacion,
}: {
  clasificacion: ClasificacionEvaluacion | null;
}) {
  if (!clasificacion) return <span className="text-slate-400">—</span>;
  return (
    <span
      className={`inline-flex min-w-9 justify-center rounded-full px-2 py-1 text-xs font-black ${clasesClasificacion[clasificacion]}`}
    >
      {clasificacion}
    </span>
  );
}

export function AvisoEvaluaciones({
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
  return <div className={`rounded-xl border p-3 text-sm ${clases}`}>{children}</div>;
}

export function CargandoEvaluaciones({ texto = "Cargando evaluaciones…" }) {
  return (
    <div className="flex min-h-52 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
      <div className="size-9 animate-spin rounded-full border-2 border-[#1b4332] border-t-transparent" />
      <p className="text-sm text-slate-600">{texto}</p>
    </div>
  );
}

export function VacioEvaluaciones({
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
      <p className="mx-auto mt-1 max-w-lg text-sm text-slate-600">{descripcion}</p>
    </div>
  );
}

export function ModalEvaluaciones({
  abierto,
  titulo,
  descripcion,
  children,
  cerrar,
  ancho = "max-w-xl",
}: {
  abierto: boolean;
  titulo: string;
  descripcion?: string;
  children: ReactNode;
  cerrar: () => void;
  ancho?: string;
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
      <div
        className={`relative max-h-[92dvh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl sm:p-6 ${ancho}`}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-950">{titulo}</h2>
            {descripcion && <p className="mt-1 text-sm text-slate-600">{descripcion}</p>}
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

export function nombreCursoEvaluaciones(nombre?: string) {
  if (!nombre) return "—";
  return nombre.replaceAll("_", " ").replace("ANO", "AÑO");
}

// Acepta coma o punto como separador decimal: en teclados en español (Bolivia)
// es habitual escribir la coma para decimales, y antes se rechazaba en
// silencio provocando notas "sin clasificación" o el bloqueo del guardado.
export function normalizarNota(valor: string): string {
  return valor.trim().replace(",", ".");
}

export function notaConsideradaVisual(inicial: string) {
  const valor = normalizarNota(inicial);
  if (!valor) return null;
  const numero = Number(valor);
  return Number.isFinite(numero) && numero >= 0 && numero <= 100 ? numero : null;
}

export function clasificarNotaVisual(valor: number | null): ClasificacionEvaluacion | null {
  if (valor === null) return null;
  if (valor === 100) return "E";
  if (valor >= 85) return "MB";
  if (valor >= 71) return "B";
  if (valor >= 51) return "R";
  return "M";
}
