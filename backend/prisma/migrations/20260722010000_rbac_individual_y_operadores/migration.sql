CREATE TABLE "UsuarioPermiso" (
  "id_usuario_permiso" SERIAL PRIMARY KEY,
  "id_usuario" INTEGER NOT NULL,
  "id_permiso" INTEGER NOT NULL,
  "concedido" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "UsuarioPermiso_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "Usuario"("id_usuario") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "UsuarioPermiso_id_permiso_fkey" FOREIGN KEY ("id_permiso") REFERENCES "Permiso"("id_permiso") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "UsuarioPermiso_id_usuario_id_permiso_key" ON "UsuarioPermiso"("id_usuario", "id_permiso");

DROP TABLE "JerarquiaUsuario";

UPDATE "Seccion" SET "nombre"='COORDINACION_ACADEMICA', "descripcion"='Coordinación general de la Sección Académica' WHERE "id_seccion"=5;
UPDATE "Seccion" SET "nombre"='EVALUACIONES', "descripcion"='Subsección de Evaluaciones académicas' WHERE "id_seccion"=6;

INSERT INTO "Rol" ("nombre","descripcion","estado") VALUES
('RESPONSABLE','Responsable de subsección académica',true),
('OPERADOR','Operador académico limitado a un curso',true)
ON CONFLICT ("nombre") DO NOTHING;

INSERT INTO "RolPermiso" ("id_rol","id_permiso")
SELECT r."id_rol",p."id_permiso" FROM "Rol" r CROSS JOIN "Permiso" p
WHERE r."nombre" IN ('RESPONSABLE','OPERADOR') AND p."nombre"='VER_PANEL'
ON CONFLICT ("id_rol","id_permiso") DO NOTHING;

UPDATE "Usuario" SET "correo"='pruebaemse2026@gmail.com', "id_rol"=(SELECT "id_rol" FROM "Rol" WHERE "nombre"='RESPONSABLE')
WHERE "id_usuario" IN (7,8,9);

INSERT INTO "Usuario" ("nombres","apellidos","ci","correo","contrasena","estado","habilitado","primer_inicio","es_mixto","id_rol","id_seccion")
SELECT v.nombres,v.apellidos,v.ci,'pruebaemse2026@gmail.com','$2b$10$oqlgiACFKdVczznbb2idDeaqIODdpOSbZKSh9k8MNEvWc/.vAzBuS','INACTIVO',true,true,false,r."id_rol",v.id_seccion
FROM (VALUES
 ('Operador','Entrenamiento Físico Primer Año','ACA-EF-1',12),
 ('Operador','Entrenamiento Físico Segundo Año','ACA-EF-2',12),
 ('Operador','Entrenamiento Físico Tercer Año','ACA-EF-3',12),
 ('Operador','Disciplina Primer Año','ACA-DIS-1',11),
 ('Operador','Disciplina Segundo Año','ACA-DIS-2',11),
 ('Operador','Disciplina Tercer Año','ACA-DIS-3',11),
 ('Operador','Evaluaciones Primer Año','ACA-EVA-1',6),
 ('Operador','Evaluaciones Segundo Año','ACA-EVA-2',6),
 ('Operador','Evaluaciones Tercer Año','ACA-EVA-3',6)
) AS v(nombres,apellidos,ci,id_seccion)
CROSS JOIN "Rol" r WHERE r."nombre"='OPERADOR'
ON CONFLICT ("ci") DO NOTHING;

INSERT INTO "HistorialPassword" ("id_usuario","contrasena")
SELECT u."id_usuario",u."contrasena" FROM "Usuario" u
WHERE u."ci" LIKE 'ACA-%' AND NOT EXISTS (SELECT 1 FROM "HistorialPassword" h WHERE h."id_usuario"=u."id_usuario");

INSERT INTO "AsignacionAcademica" ("id_usuario","id_seccion","id_curso","tipo")
SELECT u."id_usuario",u."id_seccion",c."id_curso",'OPERADOR'
FROM "Usuario" u JOIN "Curso" c ON c."orden"=RIGHT(u."ci",1)::INTEGER
WHERE u."ci" LIKE 'ACA-%'
ON CONFLICT ("id_usuario","id_seccion","id_curso") DO NOTHING;
