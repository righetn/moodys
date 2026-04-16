import { NextResponse } from "next/server"

import { isProductionApi } from "@/lib/api-env"
import {
  DASHBOARD_TOKEN_HEADER,
  getBearerToken,
  verifyDashboardReadRequest,
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

const SENSITIVE_CACHE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
} as const

const MAX_PUT_BODY_BYTES = 2 * 1024 * 1024

/**
 * GET /api/dashboard — `{ clients, kpis }` (kpis dérivés des scores en base).
 * Si `DASHBOARD_READ_TOKEN` est défini, exige `Authorization: Bearer …` ou `x-dashboard-token`.
 */
export async function GET(request: Request) {
  if (!verifyDashboardReadRequest(request)) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: SENSITIVE_CACHE_HEADERS },
    )
  }

  const fromDb = await getClientsFromDb()
  const clients =
    fromDb ?? (isProductionApi() ? [] : getFallbackClients())
  const kpis = computeKpisFromClients(clients)
  return NextResponse.json(
    { clients, kpis },
    { headers: SENSITIVE_CACHE_HEADERS },
  )
}

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
      { status: 503, headers: SENSITIVE_CACHE_HEADERS },
    )
  }

  const headerToken = request.headers.get(DASHBOARD_TOKEN_HEADER)
  const bearer = getBearerToken(request.headers.get("authorization"))
  const provided = bearer ?? headerToken ?? ""
  if (!verifyDashboardUpdateToken(provided, expected)) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: SENSITIVE_CACHE_HEADERS },
    )
  }

  const lenRaw = request.headers.get("content-length")
  if (lenRaw) {
    const n = Number.parseInt(lenRaw, 10)
    if (Number.isFinite(n) && n > MAX_PUT_BODY_BYTES) {
      return NextResponse.json(
        { error: "Payload too large", code: "PAYLOAD_TOO_LARGE" },
        { status: 413, headers: SENSITIVE_CACHE_HEADERS },
      )
    }
  }

  let json: unknown
  try {
    json = await request.json()
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400, headers: SENSITIVE_CACHE_HEADERS },
    )
  }

  const normalized = Array.isArray(json) ? { clients: json } : json
  const parsed = parseDashboardClientsPayload(normalized)
  if (!parsed.success) {
    if (!isProductionApi()) {
      console.warn("[dashboard PUT] validation failed", parsed.error)
    }
    const body = isProductionApi()
      ? { error: "Validation failed", code: "VALIDATION_FAILED" }
      : {
          error: "Validation failed",
          code: "VALIDATION_FAILED",
          details: treeifyError(parsed.error),
        }
    return NextResponse.json(body, {
      status: 400,
      headers: SENSITIVE_CACHE_HEADERS,
    })
  }

  try {
    const { batchId } = await appendDashboardClients(parsed.data.clients)
    console.info("[dashboard PUT] ok", {
      batchId,
      clientCount: parsed.data.clients.length,
    })
    return NextResponse.json(
      { ok: true, batchId },
      { headers: SENSITIVE_CACHE_HEADERS },
    )
  } catch (e) {
    console.error("[dashboard PUT] write error", e)
    const message = e instanceof Error ? e.message : "Write failed"
    const isDbConfig = message.includes("DATABASE_URL")
    const status = isDbConfig ? 503 : 500
    return NextResponse.json(
      isProductionApi()
        ? {
            error: "Write failed",
            code: isDbConfig ? "DB_NOT_CONFIGURED" : "DASHBOARD_WRITE_FAILED",
          }
        : { error: message, code: "DASHBOARD_WRITE_FAILED" },
      { status, headers: SENSITIVE_CACHE_HEADERS },
    )
  }
}
