-- À exécuter dans le SQL Editor Neon (ou psql) pour vider le dashboard avant un nouveau seed.
-- Ordre : enfant `score` puis parent `organization`.

TRUNCATE TABLE score RESTART IDENTITY;
TRUNCATE TABLE organization;
