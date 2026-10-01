INSERT INTO "Permiso" ("nombre", "modulo", "accion", "descripcion", "estado")
VALUES (
  'GENERAR_MATRIZ',
  'NOTAS',
  'CREATE',
  'Generar matrices oficiales de áreas de evaluación',
  true
)
ON CONFLICT ("nombre") DO UPDATE SET
  "modulo" = EXCLUDED."modulo",
  "accion" = EXCLUDED."accion",
  "descripcion" = EXCLUDED."descripcion",
  "estado" = true;

INSERT INTO "RolPermiso" ("id_rol", "id_permiso")
SELECT r."id_rol", p."id_permiso"
FROM "Rol" r
CROSS JOIN "Permiso" p
WHERE r."nombre" IN ('RESPONSABLE', 'ADMINISTRADOR')
  AND p."nombre" = 'GENERAR_MATRIZ'
ON CONFLICT ("id_rol", "id_permiso") DO NOTHING;
