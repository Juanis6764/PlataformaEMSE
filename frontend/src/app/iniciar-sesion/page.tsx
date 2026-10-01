"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  iniciarSesion,
  verificarCodigo,
} from "../../servicios/autenticacion.service";
import { useAuth } from "../../contextos/AuthContext";
import { AxiosError } from "axios";
import { soloNumeros } from "../../validaciones/persona";

export default function IniciarSesion() {
  const router = useRouter();
  const { guardarSesion } = useAuth();
  const [usuario, setUsuario] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [mostrarContrasena, setMostrarContrasena] = useState(false);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  // Estado paso 2 (OTP)
  const [paso, setPaso] = useState(1);
  const [ciActual, setCiActual] = useState("");
  const [correo, setCorreo] = useState("");
  // 6 casillas individuales
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // ─── Paso 1: Login ────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!usuario || !soloNumeros(usuario)) {
      setError("El CI solo puede contener números.");
      return;
    }
    setCargando(true);
    try {
      const data = await iniciarSesion(usuario, contrasena);
      if (data.requiere_verificacion) {
        setCiActual(usuario);
        setCorreo(data.correo ?? "");
        setDigits(["", "", "", "", "", ""]);
        setPaso(2);
        setTimeout(() => inputRefs.current[0]?.focus(), 100);
      } else {
        await guardarSesion(data);
        router.push("/panel");
      }
    } catch (err: unknown) {
      const datos =
        err instanceof AxiosError
          ? (err.response?.data as { message?: string; mensaje?: string })
          : undefined;
      const errMsg = datos?.message || datos?.mensaje || "";
      const estadoHttp =
        err instanceof AxiosError ? err.response?.status : undefined;
      if (estadoHttp === 403) {
        setError(
          errMsg ||
            "El acceso está bloqueado temporalmente por varios intentos. Intente nuevamente más tarde.",
        );
      } else if (errMsg.toLowerCase().includes("no tiene un correo")) {
        setError(
          "El usuario no tiene correo registrado. Comuníquese con el administrador del sistema.",
        );
      } else if (estadoHttp && estadoHttp >= 500) {
        setError(
          "Las credenciales fueron aceptadas, pero no se pudo enviar el código de verificación. Comuníquese con el administrador.",
        );
      } else {
        setError(
          "Usuario o contraseña incorrectos. Verifique sus datos de acceso.",
        );
      }
    } finally {
      setCargando(false);
    }
  };

  // ─── OTP: Manejo de cada casilla ─────────────────────────────────────────────
  const handleDigitChange = useCallback(
    (index: number, value: string) => {
      // Solo permitir un dígito numérico
      const digit = value.replace(/\D/g, "").slice(-1);
      const newDigits = [...digits];
      newDigits[index] = digit;
      setDigits(newDigits);
      // Avanzar automáticamente
      if (digit && index < 5) {
        inputRefs.current[index + 1]?.focus();
      }
    },
    [digits],
  );

  const handleDigitKeyDown = useCallback(
    (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Backspace") {
        if (digits[index]) {
          const newDigits = [...digits];
          newDigits[index] = "";
          setDigits(newDigits);
        } else if (index > 0) {
          inputRefs.current[index - 1]?.focus();
          const newDigits = [...digits];
          newDigits[index - 1] = "";
          setDigits(newDigits);
        }
      } else if (e.key === "ArrowLeft" && index > 0) {
        inputRefs.current[index - 1]?.focus();
      } else if (e.key === "ArrowRight" && index < 5) {
        inputRefs.current[index + 1]?.focus();
      }
    },
    [digits],
  );

  const handleDigitPaste = useCallback(
    (e: React.ClipboardEvent<HTMLInputElement>) => {
      e.preventDefault();
      const pasted = e.clipboardData
        .getData("text")
        .replace(/\D/g, "")
        .slice(0, 6);
      if (pasted.length > 0) {
        const newDigits = ["", "", "", "", "", ""];
        for (let i = 0; i < pasted.length; i++) {
          newDigits[i] = pasted[i];
        }
        setDigits(newDigits);
        const nextEmpty = pasted.length < 6 ? pasted.length : 5;
        inputRefs.current[nextEmpty]?.focus();
      }
    },
    [],
  );

  // ─── Paso 2: Verificar OTP ───────────────────────────────────────────────────
  const handleVerificarCodigo = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const codigo = digits.join("");
    if (codigo.length < 6) {
      setError("Debe ingresar los 6 dígitos del código de verificación.");
      return;
    }
    setCargando(true);
    try {
      const data = await verificarCodigo(ciActual, codigo);
      const perfil = await guardarSesion(data);

      if (perfil.primer_inicio) {
        router.push("/cambiar-contrasena");
      } else {
        router.push("/panel");
      }
    } catch {
      setError(
        "Código inválido o expirado. Intente iniciar sesión nuevamente.",
      );
      setDigits(["", "", "", "", "", ""]);
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-[var(--color-military-green-dark)]">
      {/* Fondo */}
      <div className="absolute inset-0 bg-[url('/imagenes/fondo2.jpeg')] bg-cover bg-center opacity-30 mix-blend-overlay pointer-events-none"></div>
      <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-military-green-dark)] via-transparent to-black/50 pointer-events-none"></div>

      <div className="max-w-md w-full bg-white/10 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] rounded-2xl p-8 border border-white/20 mt-10 relative z-10 text-white">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-white/10 p-2 text-[var(--color-military-green-dark)] mb-6 shadow-[0_0_20px_rgba(212,175,55,0.4)] relative">
            <Image
              src="/imagenes/logoemse.png"
              alt="Logo EMSE"
              fill
              className="object-contain p-2 drop-shadow-xl"
            />
          </div>
          <h2 className="text-3xl font-extrabold tracking-wide drop-shadow-md">
            Acceso Institucional
          </h2>
          <p className="text-gray-300 text-sm mt-2 uppercase tracking-widest font-semibold">
            Plataforma EMSE
          </p>
        </div>

        {error && (
          <div className="bg-red-50 text-[var(--color-emse-red,#b91c1c)] p-3 rounded-md text-sm mb-6 border border-red-200 text-center font-medium">
            {error}
          </div>
        )}

        {paso === 1 ? (
          /* ── PASO 1: Credenciales ── */
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-200 mb-1 drop-shadow-sm">
                Usuario (CI)
              </label>
              <input
                type="text"
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                className="w-full bg-black/20 border border-white/20 text-white rounded-md px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[var(--color-soft-gold)] focus:border-transparent transition-all placeholder:text-gray-400 shadow-inner text-sm"
                placeholder="Ingrese su CI"
                required
                autoFocus
              />
            </div>

            <div className="relative">
              <label className="block text-sm font-semibold text-gray-200 mb-1 drop-shadow-sm">
                Contraseña
              </label>
              <div className="relative">
                <input
                  type={mostrarContrasena ? "text" : "password"}
                  value={contrasena}
                  onChange={(e) => setContrasena(e.target.value)}
                  className="w-full bg-black/20 border border-white/20 text-white rounded-md pl-4 pr-12 py-3 focus:outline-none focus:ring-2 focus:ring-[var(--color-soft-gold)] focus:border-transparent transition-all placeholder:text-gray-400 shadow-inner text-sm"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 px-4 flex items-center text-gray-400 hover:text-white transition-colors"
                  onClick={() => setMostrarContrasena(!mostrarContrasena)}
                >
                  {mostrarContrasena ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
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
                      width="20"
                      height="20"
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
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={cargando}
              className={`w-full relative overflow-hidden group bg-[var(--color-military-green)] hover:bg-[var(--color-military-green-light)] text-white font-bold py-3 px-4 rounded-md transition-all duration-300 shadow-[0_4px_15px_rgba(27,67,50,0.6)] ${cargando ? "opacity-70 cursor-not-allowed" : "hover:scale-[1.02]"}`}
            >
              <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>
              <span className="relative z-10 tracking-wider uppercase text-sm">
                {cargando ? "Verificando..." : "Iniciar sesión"}
              </span>
            </button>
          </form>
        ) : (
          /* ── PASO 2: OTP de 6 casillas ── */
          <form onSubmit={handleVerificarCodigo} className="space-y-6">
            <div className="text-center mb-2">
              <h3 className="text-lg font-bold text-[var(--color-soft-gold)] uppercase tracking-wider drop-shadow-md">
                Verificación de acceso
              </h3>
              <p className="text-sm text-gray-300 mt-2">
                Ingrese el código de 6 dígitos enviado a su correo
                institucional.
              </p>
              <p className="text-xs text-gray-400 mt-2 font-semibold bg-black/30 py-1.5 px-3 rounded border border-white/5 inline-block">
                Código enviado a:{" "}
                <span className="text-white font-mono">
                  {correo.replace(/^(.{3}).*(@.*)$/, "$1***$2")}
                </span>
              </p>
            </div>

            {/* 6 casillas OTP */}
            <div className="flex justify-center gap-3">
              {digits.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => {
                    inputRefs.current[index] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleDigitChange(index, e.target.value)}
                  onKeyDown={(e) => handleDigitKeyDown(index, e)}
                  onPaste={handleDigitPaste}
                  className={`w-12 h-14 text-center text-2xl font-bold rounded-lg border-2 bg-black/30 text-white transition-all duration-200 focus:outline-none focus:scale-105 ${
                    digit
                      ? "border-[var(--color-soft-gold)] shadow-[0_0_12px_rgba(212,175,55,0.4)]"
                      : "border-white/25 focus:border-[var(--color-soft-gold)]"
                  }`}
                  placeholder="·"
                  autoFocus={index === 0}
                />
              ))}
            </div>

            <p className="text-center text-xs text-gray-400">
              El código expira en{" "}
              <strong className="text-white">10 minutos</strong>
            </p>

            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => {
                  setPaso(1);
                  setError("");
                  setDigits(["", "", "", "", "", ""]);
                }}
                className="w-1/2 bg-white/10 hover:bg-white/20 text-white font-bold py-3 px-4 rounded-md transition-all duration-300 border border-white/10 uppercase tracking-wider text-xs hover:scale-[1.02]"
              >
                Atrás
              </button>
              <button
                type="submit"
                disabled={cargando || digits.join("").length < 6}
                className={`w-1/2 relative overflow-hidden group bg-[var(--color-military-green)] hover:bg-[var(--color-military-green-light)] text-white font-bold py-3 px-4 rounded-md transition-all duration-300 shadow-[0_4px_15px_rgba(27,67,50,0.6)] ${cargando || digits.join("").length < 6 ? "opacity-70 cursor-not-allowed" : "hover:scale-[1.02]"}`}
              >
                <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>
                <span className="relative z-10 tracking-wider uppercase text-xs">
                  {cargando ? "Verificando..." : "Verificar código"}
                </span>
              </button>
            </div>
          </form>
        )}

        <div className="mt-8 text-center text-sm">
          <Link
            href="/"
            className="text-gray-300 hover:text-[var(--color-soft-gold)] hover:underline flex items-center justify-center gap-2 transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
            Volver a la página principal
          </Link>
        </div>
      </div>
    </div>
  );
}
