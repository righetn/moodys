import type { DashboardClient, DashboardKpi } from "@/types/dashboard"

function pct(count: number, total: number): string {
  if (total === 0) return "0% des clients"
  return `${Math.round((count / total) * 100)}% des clients`
}

/**
 * Agrégations sur les lignes `score` / clients (équivalent des KPIs issus de data.json).
 */
export function computeKpisFromClients(clients: DashboardClient[]): DashboardKpi[] {
  const n = clients.length
  const excellent = clients.filter((c) => c.score === 3).length
  const attention = clients.filter((c) => c.score === 2).length
  const alert = clients.filter((c) => c.score === 1).length
  const nodata = clients.filter((c) => c.score === null).length
  const withScore = clients.filter((c) => c.score !== null)
  const avg =
    withScore.length === 0
      ? "—"
      : (
          withScore.reduce((s, c) => s + (c.score as number), 0) /
          withScore.length
        ).toFixed(2)

  return [
    {
      tone: "excellent",
      label: "Excellent (Score 3)",
      value: String(excellent),
      sublabel: pct(excellent, n),
    },
    {
      tone: "attention",
      label: "Attention (Score 2)",
      value: String(attention),
      sublabel: pct(attention, n),
    },
    {
      tone: "alert",
      label: "Alerte (Score 1)",
      value: String(alert),
      sublabel: pct(alert, n),
    },
    {
      tone: "avg",
      label: "Score Moyen",
      value: avg,
      sublabel: "sur 3",
    },
    {
      tone: "nodata",
      label: "Sans données",
      value: String(nodata),
      sublabel: pct(nodata, n),
    },
  ]
}
