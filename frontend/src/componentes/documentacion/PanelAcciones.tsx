"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "../../contextos/AuthContext";
import { Seccion } from "../../tipos/seccion";
import {
  Trazabilidad,
  TipoAtencionRequerida,
  TipoDocumento,
  TipoMovimientoDocumento,
} from "../../tipos/documentacion";
import {
  aprobarDocumento,
  archivarDocumento,
  asignarHojaRuta,
  crearRespuesta,
  editarPrimerProveido,
  enviarDocumento,
  finalizarDocumento,
  mensajeErrorApi,
  observarDocumento,
  recibirMovimiento,
  registrarCumplimiento,
  registrarProveido,
  subirArchivoDocumento,
  subsanarDocumento,
} from "../../servicios/documentacion/documentacion.service";
import {
  AvisoDoc,
  botonPrimarioDoc,
  botonSecundarioDoc,
  campoDoc,
  ModalDoc,
  PERMISOS_DOC,
} from "./InterfazDocumentacion";
import {
  ListaCargaArchivos,
  useCargaArchivos,
} from "./CargaArchivos";

type Accion =
  | "enviar"
  | "asignar-hoja-ruta"
  | "proveido"
  | "editar-primer-proveido"
  | "cumplimiento"
  | "respuesta"
  | "observar"
  | "subsanar"
  | "aprobar"
  | "finalizar"
  | "archivar";

const ESTADOS_ENVIO = ["REGISTRADO", "EN_TRAMITE", "APROBADO"];
const TIPOS_DOCUMENTO: TipoDocumento[] = [
  "RADIOGRAMA",
  "MEMORANDUM",
  "OFICIO",
  "NOTA_SERVICIO",
  "INFORME",
  "DIRECTIVA",
  "CIRCULAR",
  "PARTE",
];
const SECCIONES_INSTITUCIONALES = new Set([
  "RADIO",
  "SECRETARIA_GENERAL",
  "COMANDO",
  "SEGUNDO_COMANDO",
]);
const ETIQUETAS_SECCION: Record<string, string> = {
  ADMINISTRACION_SISTEMA: "Administración",
  ENTRENAMIENTO_FISICO: "Entrenamiento Físico",
  INVESTIGACION_TECNOLOGIA: "Investigación y Tecnología",
  JEFATURA_ESTUDIOS: "Jefatura de Estudios",
  LOGISTICA: "Logística",
};

function nombreSeccion(nombre: string) {
  if (ETIQUETAS_SECCION[nombre]) return ETIQUETAS_SECCION[nombre];
  return nombre
    .replaceAll("_", " ")
    .toLocaleLowerCase("es-BO")
    .replace(/(^|\s)\p{L}/gu, (letra) => letra.toLocaleUpperCase("es-BO"));
}

/**
 * Replica en el cliente, solo para mostrar (la autorización real la aplica
 * el backend en MovimientosService.enviar), la secuencia institucional
 * fija: RADIO -> SECRETARIA_GENERAL -> COMANDO -> SEGUNDO_COMANDO -> ÁREA
 * -> SEGUNDO_COMANDO -> COMANDO -> SECRETARIA_GENERAL -> RADIO. El destino
 * ya no es una elección libre del usuario salvo para Segundo Comando, cuyo
 * destino tampoco se elige aquí: viene fijado por el segundo proveído.
 */
