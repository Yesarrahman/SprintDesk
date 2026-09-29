import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

export default function TasksLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-10 w-32" />
      </div>

      <Card className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border-white/20 dark:border-slate-800">
        <CardHeader>
          <Skeleton className="h-5 w-24" />
        </CardHeader>
        <CardContent>
          {/* Table header */}
          <div className="flex gap-4 pb-3 border-b border-slate-200 dark:border-slate-800 mb-3">
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-24" />
          </div>
          {/* Table rows */}
          <div className="space-y-3">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="flex gap-4 items-center py-2">
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-6 w-16 rounded-full" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
