"use client"

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react"

import { computeKpisFromClients } from "@/lib/kpis-from-clients"
import type {
  DashboardClient,
  DashboardFilterOption,
  DashboardKpi,
} from "@/types/dashboard"

const SCORE_FILTER_OPTIONS: DashboardFilterOption[] = [
  { value: "all", label: "All scores" },
  { value: "1", label: "Alert (1)" },
  { value: "2", label: "Neutral (2)" },
  { value: "3", label: "Excellent (3)" },
  { value: "na", label: "No data" },
]

const CSM_FILTER_OPTIONS: DashboardFilterOption[] = [
  { value: "all", label: "All CSMs" },
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
  csmFilter: string
  setCsmFilter: (v: string) => void
  segmentOptions: DashboardFilterOption[]
  scoreOptions: DashboardFilterOption[]
  csmOptions: DashboardFilterOption[]
}

const DashboardContext = createContext<DashboardContextValue | null>(null)

export function DashboardProvider({
  clients,
  children,
}: {
  clients: DashboardClient[]
  children: ReactNode
}) {
  const kpis = useMemo(() => computeKpisFromClients(clients), [clients])

  const [search, setSearch] = useState("")
  const [scoreFilter, setScoreFilter] = useState("all")
  const [segmentFilter, setSegmentFilter] = useState("all")
  const [csmFilter, setCsmFilter] = useState("all")

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
    return [{ value: "all", label: "All segments" }, ...dynamic]
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
      csmFilter,
      setCsmFilter,
      segmentOptions,
      scoreOptions: SCORE_FILTER_OPTIONS,
      csmOptions: CSM_FILTER_OPTIONS,
    }),
    [
      clients,
      kpis,
      search,
      scoreFilter,
      segmentFilter,
      csmFilter,
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
