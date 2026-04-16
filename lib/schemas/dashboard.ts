import type { output, ZodSafeParseResult } from "zod"
import { z } from "zod"

export const dashboardFilterOptionSchema = z.object({
  value: z.string(),
  label: z.string(),
})

export const dashboardCallSchema = z.object({
  title: z.string(),
  sentiment: z.string(),
  date: z.string(),
  summary: z.string(),
})

export const dashboardClientSchema = z.object({
  id: z.string(),
  searchName: z.string(),
  displayName: z.string(),
  hubspotUrl: z.string(),
  segment: z.string(),
  score: z.number().nullable(),
  scoreFilter: z.string(),
  trend: z.enum(["up", "down", "stable"]),
  trendSymbol: z.string(),
  sentiment: z.string().nullable(),
  lastCall: z.string().nullable(),
  problems: z.array(z.string()),
  features: z.array(z.string()),
  detailTitle: z.string(),
  emptyMessage: z.string().nullable(),
  calls: z.array(dashboardCallSchema),
})

export const dashboardKpiSchema = z.object({
  tone: z.string(),
  label: z.string(),
  value: z.string(),
  sublabel: z.string(),
})

/** Fichier `data.json` : uniquement un tableau de clients. */
export const dashboardClientsArraySchema = z.array(dashboardClientSchema)

/** Corps attendu pour `PUT /api/dashboard` (clients uniquement). */
export const dashboardClientsPutPayloadSchema = z.object({
  clients: z.array(dashboardClientSchema),
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
