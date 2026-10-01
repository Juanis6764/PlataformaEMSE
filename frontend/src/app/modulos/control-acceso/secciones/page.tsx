"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import LayoutProtegido from "../../../../componentes/layout/LayoutProtegido";
import {
  actualizarSeccion,
  crearSeccion,
  eliminarSeccion,
  obtenerSecciones,
} from "../../../../servicios/control-acceso/secciones.service";
import { Seccion } from "../../../../tipos/seccion";
import { useAuth } from "../../../../contextos/AuthContext";

export default function GestionSecciones() {
  const router = useRouter();
  const { cargando: cargandoSesion, tienePermiso } = useAuth();
  const [secciones, setSecciones] = useState<Seccion[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    if (cargandoSesion) return;
    if (!tienePermiso("GESTIONAR_SECCIONES")) {
      router.replace("/acceso-restringido");
      return;
    }

    cargarDatos();
  }, [router, cargandoSesion, tienePermiso]);

  async function cargarDatos() {
    try {
      const res = await obtenerSecciones();
      setSecciones(res);
    } catch (error) {
      console.error(error);
    } finally {
      setCargando(false);
    }
  }

  if (cargando) {
    return (
      <LayoutProtegido>
        <div className="p-8 text-center">Cargando...</div>
      </LayoutProtegido>
    );
  }

  return (
    <LayoutProtegido>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--color-night-blue)]">
          Gestión de Secciones
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Listado de secciones (departamentos) de la EMSE.
        </p>
      </div>
      <button
        onClick={async () => {
          const nombre = prompt("Nombre de la sección");
          if (nombre) {
            await crearSeccion({ nombre, nivel: 1, tipo: "ADMINISTRATIVA" });
            await cargarDatos();
          }
        }}
        className="mb-4 rounded bg-[var(--color-military-green)] px-4 py-2 text-white"
      >
        Nueva sección
      </button>

      <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-200">
        <table className="w-full text-sm text-left">
          <thead className="text-xs uppercase bg-[var(--color-night-blue)] text-gray-200">
            <tr>
              <th className="px-6 py-4 font-semibold">Nombre</th>
              <th className="px-6 py-4 font-semibold">Descripción</th>
              <th className="px-6 py-4 font-semibold text-center">Nivel</th>
              <th className="px-6 py-4 font-semibold text-center">Estado</th>
              <th className="px-6 py-4">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {secciones.map((s) => (
              <tr key={s.id_seccion} className="border-b hover:bg-gray-50">
                <td className="px-6 py-4 font-medium">{s.nombre}</td>
                <td className="px-6 py-4">{s.descripcion || "-"}</td>
                <td className="px-6 py-4 text-center">{s.nivel}</td>
                <td className="px-6 py-4 text-center">
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-medium ${s.estado ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
                  >
                    {s.estado ? "Activo" : "Inactivo"}
                  </span>
                </td>
                <td className="space-x-2">
                  <button
                    onClick={async () => {
                      const descripcion = prompt(
                        "Descripción",
                        s.descripcion || "",
                      );
                      if (descripcion !== null) {
                        await actualizarSeccion(s.id_seccion, { descripcion });
                        await cargarDatos();
                      }
                    }}
                  >
                    Editar
                  </button>
                  <button
                    onClick={async () => {
                      if (confirm("¿Desactivar sección?")) {
                        await eliminarSeccion(s.id_seccion);
                        await cargarDatos();
                      }
                    }}
                    className="text-red-700"
                  >
                    Desactivar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </LayoutProtegido>
  );
}
