const EVENTO_SEMANAS_DISCIPLINA = "disciplina:semanas-actualizadas";
const CANAL_SEMANAS_DISCIPLINA = "emse-disciplina-semanas";
const INTERVALO_SINCRONIZACION_MS = 15_000;

export function notificarSemanasDisciplinaActualizadas() {
  window.dispatchEvent(new Event(EVENTO_SEMANAS_DISCIPLINA));
  if (typeof BroadcastChannel === "undefined") return;
  const canal = new BroadcastChannel(CANAL_SEMANAS_DISCIPLINA);
  canal.postMessage({ tipo: EVENTO_SEMANAS_DISCIPLINA });
  canal.close();
}

export function suscribirseASemanasDisciplina(
  actualizar: () => void | Promise<void>,
) {
  const ejecutar = () => {
    void Promise.resolve(actualizar()).catch(() => undefined);
  };
  const alVolverAVer = () => {
    if (document.visibilityState === "visible") ejecutar();
  };
  const canal =
    typeof BroadcastChannel === "undefined"
      ? null
      : new BroadcastChannel(CANAL_SEMANAS_DISCIPLINA);

  window.addEventListener(EVENTO_SEMANAS_DISCIPLINA, ejecutar);
  window.addEventListener("focus", ejecutar);
  document.addEventListener("visibilitychange", alVolverAVer);
  canal?.addEventListener("message", ejecutar);
  const intervalo = window.setInterval(ejecutar, INTERVALO_SINCRONIZACION_MS);

  return () => {
    window.removeEventListener(EVENTO_SEMANAS_DISCIPLINA, ejecutar);
    window.removeEventListener("focus", ejecutar);
    document.removeEventListener("visibilitychange", alVolverAVer);
    canal?.removeEventListener("message", ejecutar);
    canal?.close();
    window.clearInterval(intervalo);
  };
}
