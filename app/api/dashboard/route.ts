import { NextResponse } from "next/server"

import {
  getBearerToken,
  verifyDashboardUpdateToken,
} from "@/lib/dashboard-update-auth"
import {
  appendDashboardClients,
  getClientsFromDb,
  getFallbackClients,
} from "@/lib/db/dashboard"
import { computeKpisFromClients } from "@/lib/kpis-from-clients"
import { parseDashboardClientsPayload } from "@/lib/schemas/dashboard"
import { treeifyError } from "zod"

export const dynamic = "force-dynamic"

/**
 * GET /api/dashboard — `{ clients, kpis }` (kpis dérivés des scores en base).
 */
export async function GET() {
  const fromDb = await getClientsFromDb()
  const clients = fromDb ?? getFallbackClients()
  const kpis = computeKpisFromClients(clients)
  return NextResponse.json({ clients, kpis })
}

const TOKEN_HEADER = "x-dashboard-token"

/**
 * PUT /api/dashboard — ajoute un lot (`score` + upsert `organization`), même `batchId` pour tout le payload.
 *
 * Auth : `Authorization: Bearer <DASHBOARD_UPDATE_TOKEN>` ou `x-dashboard-token`.
 * Corps : tableau de clients `[...]` ou `{ "clients": [...] }`.
 */
export async function PUT(request: Request) {
  const expected = process.env.DASHBOARD_UPDATE_TOKEN
  if (!expected?.length) {
    return NextResponse.json(
      { error: "Server misconfiguration: DASHBOARD_UPDATE_TOKEN is not set." },
      { status: 503 },
    )
  }

  const headerToken = request.headers.get(TOKEN_HEADER)
  const bearer = getBearerToken(request.headers.get("authorization"))
  const provided = bearer ?? headerToken ?? ""
  if (!verifyDashboardUpdateToken(provided, expected)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let json: unknown
  try {
    json = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const normalized = Array.isArray(json) ? { clients: json } : json
  const parsed = parseDashboardClientsPayload(normalized)
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Validation failed",
        details: treeifyError(parsed.error),
      },
      { status: 400 },
    )
  }

  try {
    const { batchId } = await appendDashboardClients(parsed.data.clients)
    return NextResponse.json({ ok: true, batchId })
  } catch (e) {
    const message = e instanceof Error ? e.message : "Write failed"
    const isDbConfig = message.includes("DATABASE_URL")
    return NextResponse.json(
      { error: message },
      { status: isDbConfig ? 503 : 500 },
    )
  }
}
