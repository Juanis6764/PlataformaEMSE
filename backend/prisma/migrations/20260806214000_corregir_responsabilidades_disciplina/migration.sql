-- Configuración separada del registro operativo de Disciplina.
INSERT INTO "Permiso" ("nombre", "modulo", "accion", "descripcion", "estado")
VALUES (
  'CONFIGURAR_DISCIPLINA',
  'NOTAS',
  'CONFIGURE',
  'Configurar catálogos, oficiales y semanas de Disciplina',
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
JOIN "Permiso" p ON p."nombre" = 'CONFIGURAR_DISCIPLINA'
WHERE r."nombre" = 'ADMINISTRADOR'
ON CONFLICT ("id_rol", "id_permiso") DO NOTHING;

INSERT INTO "UsuarioPermiso" ("id_usuario", "id_permiso", "concedido")
SELECT DISTINCT aa."id_usuario", p."id_permiso", true
FROM "AsignacionAcademica" aa
JOIN "Seccion" s ON s."id_seccion" = aa."id_seccion"
CROSS JOIN "Permiso" p
WHERE aa."activo" = true
  AND aa."tipo" = 'RESPONSABLE'
  AND UPPER(s."nombre") LIKE '%DISCIPLINA%'
  AND p."nombre" = 'CONFIGURAR_DISCIPLINA'
ON CONFLICT ("id_usuario", "id_permiso")
DO UPDATE SET "concedido" = true;

-- El Responsable de Disciplina configura y revisa, pero no registra ni envía
-- hechos disciplinarios como operación normal.
DELETE FROM "RolPermiso" rp
USING "Rol" r, "Permiso" p
WHERE rp."id_rol" = r."id_rol"
  AND rp."id_permiso" = p."id_permiso"
  AND r."nombre" = 'RESPONSABLE'
  AND p."nombre" IN ('REGISTRAR_NOTAS', 'EDITAR_NOTAS', 'ENVIAR_NOTAS');

-- COMANDO recibe únicamente lectura de Notas mediante permiso individual;
-- no se le concede ninguna capacidad de mutación.
INSERT INTO "UsuarioPermiso" ("id_usuario", "id_permiso", "concedido")
SELECT u."id_usuario", p."id_permiso", true
FROM "Usuario" u
JOIN "Seccion" s ON s."id_seccion" = u."id_seccion"
CROSS JOIN "Permiso" p
WHERE UPPER(s."nombre") LIKE '%COMANDO%'
  AND p."nombre" = 'VER_NOTAS'
ON CONFLICT ("id_usuario", "id_permiso")
DO UPDATE SET "concedido" = true;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM "Permiso" WHERE "nombre" = 'CONFIGURAR_DISCIPLINA' AND "estado" = true
  ) THEN
    RAISE EXCEPTION 'No se creó CONFIGURAR_DISCIPLINA';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "RolPermiso" rp
    JOIN "Rol" r ON r."id_rol" = rp."id_rol"
    JOIN "Permiso" p ON p."id_permiso" = rp."id_permiso"
    WHERE r."nombre" = 'RESPONSABLE'
      AND p."nombre" IN ('REGISTRAR_NOTAS', 'EDITAR_NOTAS', 'ENVIAR_NOTAS')
  ) THEN
    RAISE EXCEPTION 'RESPONSABLE conserva permisos de registro operativo';
  END IF;
END $$;
