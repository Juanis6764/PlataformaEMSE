"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { cambiarContrasena } from "@/src/servicios/autenticacion.service";
import { useAuth } from "@/src/contextos/AuthContext";
import { AxiosError } from "axios";

function EyeIcon({ visible }: { visible: boolean }) {
  return visible ? (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  ) : (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export default function CambiarContrasena() {
  const router = useRouter();
  const { token, cargando: cargandoSesion, guardarSesion } = useAuth();
  const [contrasenaActual, setContrasenaActual] = useState("");
  const [contrasenaNueva, setContrasenaNueva] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  const [mostrar, setMostrar] = useState({
    actual: false,
    nueva: false,
    confirmar: false,
  });

  useEffect(() => {
    // Si no hay token, redirigir al login
    if (!cargandoSesion && !token) {
      router.replace("/iniciar-sesion");
    }
  }, [cargandoSesion, token, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (contrasenaNueva !== confirmar) {
      setError(
        "La confirmación de contraseña no coincide con la nueva contraseña.",
      );
      return;
    }
    if (contrasenaNueva.length < 6) {
      setError("La nueva contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (contrasenaNueva === contrasenaActual) {
      setError(
        "La nueva contraseña no puede ser igual a la contraseña actual.",
      );
      return;
    }

    if (!token) {
      router.replace("/iniciar-sesion");
      return;
    }

    setCargando(true);
    try {
      const data = await cambiarContrasena(
        token,
        contrasenaActual,
        contrasenaNueva,
      );
      await guardarSesion(data);
      router.push("/panel");
    } catch (err: unknown) {
      const datos =
        err instanceof AxiosError
          ? (err.response?.data as { message?: string; mensaje?: string })
          : undefined;
      const msg = datos?.message || datos?.mensaje || "";
      if (msg.includes("incorrecta")) {
        setError("La contraseña actual introducida es incorrecta.");
      } else if (msg.includes("utilizada recientemente")) {
        setError(
          "La nueva contraseña ya fue utilizada recientemente. Elija una diferente.",
        );
      } else {
        setError(
          msg || "No se pudo cambiar la contraseña. Intente nuevamente.",
        );
      }
    } finally {
      setCargando(false);
    }
  };

  const toggleVer = (campo: "actual" | "nueva" | "confirmar") =>
    setMostrar((prev) => ({ ...prev, [campo]: !prev[campo] }));

  const strengthLevel = (pwd: string) => {
    if (!pwd) return 0;
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    return score;
  };
  const strength = strengthLevel(contrasenaNueva);
  const strengthColors = [
    "",
    "bg-red-500",
    "bg-orange-400",
    "bg-yellow-400",
    "bg-green-500",
  ];
  const strengthLabels = ["", "Débil", "Regular", "Buena", "Fuerte"];

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-[var(--color-military-green-dark)]">
      <div className="absolute inset-0 bg-[url('/imagenes/fondo2.jpeg')] bg-cover bg-center opacity-30 mix-blend-overlay pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-military-green-dark)] via-transparent to-black/50 pointer-events-none" />

      <div className="max-w-md w-full bg-white/10 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] rounded-2xl p-8 border border-white/20 relative z-10 text-white">
        {/* Encabezado */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white/10 p-2 mb-5 shadow-[0_0_20px_rgba(212,175,55,0.4)] relative">
            <Image
              src="/imagenes/logoemse.png"
              alt="Logo EMSE"
              fill
              className="object-contain p-2 drop-shadow-xl"
            />
          </div>
          <div className="inline-flex items-center gap-2 bg-yellow-500/20 border border-yellow-400/40 rounded-full px-4 py-1 mb-3">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-yellow-400"
            >
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <span className="text-yellow-300 text-xs font-bold uppercase tracking-wider">
              Acción requerida
            </span>
          </div>
          <h2 className="text-2xl font-extrabold tracking-wide drop-shadow-md">
            Cambiar contraseña
          </h2>
          <p className="text-gray-300 text-sm mt-2">
            Es su primer ingreso. Debe establecer una contraseña personal antes
            de continuar.
          </p>
        </div>

        {error && (
          <div className="bg-red-900/40 text-red-300 p-3 rounded-md text-sm mb-5 border border-red-500/30 text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Contraseña actual */}
          <div>
            <label className="block text-sm font-semibold text-gray-200 mb-1">
              Contraseña actual (temporal)
            </label>
            <div className="relative">
              <input
                type={mostrar.actual ? "text" : "password"}
                value={contrasenaActual}
                onChange={(e) => setContrasenaActual(e.target.value)}
                className="w-full bg-black/20 border border-white/20 text-white rounded-md pl-4 pr-12 py-3 focus:outline-none focus:ring-2 focus:ring-[var(--color-soft-gold)] transition-all placeholder:text-gray-500 text-sm"
                placeholder="Ingrese su contraseña actual"
                required
                autoFocus
              />
              <button
                type="button"
                onClick={() => toggleVer("actual")}
                className="absolute inset-y-0 right-0 px-4 flex items-center text-gray-400 hover:text-white"
              >
                <EyeIcon visible={mostrar.actual} />
              </button>
            </div>
          </div>

          {/* Nueva contraseña */}
          <div>
            <label className="block text-sm font-semibold text-gray-200 mb-1">
              Nueva contraseña
            </label>
            <div className="relative">
              <input
                type={mostrar.nueva ? "text" : "password"}
                value={contrasenaNueva}
                onChange={(e) => setContrasenaNueva(e.target.value)}
                className="w-full bg-black/20 border border-white/20 text-white rounded-md pl-4 pr-12 py-3 focus:outline-none focus:ring-2 focus:ring-[var(--color-soft-gold)] transition-all placeholder:text-gray-500 text-sm"
                placeholder="Mínimo 6 caracteres"
                required
              />
              <button
                type="button"
                onClick={() => toggleVer("nueva")}
                className="absolute inset-y-0 right-0 px-4 flex items-center text-gray-400 hover:text-white"
              >
                <EyeIcon visible={mostrar.nueva} />
              </button>
            </div>
            {/* Indicador de fortaleza */}
            {contrasenaNueva && (
              <div className="mt-2 space-y-1">
                <div className="flex gap-1">
                  {[1, 2, 3, 4].map((lvl) => (
                    <div
                      key={lvl}
                      className={`h-1 flex-1 rounded-full transition-all duration-300 ${strength >= lvl ? strengthColors[strength] : "bg-white/20"}`}
                    />
                  ))}
                </div>
                <p
                  className={`text-xs ${strength >= 3 ? "text-green-400" : strength >= 2 ? "text-yellow-400" : "text-red-400"}`}
                >
                  Seguridad: {strengthLabels[strength] || ""}
                </p>
              </div>
            )}
          </div>

          {/* Confirmar contraseña */}
          <div>
            <label className="block text-sm font-semibold text-gray-200 mb-1">
              Confirmar nueva contraseña
            </label>
            <div className="relative">
              <input
                type={mostrar.confirmar ? "text" : "password"}
                value={confirmar}
                onChange={(e) => setConfirmar(e.target.value)}
                className={`w-full bg-black/20 border text-white rounded-md pl-4 pr-12 py-3 focus:outline-none focus:ring-2 focus:ring-[var(--color-soft-gold)] transition-all placeholder:text-gray-500 text-sm ${
                  confirmar && contrasenaNueva !== confirmar
                    ? "border-red-500/70"
                    : "border-white/20"
                }`}
                placeholder="Repita la nueva contraseña"
                required
              />
              <button
                type="button"
                onClick={() => toggleVer("confirmar")}
                className="absolute inset-y-0 right-0 px-4 flex items-center text-gray-400 hover:text-white"
              >
                <EyeIcon visible={mostrar.confirmar} />
              </button>
            </div>
            {confirmar && contrasenaNueva !== confirmar && (
              <p className="text-xs text-red-400 mt-1">
                Las contraseñas no coinciden.
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={
              cargando ||
              contrasenaNueva !== confirmar ||
              contrasenaNueva.length < 6
            }
            className={`w-full relative overflow-hidden group bg-[var(--color-military-green)] hover:bg-[var(--color-military-green-light)] text-white font-bold py-3 px-4 rounded-md transition-all duration-300 shadow-[0_4px_15px_rgba(27,67,50,0.6)] mt-2 ${
              cargando ||
              contrasenaNueva !== confirmar ||
              contrasenaNueva.length < 6
                ? "opacity-60 cursor-not-allowed"
                : "hover:scale-[1.02]"
            }`}
          >
            <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
            <span className="relative z-10 tracking-wider uppercase text-sm">
              {cargando ? "Guardando..." : "Establecer contraseña e ingresar"}
            </span>
          </button>
        </form>

        <p className="text-center text-xs text-gray-500 mt-6">
          Plataforma EMSE — Escuela Militar de Sargentos del Ejército
        </p>
      </div>
    </div>
  );
}
