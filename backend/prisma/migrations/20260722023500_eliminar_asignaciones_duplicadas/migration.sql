-- Eliminar registros históricos redundantes cuando existe exactamente la
-- misma asignación vigente. Las asignaciones finalizadas sin reemplazo se
-- conservan como historial institucional.
DELETE FROM "AsignacionAcademica" anterior
USING "AsignacionAcademica" vigente
WHERE anterior."id_asignacion" <> vigente."id_asignacion"
  AND anterior."activo" = false
  AND vigente."activo" = true
  AND anterior."id_usuario" = vigente."id_usuario"
  AND anterior."id_seccion" = vigente."id_seccion"
  AND anterior."tipo" = vigente."tipo"
  AND anterior."id_curso" IS NOT DISTINCT FROM vigente."id_curso";
