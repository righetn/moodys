import type { DashboardClient, DashboardKpi } from "@/types/dashboard"

/**
 * KPI rows derived from client scores (matches dashboard card layout).
 */
export function computeKpisFromClients(clients: DashboardClient[]): DashboardKpi[] {
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
      label: "EXCELLENT",
      value: String(excellent),
      sublabel: "Score 3 · Filter",
    },
    {
      tone: "attention",
      label: "NEUTRAL",
      value: String(attention),
      sublabel: "Score 2 · Filter",
    },
    {
      tone: "alert",
      label: "ALERT",
      value: String(alert),
      sublabel: "Score 1 · Filter",
    },
    {
      tone: "avg",
      label: "AVG SCORE",
      value: avg,
      sublabel: "out of 3",
    },
    {
      tone: "nodata",
      label: "NO DATA",
      value: String(nodata),
      sublabel: "Filter",
    },
  ]
}
