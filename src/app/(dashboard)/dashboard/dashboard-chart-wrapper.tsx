'use client'

import dynamic from 'next/dynamic'
import { Skeleton } from '@/components/ui/skeleton'

// recharts is a large library — lazy-load client-side only
const DashboardChart = dynamic(
  () => import('./dashboard-chart').then(m => m.DashboardChart),
  {
    ssr: false,
    loading: () => <Skeleton className="h-full w-full" />,
  }
)

export function DashboardChartWrapper({ data }: { data: { date: string; completed: number }[] }) {
  return <DashboardChart data={data} />
}
