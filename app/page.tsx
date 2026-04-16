import type { Metadata } from "next"

import { SentimentDashboard } from "@/components/sentiment/sentiment-dashboard"
import { dashboardData } from "@/lib/dashboard-data"

export const metadata: Metadata = {
  title: dashboardData.meta.title,
  description: dashboardData.meta.subtitle,
}

export default function Home() {
  return <SentimentDashboard data={dashboardData} />
}
