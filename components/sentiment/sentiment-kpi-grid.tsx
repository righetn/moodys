import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { DashboardKpi } from "@/types/dashboard"

const toneValueClass: Record<string, string> = {
  excellent: "text-primary",
  attention: "text-chart-3",
  alert: "text-destructive",
  avg: "text-chart-2",
  nodata: "text-muted-foreground",
}

export function SentimentKpiGrid({ kpis }: { kpis: DashboardKpi[] }) {
  return (
    <div className="mb-8 grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
      {kpis.map((kpi) => (
        <Card
          key={`${kpi.label}-${kpi.value}`}
          className="border-border bg-card py-5 text-center text-card-foreground ring-0"
        >
          <CardHeader className="px-4 pb-0">
            <p className="text-[13px] font-medium tracking-wide text-muted-foreground uppercase">
              {kpi.label}
            </p>
          </CardHeader>
          <CardContent className="px-4 pt-2 pb-1">
            <p
              className={cn(
                "text-4xl font-bold",
                toneValueClass[kpi.tone] ?? "text-foreground",
              )}
            >
              {kpi.value}
            </p>
          </CardContent>
          <CardFooter className="justify-center border-0 px-4 pt-0 pb-0">
            <p className="text-[13px] text-muted-foreground">{kpi.sublabel}</p>
          </CardFooter>
        </Card>
      ))}
    </div>
  )
}
