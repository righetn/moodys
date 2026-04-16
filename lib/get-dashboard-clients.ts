import { isProductionApi } from "@/lib/api-env"
import {
  getClientsFromDb,
  getFallbackClients,
} from "@/lib/db/dashboard"
import type { DashboardClient } from "@/types/dashboard"

/**
 * Charge les clients depuis Neon quand `DATABASE_URL` / `POSTGRES_URL` est défini,
 * sinon depuis `data.json` en dev ; en **production**, sans DB → liste vide (pas de fallback fichier).
 */
export async function getDashboardClients(): Promise<DashboardClient[]> {
  const fromDb = await getClientsFromDb()
  if (fromDb !== null) return fromDb
  if (isProductionApi()) return []
  return getFallbackClients()
}
