"use client"

import { Fragment, useCallback, useMemo, useState } from "react"
import { Download, Search } from "lucide-react"

import { DashboardSidebarStats } from "@/components/sentiment/dashboard-sidebar-stats"
import { useDashboard } from "@/components/sentiment/dashboard-context"
import { SentimentKpiGrid } from "@/components/sentiment/sentiment-kpi-grid"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { escapeCsvField } from "@/lib/csv-escape"
import { DASHBOARD_META } from "@/lib/dashboard-meta"
import { cn } from "@/lib/utils"
import type { DashboardClient } from "@/types/dashboard"

/** Sort: client name | mood (score) | last call */
type SortCol = 0 | 1 | 2

function moodEmoji(score: number | null) {
  if (score === 3) return "😊"
  if (score === 2) return "😐"
  if (score === 1) return "😟"
  return "❓"
}

function moodBadgeClass(score: number | null) {
  if (score === null)
    return "gap-0.5 rounded-full border-0 bg-muted px-3 py-1.5 text-base text-muted-foreground"
  if (score === 3)
    return "gap-1 rounded-full border-0 bg-primary/15 px-3 py-1.5 text-base font-bold text-primary"
  if (score === 2)
    return "gap-1 rounded-full border-0 bg-chart-3/15 px-3 py-1.5 text-base font-bold text-chart-3"
  return "gap-1 rounded-full border-0 bg-destructive/15 px-3 py-1.5 text-base font-bold text-destructive"
}

function callSentimentBadgeClass(sentiment: string) {
  const s = sentiment.toLowerCase()
  if (s.includes("négatif") || s.includes("negatif"))
    return "bg-destructive text-primary-foreground"
  if (s.includes("neutre"))
    return "bg-chart-3/20 text-foreground"
  if (s.includes("positif")) return "bg-primary/20 text-primary"
  return "bg-muted text-muted-foreground"
}

function rowScoreBorder(score: number | null) {
  if (score === 3) return "border-l-primary"
  if (score === 2) return "border-l-chart-3"
  if (score === 1) return "border-l-destructive"
  return "border-l-muted-foreground/50"
}

function formatShortDate(iso: string | null): string {
  if (!iso) return "—"
  const d = new Date(`${iso}T12:00:00`)
  if (Number.isNaN(d.getTime())) return iso
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  }).format(d)
}

function compareClients(
  a: DashboardClient,
  b: DashboardClient,
  col: SortCol,
  asc: boolean,
): number {
  const dir = asc ? 1 : -1
  if (col === 0) {
    return dir * a.displayName.localeCompare(b.displayName, "en")
  }
  if (col === 1) {
    const va = a.score === null ? -1 : a.score
    const vb = b.score === null ? -1 : b.score
    return dir * (va - vb)
  }
  if (col === 2) {
    const va = a.lastCall ?? "0000-00-00"
    const vb = b.lastCall ?? "0000-00-00"
    return dir * va.localeCompare(vb)
  }
  return 0
}

function ariaSortState(
  sort: { col: SortCol; asc: boolean } | null,
  col: SortCol,
): "ascending" | "descending" | "none" {
  if (!sort || sort.col !== col) return "none"
  return sort.asc ? "ascending" : "descending"
}