function calcularDestinoInstitucional(
  miSeccionNombre: string | null,
  expediente: Trazabilidad["expediente"],
  secciones: Seccion[],
): { seccion: Seccion; tipo: TipoMovimientoDocumento } | null {
  if (!miSeccionNombre || !expediente) return null;
  const porNombre = (nombre: string) =>
    secciones.find((s) => s.nombre === nombre) ?? null;
  const proveidoSegundo = (expediente.hoja_ruta?.proveidos ?? []).find(
    (p) => p.numero_momento === 2,
  );

  if (miSeccionNombre === "RADIO") {
    const seccion = porNombre("SECRETARIA_GENERAL");
    return seccion && { seccion, tipo: "ENVIO" };
  }
  if (miSeccionNombre === "SECRETARIA_GENERAL") {
    const seccion = porNombre(proveidoSegundo ? "RADIO" : "COMANDO");
    return seccion && { seccion, tipo: "ENVIO" };
  }
  if (miSeccionNombre === "COMANDO") {
    const seccion = porNombre(proveidoSegundo ? "SECRETARIA_GENERAL" : "SEGUNDO_COMANDO");
    return seccion && { seccion, tipo: "ENVIO" };
  }
  if (miSeccionNombre === "SEGUNDO_COMANDO") {
    if (expediente.estado_actual === "APROBADO") {
      const seccion = porNombre("COMANDO");
      return seccion && { seccion, tipo: "ENVIO" };
    }
    if (!proveidoSegundo?.id_seccion_destino) return null;
    const seccion = secciones.find(
      (s) => s.id_seccion === proveidoSegundo.id_seccion_destino,
    );
    return seccion ? { seccion, tipo: "DERIVACION" } : null;
  }
  // Cualquier área ejecutora no institucional: solo puede devolver a
  // Segundo Comando.
  const seccion = porNombre("SEGUNDO_COMANDO");
  return seccion && { seccion, tipo: "ENVIO" };
}

