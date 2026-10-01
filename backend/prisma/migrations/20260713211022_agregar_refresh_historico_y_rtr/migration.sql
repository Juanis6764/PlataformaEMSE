-- CreateTable
CREATE TABLE "RefreshHistorico" (
    "id_refresh_historico" SERIAL NOT NULL,
    "id_sesion" INTEGER NOT NULL,
    "token_hash" TEXT NOT NULL,
    "revocado" BOOLEAN NOT NULL DEFAULT false,
    "usado" BOOLEAN NOT NULL DEFAULT false,
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_expiracion" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RefreshHistorico_pkey" PRIMARY KEY ("id_refresh_historico")
);

-- CreateIndex
CREATE UNIQUE INDEX "RefreshHistorico_token_hash_key" ON "RefreshHistorico"("token_hash");

-- AddForeignKey
ALTER TABLE "RefreshHistorico" ADD CONSTRAINT "RefreshHistorico_id_sesion_fkey" FOREIGN KEY ("id_sesion") REFERENCES "Sesion"("id_sesion") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE UNIQUE INDEX "AsignacionAcademica_id_usuario_area_null_curso_key" ON "AsignacionAcademica"("id_usuario", "area") WHERE "id_curso" IS NULL;

