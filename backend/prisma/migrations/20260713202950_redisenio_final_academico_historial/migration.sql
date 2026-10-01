-- DropForeignKey
ALTER TABLE "AsignacionAcademica" DROP CONSTRAINT "AsignacionAcademica_id_curso_fkey";

-- AlterTable
ALTER TABLE "AsignacionAcademica" ALTER COLUMN "id_curso" DROP NOT NULL;

-- CreateTable
CREATE TABLE "HistorialCursoCadete" (
    "id_historial" SERIAL NOT NULL,
    "id_cadete" INTEGER NOT NULL,
    "id_curso" INTEGER NOT NULL,
    "gestion" INTEGER NOT NULL,
    "estado_cadete" "EstadoCadete" NOT NULL,
    "fecha_registro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HistorialCursoCadete_pkey" PRIMARY KEY ("id_historial")
);

-- CreateIndex
CREATE INDEX "HistorialCursoCadete_id_cadete_idx" ON "HistorialCursoCadete"("id_cadete");

-- CreateIndex
CREATE INDEX "HistorialCursoCadete_id_curso_idx" ON "HistorialCursoCadete"("id_curso");

-- AddForeignKey
ALTER TABLE "HistorialCursoCadete" ADD CONSTRAINT "HistorialCursoCadete_id_cadete_fkey" FOREIGN KEY ("id_cadete") REFERENCES "Cadete"("id_cadete") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistorialCursoCadete" ADD CONSTRAINT "HistorialCursoCadete_id_curso_fkey" FOREIGN KEY ("id_curso") REFERENCES "Curso"("id_curso") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AsignacionAcademica" ADD CONSTRAINT "AsignacionAcademica_id_curso_fkey" FOREIGN KEY ("id_curso") REFERENCES "Curso"("id_curso") ON DELETE SET NULL ON UPDATE CASCADE;
