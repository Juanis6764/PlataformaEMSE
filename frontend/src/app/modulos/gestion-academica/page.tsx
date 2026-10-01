"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { AxiosError } from "axios";
import LayoutProtegido from "../../../componentes/layout/LayoutProtegido";
import { useAuth } from "../../../contextos/AuthContext";
import AccesoRestringido from "../../../componentes/seguridad/AccesoRestringido";
import {
  activarPeriodoAdmin,
  crearGestionAdmin,
  listarGestionesAdmin,
} from "../../../servicios/gestion-academica.service";
import { GestionAcademicaAdmin } from "../../../tipos/gestion-academica";

const campo = "w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-[var(--color-military-green)]";
const boton = "rounded-md bg-[var(--color-military-green)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50";
const tarjeta = "rounded-lg border bg-white p-4 shadow-sm";

function mensajeError(error: unknown) {
  if (error instanceof AxiosError) {
    const mensaje = error.response?.data?.message;
    return Array.isArray(mensaje) ? mensaje.join(" ") : mensaje || "No se pudo completar la operación.";
  }
  return "No se pudo completar la operación.";
}

export default function GestionAcademicaPage() {
  const { tienePermiso } = useAuth();
  const [gestiones, setGestiones] = useState<GestionAcademicaAdmin[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [exito, setExito] = useState("");

  const cargar = useCallback(async () => {
    try {
      setGestiones(await listarGestionesAdmin());
    } catch (e) {
      setError(mensajeError(e));
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    let cancelado = false;

    void listarGestionesAdmin()
      .then((datos) => {
        if (!cancelado) setGestiones(datos);
      })
      .catch((e: unknown) => {
        if (!cancelado) setError(mensajeError(e));
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });

    return () => {
      cancelado = true;
    };
  }, []);

  const puedeAdministrar = tienePermiso("GESTIONAR_GESTION_ACADEMICA");

  async function ejecutar(accion: () => Promise<unknown>, mensaje: string) {
    setGuardando(true); setError(""); setExito("");
    try { await accion(); setExito(mensaje); await cargar(); }
    catch (e) { setError(mensajeError(e)); }
    finally { setGuardando(false); }
  }

  if (cargando) return <LayoutProtegido><div className="flex min-h-[50vh] items-center justify-center"><div className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--color-military-green)] border-t-transparent" /></div></LayoutProtegido>;
  if (!puedeAdministrar) return <AccesoRestringido />;

  return (
    <LayoutProtegido>
      <div className="space-y-5">
        <header>
          <h1 className="text-2xl font-bold">Gestión Académica</h1>
          <p className="text-sm text-gray-500">
            El Administrador crea las gestiones y sus dos periodos (I y II); son la base
            de la planificación académica institucional.
          </p>
        </header>
        {error && <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        {exito && <div className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-700">{exito}</div>}

        <section className={tarjeta}>
          <h2 className="mb-3 text-lg font-semibold">Crear gestión</h2>
          <form
            className="flex flex-wrap items-end gap-3"
            onSubmit={(e: FormEvent<HTMLFormElement>) => {
              e.preventDefault();
              if (!confirm("¿Está seguro de crear esta gestión? Se crearán automáticamente sus dos periodos (I y II).")) return;
              const f = new FormData(e.currentTarget);
              const ano = Number(f.get("ano"));
              ejecutar(() => crearGestionAdmin(ano), `Gestión ${ano} creada correctamente con sus periodos I y II.`);
              e.currentTarget.reset();
            }}
          >
            <div className="w-40">
              <label className="mb-1 block text-xs font-semibold text-gray-500">Gestión (año)</label>
              <input required min="1900" type="number" name="ano" className={campo} placeholder="2026" />
            </div>
            <button disabled={guardando} className={boton}>Crear gestión</button>
          </form>
        </section>

        <section className={tarjeta}>
          <h2 className="mb-3 text-lg font-semibold">Gestiones y periodos ({gestiones.length})</h2>
          <div className="space-y-3">
            {gestiones.length === 0 && <p className="text-sm text-gray-500">Todavía no hay gestiones creadas.</p>}
            {gestiones.map((g) => (
              <div key={g.id_gestion} className="rounded-md border p-3">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <strong className="text-base">{g.ano}</strong>
                  <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-semibold">{g.estado}</span>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {g.periodos_lectivos.map((p) => (
                    <div key={p.id_periodo} className={`flex items-center justify-between rounded p-2 text-sm ${p.activo ? "bg-green-50" : "bg-gray-50"}`}>
                      <span>
                        {p.periodo}/{g.ano} {p.activo && <em className="font-semibold text-green-700">(activo)</em>}
                      </span>
                      {!p.activo && (
                        <button
                          disabled={guardando}
                          className="rounded-md border px-3 py-1 text-xs font-semibold hover:bg-gray-100"
                          onClick={() => {
                            if (confirm(`¿Está seguro de activar el periodo ${p.periodo}/${g.ano}? Se desactivará cualquier otro periodo activo.`)) {
                              void ejecutar(() => activarPeriodoAdmin(p.id_periodo), `Periodo ${p.periodo}/${g.ano} activado correctamente.`);
                            }
                          }}
                        >
                          Activar
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </LayoutProtegido>
  );
}
