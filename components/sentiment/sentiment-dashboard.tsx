"use client"

import { Fragment, useCallback, useMemo, useState } from "react"

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
import { cn } from "@/lib/utils"
import type { DashboardClient, DashboardData } from "@/types/dashboard"

type SortCol = 0 | 1 | 2 | 5

function scoreBadgeClass(score: number | null) {
  if (score === null)
    return "min-w-9 rounded-full border-0 bg-muted px-3.5 py-1 text-sm font-bold text-muted-foreground"
  if (score === 3)
    return "min-w-9 rounded-full border-0 bg-primary px-3.5 py-1 text-sm font-bold text-primary-foreground"
  if (score === 2)
    return "min-w-9 rounded-full border-0 bg-chart-3/20 px-3.5 py-1 text-sm font-bold text-chart-3"
  return "min-w-9 rounded-full border-0 bg-destructive px-3.5 py-1 text-sm font-bold text-primary-foreground"
}

function trendClass(trend: DashboardClient["trend"]) {
  if (trend === "up") return "text-primary"
  if (trend === "down") return "text-destructive"
  return "text-chart-3"
}

function sentimentClass(sentiment: string | null) {
  if (!sentiment || sentiment === "—") return ""
  const s = sentiment.toLowerCase()
  if (s.includes("positif")) return "text-primary"
  if (s.includes("neutre")) return "text-chart-3"
  if (s.includes("négatif") || s.includes("negatif")) return "text-destructive"
  return ""
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

function compareClients(
  a: DashboardClient,
  b: DashboardClient,
  col: SortCol,
  asc: boolean,
): number {
  const dir = asc ? 1 : -1
  if (col === 0) {
    return dir * a.displayName.localeCompare(b.displayName, "fr")
  }
  if (col === 1) {
    return dir * a.segment.localeCompare(b.segment, "fr")
  }
  if (col === 2) {
    const va = a.score === null ? -1 : a.score
    const vb = b.score === null ? -1 : b.score
    return dir * (va - vb)
  }
  if (col === 5) {
    const va = a.lastCall ?? "0000-00-00"
    const vb = b.lastCall ?? "0000-00-00"
    return dir * va.localeCompare(vb)
  }
  return 0
}

export function SentimentDashboard({ data }: { data: DashboardData }) {
  const [search, setSearch] = useState("")
  const [scoreFilter, setScoreFilter] = useState<string>("all")
  const [segmentFilter, setSegmentFilter] = useState<string>("all")
  const [sort, setSort] = useState<{ col: SortCol; asc: boolean } | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

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
    return data.clients.filter((c) => {
      const matchSearch =
        !q ||
        c.searchName.toLowerCase().includes(q) ||
        c.displayName.toLowerCase().includes(q)
      const matchScore =
        scoreFilter === "all" || c.scoreFilter === scoreFilter
      const matchSegment =
        segmentFilter === "all" || c.segment === segmentFilter
      return matchSearch && matchScore && matchSegment
    })
  }, [data.clients, search, scoreFilter, segmentFilter])

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

  const exportCsv = useCallback(() => {
    const header =
      "Client,Segment,Score,Tendance,Sentiment,Dernier appel,Problèmes,Demandes features\n"
    const lines = visibleClients.map((c) => {
      const scoreLabel = c.score === null ? "N/A" : String(c.score)
      const trend = c.trendSymbol
      const sentiment = c.sentiment && c.sentiment !== "—" ? c.sentiment : "—"
      const last = c.lastCall ?? "—"
      const problems = c.problems.join(" ").replace(/\s+/g, " ").trim() || "—"
      const features = c.features.join(" ").replace(/\s+/g, " ").trim() || "—"
      return [
        c.displayName,
        c.segment,
        scoreLabel,
        trend,
        sentiment,
        last,
        `"${problems.replace(/"/g, '""')}"`,
        `"${features.replace(/"/g, '""')}"`,
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
    <div className="min-h-screen bg-background text-foreground antialiased">
      <div className="mx-auto max-w-[1400px] px-6 py-6">
        <header className="mb-8 border-b border-border pb-6 text-center">
          <h1 className="mb-2 text-[28px] font-semibold text-foreground">
            {data.meta.title}
          </h1>
          <p className="text-sm text-muted-foreground">{data.meta.subtitle}</p>
        </header>

        <SentimentKpiGrid kpis={data.kpis} />

        <div className="mb-5 flex flex-wrap items-center gap-3">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un client..."
            className="min-w-[200px] flex-1"
          />
          <Select value={scoreFilter} onValueChange={setScoreFilter}>
            <SelectTrigger className="w-full min-w-[180px] flex-1 md:w-[220px] md:flex-none">
              <SelectValue placeholder="Score" />
            </SelectTrigger>
            <SelectContent>
              {data.filters.scoreOptions.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={segmentFilter} onValueChange={setSegmentFilter}>
            <SelectTrigger className="w-full min-w-[180px] flex-1 md:w-[240px] md:flex-none">
              <SelectValue placeholder="Segment" />
            </SelectTrigger>
            <SelectContent>
              {data.filters.segments.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="button" onClick={exportCsv} className="shrink-0">
            📥 Export CSV
          </Button>
        </div>

        <Card className="overflow-hidden border-border bg-card py-0 ring-0">
          <Table className="text-[14px] [&_[data-slot=table-container]]:rounded-xl">
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="h-auto bg-muted px-4 py-3.5 text-[13px] font-medium tracking-wide text-muted-foreground uppercase hover:text-foreground">
                  <button
                    type="button"
                    className="cursor-pointer uppercase"
                    onClick={() => requestSort(0)}
                  >
                    Client ⇅
                  </button>
                </TableHead>
                <TableHead className="h-auto bg-muted px-4 py-3.5 text-[13px] font-medium tracking-wide text-muted-foreground uppercase hover:text-foreground">
                  <button
                    type="button"
                    className="cursor-pointer uppercase"
                    onClick={() => requestSort(1)}
                  >
                    Segment ⇅
                  </button>
                </TableHead>
                <TableHead className="h-auto bg-muted px-4 py-3.5 text-[13px] font-medium tracking-wide text-muted-foreground uppercase hover:text-foreground">
                  <button
                    type="button"
                    className="cursor-pointer uppercase"
                    onClick={() => requestSort(2)}
                  >
                    Score ⇅
                  </button>
                </TableHead>
                <TableHead className="h-auto bg-muted px-4 py-3.5 text-[13px] font-medium tracking-wide text-muted-foreground uppercase">
                  Tendance
                </TableHead>
                <TableHead className="h-auto bg-muted px-4 py-3.5 text-[13px] font-medium tracking-wide text-muted-foreground uppercase">
                  Sentiment
                </TableHead>
                <TableHead className="h-auto bg-muted px-4 py-3.5 text-[13px] font-medium tracking-wide text-muted-foreground uppercase hover:text-foreground">
                  <button
                    type="button"
                    className="cursor-pointer uppercase"
                    onClick={() => requestSort(5)}
                  >
                    Dernier appel ⇅
                  </button>
                </TableHead>
                <TableHead className="h-auto bg-muted px-4 py-3.5 text-[13px] font-medium tracking-wide text-muted-foreground uppercase">
                  Problèmes clés
                </TableHead>
                <TableHead className="h-auto bg-muted px-4 py-3.5 text-[13px] font-medium tracking-wide text-muted-foreground uppercase">
                  Demandes features
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleClients.map((c) => (
                <Fragment key={c.id}>
                  <TableRow
                    className="cursor-pointer border-border hover:bg-muted/60"
                    onClick={() => toggleExpanded(c.id)}
                  >
                    <TableCell className="border-t border-border px-4 py-3.5 whitespace-normal">
                      <a
                        href={c.hubspotUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-primary hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {c.displayName}
                      </a>
                    </TableCell>
                    <TableCell className="border-t border-border px-4 py-3.5">
                      {c.segment}
                    </TableCell>
                    <TableCell className="border-t border-border px-4 py-3.5">
                      <Badge className={scoreBadgeClass(c.score)}>
                        {c.score === null ? "N/A" : c.score}
                      </Badge>
                    </TableCell>
                    <TableCell
                      className={cn(
                        "border-t border-border px-4 py-3.5 text-lg",
                        trendClass(c.trend),
                      )}
                    >
                      {c.trendSymbol}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "border-t border-border px-4 py-3.5",
                        sentimentClass(c.sentiment),
                      )}
                    >
                      {c.sentiment && c.sentiment !== "—" ? c.sentiment : "—"}
                    </TableCell>
                    <TableCell className="border-t border-border px-4 py-3.5">
                      {c.lastCall ?? "—"}
                    </TableCell>
                    <TableCell className="max-w-[280px] border-t border-border px-4 py-3.5 whitespace-normal">
                      {c.problems.length === 0 ? (
                        <span className="text-muted-foreground italic">—</span>
                      ) : (
                        <span className="flex flex-wrap gap-1">
                          {c.problems.map((p) => (
                            <Badge
                              key={p}
                              variant="outline"
                              className="rounded-md border-0 bg-destructive/10 px-2.5 py-0.5 text-xs font-normal text-destructive"
                            >
                              {p}
                            </Badge>
                          ))}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-[280px] border-t border-border px-4 py-3.5 whitespace-normal">
                      {c.features.length === 0 ? (
                        <span className="text-muted-foreground italic">—</span>
                      ) : (
                        <span className="flex flex-wrap gap-1">
                          {c.features.map((f) => (
                            <Badge
                              key={f}
                              variant="outline"
                              className="rounded-md border-0 bg-primary/10 px-2.5 py-0.5 text-xs font-normal text-primary"
                            >
                              {f}
                            </Badge>
                          ))}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                  {expanded.has(c.id) ? (
                    <TableRow className="border-border hover:bg-transparent">
                      <TableCell
                        colSpan={8}
                        className="border-t border-border bg-muted/40 p-0"
                      >
                        <div className="px-6 py-5">
                          <h4 className="mb-3 text-[15px] font-semibold text-primary">
                            {c.detailTitle}
                          </h4>
                          {c.emptyMessage ? (
                            <p className="text-muted-foreground italic">
                              {c.emptyMessage}
                            </p>
                          ) : (
                            <div className="space-y-2.5">
                              {c.calls.map((call) => (
                                <Card
                                  key={`${call.title}-${call.date}`}
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
                                            callSentimentBadgeClass(call.sentiment),
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

        <footer className="py-8 text-center text-xs text-muted-foreground">
          {data.meta.footer}
        </footer>
      </div>
    </div>
  )
}
