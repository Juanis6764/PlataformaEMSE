-- Las tablas Nota y CertificadoNota pertenecían al primer diseño genérico.
-- La implementación vigente obtiene sus fuentes oficiales desde planillas,
-- matrices y publicaciones normalizadas. Se aborta si aparecieran datos no
-- auditados para impedir cualquier pérdida histórica silenciosa.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "Nota") THEN
    RAISE EXCEPTION 'No se puede retirar Nota: contiene datos que deben migrarse';
  END IF;
  IF EXISTS (SELECT 1 FROM "CertificadoNota") THEN
    RAISE EXCEPTION 'No se puede retirar CertificadoNota: contiene datos que deben migrarse';
  END IF;
END $$;

DROP TABLE "CertificadoNota";
DROP TABLE "Nota";
DROP TYPE "EstadoNota";
