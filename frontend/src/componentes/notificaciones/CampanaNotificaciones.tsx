"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../contextos/AuthContext";
import {
  contarNotificacionesNoLeidas,
  listarNotificaciones,
  marcarNotificacionLeida,
  marcarTodasNotificacionesLeidas,
} from "../../servicios/notificaciones.service";
import { Notificacion } from "../../tipos/notificacion";

export default function CampanaNotificaciones() {
  const router = useRouter();
  const { usuario } = useAuth();
  const contenedor = useRef<HTMLDivElement>(null);
  const [abierto, setAbierto] = useState(false);
  const [cantidad, setCantidad] = useState(0);
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  const actualizarConteo = useCallback(async () => {
    try {
      setCantidad(await contarNotificacionesNoLeidas());
    } catch {
      // El conteo no debe interrumpir el resto del panel.
    }
  }, []);

  const cargarLista = useCallback(async () => {
    setCargando(true);
    setError("");
    try {
      const respuesta = await listarNotificaciones({ pagina: 1, limite: 12 });
      setNotificaciones(respuesta.data);
    } catch {
      setError("No se pudieron consultar las notificaciones.");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => void actualizarConteo());
    const intervalo = window.setInterval(() => void actualizarConteo(), 30_000);
    const actualizar = () => void actualizarConteo();
    window.addEventListener("notificaciones:actualizar", actualizar);
    return () => {
      window.clearInterval(intervalo);
      window.removeEventListener("notificaciones:actualizar", actualizar);
    };
  }, [actualizarConteo]);

  useEffect(() => {
    const cerrar = (evento: MouseEvent) => {
      if (!contenedor.current?.contains(evento.target as Node)) setAbierto(false);
    };
    document.addEventListener("mousedown", cerrar);
    return () => document.removeEventListener("mousedown", cerrar);
  }, []);

  function alternar() {
    const siguiente = !abierto;
    setAbierto(siguiente);
    if (siguiente) void cargarLista();
  }

  async function abrirNotificacion(notificacion: Notificacion) {
    if (!notificacion.leida) {
      await marcarNotificacionLeida(notificacion.id_notificacion).catch(() => undefined);
      setCantidad((actual) => Math.max(0, actual - 1));
    }
    setAbierto(false);
    const rol = usuario?.rol?.toUpperCase();
    const seccion = usuario?.seccion?.toUpperCase() ?? "";
    if (notificacion.area === "EVALUACIONES") {
      if (rol === "CADETE") {
        router.push("/mis-notas/evaluaciones");
      } else if (
        (rol === "OPERADOR" || rol === "OPERADOR_EVALUACIONES") &&
        seccion.includes("EVALUACIONES")
      ) {
        router.push(
          `/modulos/notas/evaluaciones/registro${notificacion.id_referencia ? `?materia=${notificacion.id_referencia}` : ""}`,
        );
      } else {
        router.push(
          `/modulos/notas/evaluaciones/revision${notificacion.id_referencia ? `?materia=${notificacion.id_referencia}` : ""}`,
        );
      }
      return;
    }
    if (rol === "CADETE") {
      router.push("/mis-notas/disciplina");
    } else if (rol === "OPERADOR" || rol === "OPERADOR_DISCIPLINA") {
      router.push(
        `/modulos/notas/disciplina/registro${notificacion.id_referencia ? `?semana=${notificacion.id_referencia}` : ""}`,
      );
    } else if (notificacion.area === "DISCIPLINA" && notificacion.id_referencia) {
      router.push(`/modulos/notas/disciplina/revision?semana=${notificacion.id_referencia}`);
    } else if (notificacion.ruta_destino?.startsWith("/modulos/")) {
      router.push(notificacion.ruta_destino);
    }
  }

  async function marcarTodas() {
    try {
      await marcarTodasNotificacionesLeidas();
      setCantidad(0);
      setNotificaciones((actuales) =>
        actuales.map((notificacion) => ({ ...notificacion, leida: true })),
      );
    } catch {
      setError("No se pudieron marcar las notificaciones.");
    }
  }

  return (
    <div ref={contenedor} className="relative">
      <button
        type="button"
        onClick={alternar}
        className="relative flex size-10 items-center justify-center rounded-lg border border-slate-300 bg-white text-lg text-slate-700 transition hover:bg-slate-50"
        aria-label={`Notificaciones${cantidad ? `: ${cantidad} no leídas` : ""}`}
        aria-expanded={abierto}
      >
        <span aria-hidden>🔔</span>
        {cantidad > 0 && (
          <span className="absolute -right-1.5 -top-1.5 min-w-5 rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-black leading-4 text-white">
            {cantidad > 99 ? "99+" : cantidad}
          </span>
        )}
      </button>
      {abierto && (
        <div className="fixed inset-x-3 top-[4.5rem] z-50 max-h-[calc(100dvh-5.5rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl sm:absolute sm:inset-auto sm:right-0 sm:top-12 sm:w-[24rem]">
          <div className="flex items-center justify-between border-b p-4">
            <div><h2 className="font-bold text-slate-950">Notificaciones</h2><p className="text-xs text-slate-500">Acciones reales del sistema</p></div>
            {cantidad > 0 && <button type="button" onClick={() => void marcarTodas()} className="text-xs font-bold text-[#2d6a4f] hover:underline">Marcar todas leídas</button>}
          </div>
          <div className="max-h-[32rem] overflow-y-auto">
            {cargando ? (
              <p className="p-6 text-center text-sm text-slate-500">Cargando…</p>
            ) : error ? (
              <p className="p-5 text-sm text-red-700">{error}</p>
            ) : notificaciones.length === 0 ? (
              <p className="p-8 text-center text-sm text-slate-500">No tiene notificaciones.</p>
            ) : (
              notificaciones.map((notificacion) => (
                <button
                  type="button"
                  key={notificacion.id_notificacion}
                  onClick={() => void abrirNotificacion(notificacion)}
                  className={`block w-full border-b p-4 text-left transition hover:bg-slate-50 ${notificacion.leida ? "bg-white" : "bg-emerald-50/70"}`}
                >
                  <div className="flex items-start gap-3">
                    <span className={`mt-1 size-2 shrink-0 rounded-full ${notificacion.leida ? "bg-slate-300" : "bg-emerald-600"}`} />
                    <div className="min-w-0"><p className="text-sm font-bold text-slate-950">{notificacion.titulo}</p><p className="mt-1 text-sm leading-5 text-slate-600">{notificacion.mensaje}</p><p className="mt-2 text-xs text-slate-400">{new Intl.DateTimeFormat("es-BO", { dateStyle: "medium", timeStyle: "short", timeZone: "America/La_Paz" }).format(new Date(notificacion.fecha_creacion))}</p></div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
