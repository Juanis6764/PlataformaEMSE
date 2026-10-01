-- Purga los permisos exclusivos del modulo de Notas retirado (VER_NOTAS,
-- REGISTRAR_NOTA, APROBAR_NOTA, GENERAR_MATRIZ) que quedaron como datos
-- huerfanos en la tabla Permiso tras eliminar el modulo. GESTIONAR_GESTION_ACADEMICA
-- no se toca (ya fue reclasificado a modulo 'ACADEMICO' en la migracion anterior
-- porque protege Gestion Academica / Periodo Lectivo, modelos conservados).

DELETE FROM "RolPermiso"
WHERE "id_permiso" IN (SELECT "id_permiso" FROM "Permiso" WHERE "modulo" = 'NOTAS');

DELETE FROM "UsuarioPermiso"
WHERE "id_permiso" IN (SELECT "id_permiso" FROM "Permiso" WHERE "modulo" = 'NOTAS');

DELETE FROM "Permiso" WHERE "modulo" = 'NOTAS';
