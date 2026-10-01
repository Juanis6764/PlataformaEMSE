/*
  Warnings:

  - You are about to drop the column `anio_egreso` on the `Usuario` table. All the data in the column will be lost.
  - You are about to drop the column `id_curso` on the `Usuario` table. All the data in the column will be lost.
  - You are about to drop the column `id_supervisor` on the `Usuario` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "EstadoCadete" AS ENUM ('REGULAR', 'CONDICIONADO', 'DE_BAJA', 'EGRESADO');

-- CreateEnum
CREATE TYPE "AreaAcademica" AS ENUM ('DISCIPLINA', 'ENTRENAMIENTO_FISICO', 'EVALUACIONES');

-- DropForeignKey
ALTER TABLE "Usuario" DROP CONSTRAINT "Usuario_id_curso_fkey";

-- DropForeignKey
ALTER TABLE "Usuario" DROP CONSTRAINT "Usuario_id_supervisor_fkey";

-- AlterTable
ALTER TABLE "Nota" ALTER COLUMN "fecha_actualizacion" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Usuario" DROP COLUMN "anio_egreso",
DROP COLUMN "id_curso",
DROP COLUMN "id_supervisor",
ADD COLUMN     "primer_inicio" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "Cadete" (
    "id_cadete" SERIAL NOT NULL,
    "id_usuario" INTEGER NOT NULL,
    "grado" TEXT NOT NULL,
    "arma" TEXT,
    "id_curso" INTEGER NOT NULL,
    "gestion_ingreso" INTEGER NOT NULL,
    "gestion_egreso" INTEGER,
    "estado_cadete" "EstadoCadete" NOT NULL DEFAULT 'REGULAR',
    "fecha_ingreso" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_actualizacion" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cadete_pkey" PRIMARY KEY ("id_cadete")
);

-- CreateTable
CREATE TABLE "ResponsableAcademico" (
    "id_responsable_academico" SERIAL NOT NULL,
    "id_usuario" INTEGER NOT NULL,
    "id_curso" INTEGER NOT NULL,
    "area" "AreaAcademica" NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ResponsableAcademico_pkey" PRIMARY KEY ("id_responsable_academico")
);

-- CreateTable
CREATE TABLE "JerarquiaUsuario" (
    "id_jerarquia" SERIAL NOT NULL,
    "id_supervisor" INTEGER NOT NULL,
    "id_subordinado" INTEGER NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "fecha_inicio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_fin" TIMESTAMP(3),

    CONSTRAINT "JerarquiaUsuario_pkey" PRIMARY KEY ("id_jerarquia")
);

-- CreateTable
CREATE TABLE "PermisoSeccionRol" (
    "id_permiso_seccion_rol" SERIAL NOT NULL,
    "id_rol" INTEGER NOT NULL,
    "id_seccion" INTEGER NOT NULL,
    "id_permiso" INTEGER NOT NULL,

    CONSTRAINT "PermisoSeccionRol_pkey" PRIMARY KEY ("id_permiso_seccion_rol")
);

-- CreateTable
CREATE TABLE "HistorialPassword" (
    "id_historial" SERIAL NOT NULL,
    "id_usuario" INTEGER NOT NULL,
    "contrasena" TEXT NOT NULL,
    "fecha_cambio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HistorialPassword_pkey" PRIMARY KEY ("id_historial")
);

-- CreateIndex
CREATE UNIQUE INDEX "Cadete_id_usuario_key" ON "Cadete"("id_usuario");

-- CreateIndex
CREATE INDEX "Cadete_id_curso_idx" ON "Cadete"("id_curso");

-- CreateIndex
CREATE UNIQUE INDEX "ResponsableAcademico_id_usuario_id_curso_area_key" ON "ResponsableAcademico"("id_usuario", "id_curso", "area");

-- CreateIndex
CREATE UNIQUE INDEX "JerarquiaUsuario_id_supervisor_id_subordinado_key" ON "JerarquiaUsuario"("id_supervisor", "id_subordinado");

-- CreateIndex
CREATE UNIQUE INDEX "PermisoSeccionRol_id_rol_id_seccion_id_permiso_key" ON "PermisoSeccionRol"("id_rol", "id_seccion", "id_permiso");

-- AddForeignKey
ALTER TABLE "Cadete" ADD CONSTRAINT "Cadete_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "Usuario"("id_usuario") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cadete" ADD CONSTRAINT "Cadete_id_curso_fkey" FOREIGN KEY ("id_curso") REFERENCES "Curso"("id_curso") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResponsableAcademico" ADD CONSTRAINT "ResponsableAcademico_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "Usuario"("id_usuario") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResponsableAcademico" ADD CONSTRAINT "ResponsableAcademico_id_curso_fkey" FOREIGN KEY ("id_curso") REFERENCES "Curso"("id_curso") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JerarquiaUsuario" ADD CONSTRAINT "JerarquiaUsuario_id_supervisor_fkey" FOREIGN KEY ("id_supervisor") REFERENCES "Usuario"("id_usuario") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JerarquiaUsuario" ADD CONSTRAINT "JerarquiaUsuario_id_subordinado_fkey" FOREIGN KEY ("id_subordinado") REFERENCES "Usuario"("id_usuario") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PermisoSeccionRol" ADD CONSTRAINT "PermisoSeccionRol_id_rol_fkey" FOREIGN KEY ("id_rol") REFERENCES "Rol"("id_rol") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PermisoSeccionRol" ADD CONSTRAINT "PermisoSeccionRol_id_seccion_fkey" FOREIGN KEY ("id_seccion") REFERENCES "Seccion"("id_seccion") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PermisoSeccionRol" ADD CONSTRAINT "PermisoSeccionRol_id_permiso_fkey" FOREIGN KEY ("id_permiso") REFERENCES "Permiso"("id_permiso") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistorialPassword" ADD CONSTRAINT "HistorialPassword_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "Usuario"("id_usuario") ON DELETE CASCADE ON UPDATE CASCADE;
