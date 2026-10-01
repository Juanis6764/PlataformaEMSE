INSERT INTO "HistorialCursoCadete" ("id_cadete", "id_curso", "gestion", "estado_cadete")
SELECT c."id_cadete", 3, 2026, 'REGULAR'
FROM "Cadete" c
JOIN "Usuario" u ON u."id_usuario" = c."id_usuario"
WHERE u."ci" = '3000005'
ON CONFLICT ("id_cadete", "id_curso", "gestion", "estado_cadete") DO NOTHING;
