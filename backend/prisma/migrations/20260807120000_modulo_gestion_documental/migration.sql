-- Módulo Gestión Documental (FASE 1 — base de datos)
-- Generado con `prisma migrate diff --from-config-datasource --to-schema` (sin
-- shadow database, por un problema preexistente y ajeno a este módulo al
-- reproducir el historial completo de migraciones en una BD vacía: la
-- migración 20260722001000_reestructuracion_usuarios_jerarquia inserta filas
-- en AsignacionAcademica con id_usuario hardcodeados que solo existen en la
-- BD real, no en una shadow DB vacía).
--
-- Se excluyó manualmente una línea ajena al módulo documental que el diff
-- automático incluyó por un drift preexistente y no relacionado en el
-- módulo de Disciplina (ALTER TABLE "CatalogoDisciplina" ALTER COLUMN
-- "nombre" SET DATA TYPE VARCHAR(200)) — no se toca Disciplina en esta
-- migración.

-- CreateEnum
CREATE TYPE "TipoDocumento" AS ENUM ('RADIOGRAMA', 'MEMORANDUM', 'OFICIO', 'NOTA_SERVICIO');

-- CreateEnum
CREATE TYPE "TipoAtencionRequerida" AS ENUM ('CUMPLIMIENTO', 'RESPUESTA');

-- CreateEnum
CREATE TYPE "AmbitoCorrelativoDocumental" AS ENUM ('HOJA_RUTA', 'DOC_RADIOGRAMA', 'DOC_MEMORANDUM', 'DOC_OFICIO', 'DOC_NOTA_SERVICIO');

-- CreateEnum
CREATE TYPE "PrioridadDocumento" AS ENUM ('RUTINARIO', 'URGENTE');

-- CreateEnum
CREATE TYPE "ClasificacionDocumento" AS ENUM ('PUBLICO', 'CONFIDENCIAL', 'RESERVADO', 'SECRETO');

-- CreateEnum
CREATE TYPE "EstadoDocumento" AS ENUM ('REGISTRADO', 'EN_TRANSITO', 'EN_TRAMITE', 'OBSERVADO', 'APROBADO', 'FINALIZADO', 'ARCHIVADO');

-- CreateEnum
CREATE TYPE "TipoMovimientoDocumento" AS ENUM ('ENVIO', 'DERIVACION', 'DEVOLUCION', 'REENVIO');

-- CreateEnum
CREATE TYPE "EstadoMovimiento" AS ENUM ('PENDIENTE', 'RECIBIDO', 'ANULADO');

-- CreateEnum
CREATE TYPE "TipoRelacionDocumento" AS ENUM ('RESPUESTA', 'ANEXO', 'CORRECCION');

-- CreateEnum
CREATE TYPE "ProveedorAlmacenamiento" AS ENUM ('LOCAL', 'S3');

-- CreateTable
CREATE TABLE "CorrelativoDocumental" (
    "id_correlativo" SERIAL NOT NULL,
    "ambito" "AmbitoCorrelativoDocumental" NOT NULL,
    "anio" INTEGER NOT NULL,
    "ultimo_numero" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CorrelativoDocumental_pkey" PRIMARY KEY ("id_correlativo")
);

-- CreateTable
CREATE TABLE "Documento" (
    "id_documento" SERIAL NOT NULL,
    "codigo_interno" VARCHAR(30) NOT NULL,
    "tipo_documento" "TipoDocumento" NOT NULL,
    "numero_origen" VARCHAR(60),
    "procedencia" VARCHAR(200),
    "asunto" VARCHAR(300) NOT NULL,
    "sintesis" TEXT,
    "prioridad" "PrioridadDocumento" NOT NULL DEFAULT 'RUTINARIO',
    "clasificacion" "ClasificacionDocumento" NOT NULL DEFAULT 'PUBLICO',
    "fecha_documento" TIMESTAMP(3),
    "id_usuario_registro" INTEGER NOT NULL,
    "id_seccion_registro" INTEGER NOT NULL,
    "fecha_hora_registro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Documento_pkey" PRIMARY KEY ("id_documento")
);

