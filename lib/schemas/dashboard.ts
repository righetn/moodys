import type { output, ZodSafeParseResult } from "zod"
import { url, z } from "zod"

const MAX_CLIENTS_PER_PAYLOAD = 500
const MAX_PROBLEMS = 80
const MAX_FEATURES = 80
const MAX_CALLS = 100
const MAX_SHORT = 500
const MAX_MEDIUM = 4000
const MAX_SEARCH_NAME = 2000

export const dashboardFilterOptionSchema = z.object({
  value: z.string(),
  label: z.string(),
})

export const dashboardCallSchema = z.object({
  title: z.string().min(1).max(MAX_SHORT),
  sentiment: z.string().max(MAX_SHORT),
  date: z.string().max(64),
  summary: z.string().max(MAX_MEDIUM),
})

const scoreValueSchema = z.number().int().min(1).max(3).nullable()

export const dashboardClientSchema = z
  .object({
    id: z.string().min(1).max(64),
    searchName: z.string().max(MAX_SEARCH_NAME),
    displayName: z.string().min(1).max(MAX_SHORT),
    hubspotUrl: url(),
    segment: z.string().min(1).max(MAX_SHORT),
    score: scoreValueSchema,
    scoreFilter: z.enum(["1", "2", "3", "na"]),
    trend: z.enum(["up", "down", "stable"]),
    trendSymbol: z.string().max(16),
    sentiment: z.string().max(MAX_SHORT).nullable(),
    lastCall: z.string().max(32).nullable(),
    problems: z.array(z.string().max(MAX_MEDIUM)).max(MAX_PROBLEMS),
    features: z.array(z.string().max(MAX_MEDIUM)).max(MAX_FEATURES),
    detailTitle: z.string().min(1).max(MAX_SHORT),
    emptyMessage: z.string().max(MAX_MEDIUM).nullable(),
    calls: z.array(dashboardCallSchema).max(MAX_CALLS),
  })
  .superRefine((data, ctx) => {
    if (data.score === null) {
      if (data.scoreFilter !== "na") {
        ctx.addIssue({
          code: "custom",
          message: "score null implique scoreFilter « na »",
          path: ["scoreFilter"],
        })
      }
    } else if (String(data.score) !== data.scoreFilter) {
      ctx.addIssue({
        code: "custom",
        message: "scoreFilter doit correspondre au score (ex. score 2 → « 2 »)",
        path: ["scoreFilter"],
      })
    }
  })

export const dashboardKpiSchema = z.object({
  tone: z.string(),
  label: z.string(),
  value: z.string(),
  sublabel: z.string(),
})

/** Fichier `data.json` : uniquement un tableau de clients. */
export const dashboardClientsArraySchema = z
  .array(dashboardClientSchema)
  .max(MAX_CLIENTS_PER_PAYLOAD)

/** Corps attendu pour `PUT /api/dashboard` (clients uniquement). */
export const dashboardClientsPutPayloadSchema = z.object({
  clients: z.array(dashboardClientSchema).max(MAX_CLIENTS_PER_PAYLOAD),
})

export type DashboardFilterOption = output<typeof dashboardFilterOptionSchema>
export type DashboardCall = output<typeof dashboardCallSchema>
export type DashboardClient = output<typeof dashboardClientSchema>
export type DashboardKpi = output<typeof dashboardKpiSchema>
export type DashboardClientsPutPayload = output<
  typeof dashboardClientsPutPayloadSchema
>

export function parseDashboardClientsPayload(
  input: unknown,
): ZodSafeParseResult<DashboardClientsPutPayload> {
  return dashboardClientsPutPayloadSchema.safeParse(input)
}

/**
 * Parse `data.json` : tableau racine `[...]` ou ancien wrapper `{ "clients": [...] }`.
 * Retourne `null` si la forme ou le contenu ne valident pas le schéma client.
 */
export function parseClientsJson(input: unknown): DashboardClient[] | null {
  if (Array.isArray(input)) {
    const r = dashboardClientsArraySchema.safeParse(input)
    return r.success ? r.data : null
  }
  if (input !== null && typeof input === "object" && "clients" in input) {
    const r = dashboardClientsPutPayloadSchema.safeParse(input)
    return r.success ? r.data.clients : null
  }
  return null
}