export default function PanelAcciones({
  trazabilidad,
  secciones,
  onCambio,
}: {
  trazabilidad: Trazabilidad;
  secciones: Seccion[];
  onCambio: () => void | Promise<void>;
}) {
  const { usuario, tienePermiso } = useAuth();
  const [accionActiva, setAccionActiva] = useState<Accion | null>(null);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState("");

  const { documento, expediente } = trazabilidad;
  const miSeccionNombre = usuario?.seccion ?? null;
  const miSeccion = secciones.find((s) => s.nombre === miSeccionNombre);
  const enMiSeccion =
    !!expediente && !!miSeccion && expediente.id_seccion_actual === miSeccion.id_seccion;
  const esRadio = miSeccionNombre === "RADIO";
  const esComando = miSeccionNombre === "COMANDO";
  const esSecretaria = miSeccionNombre === "SECRETARIA_GENERAL";
  const esSegundoComando = miSeccionNombre === "SEGUNDO_COMANDO";
  const destinoInstitucional = expediente
    ? calcularDestinoInstitucional(miSeccionNombre, expediente, secciones)
    : null;

  const cerrar = () => {
    setAccionActiva(null);
    setError("");
  };

  const ejecutar = async (accion: () => Promise<unknown>) => {
    setProcesando(true);
    setError("");
    try {
      await accion();
      cerrar();
      await onCambio();
    } catch (e) {
      setError(mensajeErrorApi(e));
    } finally {
      setProcesando(false);
    }
  };

  if (!expediente) {
    return (
      <AvisoDoc tipo="info">
        Este documento es una respuesta/anexo relacionado: no tiene expediente
        ni workflow propio.
      </AvisoDoc>
    );
  }

  const numeroProveidos = expediente.hoja_ruta?.proveidos?.length ?? 0;
  const movimientoPendienteParaMi = (expediente.movimientos ?? []).find(
    (m) =>
      m.estado_movimiento === "PENDIENTE" &&
      miSeccion &&
      m.id_seccion_destino === miSeccion.id_seccion,
  );

  const disponibles: { clave: Accion; etiqueta: string }[] = [];
  if (enMiSeccion) {
    if (
      tienePermiso(PERMISOS_DOC.ENVIAR) &&
      ESTADOS_ENVIO.includes(expediente.estado_actual) &&
      destinoInstitucional
    ) {
      disponibles.push({
        clave: "enviar",
        etiqueta: `Enviar a ${destinoInstitucional.seccion.nombre.replace("_", " ")}`,
      });
    }
    if (
      esSecretaria &&
      !expediente.hoja_ruta &&
      tienePermiso(PERMISOS_DOC.ASIGNAR_HOJA_RUTA) &&
      expediente.estado_actual === "EN_TRAMITE"
    ) {
      disponibles.push({ clave: "asignar-hoja-ruta", etiqueta: "Asignar hoja de ruta" });
    }
    if (
      ((esSecretaria && numeroProveidos === 0) || (esSegundoComando && numeroProveidos === 1)) &&
      expediente.hoja_ruta &&
      tienePermiso(PERMISOS_DOC.REGISTRAR_PROVEIDO) &&
      expediente.estado_actual === "EN_TRAMITE"
    ) {
      disponibles.push({
        clave: "proveido",
        etiqueta: numeroProveidos === 0 ? "Registrar primer proveído" : "Registrar segundo proveído",
      });
    }
    if (
      esComando &&
      numeroProveidos === 1 &&
      tienePermiso(PERMISOS_DOC.REGISTRAR_PROVEIDO) &&
      expediente.estado_actual === "EN_TRAMITE"
    ) {
      disponibles.push({ clave: "editar-primer-proveido", etiqueta: "Editar Primer Proveído" });
    }
    // Cumplir/responder es tarea de la sección destino (un área), no de las
    // 4 secciones institucionales de paso — aunque backend no lo restringe
    // explícitamente por tipo (solo por sección actual+estado), mostrarlo
    // solo a áreas evita que Comando/Secretaría/Segundo Comando dupliquen
    // el cumplimiento en su propio tramo de retorno.
    const esAreaEjecutora = !esRadio && !esSecretaria && !esComando && !esSegundoComando;
    if (
      esAreaEjecutora &&
      expediente.tipo_atencion_requerida === "CUMPLIMIENTO" &&
      tienePermiso(PERMISOS_DOC.REGISTRAR_CUMPLIMIENTO) &&
      ["EN_TRAMITE", "OBSERVADO"].includes(expediente.estado_actual)
    ) {
      disponibles.push({ clave: "cumplimiento", etiqueta: "Registrar cumplimiento" });
    }
    if (
      esAreaEjecutora &&
      expediente.tipo_atencion_requerida === "RESPUESTA" &&
      tienePermiso(PERMISOS_DOC.CREAR_RESPUESTA) &&
      ["EN_TRAMITE", "OBSERVADO"].includes(expediente.estado_actual)
    ) {
      disponibles.push({ clave: "respuesta", etiqueta: "Crear respuesta" });
    }
    // Solo Segundo Comando observa/aprueba (confirmado): Comando, en el
    // tramo de retorno, únicamente recibe y reenvía.
    if (
      esSegundoComando &&
      tienePermiso(PERMISOS_DOC.OBSERVAR) &&
      expediente.estado_actual === "EN_TRAMITE"
    ) {
      disponibles.push({ clave: "observar", etiqueta: "Observar" });
    }
    if (tienePermiso(PERMISOS_DOC.ENVIAR) && expediente.estado_actual === "OBSERVADO") {
      disponibles.push({ clave: "subsanar", etiqueta: "Subsanar y reenviar" });
    }
    if (
      esSegundoComando &&
      tienePermiso(PERMISOS_DOC.APROBAR) &&
      expediente.estado_actual === "EN_TRAMITE"
    ) {
      disponibles.push({ clave: "aprobar", etiqueta: "Aprobar" });
    }
    if (tienePermiso(PERMISOS_DOC.FINALIZAR) && expediente.estado_actual === "EN_TRAMITE" && esRadio) {
      disponibles.push({ clave: "finalizar", etiqueta: "Finalizar" });
    }
    if (tienePermiso(PERMISOS_DOC.ARCHIVAR) && expediente.estado_actual === "FINALIZADO" && esRadio) {
      disponibles.push({ clave: "archivar", etiqueta: "Archivar" });
    }
  }

  return (
    <div className="space-y-3">
      {movimientoPendienteParaMi && tienePermiso(PERMISOS_DOC.RECIBIR) && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
          <p className="mb-2 text-sm text-amber-900">
            Hay un movimiento dirigido a su sección pendiente de recepción.
          </p>
          <button
            type="button"
            className={botonPrimarioDoc}
            disabled={procesando}
            onClick={() =>
              ejecutar(() => recibirMovimiento(movimientoPendienteParaMi.id_movimiento))
            }
          >
            Recibir
          </button>
        </div>
      )}

      {disponibles.length === 0 && !movimientoPendienteParaMi ? (
        <AvisoDoc tipo="info">
          No hay acciones disponibles para usted sobre este expediente en este momento.
        </AvisoDoc>
      ) : (
        <div className="flex flex-wrap gap-2">
          {disponibles.map((a) => (
            <button
              key={a.clave}
              type="button"
              className={botonPrimarioDoc}
              onClick={() => setAccionActiva(a.clave)}
            >
              {a.etiqueta}
            </button>
          ))}
        </div>
      )}

      <ModalDoc
        abierto={accionActiva === "enviar"}
        titulo="Enviar documento"
        descripcion={
          destinoInstitucional
            ? `Destino según el workflow institucional: ${destinoInstitucional.seccion.nombre.replace("_", " ")}.`
            : undefined
        }
        cerrar={cerrar}
      >
        {destinoInstitucional ? (
          <FormularioEnviar
            destino={destinoInstitucional}
            procesando={procesando}
            error={error}
            onEnviar={(observacion) =>
              ejecutar(() =>
                enviarDocumento(documento.id_documento, {
                  id_seccion_destino: destinoInstitucional.seccion.id_seccion,
                  tipo_movimiento: destinoInstitucional.tipo,
                  observacion: observacion || undefined,
                }),
              )
            }
          />
        ) : (
          <AvisoDoc tipo="error">
            No se pudo determinar el siguiente destino institucional para este expediente.
          </AvisoDoc>
        )}
      </ModalDoc>

      <ModalDoc
        abierto={accionActiva === "editar-primer-proveido"}
        titulo="Editar Primer Proveído"
        descripcion="Comando puede corregir el contenido/plazo del primer proveído mientras lo tiene, antes de que Segundo Comando registre el segundo."
        cerrar={cerrar}
      >
        <FormularioEditarProveido
          proveido={expediente.hoja_ruta?.proveidos?.find((p) => p.numero_momento === 1) ?? null}
          procesando={procesando}
          error={error}
          onGuardar={(contenido, fechaLimite) =>
            ejecutar(() =>
              editarPrimerProveido(expediente.hoja_ruta!.id_hoja_ruta, {
                contenido,
                fecha_hora_limite: fechaLimite || undefined,
              }),
            )
          }
        />
      </ModalDoc>

      <ModalDoc
        abierto={accionActiva === "asignar-hoja-ruta"}
        titulo="Asignar hoja de ruta"
        descripcion="Se generará un número único (HR-AAAA-NNNNNN) para este expediente."
        cerrar={cerrar}
      >
        {error && <AvisoDoc tipo="error">{error}</AvisoDoc>}
        <div className="flex justify-end gap-2">
          <button type="button" className={botonSecundarioDoc} onClick={cerrar}>
            Cancelar
          </button>
          <button
            type="button"
            className={botonPrimarioDoc}
            disabled={procesando}
            onClick={() => ejecutar(() => asignarHojaRuta(documento.id_documento))}
          >
            {procesando ? "Asignando…" : "Asignar"}
          </button>
        </div>
      </ModalDoc>

      <ModalDoc
        abierto={accionActiva === "proveido"}
        titulo={numeroProveidos === 0 ? "Primer proveído" : "Segundo proveído"}
        cerrar={cerrar}
      >
        <FormularioProveido
          esSegundo={numeroProveidos === 1}
          secciones={secciones}
          procesando={procesando}
          error={error}
          onRegistrar={(contenido, fechaLimite, destino, tipoAtencion) =>
            ejecutar(() =>
              registrarProveido(expediente.hoja_ruta!.id_hoja_ruta, {
                contenido,
                fecha_hora_limite: fechaLimite || undefined,
                id_seccion_destino: destino,
                tipo_atencion_requerida: tipoAtencion,
              }),
            )
          }
        />
      </ModalDoc>

      <ModalDoc
        abierto={accionActiva === "cumplimiento"}
        titulo="Registrar cumplimiento"
        cerrar={cerrar}
      >
        <FormularioCumplimiento
          idDocumento={documento.id_documento}
          onFinalizar={async () => {
            cerrar();
            await onCambio();
          }}
        />
      </ModalDoc>

      <ModalDoc
        abierto={accionActiva === "respuesta"}
        titulo="Crear documento de respuesta"
        descripcion="Se creará como un documento institucional propio, relacionado (no inicia otro workflow)."
        cerrar={cerrar}
      >
        <FormularioRespuesta
          idDocumentoOriginal={documento.id_documento}
          onFinalizar={async () => {
            cerrar();
            await onCambio();
          }}
        />
      </ModalDoc>

      <ModalDoc abierto={accionActiva === "observar"} titulo="Observar documento" cerrar={cerrar}>
        <FormularioTexto
          etiqueta="Motivo de la observación"
          procesando={procesando}
          error={error}
          onEnviar={(texto) => ejecutar(() => observarDocumento(documento.id_documento, texto))}
        />
      </ModalDoc>

      <ModalDoc
        abierto={accionActiva === "subsanar"}
        titulo="Subsanar y reenviar"
        cerrar={cerrar}
      >
        <FormularioTexto
          etiqueta="Comentario (opcional)"
          requerido={false}
          procesando={procesando}
          error={error}
          onEnviar={(texto) => ejecutar(() => subsanarDocumento(documento.id_documento, texto || undefined))}
        />
      </ModalDoc>

      <ModalDoc abierto={accionActiva === "aprobar"} titulo="Aprobar" cerrar={cerrar}>
        {error && <AvisoDoc tipo="error">{error}</AvisoDoc>}
        <div className="flex justify-end gap-2">
          <button type="button" className={botonSecundarioDoc} onClick={cerrar}>
            Cancelar
          </button>
          <button
            type="button"
            className={botonPrimarioDoc}
            disabled={procesando}
            onClick={() => ejecutar(() => aprobarDocumento(documento.id_documento))}
          >
            {procesando ? "Aprobando…" : "Aprobar"}
          </button>
        </div>
      </ModalDoc>

      <ModalDoc abierto={accionActiva === "finalizar"} titulo="Finalizar documento" cerrar={cerrar}>
        {error && <AvisoDoc tipo="error">{error}</AvisoDoc>}
        <div className="flex justify-end gap-2">
          <button type="button" className={botonSecundarioDoc} onClick={cerrar}>
            Cancelar
          </button>
          <button
            type="button"
            className={botonPrimarioDoc}
            disabled={procesando}
            onClick={() => ejecutar(() => finalizarDocumento(documento.id_documento))}
          >
            {procesando ? "Finalizando…" : "Finalizar"}
          </button>
        </div>
      </ModalDoc>

      <ModalDoc abierto={accionActiva === "archivar"} titulo="Archivar documento" cerrar={cerrar}>
        {error && <AvisoDoc tipo="error">{error}</AvisoDoc>}
        <div className="flex justify-end gap-2">
          <button type="button" className={botonSecundarioDoc} onClick={cerrar}>
            Cancelar
          </button>
          <button
            type="button"
            className={botonPrimarioDoc}
            disabled={procesando}
            onClick={() => ejecutar(() => archivarDocumento(documento.id_documento))}
          >
            {procesando ? "Archivando…" : "Archivar"}
          </button>
        </div>
      </ModalDoc>
    </div>
  );
}