-- CreateTable
CREATE TABLE "ExpedienteDocumento" (
    "id_documento" INTEGER NOT NULL,
    "estado_actual" "EstadoDocumento" NOT NULL,
    "id_seccion_actual" INTEGER NOT NULL,
    "id_usuario_responsable_actual" INTEGER,
    "fecha_hora_actualizacion" TIMESTAMP(3) NOT NULL,
    "tipo_atencion_requerida" "TipoAtencionRequerida",

    CONSTRAINT "ExpedienteDocumento_pkey" PRIMARY KEY ("id_documento")
);

-- CreateTable
CREATE TABLE "HojaRuta" (
    "id_hoja_ruta" SERIAL NOT NULL,
    "numero" VARCHAR(30) NOT NULL,
    "id_documento" INTEGER NOT NULL,
    "id_usuario_asigno" INTEGER NOT NULL,
    "id_seccion" INTEGER NOT NULL,
    "fecha_hora_asignacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_hora_cierre" TIMESTAMP(3),

    CONSTRAINT "HojaRuta_pkey" PRIMARY KEY ("id_hoja_ruta")
);

-- CreateTable
CREATE TABLE "Proveido" (
    "id_proveido" SERIAL NOT NULL,
    "id_hoja_ruta" INTEGER NOT NULL,
    "numero_momento" INTEGER NOT NULL,
    "contenido" TEXT NOT NULL,
    "fecha_hora" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "id_usuario_emisor" INTEGER NOT NULL,
    "id_seccion_emisora" INTEGER NOT NULL,
    "id_seccion_destino" INTEGER,

    CONSTRAINT "Proveido_pkey" PRIMARY KEY ("id_proveido")
);

-- CreateTable
CREATE TABLE "PlazoDocumento" (
    "id_plazo" SERIAL NOT NULL,
    "id_proveido" INTEGER NOT NULL,
    "id_seccion_responsable" INTEGER NOT NULL,
    "id_usuario_responsable" INTEGER,
    "fecha_hora_limite" TIMESTAMP(3) NOT NULL,
    "fecha_hora_cumplimiento" TIMESTAMP(3),

    CONSTRAINT "PlazoDocumento_pkey" PRIMARY KEY ("id_plazo")
);

-- CreateTable
CREATE TABLE "MovimientoDocumento" (
    "id_movimiento" SERIAL NOT NULL,
    "id_documento" INTEGER NOT NULL,
    "id_seccion_origen" INTEGER NOT NULL,
    "id_seccion_destino" INTEGER NOT NULL,
    "id_usuario_envia" INTEGER NOT NULL,
    "fecha_hora_envio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "id_usuario_recibe" INTEGER,
    "fecha_hora_recepcion" TIMESTAMP(3),
    "tipo_movimiento" "TipoMovimientoDocumento" NOT NULL,
    "estado_movimiento" "EstadoMovimiento" NOT NULL DEFAULT 'PENDIENTE',
    "observacion" TEXT,

    CONSTRAINT "MovimientoDocumento_pkey" PRIMARY KEY ("id_movimiento")
);

-- CreateTable
CREATE TABLE "HistorialEstadoDocumento" (
    "id_historial" SERIAL NOT NULL,
    "id_documento" INTEGER NOT NULL,
    "estado_anterior" "EstadoDocumento",
    "estado_nuevo" "EstadoDocumento" NOT NULL,
    "id_usuario" INTEGER NOT NULL,
    "id_seccion" INTEGER NOT NULL,
    "fecha_hora" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "motivo" TEXT,

    CONSTRAINT "HistorialEstadoDocumento_pkey" PRIMARY KEY ("id_historial")
);

-- CreateTable
CREATE TABLE "CumplimientoDocumento" (
    "id_cumplimiento" SERIAL NOT NULL,
    "id_documento" INTEGER NOT NULL,
    "descripcion" TEXT NOT NULL,
    "id_usuario" INTEGER NOT NULL,
    "id_seccion" INTEGER NOT NULL,
    "fecha_hora" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CumplimientoDocumento_pkey" PRIMARY KEY ("id_cumplimiento")
);

