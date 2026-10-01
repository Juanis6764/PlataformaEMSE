"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import LayoutProtegido from "../../../../componentes/layout/LayoutProtegido";
import {
  actualizarCadete,
  actualizarUsuarioCadete,
  cambiarCurso,
  cambiarEstadoUsuario,
  crearCadete,
  obtenerCadetes,
  obtenerCursos,
  restablecerPassword,
} from "../../../../servicios/control-acceso/cadetes.service";
import {
  Cadete,
  CrearCadete,
  Curso,
  EstadoCadete,
} from "../../../../tipos/cadete";
import { obtenerPeriodoActivoAdmin } from "../../../../servicios/gestion-academica.service";
import { PeriodoLectivo } from "../../../../tipos/gestion-academica";
import { AxiosError } from "axios";
import { mensajeCampoPersona } from "../../../../validaciones/persona";
import { useAuth } from "../../../../contextos/AuthContext";
import {
  CambioPresencia,
  conectarPresencia,
} from "../../../../servicios/presencia.service";
import { obtenerPresenciaUsuarios } from "../../../../servicios/control-acceso/usuarios.service";

type Vista = "todos" | "primero" | "segundo" | "tercero" | "egresados";
const ARMAS = [
  "Inf.",
  "Cab.",
  "Art.",
  "Ing.",
  "Com.",
  "Int.",
  "Mot.",
  "San.",
  "MB.",
  "Otra",
];
const vacio = (): Omit<CrearCadete, "id_curso"> & {
  id_curso: number | "";
} => ({
  nombres: "",
  apellidos: "",
  ci: "",
  correo: "",
  estado: "ACTIVO",
  estado_cadete: "REGULAR",
  id_curso: "",
  gestion_ingreso: new Date().getFullYear(),
  arma: null,
});
const mensajeError = (error: unknown) => {
  if (error instanceof AxiosError) {
    const message = error.response?.data?.message;
    return Array.isArray(message)
      ? message.join(". ")
      : message || "No fue posible completar la operación.";
  }
  return error instanceof Error ? error.message : "Error inesperado.";
};

