-- Reutiliza permisos generales. El alcance por curso y sección se valida en el servicio.
INSERT INTO "RolPermiso" ("id_rol", "id_permiso")
SELECT r."id_rol", p."id_permiso"
FROM "Rol" r
JOIN "Permiso" p ON p."nombre" IN ('VER_NOTAS', 'REGISTRAR_NOTA')
WHERE r."nombre" = 'OPERADOR'
ON CONFLICT ("id_rol", "id_permiso") DO NOTHING;

INSERT INTO "RolPermiso" ("id_rol", "id_permiso")
SELECT r."id_rol", p."id_permiso"
FROM "Rol" r
JOIN "Permiso" p ON p."nombre" IN ('VER_NOTAS', 'APROBAR_NOTA')
WHERE r."nombre" = 'RESPONSABLE'
ON CONFLICT ("id_rol", "id_permiso") DO NOTHING;
