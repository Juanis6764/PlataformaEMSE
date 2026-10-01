import api from "./api";
import { UsuarioSesion } from "../tipos/usuario";

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  usuario: UsuarioSesion;
}

export interface InicioSesionResponse extends Partial<LoginResponse> {
  requiere_verificacion?: boolean;
  correo?: string;
}

export const iniciarSesion = async (
  usuario: string,
  contrasena: string,
): Promise<InicioSesionResponse> => {
  const response = await api.post<InicioSesionResponse>(
    "/autenticacion/iniciar-sesion",
    { ci: usuario, contrasena },
  );
  return response.data;
};

export const verificarCodigo = async (
  ci: string,
  codigo: string,
): Promise<LoginResponse> => {
  const response = await api.post<LoginResponse>(
    "/autenticacion/verificar-codigo",
    { ci, codigo },
  );
  return response.data;
};

export const obtenerUsuarioActual = async (): Promise<UsuarioSesion> => {
  const response = await api.get<UsuarioSesion>("/autenticacion/me");
  return response.data;
};

export const cambiarContrasena = async (
  token: string,
  contrasenaActual: string,
  contrasenaNueva: string,
): Promise<LoginResponse> => {
  const response = await api.post<LoginResponse>(
    "/autenticacion/cambiar-contrasena",
    { contrasenaActual, contrasenaNueva },
    { headers: { Authorization: `Bearer ${token}` } },
  );
  return response.data;
};

export const cerrarSesionLocal = () => {
  if (typeof window !== "undefined") {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("usuario");
  }
};

export const cerrarSesion = cerrarSesionLocal;
export const cerrarSesionRemota = async (): Promise<void> => {
  await api.post("/autenticacion/logout");
};
