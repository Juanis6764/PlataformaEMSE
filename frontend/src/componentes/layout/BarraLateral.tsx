"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useAuth } from "../../contextos/AuthContext";
import {
  esAdministracionDocumental,
  esRadioDocumental,
  esSeguimientoDocumental,
} from "../documentacion/InterfazDocumentacion";

export default function BarraLateral({
  abierto,
  compacto,
  cerrar,
}: {
  abierto: boolean;
  compacto: boolean;
  cerrar: () => void;
}) {
  const pathname = usePathname();
  const { permisos, usuario } = useAuth();

  const hasPermiso = (permiso: string) => permisos.includes(permiso);
  const hasDocumentalPermisos = permisos.some((p) =>
    [
      "DOC_VER_DOCUMENTOS",
      "DOC_CREAR_DOCUMENTO",
      "DOC_ENVIAR_DOCUMENTO",
      "DOC_RECIBIR_DOCUMENTO",
      "DOC_ASIGNAR_HOJA_RUTA",
      "DOC_REGISTRAR_PROVEIDO",
      "DOC_DERIVAR_DOCUMENTO",
      "DOC_REGISTRAR_CUMPLIMIENTO",
      "DOC_CREAR_RESPUESTA",
      "DOC_OBSERVAR_DOCUMENTO",
      "DOC_APROBAR_DOCUMENTO",
      "DOC_FINALIZAR_DOCUMENTO",
      "DOC_ARCHIVAR_DOCUMENTO",
    ].includes(p),
  );
  const rol = usuario?.rol?.toUpperCase();
  const seccion = usuario?.seccion?.toUpperCase() ?? "";
  const esCadete = rol === "CADETE";
  const esAdministrador = rol === "ADMINISTRADOR";
  const esComando = seccion.includes("COMANDO");
  const perteneceDisciplina = seccion.includes("DISCIPLINA");
  const perteneceEvaluaciones = seccion.includes("EVALUACIONES");
  const perteneceEntrenamientoFisico = seccion === "ENTRENAMIENTO_FISICO";
  const esComandoExacto = seccion === "COMANDO";
  const puedeSeguimientoDocumental = esSeguimientoDocumental(usuario);
  const esAdministracionDoc = esAdministracionDocumental(usuario);
  // Único perfil que registra documento principal — DOC_CREAR_DOCUMENTO lo
  // tiene todo el rol ADMINISTRATIVO (Secretaría, Comando, Segundo Comando,
  // áreas), no solo Radio; la sección es la que realmente decide.
  const esRadioDoc = esRadioDocumental(usuario);
  const esConfigurador = hasPermiso("CONFIGURAR_DISCIPLINA") && !esComando;
  const esEncargado =
    hasPermiso("PUBLICAR_NOTAS") && !esComando && !esAdministrador;
  const esJefe =
    hasPermiso("MARCAR_NOTAS_REVISADAS") &&
    !esEncargado &&
    !esComando &&
    !esAdministrador;
  const esSeccion =
    hasPermiso("REVISAR_NOTAS") &&
    !hasPermiso("ENVIAR_NOTAS") &&
    !esEncargado &&
    !esJefe &&
    !esComando &&
    !esAdministrador;
  const esOperador =
    hasPermiso("ENVIAR_NOTAS") &&
    !esConfigurador &&
    !esEncargado &&
    !esComando &&
    !esAdministrador;
  const esEncargadoDisciplina = esEncargado && perteneceDisciplina;
  const esOperadorDisciplina =
    esOperador &&
    (perteneceDisciplina || rol === "OPERADOR_DISCIPLINA");
  const esEncargadoEvaluaciones =
    (esEncargado && perteneceEvaluaciones) ||
    rol === "ENCARGADO_EVALUACIONES";
  const esOperadorEvaluaciones =
    esOperador &&
    (perteneceEvaluaciones || rol === "OPERADOR_EVALUACIONES");
  const esEncargadoEntrenamientoFisico =
    perteneceEntrenamientoFisico &&
    rol === "RESPONSABLE" &&
    hasPermiso("REGISTRAR_NOTAS") &&
    hasPermiso("EDITAR_NOTAS") &&
    hasPermiso("ENVIAR_NOTAS");
  const tieneMenuDisciplina =
    hasPermiso("VER_NOTAS") &&
    (esCadete ||
      esConfigurador ||
      esJefe ||
      esSeccion ||
      esOperadorDisciplina ||
      esEncargadoDisciplina ||
      esComando ||
      esAdministrador);
  const tieneMenuEvaluaciones =
    hasPermiso("VER_NOTAS") &&
    (esCadete ||
      esEncargadoEvaluaciones ||
      esOperadorEvaluaciones ||
      esSeccion ||
      esJefe ||
      esComando);
  const tieneMenuEntrenamientoFisico =
    hasPermiso("VER_NOTAS") &&
    !esCadete &&
    (esEncargadoEntrenamientoFisico ||
      esSeccion ||
      esJefe ||
      esComandoExacto ||
      esAdministrador);

  const navItemClass = (path: string) =>
    `flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all duration-150 active:scale-[0.97] active:shadow-inner ${
      pathname === path || pathname?.startsWith(path + "/")
        ? "bg-[#a3e635] text-[#081c15] shadow-[inset_4px_0_0_#365314,0_5px_14px_rgba(0,0,0,0.28)] ring-1 ring-lime-200/70"
        : "text-gray-300 hover:translate-x-1 hover:bg-[#2d6a4f] hover:text-white hover:shadow-md"
    }`;

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 flex h-dvh flex-col overflow-hidden border-r border-[#1b4332] bg-[var(--color-military-green-dark)] text-white shadow-lg transition-all duration-200 ${compacto ? "lg:w-20 lg:[&_.font-medium]:hidden lg:[&_p]:hidden lg:[&_a]:justify-center" : "lg:w-64"} w-72 ${abierto ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
    >
      <div className="h-20 flex items-center justify-center gap-3 border-b border-[#1b4332] bg-[#0f241a]">
        <div className="relative w-10 h-10 bg-white/10 rounded-full p-1 drop-shadow-md flex-shrink-0">
          <Image
            src="/imagenes/logoemse.png"
            alt="Logo EMSE"
            fill
            sizes="40px"
            className="object-contain drop-shadow-md p-0.5"
          />
        </div>
        {!compacto && (
          <span className="font-extrabold text-2xl tracking-widest text-[var(--color-soft-gold)] uppercase drop-shadow-sm">
            EMSE
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {hasPermiso("VER_PANEL") && (
          <Link
            onClick={cerrar}
            href="/panel"
            className={navItemClass("/panel")}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect width="7" height="9" x="3" y="3" rx="1" />
              <rect width="7" height="5" x="14" y="3" rx="1" />
              <rect width="7" height="9" x="14" y="12" rx="1" />
              <rect width="7" height="5" x="3" y="16" rx="1" />
            </svg>
            <span className="font-medium">Panel Principal</span>
          </Link>
        )}

        <div className="pt-4 pb-2">
          <p className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Control de Acceso
          </p>
        </div>

        {hasPermiso("LISTAR_USUARIOS") && (
          <Link
            onClick={cerrar}
            href="/modulos/control-acceso/usuarios"
            className={navItemClass("/modulos/control-acceso/usuarios")}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            <span className="font-medium text-sm">Usuarios</span>
          </Link>
        )}

        {hasPermiso("LISTAR_CADETES") && (
          <Link
            onClick={cerrar}
            href="/modulos/control-acceso/cadetes"
            className={navItemClass("/modulos/control-acceso/cadetes")}
          >
            <span className="text-xl">♟</span>
            <span className="font-medium text-sm">Estudiantes</span>
          </Link>
        )}

        {hasPermiso("GESTIONAR_ROLES") && (
          <Link
            onClick={cerrar}
            href="/modulos/control-acceso/roles"
            className={navItemClass("/modulos/control-acceso/roles")}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <span className="font-medium text-sm">Roles</span>
          </Link>
        )}

        {hasPermiso("GESTIONAR_SECCIONES") && (
          <Link
            onClick={cerrar}
            href="/modulos/control-acceso/secciones"
            className={navItemClass("/modulos/control-acceso/secciones")}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z" />
              <path d="m3 9 2.45-4.9A2 2 0 0 1 7.24 3h9.52a2 2 0 0 1 1.8 1.1L21 9" />
              <path d="M12 3v6" />
            </svg>
            <span className="font-medium text-sm">Secciones</span>
          </Link>
        )}

        {esCadete && hasPermiso("VER_NOTAS") && (
          <div className="pt-4 pb-2">
            <p className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Mis notas
            </p>
          </div>
        )}

        {esCadete && hasPermiso("VER_NOTAS") && (
          <Link
            onClick={cerrar}
            href="/mis-notas/disciplina"
            className={navItemClass("/mis-notas/disciplina")}
          >
            <span className="text-xl">◉</span>
            <span className="font-medium text-sm">Mi Disciplina</span>
          </Link>
        )}

        {esCadete && hasPermiso("VER_NOTAS") && (
          <Link
            onClick={cerrar}
            href="/mis-notas/evaluaciones"
            className={navItemClass("/mis-notas/evaluaciones")}
          >
            <span className="text-xl">Σ</span>
            <span className="font-medium text-sm">Evaluaciones</span>
          </Link>
        )}

        {tieneMenuDisciplina && !esCadete && (
          <div className="pt-4 pb-2">
            <p className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Notas · Disciplina
            </p>
          </div>
        )}

        {esOperadorDisciplina && (
          <Link
            onClick={cerrar}
            href="/modulos/notas/disciplina/registro"
            className={navItemClass("/modulos/notas/disciplina/registro")}
          >
            <span className="text-xl">✎</span>
            <span className="font-medium text-sm">Registro semanal</span>
          </Link>
        )}

        {esOperadorDisciplina && (
          <Link
            onClick={cerrar}
            href="/modulos/notas/disciplina/cuadro-demostrativo"
            className={navItemClass(
              "/modulos/notas/disciplina/cuadro-demostrativo",
            )}
          >
            <span className="text-xl">▦</span>
            <span className="font-medium text-sm">Cuadro demostrativo</span>
          </Link>
        )}

        {esConfigurador && (
          <Link
            onClick={cerrar}
            href="/modulos/notas/disciplina/configuracion"
            className={navItemClass("/modulos/notas/disciplina/configuracion")}
          >
            <span className="text-xl">⚙</span>
            <span className="font-medium text-sm">Configuración</span>
          </Link>
        )}

        {esEncargadoDisciplina && (
          <>
            <Link
              onClick={cerrar}
              href="/modulos/notas/disciplina/revision"
              className={navItemClass("/modulos/notas/disciplina/revision")}
            >
              <span className="text-xl">✓</span>
              <span className="font-medium text-sm">Revisión</span>
            </Link>
            <Link
              onClick={cerrar}
              href="/modulos/notas/disciplina/consulta"
              className={navItemClass("/modulos/notas/disciplina/consulta")}
            >
              <span className="text-xl">◎</span>
              <span className="font-medium text-sm">Consulta</span>
            </Link>
            <Link
              onClick={cerrar}
              href="/modulos/notas/disciplina/acumulado"
              className={navItemClass("/modulos/notas/disciplina/acumulado")}
            >
              <span className="text-xl">∑</span>
              <span className="font-medium text-sm">Acumulado</span>
            </Link>
            <Link
              onClick={cerrar}
              href="/modulos/notas/disciplina/notas-finales"
              className={navItemClass(
                "/modulos/notas/disciplina/notas-finales",
              )}
            >
              <span className="text-xl">100</span>
              <span className="font-medium text-sm">Notas finales</span>
            </Link>
          </>
        )}

        {esAdministrador && hasPermiso("VER_NOTAS") && (
          <Link
            onClick={cerrar}
            href="/modulos/notas/disciplina/consulta"
            className={navItemClass("/modulos/notas/disciplina/consulta")}
          >
            <span className="text-xl">◎</span>
            <span className="font-medium text-sm">Consulta de Disciplina</span>
          </Link>
        )}

        {esComando && hasPermiso("VER_NOTAS") && (
          <Link
            onClick={cerrar}
            href="/modulos/notas/disciplina/consulta"
            className={navItemClass("/modulos/notas/disciplina/consulta")}
          >
            <span className="text-xl">◎</span>
            <span className="font-medium text-sm">Consulta de Disciplina</span>
          </Link>
        )}

        {esSeccion && (
          <>
            <Link
              onClick={cerrar}
              href="/modulos/notas/disciplina/revision"
              className={navItemClass("/modulos/notas/disciplina/revision")}
            >
              <span className="text-xl">⌛</span>
              <span className="font-medium text-sm">Revisión</span>
            </Link>
            <Link
              onClick={cerrar}
              href="/modulos/notas/disciplina/consulta"
              className={navItemClass("/modulos/notas/disciplina/consulta")}
            >
              <span className="text-xl">◎</span>
              <span className="font-medium text-sm">Consulta</span>
            </Link>
          </>
        )}

        {esJefe && (
          <>
            <Link
              onClick={cerrar}
              href="/modulos/notas/disciplina/revision"
              className={navItemClass("/modulos/notas/disciplina/revision")}
            >
              <span className="text-xl">★</span>
              <span className="font-medium text-sm">Revisión final</span>
            </Link>
            <Link
              onClick={cerrar}
              href="/modulos/notas/disciplina/consulta"
              className={navItemClass("/modulos/notas/disciplina/consulta")}
            >
              <span className="text-xl">◎</span>
              <span className="font-medium text-sm">Consulta</span>
            </Link>
          </>
        )}

        {tieneMenuEvaluaciones && !esCadete && (
          <div className="pt-4 pb-2">
            <p className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Notas · Evaluaciones
            </p>
          </div>
        )}

        {esOperadorEvaluaciones && (
          <Link
            onClick={cerrar}
            href="/modulos/notas/evaluaciones/registro"
            className={navItemClass("/modulos/notas/evaluaciones/registro")}
          >
            <span className="text-xl">✎</span>
            <span className="font-medium text-sm">Registro de materias</span>
          </Link>
        )}

        {esEncargadoEvaluaciones && (
          <>
            <Link
              onClick={cerrar}
              href="/modulos/notas/evaluaciones/configuracion"
              className={navItemClass(
                "/modulos/notas/evaluaciones/configuracion",
              )}
            >
              <span className="text-xl">⚙</span>
              <span className="font-medium text-sm">Configuración</span>
            </Link>
            <Link
              onClick={cerrar}
              href="/modulos/notas/evaluaciones/revision"
              className={navItemClass("/modulos/notas/evaluaciones/revision")}
            >
              <span className="text-xl">✓</span>
              <span className="font-medium text-sm">Revisión</span>
            </Link>
            <Link
              onClick={cerrar}
              href="/modulos/notas/evaluaciones/consulta"
              className={navItemClass("/modulos/notas/evaluaciones/consulta")}
            >
              <span className="text-xl">◎</span>
              <span className="font-medium text-sm">Consulta</span>
            </Link>
            <Link
              onClick={cerrar}
              href="/modulos/notas/evaluaciones/matriz"
              className={navItemClass("/modulos/notas/evaluaciones/matriz")}
            >
              <span className="text-xl">▦</span>
              <span className="font-medium text-sm">Matriz de Notas Final</span>
            </Link>
          </>
        )}

        {esSeccion && (
          <>
            <Link
              onClick={cerrar}
              href="/modulos/notas/evaluaciones/revision"
              className={navItemClass("/modulos/notas/evaluaciones/revision")}
            >
              <span className="text-xl">⌛</span>
              <span className="font-medium text-sm">Revisión</span>
            </Link>
            <Link
              onClick={cerrar}
              href="/modulos/notas/evaluaciones/consulta"
              className={navItemClass("/modulos/notas/evaluaciones/consulta")}
            >
              <span className="text-xl">◎</span>
              <span className="font-medium text-sm">Consulta</span>
            </Link>
          </>
        )}

        {esJefe && (
          <>
            <Link
              onClick={cerrar}
              href="/modulos/notas/evaluaciones/revision"
              className={navItemClass("/modulos/notas/evaluaciones/revision")}
            >
              <span className="text-xl">★</span>
              <span className="font-medium text-sm">Revisión final</span>
            </Link>
            <Link
              onClick={cerrar}
              href="/modulos/notas/evaluaciones/consulta"
              className={navItemClass("/modulos/notas/evaluaciones/consulta")}
            >
              <span className="text-xl">◎</span>
              <span className="font-medium text-sm">Consulta</span>
            </Link>
          </>
        )}

        {esComando && hasPermiso("VER_NOTAS") && (
          <Link
            onClick={cerrar}
            href="/modulos/notas/evaluaciones/consulta"
            className={navItemClass("/modulos/notas/evaluaciones/consulta")}
          >
            <span className="text-xl">◎</span>
            <span className="font-medium text-sm">Consulta</span>
          </Link>
        )}

        {(esComando || esJefe || esSeccion) &&
          hasPermiso("MODIFICAR_NOTA_BLOQUEADA") && (
          <Link
            onClick={cerrar}
            href="/modulos/notas/evaluaciones/correccion-extraordinaria"
            className={navItemClass(
              "/modulos/notas/evaluaciones/correccion-extraordinaria",
            )}
          >
            <span className="text-xl">✎</span>
            <span className="font-medium text-sm">Corrección extraordinaria</span>
          </Link>
        )}

        {(esSeccion || esJefe || esComando) && hasPermiso("VER_NOTAS") && (
          <Link
            onClick={cerrar}
            href="/modulos/notas/evaluaciones/matriz"
            className={navItemClass("/modulos/notas/evaluaciones/matriz")}
          >
            <span className="text-xl">▦</span>
            <span className="font-medium text-sm">Matrices académicas</span>
          </Link>
        )}

        {tieneMenuEntrenamientoFisico && (
          <div className="pt-4 pb-2">
            <p className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Notas · Entrenamiento Físico
            </p>
          </div>
        )}

        {esEncargadoEntrenamientoFisico && (
          <>
            <Link
              onClick={cerrar}
              href="/modulos/notas/entrenamiento-fisico/registro"
              className={navItemClass(
                "/modulos/notas/entrenamiento-fisico/registro",
              )}
            >
              <span className="text-xl">✎</span>
              <span className="font-medium text-sm">Registro de notas</span>
            </Link>
            <Link
              onClick={cerrar}
              href="/modulos/notas/entrenamiento-fisico/consulta"
              className={navItemClass(
                "/modulos/notas/entrenamiento-fisico/consulta",
              )}
            >
              <span className="text-xl">◎</span>
              <span className="font-medium text-sm">Consulta</span>
            </Link>
            <Link
              onClick={cerrar}
              href="/modulos/notas/entrenamiento-fisico/resultados-finales"
              className={navItemClass(
                "/modulos/notas/entrenamiento-fisico/resultados-finales",
              )}
            >
              <span className="text-xl">100</span>
              <span className="font-medium text-sm">Resultados finales</span>
            </Link>
          </>
        )}

        {esSeccion && tieneMenuEntrenamientoFisico && (
          <>
            <Link
              onClick={cerrar}
              href="/modulos/notas/entrenamiento-fisico/revision"
              className={navItemClass(
                "/modulos/notas/entrenamiento-fisico/revision",
              )}
            >
              <span className="text-xl">⌛</span>
              <span className="font-medium text-sm">Revisión</span>
            </Link>
            <Link
              onClick={cerrar}
              href="/modulos/notas/entrenamiento-fisico/consulta"
              className={navItemClass(
                "/modulos/notas/entrenamiento-fisico/consulta",
              )}
            >
              <span className="text-xl">◎</span>
              <span className="font-medium text-sm">Consulta</span>
            </Link>
          </>
        )}

        {esJefe && tieneMenuEntrenamientoFisico && (
          <>
            <Link
              onClick={cerrar}
              href="/modulos/notas/entrenamiento-fisico/revision"
              className={navItemClass(
                "/modulos/notas/entrenamiento-fisico/revision",
              )}
            >
              <span className="text-xl">★</span>
              <span className="font-medium text-sm">Revisión final</span>
            </Link>
            <Link
              onClick={cerrar}
              href="/modulos/notas/entrenamiento-fisico/consulta"
              className={navItemClass(
                "/modulos/notas/entrenamiento-fisico/consulta",
              )}
            >
              <span className="text-xl">◎</span>
              <span className="font-medium text-sm">Consulta</span>
            </Link>
          </>
        )}

        {(esComandoExacto || esAdministrador) &&
          tieneMenuEntrenamientoFisico && (
            <Link
              onClick={cerrar}
              href="/modulos/notas/entrenamiento-fisico/consulta"
              className={navItemClass(
                "/modulos/notas/entrenamiento-fisico/consulta",
              )}
            >
              <span className="text-xl">◎</span>
              <span className="font-medium text-sm">Consulta</span>
            </Link>
          )}

        {hasPermiso("GESTIONAR_GESTION_ACADEMICA") && (
          <Link
            onClick={cerrar}
            href="/modulos/gestion-academica"
            className={navItemClass("/modulos/gestion-academica")}
          >
            <span className="text-xl">🗂️</span>
            <span className="font-medium text-sm">Gestión Académica</span>
          </Link>
        )}

        {hasPermiso("GESTIONAR_SECCIONES") && (
          <Link
            onClick={cerrar}
            href="/modulos/control-acceso/asignaciones"
            className={navItemClass("/modulos/control-acceso/asignaciones")}
          >
            <span className="text-xl">⇄</span>
            <span className="font-medium text-sm">Asignaciones</span>
          </Link>
        )}

        {(hasDocumentalPermisos ||
          (hasPermiso("ACCEDER_ACADEMICO") && !hasPermiso("VER_NOTAS"))) && (
          <div className="pt-4 pb-2">
            <p className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Otros Módulos
            </p>
          </div>
        )}

        {hasDocumentalPermisos && (
          <>
            {hasPermiso("DOC_VER_DOCUMENTOS") && puedeSeguimientoDocumental && (
              <Link
                onClick={cerrar}
                href="/documentacion/seguimiento"
                className={navItemClass("/documentacion/seguimiento")}
              >
                <span className="text-xl">◉</span>
                <span className="font-medium text-sm">Seguimiento documental</span>
              </Link>
            )}
            {/* El administrador institucional es monitor; la sección
                Administración es un área operativa y reutiliza la bandeja. */}
            {hasPermiso("DOC_VER_DOCUMENTOS") &&
              (!esAdministrador || esAdministracionDoc) && (
              <Link
                onClick={cerrar}
                href="/modulos/documentacion/bandeja"
                className={navItemClass("/modulos/documentacion/bandeja")}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                <span className="font-medium text-sm">Documental · Bandeja</span>
              </Link>
            )}
            {hasPermiso("DOC_CREAR_DOCUMENTO") && esRadioDoc && (
              <Link
                onClick={cerrar}
                href="/modulos/documentacion/registrar"
                className={navItemClass("/modulos/documentacion/registrar")}
              >
                <span className="text-xl">✎</span>
                <span className="font-medium text-sm">Registrar documento</span>
              </Link>
            )}
            {hasPermiso("DOC_VER_DOCUMENTOS") && (
              <Link
                onClick={cerrar}
                href="/modulos/documentacion/reportes"
                className={navItemClass("/modulos/documentacion/reportes")}
              >
                <span className="text-xl">◎</span>
                <span className="font-medium text-sm">Reportes</span>
              </Link>
            )}
          </>
        )}

        {hasPermiso("ACCEDER_ACADEMICO") && !hasPermiso("VER_NOTAS") && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-md text-gray-400 opacity-70 cursor-not-allowed">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
              <path d="M6 12v5c3 3 9 3 12 0v-5" />
            </svg>
            <span className="font-medium text-sm flex-1">Académico</span>
            <span className="text-[10px] bg-gray-700 px-1.5 py-0.5 rounded text-gray-300">
              Próx.
            </span>
          </div>
        )}
      </div>
    </aside>
  );
}
