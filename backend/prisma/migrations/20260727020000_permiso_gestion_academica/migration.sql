-- Permiso exclusivo del Administrador para crear/editar gestiones y periodos académicos
-- usados por Disciplina (y disponibles para Evaluaciones/Entrenamiento Físico a futuro).
INSERT INTO "Permiso" ("nombre", "modulo", "accion", "descripcion", "estado") VALUES
  ('GESTIONAR_GESTION_ACADEMICA', 'NOTAS', 'CREATE', 'Crear y editar gestiones y periodos académicos', true)
ON CONFLICT ("nombre") DO UPDATE SET "estado" = true;

INSERT INTO "RolPermiso" ("id_rol", "id_permiso")
SELECT r."id_rol", p."id_permiso"
FROM "Rol" r CROSS JOIN "Permiso" p
WHERE r."nombre" = 'ADMINISTRADOR' AND p."nombre" = 'GESTIONAR_GESTION_ACADEMICA'
ON CONFLICT ("id_rol", "id_permiso") DO NOTHING;
