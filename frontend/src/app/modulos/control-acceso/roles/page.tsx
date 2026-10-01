"use client";

import { useEffect, useState } from "react";
import LayoutProtegido from "../../../../componentes/layout/LayoutProtegido";
import {
  asignarPermisosRol,
  obtenerRoles,
} from "../../../../servicios/control-acceso/roles.service";
import { obtenerPermisos } from "../../../../servicios/control-acceso/permisos.service";
import { Rol } from "../../../../tipos/rol";
import { Permiso } from "../../../../tipos/permiso";

export default function GestionRoles() {
  const [roles, setRoles] = useState<Rol[]>([]);
  const [permisos, setPermisos] = useState<Permiso[]>([]);
  const [rol, setRol] = useState<Rol | null>(null);
  const [seleccion, setSeleccion] = useState<number[]>([]);
  const [mensaje, setMensaje] = useState("");

  const cargar = async () => {
    const [rolesApi, permisosApi] = await Promise.all([
      obtenerRoles(),
      obtenerPermisos(),
    ]);
    setRoles(rolesApi);
    setPermisos(permisosApi);
  };

  useEffect(() => {
    const iniciar = async () => cargar();
    void iniciar();
  }, []);

  const seleccionarRol = (seleccionado: Rol) => {
    setRol(seleccionado);
    setSeleccion(
      seleccionado.permisos?.map(
        (item) => item.permiso?.id_permiso ?? item.id_permiso,
      ) ?? [],
    );
  };

  const guardar = async () => {
    if (!rol || !confirm(`¿Guardar los permisos del rol ${rol.nombre}?`))
      return;
    await asignarPermisosRol(rol.id_rol, seleccion);
    setMensaje("Permisos del rol actualizados correctamente.");
    setRol(null);
    await cargar();
  };

  return (
    <LayoutProtegido>
      <div className="min-w-0 space-y-5">
        <header>
          <h1 className="text-2xl font-bold">Gestión de roles</h1>
          <p className="text-sm text-gray-500">
            Seleccione uno de los siete roles institucionales para administrar
            sus permisos.
          </p>
        </header>
        {mensaje && (
          <div className="rounded-lg border border-green-300 bg-green-50 p-3 text-green-900">
            {mensaje}
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {roles.map((item) => (
            <button
              key={item.id_rol}
              onClick={() => seleccionarRol(item)}
              className={`min-w-0 rounded-lg border-2 p-4 text-left shadow-sm transition active:scale-[.98] ${rol?.id_rol === item.id_rol ? "border-lime-600 bg-lime-50 ring-2 ring-lime-200" : "border-slate-700 bg-white hover:bg-slate-50"}`}
            >
              <strong className="block break-words">{item.nombre}</strong>
              <span className="mt-1 block text-sm text-gray-500">
                {item.permisos?.length ?? 0} permisos
              </span>
            </button>
          ))}
        </div>
        {rol && (
          <section className="rounded-xl border bg-white p-4 shadow sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-bold">Permisos de {rol.nombre}</h2>
              <button
                onClick={() =>
                  setSeleccion(
                    seleccion.length === permisos.length
                      ? []
                      : permisos.map((item) => item.id_permiso),
                  )
                }
                className="rounded-lg border-2 border-slate-700 px-3 py-2 text-sm font-semibold"
              >
                {seleccion.length === permisos.length
                  ? "Desmarcar todos"
                  : "Marcar todos"}
              </button>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {permisos.map((permiso) => (
                <label
                  key={permiso.id_permiso}
                  className="flex min-w-0 cursor-pointer items-start gap-3 rounded-lg border p-3 hover:bg-gray-50"
                >
                  <input
                    type="checkbox"
                    className="mt-0.5 size-5 shrink-0 accent-green-700"
                    checked={seleccion.includes(permiso.id_permiso)}
                    onChange={() =>
                      setSeleccion((actual) =>
                        actual.includes(permiso.id_permiso)
                          ? actual.filter((id) => id !== permiso.id_permiso)
                          : [...actual, permiso.id_permiso],
                      )
                    }
                  />
                  <span className="min-w-0 break-words text-sm">
                    {permiso.nombre.replaceAll("_", " ")}
                  </span>
                </label>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                onClick={() => setRol(null)}
                className="rounded-lg border-2 border-gray-500 px-4 py-2"
              >
                Cancelar
              </button>
              <button
                onClick={guardar}
                className="rounded-lg border-2 border-green-950 bg-green-700 px-4 py-2 font-semibold text-white hover:bg-green-600"
              >
                Guardar permisos
              </button>
            </div>
          </section>
        )}
      </div>
    </LayoutProtegido>
  );
}
