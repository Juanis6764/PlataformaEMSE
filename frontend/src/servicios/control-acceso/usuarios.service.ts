import api from "../api";
import { UsuarioListado } from "../../tipos/usuario";

export interface MetaPaginacionUsuarios {
  total: number;
  pagina: number;
  limite: number;
  paginas_totales: number;
}

export interface RespuestaPaginadaUsuarios {
  data: UsuarioListado[];
  meta: MetaPaginacionUsuarios;
}

export interface CrearUsuarioDatos {
  ci: string;
  nombres: string;
  apellidos: string;
  contrasena: string;
  id_rol: number;
  id_seccion?: number;
  correo?: string;
  es_mixto?: boolean;
}

export const obtenerUsuarios = async (): Promise<RespuestaPaginadaUsuarios> => {
  const response = await api.get<RespuestaPaginadaUsuarios>("/usuarios", {
    params: { limite: 100 },
  });
  return response.data;
};

export const obtenerPresenciaUsuarios = async (): Promise<
  { id_usuario: number; estado_conexion: "EN_LINEA" }[]
> => (await api.get("/usuarios/presencia")).data;

export const crearUsuario = async (
  datos: CrearUsuarioDatos,
): Promise<UsuarioListado> => {
  const response = await api.post<UsuarioListado>("/usuarios", datos);
  return response.data;
};
export const obtenerUsuario = async (id: number): Promise<UsuarioListado> =>
  (await api.get(`/usuarios/${id}`)).data;
export const actualizarUsuario = async (
  id: number,
  datos: Partial<UsuarioListado> & { id_curso?: number },
): Promise<UsuarioListado> => (await api.patch(`/usuarios/${id}`, datos)).data;
export const actualizarPermisosUsuario = async (
  id: number,
  permisos: { id_permiso: number; concedido: boolean }[],
): Promise<UsuarioListado> =>
  (await api.put(`/usuarios/${id}/permisos`, { permisos })).data;

export const cambiarEstadoUsuario = async (
  id: number,
  habilitado: boolean,
): Promise<UsuarioListado> => {
  const response = await api.patch<UsuarioListado>(`/usuarios/${id}/estado`, {
    habilitado,
  });
  return response.data;
};

export const restablecerContrasenaUsuario = async (
  id: number,
): Promise<{ mensaje: string }> =>
  (
    await api.post<{ mensaje: string }>(
      `/usuarios/${id}/restablecer-contrasena`,
    )
  ).data;
