-- Periodo académico administrable (I/2026, II/2026...), creado únicamente por el Administrador.
-- El semestre de un cadete se calcula desde su curso y este periodo; no se duplica en Cadete.
CREATE TABLE "PeriodoLectivo" (
  "id_periodo" SERIAL PRIMARY KEY, "id_gestion" INTEGER NOT NULL,
  "periodo" "PeriodoAcademico" NOT NULL, "activo" BOOLEAN NOT NULL DEFAULT false,
  "id_creador" INTEGER NOT NULL,
  "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "fecha_actualizacion" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PeriodoLectivo_id_gestion_periodo_key" UNIQUE ("id_gestion", "periodo")
);
CREATE INDEX "PeriodoLectivo_activo_idx" ON "PeriodoLectivo"("activo");

ALTER TABLE "PeriodoLectivo" ADD CONSTRAINT "PeriodoLectivo_id_gestion_fkey" FOREIGN KEY ("id_gestion") REFERENCES "GestionAcademica"("id_gestion") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PeriodoLectivo" ADD CONSTRAINT "PeriodoLectivo_id_creador_fkey" FOREIGN KEY ("id_creador") REFERENCES "Usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Permite registrar un oficial escrito manualmente (fuera de la relación nominal administrada)
-- sin crear una fila falsa en OficialDisciplina. No afecta filas existentes (todas tienen valor).
ALTER TABLE "RegistroDisciplina" ALTER COLUMN "id_oficial" DROP NOT NULL;
ALTER TABLE "RegistroDisciplina" ALTER COLUMN "codigo_oficial" DROP NOT NULL;
