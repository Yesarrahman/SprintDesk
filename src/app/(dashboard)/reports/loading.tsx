import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

export default function ReportsLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-9 w-28" />
        <Skeleton className="h-10 w-36" />
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <Skeleton className="h-10 w-36 rounded-lg" />
        <Skeleton className="h-10 w-36 rounded-lg" />
        <Skeleton className="h-10 w-36 rounded-lg" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border-white/20 dark:border-slate-800">
            <CardHeader>
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-3 w-56 mt-1" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-48 w-full rounded-lg" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
