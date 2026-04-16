"use client"

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react"

import type {
  DashboardClient,
  DashboardFilterOption,
  DashboardKpi,
} from "@/types/dashboard"

const SCORE_FILTER_OPTIONS: DashboardFilterOption[] = [
  { value: "all", label: "Tous les scores" },
  { value: "1", label: "🔴 Alerte (1)" },
  { value: "2", label: "🟠 Attention (2)" },
  { value: "3", label: "🟢 Excellent (3)" },
  { value: "na", label: "Sans données" },
]

export type DashboardContextValue = {
  clients: DashboardClient[]
  kpis: DashboardKpi[]
  search: string
  setSearch: (v: string) => void
  scoreFilter: string
  setScoreFilter: (v: string) => void
  segmentFilter: string
  setSegmentFilter: (v: string) => void
  segmentOptions: DashboardFilterOption[]
  scoreOptions: DashboardFilterOption[]
}

const DashboardContext = createContext<DashboardContextValue | null>(null)

export function DashboardProvider({
  clients,
  kpis,
  children,
}: {
  clients: DashboardClient[]
  kpis: DashboardKpi[]
  children: ReactNode
}) {
  const [search, setSearch] = useState("")
  const [scoreFilter, setScoreFilter] = useState("all")
  const [segmentFilter, setSegmentFilter] = useState("all")

  const segmentOptions = useMemo(() => {
    const seen = new Set<string>()
    const dynamic: DashboardFilterOption[] = []
    for (const c of clients) {
      if (!seen.has(c.segment)) {
        seen.add(c.segment)
        dynamic.push({ value: c.segment, label: c.segment })
      }
    }
    dynamic.sort((a, b) => a.label.localeCompare(b.label, "fr"))
    return [{ value: "all", label: "Tous les segments" }, ...dynamic]
  }, [clients])

  const value = useMemo(
    () => ({
      clients,
      kpis,
      search,
      setSearch,
      scoreFilter,
      setScoreFilter,
      segmentFilter,
      setSegmentFilter,
      segmentOptions,
      scoreOptions: SCORE_FILTER_OPTIONS,
    }),
    [
      clients,
      kpis,
      search,
      scoreFilter,
      segmentFilter,
      segmentOptions,
    ],
  )

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  )
}

export function useDashboard() {
  const ctx = useContext(DashboardContext)
  if (!ctx) {
    throw new Error("useDashboard must be used within DashboardProvider")
  }
  return ctx
}
