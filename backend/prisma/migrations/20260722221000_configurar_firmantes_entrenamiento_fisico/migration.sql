WITH contexto AS (
  SELECT g."id_gestion", a."id_usuario"
  FROM "GestionAcademica" g
  CROSS JOIN LATERAL (
    SELECT aa."id_usuario"
    FROM "AsignacionAcademica" aa
    JOIN "Seccion" s ON s."id_seccion" = aa."id_seccion"
    WHERE s."nombre" = 'ENTRENAMIENTO_FISICO'
      AND aa."tipo" = 'RESPONSABLE'
      AND aa."activo" = true
    ORDER BY aa."fecha_asignacion" DESC
    LIMIT 1
  ) a
  WHERE g."estado" = 'ACTIVA'
)
INSERT INTO "FirmanteReporte" (
  "id_gestion", "tipo_reporte", "orden", "grado", "nombre", "cargo",
  "linea_adicional", "id_creador", "fecha_actualizacion"
)
SELECT contexto."id_gestion", 'MATRIZ_ENTRENAMIENTO_FISICO', datos.orden,
       datos.grado, datos.nombre, datos.cargo, datos.linea_adicional,
       contexto."id_usuario", CURRENT_TIMESTAMP
FROM contexto
CROSS JOIN (
  VALUES
    (1, 'Tte. Inf.', NULL, 'ENCARGADO DE EF', 'JEFE DE LA SUBSECC. EF.'),
    (2, 'Cap. Log.', 'Albanny Jael Subirana Fernández', 'JEFE DE LA SAC.', NULL),
    (3, 'Tcnl. DEM.', 'Jorge Daniel Flores Gonzales', 'JEFE DE ESTUDIOS', NULL),
    (4, 'Cnl. DAEN.', 'Marco Antonio Candia Peñaloza', 'COMANDANTE DE LA EMSE.', 'Vo. Bo.')
) AS datos(orden, grado, nombre, cargo, linea_adicional)
ON CONFLICT ("id_gestion", "tipo_reporte", "orden") DO UPDATE SET
  "grado" = EXCLUDED."grado",
  "nombre" = EXCLUDED."nombre",
  "cargo" = EXCLUDED."cargo",
  "linea_adicional" = EXCLUDED."linea_adicional",
  "activo" = true,
  "fecha_actualizacion" = CURRENT_TIMESTAMP;