function FormularioEnviar({
  destino,
  procesando,
  error,
  onEnviar,
}: {
  destino: { seccion: Seccion; tipo: TipoMovimientoDocumento };
  procesando: boolean;
  error: string;
  onEnviar: (observacion: string) => void;
}) {
  const [observacion, setObservacion] = useState("");

  return (
    <div className="space-y-3">
      {error && <AvisoDoc tipo="error">{error}</AvisoDoc>}
      {/*
        El destino ya no es una elección libre: lo determina el backend
        según la etapa del workflow (MovimientosService.enviar). Se muestra
        como información, no como campo editable, para no sugerir una
        opción que el servidor rechazaría.
      */}
      <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm">
        <span className="font-semibold text-slate-700">Destino: </span>
        {destino.seccion.nombre.replace("_", " ")}
        {destino.tipo === "DERIVACION" && (
          <span className="ml-1 text-xs text-slate-500">(derivación al área responsable)</span>
        )}
      </div>
      <label className="block text-sm font-semibold text-slate-700">
        Observación (opcional)
        <textarea
          className={`${campoDoc} mt-1`}
          rows={2}
          value={observacion}
          onChange={(e) => setObservacion(e.target.value)}
        />
      </label>
      <div className="flex justify-end">
        <button
          type="button"
          className={botonPrimarioDoc}
          disabled={procesando}
          onClick={() => onEnviar(observacion)}
        >
          {procesando ? "Enviando…" : "Enviar"}
        </button>
      </div>
    </div>
  );
}

