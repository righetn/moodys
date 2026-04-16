-- Neon / Postgres — dashboard storage
-- Run migrations on existing DBs: see comments at bottom if upgrading from pre-email/csm schema.

CREATE TABLE IF NOT EXISTS organization (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- One row per organization per ingest batch (same batch_id / batch_created_at for the whole upload).
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
  last_call TEXT,
  problems JSONB NOT NULL DEFAULT '[]'::jsonb,
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  detail_title TEXT NOT NULL,
  empty_message TEXT,
  calls JSONB NOT NULL DEFAULT '[]'::jsonb,
  emails JSONB NOT NULL DEFAULT '[]'::jsonb,
  csm TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, batch_id)
);

-- score.score_value = mood score 1–3 or NULL (no data).
-- calls / emails = JSON arrays aligned with Customer_Sentiment_Dashboard HTML (Modjo + HubSpot).

-- Upgrade from legacy score rows (run in order if upgrading manually):
--   ALTER TABLE score DROP CONSTRAINT IF EXISTS score_trend_check;
--   ALTER TABLE score DROP COLUMN IF EXISTS trend;
--   ALTER TABLE score DROP COLUMN IF EXISTS trend_symbol;
--   ALTER TABLE score DROP COLUMN IF EXISTS sentiment;
--   ALTER TABLE score ADD COLUMN IF NOT EXISTS emails JSONB NOT NULL DEFAULT '[]'::jsonb;
--   ALTER TABLE score ADD COLUMN IF NOT EXISTS csm TEXT;
