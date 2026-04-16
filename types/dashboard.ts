export type DashboardCall = {
  title: string
  sentiment: string
  date: string
  summary: string
}

export type DashboardClient = {
  id: string
  searchName: string
  displayName: string
  hubspotUrl: string
  segment: string
  score: number | null
  scoreFilter: string
  trend: "up" | "down" | "stable"
  trendSymbol: string
  sentiment: string | null
  lastCall: string | null
  problems: string[]
  features: string[]
  detailTitle: string
  emptyMessage: string | null
  calls: DashboardCall[]
}

export type DashboardKpi = {
  tone: string
  label: string
  value: string
  sublabel: string
}

export type DashboardData = {
  meta: {
    title: string
    subtitle: string
    footer: string
  }
  kpis: DashboardKpi[]
  filters: {
    segments: { value: string; label: string }[]
    scoreOptions: { value: string; label: string }[]
  }
  clients: DashboardClient[]
}