function FormularioEditarProveido({
  proveido,
  procesando,
  error,
  onGuardar,
}: {
  proveido: { contenido: string } | null;
  procesando: boolean;
  error: string;
  onGuardar: (contenido: string, fechaLimite: string) => void;
}) {
  const [contenido, setContenido] = useState(proveido?.contenido ?? "");
  const [fechaLimite, setFechaLimite] = useState("");

  return (
    <div className="space-y-3">
      {error && <AvisoDoc tipo="error">{error}</AvisoDoc>}
      <label className="block text-sm font-semibold text-slate-700">
        Contenido / instrucciones
        <textarea
          className={`${campoDoc} mt-1`}
          rows={3}
          value={contenido}
          onChange={(e) => setContenido(e.target.value)}
        />
      </label>
      <label className="block text-sm font-semibold text-slate-700">
        Nueva fecha/hora límite (opcional; deja vacío para no cambiarla)
        <input
          type="datetime-local"
          className={`${campoDoc} mt-1`}
          value={fechaLimite}
          onChange={(e) => setFechaLimite(e.target.value)}
        />
      </label>
      <div className="flex justify-end">
        <button
          type="button"
          className={botonPrimarioDoc}
          disabled={procesando || !contenido.trim()}
          onClick={() =>
            onGuardar(
              contenido.trim(),
              fechaLimite ? new Date(fechaLimite).toISOString() : "",
            )
          }
        >
          {procesando ? "Guardando…" : "Guardar cambios"}
        </button>
      </div>
    </div>
  );
}

