import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { DashboardKpi } from "@/types/dashboard"

const toneValueClass: Record<string, string> = {
  excellent: "text-primary",
  attention: "text-chart-3",
  alert: "text-destructive",
  avg: "text-chart-2",
  nodata: "text-muted-foreground",
}

const toneEmoji: Record<string, string> = {
  excellent: "😊",
  attention: "😐",
  alert: "😟",
  avg: "📊",
  nodata: "❓",
}

/** Maps KPI tone to `scoreFilter` value; `avg` is not filterable. */
const toneToScoreFilter: Record<string, string | null> = {
  excellent: "3",
  attention: "2",
  alert: "1",
  nodata: "na",
  avg: null,
}

const toneTopBorder: Record<string, string> = {
  excellent: "border-t-primary",
  attention: "border-t-chart-3",
  alert: "border-t-destructive",
  avg: "border-t-chart-2",
  nodata: "border-t-muted-foreground/60",
}

type SentimentKpiGridProps = {
  kpis: DashboardKpi[]
  scoreFilter: string
  onScoreFilter: (value: string) => void
}

export function SentimentKpiGrid({
  kpis,
  scoreFilter,
  onScoreFilter,
}: SentimentKpiGridProps) {
  return (
    <div className="mb-4 grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-2.5">
      {kpis.map((kpi) => {
        const filterValue = toneToScoreFilter[kpi.tone]
        const isClickable = filterValue !== null
        const isActive = isClickable && scoreFilter === filterValue

        return (
          <Card
            key={`${kpi.label}-${kpi.value}`}
            size="sm"
            role={isClickable ? "button" : undefined}
            tabIndex={isClickable ? 0 : undefined}
            onClick={
              isClickable
                ? () =>
                    onScoreFilter(
                      scoreFilter === filterValue ? "all" : filterValue,
                    )
                : undefined
            }
            onKeyDown={
              isClickable
                ? (e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault()
                      onScoreFilter(
                        scoreFilter === filterValue ? "all" : filterValue,
                      )
                    }
                  }
                : undefined
            }
            className={cn(
              "border-border border-t-[3px] bg-card py-3 text-center text-card-foreground ring-0 transition-[box-shadow,transform,border-color]",
              toneTopBorder[kpi.tone] ?? "border-t-border",
              isClickable &&
                "cursor-pointer hover:-translate-y-px hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring/50",
              isActive &&
                "ring-2 ring-ring/40 ring-offset-2 ring-offset-background",
            )}
          >
            <CardHeader className="px-3 pb-0">
              <p className="text-xl leading-none" aria-hidden>
                {toneEmoji[kpi.tone] ?? "·"}
              </p>
            </CardHeader>
            <CardContent className="px-3 pt-2 pb-1">
              <p
                className={cn(
                  "text-3xl font-extrabold tracking-tight",
                  toneValueClass[kpi.tone] ?? "text-foreground",
                )}
              >
                {kpi.value}
              </p>
              <p className="mt-1 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                {kpi.label}
              </p>
            </CardContent>
            <CardFooter className="justify-center border-t-0 bg-transparent px-3 pt-0 pb-0">
              <p className="text-[10px] text-muted-foreground">{kpi.sublabel}</p>
            </CardFooter>
          </Card>
        )
      })}
    </div>
  )
}