export default function GestionCadetes() {
  const { token } = useAuth();
  const [vista, setVista] = useState<Vista>("todos");
  const [cadetes, setCadetes] = useState<Cadete[]>([]);
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [periodoActivo, setPeriodoActivo] = useState<
    (PeriodoLectivo & { gestion: { ano: number } }) | null
  >(null);
  const [buscar, setBuscar] = useState("");
  const [estado, setEstado] = useState<EstadoCadete | "">("");
  const [form, setForm] = useState(vacio());
  const [editando, setEditando] = useState<Cadete | null>(null);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [mensaje, setMensaje] = useState<{
    tipo: "ok" | "error";
    texto: string;
  } | null>(null);
  const [cargando, setCargando] = useState(true);

  const cursosOficiales = useMemo(
    () =>
      [1, 2, 3]
        .map(
          (orden) =>
            cursos
              .filter((curso) => curso.orden === orden)
              .sort(
                (a, b) => (b._count?.cadetes ?? 0) - (a._count?.cadetes ?? 0),
              )[0],
        )
        .filter((curso): curso is Curso => Boolean(curso)),
    [cursos],
  );
  const cursoVista = useMemo(() => {
    const orden =
      vista === "primero"
        ? 1
        : vista === "segundo"
          ? 2
          : vista === "tercero"
            ? 3
            : 0;
    if (!orden) return undefined;
    return cursosOficiales.find((curso) => curso.orden === orden);
  }, [cursosOficiales, vista]);
  const cursoFormulario = cursosOficiales.find(
    (c) => c.id_curso === Number(form.id_curso),
  );
  const requiereArma = Boolean(cursoFormulario && cursoFormulario.orden !== 1);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const id_curso = cursoVista?.id_curso;
      const estado_cadete =
        vista === "egresados" ? "EGRESADO" : estado || undefined;
      const respuesta = await obtenerCadetes({
        buscar: buscar || undefined,
        id_curso,
        estado_cadete,
        limite: 200,
      });
      setCadetes(Array.isArray(respuesta.data) ? respuesta.data : []);
    } catch (e) {
      setMensaje({ tipo: "error", texto: mensajeError(e) });
    } finally {
      setCargando(false);
    }
  }, [buscar, cursoVista, estado, vista]);

  useEffect(() => {
    Promise.all([obtenerCursos(), obtenerPeriodoActivoAdmin()])
      .then(([cursosDisponibles, periodo]) => {
        setCursos(cursosDisponibles);
        setPeriodoActivo(periodo);
      })
      .catch((e) => setMensaje({ tipo: "error", texto: mensajeError(e) }));
  }, []);
  useEffect(() => {
    const iniciar = async () => cargar();
    void iniciar();
  }, [cargar]);
  useEffect(() => {
    if (!token) return;
    const socket = conectarPresencia(token);
    const actualizarFila = (cambio: CambioPresencia) => {
      setCadetes((actuales) =>
        actuales.map((cadete) =>
          cadete.id_usuario === cambio.id_usuario
            ? {
                ...cadete,
                usuario: {
                  ...cadete.usuario,
                  estado_conexion: cambio.estado_conexion,
                },
              }
            : cadete,
        ),
      );
    };
    const actualizarRespaldo = async () => {
      if (socket.connected) return;
      try {
        const conectados = new Set(
          (await obtenerPresenciaUsuarios()).map(({ id_usuario }) => id_usuario),
        );
        setCadetes((actuales) =>
          actuales.map((cadete) => ({
            ...cadete,
            usuario: {
              ...cadete.usuario,
              estado_conexion: conectados.has(cadete.id_usuario)
                ? "EN_LINEA"
                : "DESCONECTADO",
            },
          })),
        );
      } catch {
        // La próxima ejecución reintentará sin interrumpir la gestión.
      }
    };

    socket.on("presencia:estado", actualizarFila);
    const respaldo = window.setInterval(actualizarRespaldo, 30_000);
    return () => {
      socket.off("presencia:estado", actualizarFila);
      window.clearInterval(respaldo);
    };
  }, [token]);

  const abrirNuevo = () => {
    const siguiente = vacio();
    if (cursoVista) siguiente.id_curso = cursoVista.id_curso;
    setEditando(null);
    setForm(siguiente);
    setMostrarForm(true);
  };
  const abrirEditar = (c: Cadete) => {
    setEditando(c);
    setForm({
      nombres: c.usuario.nombres,
      apellidos: c.usuario.apellidos,
      ci: c.usuario.ci,
      correo: c.usuario.correo || "",
      estado: c.usuario.estado,
      estado_cadete: c.estado_cadete,
      id_curso: c.id_curso,
      gestion_ingreso: c.gestion_ingreso,
      arma: c.arma,
    });
    setMostrarForm(true);
  };
  const cambiarCampo = (campo: string, valor: string | number | null) => {
    if (typeof valor === "string") {
      const validacion = mensajeCampoPersona(campo, valor);
      if (validacion) setMensaje({ tipo: "error", texto: validacion });
      else if (["ci", "nombres", "apellidos", "correo"].includes(campo))
        setMensaje(null);
    }
    setForm((actual) => {
      const nuevo = { ...actual, [campo]: valor };
      if (
        campo === "id_curso" &&
        cursos.find((c) => c.id_curso === Number(valor))?.orden === 1
      )
        nuevo.arma = null;
      return nuevo;
    });
  };
  const guardar = async (e: FormEvent) => {
    e.preventDefault();
    setMensaje(null);
    try {
      if (!form.id_curso) throw new Error("El curso es obligatorio.");
      if (!/^[\p{L} ]+$/u.test(form.nombres.trim()))
        throw new Error("Los nombres solo pueden contener letras y espacios.");
      if (!/^[\p{L} ]+$/u.test(form.apellidos.trim()))
        throw new Error(
          "Los apellidos solo pueden contener letras y espacios.",
        );
      if (!/^\d+$/.test(form.ci.trim()))
        throw new Error("El CI solo puede contener números.");
      if (!/^\S+@\S+\.\S+$/.test(form.correo.trim()))
        throw new Error("El correo electrónico no tiene un formato válido.");
      if (requiereArma && !form.arma?.trim())
        throw new Error("El arma es obligatoria para Segundo y Tercer Año.");
      if (editando) {
        await actualizarUsuarioCadete(editando.id_usuario, {
          ci: form.ci,
          nombres: form.nombres,
          apellidos: form.apellidos,
          correo: form.correo,
        });
        await actualizarCadete(editando.id_cadete, {
          arma: requiereArma ? form.arma : null,
          estado_cadete: form.estado_cadete,
        });
        if (editando.id_curso !== Number(form.id_curso)) {
          if (!periodoActivo) {
            throw new Error(
              "Debe existir un periodo lectivo activo para cambiar de curso.",
            );
          }
          await cambiarCurso(
            editando.id_cadete,
            Number(form.id_curso),
            periodoActivo.id_periodo,
          );
        }
      } else {
        await crearCadete({
          ...form,
          id_curso: Number(form.id_curso),
          arma: requiereArma ? form.arma : null,
        });
      }
      setMostrarForm(false);
      setMensaje({
        tipo: "ok",
        texto: editando
          ? "Estudiante actualizado."
          : "Estudiante creado correctamente.",
      });
      await cargar();
    } catch (err) {
      setMensaje({ tipo: "error", texto: mensajeError(err) });
    }
  };
  const accion = async (fn: () => Promise<unknown>, texto: string) => {
    try {
      await fn();
      setMensaje({ tipo: "ok", texto });
      await cargar();
    } catch (e) {
      setMensaje({ tipo: "error", texto: mensajeError(e) });
    }
  };

  return (
    <LayoutProtegido>
      <div className="space-y-5">
        <div className="flex flex-wrap justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-night-blue)]">
              Gestión de Estudiantes
            </h1>
            <p className="text-sm text-gray-500">
              Administración de datos, cursos y estados.
            </p>
          </div>
          {vista !== "egresados" && (
            <button
              onClick={abrirNuevo}
              className="rounded-lg bg-[var(--color-military-green)] px-4 py-2 font-semibold text-white shadow-md transition-all hover:-translate-y-0.5 hover:bg-[var(--color-military-green-light)] hover:shadow-lg active:translate-y-0 active:scale-95 active:shadow-inner"
            >
              Añadir estudiante
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {(
            ["todos", "primero", "segundo", "tercero", "egresados"] as Vista[]
          ).map((v) => (
            <button
              key={v}
              onClick={() => {
                setBuscar("");
                setEstado("");
                setVista(v);
                setMostrarForm(false);
              }}
              className={`rounded-lg border px-4 py-2 text-sm font-semibold shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md active:scale-95 active:shadow-inner ${vista === v ? "border-[var(--color-night-blue)] bg-[var(--color-night-blue)] text-white ring-2 ring-[var(--color-night-blue)]/20" : "border-gray-200 bg-white text-gray-700 hover:border-[var(--color-military-green)] hover:text-[var(--color-military-green)]"}`}
            >
              {
                {
                  todos: "Todos",
                  primero: "1er Año",
                  segundo: "2do Año",
                  tercero: "3er Año",
                  egresados: "Egresados",
                }[v]
              }
            </button>
          ))}
        </div>
        <div className="flex gap-3">
          <input
            value={buscar}
            onChange={(e) => setBuscar(e.target.value)}
            placeholder="Buscar por CI, nombres o apellidos"
            className="w-full max-w-lg rounded border px-3 py-2"
          />
          <select
            value={estado}
            onChange={(e) => setEstado(e.target.value as EstadoCadete | "")}
            className="rounded border px-3"
          >
            <option value="">Todos los estados</option>
            <option>REGULAR</option>
            <option>BAJA</option>
            <option>EGRESADO</option>
          </select>
        </div>
        {mensaje && (
          <div
            className={`rounded border p-3 ${mensaje.tipo === "ok" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}
          >
            {mensaje.texto}
          </div>
        )}
        {mostrarForm && (
          <form
            onSubmit={guardar}
            className="grid grid-cols-1 gap-3 rounded border bg-white p-5 md:grid-cols-3"
          >
            <h2 className="md:col-span-3 font-bold">
              {editando ? "Editar estudiante" : "Nuevo estudiante"}
            </h2>
            <input
              required
              value={form.nombres}
              onChange={(e) => cambiarCampo("nombres", e.target.value)}
              placeholder="Nombres"
              className="rounded border p-2"
            />
            <input
              required
              value={form.apellidos}
              onChange={(e) => cambiarCampo("apellidos", e.target.value)}
              placeholder="Apellidos"
              className="rounded border p-2"
            />
            <input
              required
              value={form.ci}
              onChange={(e) => cambiarCampo("ci", e.target.value)}
              placeholder="CI"
              inputMode="numeric"
              pattern="[0-9]+"
              className="rounded border p-2 disabled:bg-gray-100"
            />
            <input
              required
              type="email"
              value={form.correo}
              onChange={(e) => cambiarCampo("correo", e.target.value)}
              placeholder="Correo"
              className="rounded border p-2"
            />
            <input
              required
              type="number"
              value={form.gestion_ingreso}
              onChange={(e) =>
                cambiarCampo("gestion_ingreso", Number(e.target.value))
              }
              className="rounded border p-2"
            />
            <select
              required
              disabled={vista !== "todos" && vista !== "egresados"}
              value={form.id_curso}
              onChange={(e) => cambiarCampo("id_curso", Number(e.target.value))}
              className="rounded border p-2"
            >
              <option value="">Seleccione curso</option>
              {cursosOficiales.map((c) => (
                <option key={c.id_curso} value={c.id_curso}>
                  {c.nombre}
                </option>
              ))}
            </select>
            <select
              value={form.estado_cadete}
              onChange={(e) => cambiarCampo("estado_cadete", e.target.value)}
              className="rounded border p-2"
            >
              <option>REGULAR</option>
              <option>BAJA</option>
              <option>EGRESADO</option>
            </select>
            {requiereArma && (
              <select
                required
                value={
                  form.arma && !ARMAS.slice(0, -1).includes(form.arma)
                    ? "Otra"
                    : form.arma || ""
                }
                onChange={(e) => cambiarCampo("arma", e.target.value)}
                className="rounded border p-2"
              >
                <option value="">Seleccione arma</option>
                {ARMAS.map((a) => (
                  <option key={a}>{a}</option>
                ))}
              </select>
            )}
            {form.arma && !ARMAS.slice(0, -1).includes(form.arma) && (
              <input
                required
                value={form.arma === "Otra" ? "" : form.arma}
                onChange={(e) => cambiarCampo("arma", e.target.value || "Otra")}
                placeholder="Especifique el arma"
                className="rounded border p-2"
              />
            )}
            <div className="md:col-span-3 flex gap-2">
              <button className="rounded bg-[var(--color-military-green)] px-4 py-2 text-white">
                Guardar
              </button>
              <button
                type="button"
                onClick={() => setMostrarForm(false)}
                className="rounded border px-4 py-2"
              >
                Cancelar
              </button>
            </div>
          </form>
        )}
        <div className="overflow-x-auto rounded border bg-white">
          <table className="w-full text-sm">
            <thead className="bg-[var(--color-night-blue)] text-white">
              <tr>
                {[
                  "CI",
                  "Nombre",
                  "Curso",
                  "Arma",
                  "Conexión / acceso",
                  "Acciones",
                ].map((h) => (
                  <th key={h} className="p-3 text-left">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!cargando &&
                cadetes.map((c) => (
                  <tr
                    key={c.id_cadete}
                    className="border-b transition-colors hover:bg-emerald-50/50"
                  >
                    <td className="p-3">{c.usuario.ci}</td>
                    <td className="p-3">
                      {c.usuario.apellidos}, {c.usuario.nombres}
                    </td>
                    <td className="p-3">{c.curso.nombre}</td>
                    <td className="p-3">{c.arma || "—"}</td>
                    <td className="p-3">
                      <div className="flex flex-col gap-1">
                        <span className="inline-flex items-center gap-2 whitespace-nowrap">
                          <span
                            className={`size-2.5 rounded-full ${c.usuario.estado_conexion === "EN_LINEA" ? "bg-green-500" : "bg-gray-400"}`}
                          />
                          {c.usuario.estado_conexion === "EN_LINEA"
                            ? "En línea"
                            : "Desconectado"}
                        </span>
                        <span className="text-xs text-gray-500">
                          {c.usuario.habilitado ? "Activo" : "Suspendido"} /{" "}
                          {c.estado_cadete}
                        </span>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => abrirEditar(c)}
                          className="rounded-md border-2 border-blue-900 bg-blue-50 px-3 py-1.5 font-medium text-blue-700 shadow-sm transition-all hover:bg-blue-100 hover:shadow active:scale-95"
                        >
                          ✎ Editar
                        </button>
                        <button
                          onClick={() =>
                            confirm(
                              c.usuario.habilitado
                                ? "¿Está seguro que desea suspender este estudiante?"
                                : "¿Está seguro que desea reactivar este estudiante?",
                            ) &&
                            accion(
                              () =>
                                cambiarEstadoUsuario(
                                  c.id_usuario,
                                  !c.usuario.habilitado,
                                ),
                              "Habilitación actualizada.",
                            )
                          }
                          className="rounded-md border-2 border-amber-900 bg-amber-50 px-3 py-1.5 font-medium text-amber-700 shadow-sm transition-all hover:bg-amber-100 hover:shadow active:scale-95"
                        >
                          {c.usuario.habilitado ? "⏸ Suspender" : "▶ Reactivar"}
                        </button>
                        <button
                          onClick={() =>
                            confirm("¿Restablecer contraseña?") &&
                            accion(
                              () => restablecerPassword(c.id_usuario),
                              "Contraseña restablecida correctamente. La nueva contraseña temporal es EMSE2026. (con el punto final incluido) — el estudiante deberá cambiarla en su próximo ingreso.",
                            )
                          }
                          className="rounded-md border-2 border-purple-900 bg-purple-50 px-3 py-1.5 font-medium text-purple-700 shadow-sm transition-all hover:bg-purple-100 hover:shadow active:scale-95"
                        >
                          ↻ Restablecer
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              {!cargando && cadetes.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500">
                    No hay estudiantes para esta selección.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </LayoutProtegido>
  );
}
