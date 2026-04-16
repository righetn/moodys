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

export function getBearerToken(authorization: string | null): string | null {
  if (!authorization) return null
  const m = /^Bearer\s+(.+)$/i.exec(authorization.trim())
  return m?.[1]?.trim() ?? null
}
