-- Neon / Vercel Storage
CREATE TABLE IF NOT EXISTS organization (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Historique par lot : chaque PUT crée des lignes avec le même batch_id / batch_created_at.
CREATE TABLE IF NOT EXISTS score (
  id BIGSERIAL PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organization (id) ON DELETE CASCADE,
  batch_id TEXT NOT NULL,
  batch_created_at TIMESTAMPTZ NOT NULL,
  search_name TEXT NOT NULL,
  hubspot_url TEXT NOT NULL,
  segment TEXT NOT NULL,
  score_value SMALLINT,
  score_filter TEXT NOT NULL,
  trend TEXT NOT NULL,
  trend_symbol TEXT NOT NULL,
  sentiment TEXT,
  last_call TEXT,
  problems JSONB NOT NULL DEFAULT '[]'::jsonb,
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  detail_title TEXT NOT NULL,
  empty_message TEXT,
  calls JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT score_trend_check CHECK (trend IN ('up', 'down', 'stable')),
  UNIQUE (organization_id, batch_id)
);

-- score.score_value = champ numérique "score" du JSON (1–3 ou null).
-- Migration depuis l’ancien schéma (PK sur organization_id seul) :
--   DROP TABLE IF EXISTS score CASCADE;
-- puis redémarrer l’app (recréation via ensureSchema).