export function SentimentDashboard() {
  const {
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
    csmOptions,
  } = useDashboard()
  const [sort, setSort] = useState<{ col: SortCol; asc: boolean } | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const todayLabel = useMemo(
    () =>
      new Intl.DateTimeFormat("en-GB", {
        day: "numeric",
        month: "short",
        year: "2-digit",
      }).format(new Date()),
    [],
  )

  const toggleExpanded = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return clients.filter((c) => {
      const matchSearch =
        !q ||
        c.searchName.toLowerCase().includes(q) ||
        c.displayName.toLowerCase().includes(q)
      const matchScore =
        scoreFilter === "all" || c.scoreFilter === scoreFilter
      const matchSegment =
        segmentFilter === "all" || c.segment === segmentFilter
      const matchCsm = csmFilter === "all"
      return matchSearch && matchScore && matchSegment && matchCsm
    })
  }, [clients, search, scoreFilter, segmentFilter, csmFilter])

  const visibleClients = useMemo(() => {
    if (!sort) return filtered
    const { col, asc } = sort
    return [...filtered].sort((a, b) => {
      const primary = compareClients(a, b, col, asc)
      if (primary !== 0) return primary
      return a.id.localeCompare(b.id)
    })
  }, [filtered, sort])

  const requestSort = (col: SortCol) => {
    setSort((prev) => {
      if (prev?.col === col) return { col, asc: !prev.asc }
      return { col, asc: true }
    })
  }

  const resetFilters = useCallback(() => {
    setSearch("")
    setScoreFilter("all")
    setSegmentFilter("all")
    setCsmFilter("all")
  }, [setSearch, setScoreFilter, setSegmentFilter, setCsmFilter])

  const filtersActive =
    search.trim() !== "" ||
    scoreFilter !== "all" ||
    segmentFilter !== "all" ||
    csmFilter !== "all"

  const exportCsv = useCallback(() => {
    const header = "Client,Mood score,Last call,Key issues,Feature requests,CSM\n"
    const lines = visibleClients.map((c) => {
      const mood = c.score === null ? "?" : String(c.score)
      const last = c.lastCall ?? "—"
      const problems = c.problems.join(" ").replace(/\s+/g, " ").trim() || "—"
      const features = c.features.join(" ").replace(/\s+/g, " ").trim() || "—"
      return [
        escapeCsvField(c.displayName),
        escapeCsvField(mood),
        escapeCsvField(last),
        escapeCsvField(problems),
        escapeCsvField(features),
        escapeCsvField("—"),
      ].join(",")
    })
    const csv = "\uFEFF" + header + lines.join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "customer_sentiment.csv"
    a.click()
    URL.revokeObjectURL(url)
  }, [visibleClients])

  return (
    <div className="min-h-screen bg-muted/40 text-foreground antialiased">
      <div className="mx-auto max-w-[1480px] px-6 pb-10 pt-6 md:px-7">
        <header className="mb-6 flex flex-wrap items-center gap-5 border-b border-border pb-5">
          <div
            className="flex h-[72px] w-[min(100%,220px)] shrink-0 flex-col justify-center rounded-xl bg-slate-950 px-3 py-2 text-white shadow-sm dark:bg-slate-950"
            aria-label={DASHBOARD_META.title}
          >
            <div className="flex items-center gap-2">
              <span className="text-2xl leading-none" aria-hidden>
                😊
              </span>
              <div className="min-w-0 leading-tight">
                <div className="text-[17px] font-extrabold tracking-tight">
                  <span className="text-white">Moody</span>
                  <span className="text-emerald-400">{"'s"}</span>
                </div>
                <div className="text-[8px] font-semibold tracking-[0.22em] text-slate-400 uppercase">
                  Customer mood dashboard
                </div>
              </div>
            </div>
          </div>

          <div className="min-w-0 flex-1 text-center sm:text-left">
            <p className="text-sm font-medium text-foreground">
              {clients.length} active clients · {todayLabel}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{DASHBOARD_META.subtitle}</p>
          </div>

          <div className="flex shrink-0 flex-wrap items-center justify-center gap-2 sm:ml-auto">
            <Badge
              variant="outline"
              className="gap-1.5 rounded-full border-border bg-card px-2.5 py-1 text-[11px] font-semibold text-muted-foreground"
            >
              <span className="size-1.5 shrink-0 rounded-full bg-orange-500" aria-hidden />
              HubSpot
            </Badge>
            <Badge
              variant="outline"
              className="gap-1.5 rounded-full border-border bg-card px-2.5 py-1 text-[11px] font-semibold text-muted-foreground"
            >
              <span className="size-1.5 shrink-0 rounded-full bg-violet-600" aria-hidden />
              Modjo
            </Badge>
          </div>
        </header>

        <SentimentKpiGrid
          kpis={kpis}
          scoreFilter={scoreFilter}
          onScoreFilter={setScoreFilter}
        />

        <Card className="mb-4 border-border bg-card p-3 shadow-sm ring-0">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative min-w-0 flex-1">
              <Search
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search for a client…"
                className="h-10 border-border bg-background pl-10"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2 lg:shrink-0">
              <Select value={segmentFilter} onValueChange={setSegmentFilter}>
                <SelectTrigger className="h-10 min-w-[160px] flex-1 border-border bg-background lg:w-[200px] lg:flex-none">
                  <SelectValue placeholder="Segment" />
                </SelectTrigger>
                <SelectContent>
                  {segmentOptions.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={csmFilter} onValueChange={setCsmFilter}>
                <SelectTrigger className="h-10 min-w-[140px] flex-1 border-border bg-background lg:w-[160px] lg:flex-none">
                  <SelectValue placeholder="CSM" />
                </SelectTrigger>
                <SelectContent>
                  {csmOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="secondary"
                className="h-10 shrink-0 gap-2"
                onClick={exportCsv}
              >
                <Download className="size-4" aria-hidden />
                Export
              </Button>
            </div>
          </div>
        </Card>

        {filtersActive ? (
          <div className="mb-3 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
            <span>
              Active filters
              {search.trim() ? (
                <>
                  {" "}
                  · search « <strong className="text-foreground">{search.trim()}</strong> »
                </>
              ) : null}
              {scoreFilter !== "all" ? (
                <>
                  {" "}
                  · mood <strong className="text-foreground">{scoreFilter}</strong>
                </>
              ) : null}
              {segmentFilter !== "all" ? (
                <>
                  {" "}
                  · segment{" "}
                  <strong className="text-foreground">{segmentFilter}</strong>
                </>
              ) : null}
            </span>
            <Button
              type="button"
              variant="link"
              className="h-auto p-0 text-xs font-semibold"
              onClick={resetFilters}
            >
              Reset
            </Button>
          </div>
        ) : null}

        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[1fr_17rem] xl:grid-cols-[1fr_272px]">
          <div className="min-w-0">
            <Card className="overflow-hidden border-border bg-card py-0 shadow-sm ring-0">
              <Table className="text-[13px] [&_[data-slot=table-container]]:rounded-xl">
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead
                      aria-sort={ariaSortState(sort, 0)}
                      className="h-auto bg-muted px-4 py-3 text-[11px] font-bold tracking-wide text-muted-foreground uppercase"
                    >
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-auto px-0 text-[11px] font-bold uppercase"
                        onClick={() => requestSort(0)}
                      >
                        Client ↕
                      </Button>
                    </TableHead>
                    <TableHead
                      aria-sort={ariaSortState(sort, 1)}
                      className="h-auto bg-muted px-4 py-3 text-[11px] font-bold tracking-wide text-muted-foreground uppercase"
                    >
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-auto px-0 text-[11px] font-bold uppercase"
                        onClick={() => requestSort(1)}
                      >
                        Mood ↕
                      </Button>
                    </TableHead>
                    <TableHead
                      aria-sort={ariaSortState(sort, 2)}
                      className="h-auto bg-muted px-4 py-3 text-[11px] font-bold tracking-wide text-muted-foreground uppercase"
                    >
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-auto px-0 text-[11px] font-bold uppercase"
                        onClick={() => requestSort(2)}
                      >
                        Last call ↕
                      </Button>
                    </TableHead>
                    <TableHead className="h-auto bg-muted px-4 py-3 text-[11px] font-bold tracking-wide text-muted-foreground uppercase">
                      Key issues
                    </TableHead>
                    <TableHead className="h-auto bg-muted px-4 py-3 text-[11px] font-bold tracking-wide text-muted-foreground uppercase">
                      Feature requests
                    </TableHead>
                    <TableHead className="h-auto bg-muted px-4 py-3 text-[11px] font-bold tracking-wide text-muted-foreground uppercase">
                      CSM
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleClients.map((c) => (
                    <Fragment key={c.id}>
                      <TableRow
                        className={cn(
                          "cursor-pointer border-border border-l-[3px] hover:bg-muted/60",
                          rowScoreBorder(c.score),
                        )}
                        onClick={() => toggleExpanded(c.id)}
                      >
                        <TableCell className="border-t border-border px-4 py-3 whitespace-normal">
                          <a
                            href={c.hubspotUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-semibold text-foreground underline-offset-4 hover:text-primary hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {c.displayName}
                          </a>
                        </TableCell>
                        <TableCell className="border-t border-border px-4 py-3">
                          <Badge className={moodBadgeClass(c.score)}>
                            {c.score !== null ? (
                              <>
                                <span aria-hidden>{moodEmoji(c.score)}</span>
                                <span>{c.score}</span>
                              </>
                            ) : (
                              <span aria-hidden>{moodEmoji(null)}</span>
                            )}
                          </Badge>
                        </TableCell>
                        <TableCell className="border-t border-border px-4 py-3 text-muted-foreground">
                          {formatShortDate(c.lastCall)}
                        </TableCell>
                        <TableCell className="max-w-[220px] border-t border-border px-4 py-3 whitespace-normal">
                          {c.problems.length === 0 ? (
                            <span className="text-muted-foreground italic">—</span>
                          ) : (
                            <span className="flex flex-wrap gap-1">
                              {c.problems.map((p) => (
                                <Badge
                                  key={p}
                                  variant="outline"
                                  className="rounded-md border-0 bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive"
                                >
                                  {p}
                                </Badge>
                              ))}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="max-w-[220px] border-t border-border px-4 py-3 whitespace-normal">
                          {c.features.length === 0 ? (
                            <span className="text-muted-foreground italic">—</span>
                          ) : (
                            <span className="flex flex-wrap gap-1">
                              {c.features.map((f) => (
                                <Badge
                                  key={f}
                                  variant="outline"
                                  className="rounded-md border-0 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
                                >
                                  {f}
                                </Badge>
                              ))}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="border-t border-border px-4 py-3 text-muted-foreground">
                          —
                        </TableCell>
                      </TableRow>
                      {expanded.has(c.id) ? (
                        <TableRow className="border-border hover:bg-transparent">
                          <TableCell
                            colSpan={6}
                            className="border-t-2 border-border bg-muted/40 p-0"
                          >
                            <div className="px-5 py-5 md:px-6">
                              <h4 className="mb-4 text-sm font-semibold text-foreground">
                                {c.detailTitle}
                              </h4>
                              {c.emptyMessage ? (
                                <p className="text-sm text-muted-foreground italic">
                                  {c.emptyMessage}
                                </p>
                              ) : (
                                <div className="grid gap-6 md:grid-cols-2 md:gap-8">
                                  <section className="min-w-0 space-y-3">
                                    <h5 className="flex items-center gap-2 text-[11px] font-bold tracking-wide text-muted-foreground uppercase">
                                      <span>Modjo calls</span>
                                      <span className="h-px min-w-0 flex-1 bg-border" />
                                    </h5>
                                    <div className="space-y-2.5">
                                      {c.calls.map((call, callIdx) => (
                                        <Card
                                          key={`${c.id}-call-${callIdx}-${call.date}`}
                                          className="border-0 border-l-[3px] border-l-primary bg-card py-3.5 ring-0"
                                        >
                                          <div className="flex flex-col gap-1.5 px-4">
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                              <span className="text-sm font-semibold text-foreground">
                                                {call.title}
                                              </span>
                                              <div className="flex items-center gap-2">
                                                <span
                                                  className={cn(
                                                    "rounded-full px-2.5 py-0.5 text-xs font-medium",
                                                    callSentimentBadgeClass(
                                                      call.sentiment,
                                                    ),
                                                  )}
                                                >
                                                  {call.sentiment}
                                                </span>
                                                <span className="text-xs text-muted-foreground">
                                                  {call.date}
                                                </span>
                                              </div>
                                            </div>
                                            <p className="text-[13px] leading-relaxed text-muted-foreground">
                                              {call.summary}
                                            </p>
                                          </div>
                                        </Card>
                                      ))}
                                    </div>
                                  </section>
                                  <section className="min-w-0 space-y-3">
                                    <h5 className="flex items-center gap-2 text-[11px] font-bold tracking-wide text-muted-foreground uppercase">
                                      <span>HubSpot emails</span>
                                      <span className="h-px min-w-0 flex-1 bg-border" />
                                    </h5>
                                    <p className="rounded-lg border border-dashed border-border bg-muted/30 px-4 py-3 text-sm italic text-muted-foreground">
                                      Email snippets are not included in the current JSON
                                      export.
                                    </p>
                                  </section>
                                </div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : null}
                    </Fragment>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </div>

          <aside className="lg:sticky lg:top-6">
            <DashboardSidebarStats clients={visibleClients} />
          </aside>
        </div>

        <footer className="mt-7 border-t border-border pt-6 text-center text-[10.5px] text-muted-foreground">
          {DASHBOARD_META.footer} · {todayLabel}
        </footer>
      </div>
    </div>
  )
}
