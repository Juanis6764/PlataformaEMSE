import type {
  PlazoDocumento,
  SituacionPlazoDocumental,
} from "../../tipos/documentacion";

type PlazoCalculable = Pick<
  PlazoDocumento,
  "estado_calculado" | "fecha_hora_limite"
> & { fecha_hora_cumplimiento?: string | null };

export interface ResumenHistoricoPlazos {
  total: number;
  cumplidosEnPlazo: number;
  cumplidosTarde: number;
  vencidos: number;
  pendientes: number;
  indeterminables: number;
}

/**
 * Conserva como fuente principal el estado calculado por PlazosService.
 * Solo deriva los subestados temporales de un plazo todavía pendiente para
 * que la interfaz pueda cambiar al vencer sin esperar una recarga manual.
 */
export function situacionHistoricaPlazo(
  plazo: PlazoCalculable,
  ahora = new Date(),
  esPlazoActivo = true,
): SituacionPlazoDocumental {
  if (plazo.estado_calculado === "CUMPLIDO_CON_RETRASO") {
    return "CUMPLIDO_TARDE";
  }
  if (plazo.estado_calculado === "CUMPLIDO") return "CUMPLIDO";
  if (plazo.estado_calculado === "VENCIDO") {
    return esPlazoActivo ? "VENCIDO" : "HISTORIAL_NO_DETERMINABLE";
  }

  const limite = new Date(plazo.fecha_hora_limite);
  if (limite.getTime() < ahora.getTime()) {
    return esPlazoActivo ? "VENCIDO" : "HISTORIAL_NO_DETERMINABLE";
  }

  const mismaFecha =
    limite.getFullYear() === ahora.getFullYear() &&
    limite.getMonth() === ahora.getMonth() &&
    limite.getDate() === ahora.getDate();
  if (mismaFecha) return "VENCE_HOY";
  if (limite.getTime() - ahora.getTime() <= 24 * 60 * 60 * 1000) {
    return "PROXIMO_A_VENCER";
  }
  return "EN_PLAZO";
}

export function resumirPlazosHistoricos(
  plazos: PlazoCalculable[],
  ahora = new Date(),
): ResumenHistoricoPlazos {
  return plazos.reduce<ResumenHistoricoPlazos>(
    (resumen, plazo) => {
      // En un expediente cerrado, la ausencia de fecha de cumplimiento no
      // demuestra atraso. El área ya pudo haber atendido y avanzado antes de
      // que el sistema registrara el cierre del plazo.
      const situacion = situacionHistoricaPlazo(plazo, ahora, false);
      resumen.total += 1;
      if (situacion === "CUMPLIDO") resumen.cumplidosEnPlazo += 1;
      else if (situacion === "CUMPLIDO_TARDE") resumen.cumplidosTarde += 1;
      else if (situacion === "VENCIDO") resumen.vencidos += 1;
      else if (situacion === "HISTORIAL_NO_DETERMINABLE") {
        resumen.indeterminables += 1;
      }
      else resumen.pendientes += 1;
      return resumen;
    },
    {
      total: 0,
      cumplidosEnPlazo: 0,
      cumplidosTarde: 0,
      vencidos: 0,
      pendientes: 0,
      indeterminables: 0,
    },
  );
}

export function formatearRetraso(
  fechaLimite: string,
  fechaCumplimiento: string | null,
) {
  if (!fechaCumplimiento) return null;
  const diferencia =
    new Date(fechaCumplimiento).getTime() - new Date(fechaLimite).getTime();
  if (diferencia <= 0) return null;

  const minutosTotales = Math.max(1, Math.floor(diferencia / 60_000));
  const dias = Math.floor(minutosTotales / 1_440);
  const horas = Math.floor((minutosTotales % 1_440) / 60);
  const minutos = minutosTotales % 60;
  const partes: string[] = [];
  if (dias) partes.push(`${dias} ${dias === 1 ? "día" : "días"}`);
  if (horas) partes.push(`${horas} ${horas === 1 ? "hora" : "horas"}`);
  if (minutos && partes.length < 2) {
    partes.push(`${minutos} ${minutos === 1 ? "minuto" : "minutos"}`);
  }
  return partes.join(" ");
}
