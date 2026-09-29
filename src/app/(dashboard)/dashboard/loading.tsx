import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border-white/20 dark:border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-4 rounded" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-9 w-16 mb-2" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Chart + Upcoming */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="h-96 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border-white/20 dark:border-slate-800 flex flex-col">
            <CardHeader>
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-3 w-52 mt-1" />
            </CardHeader>
            <CardContent className="flex-1">
              <Skeleton className="h-full w-full rounded-lg" />
            </CardContent>
          </Card>
        </div>
        <Card className="h-96 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border-white/20 dark:border-slate-800 flex flex-col">
          <CardHeader>
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-3 w-36 mt-1" />
          </CardHeader>
          <CardContent className="flex-1 space-y-3">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-lg" />
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Inbox Triage */}
      <Card className="h-80 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border-white/20 dark:border-slate-800 flex flex-col">
        <CardHeader>
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-3 w-48 mt-1" />
        </CardHeader>
        <CardContent className="flex-1 space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
