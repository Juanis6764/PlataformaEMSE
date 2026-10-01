-- CreateEnum
CREATE TYPE "GrupoUsuario" AS ENUM ('CADETES', 'ADMINISTRATIVOS', 'ADMINISTRATIVOS_ACADEMICOS');

-- CreateEnum
CREATE TYPE "EstadoUsuario" AS ENUM ('ACTIVO', 'INACTIVO', 'BLOQUEADO');

-- CreateEnum
CREATE TYPE "EstadoGestion" AS ENUM ('PLANIFICACION', 'ACTIVA', 'CERRADA');

-- CreateEnum
CREATE TYPE "EstadoNota" AS ENUM ('BORRADOR', 'ENVIADO_A_ENCARGADO', 'OBSERVADO', 'RECHAZADO', 'APROBADO_AREA', 'ENVIADO_A_EVALUACIONES', 'RECIBIDO_EVALUACIONES', 'PONDERADO', 'MATRIZ_GENERADA', 'CERTIFICADO_GENERADO', 'PUBLICADO');

-- CreateEnum
CREATE TYPE "TipoSeccion" AS ENUM ('SISTEMA', 'ADMINISTRATIVA', 'ACADEMICA', 'DOCUMENTACION', 'MIXTA', 'FUTURA');

-- DropForeignKey
ALTER TABLE "Usuario" DROP CONSTRAINT "Usuario_id_seccion_fkey";

-- AlterTable
ALTER TABLE "CodigoVerificacion" ADD COLUMN     "fecha_uso" TIMESTAMP(3),
ADD COLUMN     "intentos" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "ip_solicitud" TEXT,
ADD COLUMN     "tipo" TEXT NOT NULL DEFAULT 'OTP';

-- AlterTable
ALTER TABLE "Seccion" ADD COLUMN     "id_seccion_padre" INTEGER,
ADD COLUMN     "tipo" "TipoSeccion" NOT NULL DEFAULT 'ADMINISTRATIVA';

-- AlterTable
ALTER TABLE "Sesion" ADD COLUMN     "activa" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "fecha_cierre" TIMESTAMP(3),
ADD COLUMN     "ip" TEXT,
ADD COLUMN     "motivo_cierre" TEXT,
ADD COLUMN     "refresh_token" TEXT,
ADD COLUMN     "user_agent" TEXT;

-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN     "anio_egreso" INTEGER,
ADD COLUMN     "grupo_usuario" "GrupoUsuario",
ADD COLUMN     "id_curso" INTEGER,
ADD COLUMN     "id_supervisor" INTEGER,
ALTER COLUMN "id_seccion" DROP NOT NULL,
ALTER COLUMN "estado" DROP DEFAULT;

-- Convertir la columna "estado" de Boolean a EstadoUsuario de forma segura
ALTER TABLE "Usuario" ALTER COLUMN "estado" TYPE "EstadoUsuario" 
  USING CASE 
    WHEN "estado" = true THEN 'ACTIVO'::"EstadoUsuario" 
    ELSE 'INACTIVO'::"EstadoUsuario" 
  END;

ALTER TABLE "Usuario" ALTER COLUMN "estado" SET DEFAULT 'ACTIVO';

-- CreateTable
CREATE TABLE "Curso" (
    "id_curso" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "orden" INTEGER NOT NULL,

    CONSTRAINT "Curso_pkey" PRIMARY KEY ("id_curso")
);

-- CreateTable
CREATE TABLE "GestionAcademica" (
    "id_gestion" SERIAL NOT NULL,
    "ano" INTEGER NOT NULL,
    "estado" "EstadoGestion" NOT NULL DEFAULT 'PLANIFICACION',

    CONSTRAINT "GestionAcademica_pkey" PRIMARY KEY ("id_gestion")
);

-- CreateTable
CREATE TABLE "Nota" (
    "id_nota" SERIAL NOT NULL,
    "id_cadete" INTEGER NOT NULL,
    "id_responsable" INTEGER NOT NULL,
    "id_gestion" INTEGER NOT NULL,
    "id_seccion" INTEGER NOT NULL,
    "id_curso" INTEGER NOT NULL,
    "semestre" INTEGER NOT NULL,
    "calificacion" DECIMAL(5,2) NOT NULL,
    "estado" "EstadoNota" NOT NULL DEFAULT 'BORRADOR',
    "observacion" TEXT,
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_actualizacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Nota_pkey" PRIMARY KEY ("id_nota")
);

