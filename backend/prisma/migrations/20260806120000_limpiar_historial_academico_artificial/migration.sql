-- Elimina exclusivamente el historial académico artificial y los cuatro
-- periodos históricos creados para normalizarlo. Conserva usuarios, cadetes,
-- cursos actuales, gestiones y los periodos reales I/2026 y II/2026.
BEGIN;

LOCK TABLE "HistorialCursoCadete" IN ACCESS EXCLUSIVE MODE;
LOCK TABLE "PeriodoLectivo" IN ACCESS EXCLUSIVE MODE;

DO $$
DECLARE
  usuarios_antes TEXT;
  cadetes_antes TEXT;
  gestiones_antes TEXT;
  periodos_2026_antes TEXT;
  historiales_eliminados INTEGER;
  periodos_eliminados INTEGER;
BEGIN
  IF (SELECT COUNT(*) FROM "Usuario") <> 383 THEN
    RAISE EXCEPTION 'Se esperaban exactamente 383 usuarios antes de la limpieza';
  END IF;

  IF (SELECT COUNT(*) FROM "Cadete") <> 364 THEN
    RAISE EXCEPTION 'Se esperaban exactamente 364 cadetes antes de la limpieza';
  END IF;

  IF (SELECT COUNT(*) FROM "HistorialCursoCadete") <> 1460 THEN
    RAISE EXCEPTION 'Se esperaban exactamente 1460 historiales artificiales';
  END IF;

  IF (
    SELECT COUNT(*)
    FROM "PeriodoLectivo" p
    JOIN "GestionAcademica" g ON g."id_gestion" = p."id_gestion"
    WHERE g."ano" IN (2024, 2025)
  ) <> 4 THEN
    RAISE EXCEPTION 'Se esperaban exactamente cuatro periodos artificiales de 2024/2025';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "PeriodoLectivo" p
    JOIN "GestionAcademica" g ON g."id_gestion" = p."id_gestion"
    WHERE g."ano" IN (2024, 2025)
      AND (p."activo" <> false OR p."id_creador" <> 1)
  ) THEN
    RAISE EXCEPTION 'Los periodos 2024/2025 no coinciden con los registros artificiales verificados';
  END IF;

  SELECT MD5(string_agg(to_jsonb(u)::text, ',' ORDER BY u."id_usuario"))
  INTO usuarios_antes
  FROM "Usuario" u;

  SELECT MD5(string_agg(to_jsonb(c)::text, ',' ORDER BY c."id_cadete"))
  INTO cadetes_antes
  FROM "Cadete" c;

  SELECT MD5(string_agg(to_jsonb(g)::text, ',' ORDER BY g."id_gestion"))
  INTO gestiones_antes
  FROM "GestionAcademica" g;

  SELECT MD5(string_agg(to_jsonb(p)::text, ',' ORDER BY p."id_periodo"))
  INTO periodos_2026_antes
  FROM "PeriodoLectivo" p
  JOIN "GestionAcademica" g ON g."id_gestion" = p."id_gestion"
  WHERE g."ano" = 2026;

  DELETE FROM "HistorialCursoCadete";
  GET DIAGNOSTICS historiales_eliminados = ROW_COUNT;

  IF historiales_eliminados <> 1460 THEN
    RAISE EXCEPTION 'La limpieza debía eliminar exactamente 1460 historiales, eliminó %', historiales_eliminados;
  END IF;

  DELETE FROM "PeriodoLectivo" p
  USING "GestionAcademica" g
  WHERE g."id_gestion" = p."id_gestion"
    AND g."ano" IN (2024, 2025);
  GET DIAGNOSTICS periodos_eliminados = ROW_COUNT;

  IF periodos_eliminados <> 4 THEN
    RAISE EXCEPTION 'La limpieza debía eliminar exactamente cuatro periodos, eliminó %', periodos_eliminados;
  END IF;

  IF (SELECT COUNT(*) FROM "HistorialCursoCadete") <> 0 THEN
    RAISE EXCEPTION 'HistorialCursoCadete no quedó vacío';
  END IF;

  IF (SELECT COUNT(*) FROM "PeriodoLectivo") <> 2 THEN
    RAISE EXCEPTION 'PeriodoLectivo debe conservar únicamente I/2026 y II/2026';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "PeriodoLectivo" p
    JOIN "GestionAcademica" g ON g."id_gestion" = p."id_gestion"
    WHERE g."ano" <> 2026
  ) THEN
    RAISE EXCEPTION 'Quedaron periodos lectivos distintos de 2026';
  END IF;

  IF (
    SELECT COUNT(DISTINCT p."periodo")
    FROM "PeriodoLectivo" p
    JOIN "GestionAcademica" g ON g."id_gestion" = p."id_gestion"
    WHERE g."ano" = 2026
      AND p."periodo" IN ('I'::"PeriodoAcademico", 'II'::"PeriodoAcademico")
  ) <> 2 THEN
    RAISE EXCEPTION 'No se conservaron ambos periodos I/2026 y II/2026';
  END IF;

  IF usuarios_antes IS DISTINCT FROM (
    SELECT MD5(string_agg(to_jsonb(u)::text, ',' ORDER BY u."id_usuario"))
    FROM "Usuario" u
  ) THEN
    RAISE EXCEPTION 'La limpieza modificó usuarios';
  END IF;

  IF cadetes_antes IS DISTINCT FROM (
    SELECT MD5(string_agg(to_jsonb(c)::text, ',' ORDER BY c."id_cadete"))
    FROM "Cadete" c
  ) THEN
    RAISE EXCEPTION 'La limpieza modificó cadetes, gestion_ingreso, curso o estado';
  END IF;

  IF gestiones_antes IS DISTINCT FROM (
    SELECT MD5(string_agg(to_jsonb(g)::text, ',' ORDER BY g."id_gestion"))
    FROM "GestionAcademica" g
  ) THEN
    RAISE EXCEPTION 'La limpieza modificó gestiones académicas';
  END IF;

  IF periodos_2026_antes IS DISTINCT FROM (
    SELECT MD5(string_agg(to_jsonb(p)::text, ',' ORDER BY p."id_periodo"))
    FROM "PeriodoLectivo" p
    JOIN "GestionAcademica" g ON g."id_gestion" = p."id_gestion"
    WHERE g."ano" = 2026
  ) THEN
    RAISE EXCEPTION 'La limpieza modificó I/2026 o II/2026';
  END IF;
END $$;

COMMIT;
