-- Crea únicamente los permisos generales de Notas que aún no existan.
INSERT INTO "Permiso" ("nombre", "modulo", "accion", "descripcion", "estado") VALUES
  ('VER_NOTAS', 'NOTAS', 'READ', 'Ver información y reportes de notas', true),
  ('REGISTRAR_NOTA', 'NOTAS', 'CREATE', 'Registrar información de notas', true),
  ('APROBAR_NOTA', 'NOTAS', 'UPDATE', 'Revisar y aprobar información de notas', true)
ON CONFLICT ("nombre") DO UPDATE SET "estado" = true;

-- Los roles son generales; el servicio conserva el alcance por sección y curso.
INSERT INTO "RolPermiso" ("id_rol", "id_permiso")
SELECT r."id_rol", p."id_permiso"
FROM "Rol" r CROSS JOIN "Permiso" p
WHERE
  (r."nombre" = 'OPERADOR' AND p."nombre" IN ('VER_NOTAS', 'REGISTRAR_NOTA')) OR
  (r."nombre" = 'RESPONSABLE' AND p."nombre" IN ('VER_NOTAS', 'APROBAR_NOTA')) OR
  (r."nombre" = 'ADMINISTRATIVO_ACADEMICO' AND p."nombre" IN ('VER_NOTAS', 'APROBAR_NOTA')) OR
  (r."nombre" = 'ADMINISTRADOR' AND p."nombre" IN ('VER_NOTAS', 'REGISTRAR_NOTA', 'APROBAR_NOTA'))
ON CONFLICT ("id_rol", "id_permiso") DO NOTHING;