-- CreateTable
CREATE TABLE "CertificadoNota" (
    "id_certificado" SERIAL NOT NULL,
    "id_cadete" INTEGER NOT NULL,
    "id_gestion" INTEGER NOT NULL,
    "semestre" INTEGER NOT NULL,
    "promedio_disciplina" DECIMAL(5,2) NOT NULL,
    "promedio_entrenamiento" DECIMAL(5,2) NOT NULL,
    "promedio_evaluaciones" DECIMAL(5,2) NOT NULL,
    "nota_final_ponderada" DECIMAL(5,2) NOT NULL,
    "publicado" BOOLEAN NOT NULL DEFAULT false,
    "fecha_generacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CertificadoNota_pkey" PRIMARY KEY ("id_certificado")
);

-- CreateTable
CREATE TABLE "LogAcceso" (
    "id_log_acceso" SERIAL NOT NULL,
    "id_usuario" INTEGER,
    "correo_intentado" TEXT NOT NULL,
    "evento" TEXT NOT NULL,
    "exito" BOOLEAN NOT NULL,
    "ip" TEXT,
    "user_agent" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "detalle" TEXT,

    CONSTRAINT "LogAcceso_pkey" PRIMARY KEY ("id_log_acceso")
);

-- CreateTable
CREATE TABLE "AuditoriaAccion" (
    "id_auditoria" SERIAL NOT NULL,
    "id_usuario" INTEGER NOT NULL,
    "accion" TEXT NOT NULL,
    "modulo" TEXT NOT NULL,
    "entidad" TEXT NOT NULL,
    "id_entidad" INTEGER NOT NULL,
    "descripcion" TEXT NOT NULL,
    "datos_antes" JSONB,
    "datos_despues" JSONB,
    "ip" TEXT,
    "user_agent" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditoriaAccion_pkey" PRIMARY KEY ("id_auditoria")
);

-- CreateIndex
CREATE UNIQUE INDEX "Curso_nombre_key" ON "Curso"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "GestionAcademica_ano_key" ON "GestionAcademica"("ano");

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_id_seccion_fkey" FOREIGN KEY ("id_seccion") REFERENCES "Seccion"("id_seccion") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_id_curso_fkey" FOREIGN KEY ("id_curso") REFERENCES "Curso"("id_curso") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_id_supervisor_fkey" FOREIGN KEY ("id_supervisor") REFERENCES "Usuario"("id_usuario") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Seccion" ADD CONSTRAINT "Seccion_id_seccion_padre_fkey" FOREIGN KEY ("id_seccion_padre") REFERENCES "Seccion"("id_seccion") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Nota" ADD CONSTRAINT "Nota_id_cadete_fkey" FOREIGN KEY ("id_cadete") REFERENCES "Usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Nota" ADD CONSTRAINT "Nota_id_responsable_fkey" FOREIGN KEY ("id_responsable") REFERENCES "Usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Nota" ADD CONSTRAINT "Nota_id_gestion_fkey" FOREIGN KEY ("id_gestion") REFERENCES "GestionAcademica"("id_gestion") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Nota" ADD CONSTRAINT "Nota_id_seccion_fkey" FOREIGN KEY ("id_seccion") REFERENCES "Seccion"("id_seccion") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Nota" ADD CONSTRAINT "Nota_id_curso_fkey" FOREIGN KEY ("id_curso") REFERENCES "Curso"("id_curso") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CertificadoNota" ADD CONSTRAINT "CertificadoNota_id_cadete_fkey" FOREIGN KEY ("id_cadete") REFERENCES "Usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CertificadoNota" ADD CONSTRAINT "CertificadoNota_id_gestion_fkey" FOREIGN KEY ("id_gestion") REFERENCES "GestionAcademica"("id_gestion") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LogAcceso" ADD CONSTRAINT "LogAcceso_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "Usuario"("id_usuario") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditoriaAccion" ADD CONSTRAINT "AuditoriaAccion_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "Usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Renombrar secciones antiguas si existen sin borrar datos
UPDATE "Seccion" SET "nombre" = 'EVALUACIONES' WHERE "nombre" = 'EVALUACIONES_Y_ACREDITACIONES';
UPDATE "Seccion" SET "nombre" = 'INVESTIGACION_TECNOLOGIA' WHERE "nombre" = 'INVESTIGACION_CIENCIA_TECNOLOGIA';

