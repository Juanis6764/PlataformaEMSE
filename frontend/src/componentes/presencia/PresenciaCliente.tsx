"use client";

import { useEffect } from "react";
import { useAuth } from "../../contextos/AuthContext";
import {
  conectarPresencia,
  desconectarPresencia,
} from "../../servicios/presencia.service";

const INTERVALO_LATIDO_MS = 15_000;

export default function PresenciaCliente() {
  const { token } = useAuth();

  useEffect(() => {
    if (!token) return;

    const socket = conectarPresencia(token);
    const latido = window.setInterval(
      () => socket.emit("presencia:latido"),
      INTERVALO_LATIDO_MS,
    );
    const cerrar = () => desconectarPresencia();
    window.addEventListener("pagehide", cerrar);

    return () => {
      window.clearInterval(latido);
      window.removeEventListener("pagehide", cerrar);
      desconectarPresencia();
    };
  }, [token]);

  return null;
}