-- CreateTable
CREATE TABLE "DocumentoRelacionado" (
    "id_relacion" SERIAL NOT NULL,
    "id_documento_origen" INTEGER NOT NULL,
    "id_documento_relacionado" INTEGER NOT NULL,
    "tipo_relacion" "TipoRelacionDocumento" NOT NULL,
    "id_usuario_registro" INTEGER NOT NULL,
    "fecha_hora" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentoRelacionado_pkey" PRIMARY KEY ("id_relacion")
);

-- CreateTable
CREATE TABLE "ObservacionDocumento" (
    "id_observacion" SERIAL NOT NULL,
    "id_documento" INTEGER NOT NULL,
    "id_usuario" INTEGER NOT NULL,
    "id_seccion" INTEGER NOT NULL,
    "descripcion" TEXT NOT NULL,
    "fecha_hora" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "subsanada" BOOLEAN NOT NULL DEFAULT false,
    "fecha_hora_subsanacion" TIMESTAMP(3),

    CONSTRAINT "ObservacionDocumento_pkey" PRIMARY KEY ("id_observacion")
);

-- CreateTable
CREATE TABLE "ArchivoDocumento" (
    "id_archivo" SERIAL NOT NULL,
    "id_documento" INTEGER NOT NULL,
    "id_cumplimiento" INTEGER,
    "nombre_original" VARCHAR(255) NOT NULL,
    "clave_almacenamiento" VARCHAR(500) NOT NULL,
    "proveedor_almacenamiento" "ProveedorAlmacenamiento" NOT NULL DEFAULT 'LOCAL',
    "tipo_mime" VARCHAR(120) NOT NULL,
    "tamano_bytes" INTEGER NOT NULL,
    "hash_sha256" CHAR(64) NOT NULL,
    "cifrado" BOOLEAN NOT NULL DEFAULT false,
    "id_usuario_subida" INTEGER NOT NULL,
    "fecha_hora_subida" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArchivoDocumento_pkey" PRIMARY KEY ("id_archivo")
);

-- CreateIndex
CREATE UNIQUE INDEX "CorrelativoDocumental_ambito_anio_key" ON "CorrelativoDocumental"("ambito", "anio");

-- CreateIndex
CREATE UNIQUE INDEX "Documento_codigo_interno_key" ON "Documento"("codigo_interno");

-- CreateIndex
CREATE INDEX "Documento_tipo_documento_idx" ON "Documento"("tipo_documento");

-- CreateIndex
CREATE INDEX "Documento_prioridad_idx" ON "Documento"("prioridad");

-- CreateIndex
CREATE INDEX "Documento_numero_origen_idx" ON "Documento"("numero_origen");

-- CreateIndex
CREATE INDEX "Documento_fecha_hora_registro_idx" ON "Documento"("fecha_hora_registro");

-- CreateIndex
CREATE INDEX "ExpedienteDocumento_estado_actual_idx" ON "ExpedienteDocumento"("estado_actual");

-- CreateIndex
CREATE INDEX "ExpedienteDocumento_id_seccion_actual_idx" ON "ExpedienteDocumento"("id_seccion_actual");

-- CreateIndex
CREATE UNIQUE INDEX "HojaRuta_numero_key" ON "HojaRuta"("numero");

-- CreateIndex
CREATE UNIQUE INDEX "HojaRuta_id_documento_key" ON "HojaRuta"("id_documento");

-- CreateIndex
CREATE INDEX "Proveido_id_hoja_ruta_idx" ON "Proveido"("id_hoja_ruta");

-- CreateIndex
CREATE UNIQUE INDEX "Proveido_id_hoja_ruta_numero_momento_key" ON "Proveido"("id_hoja_ruta", "numero_momento");

-- CreateIndex
CREATE UNIQUE INDEX "PlazoDocumento_id_proveido_key" ON "PlazoDocumento"("id_proveido");

-- CreateIndex
CREATE INDEX "PlazoDocumento_fecha_hora_limite_idx" ON "PlazoDocumento"("fecha_hora_limite");

-- CreateIndex
CREATE INDEX "MovimientoDocumento_id_documento_idx" ON "MovimientoDocumento"("id_documento");

