"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  cerrarSesionLocal,
  cerrarSesionRemota,
  obtenerUsuarioActual,
} from "../servicios/autenticacion.service";
import { UsuarioSesion } from "../tipos/usuario";
import { AxiosError } from "axios";

interface DatosSesion {
  accessToken?: string;
  token?: string;
  refreshToken?: string;
  usuario?: UsuarioSesion;
}

interface AuthContextValue {
  usuario: UsuarioSesion | null;
  token: string | null;
  permisos: string[];
  cargando: boolean;
  tienePermiso: (permiso: string) => boolean;
  guardarSesion: (datos: DatosSesion) => Promise<UsuarioSesion>;
  refrescarSesion: () => Promise<UsuarioSesion | null>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [usuario, setUsuario] = useState<UsuarioSesion | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);

  const limpiarSesion = useCallback(() => {
    cerrarSesionLocal();
    setUsuario(null);
    setToken(null);
  }, []);

  const refrescarSesion =
    useCallback(async (): Promise<UsuarioSesion | null> => {
      const tokenGuardado =
        localStorage.getItem("accessToken") || localStorage.getItem("token");
      if (!tokenGuardado) {
        console.info(
          "[Auth] Token inexistente; no se puede restaurar la sesión.",
        );
        limpiarSesion();
        return null;
      }

      setToken(tokenGuardado);
      try {
        const perfil = await obtenerUsuarioActual();
        if (!Array.isArray(perfil.permisos)) {
          console.warn(
            "[Auth] El endpoint /autenticacion/me devolvió un usuario sin permisos.",
          );
          perfil.permisos = [];
        } else if (perfil.permisos.length === 0) {
          console.warn(
            "[Auth] El usuario autenticado no tiene permisos activos asignados.",
          );
        }
        localStorage.setItem("usuario", JSON.stringify(perfil));
        setUsuario(perfil);
        return perfil;
      } catch (error: unknown) {
        const status =
          error instanceof AxiosError ? error.response?.status : undefined;
        console.error(
          `[Auth] Error al actualizar la sesión desde /autenticacion/me${status ? ` (${status})` : ""}.`,
          error,
        );
        limpiarSesion();
        return null;
      }
    }, [limpiarSesion]);

  const guardarSesion = useCallback(
    async (datos: DatosSesion): Promise<UsuarioSesion> => {
      const nuevoToken = datos.accessToken || datos.token;
      if (!nuevoToken) {
        console.error(
          "[Auth] Fallo de actualización de sesión: la respuesta no contiene un token JWT.",
        );
        throw new Error(
          "La respuesta de autenticación no contiene un token JWT.",
        );
      }

      localStorage.setItem("accessToken", nuevoToken);
      localStorage.removeItem("token");
      localStorage.setItem("refreshToken", datos.refreshToken || "");
      setToken(nuevoToken);

      try {
        const perfil = await obtenerUsuarioActual();
        if (!Array.isArray(perfil.permisos)) {
          console.warn(
            "[Auth] Login completado, pero /autenticacion/me no devolvió la lista de permisos.",
          );
          perfil.permisos = [];
        }
        localStorage.setItem("usuario", JSON.stringify(perfil));
        setUsuario(perfil);
        return perfil;
      } catch (error) {
        console.error(
          "[Auth] Fallo de actualización de sesión después del login.",
          error,
        );
        limpiarSesion();
        throw error;
      }
    },
    [limpiarSesion],
  );

  const logout = useCallback(() => {
    void cerrarSesionRemota()
      .catch((error) =>
        console.warn("[Auth] No se pudo notificar el cierre remoto.", error),
      )
      .finally(() => {
        limpiarSesion();
        router.replace("/iniciar-sesion");
      });
  }, [limpiarSesion, router]);

  useEffect(() => {
    const iniciar = async () =>
      refrescarSesion().finally(() => setCargando(false));
    void iniciar();
  }, [refrescarSesion]);

  useEffect(() => {
    const manejarExpiracion = () => {
      console.warn("[Auth] Token inválido o expirado; se limpiará la sesión.");
      logout();
    };
    window.addEventListener("auth:expired", manejarExpiracion);
    return () => window.removeEventListener("auth:expired", manejarExpiracion);
  }, [logout]);

  const permisos = useMemo(() => usuario?.permisos || [], [usuario]);
  const tienePermiso = useCallback(
    (permiso: string) => permisos.includes(permiso),
    [permisos],
  );
  const value = useMemo<AuthContextValue>(
    () => ({
      usuario,
      token,
      permisos,
      cargando,
      tienePermiso,
      guardarSesion,
      refrescarSesion,
      logout,
    }),
    [
      usuario,
      token,
      permisos,
      cargando,
      tienePermiso,
      guardarSesion,
      refrescarSesion,
      logout,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context)
    throw new Error("useAuth debe utilizarse dentro de AuthProvider");
  return context;
}
