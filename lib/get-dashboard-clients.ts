import {
  getClientsFromDb,
  getFallbackClients,
} from "@/lib/db/dashboard"
import type { DashboardClient } from "@/types/dashboard"

/**
 * Charge les clients depuis Neon quand `DATABASE_URL` / `POSTGRES_URL` est défini,
 * sinon depuis `data.json` (tableau racine de clients ou `{ "clients": [...] }`).
 */
export async function getDashboardClients(): Promise<DashboardClient[]> {
  const fromDb = await getClientsFromDb()
  if (fromDb !== null) return fromDb
  return getFallbackClients()
}