-- CreateIndex
CREATE INDEX "MovimientoDocumento_id_seccion_destino_estado_movimiento_idx" ON "MovimientoDocumento"("id_seccion_destino", "estado_movimiento");

-- CreateIndex
CREATE INDEX "HistorialEstadoDocumento_id_documento_fecha_hora_idx" ON "HistorialEstadoDocumento"("id_documento", "fecha_hora");

-- CreateIndex
CREATE INDEX "CumplimientoDocumento_id_documento_idx" ON "CumplimientoDocumento"("id_documento");

-- CreateIndex
CREATE UNIQUE INDEX "CumplimientoDocumento_id_cumplimiento_id_documento_key" ON "CumplimientoDocumento"("id_cumplimiento", "id_documento");

-- CreateIndex
CREATE INDEX "DocumentoRelacionado_id_documento_relacionado_idx" ON "DocumentoRelacionado"("id_documento_relacionado");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentoRelacionado_id_documento_origen_id_documento_relac_key" ON "DocumentoRelacionado"("id_documento_origen", "id_documento_relacionado", "tipo_relacion");

-- CreateIndex
CREATE INDEX "ObservacionDocumento_id_documento_subsanada_idx" ON "ObservacionDocumento"("id_documento", "subsanada");

-- CreateIndex
CREATE UNIQUE INDEX "ArchivoDocumento_clave_almacenamiento_key" ON "ArchivoDocumento"("clave_almacenamiento");

-- CreateIndex
CREATE INDEX "ArchivoDocumento_id_documento_idx" ON "ArchivoDocumento"("id_documento");

