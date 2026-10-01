import { FormEvent, useState } from "react";
import { CrearUsuarioDatos } from "../../servicios/control-acceso/usuarios.service";
import { Rol } from "../../tipos/rol";
import { Seccion } from "../../tipos/seccion";
import { AxiosError } from "axios";
import { mensajeCampoPersona } from "../../validaciones/persona";

interface Props {
  roles: Rol[];
  secciones: Seccion[];
  onSubmit: (datos: CrearUsuarioDatos) => Promise<void>;
  onCancel: () => void;
}

export default function FormularioUsuario({
  roles,
  secciones,
  onSubmit,
  onCancel,
}: Props) {
  const [form, setForm] = useState({
    ci: "",
    nombres: "",
    apellidos: "",
    correo: "",
    contrasena: "",
    id_rol: "",
    id_seccion: "",
    es_mixto: false,
  });
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  const texto = (campo: string, valor: string) => {
    setForm((actual) => ({ ...actual, [campo]: valor }));
    setError(mensajeCampoPersona(campo, valor));
  };
  const guardar = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    if (
      !form.ci.trim() ||
      !form.nombres.trim() ||
      !form.apellidos.trim() ||
      !form.id_rol
    )
      return setError("Complete los campos obligatorios.");
    if (!/^[\p{L} ]+$/u.test(form.nombres.trim()))
      return setError("Los nombres solo pueden contener letras y espacios.");
    if (!/^[\p{L} ]+$/u.test(form.apellidos.trim()))
      return setError("Los apellidos solo pueden contener letras y espacios.");
    if (!/^\d+$/.test(form.ci.trim()))
      return setError("El CI solo puede contener números.");
    if (form.correo && !/^\S+@\S+\.\S+$/.test(form.correo.trim()))
      return setError("El correo electrónico no tiene un formato válido.");
    try {
      setCargando(true);
      await onSubmit({
        ...form,
        id_rol: Number(form.id_rol),
        id_seccion: form.id_seccion ? Number(form.id_seccion) : undefined,
      });
    } catch (e: unknown) {
      const datos =
        e instanceof AxiosError
          ? (e.response?.data as { message?: string })
          : undefined;
      setError(datos?.message || "No se pudo crear el usuario.");
    } finally {
      setCargando(false);
    }
  };
  return (
    <form
      onSubmit={guardar}
      className="rounded-lg border border-gray-200 bg-white p-6 shadow"
    >
      <h2 className="mb-4 text-lg font-semibold text-[var(--color-military-green-dark)]">
        Registrar nuevo usuario
      </h2>
      {error && (
        <div className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-red-700">
          {error}
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        <input
          required
          value={form.ci}
          inputMode="numeric"
          pattern="[0-9]+"
          onChange={(e) => texto("ci", e.target.value)}
          placeholder="CI"
          className="rounded border p-2"
        />
        <input
          value={form.contrasena}
          onChange={(e) => texto("contrasena", e.target.value)}
          placeholder="Contraseña temporal (opcional)"
          type="password"
          className="rounded border p-2"
        />
        <input
          required
          value={form.nombres}
          pattern="[A-Za-zÀ-ÿ ]+"
          onChange={(e) => texto("nombres", e.target.value)}
          placeholder="Nombres"
          className="rounded border p-2"
        />
        <input
          required
          value={form.apellidos}
          pattern="[A-Za-zÀ-ÿ ]+"
          onChange={(e) => texto("apellidos", e.target.value)}
          placeholder="Apellidos"
          className="rounded border p-2"
        />
        <input
          value={form.correo}
          onChange={(e) => texto("correo", e.target.value)}
          placeholder="Correo"
          type="email"
          className="rounded border p-2"
        />
        <label className="flex items-center gap-2 rounded border p-2">
          <input
            type="checkbox"
            checked={form.es_mixto}
            onChange={(e) => setForm({ ...form, es_mixto: e.target.checked })}
          />{" "}
          Usuario mixto
        </label>
        <select
          required
          value={form.id_rol}
          onChange={(e) => texto("id_rol", e.target.value)}
          className="rounded border p-2"
        >
          <option value="">Seleccione rol</option>
          {roles.map((r) => (
            <option key={r.id_rol} value={r.id_rol}>
              {r.nombre}
            </option>
          ))}
        </select>
        <select
          value={form.id_seccion}
          onChange={(e) => texto("id_seccion", e.target.value)}
          className="rounded border p-2"
        >
          <option value="">Sin sección</option>
          {secciones.map((s) => (
            <option key={s.id_seccion} value={s.id_seccion}>
              {s.nombre}
            </option>
          ))}
        </select>
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded border px-4 py-2"
        >
          Cancelar
        </button>
        <button
          disabled={cargando}
          className="rounded bg-[var(--color-military-green)] px-4 py-2 text-white"
        >
          {cargando ? "Guardando…" : "Guardar"}
        </button>
      </div>
    </form>
  );
}
