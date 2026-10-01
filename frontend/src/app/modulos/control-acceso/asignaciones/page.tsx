"use client";

import { useEffect, useState } from "react";
import LayoutProtegido from "../../../../componentes/layout/LayoutProtegido";
import {
  Asignacion,
  listarAsignaciones,
} from "../../../../servicios/control-acceso/asignaciones.service";

function EstadoConexion({
  estado,
}: {
  estado: Asignacion["usuario"]["estado_conexion"];
}) {
  const conectado = estado === "EN_LINEA";
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap">
      <span
        className={`size-2.5 rounded-full ${conectado ? "bg-green-500" : "bg-gray-400"}`}
      />
      {conectado ? "En línea" : "Desconectado"}
    </span>
  );
}

export default function Asignaciones() {
  const [items, setItems] = useState<Asignacion[]>([]);
  useEffect(() => {
    const cargar = async () => setItems(await listarAsignaciones());
    void cargar();
  }, []);

  return (
    <LayoutProtegido>
      <div className="min-w-0 space-y-4">
        <header>
          <h1 className="text-2xl font-bold">Asignaciones académicas</h1>
          <p className="text-sm text-gray-500">
            Responsables y operadores por subsección institucional y curso.
          </p>
        </header>
        <div className="w-full overflow-x-auto rounded-lg border bg-white shadow-sm">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-[var(--color-night-blue)] text-white">
              <tr>
                {[
                  "Usuario",
                  "Subsección",
                  "Responsabilidad",
                  "Curso",
                  "Conexión",
                  "Acceso",
                ].map((titulo) => (
                  <th key={titulo} className="p-3 text-left font-semibold">
                    {titulo}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((asignacion) => (
                <tr
                  key={asignacion.id_asignacion}
                  className="border-t hover:bg-gray-50"
                >
                  <td className="p-3">
                    {asignacion.usuario.apellidos} {asignacion.usuario.nombres}
                  </td>
                  <td className="p-3">{asignacion.seccion.nombre}</td>
                  <td className="p-3">{asignacion.tipo}</td>
                  <td className="p-3">
                    {asignacion.curso?.nombre ?? "Todos los cursos"}
                  </td>
                  <td className="p-3">
                    <EstadoConexion
                      estado={asignacion.usuario.estado_conexion}
                    />
                  </td>
                  <td className="p-3">
                    {asignacion.usuario.habilitado ? "Activo" : "Suspendido"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </LayoutProtegido>
  );
}
