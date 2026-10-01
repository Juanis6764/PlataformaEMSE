"use client";

import { useEffect, useState } from "react";
import AccesoRestringido from "../../../../../componentes/seguridad/AccesoRestringido";
import {
  AvisoDisciplina,
  CargandoDisciplina,
  EncabezadoDisciplina,
  PaginaProtegidaDisciplina,
  tarjetaDisciplina,
} from "../../../../../componentes/notas/disciplina/InterfazDisciplina";
import ResultadoFinalDisciplina from "../../../../../componentes/notas/disciplina/ResultadoFinalDisciplina";
import { SelectoresDisciplina } from "../../../../../componentes/notas/disciplina/SelectoresDisciplina";
import {
  mensajeErrorApi,
  obtenerContextoDisciplina,
} from "../../../../../servicios/notas/disciplina.service";
import { ContextoDisciplina } from "../../../../../tipos/notas/disciplina";

export default function NotasFinalesDisciplinaPage() {
  const [contexto, setContexto] = useState<ContextoDisciplina | null>(null);
  const [idGestion, setIdGestion] = useState<number | null>(null);
  const [idPeriodo, setIdPeriodo] = useState<number | null>(null);
  const [idCurso, setIdCurso] = useState<number | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    void obtenerContextoDisciplina()
      .then((real) => {
        setContexto(real);
        const gestion =
          real.gestiones.find((item) =>
            item.periodos.some((periodo) => periodo.activo),
          ) ?? real.gestiones[0];
        const periodo =
          gestion?.periodos.find((item) => item.activo) ?? gestion?.periodos[0];
        setIdGestion(gestion?.id_gestion ?? null);
        setIdPeriodo(periodo?.id_periodo ?? null);
        setIdCurso(real.cursos[0]?.id_curso ?? null);
      })
      .catch((e) => setError(mensajeErrorApi(e)))
      .finally(() => setCargando(false));
  }, []);

  if (cargando) {
    return (
      <PaginaProtegidaDisciplina permisos={["PUBLICAR_NOTAS"]}>
        <CargandoDisciplina />
      </PaginaProtegidaDisciplina>
    );
  }
  if (contexto?.perfil !== "ENCARGADO_DISCIPLINA") return <AccesoRestringido />;

  const seleccion =
    idGestion && idPeriodo && idCurso
      ? { id_gestion: idGestion, id_periodo: idPeriodo, id_curso: idCurso }
      : null;
  return (
    <PaginaProtegidaDisciplina permisos={["PUBLICAR_NOTAS"]}>
      <div className="mx-auto max-w-7xl space-y-5">
        <div className="print:hidden">
          <EncabezadoDisciplina
            titulo="Notas finales de Disciplina"
            descripcion="El consolidado se habilita automáticamente cuando todas las semanas configuradas están publicadas."
          />
        </div>
        {error && <AvisoDisciplina tipo="error">{error}</AvisoDisciplina>}
        {contexto && (
          <section className={`${tarjetaDisciplina} print:hidden`}>
            <SelectoresDisciplina
              contexto={contexto}
              idGestion={idGestion}
              idPeriodo={idPeriodo}
              idCurso={idCurso}
              cambiarGestion={setIdGestion}
              cambiarPeriodo={setIdPeriodo}
              cambiarCurso={setIdCurso}
            />
          </section>
        )}
        <ResultadoFinalDisciplina seleccion={seleccion} permitirGestion />
      </div>
    </PaginaProtegidaDisciplina>
  );
}
