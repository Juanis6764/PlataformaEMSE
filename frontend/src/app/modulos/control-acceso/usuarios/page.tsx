"use client";
import { useEffect, useState } from "react";
import LayoutProtegido from "../../../../componentes/layout/LayoutProtegido";
import FormularioUsuario from "../../../../componentes/control-acceso/FormularioUsuario";
import {
  actualizarPermisosUsuario,
  actualizarUsuario,
  cambiarEstadoUsuario,
  crearUsuario,
  CrearUsuarioDatos,
  obtenerUsuario,
  obtenerUsuarios,
  obtenerPresenciaUsuarios,
  restablecerContrasenaUsuario,
} from "../../../../servicios/control-acceso/usuarios.service";
import { obtenerPermisos } from "../../../../servicios/control-acceso/permisos.service";
import { Permiso } from "../../../../tipos/permiso";
import { obtenerRoles } from "../../../../servicios/control-acceso/roles.service";
import { obtenerSecciones } from "../../../../servicios/control-acceso/secciones.service";
import { obtenerCursos } from "../../../../servicios/control-acceso/cadetes.service";
import { UsuarioListado } from "../../../../tipos/usuario";
import { Rol } from "../../../../tipos/rol";
import { Seccion } from "../../../../tipos/seccion";
import { Curso } from "../../../../tipos/cadete";
import { mensajeCampoPersona } from "../../../../validaciones/persona";
import { useAuth } from "../../../../contextos/AuthContext";
import {
  CambioPresencia,
  conectarPresencia,
} from "../../../../servicios/presencia.service";

