"use client";

import { PaginaProtegidaDocumentacion, PERMISOS_DOC } from "../../../../componentes/documentacion/InterfazDocumentacion";
import SeguimientoDashboard from "../../../../componentes/documentacion/SeguimientoDashboard";

export default function Pagina() {
  return (
    <PaginaProtegidaDocumentacion permisos={[PERMISOS_DOC.VER]} soloSeguimiento>
      <SeguimientoDashboard />
    </PaginaProtegidaDocumentacion>
  );
}
