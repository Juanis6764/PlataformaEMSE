"use client";

import { ReactNode } from "react";
import LayoutProtegido from "../layout/LayoutProtegido";
import AccesoRestringido from "../seguridad/AccesoRestringido";
import { useAuth } from "../../contextos/AuthContext";
import {
  ClasificacionDocumento,
  EstadoDocumento,
  EstadoPlazoCalculado,
  PrioridadDocumento,
} from "../../tipos/documentacion";
import { situacionHistoricaPlazo } from "./plazos-historicos";

export const campoDoc =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[#2d6a4f] focus:ring-2 focus:ring-[#2d6a4f]/15 disabled:cursor-not-allowed disabled:bg-slate-100";
export const botonPrimarioDoc =
  "inline-flex items-center justify-center rounded-lg bg-[#1b4332] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#2d6a4f] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50";
export const botonSecundarioDoc =
  "inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50";
export const tarjetaDoc =
  "rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5";
const NOMBRE_SECCION_ADMINISTRACION_DOCUMENTAL = "ADMINISTRACION_SISTEMA";

/** Permisos reales del módulo (ver prisma/seed/datos/permisos.ts, módulo DOCUMENTOS). */
export const PERMISOS_DOC = {
  VER: "DOC_VER_DOCUMENTOS",
  CREAR: "DOC_CREAR_DOCUMENTO",
  ENVIAR: "DOC_ENVIAR_DOCUMENTO",
  RECIBIR: "DOC_RECIBIR_DOCUMENTO",
  ASIGNAR_HOJA_RUTA: "DOC_ASIGNAR_HOJA_RUTA",
  REGISTRAR_PROVEIDO: "DOC_REGISTRAR_PROVEIDO",
  DERIVAR: "DOC_DERIVAR_DOCUMENTO",
  REGISTRAR_CUMPLIMIENTO: "DOC_REGISTRAR_CUMPLIMIENTO",
  CREAR_RESPUESTA: "DOC_CREAR_RESPUESTA",
  OBSERVAR: "DOC_OBSERVAR_DOCUMENTO",
  APROBAR: "DOC_APROBAR_DOCUMENTO",
  FINALIZAR: "DOC_FINALIZAR_DOCUMENTO",
  ARCHIVAR: "DOC_ARCHIVAR_DOCUMENTO",
  DESCARGAR: "DOC_DESCARGAR_DOCUMENTO",
  IMPRIMIR: "DOC_IMPRIMIR_DOCUMENTO",
} as const;

/**
 * Único grupo con seguimiento institucional global (mismo criterio que
 * ValidacionesDocumentalesService.esActorGlobal en backend): un
 * ADMINISTRADOR fuera del área operativa Administración, o RADIO/COMANDO.
 * Administración consulta únicamente su participación actual o histórica.
 */
export function esActorGlobalDocumental(
  usuario: { rol?: string | null; seccion?: string | null } | null,
) {
  if (!usuario) return false;
  const rol = usuario.rol?.toUpperCase();
  const seccion = usuario.seccion?.toUpperCase();
  return (
    (rol === "ADMINISTRADOR" &&
      seccion !== NOMBRE_SECCION_ADMINISTRACION_DOCUMENTAL) ||
    seccion === "RADIO" ||
    seccion === "COMANDO"
  );
}

export function esAdministracionDocumental(
  usuario: { seccion?: string | null } | null,
) {
  return (
    usuario?.seccion?.toUpperCase() === NOMBRE_SECCION_ADMINISTRACION_DOCUMENTAL
  );
}

export function esSeguimientoDocumental(
  usuario: { rol?: string | null; seccion?: string | null } | null,
) {
  if (!usuario) return false;
  const rol = usuario.rol?.toUpperCase();
  const seccion = usuario.seccion?.toUpperCase();
  return (
    rol === "ADMINISTRADOR" ||
    seccion === NOMBRE_SECCION_ADMINISTRACION_DOCUMENTAL ||
    seccion === "RADIO" ||
    seccion === "COMANDO" ||
    seccion === "SEGUNDO_COMANDO"
  );
}

/**
 * Único perfil que puede registrar un documento principal (mismo criterio
 * que ValidacionesDocumentalesService.exigirTipo(perfil, 'RADIO') en
 * backend). El permiso DOC_CREAR_DOCUMENTO por sí solo NO alcanza: lo
 * tiene todo el rol ADMINISTRATIVO (Secretaría, Comando, Segundo Comando,
 * áreas), no solo Radio — la sección es la que realmente decide.
 */
export function esRadioDocumental(
  usuario: { rol?: string | null; seccion?: string | null } | null,
) {
  if (!usuario) return false;
  const rol = usuario.rol?.toUpperCase();
  const seccion = usuario.seccion?.toUpperCase();
  return rol !== "ADMINISTRADOR" && seccion === "RADIO";
}

export function PaginaProtegidaDocumentacion({
  children,
  permisos = [],
  soloActorGlobal = false,
  soloRadio = false,
  soloSeguimiento = false,
}: {
  children: ReactNode;
  permisos?: string[];
  /** Restringe además a ADMINISTRADOR/RADIO/COMANDO (seguimiento global). */
  soloActorGlobal?: boolean;
  /** Restringe además a la sección RADIO (registrar documento principal). */
  soloRadio?: boolean;
  /** Restringe además a las secciones que consultan el dashboard documental. */
  soloSeguimiento?: boolean;
}) {
  const { permisos: permisosUsuario, usuario } = useAuth();
  const permitido =
    (permisos.length === 0 ||
      permisos.some((permiso) => permisosUsuario.includes(permiso))) &&
    (!soloActorGlobal || esActorGlobalDocumental(usuario)) &&
    (!soloRadio || esRadioDocumental(usuario)) &&
    (!soloSeguimiento || esSeguimientoDocumental(usuario));
  if (!permitido) return <AccesoRestringido />;
  return <LayoutProtegido>{children}</LayoutProtegido>;
}

export function EncabezadoDoc({
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
          Gestión Documental
        </p>
        <h1 className="text-2xl font-bold text-slate-950 sm:text-3xl">
          {titulo}
        </h1>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
          {descripcion}
        </p>
      </div>
      {acciones && (
        <div className="flex shrink-0 flex-wrap gap-2">{acciones}</div>
      )}
    </header>
  );
}

const clasesEstado: Record<EstadoDocumento, string> = {
  REGISTRADO: "border-slate-300 bg-slate-100 text-slate-700",
  EN_TRANSITO: "border-blue-200 bg-blue-50 text-blue-800",
  EN_TRAMITE: "border-indigo-200 bg-indigo-50 text-indigo-800",
  OBSERVADO: "border-amber-200 bg-amber-50 text-amber-800",
  APROBADO: "border-emerald-200 bg-emerald-50 text-emerald-800",
  FINALIZADO: "border-violet-200 bg-violet-50 text-violet-800",
  ARCHIVADO: "border-slate-400 bg-slate-200 text-slate-800",
};

export function EstadoDocumentoBadge({ estado }: { estado: EstadoDocumento }) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${clasesEstado[estado]}`}
    >
      {estado.replace("_", " ")}
    </span>
  );
}

const clasesPrioridad: Record<PrioridadDocumento, string> = {
  RUTINARIO: "border-slate-300 bg-slate-100 text-slate-700",
  URGENTE: "border-rose-300 bg-rose-50 text-rose-800",
};

export function PrioridadBadge({
  prioridad,
}: {
  prioridad: PrioridadDocumento;
}) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${clasesPrioridad[prioridad]}`}
    >
      {prioridad}
    </span>
  );
}