export default function GestionUsuarios() {
  const { token } = useAuth();
  const [usuarios, setUsuarios] = useState<UsuarioListado[]>([]),
    [roles, setRoles] = useState<Rol[]>([]),
    [secciones, setSecciones] = useState<Seccion[]>([]),
    [permisos, setPermisos] = useState<Permiso[]>([]),
    [cursos, setCursos] = useState<Curso[]>([]),
    [nuevo, setNuevo] = useState(false),
    [editando, setEditando] = useState<UsuarioListado | null>(null),
    [pestana, setPestana] = useState<"datos" | "permisos">("datos"),
    [mensaje, setMensaje] = useState("");
  const cargar = async () => {
    const [u, r, s, p, c] = await Promise.all([
      obtenerUsuarios(),
      obtenerRoles(),
      obtenerSecciones(),
      obtenerPermisos(),
      obtenerCursos(),
    ]);
    setUsuarios(u.data);
    setRoles(r);
    setSecciones(s);
    setPermisos(p);
    setCursos(c);
  };
  useEffect(() => {
    const iniciar = async () => cargar();
    void iniciar();
  }, []);
  useEffect(() => {
    if (!token) return;
    const socket = conectarPresencia(token);
    const actualizarFila = (cambio: CambioPresencia) => {
      setUsuarios((actuales) =>
        actuales.map((usuario) =>
          usuario.id_usuario === cambio.id_usuario
            ? { ...usuario, estado_conexion: cambio.estado_conexion }
            : usuario,
        ),
      );
    };
    const actualizarRespaldo = async () => {
      if (socket.connected) return;
      try {
        const conectados = new Set(
          (await obtenerPresenciaUsuarios()).map(({ id_usuario }) => id_usuario),
        );
        setUsuarios((actuales) =>
          actuales.map((usuario) => ({
            ...usuario,
            estado_conexion: conectados.has(usuario.id_usuario)
              ? "EN_LINEA"
              : "DESCONECTADO",
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
  const confirmar = (
    texto: string,
    accion: () => Promise<unknown>,
    mensajeExito = "Operación completada.",
  ) => {
    if (!confirm(`¿Está seguro que desea ${texto}?`)) return;
    void accion()
      .then(() => {
        setMensaje(mensajeExito);
        return cargar();
      })
      .catch(() => setMensaje("No se pudo completar la operación."));
  };
  return (
    <LayoutProtegido>
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Gestión de usuarios</h1>
            <p className="text-sm text-gray-500">
              Datos personales, acceso, rol y subsección.
            </p>
          </div>
          <button
            onClick={() => setNuevo(true)}
            className="rounded-lg border-2 border-green-950 bg-[var(--color-military-green)] px-4 py-2 text-white hover:bg-green-700 active:scale-95"
          >
            ＋ Nuevo usuario
          </button>
        </div>
        {mensaje && (
          <div className="rounded border bg-white p-3">{mensaje}</div>
        )}
        {nuevo && (
          <FormularioUsuario
            roles={roles}
            secciones={secciones}
            onCancel={() => setNuevo(false)}
            onSubmit={async (d: CrearUsuarioDatos) => {
              await crearUsuario(d);
              setNuevo(false);
              await cargar();
            }}
          />
        )}
        <div className="w-full overflow-x-auto rounded border bg-white">
          <table className="min-w-[850px] w-full text-sm">
            <thead className="bg-[var(--color-night-blue)] text-white">
              <tr>
                {[
                  "CI",
                  "Nombre",
                  "Correo",
                  "Rol",
                  "Subsección",
                  "Conexión",
                  "Acceso",
                  "Acciones",
                ].map((h) => (
                  <th key={h} className="p-3 text-left">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u) => (
                <tr key={u.id_usuario} className="border-t">
                  <td className="p-3">{u.ci}</td>
                  <td>
                    {u.apellidos}, {u.nombres}
                  </td>
                  <td>{u.correo || "—"}</td>
                  <td>{u.rol?.nombre}</td>
                  <td>{u.seccion?.nombre || "—"}</td>
                  <td className="p-3">
                    <span className="inline-flex items-center gap-2 whitespace-nowrap">
                      <span
                        className={`size-2.5 rounded-full ${u.estado_conexion === "EN_LINEA" ? "bg-green-500" : "bg-gray-400"}`}
                      />
                      {u.estado_conexion === "EN_LINEA"
                        ? "En línea"
                        : "Desconectado"}
                    </span>
                  </td>
                  <td className="p-3">
                    {u.habilitado ? "Activo" : "Suspendido"}
                  </td>
                  <td className="p-2">
                    <div className="flex gap-2">
                      <button
                        onClick={async () => {
                          setPestana("datos");
                          setEditando(await obtenerUsuario(u.id_usuario));
                        }}
                        className="rounded border-2 border-blue-900 bg-blue-100 px-2 py-1 text-blue-900 hover:bg-blue-600 hover:text-white active:scale-95"
                      >
                        ✎ Editar
                      </button>
                      <button
                        onClick={() =>
                          confirmar(
                            u.habilitado
                              ? "suspender este usuario"
                              : "reactivar este usuario",
                            () =>
                              cambiarEstadoUsuario(u.id_usuario, !u.habilitado),
                          )
                        }
                        className="rounded border-2 border-amber-900 bg-amber-100 px-2 py-1 text-amber-900 hover:bg-amber-500 active:scale-95"
                      >
                        {u.habilitado ? "⏸ Suspender" : "▶ Reactivar"}
                      </button>
                      <button
                        onClick={() =>
                          confirmar(
                            "restablecer la contraseña",
                            () => restablecerContrasenaUsuario(u.id_usuario),
                            "Contraseña restablecida correctamente. La nueva contraseña temporal es EMSE2026. (con el punto final incluido) — el usuario deberá cambiarla en su próximo ingreso.",
                          )
                        }
                        className="rounded border-2 border-purple-900 bg-purple-100 px-2 py-1 text-purple-900 hover:bg-purple-600 hover:text-white active:scale-95"
                      >
                        ↻ Clave
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {editando && (
          <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-3">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!/^[\p{L} ]+$/u.test(editando.nombres.trim())) {
                  setMensaje(
                    "Los nombres solo pueden contener letras y espacios.",
                  );
                  return;
                }
                if (!/^[\p{L} ]+$/u.test(editando.apellidos.trim())) {
                  setMensaje(
                    "Los apellidos solo pueden contener letras y espacios.",
                  );
                  return;
                }
                if (!/^\d+$/.test(editando.ci.trim())) {
                  setMensaje("El CI solo puede contener números.");
                  return;
                }
                if (
                  editando.correo &&
                  !/^\S+@\S+\.\S+$/.test(editando.correo)
                ) {
                  setMensaje(
                    "El correo electrónico no tiene un formato válido.",
                  );
                  return;
                }
                confirmar("guardar los cambios", async () => {
                  await actualizarUsuario(editando.id_usuario, {
                    ci: editando.ci,
                    nombres: editando.nombres,
                    apellidos: editando.apellidos,
                    correo: editando.correo,
                    id_rol: editando.id_rol,
                    id_seccion: editando.id_seccion,
                    es_mixto: editando.es_mixto,
                    habilitado: editando.habilitado,
                    id_curso: editando.cadete?.id_curso,
                  });
                  await actualizarPermisosUsuario(
                    editando.id_usuario,
                    (editando.permisos_individuales || []).map(
                      ({ id_permiso, concedido }) => ({
                        id_permiso,
                        concedido,
                      }),
                    ),
                  );
                  setEditando(null);
                });
              }}
              className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-5 shadow-xl"
            >
              <h2 className="mb-4 text-xl font-bold">Editar usuario</h2>
              <div className="mb-4 flex border-b">
                <button
                  type="button"
                  onClick={() => setPestana("datos")}
                  className={`px-4 py-2 font-semibold ${pestana === "datos" ? "border-b-2 border-green-700 text-green-800" : "text-gray-500"}`}
                >
                  Datos generales
                </button>
                <button
                  type="button"
                  onClick={() => setPestana("permisos")}
                  className={`px-4 py-2 font-semibold ${pestana === "permisos" ? "border-b-2 border-green-700 text-green-800" : "text-gray-500"}`}
                >
                  Permisos individuales
                </button>
              </div>
              {pestana === "datos" && (
                <div className="grid gap-3 sm:grid-cols-2">
                  {(["ci", "nombres", "apellidos", "correo"] as const).map(
                    (k) => (
                      <input
                        key={k}
                        value={editando[k] || ""}
                        required={k !== "correo"}
                        type={k === "correo" ? "email" : "text"}
                        inputMode={k === "ci" ? "numeric" : undefined}
                        pattern={
                          k === "ci"
                            ? "[0-9]+"
                            : k === "nombres" || k === "apellidos"
                              ? "[A-Za-zÀ-ÿ ]+"
                              : undefined
                        }
                        onChange={(e) => {
                          setEditando({ ...editando, [k]: e.target.value });
                          setMensaje(mensajeCampoPersona(k, e.target.value));
                        }}
                        placeholder={k}
                        className="rounded border p-2"
                      />
                    ),
                  )}
                  <select
                    value={editando.id_rol || editando.rol?.id_rol}
                    onChange={(e) =>
                      setEditando({
                        ...editando,
                        id_rol: Number(e.target.value),
                      })
                    }
                    className="rounded border p-2"
                  >
                    {roles.map((r) => (
                      <option key={r.id_rol} value={r.id_rol}>
                        {r.nombre}
                      </option>
                    ))}
                  </select>
                  <select
                    value={editando.id_seccion || ""}
                    onChange={(e) =>
                      setEditando({
                        ...editando,
                        id_seccion: e.target.value
                          ? Number(e.target.value)
                          : null,
                      })
                    }
                    className="rounded border p-2"
                  >
                    <option value="">Sin sección</option>
                    {secciones.map((s) => (
                      <option key={s.id_seccion} value={s.id_seccion}>
                        {s.nombre}
                      </option>
                    ))}
                  </select>
                  <label>
                    <input
                      type="checkbox"
                      checked={editando.es_mixto}
                      onChange={(e) =>
                        setEditando({ ...editando, es_mixto: e.target.checked })
                      }
                    />{" "}
                    Usuario mixto
                  </label>
                  <label className="flex items-center gap-2 rounded border p-2">
                    <input
                      type="checkbox"
                      className="size-5 accent-green-700"
                      checked={editando.habilitado}
                      onChange={(e) =>
                        setEditando({
                          ...editando,
                          habilitado: e.target.checked,
                        })
                      }
                    />
                    Acceso administrativo activo
                  </label>
                  {editando.cadete && (
                    <select
                      value={editando.cadete.id_curso}
                      onChange={(e) =>
                        setEditando({
                          ...editando,
                          cadete: {
                            ...editando.cadete!,
                            id_curso: Number(e.target.value),
                          },
                        })
                      }
                      className="rounded border p-2"
                    >
                      {cursos.map((curso) => (
                        <option key={curso.id_curso} value={curso.id_curso}>
                          {curso.nombre}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}
              {pestana === "permisos" && (
                <fieldset className="mt-5 rounded-lg border p-3">
                  <legend className="px-2 font-semibold">
                    Permisos individuales
                  </legend>
                  <p className="mb-3 text-sm text-gray-500">
                    Heredado usa la configuración del rol. Las excepciones se
                    aplican solamente a este usuario.
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {permisos.map((permiso) => {
                      const excepcion = editando.permisos_individuales?.find(
                        (item) => item.id_permiso === permiso.id_permiso,
                      );
                      const heredado = Boolean(
                        editando.rol?.permisos?.some(
                          (item) =>
                            (item.permiso?.id_permiso ?? item.id_permiso) ===
                            permiso.id_permiso,
                        ),
                      );
                      const asignado = excepcion
                        ? excepcion.concedido
                        : heredado;
                      return (
                        <label
                          key={permiso.id_permiso}
                          className="flex items-center justify-between gap-2 rounded border p-2 text-sm"
                        >
                          <span>
                            {permiso.nombre}
                            {heredado ? " (heredado por rol)" : ""}
                            {excepcion?.concedido ? " (individual)" : ""}
                            {excepcion && !excepcion.concedido
                              ? " (revocado)"
                              : ""}
                          </span>
                          <input
                            type="checkbox"
                            checked={asignado}
                            onChange={(event) => {
                              const restantes = (
                                editando.permisos_individuales || []
                              ).filter(
                                (item) =>
                                  item.id_permiso !== permiso.id_permiso,
                              );
                              const marcado = event.target.checked;
                              setEditando({
                                ...editando,
                                permisos_individuales:
                                  marcado === heredado
                                    ? restantes
                                    : [
                                        ...restantes,
                                        {
                                          id_permiso: permiso.id_permiso,
                                          concedido: marcado,
                                          permiso: {
                                            id_permiso: permiso.id_permiso,
                                            nombre: permiso.nombre,
                                          },
                                        },
                                      ],
                              });
                            }}
                          />
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
              )}
              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditando(null)}
                  className="rounded border px-4 py-2"
                >
                  Cancelar
                </button>
                <button className="rounded border-2 border-green-950 bg-green-700 px-4 py-2 text-white">
                  Guardar
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </LayoutProtegido>
  );
}
