"use client"

import { useMemo } from "react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { DashboardClient } from "@/types/dashboard"

function moodSegments(clients: DashboardClient[]) {
  let s3 = 0
  let s2 = 0
  let s1 = 0
  let na = 0
  for (const c of clients) {
    if (c.score === 3) s3 += 1
    else if (c.score === 2) s2 += 1
    else if (c.score === 1) s1 += 1
    else na += 1
  }
  const total = clients.length || 1
  return [
    { key: "excellent", label: "Excellent", count: s3, pct: (s3 / total) * 100, bar: "bg-primary" },
    { key: "neutral", label: "Neutral", count: s2, pct: (s2 / total) * 100, bar: "bg-chart-3" },
    { key: "alert", label: "Alert", count: s1, pct: (s1 / total) * 100, bar: "bg-destructive" },
    { key: "nodata", label: "No data", count: na, pct: (na / total) * 100, bar: "bg-muted-foreground/45" },
  ]
}

type SegmentAgg = {
  segment: string
  s1: number
  s2: number
  s3: number
  na: number
  total: number
}

function segmentAggregates(clients: DashboardClient[]): SegmentAgg[] {
  const map = new Map<string, SegmentAgg>()
  for (const c of clients) {
    const cur =
      map.get(c.segment) ?? {
        segment: c.segment,
        s1: 0,
        s2: 0,
        s3: 0,
        na: 0,
        total: 0,
      }
    cur.total += 1
    if (c.score === 1) cur.s1 += 1
    else if (c.score === 2) cur.s2 += 1
    else if (c.score === 3) cur.s3 += 1
    else cur.na += 1
    map.set(c.segment, cur)
  }
  return [...map.values()]
    .sort((a, b) => b.total - a.total)
    .slice(0, 12)
}

function StackedMoodBar({ row }: { row: SegmentAgg }) {
  const t = row.total || 1
  const parts = [
    { n: row.s3, className: "bg-primary" },
    { n: row.s2, className: "bg-chart-3" },
    { n: row.s1, className: "bg-destructive" },
    { n: row.na, className: "bg-muted-foreground/45" },
  ]
  return (
    <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted">
      {parts.map((p, i) =>
        p.n > 0 ? (
          <div
            key={i}
            className={cn("h-full min-w-px", p.className)}
            style={{ width: `${(p.n / t) * 100}%` }}
          />
        ) : null,
      )}
    </div>
  )
}

export function DashboardSidebarStats({ clients }: { clients: DashboardClient[] }) {
  const mood = useMemo(() => moodSegments(clients), [clients])
  const segments = useMemo(() => segmentAggregates(clients), [clients])

  return (
    <div className="flex flex-col gap-3.5">
      <Card className="border-border bg-card py-4 ring-0">
        <CardHeader className="px-4 pb-2">
          <CardTitle className="text-xs font-bold text-foreground">
            Mood distribution
          </CardTitle>
          <CardDescription className="text-[10px] text-muted-foreground">
            Updated with filters
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 px-4">
          <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
            {mood.map(
              (m) =>
                m.pct > 0 && (
                  <div
                    key={m.key}
                    className={cn("h-full min-w-px transition-[width]", m.bar)}
                    style={{ width: `${m.pct}%` }}
                    title={`${m.label}: ${m.count}`}
                  />
                ),
            )}
          </div>
          <ul className="space-y-1.5 text-[11px] text-muted-foreground">
            {mood.map((m) => (
              <li key={m.key} className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2">
                  <span className={cn("size-2 shrink-0 rounded-full", m.bar)} />
                  {m.label}
                </span>
                <span className="font-medium text-foreground">{m.count}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card className="border-border bg-card py-4 ring-0">
        <CardHeader className="px-4 pb-2">
          <CardTitle className="text-xs font-bold text-foreground">
            Health by segment
          </CardTitle>
          <CardDescription className="text-[10px] text-muted-foreground">
            Visible clients × score
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 px-4">
          {segments.length === 0 ? (
            <p className="text-xs italic text-muted-foreground">No visible clients.</p>
          ) : (
            <>
              <div className="flex justify-between pl-0 text-[9px] font-medium tracking-wide text-muted-foreground uppercase">
                <span className="min-w-0 flex-1 truncate pr-2">Segment</span>
                <div className="flex w-[52%] shrink-0 justify-between gap-0.5 text-center">
                  <span className="w-1/4">0</span>
                  <span className="w-1/4">1</span>
                  <span className="w-1/4">2</span>
                  <span className="w-1/4">3</span>
                </div>
              </div>
              <div className="max-h-[260px] space-y-2.5 overflow-y-auto pr-0.5">
                {segments.map((row) => (
                  <div key={row.segment} className="flex items-center gap-2">
                    <span className="w-[42%] shrink-0 truncate text-[11px] font-medium text-foreground">
                      {row.segment}
                    </span>
                    <div className="min-w-0 flex-1">
                      <StackedMoodBar row={row} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1 border-t border-border pt-2 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <span className="size-1.5 rounded-full bg-primary" /> Excellent
                </span>
                <span className="flex items-center gap-1">
                  <span className="size-1.5 rounded-full bg-chart-3" /> Neutral
                </span>
                <span className="flex items-center gap-1">
                  <span className="size-1.5 rounded-full bg-destructive" /> Alert
                </span>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