-- AddForeignKey
ALTER TABLE "Documento" ADD CONSTRAINT "Documento_id_usuario_registro_fkey" FOREIGN KEY ("id_usuario_registro") REFERENCES "Usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Documento" ADD CONSTRAINT "Documento_id_seccion_registro_fkey" FOREIGN KEY ("id_seccion_registro") REFERENCES "Seccion"("id_seccion") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpedienteDocumento" ADD CONSTRAINT "ExpedienteDocumento_id_documento_fkey" FOREIGN KEY ("id_documento") REFERENCES "Documento"("id_documento") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpedienteDocumento" ADD CONSTRAINT "ExpedienteDocumento_id_seccion_actual_fkey" FOREIGN KEY ("id_seccion_actual") REFERENCES "Seccion"("id_seccion") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpedienteDocumento" ADD CONSTRAINT "ExpedienteDocumento_id_usuario_responsable_actual_fkey" FOREIGN KEY ("id_usuario_responsable_actual") REFERENCES "Usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HojaRuta" ADD CONSTRAINT "HojaRuta_id_documento_fkey" FOREIGN KEY ("id_documento") REFERENCES "ExpedienteDocumento"("id_documento") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HojaRuta" ADD CONSTRAINT "HojaRuta_id_usuario_asigno_fkey" FOREIGN KEY ("id_usuario_asigno") REFERENCES "Usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HojaRuta" ADD CONSTRAINT "HojaRuta_id_seccion_fkey" FOREIGN KEY ("id_seccion") REFERENCES "Seccion"("id_seccion") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proveido" ADD CONSTRAINT "Proveido_id_hoja_ruta_fkey" FOREIGN KEY ("id_hoja_ruta") REFERENCES "HojaRuta"("id_hoja_ruta") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proveido" ADD CONSTRAINT "Proveido_id_usuario_emisor_fkey" FOREIGN KEY ("id_usuario_emisor") REFERENCES "Usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proveido" ADD CONSTRAINT "Proveido_id_seccion_emisora_fkey" FOREIGN KEY ("id_seccion_emisora") REFERENCES "Seccion"("id_seccion") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proveido" ADD CONSTRAINT "Proveido_id_seccion_destino_fkey" FOREIGN KEY ("id_seccion_destino") REFERENCES "Seccion"("id_seccion") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlazoDocumento" ADD CONSTRAINT "PlazoDocumento_id_proveido_fkey" FOREIGN KEY ("id_proveido") REFERENCES "Proveido"("id_proveido") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlazoDocumento" ADD CONSTRAINT "PlazoDocumento_id_seccion_responsable_fkey" FOREIGN KEY ("id_seccion_responsable") REFERENCES "Seccion"("id_seccion") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlazoDocumento" ADD CONSTRAINT "PlazoDocumento_id_usuario_responsable_fkey" FOREIGN KEY ("id_usuario_responsable") REFERENCES "Usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoDocumento" ADD CONSTRAINT "MovimientoDocumento_id_documento_fkey" FOREIGN KEY ("id_documento") REFERENCES "ExpedienteDocumento"("id_documento") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoDocumento" ADD CONSTRAINT "MovimientoDocumento_id_seccion_origen_fkey" FOREIGN KEY ("id_seccion_origen") REFERENCES "Seccion"("id_seccion") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoDocumento" ADD CONSTRAINT "MovimientoDocumento_id_seccion_destino_fkey" FOREIGN KEY ("id_seccion_destino") REFERENCES "Seccion"("id_seccion") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoDocumento" ADD CONSTRAINT "MovimientoDocumento_id_usuario_envia_fkey" FOREIGN KEY ("id_usuario_envia") REFERENCES "Usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoDocumento" ADD CONSTRAINT "MovimientoDocumento_id_usuario_recibe_fkey" FOREIGN KEY ("id_usuario_recibe") REFERENCES "Usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistorialEstadoDocumento" ADD CONSTRAINT "HistorialEstadoDocumento_id_documento_fkey" FOREIGN KEY ("id_documento") REFERENCES "ExpedienteDocumento"("id_documento") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistorialEstadoDocumento" ADD CONSTRAINT "HistorialEstadoDocumento_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "Usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistorialEstadoDocumento" ADD CONSTRAINT "HistorialEstadoDocumento_id_seccion_fkey" FOREIGN KEY ("id_seccion") REFERENCES "Seccion"("id_seccion") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CumplimientoDocumento" ADD CONSTRAINT "CumplimientoDocumento_id_documento_fkey" FOREIGN KEY ("id_documento") REFERENCES "ExpedienteDocumento"("id_documento") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CumplimientoDocumento" ADD CONSTRAINT "CumplimientoDocumento_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "Usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CumplimientoDocumento" ADD CONSTRAINT "CumplimientoDocumento_id_seccion_fkey" FOREIGN KEY ("id_seccion") REFERENCES "Seccion"("id_seccion") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentoRelacionado" ADD CONSTRAINT "DocumentoRelacionado_id_documento_origen_fkey" FOREIGN KEY ("id_documento_origen") REFERENCES "Documento"("id_documento") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentoRelacionado" ADD CONSTRAINT "DocumentoRelacionado_id_documento_relacionado_fkey" FOREIGN KEY ("id_documento_relacionado") REFERENCES "Documento"("id_documento") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentoRelacionado" ADD CONSTRAINT "DocumentoRelacionado_id_usuario_registro_fkey" FOREIGN KEY ("id_usuario_registro") REFERENCES "Usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ObservacionDocumento" ADD CONSTRAINT "ObservacionDocumento_id_documento_fkey" FOREIGN KEY ("id_documento") REFERENCES "ExpedienteDocumento"("id_documento") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ObservacionDocumento" ADD CONSTRAINT "ObservacionDocumento_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "Usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ObservacionDocumento" ADD CONSTRAINT "ObservacionDocumento_id_seccion_fkey" FOREIGN KEY ("id_seccion") REFERENCES "Seccion"("id_seccion") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArchivoDocumento" ADD CONSTRAINT "ArchivoDocumento_id_documento_fkey" FOREIGN KEY ("id_documento") REFERENCES "Documento"("id_documento") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArchivoDocumento" ADD CONSTRAINT "ArchivoDocumento_id_cumplimiento_id_documento_fkey" FOREIGN KEY ("id_cumplimiento", "id_documento") REFERENCES "CumplimientoDocumento"("id_cumplimiento", "id_documento") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArchivoDocumento" ADD CONSTRAINT "ArchivoDocumento_id_usuario_subida_fkey" FOREIGN KEY ("id_usuario_subida") REFERENCES "Usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;