const clasesClasificacion: Record<ClasificacionDocumento, string> = {
  PUBLICO: "border-emerald-200 bg-emerald-50 text-emerald-800",
  CONFIDENCIAL: "border-amber-200 bg-amber-50 text-amber-800",
  RESERVADO: "border-orange-300 bg-orange-50 text-orange-800",
  SECRETO: "border-red-300 bg-red-50 text-red-800",
};

export function ClasificacionBadge({
  clasificacion,
}: {
  clasificacion: ClasificacionDocumento;
}) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${clasesClasificacion[clasificacion]}`}
    >
      {clasificacion}
    </span>
  );
}

export function AvisoDoc({
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
    <div className={`rounded-xl border p-3 text-sm ${clases}`}>{children}</div>
  );
}

export function CargandoDoc({ texto = "Cargando información real…" }) {
  return (
    <div className="flex min-h-52 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
      <div className="size-9 animate-spin rounded-full border-2 border-[#1b4332] border-t-transparent" />
      <p className="text-sm text-slate-600">{texto}</p>
    </div>
  );
}

export function VacioDoc({
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

export function ModalDoc({
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
      className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={titulo}
    >
      <button
        aria-label="Cerrar ventana"
        className="absolute inset-0 cursor-default"
        onClick={cerrar}
      />
      <div
        className={`relative max-h-[92dvh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl sm:p-6 ${ancho}`}
      >
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

export function fechaLegibleDoc(fecha?: string | null) {
  if (!fecha) return "—";
  return new Intl.DateTimeFormat("es-BO", {
    dateStyle: "medium",
    timeStyle: fecha.includes("T") ? "short" : undefined,
    timeZone: "America/La_Paz",
  }).format(new Date(fecha));
}

/** Tiempo restante/transcurrido legible respecto de una fecha límite. */
export function tiempoRestanteDoc(fechaLimite: string, ahora = new Date()) {
  const limite = new Date(fechaLimite);
  const diffMs = limite.getTime() - ahora.getTime();
  const vencido = diffMs < 0;
  const absMs = Math.abs(diffMs);
  const horas = Math.floor(absMs / 3_600_000);
  const dias = Math.floor(horas / 24);
  const horasRestantes = horas % 24;
  const minutos = Math.floor((absMs % 3_600_000) / 60_000);
  const texto =
    dias > 0
      ? `${dias}d ${horasRestantes}h`
      : horas > 0
        ? `${horas}h ${minutos}min`
        : `${minutos}min`;
  return vencido ? `Vencido hace ${texto}` : `Vence en ${texto}`;
}

export function situacionPlazoVisual(
  plazo: {
    estado_calculado: EstadoPlazoCalculado;
    fecha_hora_limite: string;
    fecha_hora_cumplimiento?: string | null;
  } | null,
  ahora = new Date(),
) {
  if (!plazo) {
    return {
      clave: "SIN_PLAZO" as const,
      emoji: "—",
      texto: "SIN PLAZO",
      clase: "text-slate-500",
    };
  }
  const clave = situacionHistoricaPlazo(plazo, ahora);
  if (clave === "CUMPLIDO_TARDE") {
    return {
      clave,
      emoji: "🔴",
      texto: "CUMPLIDO TARDE",
      clase: "text-red-700",
    };
  }
  if (clave === "CUMPLIDO") {
    return { clave, emoji: "✅", texto: "CUMPLIDO", clase: "text-emerald-700" };
  }
  if (clave === "VENCIDO") {
    return { clave, emoji: "⚠", texto: "VENCIDO", clase: "text-red-700" };
  }
  if (clave === "VENCE_HOY") {
    return { clave, emoji: "🟡", texto: "VENCE HOY", clase: "text-amber-700" };
  }
  if (clave === "PROXIMO_A_VENCER") {
    return {
      clave,
      emoji: "🟡",
      texto: "PRÓXIMO A VENCER",
      clase: "text-amber-700",
    };
  }
  return { clave, emoji: "🟢", texto: "EN PLAZO", clase: "text-emerald-700" };
}

/**
 * Estado visual del plazo (🟢/🟡/🔴), calculado en el momento a partir de
 * `estado_calculado` (ya derivado por backend, PlazosService) y de cuánto
 * falta para el vencimiento — nunca se guarda en BD ni se recibe como color.
 * Umbral "próximo a vencer": menos de 24h restantes.
 */
export function estadoPlazoVisual(
  plazo: { estado_calculado: EstadoPlazoCalculado; fecha_hora_limite: string },
  ahora = new Date(),
) {
  if (plazo.estado_calculado === "VENCIDO") {
    return { emoji: "🔴", texto: "VENCIDO", clase: "text-red-700" };
  }
  if (plazo.estado_calculado === "CUMPLIDO_CON_RETRASO") {
    return {
      emoji: "🟠",
      texto: "CUMPLIDO CON RETRASO",
      clase: "text-orange-700",
    };
  }
  if (plazo.estado_calculado === "CUMPLIDO") {
    return { emoji: "✅", texto: "CUMPLIDO", clase: "text-emerald-700" };
  }
  const horasRestantes =
    (new Date(plazo.fecha_hora_limite).getTime() - ahora.getTime()) / 3_600_000;
  if (horasRestantes <= 24) {
    return { emoji: "🟡", texto: "PRÓXIMO A VENCER", clase: "text-amber-700" };
  }
  return { emoji: "🟢", texto: "DENTRO DEL PLAZO", clase: "text-emerald-700" };
}
