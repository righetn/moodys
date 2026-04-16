import { randomUUID } from "node:crypto"

import { neon } from "@neondatabase/serverless"

import { parseClientsJson } from "@/lib/schemas/dashboard"
import type { DashboardCall, DashboardClient, DashboardEmail } from "@/types/dashboard"

import fallbackRaw from "@/data.json"

function connectionString(): string | null {
  return process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? null
}

type Sql = NonNullable<ReturnType<typeof neon>>

function getSql(): Sql | null {
  const url = connectionString()
  if (!url) return null
  return neon(url)
}

async function ensureSchema(sql: Sql) {
  await sql`
    CREATE TABLE IF NOT EXISTS organization (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `

  await sql`
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
    )
  `

  await migrateScoreTable(sql)
}

/** Idempotent upgrades from legacy `score` rows (trend / sentiment / no emails). */
async function migrateScoreTable(sql: Sql) {
  await sql`ALTER TABLE score DROP CONSTRAINT IF EXISTS score_trend_check`
  await sql`ALTER TABLE score DROP COLUMN IF EXISTS trend`
  await sql`ALTER TABLE score DROP COLUMN IF EXISTS trend_symbol`
  await sql`ALTER TABLE score DROP COLUMN IF EXISTS sentiment`
  await sql`
    ALTER TABLE score ADD COLUMN IF NOT EXISTS emails JSONB NOT NULL DEFAULT '[]'::jsonb
  `
  await sql`ALTER TABLE score ADD COLUMN IF NOT EXISTS csm TEXT`
}

type ScoreJoinRow = {
  id: string
  name: string
  search_name: string
  hubspot_url: string
  segment: string
  score_value: number | null
  score_filter: string
  last_call: string | null
  problems: string[]
  features: string[]
  detail_title: string
  empty_message: string | null
  calls: DashboardCall[]
  emails: DashboardEmail[]
  csm: string | null
}

function rowToClient(row: ScoreJoinRow): DashboardClient {
  return {
    id: row.id,
    displayName: row.name,
    searchName: row.search_name,
    hubspotUrl: row.hubspot_url,
    segment: row.segment,
    score: row.score_value,
    scoreFilter: row.score_filter as DashboardClient["scoreFilter"],
    lastCall: row.last_call,
    problems: row.problems ?? [],
    features: row.features ?? [],
    detailTitle: row.detail_title,
    emptyMessage: row.empty_message,
    calls: row.calls ?? [],
    emails: row.emails ?? [],
    csm: row.csm ?? null,
  }
}

/**
 * `null` = pas de connexion DB configurée (utiliser le fallback fichier).
 * `[]` = DB vide ou aucun score.
 * Clients du **dernier lot** (`batch_created_at` le plus récent).
 */
export async function getClientsFromDb(): Promise<DashboardClient[] | null> {
  const sql = getSql()
  if (!sql) return null
  await ensureSchema(sql)

  const clientRows = (await sql`
    WITH latest AS (
      SELECT batch_id
      FROM score
      ORDER BY batch_created_at DESC, batch_id DESC
      LIMIT 1
    )
    SELECT
      o.id,
      o.name,
      s.search_name,
      s.hubspot_url,
      s.segment,
      s.score_value,
      s.score_filter,
      s.last_call,
      s.problems,
      s.features,
      s.detail_title,
      s.empty_message,
      s.calls,
      s.emails,
      s.csm
    FROM latest lb
    INNER JOIN score s ON s.batch_id = lb.batch_id
    INNER JOIN organization o ON o.id = s.organization_id
    ORDER BY o.name
  `) as ScoreJoinRow[]

  return clientRows.map(rowToClient)
}

/**
 * Ajoute un lot : même `batch_id` / `batch_created_at` pour toutes les lignes `score`.
 * Met à jour `organization` en conflit sur `id` (UPSERT).
 */
export async function appendDashboardClients(
  clients: DashboardClient[],
): Promise<{ batchId: string }> {
  const sql = getSql()
  if (!sql) {
    throw new Error(
      "DATABASE_URL (or POSTGRES_URL) is required to write dashboard data.",
    )
  }
  await ensureSchema(sql)

  const batchId = randomUUID()
  const batchCreatedAt = new Date().toISOString()

  const inserts = []
  for (const c of clients) {
    inserts.push(
      sql`
        INSERT INTO organization (id, name, updated_at)
        VALUES (${c.id}, ${c.displayName}, NOW())
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          updated_at = NOW()
      `,
    )
    const problemsJson = JSON.stringify(c.problems)
    const featuresJson = JSON.stringify(c.features)
    const callsJson = JSON.stringify(c.calls)
    const emailsJson = JSON.stringify(c.emails)
    inserts.push(
      sql`
        INSERT INTO score (
          organization_id,
          batch_id,
          batch_created_at,
          search_name,
          hubspot_url,
          segment,
          score_value,
          score_filter,
          last_call,
          problems,
          features,
          detail_title,
          empty_message,
          calls,
          emails,
          csm,
          updated_at
        )
        VALUES (
          ${c.id},
          ${batchId},
          ${batchCreatedAt}::timestamptz,
          ${c.searchName},
          ${c.hubspotUrl},
          ${c.segment},
          ${c.score},
          ${c.scoreFilter},
          ${c.lastCall},
          ${problemsJson}::jsonb,
          ${featuresJson}::jsonb,
          ${c.detailTitle},
          ${c.emptyMessage},
          ${callsJson}::jsonb,
          ${emailsJson}::jsonb,
          ${c.csm},
          NOW()
        )
      `,
    )
  }

  if (inserts.length > 0) {
    await sql.transaction(inserts)
  }

  return { batchId }
}

export function getFallbackClients(): DashboardClient[] {
  return parseClientsJson(fallbackRaw) ?? []
}
