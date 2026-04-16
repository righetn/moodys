import type { Metadata } from "next"

import { DashboardProvider } from "@/components/sentiment/dashboard-context"
import { SentimentDashboard } from "@/components/sentiment/sentiment-dashboard"
import { DASHBOARD_META } from "@/lib/dashboard-meta"
import { getDashboardClients } from "@/lib/get-dashboard-clients"
import { computeKpisFromClients } from "@/lib/kpis-from-clients"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: DASHBOARD_META.title,
  description: DASHBOARD_META.subtitle,
}

export default async function Home() {
  const clients = await getDashboardClients()
  const kpis = computeKpisFromClients(clients)
  return (
    <DashboardProvider clients={clients} kpis={kpis}>
      <SentimentDashboard />
    </DashboardProvider>
  )
}
