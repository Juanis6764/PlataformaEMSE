/*
  Warnings:

  - You are about to drop the `ResponsableAcademico` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "NivelResponsabilidad" AS ENUM ('OPERADOR', 'JEFE');

-- DropForeignKey
ALTER TABLE "ResponsableAcademico" DROP CONSTRAINT "ResponsableAcademico_id_curso_fkey";

-- DropForeignKey
ALTER TABLE "ResponsableAcademico" DROP CONSTRAINT "ResponsableAcademico_id_usuario_fkey";

-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN     "modulo_academico" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "modulo_documental" BOOLEAN NOT NULL DEFAULT false;

-- DropTable
DROP TABLE "ResponsableAcademico";

-- CreateTable
CREATE TABLE "AsignacionAcademica" (
    "id_asignacion" SERIAL NOT NULL,
    "id_usuario" INTEGER NOT NULL,
    "id_curso" INTEGER NOT NULL,
    "area" "AreaAcademica" NOT NULL,
    "nivel_responsabilidad" "NivelResponsabilidad" NOT NULL DEFAULT 'OPERADOR',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "fecha_asignacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_fin" TIMESTAMP(3),

    CONSTRAINT "AsignacionAcademica_pkey" PRIMARY KEY ("id_asignacion")
);

-- CreateIndex
CREATE UNIQUE INDEX "AsignacionAcademica_id_usuario_id_curso_area_key" ON "AsignacionAcademica"("id_usuario", "id_curso", "area");

-- AddForeignKey
ALTER TABLE "AsignacionAcademica" ADD CONSTRAINT "AsignacionAcademica_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "Usuario"("id_usuario") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AsignacionAcademica" ADD CONSTRAINT "AsignacionAcademica_id_curso_fkey" FOREIGN KEY ("id_curso") REFERENCES "Curso"("id_curso") ON DELETE RESTRICT ON UPDATE CASCADE;
