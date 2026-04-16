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

/** Si `DASHBOARD_READ_TOKEN` est défini, `GET /api/dashboard` exige le même schéma d’auth que le PUT. */
export function verifyDashboardReadRequest(request: Request): boolean {
  const expected = process.env.DASHBOARD_READ_TOKEN
  if (!expected?.length) return true
  const headerToken = request.headers.get(DASHBOARD_TOKEN_HEADER)
  const bearer = getBearerToken(request.headers.get("authorization"))
  const provided = bearer ?? headerToken ?? ""
  return verifyDashboardUpdateToken(provided, expected)
}
