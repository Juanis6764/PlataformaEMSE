import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { EventEmitter } from 'node:events';

export type EstadoConexion = 'EN_LINEA' | 'DESCONECTADO';

export interface CambioPresencia {
  id_usuario: number;
  estado_conexion: EstadoConexion;
}

@Injectable()
export class PresenciaService implements OnModuleDestroy {
  static readonly INTERVALO_LATIDO_MS = 15_000;
  static readonly TIEMPO_MAXIMO_PRESENCIA_MS = 45_000;

  readonly eventos = new EventEmitter();
  private readonly conexiones = new Map<number, Map<string, number>>();
  private readonly limpieza = setInterval(
    () => this.eliminarConexionesVencidas(),
    PresenciaService.INTERVALO_LATIDO_MS,
  );

  constructor() {
    this.limpieza.unref();
  }

  registrarConexion(idUsuario: number, idConexion: string) {
    const estabaEnLinea = this.estaEnLinea(idUsuario);
    const conexionesUsuario =
      this.conexiones.get(idUsuario) ?? new Map<string, number>();
    conexionesUsuario.set(idConexion, Date.now());
    this.conexiones.set(idUsuario, conexionesUsuario);

    if (!estabaEnLinea) this.emitirCambio(idUsuario, 'EN_LINEA');
  }

  registrarLatido(idUsuario: number, idConexion: string) {
    const conexionesUsuario = this.conexiones.get(idUsuario);
    if (conexionesUsuario?.has(idConexion)) {
      conexionesUsuario.set(idConexion, Date.now());
    }
  }

  eliminarConexion(idUsuario: number, idConexion: string) {
    const conexionesUsuario = this.conexiones.get(idUsuario);
    if (!conexionesUsuario) return;

    conexionesUsuario.delete(idConexion);
    if (conexionesUsuario.size === 0) {
      this.conexiones.delete(idUsuario);
      this.emitirCambio(idUsuario, 'DESCONECTADO');
    }
  }

  estaEnLinea(idUsuario: number) {
    return (this.conexiones.get(idUsuario)?.size ?? 0) > 0;
  }

  obtenerEstados() {
    return [...this.conexiones.keys()].map((id_usuario) => ({
      id_usuario,
      estado_conexion: 'EN_LINEA' as const,
    }));
  }

  eliminarConexionesVencidas(ahora = Date.now()) {
    for (const [idUsuario, conexionesUsuario] of this.conexiones) {
      for (const [idConexion, ultimoLatido] of conexionesUsuario) {
        if (
          ahora - ultimoLatido >
          PresenciaService.TIEMPO_MAXIMO_PRESENCIA_MS
        ) {
          conexionesUsuario.delete(idConexion);
        }
      }
      if (conexionesUsuario.size === 0) {
        this.conexiones.delete(idUsuario);
        this.emitirCambio(idUsuario, 'DESCONECTADO');
      }
    }
  }

  onModuleDestroy() {
    clearInterval(this.limpieza);
    this.eventos.removeAllListeners();
  }

  private emitirCambio(id_usuario: number, estado_conexion: EstadoConexion) {
    this.eventos.emit('cambio', { id_usuario, estado_conexion });
  }
}
