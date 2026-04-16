import { createHash, timingSafeEqual } from "node:crypto"

function sha256Hex(input: string): Buffer {
  return createHash("sha256").update(input, "utf8").digest()
}

/**
 * Compares two secrets without leaking length via timingSafeEqual length rule.
 */
export function verifyDashboardUpdateToken(provided: string, expected: string) {
  const a = sha256Hex(provided)
  const b = sha256Hex(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}

export const DASHBOARD_TOKEN_HEADER = "x-dashboard-token"

export function getBearerToken(authorization: string | null): string | null {
  if (!authorization) return null
  const m = /^Bearer\s+(.+)$/i.exec(authorization.trim())
  return m?.[1]?.trim() ?? null
}

export type DashboardReadAuthResult =
  | { ok: true }
  | { ok: false; reason: "misconfigured" | "unauthorized" }

/**
 * Authentification **obligatoire** pour `GET /api/dashboard`.
 *
 * - Au moins un des secrets suivants doit être défini (sinon `misconfigured`) :
 *   `DASHBOARD_READ_TOKEN`, `DASHBOARD_UPDATE_TOKEN`.
 * - Le jeton fourni doit correspondre à **l’un** des secrets configurés (comparaison en temps constant).
 * - Entrées acceptées : `Authorization: Bearer …` ou en-tête `x-dashboard-token` (même schéma que le PUT).
 */
export function checkDashboardReadAuth(request: Request): DashboardReadAuthResult {
  const read = process.env.DASHBOARD_READ_TOKEN?.trim()
  const update = process.env.DASHBOARD_UPDATE_TOKEN?.trim()
  const secrets = [...new Set([read, update].filter((s): s is string => Boolean(s)))]
  if (secrets.length === 0) {
    return { ok: false, reason: "misconfigured" }
  }

  const headerToken = request.headers.get(DASHBOARD_TOKEN_HEADER)
  const bearer = getBearerToken(request.headers.get("authorization"))
  const provided = (bearer ?? headerToken ?? "").trim()
  if (!provided) {
    return { ok: false, reason: "unauthorized" }
  }

  for (const secret of secrets) {
    if (verifyDashboardUpdateToken(provided, secret)) {
      return { ok: true }
    }
  }
  return { ok: false, reason: "unauthorized" }
}