-- Insertar secciones nuevas si no existen
INSERT INTO "Seccion" ("nombre", "nivel", "tipo", "descripcion") VALUES
  ('COMANDO_BATALLON', 3, 'DOCUMENTACION', 'Área de Comando de Batallón'),
  ('INTELIGENCIA', 4, 'DOCUMENTACION', 'Sección de Inteligencia'),
  ('OPERACIONES', 4, 'DOCUMENTACION', 'Sección de Operaciones'),
  ('LOGISTICA', 4, 'DOCUMENTACION', 'Sección de Logística'),

  ('JEFATURA_ESTUDIOS', 3, 'ACADEMICA', 'Área de Jefatura de Estudios'),
  ('EVALUACIONES', 4, 'ACADEMICA', 'Sección de Evaluaciones'),
  ('DISCIPLINA', 4, 'ACADEMICA', 'Sección de Disciplina'),
  ('ENTRENAMIENTO_FISICO', 4, 'ACADEMICA', 'Sección de Entrenamiento Físico'),
  ('SECCION_ACADEMICA', 4, 'MIXTA', 'Sección Académica'),
  ('INVESTIGACION_TECNOLOGIA', 4, 'DOCUMENTACION', 'Sección de Investigación y Tecnología')
ON CONFLICT ("nombre") DO NOTHING;

-- Actualizar TipoSeccion de todas las secciones
UPDATE "Seccion" SET "tipo" = 'SISTEMA' WHERE "nombre" = 'ADMINISTRACION_SISTEMA';

UPDATE "Seccion" SET "tipo" = 'DOCUMENTACION' WHERE "nombre" IN (
  'RADIO', 'SECRETARIA_GENERAL', 'COMANDO', 'SEGUNDO_COMANDO', 'COMANDO_BATALLON', 'INTELIGENCIA', 'OPERACIONES', 'LOGISTICA', 'INVESTIGACION_TECNOLOGIA'
);

UPDATE "Seccion" SET "tipo" = 'ACADEMICA' WHERE "nombre" IN (
  'JEFATURA_ESTUDIOS', 'EVALUACIONES', 'DISCIPLINA', 'ENTRENAMIENTO_FISICO'
);

UPDATE "Seccion" SET "tipo" = 'MIXTA' WHERE "nombre" = 'SECCION_ACADEMICA';

-- Actualizar jerarquía id_seccion_padre
UPDATE "Seccion" hija
SET "id_seccion_padre" = padre."id_seccion"
FROM "Seccion" padre
WHERE padre."nombre" = 'COMANDO_BATALLON'
AND hija."nombre" IN ('INTELIGENCIA', 'OPERACIONES', 'LOGISTICA');

UPDATE "Seccion" hija
SET "id_seccion_padre" = padre."id_seccion"
FROM "Seccion" padre
WHERE padre."nombre" = 'JEFATURA_ESTUDIOS'
AND hija."nombre" IN (
  'EVALUACIONES',
  'DISCIPLINA',
  'ENTRENAMIENTO_FISICO',
  'SECCION_ACADEMICA',
  'INVESTIGACION_TECNOLOGIA'
);

-- Insertar datos base para Cursos
INSERT INTO "Curso" ("nombre", "orden") VALUES
  ('1ER_ANIO', 1),
  ('2DO_ANIO', 2),
  ('3ER_ANIO', 3),
  ('EGRESADO', 4)
ON CONFLICT ("nombre") DO NOTHING;

-- Asignar grupo_usuario inicial a los usuarios existentes basados en su Rol real
UPDATE "Usuario" u
SET "grupo_usuario" = CASE 
  WHEN r.nombre = 'CADETE' THEN 'CADETES'::"GrupoUsuario"

  WHEN r.nombre IN (
    'ENCARGADO_EVALUACIONES',
    'ENCARGADO_DISCIPLINA',
    'ENCARGADO_ENTRENAMIENTO_FISICO',
    'ENCARGADO_SECCION_ACADEMICA'
  ) THEN 'ADMINISTRATIVOS_ACADEMICOS'::"GrupoUsuario"

  WHEN r.nombre IN (
    'ADMIN',
    'OPERADOR_RADIO',
    'SECRETARIA_GENERAL',
    'COMANDO',
    'USUARIO_SECCION',
    'SEGUNDO_COMANDO'
  ) THEN 'ADMINISTRATIVOS'::"GrupoUsuario"

  ELSE 'ADMINISTRATIVOS'::"GrupoUsuario"
END
FROM "Rol" r
WHERE u.id_rol = r.id_rol;