function FormularioProveido({
  esSegundo,
  secciones,
  procesando,
  error,
  onRegistrar,
}: {
  esSegundo: boolean;
  secciones: Seccion[];
  procesando: boolean;
  error: string;
  onRegistrar: (
    contenido: string,
    fechaLimite: string,
    destino: number | undefined,
    tipoAtencion: TipoAtencionRequerida | undefined,
  ) => void;
}) {
  const [contenido, setContenido] = useState("");
  const [fechaLimite, setFechaLimite] = useState("");
  const [destino, setDestino] = useState<number | undefined>();
  const [tipoAtencion, setTipoAtencion] = useState<TipoAtencionRequerida | undefined>();
  const seccionesResponsables = secciones.filter(
    (seccion) =>
      seccion.estado && !SECCIONES_INSTITUCIONALES.has(seccion.nombre),
  );

  return (
    <div className="space-y-3">
      {error && <AvisoDoc tipo="error">{error}</AvisoDoc>}
      <label className="block text-sm font-semibold text-slate-700">
        Contenido / instrucciones
        <textarea
          className={`${campoDoc} mt-1`}
          rows={3}
          value={contenido}
          onChange={(e) => setContenido(e.target.value)}
        />
      </label>
      <label className="block text-sm font-semibold text-slate-700">
        Fecha/hora límite (opcional)
        <input
          type="datetime-local"
          className={`${campoDoc} mt-1`}
          value={fechaLimite}
          onChange={(e) => setFechaLimite(e.target.value)}
        />
      </label>
      {esSegundo && (
        <>
          <label className="block text-sm font-semibold text-slate-700">
            Sección responsable
            <select
              className={`${campoDoc} mt-1`}
              value={destino ?? ""}
              onChange={(e) =>
                setDestino(e.target.value ? Number(e.target.value) : undefined)
              }
              required
            >
              <option value="">Seleccionar sección</option>
              {seccionesResponsables.map((s) => (
                <option key={s.id_seccion} value={s.id_seccion}>
                  {nombreSeccion(s.nombre)}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-semibold text-slate-700">
            Tipo de atención requerida
            <select
              className={`${campoDoc} mt-1`}
              value={tipoAtencion ?? ""}
              onChange={(e) =>
                setTipoAtencion(
                  (e.target.value || undefined) as
                    | TipoAtencionRequerida
                    | undefined,
                )
              }
              required
            >
              <option value="">Seleccionar tipo de atención</option>
              <option value="CUMPLIMIENTO">Cumplimiento</option>
              <option value="RESPUESTA">Respuesta institucional</option>
            </select>
          </label>
        </>
      )}
      <div className="flex justify-end">
        <button
          type="button"
          className={botonPrimarioDoc}
          disabled={
            procesando ||
            !contenido.trim() ||
            (esSegundo && (!destino || !tipoAtencion))
          }
          onClick={() =>
            onRegistrar(
              contenido.trim(),
              fechaLimite ? new Date(fechaLimite).toISOString() : "",
              esSegundo ? destino : undefined,
              esSegundo ? tipoAtencion : undefined,
            )
          }
        >
          {procesando ? "Registrando…" : "Registrar proveído"}
        </button>
      </div>
    </div>
  );
}

function FormularioTexto({
  etiqueta,
  requerido = true,
  procesando,
  error,
  onEnviar,
}: {
  etiqueta: string;
  requerido?: boolean;
  procesando: boolean;
  error: string;
  onEnviar: (texto: string) => void;
}) {
  const [texto, setTexto] = useState("");
  return (
    <div className="space-y-3">
      {error && <AvisoDoc tipo="error">{error}</AvisoDoc>}
      <label className="block text-sm font-semibold text-slate-700">
        {etiqueta}
        <textarea
          className={`${campoDoc} mt-1`}
          rows={4}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
        />
      </label>
      <div className="flex justify-end">
        <button
          type="button"
          className={botonPrimarioDoc}
          disabled={procesando || (requerido && !texto.trim())}
          onClick={() => onEnviar(texto.trim())}
        >
          {procesando ? "Enviando…" : "Confirmar"}
        </button>
      </div>
    </div>
  );
}

function FormularioRespuesta({
  idDocumentoOriginal,
  onFinalizar,
}: {
  idDocumentoOriginal: number;
  onFinalizar: () => void | Promise<void>;
}) {
  const [tipoDocumento, setTipoDocumento] = useState<TipoDocumento>("OFICIO");
  const [asunto, setAsunto] = useState("");
  const [sintesis, setSintesis] = useState("");
  const carga = useCargaArchivos();
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState("");
  const [idRespuesta, setIdRespuesta] = useState<number | null>(null);
  const creacionIniciada = useRef(false);

  const crear = async () => {
    if (creacionIniciada.current) return;
    creacionIniciada.current = true;
    let respuestaCreada = false;
    setProcesando(true);
    setError("");
    try {
      const creada = await crearRespuesta(idDocumentoOriginal, {
        tipo_documento: tipoDocumento,
        asunto: asunto.trim(),
        sintesis: sintesis.trim() || undefined,
      });
      respuestaCreada = true;
      setIdRespuesta(creada.respuesta.id_documento);
      const correcto = await carga.subirPendientes((archivo) =>
        subirArchivoDocumento(creada.respuesta.id_documento, archivo),
      );
      if (!correcto) {
        setError(
          "La respuesta quedó registrada, pero no todos los archivos fueron confirmados. Reintente solo los fallidos.",
        );
      }
    } catch (e) {
      setError(mensajeErrorApi(e));
    } finally {
      if (!respuestaCreada) creacionIniciada.current = false;
      setProcesando(false);
    }
  };

  return (
    <div className="space-y-3">
      {error && <AvisoDoc tipo="error">{error}</AvisoDoc>}
      {idRespuesta && carga.items.every((item) => item.estado === "SUBIDO") && (
        <AvisoDoc tipo="exito">
          Respuesta registrada correctamente. {carga.items.length} {carga.items.length === 1 ? "archivo adjunto guardado" : "archivos adjuntos guardados"}.
        </AvisoDoc>
      )}
      <label className="block text-sm font-semibold text-slate-700">
        Tipo de documento
        <select
          className={`${campoDoc} mt-1`}
          value={tipoDocumento}
          onChange={(e) => setTipoDocumento(e.target.value as TipoDocumento)}
        >
          {TIPOS_DOCUMENTO.map((t) => (
            <option key={t} value={t}>
              {t.replace("_", " ")}
            </option>
          ))}
        </select>
      </label>
      <ListaCargaArchivos
        carga={carga}
        deshabilitado={procesando}
        bloquearSeleccion={idRespuesta !== null}
        onReintentar={async (item) => {
          if (!idRespuesta) return;
          const correcto = await carga.subirUno(item, (archivo) =>
            subirArchivoDocumento(idRespuesta, archivo),
          );
          if (correcto) setError("");
        }}
      />
      {idRespuesta && (
        <Link
          href={`/modulos/documentacion/${idRespuesta}`}
          className={botonSecundarioDoc}
        >
          Abrir respuesta registrada
        </Link>
      )}
      <label className="block text-sm font-semibold text-slate-700">
        Asunto
        <input
          className={`${campoDoc} mt-1`}
          value={asunto}
          onChange={(e) => setAsunto(e.target.value)}
        />
      </label>
      <label className="block text-sm font-semibold text-slate-700">
        Síntesis (opcional)
        <textarea
          className={`${campoDoc} mt-1`}
          rows={3}
          value={sintesis}
          onChange={(e) => setSintesis(e.target.value)}
        />
      </label>
      <div className="flex justify-end">
        {idRespuesta && (
          <button
            type="button"
            className={botonSecundarioDoc}
            onClick={() => void onFinalizar()}
          >
            Cerrar y actualizar expediente
          </button>
        )}
        <button
          type="button"
          className={botonPrimarioDoc}
          disabled={procesando || !asunto.trim() || idRespuesta !== null}
          onClick={() => void crear()}
        >
          {procesando ? "Creando…" : "Crear respuesta"}
        </button>
      </div>
    </div>
  );
}

function FormularioCumplimiento({
  idDocumento,
  onFinalizar,
}: {
  idDocumento: number;
  onFinalizar: () => void | Promise<void>;
}) {
  const [descripcion, setDescripcion] = useState("");
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState("");
  const [idCumplimiento, setIdCumplimiento] = useState<number | null>(null);
  const carga = useCargaArchivos();
  const registroIniciado = useRef(false);

  const registrar = async () => {
    if (registroIniciado.current) return;
    registroIniciado.current = true;
    let cumplimientoCreado = false;
    setProcesando(true);
    setError("");
    try {
      const cumplimiento = await registrarCumplimiento(
        idDocumento,
        descripcion.trim(),
      );
      cumplimientoCreado = true;
      setIdCumplimiento(cumplimiento.id_cumplimiento);
      const correcto = await carga.subirPendientes((archivo) =>
        subirArchivoDocumento(idDocumento, archivo, cumplimiento.id_cumplimiento),
      );
      if (!correcto) {
        setError(
          "El cumplimiento quedó registrado, pero no todos los archivos fueron confirmados. Reintente solo los fallidos.",
        );
      }
    } catch (e) {
      setError(mensajeErrorApi(e));
    } finally {
      if (!cumplimientoCreado) registroIniciado.current = false;
      setProcesando(false);
    }
  };

  return (
    <div className="space-y-3">
      {error && <AvisoDoc tipo="error">{error}</AvisoDoc>}
      {idCumplimiento && carga.items.every((item) => item.estado === "SUBIDO") && (
        <AvisoDoc tipo="exito">
          Cumplimiento registrado correctamente. {carga.items.length} {carga.items.length === 1 ? "archivo adjunto guardado" : "archivos adjuntos guardados"}.
        </AvisoDoc>
      )}
      <label className="block text-sm font-semibold text-slate-700">
        Descripción del cumplimiento
        <textarea
          className={`${campoDoc} mt-1`}
          rows={4}
          value={descripcion}
          disabled={idCumplimiento !== null}
          onChange={(e) => setDescripcion(e.target.value)}
        />
      </label>
      <ListaCargaArchivos
        carga={carga}
        deshabilitado={procesando}
        bloquearSeleccion={idCumplimiento !== null}
        onReintentar={async (item) => {
          if (!idCumplimiento) return;
          const correcto = await carga.subirUno(item, (archivo) =>
            subirArchivoDocumento(idDocumento, archivo, idCumplimiento),
          );
          if (correcto) setError("");
        }}
      />
      <div className="flex flex-wrap justify-end gap-2">
        {idCumplimiento && (
          <button
            type="button"
            className={botonSecundarioDoc}
            onClick={() => void onFinalizar()}
          >
            Cerrar y actualizar expediente
          </button>
        )}
        <button
          type="button"
          className={botonPrimarioDoc}
          disabled={procesando || !descripcion.trim() || idCumplimiento !== null}
          onClick={() => void registrar()}
        >
          {procesando ? "Registrando…" : "Registrar cumplimiento"}
        </button>
      </div>
    </div>
  );
}
