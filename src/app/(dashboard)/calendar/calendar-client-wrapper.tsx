'use client'

import dynamic from 'next/dynamic'
import { Skeleton } from '@/components/ui/skeleton'

// react-big-calendar is a large library — lazy-load client-side only
const CalendarClient = dynamic(
  () => import('./calendar-client').then(m => m.CalendarClient),
  {
    ssr: false,
    loading: () => <Skeleton className="h-[600px] w-full rounded-xl" />,
  }
)

export function CalendarClientWrapper({ tasks }: { tasks: any[] }) {
  return <CalendarClient tasks={tasks} />
}
