"use client";

import { useCallback, useEffect, useState } from "react";
import {
  consultarResultadoFinalDisciplina,
  enviarResultadoFinalEvaluaciones,
  mensajeErrorApi,
  SeleccionResultadoFinalDisciplina,
} from "../../../servicios/notas/disciplina.service";
import { ResultadoFinalDisciplina as ResultadoFinal } from "../../../tipos/notas/disciplina";
import {
  AvisoDisciplina,
  botonPrimarioDisciplina,
  botonSecundarioDisciplina,
  CargandoDisciplina,
  tarjetaDisciplina,
  VacioDisciplina,
} from "./InterfazDisciplina";

export default function ResultadoFinalDisciplina({
  seleccion,
  permitirGestion = false,
}: {
  seleccion: SeleccionResultadoFinalDisciplina | null;
  permitirGestion?: boolean;
}) {
  const [resultado, setResultado] = useState<ResultadoFinal | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [exito, setExito] = useState("");

  const consultar = useCallback(async () => {
    if (!seleccion) {
      setResultado(null);
      return;
    }
    setCargando(true);
    setError("");
    try {
      setResultado(await consultarResultadoFinalDisciplina(seleccion));
    } catch (e) {
      setResultado(null);
      setError(mensajeErrorApi(e));
    } finally {
      setCargando(false);
    }
  }, [seleccion]);

  useEffect(() => {
    queueMicrotask(() => void consultar());
  }, [consultar]);

  async function ejecutar(
    accion: () => Promise<ResultadoFinal>,
    mensaje: string,
  ) {
    setCargando(true);
    setError("");
    setExito("");
    try {
      setResultado(await accion());
      setExito(mensaje);
      window.dispatchEvent(new Event("notificaciones:actualizar"));
    } catch (e) {
      setError(mensajeErrorApi(e));
    } finally {
      setCargando(false);
    }
  }

  if (!seleccion) {
    return (
      <VacioDisciplina
        titulo="Seleccione gestión, periodo y curso"
        descripcion="El resultado final se habilita únicamente cuando todas las semanas configuradas están publicadas."
      />
    );
  }
  if (cargando && !resultado) return <CargandoDisciplina />;

  return (
    <section
      className={`disciplina-final-imprimible ${tarjetaDisciplina} space-y-4 print:border-0 print:p-0 print:shadow-none`}
    >
      {error && <AvisoDisciplina tipo="error">{error}</AvisoDisciplina>}
      {exito && <AvisoDisciplina tipo="exito">{exito}</AvisoDisciplina>}
      {!resultado ? null : (
        <>
          <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
                Disciplina
              </p>
              <h2 className="text-2xl font-black text-slate-950">
                Notas finales de Disciplina
              </h2>
              <p className="text-sm text-slate-600">
                {resultado.curso.replaceAll("_", " ")} · Periodo{" "}
                {resultado.periodo}/{resultado.gestion}
              </p>
              <p className="mt-1 text-sm font-semibold text-emerald-700">
                {resultado.semanas_publicadas} de{" "}
                {resultado.semanas_configuradas} semanas publicadas
              </p>
            </div>
            {resultado.completo && (
              <button
                type="button"
                className={`${botonSecundarioDisciplina} print:hidden`}
                onClick={() => window.print()}
              >
                Imprimir desde el navegador
              </button>
            )}
          </div>

          {!resultado.completo ? (
            <AvisoDisciplina tipo="info">
              El resultado final aún no está disponible. Deben existir y estar
              publicadas las {resultado.semanas_configuradas} semanas
              configuradas.
            </AvisoDisciplina>
          ) : (
            <>
              <div className="flex flex-wrap gap-2 print:hidden">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold ${resultado.publicado ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}
                >
                  {resultado.publicado
                    ? "Notas finales publicadas"
                    : "Resultado disponible, pendiente de publicación final"}
                </span>
                {resultado.enviado_evaluaciones && (
                  <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-800">
                    Enviado a Evaluaciones
                  </span>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] border-collapse text-left text-sm print:min-w-0 print:text-[10px]">
                  <thead>
                    <tr className="border-y bg-slate-50 text-xs uppercase text-slate-600">
                      <th className="p-2">N.º</th>
                      <th className="p-2">CI</th>
                      <th className="p-2">Curso</th>
                      <th className="p-2">Apellidos y nombres</th>
                      <th className="p-2 text-right">Total deméritos</th>
                      <th className="p-2 text-right">Total méritos</th>
                      <th className="p-2 text-right">Demérito neto</th>
                      <th className="p-2 text-right">Nota final</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resultado.filas.map((fila, indice) => (
                      <tr key={fila.id_cadete} className="border-b">
                        <td className="p-2">{indice + 1}</td>
                        <td className="p-2">{fila.ci}</td>
                        <td className="p-2">
                          {fila.curso.replaceAll("_", " ")}
                        </td>
                        <td className="p-2 font-semibold">
                          {fila.apellidos} {fila.nombres}
                        </td>
                        <td className="p-2 text-right font-mono tabular-nums">
                          {Number(fila.total_demeritos).toFixed(4)}
                        </td>
                        <td className="p-2 text-right font-mono tabular-nums">
                          {Number(fila.total_meritos).toFixed(4)}
                        </td>
                        <td className="p-2 text-right font-mono tabular-nums">
                          {Number(fila.demerito_neto).toFixed(4)}
                        </td>
                        <td className="p-2 text-right font-mono font-black tabular-nums">
                          {Number(fila.nota_final_disciplina).toFixed(4)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {permitirGestion && (
                <div className="flex flex-wrap justify-end gap-2 print:hidden">
                  {resultado.puede_enviar_evaluaciones && (
                    <button
                      type="button"
                      disabled={cargando}
                      className={botonPrimarioDisciplina}
                      onClick={() =>
                        window.confirm(
                          `¿Está seguro de enviar las notas finales de Disciplina a Evaluaciones?\n\nCurso: ${resultado.curso.replaceAll("_", " ")}\nPeriodo: ${resultado.periodo}/${resultado.gestion}\nEstudiantes: ${resultado.filas.length}\n\nDespués del envío estas notas serán utilizadas para la Matriz Académica Final.`,
                        ) &&
                        void ejecutar(
                          () => enviarResultadoFinalEvaluaciones(seleccion),
                          "Notas finales enviadas a Evaluaciones correctamente.",
                        )
                      }
                    >
                      ENVIAR NOTAS FINALES A EVALUACIONES
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </>
      )}
    </section>
  );
}
